import { tick, untrack } from 'svelte'
import type { AreaState } from './area-state.svelte.js'

export interface HandleOptions {
	/**
	 * Should you be able to click on the handle?
	 * @default false
	*/
	clickable?: boolean

	/**
	 * Cursor style
	 * @default 'auto'
	*/
	cursor?: string
}

type CleanUp = () => void
type SetElement = (element?: HTMLElement) => CleanUp

interface Construct<T> {
	anchor?: HTMLElement
	array?: T[]
	index?: number
	areasMap?: WeakMap<HTMLElement, AreaState<T>>

	handle?: (itemState: ItemState<T>, setHandleElement: SetElement) => (node: HTMLElement, options?: HandleOptions) => void
	anchorAction?: (itemState: ItemState<T>, setAnchorElement: SetElement) => (node: HTMLElement) => void
	positioning?: boolean
	dragging?: boolean
}

export const HANDLE = Symbol('runic-reorder.handle')
export const ANCHOR = Symbol('runic-reorder.anchor')

export class ItemState<T = any> {
	/** Is this item dragged? */
	dragging = $state(false)
	/** Is this item being positioned somewhere? */
	positioning = $state(false)
	/** Is the dragged item the next or previous item in the same array? */
	draggedIs = $state(undefined) as undefined | 'before' | 'after'
	
	/**
	 * The handle is the part that is draggable
	 * 
	 * @example use:handle={{ clickable: true }}
	*/
	handle = (_: HTMLElement, __?: HandleOptions) => {}
	/**
	 * The anchor is the part that a dragged item will use to find the
	 * closest item.
	 * 
	 * **OPTIONAL**  
	 * If this is not used, the `use:handle` element will be used
	 * as an anchor — meaning, this is optional, and useful if the `use:handle`
	 * is for some reason not rendered.
	 * 
	 * @example use:anchor
	*/
	anchor = (_: HTMLElement) => {}

	#handleElement?: HTMLElement = $state()
	get [HANDLE]() { return this.#handleElement }
	#anchorElement?: HTMLElement = $state()
	get [ANCHOR]() { return this.#anchorElement }

	position = $state({ x: NaN, y: NaN })

	/** The internal svelte $anchor */
	#anchor = $state() as HTMLElement | undefined
	#areasMap = $state() as WeakMap<HTMLElement, AreaState<T>> | undefined
	#ticked = $state(false)
	area = $derived.by(() => {
		if (!this.#anchor || !this.#areasMap || !this.#ticked) return undefined as unknown as AreaState<T>

		let parent = this.#anchor.parentElement as HTMLElement | null | undefined
		do {
			
			const opts = this.#areasMap.get(parent!)
			if (opts) {
				return opts!
			}
		} while ((parent = parent?.parentElement) && parent !== document.body)
		
		return undefined as unknown as AreaState<T>
	})

	index = $state() as number
	array = $state() as T[]
	value = $state() as T

	constructor(o: Construct<T>, getAreaOptions = true) {
		if (getAreaOptions) {
			tick().then(() => this.#ticked = true)
			this.#anchor = o.anchor
			this.#areasMap = o.areasMap
		}

		if ($effect.tracking()) {
			$effect(() => {
				if(this.area) {
					// When area is associated, add this item to the area
					untrack(() => {
						if (this.area.items.indexOf(this) === -1) {
							this.area.items.push(this)
						}
					})
				}
				return () => {
					if(this.area) {
						const index = this.area.items.indexOf(this)
						if(index !== -1) {
							this.area.items.splice(index, 1)
						}
					}
				}
			})
		}

		this.index = o.index ?? 0
		this.array = o.array ?? []
		if(o.array && o.index !== undefined) {
			this.value = o.array[o.index]
		}

		this.positioning = o.positioning ?? false
		this.dragging = o.dragging ?? false
		this.handle = o.handle?.(this, 
			el => { this.#handleElement = el; return () => this.#handleElement === el && (this.#handleElement = undefined) }
		) ?? (() => { })
		this.anchor = o.anchorAction?.(
			this,
			el => { this.#anchorElement = el; return () => this.#anchorElement === el && (this.#anchorElement = undefined) }
		) ?? (() => { })
	}
}