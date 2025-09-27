<script lang="ts">
	import { run } from 'svelte/legacy';

	import { marked } from 'marked';
	import { replaceTokens, processResponseContent } from '$lib/utils';
	import { user } from '$lib/stores';

	import markedExtension from '$lib/utils/marked/extension';
	import markedKatexExtension from '$lib/utils/marked/katex-extension';
	import { mentionExtension } from '$lib/utils/marked/mention-extension';
	import artifactExtension from '$lib/utils/marked/artifact-plugin';

	import MarkdownTokens from './Markdown/MarkdownTokens.svelte';






	interface Props {
		id?: string;
		content: any;
		done?: boolean;
		model?: any;
		save?: boolean;
		preview?: boolean;
		editCodeBlock?: boolean;
		topPadding?: boolean;
		sourceIds?: any;
		onSave?: any;
		onUpdate?: any;
		onPreview?: any;
		onSourceClick?: any;
		onTaskClick?: any;
	}

	let {
		id = '',
		content,
		done = true,
		model = null,
		save = false,
		preview = false,
		editCodeBlock = true,
		topPadding = false,
		sourceIds = [],
		onSave = () => {},
		onUpdate = () => {},
		onPreview = () => {},
		onSourceClick = () => {},
		onTaskClick = () => {}
	}: Props = $props();

	let tokens = $state([]);

	const options = {
		throwOnError: false,
		breaks: true
	};

	marked.use(markedKatexExtension(options));
	marked.use(markedExtension(options));
	marked.use(artifactExtension(options));
	marked.use({
		extensions: [mentionExtension({ triggerChar: '@' }), mentionExtension({ triggerChar: '#' })]
	});

	run(() => {
		(async () => {
			if (content) {
				tokens = marked.lexer(
					replaceTokens(processResponseContent(content), sourceIds, model?.name, $user?.name)
				);
			}
		})();
	});
</script>

{#key id}
	<MarkdownTokens
		{tokens}
		{id}
		{done}
		{save}
		{preview}
		{editCodeBlock}
		{topPadding}
		{onTaskClick}
		{onSourceClick}
		{onSave}
		{onUpdate}
		{onPreview}
	/>
{/key}
