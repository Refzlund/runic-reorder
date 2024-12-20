<script module lang='ts'>
	
	let currentItem = $state(null) as unknown | null

	/** Current array and index that is being dragged */
	export const current = $state({
		array: [] as any[],
		index: 0,
		area: null as AreaState<any> | null
	})

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
	}

</script>

<script lang='ts'>

	import {
		devicePixelRatio
	} from 'svelte/reactivity/window'

	import type { ContentSnippet, SnippetArgs } from './reorder.svelte.js'
	import { ItemState } from './item-state.svelte.js'
	import type { AreaState } from './area-state.svelte.js'
	import { onDestroy, tick, untrack } from 'svelte'
	import { trackPosition } from './utils.svelte.js'

	interface Props {
		children: ContentSnippet<unknown>
		args: SnippetArgs<unknown>
		position: { x: number, y: number }
		origin: { array: any[], index: number, area: AreaState<any> }
		min: { height: number, width: number }
		stop(): void
		put(array: any[], index: number, item: unknown): void
	}

	let { children, args, stop, position, origin, min, put }: Props = $props()
	
	current.area = origin.area
	current.area.isOrigin = true
	current.area.isTarget = true
	currentItem = args[0]

	let moved = $state({ x: 0, y: 0 })
	let newPos = $derived({
		x: position.x + moved.x / (devicePixelRatio.current ?? 1),
		y: position.y + moved.y / (devicePixelRatio.current ?? 1)
	})

	let itemState = $derived({
		...args[1],
		dragging: true,
		area: current.area,
		array: current.array,
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
		if(current.area) {
			current.area.isTarget = false
		}
	})

	let elementPosition = $state({ x: 0, y: 0 })
	function track(node: HTMLElement) {
		$effect(() => trackPosition(node,
			() => true,
			position => elementPosition = position
		))
	}

	// * Targeting position *
	let targetArray = $state(current.area?.array)
	$effect.pre(() => {
		current.area
		untrack(() => {
			if(current.area?.array !== targetArray) {
				targetArray = current.area?.array
			}
		})
	})

	function distance(a: { x: number, y: number }, b: { x: number, y: number }) {
		return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
	}

	const targetItem = $derived.by(() => {
		let closest = undefined as undefined | ItemState
		let closestDistance = Infinity
		elementPosition
		current.area
		untrack(() => {
			for(const item of current.area?.items || []) {
				if(!closest || (distance(elementPosition, item.position) < closestDistance)) {
					closest = item
					closestDistance = distance(elementPosition, item.position)
				}
			}
		})

		return closest
	})
	const targetIndex = $derived(targetItem?.index || 0)

	$effect.pre(() => {
		if(!targetArray || targetIndex === -1) return
		
		untrack(() => {
			const isSelf = (targetItem && (targetItem.array === current.array && targetIndex === current.index)) || (targetItem?.value === currentItem)
			if(isSelf) return
			put(targetArray!, targetIndex, currentItem)
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
		if(current.area?.options.axis !== 'y') {
			moved.x += e.movementX
		}
		if(current.area?.options.axis !== 'x') {
			moved.y += e.movementY
		}
	}}
	onpointerup={stop}
></svelte:window>


<div
	id='runic-drag'
	data-area-class={current.area?.options?.class ?? ''}
	use:track
	style='
		--x: {newPos.x}px;
		--y: {newPos.y}px;
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
		position: absolute;
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