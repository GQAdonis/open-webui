<script lang="ts">
	import { onMount, tick } from 'svelte';


	interface Props {
		value?: string;
		placeholder?: string;
		rows?: number;
		minSize?: any;
		maxSize?: any;
		required?: boolean;
		readonly?: boolean;
		className?: string;
		onBlur?: any;
	}

	let {
		value = $bindable(''),
		placeholder = '',
		rows = 1,
		minSize = null,
		maxSize = null,
		required = false,
		readonly = false,
		className = 'w-full rounded-lg px-3.5 py-2 text-sm bg-gray-50 dark:text-gray-300 dark:bg-gray-850 outline-hidden  h-full',
		onBlur = () => {}
	}: Props = $props();
	let textareaElement = $state();

	// Adjust height on mount and after setting the element.
	onMount(async () => {
		await tick();
		resize();

		requestAnimationFrame(() => {
			// setInterveal to cehck until textareaElement is set
			const interval = setInterval(() => {
				if (textareaElement) {
					clearInterval(interval);
					resize();
				}
			}, 100);
		});
	});

	const resize = () => {
		if (textareaElement) {
			textareaElement.style.height = '';

			let height = textareaElement.scrollHeight;
			if (maxSize && height > maxSize) {
				height = maxSize;
			}
			if (minSize && height < minSize) {
				height = minSize;
			}

			textareaElement.style.height = `${height}px`;
		}
	};
</script>

<textarea
	bind:this={textareaElement}
	bind:value
	{placeholder}
	class={className}
	style="field-sizing: content;"
	{rows}
	{required}
	{readonly}
	oninput={(e) => {
		resize();
	}}
	onfocus={() => {
		resize();
	}}
	onblur={onBlur}
></textarea>
