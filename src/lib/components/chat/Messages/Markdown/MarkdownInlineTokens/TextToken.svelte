<script lang="ts">
	import { run } from 'svelte/legacy';

	import { fade } from 'svelte/transition';

	interface Props {
		token: any;
		done?: boolean;
	}

	let { token, done = true }: Props = $props();

	let texts = $state([]);
	run(() => {
		texts = (token?.raw ?? '').split(' ');
	});
</script>

{#if done}
	{token?.raw}
{:else}
	{#each texts as text}
		<span class="" transition:fade={{ duration: 100 }}>
			{text}
		</span>
	{/each}
{/if}
