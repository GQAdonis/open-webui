<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile } from '$lib/utils/artifacts/artifact-parser';

export let artifact: ParsedArtifact;
export let height: string = '400px';

const dispatch = createEventDispatcher();

let svgContent: string = '';
let error: string | null = null;

$: {
loadSVG();
}

function loadSVG() {
try {
error = null;
const primaryFile = getPrimaryFile(artifact);

if (!primaryFile || !primaryFile.content) {
throw new Error('No SVG content found in artifact');
}

svgContent = primaryFile.content;
dispatch('load', { content: svgContent });

} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error loading SVG';
dispatch('error', { message: error, error: e });
}
}
</script>

<div class="svg-renderer" style="height: {height};">
{#if error}
<div class="error-container">
<h4>SVG Rendering Error</h4>
<p>{error}</p>
</div>
{:else if svgContent}
<div class="svg-content">
{@html svgContent}
</div>
{/if}
</div>

<style>
.svg-renderer {
width: 100%;
border-radius: 4px;
overflow: auto;
background: var(--background-color, #ffffff);
border: 1px solid var(--border-color, #e1e5e9);
display: flex;
align-items: center;
justify-content: center;
}

.svg-content {
width: 100%;
height: 100%;
display: flex;
align-items: center;
justify-content: center;
padding: 20px;
box-sizing: border-box;
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
}

:global(.svg-content svg) {
max-width: 100%;
max-height: 100%;
height: auto;
width: auto;
}
</style>
