<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile } from '$lib/utils/artifacts/artifact-parser';

export let artifact: ParsedArtifact;
export let height: string = '400px';

const dispatch = createEventDispatcher();

let iframeElement: HTMLIFrameElement;
let error: string | null = null;

$: {
if (iframeElement && artifact) {
renderHTML();
}
}

function renderHTML() {
if (!iframeElement) return;

try {
error = null;
const primaryFile = getPrimaryFile(artifact);

if (!primaryFile || !primaryFile.content) {
throw new Error('No HTML content found in artifact');
}

// Create a blob URL for the HTML content
const htmlContent = primaryFile.content;
const blob = new Blob([htmlContent], { type: 'text/html' });
const url = URL.createObjectURL(blob);

// Set iframe source
iframeElement.src = url;

// Clean up the previous URL when component updates or unmounts
iframeElement.onload = () => {
dispatch('load', { content: htmlContent });
};

iframeElement.onerror = () => {
error = 'Failed to load HTML content';
dispatch('error', { message: error });
};

} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error rendering HTML';
dispatch('error', { message: error, error: e });
}
}

onMount(() => {
renderHTML();
});
</script>

<div class="html-renderer" style="height: {height};">
{#if error}
<div class="error-container">
<h4>HTML Rendering Error</h4>
<p>{error}</p>
</div>
{:else}
<iframe 
bind:this={iframeElement}
title={artifact.title}
sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
loading="lazy"
></iframe>
{/if}
</div>

<style>
.html-renderer {
width: 100%;
border-radius: 4px;
overflow: hidden;
background: var(--background-color, #ffffff);
position: relative;
}

iframe {
width: 100%;
height: 100%;
border: none;
border-radius: 4px;
background: white;
}

.error-container {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 100%;
padding: 20px;
text-align: center;
color: var(--error-color, #dc2626);
background: var(--error-background, #fef2f2);
border: 1px solid var(--error-border, #fecaca);
border-radius: 4px;
}

.error-container h4 {
margin: 0 0 8px 0;
font-size: 16px;
font-weight: 600;
}

.error-container p {
margin: 0;
font-size: 14px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
.html-renderer {
background: #1f2937;
}

.error-container {
color: #f87171;
background: #1f2937;
border-color: #374151;
}
}
</style>
