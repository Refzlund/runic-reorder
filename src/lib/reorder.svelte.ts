import { mount, unmount, untrack, type Snippet } from 'svelte'
import { list } from './List.svelte'
import Drag, { enterArea } from './Drag.svelte'
import { on } from 'svelte/events'
import { ItemState } from './item-state.svelte.js'
import { AreaState, type AreaOptions } from './area-state.svelte.js'
import { observeMove } from './observe-move.js'

export type SnippetArgs<T = any> = [item: T, state: ItemState<T>]
export type ContentSnippet<T = any> = Snippet<SnippetArgs<T>>

function getPosition(node: HTMLElement) {
	const rect = node.getBoundingClientRect()
	return { x: rect.left, y: rect.top }
}

function trackPosition(node: HTMLElement, isEnabled: () => boolean, setPosition: (position: { x: number, y: number }) => void) {
	$effect(() => {
		if(isEnabled()) {
			setPosition(getPosition(node))
		}
	})
	const ro = new ResizeObserver(() => {
		if (!isEnabled()) return
		setPosition(getPosition(node))
	})
	const cleanup = observeMove(node, isEnabled, () => {
		if (!isEnabled()) return
		setPosition(getPosition(node))
	})
	ro.observe(node)

	return () => {
		ro.unobserve(node)
		ro.disconnect()
		cleanup()
	}
}

export function reorder<T>(itemSnippet: ContentSnippet<T>) {
	const areasMap = new WeakMap<Node, AreaState<any>>()

	const reorderState = $state({
		reordering: null as null | T
	})

	function getState(anchor: HTMLElement, array: T[], index: number, content: () => ContentSnippet<T>) {
		return new ItemState({
			anchor, array, index, areasMap,
			anchorAction: (itemState, setElement) => (node: HTMLElement) => {
				const removeElement = setElement(node)

				let cleanPosition: undefined | (() => void)
				$effect(() => {
					itemState.anchorElement // Track changes to anchorElement
					if (node && cleanPosition) {
						cleanPosition?.()
					}
					else {
						untrack(() => {
							cleanPosition = trackPosition(node,
								() => !!reorderState.reordering && itemState.area.isTarget,
								position => { itemState.position = position }
							)
						})
						return cleanPosition
					}
				})

				return { destroy() { removeElement() } }
			},
			handle: (itemState, setElement) => (node, options = {}) => {
				const removeElement = setElement(node)

				let cleanPosition: undefined | (() => void)
				$effect(() => {
					if (itemState.anchorElement && cleanPosition) {
						cleanPosition?.()
					} 
					else {
						untrack(() => {
							cleanPosition = trackPosition(node,
								() => !!reorderState.reordering && itemState.area.isTarget,
								position => { itemState.position = position }
							)
						})
						return cleanPosition
					}
				})

				const cursorAuto = getComputedStyle(node).cursor === 'auto'
				if (cursorAuto) {
					node.style.cursor = 'grab'
				}

				let dragged: {} | null = null

				function startDrag() {
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
				}

				let cursorTimeoutId: ReturnType<typeof setTimeout> | undefined
				$effect(() => on(node, 'pointerdown', e => {
					e.preventDefault()
					if (options.clickable) {
						const cleanMove = on(document, 'pointermove', function () {
							cleanMove()
							cleanUp()
							const clean = on(node, 'click', function (e: MouseEvent) {
								e.preventDefault()
								e.stopPropagation()
								clean()
								return false
							}, { capture: true })
							startDrag()
						})
						const cleanUp = on(node, 'pointerup', function () {
							cleanMove()
							cleanUp()
							if(cursorAuto) {
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
					startDrag()
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
						removeElement()
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
			return list(
				anchor,
				() => itemSnippet,
				array,
				() => (index: number) => getState(anchor, array(), index, () => itemSnippet)
			) as ReturnType<Snippet>
		}

		const node = item
		const opts = $state(options)
		const state = new AreaState(node, () => opts)

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