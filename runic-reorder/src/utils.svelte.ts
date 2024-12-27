import { observeMove } from './observe-move.js'

/** Returns the `parent` of `node` that is sibling to the `reference` */
export function sameParent(node: HTMLElement, reference: HTMLElement) {
	if(node.parentElement === reference.parentElement) return node
	let parent = node.parentElement
	while (parent && parent.parentElement !== reference.parentElement) {
		parent = parent.parentElement
	}
	return parent
}

export function getPosition(node?: HTMLElement) {
	if(!node) return { x: NaN, y: NaN, h: NaN, w: NaN }
	const rect = node.getBoundingClientRect()
	return { x: rect.left, y: rect.top, h: rect.height, w: rect.width }
}

export function trackPosition(node: HTMLElement, isEnabled: () => boolean, setPosition: (position: { x: number, y: number, h: number, w: number }) => void) {
	const update = () => {
		if (isEnabled()) {
			setPosition(getPosition(node))
		}
	}
	
	$effect(update)
	const ro = new ResizeObserver(update)
	const cleanup = observeMove(node, isEnabled, update)
	ro.observe(node)

	update()

	return () => {
		ro.unobserve(node)
		ro.disconnect()
		cleanup()
	}
}