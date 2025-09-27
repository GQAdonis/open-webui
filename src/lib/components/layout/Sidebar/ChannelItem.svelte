<!-- @migration-task Error while migrating Svelte code: `<button>` cannot be a child of `<button>`. The browser will 'repair' the HTML (by moving, removing, or inserting elements) which breaks Svelte's assumptions about the structure of your components.
https://svelte.dev/e/node_invalid_placement -->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { onMount, getContext, tick, onDestroy } from 'svelte';
	const i18n = getContext('i18n');

	import { page } from '$app/stores';
	import { mobile, showSidebar, user } from '$lib/stores';
	import { updateChannelById } from '$lib/apis/channels';

	import Cog6 from '$lib/components/icons/Cog6.svelte';
	import ChannelModal from './ChannelModal.svelte';
	import Lock from '$lib/components/icons/Lock.svelte';
	import Hashtag from '$lib/components/icons/Hashtag.svelte';

	export let onUpdate: Function = () => {};

	export let className = '';
	export let channel;

	let showEditChannelModal = false;

	let itemElement;
</script>

<ChannelModal
	bind:show={showEditChannelModal}
	{channel}
	edit={true}
	{onUpdate}
	onSubmit={async ({ name, access_control }) => {
		const res = await updateChannelById(localStorage.token, channel.id, {
			name,
			access_control
		}).catch((error) => {
			toast.error(error.message);
		});

		if (res) {
			toast.success($i18n.t('Channel updated successfully'));
		}

		onUpdate();
	}}
/>

<div
	id="sidebar-channel-item"
	bind:this={itemElement}
	class=" w-full {className} rounded-xl flex relative group hover:bg-gray-100 dark:hover:bg-gray-900 {$page
		.url.pathname === `/channels/${channel.id}`
		? 'bg-gray-100 dark:bg-gray-900 selected'
		: ''} px-2.5 py-1"
>
	<a
		class=" w-full flex justify-between"
		href="/channels/{channel.id}"
		onclick={() => {
			console.log(channel);
			if ($mobile) {
				showSidebar.set(false);
			}
		}}
		draggable="false"
	>
		<div class="flex items-center gap-1 shrink-0">
			<div class=" size-4 justify-center flex items-center">
				{#if channel?.access_control === null}
					<Hashtag className="size-3" strokeWidth="2.5" />
				{:else}
					<Lock className="size-[15px]" strokeWidth="2" />
				{/if}
			</div>

			<div class=" text-left self-center overflow-hidden w-full line-clamp-1 flex-1">
				{channel.name}
			</div>
		</div>
	</a>

	{#if $user?.role === 'admin'}
		<button
			class="absolute z-10 right-2 invisible group-hover:visible self-center flex items-center dark:text-gray-300 p-0.5 dark:hover:bg-gray-850 rounded-lg touch-auto"
			onclick={(e) => {
				e.stopPropagation();
				showEditChannelModal = true;
			}}
		>
			<Cog6 className="size-3.5" />
		</button>
	{/if}
</div>
