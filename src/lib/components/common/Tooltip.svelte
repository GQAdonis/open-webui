<script lang="ts">
	import { run } from 'svelte/legacy';

	import DOMPurify from 'dompurify';

	import { onDestroy } from 'svelte';

	import tippy from 'tippy.js';




	interface Props {
		elementId?: string;
		as?: string;
		className?: string;
		placement?: string;
		content?: any;
		touch?: boolean;
		theme?: string;
		offset?: any;
		allowHTML?: boolean;
		tippyOptions?: any;
		interactive?: boolean;
		onClick?: any;
		children?: import('svelte').Snippet;
		tooltip?: import('svelte').Snippet;
	}

	let {
		elementId = '',
		as = 'div',
		className = 'flex',
		placement = 'top',
		content = `I'm a tooltip!`,
		touch = true,
		theme = '',
		offset = [0, 4],
		allowHTML = true,
		tippyOptions = {},
		interactive = false,
		onClick = () => {},
		children,
		tooltip
	}: Props = $props();

	let tooltipElement = $state();
	let tooltipInstance = $state();

	run(() => {
		if (tooltipElement && (content || elementId)) {
			let tooltipContent = null;

			if (elementId) {
				tooltipContent = document.getElementById(`${elementId}`);
			} else {
				tooltipContent = DOMPurify.sanitize(content);
			}

			if (tooltipInstance) {
				tooltipInstance.setContent(tooltipContent);
			} else {
				if (content) {
					tooltipInstance = tippy(tooltipElement, {
						content: tooltipContent,
						placement: placement,
						allowHTML: allowHTML,
						touch: touch,
						...(theme !== '' ? { theme } : { theme: 'dark' }),
						arrow: false,
						offset: offset,
						...(interactive ? { interactive: true } : {}),
						...tippyOptions
					});
				}
			}
		} else if (tooltipInstance && content === '') {
			if (tooltipInstance) {
				tooltipInstance.destroy();
			}
		}
	});

	onDestroy(() => {
		if (tooltipInstance) {
			tooltipInstance.destroy();
		}
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element this={as} bind:this={tooltipElement} class={className} onclick={onClick}>
	{#if children}
		{@render children()}
	{/if}
</svelte:element>

{#if tooltip}
	{@render tooltip()}
{/if}
