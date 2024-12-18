<script module lang='ts'>
	
	let area = $state(null) as AreaState<any> | null
	let currentItem = $state(null) as unknown | null

	export function enterArea(areaState: () => AreaState<any>) {
		const state = areaState()
		if(currentItem) {
			if(state.options.condition && !state.options.condition(currentItem)) {
				return
			}
			if(area) {
				delete area.node.dataset.areaTarget
				area.isTarget = false
			}
			state.isTarget = true
		}
		area = state
	}

</script>

<script lang='ts'>

	import {
		devicePixelRatio
	} from 'svelte/reactivity/window'

	import type { ContentSnippet, SnippetArgs } from './reorder.svelte.js'
	import { ItemState } from './item-state.svelte.js'
	import type { AreaState } from './area-state.svelte.js'
	import { onDestroy } from 'svelte'

	interface Props {
		children: ContentSnippet<unknown>
		args: SnippetArgs<unknown>
		position: { x: number, y: number }
		origin: { array: any[], index: number, area: AreaState<any> }
		stop(): void
	}

	let { children, args, stop, position, origin }: Props = $props()
	
	area = origin.area
	area.isOrigin = true
	area.isTarget = true
	currentItem = args[0]

	let moved = $state({ x: 0, y: 0 })
	let newPos = $derived({
		x: position.x + moved.x / (devicePixelRatio.current ?? 1),
		y: position.y + moved.y / (devicePixelRatio.current ?? 1)
	})

	let itemState = $derived({
		...args[1],
		area
	} as ItemState)

	origin.area.node.dataset.areaOrigin = 'true'

	$effect(() => {
		if(area?.isTarget) {
			area.node.dataset.areaTarget = 'true'
		}
	})

	onDestroy(() => {
		currentItem = null
		delete origin.area.node.dataset.areaOrigin
		delete area?.node.dataset.areaTarget
		origin.area.isOrigin = false
		if(area) {
			area.isTarget = false
		}
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
		if(area?.options.axis !== 'y') {
			moved.x += e.movementX
		}
		if(area?.options.axis !== 'x') {
			moved.y += e.movementY
		}
	}}
	onpointerup={stop}
></svelte:window>


<div id='runic-drag' style='--x: {newPos.x}px; --y: {newPos.y}px' data-area-class={area?.options?.class ?? ''}>
	{@render children(currentItem, itemState)}
</div>


<style>

	#runic-drag {
		pointer-events: none;
		user-select: none;
		position: absolute;
		top: var(--y);
		left: var(--x);
		z-index: 99;
	}

</style>