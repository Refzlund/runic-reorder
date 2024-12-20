import { mount, tick, unmount, untrack, type Snippet } from 'svelte'
import { list } from './List.svelte'
import Drag, { current, enterArea } from './Drag.svelte'
import { on } from 'svelte/events'
import { ANCHOR, HANDLE, ItemState, POSITION, type HandleOptions } from './item-state.svelte.js'
import { AreaState, ARRAY, type AreaOptions } from './area-state.svelte.js'
import { sameParent, trackPosition } from './utils.svelte.js'

export type SnippetArgs<T = any> = [item: T, state: ItemState<T>]
export type ContentSnippet<T = any> = Snippet<SnippetArgs<T>>

export function reorder<T>(itemSnippet: ContentSnippet<T>) {
	const areasMap = new WeakMap<Node, AreaState<any>>()

	const reorderState = $state({
		reordering: null as null | T
	})

	function put(array: any[], index: number, item: any) {
		current.array.splice(current.index, 1)
		array.splice(index, 0, item)
		current.array = array
		current.index = index
	}

	function getState(anchor: HTMLElement, array: T[], index: number, content: () => ContentSnippet<T>) {
		const positioningEffect = (itemState: ItemState<T>) => () => {
			itemState.positioning = reorderState.reordering === itemState.value
			itemState.draggedIs = reorderState.reordering ? current.array === itemState.array ? (
				current.index === itemState.index - 1 ? 'before' :
				current.index === itemState.index + 1 ? 'after' :
				undefined
			) : undefined : undefined
		}

		let cleanPosition: undefined | (() => void)
		const positionEffect = (itemState: ItemState<T>) => () => {
			const node = itemState[ANCHOR] ?? itemState[HANDLE] // Track changes to #anchorElement			if (node && cleanPosition) {
			cleanPosition?.()

			untrack(() => {
				if(!node) return
				cleanPosition = trackPosition(node,
					() => !!reorderState.reordering && itemState.area.isTarget,
					position => { itemState[POSITION] = position }
				)
			})
			return cleanPosition
		}
		
		return new ItemState({
			anchor, array, index, areasMap, 
			positioning: array === current.array && index === current.index,
			anchorAction: (itemState, setElement) => (node: HTMLElement) => {
				const removeElement = setElement(node)
				$effect.pre(positioningEffect(itemState))
				$effect.pre(positionEffect(itemState))
				return { destroy() { removeElement() } }
			},
			handle: (itemState, setElement) => (node, options = {}) => {
				const opts = $state(options)

				const removeElement = setElement(node)
				$effect.pre(positioningEffect(itemState))
				$effect.pre(positionEffect(itemState))

				$effect(() => {
					node.style.cursor = opts.cursor ? opts.cursor : 'grab'
				})

				let dragged: {} | null = null
				function startDrag(e: PointerEvent) {
					const rect = sameParent(node, anchor)!.getBoundingClientRect()

					current.array = itemState.array
					current.index = itemState.index 

					const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
					const mousePosition = { x: e.pageX, y: e.pageY }

					reorderState.reordering = itemState.value
					dragged = mount(Drag, {
						target: document.body,
						props: {
							children: content() as ContentSnippet<unknown>,
							args: [itemState.value, new ItemState({ dragging: true }, false)],
							position: mousePosition,
							offset: offset,
							min: { height: rect.height, width: rect.width },
							origin: { array, index, area: itemState.area },
							put,
							
							stop(e?: Event) {
								e?.preventDefault()
								if(dragged) {
									unmount(dragged, { outro: false })
									dragged = null
								}

								current.area?.options?.onDrop?.(itemState.value)
								
								reorderState.reordering = null
								itemState.positioning = false
							}
						}
					})
				}

				let cursorTimeoutId: ReturnType<typeof setTimeout> | undefined
				$effect(() => on(node, 'pointerdown', e => {
					e.preventDefault()
					if (opts.clickable) {
						const cleanMove = on(document, 'pointermove', function (e) {
							cleanMove()
							cleanUp()
							const clean = on(node, 'click', function (e: MouseEvent) {
								e.preventDefault()
								e.stopPropagation()
								clean()
								return false
							}, { capture: true })
							startDrag(e)
						})
						const cleanUp = on(node, 'pointerup', function () {
							cleanMove()
							cleanUp()
							if (opts.cursor === undefined) {
								if(cursorTimeoutId) {
									clearTimeout(cursorTimeoutId)
								}
								node.style.cursor = 'pointer'
								cursorTimeoutId = setTimeout(() => {
									node.style.cursor = 'grab'
								}, 100)
							}
						})
						return
					}
					startDrag(e)
				}))

				return {
					destroy() {
						removeElement()
					},
					update(options: HandleOptions) {
						opts.cursor = options.cursor
						opts.clickable = options.clickable
					}
				}
			}
		})
	}

	function area(node: HTMLElement, options?: AreaOptions<T>): { destroy(): void, update(options: AreaOptions<T>): void }
	function area(array: T[]): ReturnType<Snippet>
	function area(item: HTMLElement | T[], options: AreaOptions<T> = {}) {
		if(typeof arguments[1] === 'function' || Array.isArray(item)) {
			const [anchor, array] = arguments as unknown as [HTMLElement, () => T[]]

			tick().then(() => {
				let parent = anchor.parentElement as HTMLElement | null | undefined
				do {
					const areaState = areasMap.get(parent!)
					if (areaState) {
						if(areaState[ARRAY]) {
							throw new Error('Areas only support listing one array as of right now.')
						}
						areaState[ARRAY] = array
					}
				} while ((parent = parent?.parentElement) && parent !== document.body)
			})
			
			return list(
				anchor,
				() => itemSnippet,
				array,
				() => (index: number) => getState(anchor, array(), index, () => itemSnippet)
			) as ReturnType<Snippet>
		}

		const node = item
		const opts = $state(options)
		let state = areasMap.get(node)
		if(!state) {
			state = new AreaState(node, () => opts)
		}
		areasMap.set(node, state)

		if (opts.class) {
			node.dataset.areaClass = opts.class
		}
		$effect(() => on(node, 'pointerenter', () => {
			if (!reorderState.reordering) return
			enterArea(() => state)
		}))
		$effect(() => {
			if (!reorderState.reordering) {
				delete node.dataset.areaCondition
			} else if (opts.condition) {
				node.dataset.areaCondition = `${!!opts.condition(reorderState.reordering)}`
			} else {
				node.dataset.areaCondition = 'true'
			}
		})

		if (opts.get) {
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

	return area
}