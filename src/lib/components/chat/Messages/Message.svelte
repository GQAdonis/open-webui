<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { tick, getContext, onMount, createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	const i18n = getContext<I18nContext>('i18n');

	import { settings } from '$lib/stores';
	import { copyToClipboard } from '$lib/utils';

    import MultiResponseMessages from './MultiResponseMessages.svelte';
    import ResponseMessage from './ResponseMessage.svelte';
    import UserMessage from './UserMessage.svelte';
    import type { HistoryType, ModelSelection, I18nContext } from '$lib/types';







	interface Props {
		chatId: string;
		selectedModels?: ModelSelection;
		idx?: number;
		history: HistoryType;
		messageId: string;
		user: any;
		setInputText?: Function;
		gotoMessage: any;
		showPreviousMessage: any;
		showNextMessage: any;
		updateChat: any;
		editMessage: any;
		saveMessage: any;
		deleteMessage: any;
		rateMessage: any;
		actionMessage: any;
		submitMessage: any;
		regenerateResponse: any;
		continueResponse: any;
		mergeResponses: any;
		addMessages: any;
		triggerScroll: any;
		readOnly?: boolean;
		editCodeBlock?: boolean;
		topPadding?: boolean;
	}

	let {
		chatId,
		selectedModels = [],
		idx = 0,
		history = $bindable(),
		messageId,
		user,
		setInputText = () => {},
		gotoMessage,
		showPreviousMessage,
		showNextMessage,
		updateChat,
		editMessage,
		saveMessage,
		deleteMessage,
		rateMessage,
		actionMessage,
		submitMessage,
		regenerateResponse,
		continueResponse,
		mergeResponses,
		addMessages,
		triggerScroll,
		readOnly = false,
		editCodeBlock = true,
		topPadding = false
	}: Props = $props();
</script>

<div
	class="flex flex-col justify-between px-5 mb-3 w-full {($settings?.widescreenMode ?? null)
		? 'max-w-full'
		: 'max-w-5xl'} mx-auto rounded-lg group"
>
	{#if history.messages[messageId]}
		{#if history.messages[messageId].role === 'user'}
			<UserMessage
				{user}
				{chatId}
				{history}
				{messageId}
				isFirstMessage={idx === 0}
				siblings={history.messages[messageId].parentId !== null
					? (history.messages[history.messages[messageId].parentId]?.childrenIds ?? [])
					: (Object.values(history.messages)
							.filter((message) => message.parentId === null)
							.map((message) => message.id) ?? [])}
				{gotoMessage}
				{showPreviousMessage}
				{showNextMessage}
				{editMessage}
				{deleteMessage}
				{readOnly}
				{editCodeBlock}
				{topPadding}
			/>
		{:else if (history.messages[history.messages[messageId].parentId]?.models?.length ?? 1) === 1}
			<ResponseMessage
				{chatId}
				{history}
				{messageId}
				{selectedModels}
				isLastMessage={messageId === history.currentId}
				siblings={history.messages[history.messages[messageId].parentId]?.childrenIds ?? []}
				{setInputText}
				{gotoMessage}
				{showPreviousMessage}
				{showNextMessage}
				{updateChat}
				{editMessage}
				{saveMessage}
				{rateMessage}
				{actionMessage}
				{submitMessage}
				{deleteMessage}
				{continueResponse}
				{regenerateResponse}
				{addMessages}
				{readOnly}
				{editCodeBlock}
				{topPadding}
			/>
		{:else}
			<MultiResponseMessages
				bind:history
				{chatId}
				{messageId}
				{selectedModels}
				isLastMessage={messageId === history?.currentId}
				{setInputText}
				{updateChat}
				{editMessage}
				{saveMessage}
				{rateMessage}
				{actionMessage}
				{submitMessage}
				{deleteMessage}
				{continueResponse}
				{regenerateResponse}
				{mergeResponses}
				{triggerScroll}
				{addMessages}
				{readOnly}
				{editCodeBlock}
				{topPadding}
			/>
		{/if}
	{/if}
</div>
