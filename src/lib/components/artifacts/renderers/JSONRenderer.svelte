<script lang="ts">
	import { run } from 'svelte/legacy';

import { createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile } from '$lib/utils/artifacts/artifact-parser';
import CodeRenderer from './CodeRenderer.svelte';

	interface Props {
		artifact: ParsedArtifact;
		height?: string;
	}

	let { artifact, height = '400px' }: Props = $props();

const dispatch = createEventDispatcher();

let jsonContent: string = '';
let formattedJson: string = $state('');
let error: string | null = $state(null);


function loadJSON() {
try {
error = null;
const primaryFile = getPrimaryFile(artifact);

if (!primaryFile || !primaryFile.content) {
throw new Error('No JSON content found in artifact');
}

jsonContent = primaryFile.content;

// Try to parse and format the JSON
try {
const parsed = JSON.parse(jsonContent);
formattedJson = JSON.stringify(parsed, null, 2);
} catch {
// If parsing fails, use original content
formattedJson = jsonContent;
}

dispatch('load', { content: jsonContent, formatted: formattedJson });

} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error loading JSON';
dispatch('error', { message: error, error: e });
}
}

function handleRendererError(event) {
dispatch('error', event.detail);
}

function handleRendererLoad(event) {
dispatch('load', event.detail);
}
run(() => {
loadJSON();
});
</script>

<div class="json-renderer" style="height: {height};">
{#if error}
<div class="error-container">
<h4>JSON Rendering Error</h4>
<p>{error}</p>
</div>
{:else if formattedJson}
<CodeRenderer 
content={formattedJson}
language="json"
readonly={true}
{height}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{/if}
</div>

<style>
.json-renderer {
width: 100%;
border-radius: 4px;
overflow: hidden;
background: var(--background-color, #ffffff);
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
.json-renderer {
background: #1f2937;
}

.error-container {
color: #f87171;
background: #1f2937;
border-color: #374151;
}
}
</style>
