<script module lang='ts'>
	
	let currentItem = $state(null) as unknown | null

	/** Current array and index that is being dragged */
	export const current = $state({
		index: 0,
		area: null as AreaState<any> | null
	})

	export const lastSplice = {
		area: null as null | AreaState<any>,
		index: -1
	}

	let enteredArea = false
	export function enterArea(areaState: () => AreaState<any>) {
		if(currentItem === null) return

		const state = areaState()
		
		if(state.options.condition && !state.options.condition(currentItem)) {
			return
		}
		if(current.area) {
			delete current.area.node.dataset.areaTarget
			current.area.isTarget = false
		}
		state.isTarget = true
		
		current.area = state
		current.area.items.forEach(i => i.updatePosition())
		enteredArea = true
		tick().then(() => enteredArea = false)
	}

	let draggedElement = $state(null) as HTMLElement | null
	
	export function setDraggedElement(element: HTMLElement) {
		draggedElement = element
	}

</script>

<script lang='ts'>

	import type { ContentSnippet, SnippetArgs } from './reorder.svelte.js'
	import { ItemState } from './item-state.svelte.js'
	import type { AreaState } from './area-state.svelte.js'
	import { onDestroy, onMount, tick, untrack } from 'svelte'
	import { getPosition, trackPosition } from './utils.svelte.js'

	interface Props {
		children: ContentSnippet<unknown>
		args: SnippetArgs<unknown>
		position: { x: number, y: number }
		offset: { x: number, y: number }
		origin: { array: any[], index: number, area: AreaState<any> }
		min: { height: number, width: number }
		stop(): void
		put(area: AreaState<any>, index: number, item: unknown): void
	}

	let { children, args, stop, position, offset, origin, min, put }: Props = $props()

	const mousePosition = $state(position)
	const elementPosition = $derived({ 
		x: current.area?.options.axis === 'y' ? position.x - offset.x :  mousePosition.x - offset.x, 
		y: current.area?.options.axis === 'x' ? position.y - offset.y :  mousePosition.y - offset.y,
	})
	let trackedPosition = $state(mousePosition)

	$effect.pre(() => {
		draggedElement
		untrack(() => requestAnimationFrame(() => trackedPosition = getPosition(draggedElement!)))
	})

	current.area = origin.area
	current.area.isOrigin = true
	current.area.isTarget = true
	currentItem = args[0]

	let itemState = $derived({
		...args[1],
		dragging: true,
		area: current.area,
		array: current.area.array,
		index: current.index
	} as ItemState)

	origin.area.node.dataset.areaOrigin = 'true'

	$effect(() => {
		if(current.area?.isTarget) {
			current.area.node.dataset.areaTarget = 'true'
		}
	})

	onDestroy(() => {
		currentItem = null
		delete origin.area.node.dataset.areaOrigin
		delete current.area?.node.dataset.areaTarget
		origin.area.isOrigin = false
		draggedElement = null
		if(current.area) {
			current.area.isTarget = false
		}
	})

	// * Targeting position *
	function distance(a: { x: number, y: number }, b: { x: number, y: number }) {
		return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
	}

	/*
		Via funny logic,
		after 1ms of dragstart the handle is set to the "draggedElement"
		after 2ms of dragstart the anchor is set to the "draggedElement" (overriding handle)

		So we wait 5ms after drag to initiate logic determining positioning.
	*/
	let targetable = $state(false)
	onMount(() => setTimeout(() => {
		current.area?.items.forEach(i => i.updatePosition())
		requestAnimationFrame(() => { targetable = true })
	}, 5))

	const targetPosition = $derived(draggedElement ? trackedPosition : mousePosition)
	const targetItem = $derived.by(() => {
		if(!targetable) return

		let closest = undefined as undefined | ItemState
		let closestDistance = Infinity

		if(isNaN(targetPosition.x)) return

		current.area
		current.area?.items?.size

		untrack(() => {
			for(const [_, item] of current.area?.items || []) {
				if(isNaN(item.position.x)) continue
				if(!closest || (distance(targetPosition, item.position) < closestDistance)) {
					closest = item
					closestDistance = distance(targetPosition, item.position)
				}
			}
		})

		return closest
	})

	const targetIndex = $derived(targetItem?.index ?? 0)

	let ticked = false
	function untick() {
		if(!ticked) return
		ticked = false
		current.area?.items.forEach(i => i.updatePosition())
	}

	let trigger = $state(false)
	$effect(() => {
		trigger
		if(!current.area || targetIndex === -1 || !targetable) return
		const isSelf = (targetItem && (targetItem.area === lastSplice.area && targetIndex === lastSplice.index)) || (targetItem?.value === currentItem)
		if(isSelf) return
		
		untrack(() => {
			if(ticked) return
			ticked = true

			requestAnimationFrame(untick)

			let last = enteredArea && targetIndex === current.area!.items.size - 1
			put(
				current.area!,
				last ? targetIndex + 1 : targetIndex,
				currentItem
			)

			if(last) {
				tick().then(() => {
					untick()
					trackedPosition = trackedPosition
					trigger = !trigger
				})
			}
		})
	})

</script>

<svelte:head>
	<style>
		* { cursor: grabbing !important; }
	</style>
</svelte:head>

<svelte:window
	onpointermove={e => {
		e.preventDefault()
		mousePosition.x = e.clientX
		mousePosition.y = e.clientY

		if(draggedElement) {
			trackedPosition = getPosition(draggedElement)
		}
	}}
	onscrollcapture={() => {
		if(draggedElement) {
			trackedPosition = getPosition(draggedElement)
			current.area?.items.forEach(i => i.updatePosition())
		}
	}}
	onpointerup={stop}
></svelte:window>


<div
	id='runic-drag'
	data-area-class={current.area?.options?.class ?? ''}
	style='
		--x: {elementPosition.x}px;
		--y: {elementPosition.y}px;
		--w: {min.width ?? 0}px;
		--h: {min.height ?? 0}px;
	'
>
	{@render children(currentItem, itemState)}
</div>


<style>

	#runic-drag {
		display: flex;
		pointer-events: none;
		user-select: none;
		position: fixed;
		top: var(--y);
		left: var(--x);
		z-index: 99;

		/* min-height: 0px; */
		/* min-width: 0px; */
		/* transition: min-height .15s, min-width .15s; */

		/* @starting-style { */
			min-height: var(--h);
			min-width: var(--w);
		/* } */
	}

</style>