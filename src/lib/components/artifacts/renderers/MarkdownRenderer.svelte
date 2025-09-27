<script lang="ts">
	import { run } from 'svelte/legacy';

import { onMount, createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile } from '$lib/utils/artifacts/artifact-parser';
import Markdown from '$lib/components/chat/Messages/Markdown.svelte';

	interface Props {
		artifact: ParsedArtifact;
		height?: string;
	}

	let { artifact, height = '400px' }: Props = $props();

const dispatch = createEventDispatcher();

let markdownContent: string = $state('');
let error: string | null = $state(null);


function loadMarkdown() {
try {
error = null;
const primaryFile = getPrimaryFile(artifact);

if (!primaryFile || !primaryFile.content) {
throw new Error('No Markdown content found in artifact');
}

markdownContent = primaryFile.content;
dispatch('load', { content: markdownContent });

} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error loading Markdown';
dispatch('error', { message: error, error: e });
}
}

onMount(() => {
loadMarkdown();
});
run(() => {
if (artifact) {
loadMarkdown();
}
});
</script>

<div class="markdown-renderer" style="height: {height};">
{#if error}
<div class="error-container">
<h4>Markdown Rendering Error</h4>
<p>{error}</p>
</div>
{:else if markdownContent}
<div class="markdown-content">
<Markdown content={markdownContent} />
</div>
{:else}
<div class="loading-container">
<p>Loading markdown content...</p>
</div>
{/if}
</div>

<style>
.markdown-renderer {
width: 100%;
border-radius: 4px;
overflow: auto;
background: var(--background-color, #ffffff);
border: 1px solid var(--border-color, #e1e5e9);
position: relative;
}

.markdown-content {
padding: 20px;
height: 100%;
overflow-y: auto;
}

.error-container,
.loading-container {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 100%;
padding: 20px;
text-align: center;
}

.error-container {
color: var(--error-color, #dc2626);
background: var(--error-background, #fef2f2);
border: 1px solid var(--error-border, #fecaca);
border-radius: 4px;
}

.loading-container {
color: var(--text-muted, #6b7280);
}

.error-container h4 {
margin: 0 0 8px 0;
font-size: 16px;
font-weight: 600;
}

.error-container p,
.loading-container p {
margin: 0;
font-size: 14px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
.markdown-renderer {
background: #1f2937;
border-color: #374151;
}

.error-container {
color: #f87171;
background: #1f2937;
border-color: #374151;
}

.loading-container {
color: #9ca3af;
}
}

/* Custom markdown styles for better readability */
:global(.markdown-content h1) {
color: var(--text-color, #1f2937);
border-bottom: 2px solid var(--border-color, #e1e5e9);
padding-bottom: 8px;
}

:global(.markdown-content h2) {
color: var(--text-color, #1f2937);
border-bottom: 1px solid var(--border-color, #e1e5e9);
padding-bottom: 4px;
}

:global(.markdown-content blockquote) {
border-left: 4px solid var(--primary-color, #3b82f6);
padding-left: 16px;
margin-left: 0;
font-style: italic;
}

:global(.markdown-content code) {
background: var(--code-background, #f3f4f6);
padding: 2px 6px;
border-radius: 4px;
font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
font-size: 0.9em;
}

:global(.markdown-content pre) {
background: var(--code-background, #f3f4f6);
padding: 16px;
border-radius: 6px;
overflow-x: auto;
}

@media (prefers-color-scheme: dark) {
:global(.markdown-content h1),
:global(.markdown-content h2) {
color: #f9fafb;
}

:global(.markdown-content h1) {
border-bottom-color: #374151;
}

:global(.markdown-content h2) {
border-bottom-color: #374151;
}

:global(.markdown-content code),
:global(.markdown-content pre) {
background: #374151;
}
}
</style>
