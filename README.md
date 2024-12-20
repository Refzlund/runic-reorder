# Runic Reorder

Powered by Svelte 5's Runes, an extremely flexible and simple drag-and-drop api.

### Usage

`bun add -D runic-reorder`

```html
<script lang='ts'>
	import reorder, { type ItemState } from 'runic-reorder'

	let array = $state([
		'a',
		'b',
		'c'
	])
	type Item = typeof array[number]

	const area = reorder(content) // Reference the snippet
</script>

{#snippet content(item: Item, state: ItemState)}
	<div use:state.handle>
		{item}
	</div>
{/if}

<div use:area>
	{@render area(array)}
</div>

```

That's as simple as it gets. You can move items between each `use:area`. The `@render area(...)` takes an array as input, which are the items rendered.

> [!IMPORTANT]  
> Entries must be unique.

<br>

> [!NOTE]  
> Sadly, the `animate:` directive is not currently supported,
> as the `@render area(...)` creates the `{@each items as item, i (item)}` loop.  
> The `animate:` directive can therefore not be used for snippet elements.
>
> I'm currently planning on finding an alternative like `use:state.animate={flip}`.

<br>
<br>

### `reorder` and it's `area` return value
```ts
const reorder: (snippet: Snippet<[item: T, state: ItemState<T>]>) =>
	| function(node: HTMLElement, options: AreaOptions): { destroy(): void }
	| function(array: T[]): ReturnType<Snippet>
```

When you create an area using `reorder(snippet)` it serves as a svelte action:
<br> `<div use:area={areaOptions}>`
<br> and a snippet:
<br> `{@render area(array)}`

The action marks the dropable area for the rendered list, giving you flexibility for structure and accessibility considerations.

The **element** with `use:area` will be provided the following `data-attributes`:

| Attribute | Value(s) | Description |
| --- | --- | --- |
| `data-area-condition` | `'true' \| 'false'` | Does the area meet the condition of the dragged item? |
| `data-area-class` | `options.class` | The classes you provide in `AreaOptions` |
| `data-area-target` | `true` | Present if the area the current target of the dragged item |
| `data-area-origin` | `true` | Present if the area is the origin for the dragged item |

Using selectors such as `div[data-area-condition='true'] {...}`,
`div[data-area-target]` and `div[data-area-class~='...']` you can style your area according to the situation.

> [!NOTE]  
> The reason of `data-area-class` is so that you can also style the dragged item, which is moved to the body doing dragging. [Read more about the `~='...'` selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attrvalue_2)

You can provide each area with custom options, just for that specific area:

#### `AreaOptions`

| Property | Type | Description |
| --- | --- | --- |
| axis | `'x' \| 'y'` | Lock element movement to one axis |
| class | `string` | `data-area-class` attribute |
| condition | `(item: T) => boolean` | Acceptance criteria, whether an item can be dropped here |
| onDrop | `(item: T) => void` | Modify (or what not) the item when it is dropped into the area. |
| get | `(areaState: AreaState<T>) => void` | Get the AreaState; <br> `let area = $state() as undefined \| AreaState` <br>and<br> `<div use:order.area.array={{ get: a => area = a }}>` |


<br>
<br>

### ItemState and AreaState

#### `ItemState`

| Property | Type | Description |
| --- | --- | --- |
| `dragging` | `boolean` | Is this item dragged? |
| `positioning` | `boolean` | Is this item being positioned somewhere? |
| `draggedIs` | `undefined \| 'before' \| 'after'` | Is the dragged item the next or previous item in the same array? |
| `handle` | `(element: HTMLElement, options?: HandleOptions) => void` | The handle is the element that is draggable. |
| `anchor` | `(element: HTMLElement) => void` | The anchor is the part that a dragged item will use to find the closest item. |
| `area` | `AreaState<T>` | The area this item is in. |
| `index` | `number` | The index of this item in its array |
| `array` | `T[]` | The array this item is in |
| `value` | `T` | The value of this item |

#### `AreaState`

| Property | Type | Description |
| --- | --- | --- |
| `node` | `HTMLElement` | The area element |
| `options` | `AreaOptions<T>` | The area options |
| `class` | `string[]` | An array of classes separated by space from the options; <br>`{ class: '...' }` |
| `isTarget` | `boolean` | Is the dragged item targeting this area? |
| `isOrigin` | `boolean` | Did the dragged item come from here? |
| `items` | `ItemState<T>[]` | The items (ItemState) that are within this area |
| `array` | `T[]` | The array associated with this area |
