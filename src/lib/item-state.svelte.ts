import { tick } from 'svelte'
import type { AreaState } from './area-state.svelte.js'

interface HandleOptions {
	/** @default false */
	clickable?: boolean
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

export class ItemState<T = any> {
	/** Is this item dragged? */
	dragging = $state(false)
	/** Is this item being positioned somewhere? */
	positioning = $state(false)
	/** Is this item being targeted, as an anchor to the dragged item? */
	targeted = $state(false) as false | 'before' | 'after'

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

	handleElement?: HTMLElement = $state()
	anchorElement?: HTMLElement = $state()

	// declare private handleElement: HTMLElement | undefined
	// declare private anchorElement: HTMLElement | undefined

	position = $state({ x: NaN, y: NaN })
	// test = $derived(console.log(this.position))

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

	constructor(o: Construct<T>, getAreaOptions = true) {
		if (getAreaOptions) {
			tick().then(() => this.#ticked = true)
			this.#anchor = o.anchor
			this.#areasMap = o.areasMap
		}

		this.index = o.index ?? 0
		this.array = o.array ?? []

		this.positioning = o.positioning ?? false
		this.dragging = o.dragging ?? false
		this.handle = o.handle?.(this, 
			el => { this.handleElement = el; return () => this.handleElement === el && (this.handleElement = undefined) }
		) ?? (() => { })
		this.anchor = o.anchorAction?.(
			this,
			el => { this.anchorElement = el; return () => this.anchorElement === el && (this.anchorElement = undefined) }
		) ?? (() => { })
	}
}