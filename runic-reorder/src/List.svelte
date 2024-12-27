<script module lang='ts'>
	import { tick, untrack, type Snippet } from 'svelte'
	import type { ItemState } from './item-state.svelte.js'
	import type { ContentSnippet } from './reorder.svelte.js'
	import { AreaState } from './area-state.svelte.js'

	declare const list: (
		$anchor: HTMLElement,
		content: () => ContentSnippet,
		areaState: () => AreaState,
		array: () => unknown[],
		startIndex: () => number,
		getState: () => (value: any, index: number) => ItemState
	) => ReturnType<Snippet>

	export { list }
</script>

{#snippet list(content: ContentSnippet, areaState: AreaState, array: unknown[], startIndex: number, getState: (value: any, index: number) => ItemState)}
	{#if areaState}
		{#each array as item, i (item)}
			{@const state = untrack(() => getState(item, i))}
			{(() => {
				$effect(() => {
					state.index = i + startIndex
					return () => {
						if(state.index < startIndex || state.index >= startIndex + array.length) {
							state.destroy()
						}
					}
				})
			})()}
			{@render content(item, state)}
		{/each}
	{/if}
{/snippet}