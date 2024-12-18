import { tick } from 'svelte'
import type { AreaState } from './area-state.svelte.js'

interface Construct<T> {
	anchor?: HTMLElement
	array?: T[]
	index?: number
	areasMap?: WeakMap<HTMLElement, AreaState<T>>

	handle?: (itemState: ItemState<T>) => (node: HTMLElement) => void
	positioning?: boolean
	dragging?: boolean
}

export class ItemState<T = any> {
	/** Is this item dragged? */
	dragging = $state(false)
	/** Is this item being positioned somewhere? */
	positioning = $state(false)

	handle = (_: HTMLElement) => { }

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

	constructor(o: Construct<T>, getAreaOptions = true) {
		if (getAreaOptions) {
			tick().then(() => this.#ticked = true)
			this.#anchor = o.anchor
			this.#areasMap = o.areasMap
		}

		this.positioning = o.positioning ?? false
		this.dragging = o.dragging ?? false
		this.handle = o.handle?.(this) ?? (() => { })
	}
}