import { mount, tick, unmount, untrack, type Snippet } from 'svelte'
import { list } from './List.svelte'
import Drag, { enterArea } from './Drag.svelte'
import { on } from 'svelte/events'
import { ANCHOR, HANDLE, ItemState, POSITION, type HandleOptions } from './item-state.svelte.js'
import { AreaState, ARRAY, SPLICE_ARRAY, type AreaOptions } from './area-state.svelte.js'
import { sameParent, trackPosition } from './utils.svelte.js'
import { current, dragReactivity, lastSplice } from './reactivity.svelte'

export type SnippetArgs<T = any> = [item: T, state: ItemState<T>]
export type ContentSnippet<T = any> = Snippet<SnippetArgs<T>>

export interface AreaRenderOptions<T> {
	/** The array that will be rendered via #each */
	view: T[]
	/**
	 * If the viewed array is partial, this startIndex will be used
	 * to get the index in the array: `{#each ..., i}` where `index = i + startIndex`
	*/
	startIndex?: number
	/**
	 * The array that receives modifications from reordering
	*/
	modify?: T[]
}

export interface InternalAreaRenderOptions<T> extends AreaRenderOptions<T> {
	splice: T[]
}

export function reorder<T>(itemSnippet: ContentSnippet<T>) {
	const areasMap = new WeakMap<Node, AreaState<any>>()

	let currentItem = $state(null) as T | null
	const reorderState = {
		// This over engineering is due to a false-positive
		// `ownership_invalid_mutation` that only appears after building🤷
		get reordering() {
			return currentItem
		},
		set reordering(item: T | null) {
			currentItem = item
		}
	}

	dragReactivity(() => !!reorderState.reordering)

	function getState(
		{ anchor, options: listOptions, index, areaState, content, value }: {
			anchor: HTMLElement,
			options: InternalAreaRenderOptions<T>,
			value: T,
			index: number,
			areaState: AreaState<T>,
			content: () => ContentSnippet<T>
		}
	) {
		let v = areaState.items.get(value)
		if(v) return v

		const positioningEffect = (itemState: ItemState<T>) => () => {
			itemState.positioning = reorderState.reordering === itemState.value
			itemState.draggedIs = reorderState.reordering ? current.area === itemState.area ? (
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
					() => {
						return !!reorderState.reordering && itemState.area.isTarget
					},
					position => {
						itemState[POSITION] = position
					}
				)
			})
			return cleanPosition
		}
		
		const itemState = new ItemState({
			anchor, array: () => listOptions.splice, index, areasMap, value,
			positioning: false,
			anchorAction: (itemState, setElement) => (node: HTMLElement) => {
				const removeElement = setElement(node)
				$effect(positioningEffect(itemState))
				$effect(positionEffect(itemState))
				return { destroy() { removeElement() } }
			},
			handle: (itemState, setElement) => (node, options = {}) => {
				const opts = $state(options)

				const removeElement = setElement(node)
				$effect(positioningEffect(itemState))
				$effect(positionEffect(itemState))

				$effect(() => {
					node.style.cursor = opts.cursor ? opts.cursor : 'grab'
				})

				let dragged: {} | null = null
				function startDrag(e: PointerEvent) {
					const rect = sameParent(node, anchor)!.getBoundingClientRect()

					current.area = itemState.area
					current.index = itemState.index
					current.item = itemState.value
					lastSplice.area = itemState.area
					lastSplice.index = itemState.index

					const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
					const mousePosition = { x: e.clientX, y: e.clientY }

					reorderState.reordering = itemState.value
					dragged = mount(Drag, {
						target: document.body,
						props: {
							children: content() as ContentSnippet<unknown>,
							args: [itemState.value, new ItemState({ dragging: true, array: () => itemState.array, index: itemState.index })],
							position: mousePosition,
							offset: offset,
							min: { height: rect.height, width: rect.width },
							origin: { array: listOptions.splice, index, area: itemState.area },
							
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
					if(!opts.clickable) {
						node.addEventListener('click', e => {
							e.preventDefault()
							e.stopPropagation()
						}, { once: true, capture: true })
						return startDrag(e)
					}

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
		}, areaState)

		areaState.items.set(value, itemState)
		return itemState
	}

	function area(node: HTMLElement, options?: AreaOptions<T>): { destroy(): void, update(options: AreaOptions<T>): void }
	function area(array: T[] | AreaRenderOptions<T>): ReturnType<Snippet>
	function area(item: HTMLElement | T[] | AreaRenderOptions<T>, options?: AreaOptions<T>) {
		// * Note, SvelteKit will provide 'out', 'css' and 'head' for arguments[0] when server-rendering a snippet
		const isServer = 'out' in arguments[0]
		const isList = typeof arguments[1] === 'function'
		const isArray = isList && Array.isArray(arguments[1]())

		if (isList || isServer) {
			const [anchor, options] = arguments as unknown as [HTMLElement, (() => T[]) | (() => AreaRenderOptions<T>)]

			const asOptions = options as () => AreaRenderOptions<T>
			const asArray = options as () => T[]

			const getArray = isServer
				? () => options as unknown as T[]
				: isArray ? asArray : () => asOptions().view

			const opts = (isArray || isServer ? {} : asOptions()) as InternalAreaRenderOptions<T>
			Object.defineProperties(opts, {
				view: {
					get() {
						return getArray()
					}
				},
				splice: {
					get() {
						return opts.modify ?? getArray()
					},
				}
			})

			let areaState = $state() as AreaState<T> // TODO: isServer ? new AreaState(...)
			tick().then(() => {
				let parent = anchor.parentElement as HTMLElement | null | undefined
				do {
					areaState = areasMap.get(parent!)!
					if (areaState) {
						if(areaState[ARRAY]) {
							throw new Error('runic-reorder: List already rendered inside this area.')
						}
						areaState[ARRAY] = () => opts.view
						areaState[SPLICE_ARRAY] = () => opts.modify ?? opts.view
						break
					}
				} while ((parent = parent?.parentElement) && parent !== document.body)
				if (!areaState && !isServer) {
					throw new Error('runic-reorder: List not inside an area. Make sure to use `use:area...` for a parent')
				}
			})

			return list(
				anchor,
				() => itemSnippet,
				() => areaState,
				() => opts.view,
				() => opts.startIndex ?? 0,
				() => (value: T, index: number) => 
					untrack(() => 
						getState({
							anchor,
							value,
							options: opts,
							index: index + (opts.startIndex ?? 0),
							areaState,
							content: () => itemSnippet
						})
					)
			) as ReturnType<Snippet>
		}

		const node = item as HTMLElement
		
		const opts = $state(options ?? {}) as AreaOptions<T>
		let state = areasMap.get(node)
		if(!state) {
			state = new AreaState(node, () => opts)
			areasMap.set(node, state)
		}

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