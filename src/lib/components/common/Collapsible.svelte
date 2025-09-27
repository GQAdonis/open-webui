<script lang="ts">
	import { run } from 'svelte/legacy';

	import { decode } from 'html-entities';
	import { v4 as uuidv4 } from 'uuid';

	import { getContext } from 'svelte';
	const i18n = getContext('i18n');

	import dayjs from '$lib/dayjs';
	import duration from 'dayjs/plugin/duration';
	import relativeTime from 'dayjs/plugin/relativeTime';

	dayjs.extend(duration);
	dayjs.extend(relativeTime);

	async function loadLocale(locales) {
		if (!locales || !Array.isArray(locales)) {
			return;
		}
		for (const locale of locales) {
			try {
				dayjs.locale(locale);
				break; // Stop after successfully loading the first available locale
			} catch (error) {
				console.error(`Could not load locale '${locale}':`, error);
			}
		}
	}

	// Assuming $i18n.languages is an array of language codes
	run(() => {
		loadLocale($i18n.languages);
	});

	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	import ChevronUp from '../icons/ChevronUp.svelte';
	import ChevronDown from '../icons/ChevronDown.svelte';
	import Spinner from './Spinner.svelte';
	import CodeBlock from '../chat/Messages/CodeBlock.svelte';
	import Markdown from '../chat/Messages/Markdown.svelte';
	import Image from './Image.svelte';
	import FullHeightIframe from './FullHeightIframe.svelte';
	import { settings } from '$lib/stores';






	interface Props {
		open?: boolean;
		className?: string;
		buttonClassName?: string;
		id?: string;
		title?: any;
		attributes?: any;
		chevron?: boolean;
		grow?: boolean;
		disabled?: boolean;
		hide?: boolean;
		onChange?: Function;
		content?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	}

	let {
		open = $bindable(false),
		className = '',
		buttonClassName = 'w-fit text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition',
		id = '',
		title = null,
		attributes = null,
		chevron = false,
		grow = false,
		disabled = false,
		hide = false,
		onChange = () => {},
		content,
		children
	}: Props = $props();

	run(() => {
		onChange(open);
	});

	const collapsibleId = uuidv4();

	function parseJSONString(str) {
		try {
			return parseJSONString(JSON.parse(str));
		} catch (e) {
			return str;
		}
	}

	function formatJSONString(str) {
		try {
			const parsed = parseJSONString(str);
			// If parsed is an object/array, then it's valid JSON
			if (typeof parsed === 'object') {
				return JSON.stringify(parsed, null, 2);
			} else {
				// It's a primitive value like a number, boolean, etc.
				return `${JSON.stringify(String(parsed))}`;
			}
		} catch (e) {
			// Not valid JSON, return as-is
			return str;
		}
	}
</script>

<div {id} class={className}>
	{#if attributes?.type === 'tool_calls'}
		{@const args = decode(attributes?.arguments)}
		{@const result = decode(attributes?.result ?? '')}
		{@const files = parseJSONString(decode(attributes?.files ?? ''))}
		{@const embeds = parseJSONString(decode(attributes?.embeds ?? ''))}

		{#if embeds && Array.isArray(embeds) && embeds.length > 0}
			<div class="py-1 w-full cursor-pointer">
				<div class=" w-full text-xs text-gray-500">
					<div class="">
						{attributes.name}
					</div>
				</div>

				{#each embeds as embed, idx}
					<div class="my-2" id={`${collapsibleId}-tool-calls-${attributes?.id}-embed-${idx}`}>
						<FullHeightIframe
							src={embed}
							{args}
							allowScripts={true}
							allowForms={true}
							allowSameOrigin={true}
							allowPopups={true}
						/>
					</div>
				{/each}
			</div>
		{:else}
			<div
				class="{buttonClassName} cursor-pointer"
				onpointerup={() => {
					if (!disabled) {
						open = !open;
					}
				}}
			>
				<div
					class=" w-full font-medium flex items-center justify-between gap-2 {attributes?.done &&
					attributes?.done !== 'true'
						? 'shimmer'
						: ''}
			"
				>
					{#if attributes?.done && attributes?.done !== 'true'}
						<div>
							<Spinner className="size-4" />
						</div>
					{/if}

					<div class="">
						{#if attributes?.done === 'true'}
							<Markdown
								id={`${collapsibleId}-tool-calls-${attributes?.id}`}
								content={$i18n.t('View Result from **{{NAME}}**', {
									NAME: attributes.name
								})}
							/>
						{:else}
							<Markdown
								id={`${collapsibleId}-tool-calls-${attributes?.id}-executing`}
								content={$i18n.t('Executing **{{NAME}}**...', {
									NAME: attributes.name
								})}
							/>
						{/if}
					</div>

					<div class="flex self-center translate-y-[1px]">
						{#if open}
							<ChevronUp strokeWidth="3.5" className="size-3.5" />
						{:else}
							<ChevronDown strokeWidth="3.5" className="size-3.5" />
						{/if}
					</div>
				</div>
			</div>

			{#if !grow}
				{#if open && !hide}
					<div transition:slide={{ duration: 300, easing: quintOut, axis: 'y' }}>
						{#if attributes?.type === 'tool_calls'}
							{#if attributes?.done === 'true'}
								<Markdown
									id={`${collapsibleId}-tool-calls-${attributes?.id}-result`}
									content={`> \`\`\`json
> ${formatJSONString(args)}
> ${formatJSONString(result)}
> \`\`\``}
								/>
							{:else}
								<Markdown
									id={`${collapsibleId}-tool-calls-${attributes?.id}-result`}
									content={`> \`\`\`json
> ${formatJSONString(args)}
> \`\`\``}
								/>
							{/if}
						{:else}
							{@render content?.()}
						{/if}
					</div>
				{/if}
			{/if}
		{/if}

		{#if attributes?.done === 'true'}
			{#if typeof files === 'object'}
				{#each files ?? [] as file, idx}
					{#if typeof file === 'string'}
						{#if file.startsWith('data:image/')}
							<Image
								id={`${collapsibleId}-tool-calls-${attributes?.id}-result-${idx}`}
								src={file}
								alt="Image"
							/>
						{/if}
					{:else if typeof file === 'object'}
						{#if file.type === 'image' && file.url}
							<Image
								id={`${collapsibleId}-tool-calls-${attributes?.id}-result-${idx}`}
								src={file.url}
								alt="Image"
							/>
						{/if}
					{/if}
				{/each}
			{/if}
		{/if}
	{:else}
		{#if title !== null}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="{buttonClassName} cursor-pointer"
				onpointerup={() => {
					if (!disabled) {
						open = !open;
					}
				}}
			>
				<div
					class=" w-full font-medium flex items-center justify-between gap-2 {attributes?.done &&
					attributes?.done !== 'true'
						? 'shimmer'
						: ''}
			"
				>
					{#if attributes?.done && attributes?.done !== 'true'}
						<div>
							<Spinner className="size-4" />
						</div>
					{/if}

					<div class="">
						{#if attributes?.type === 'reasoning'}
							{#if attributes?.done === 'true' && attributes?.duration}
								{#if attributes.duration < 1}
									{$i18n.t('Thought for less than a second')}
								{:else if attributes.duration < 60}
									{$i18n.t('Thought for {{DURATION}} seconds', {
										DURATION: attributes.duration
									})}
								{:else}
									{$i18n.t('Thought for {{DURATION}}', {
										DURATION: dayjs.duration(attributes.duration, 'seconds').humanize()
									})}
								{/if}
							{:else}
								{$i18n.t('Thinking...')}
							{/if}
						{:else if attributes?.type === 'code_interpreter'}
							{#if attributes?.done === 'true'}
								{$i18n.t('Analyzed')}
							{:else}
								{$i18n.t('Analyzing...')}
							{/if}
						{:else}
							{title}
						{/if}
					</div>

					<div class="flex self-center translate-y-[1px]">
						{#if open}
							<ChevronUp strokeWidth="3.5" className="size-3.5" />
						{:else}
							<ChevronDown strokeWidth="3.5" className="size-3.5" />
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="{buttonClassName} cursor-pointer"
				onclick={(e) => {
					e.stopPropagation();
				}}
				onpointerup={(e) => {
					if (!disabled) {
						open = !open;
					}
				}}
			>
				<div>
					<div class="flex items-start justify-between">
						{@render children?.()}

						{#if chevron}
							<div class="flex self-start translate-y-1">
								{#if open}
									<ChevronUp strokeWidth="3.5" className="size-3.5" />
								{:else}
									<ChevronDown strokeWidth="3.5" className="size-3.5" />
								{/if}
							</div>
						{/if}
					</div>

					{#if grow}
						{#if open && !hide}
							<div
								transition:slide={{ duration: 300, easing: quintOut, axis: 'y' }}
								onpointerup={(e) => {
									e.stopPropagation();
								}}
							>
								{@render content?.()}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}

		{#if !grow}
			{#if open && !hide}
				<div transition:slide={{ duration: 300, easing: quintOut, axis: 'y' }}>
					{@render content?.()}
				</div>
			{/if}
		{/if}
	{/if}
</div>
