<script module lang='ts'>
	import type { Snippet } from 'svelte'
	import type { ItemState } from './item-state.svelte.js'

	// @ts-expect-error
	export { list }
</script>

{#snippet list(content: Snippet<[item: unknown, state: ItemState]>, array: unknown[], getState: (index: number) => ItemState)}
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