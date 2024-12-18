import { mount, unmount, type Snippet } from 'svelte'
import { list } from './List.svelte'
import Drag, { enterArea } from './Drag.svelte'
import { on } from 'svelte/events'
import { ItemState } from './item-state.svelte.js'
import { AreaState, type AreaOptions } from './area-state.svelte.js'

export type SnippetArgs<T> = [item: T, state: ItemState]
export type ContentSnippet<T> = Snippet<SnippetArgs<T>>

export function reorder<K extends string, T>(itemSnippet: ContentSnippet<T>, items: Record<K, T[]>) {
	const lists = $state({}) as Record<K, Snippet>
	const areas = $state({}) as Record<K, (node: HTMLElement, options?: AreaOptions<T>) => void>

	const areasMap = new WeakMap<Node, AreaState<any>>()

	const reorderState = $state({
		reordering: null as null | T
	})

	function getState($anchor: HTMLElement, array: T[], index: number, content: () => ContentSnippet<T>) {
		return new ItemState({
			anchor: $anchor,
			array,
			index,
			areasMap: areasMap,
			handle: (itemState) => (node) => {
				node.style.cursor = 'grab'

				let dragged: {} | null = null

				$effect(() => on(node, 'pointerdown', e => {
					e.preventDefault()
					const rect = node.getBoundingClientRect()

					reorderState.reordering = array[index]
					dragged = mount(Drag, {
						target: document.body,
						props: {
							children: content() as ContentSnippet<unknown>,
							args: [array[index], new ItemState({ dragging: true }, false)],
							position: { x: rect.left, y: rect.top },
							origin: { array, index, area: itemState.area },
							stop
						}
					})

					itemState.positioning = true
				}))

				function stop(e?: Event) {
					e?.preventDefault()
					if (dragged) {
						unmount(dragged, { outro: false })
						dragged = null
					}

					reorderState.reordering = null
					itemState.positioning = false
				}

				return {
					destroy() {
						stop()
					}
				}
			}
		})
	}

	function areaAction(key: K) {
		return function area(node: HTMLElement, options: AreaOptions<T> = {}) {
			const opts = $state(options)
			const state = new AreaState(node, () => opts)

			areasMap.set(node, state)

			if (opts.class) {
				node.dataset.areaClass = opts.class
			}
			$effect(() => on(node, 'pointerenter', () => enterArea(() => state)))
			$effect(() => {
				if (!reorderState.reordering) {
					delete node.dataset.areaCondition
				} else if (opts.condition) {
					node.dataset.areaCondition = `${!!opts.condition(reorderState.reordering)}`
				} else {
					node.dataset.areaCondition = 'true'
				}
			})

			if(opts.get) {
				opts.get(state)
			}

			return {
				destroy() {
					areasMap.delete(node)
				},
				update(options: AreaOptions<T>) {
					const get = options.get
					delete options.get // not cloneable - so we remove it

					const o = $state.snapshot(options) as AreaOptions<T>
					for (const key of Object.keys(opts) as (keyof typeof opts)[]) {
						if (!(key in o)) {
							delete opts[key]
						}
					}
					for (const key of Object.keys(o) as (keyof typeof opts)[]) {
						opts[key] = o[key] as any
					}
					node.dataset.areaClass = options.class

					if (get) {
						get(state)
					}
				}
			}
		}
	}


	// * Create area actions and lists.

	for (const [key, value] of Object.entries(items) as [K, T[]][]) {
		lists[key] = (($anchor: HTMLElement) => list(
			$anchor,
			() => itemSnippet,
			() => value,
			() => (index: number) => getState($anchor, value, index, () => itemSnippet)
		)) as Snippet

		areas[key] = areaAction(key)
	}

	return {
		get list() {
			return lists
		},
		get area() {
			return areas
		}
	}
}