import { SvelteMap } from 'svelte/reactivity'
import type { ItemState } from './item-state.svelte.js'

export type AreaOptions<T> = {
	/**
	 * Lock movement to one axis
	 * @default undefined
	*/
	axis?: 'x' | 'y'

	/** 
	 * For styling based on area by using the selector  
	 * `:global([data-area-class~='...']) ...`
	 * 
	 * [Read more about the ~= attr-selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attrvalue_2)
	*/
	class?: string

	/** Acceptance criteria, whether an item can be dropped here */
	condition?: (item: T) => boolean

	/** Modify (or what not) the item when it is dropped into the area. */
	onDrop?: (item: T) => void

	/**
	 * Get the AreaState
	 * 
	 * @example
	 * let area = $state() as undefined | AreaState
	 * 
	 * <div use:order.area.array={{ get: a => area = a }}>
	*/
	get?: (areaState: AreaState<T>) => void
}

export const ARRAY = Symbol('runic-reorder.array')
export const SPLICE_ARRAY = Symbol('runic-reorder.splice-array')
export class AreaState<T = any> {
	/** The area element */
	node: HTMLElement

	/** The area options */
	options: AreaOptions<T> = $state({})

	/** An array of classes separated by space from the options; `{ class: '...' }` */
	class = $derived(this.options.class?.split(' ') || [])

	/** Is the dragged item targeting this area? */
	isTarget = $state(false)
	/** Did the dragged item come from here? */
	isOrigin = $state(false)
	/** The items (ItemState) that are within this area. A map of the unique-keys, and its item state. */
	items = new SvelteMap<T, ItemState<T>>()	

	/** The array associated with this area that receives modifications */
	get array() {
		return this[SPLICE_ARRAY]?.() ?? this[ARRAY]?.()
	}

	#array = $state() as (() => T[]) | undefined
	#spliceArray = $state() as (() => T[]) | undefined

	/** Array that is rendered (or modified if splice_array not provided) */
	get [ARRAY]() {
		return this.#array
	} 
	set [ARRAY](array) {
		this.#array = array
	}
	
	/** Array that receives modifications (e.g. splicing) */
	get [SPLICE_ARRAY]() {
		return this.#spliceArray
	}
	set [SPLICE_ARRAY](array) {
		this.#spliceArray = array
	}

	constructor(node: HTMLElement, options: () => AreaOptions<T>) {
		this.node = node
		Object.assign(this, {
			get options() {
				return options()
			}
		})
	}
}