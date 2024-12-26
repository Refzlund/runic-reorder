import { tick, untrack } from 'svelte'
import type { AreaState } from './area-state.svelte.js'
import { getPosition } from './utils.svelte.js'
import { setDraggedElement } from './Drag.svelte'

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
export const POSITION = Symbol('runic-reorder.position')

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
	handle = (node: HTMLElement, _?: HandleOptions) => {
		setTimeout(() => {
			setDraggedElement(node)
		}, 1)
	}
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
	anchor = (node: HTMLElement) => {
		setTimeout(() => {
			setDraggedElement(node)
		}, 2)
	}

	#handleElement?: HTMLElement = $state()
	get [HANDLE]() { return this.#handleElement }
	#anchorElement?: HTMLElement = $state()
	get [ANCHOR]() { return this.#anchorElement }

	position = $derived.by(() => {
		const result = isNaN(this.#position.x) ? getPosition(this.#anchorElement ?? this.#handleElement) : this.#position
		return result
	})
	#position = $state({ x: NaN, y: NaN, h: NaN, w: NaN }) // TODO: On enter area, update current position

	updatePosition() {
		this.#position = getPosition(this.#anchorElement ?? this.#handleElement)
		return this.#position
	}

	get [POSITION]() { return this.#position }
	set [POSITION](value) { this.#position = value }

	area = $state() as AreaState<T>

	index = $state() as number
	array = $state() as T[]
	value = $state() as T

	destroy() {
		tick().then(() => {
			if (this.area && !this.area.array!.includes(this.value)) {
				this.area.items.splice(this.area.items.indexOf(this), 1)
			}
		})
	}

	constructor(o: Construct<T>, area?: AreaState<T>) {
		this.area = area!

		if(this.area) {
			this.area.items.push(this)
		}

		this.index = o.index ?? 0
		this.array = o.array ?? []
		if (o.array && o.index !== undefined) {
			this.value = o.array[o.index]
		}

		this.positioning = o.positioning ?? false
		this.dragging = o.dragging ?? false
		this.handle = o.handle?.(this,
			el => { this.#handleElement = el; return () => this.#handleElement === el && (this.#handleElement = undefined) }
		) ?? this.handle
		this.anchor = o.anchorAction?.(
			this,
			el => { this.#anchorElement = el; return () => this.#anchorElement === el && (this.#anchorElement = undefined) }
		) ?? this.anchor
	}
}