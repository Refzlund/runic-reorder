export type AreaOptions<T> = {
	/**
	 * Lock movement to one axis
	 * @default undefined
	*/
	axis?: 'x' | 'y'

	/** 
	 * For styling based on area by using the selector  
	 * `:global([data-area-class~='...']) ...`
	 * 
	 * [Read more about the ~= attr-selector](https://developer.mozilla.org/en-US/docs/Web/CSS/Attribute_selectors#attrvalue_2)
	*/
	class?: string

	/** Acceptance criteria */
	condition?: (item: T) => boolean

	/**
	 * Get the AreaState
	 * 
	 * @example
	 * let area = $state() as undefined | AreaState
	 * 
	 * <div use:order.area.array={{ get: a => area = a }}>
	*/
	get?: (areaState: AreaState<T>) => void
}

export class AreaState<T = any> {
	node: HTMLElement
	options: AreaOptions<T> = $state({})

	class = $derived(this.options.class?.split(' ') || [])

	/** Is the dragged item targeting this area? */
	isTarget = $state(false)
	/** Did the dragged item come from here? */
	isOrigin = $state(false)

	constructor(node: HTMLElement, options: () => AreaOptions<T>) {
		this.node = node
		Object.assign(this, {
			get options() {
				return options()
			}
		})
	}
}