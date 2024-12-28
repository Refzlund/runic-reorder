<script module lang='ts'>
	
	export function enterArea(areaState: () => AreaState<any>) {
		if(current.item === null) return

		const state = areaState()
		
		if(state.options.condition && !state.options.condition(current.item)) {
			return
		}
		if(current.area) {
			delete current.area.node.dataset.areaTarget
			current.area.isTarget = false
		}
		state.isTarget = true
		
		current.area = state
		current.area.items.forEach(i => i.updatePosition())
		targeting.enteredArea = true
		tick().then(() => targeting.enteredArea = false)
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
	import { getPosition } from './utils.svelte.js'
	import { current, resetDragTargeting, targeting } from './reactivity.svelte.js'

	interface Props {
		children: ContentSnippet<unknown>
		args: SnippetArgs<unknown>
		position: { x: number, y: number }
		offset: { x: number, y: number }
		origin: { array: any[], index: number, area: AreaState<any> }
		min: { height: number, width: number }
		stop(): void
	}

	let { children, args, stop, position, offset, origin, min }: Props = $props()

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
		current.item = undefined
		delete origin.area.node.dataset.areaOrigin
		delete current.area?.node.dataset.areaTarget
		origin.area.isOrigin = false
		draggedElement = null
		if(current.area) {
			current.area.isTarget = false
		}
	})

	// * Targeting position *
	$effect.pre(() => {
		Object.assign(targeting.position, draggedElement ? trackedPosition : mousePosition)
	})

	/*
		Via funny logic,
		after 1ms of dragstart the handle is set to the "draggedElement"
		after 2ms of dragstart the anchor is set to the "draggedElement" (overriding handle)

		So we wait 5ms after drag to initiate logic determining positioning.
	*/
	onMount(() => setTimeout(() => {
		current.area?.items.forEach(i => i.updatePosition())
		requestAnimationFrame(() => { targeting.targetable = true })
	}, 5))

	onDestroy(() => {
		resetDragTargeting()
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

		targeting.positionTrigger = !targeting.positionTrigger
	}}
	onscrollcapture={() => {
		if(draggedElement) {
			trackedPosition = getPosition(draggedElement)
			current.area?.items.forEach(i => i.updatePosition())
		}
		
		targeting.positionTrigger = !targeting.positionTrigger
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
	{@render children(current.item, itemState)}
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