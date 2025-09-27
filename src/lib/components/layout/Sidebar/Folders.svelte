<script lang="ts">
	import { run } from 'svelte/legacy';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	import RecursiveFolder from './RecursiveFolder.svelte';

	interface Props {
		folders?: any;
		shiftKey?: boolean;
		onDelete?: any;
	}

	let { folders = {}, shiftKey = false, onDelete = (folderId) => {} }: Props = $props();

	let folderList = $state([]);
	// Get the list of folders that have no parent, sorted by name alphabetically
	run(() => {
		folderList = Object.keys(folders)
			.filter((key) => folders[key].parent_id === null)
			.sort((a, b) =>
				folders[a].name.localeCompare(folders[b].name, undefined, {
					numeric: true,
					sensitivity: 'base'
				})
			);
	});
</script>

{#each folderList as folderId (folderId)}
	<RecursiveFolder
		className=""
		{folders}
		{folderId}
		{shiftKey}
		{onDelete}
		on:import={(e) => {
			dispatch('import', e.detail);
		}}
		on:update={(e) => {
			dispatch('update', e.detail);
		}}
		onchange={(e) => {
			dispatch('change', e.detail);
		}}
	/>
{/each}
