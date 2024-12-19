<script module lang='ts'>
	import type { Snippet } from 'svelte'
	import type { ItemState } from './item-state.svelte.js'
	import type { ContentSnippet } from './reorder.svelte.js'

	declare const listSnip: (
		$anchor: HTMLElement,
		content: () => ContentSnippet,
		array: () => unknown[],
		getState: () => (index: number) => ItemState
	) => ReturnType<Snippet>

	export function list(...args: Parameters<typeof listSnip>) {
		return listSnip(...args)
	}

</script>

{#snippet listSnip(content: ContentSnippet, array: unknown[], getState: (index: number) => ItemState)}
	{#each array as item, i (item)}
		{@const state = getState(i)}
		{#if state.area}
			{@render content(item, state)}
		{:else}
			{#await new Promise((resolve) => requestAnimationFrame(resolve)) then _}
				{(() => { throw new Error('runic-reorder: List not inside an area. Make sure to use `use:order.area...` for a parent') })()}
			{/await}
		{/if}
	{/each}
{/snippet}