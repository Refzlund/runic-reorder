<script lang='ts'>

	import reorder, { type AreaState, type ItemState } from 'runic-reorder'

	let array = $state([
		{ label: 'a' },
		{ label: 'b' },
		{ label: 'c' }
	])

	let array2 = $state([
		{ label: 'd' },
		{ label: 'e' },
		{ label: 'f' }
	])

	let order = reorder(content)

	let array1class = $state('a c')
	let area = $state() as AreaState<typeof array[number]> | undefined

</script>

<button onclick={() => {
	array1class = array1class.includes('a') ? 'c' : 'a c'
}}> Toggle a-class </button>

{#snippet content(item: typeof array[number], state: ItemState)}
	<div
		use:state.handle
		style:opacity={state.dragging ? .75 : state.positioning ? .25 : 1}
	>
		{item.label}
		{#if state.area.class.includes('a')}
			<sup><small>~a</small></sup>
		{/if}
	</div>
{/snippet}

<div use:order={{ class: array1class, get: a => area = a }}>
	<h4>
		Array 1
		{#if area?.isOrigin} * {/if}
		{#if area?.isTarget} + {/if}
	</h4>
	
	<div class="x">
		{@render order(array)}
	</div>
</div>

<div use:order={{ class: 'ab ba', condition: item => !['a', 'e', 'f'].includes(item.label) }}>
	<h4> Array 2 </h4>
	<div class="y">
		{@render order(array2)}
	</div>
</div>



<style>

	:global([data-area-class~='a']) div {
		color: cadetblue;
	}
	
	div:global([data-area-condition='true']) > div {
		border-color: grey;
	}
	div:global([data-area-origin]) > div {
		border-color: lightgoldenrodyellow;
	}
	div:global([data-area-target]) > div {
		border-color: lightskyblue;
	}
	div:global([data-area-condition='false']) > div {
		border-color: lightcoral;
	}
	

	h4 {
		margin-bottom: .5rem;
		cursor: default;
	}

	.x, .y {
		display: inline-flex;
		gap: 1rem;
		padding: 1rem 1rem;
		border: 1px solid lightgrey;
	}

	.y {
		flex-direction: column;
	}

</style>