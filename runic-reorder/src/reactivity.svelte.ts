import { tick, untrack } from 'svelte'
import { ItemState } from './item-state.svelte'
import { AreaState } from './area-state.svelte'


/** Current array and index that is being dragged */
export const current = $state({
	index: 0,
	area: null as AreaState<any> | null,
	item: undefined
})

export const lastSplice = {
	area: null as null | AreaState<any>,
	index: -1
}

export const targeting = $state({}) as ReturnType<typeof resetDragTargeting>
resetDragTargeting()

function put(area: AreaState<any>, index: number, item: any) {
	if (!lastSplice.area || (current.area === lastSplice.area && lastSplice.index === index))
		return
	
	lastSplice.area.array!.splice(current.index, 1)
	area.array!.splice(index, 0, item)

	if(lastSplice.area !== area) {
		lastSplice.area.items.delete(item)
	}

	lastSplice.area = area
	lastSplice.index = index
	current.area = area
	current.index = index
}

export function resetDragTargeting() {
	const self = $state({
		positionTrigger: true,
		position: {
			x: NaN,
			y: NaN,
			h: NaN,
			w: NaN
		},
		targetable: false,
		enteredArea: false
	})
	Object.assign(targeting, self)
	return self
}

function distance(a: { x: number, y: number }, b: { x: number, y: number }) {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

const targetItem = $derived.by(() => {
	if (!targeting.targetable) return

	let closest = undefined as undefined | ItemState
	let closestDistance = Infinity

	targeting.position.y
	targeting.positionTrigger

	if (isNaN(targeting.position.x)) return
	
	current.area
	current.area?.items?.size

	untrack(() => {
		for (const [_, item] of current.area?.items || []) {
			if (isNaN(item.position.x)) continue
			if (!closest || (distance(targeting.position, item.position) < closestDistance)) {
				closest = item
				closestDistance = distance(targeting.position, item.position)
			}
		}
	})

	return closest
})

const targetIndex = $derived(targetItem?.index ?? 0)

export function dragReactivity(enabled: () => boolean) {
	let ticked = false
	function untick() {
		if(!ticked) return
		ticked = false
		current.area?.items.forEach(i => i.updatePosition())
	}

	let trigger = $state(false)
	$effect(() => {
		if (!enabled()) return

		trigger
		if (!current.area || targetIndex === -1 || !targeting.targetable) return
		const isSelf = (targetItem && (targetItem.area === lastSplice.area && targetIndex === lastSplice.index)) || (targetItem?.value === current.item)
		if(isSelf) return
		
		untrack(() => {
			if(ticked) return
			ticked = true

			requestAnimationFrame(untick)

			let last = targeting.enteredArea && targetIndex === current.area!.items.size - 1
			put(
				current.area!,
				last ? targetIndex + 1 : targetIndex,
				current.item
			)

			if(last) {
				tick().then(() => {
					untick()
					targeting.targetable = targeting.targetable
					trigger = !trigger
				})
			}
		})
	})
}
