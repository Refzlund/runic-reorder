<script lang='ts'>
	import reorder, { type ItemState } from 'runic-reorder'

	let orphans = $state([{ text: 'Adopt me' }]) as Item[]
	let columns = $state([
		{ label: 'a', items: [{ text: 'Some text' }] },
		{ label: 'b', items: [{ text: 'More text' }, { text: 'More text indeed' }] },
		{ label: 'c', items: [] }
	])
	type Column = typeof columns[number]
	type Item = Column['items'][number]

	let columnArea = reorder(columnSnippet)
	let itemArea = reorder(itemSnippet)

</script>
<!---------------------------------------------------->

<button onclick={() => {
	columns.push({ label: 'd', items: [{ text: 'New column' }] })
}} style='margin-bottom: 1rem;'>
	Add column
</button>

<div class='items orphans' style='margin-bottom: 1rem;' use:itemArea>
	{@render itemArea(orphans)}
</div>

<div class='area' use:columnArea={{ axis:'x' }}>
	{@render columnArea(columns)}
</div>


{#snippet itemSnippet(item: Item, state: ItemState)}
	<div
		class='item'
		use:state.handle={{ clickable: true }} 
		onclick={() => { console.log('+1') }}
		role='none'
		style:opacity={state.positioning ? 0 : 1}
	>
		{item.text}
	</div>
{/snippet}

{#snippet columnSnippet(item: Column, state: ItemState)}
	<div class='items' use:itemArea style:opacity={state.positioning ? 0 : 1}>
		<h4 style='margin:0' use:state.handle>{item.label}</h4>
		{@render itemArea(item.items)}
	</div>
{/snippet}

<div style='height: 150vh;'></div>


<!---------------------------------------------------->
<style>

	:global(html) {
		background-color: hsla(0, 0%, 85%, 1);
	}

	div:global([data-area-condition='true']) {
		border-color: green;
	}
	div:global([data-area-target]) {
		border-color: hsla(222, 50%, 50%);
	}

	.item {
		display: inline-block;
		padding: .25rem .5rem;
		background-color: hsla(0, 0%, 90%, 1);
		border-radius: .25rem;
		min-width: 7rem;
	}

	.items {
		display: flex;
		flex-direction: column;
		border: 1px solid hsla(0, 0%, 80%, .5);
		padding: .5rem;
		gap: .5rem;
		min-width: 8rem;
		background-color: hsla(0, 0%, 75%, 1);
		border-radius: .25rem;
	}

	.orphans {
		flex-direction: row;
		> :global(div) {
			width: fit-content;
		}
	}
	
	.area {
		display: flex;
		border: 1px dashed hsla(0, 0%, 50%, .3);
		gap: 1rem;
		padding: .5rem;
		overflow: auto;
	}

</style>