<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile } from '$lib/utils/artifacts/artifact-parser';

export let artifact: ParsedArtifact;
export let height: string = '400px';

const dispatch = createEventDispatcher();

let containerElement: HTMLDivElement;
let error: string | null = null;

$: {
if (containerElement && artifact) {
renderMermaid();
}
}

async function renderMermaid() {
if (!containerElement) return;

try {
error = null;
const primaryFile = getPrimaryFile(artifact);

if (!primaryFile || !primaryFile.content) {
throw new Error('No Mermaid content found in artifact');
}

// Clear container
containerElement.innerHTML = '';

// Dynamically import mermaid
const mermaid = await import('mermaid');

// Configure mermaid
mermaid.default.initialize({
startOnLoad: false,
theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
themeVariables: {
fontFamily: 'system-ui, -apple-system, sans-serif'
},
securityLevel: 'loose', // Allow more flexibility
deterministicIds: true
});

// Generate unique ID for this diagram
const diagramId = `mermaid-${artifact.identifier}-${Date.now()}`;

// Render the diagram
const { svg } = await mermaid.default.render(diagramId, primaryFile.content);

// Insert the SVG into the container
containerElement.innerHTML = svg;

dispatch('load', { content: primaryFile.content, svg });

} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error rendering Mermaid diagram';
dispatch('error', { message: error, error: e });
}
}

onMount(() => {
renderMermaid();
});
</script>

<div class="mermaid-renderer" style="height: {height};">
{#if error}
<div class="error-container">
<h4>Mermaid Rendering Error</h4>
<p>{error}</p>
</div>
{:else}
<div 
bind:this={containerElement}
class="mermaid-content"
>
<div class="loading-container">
<div class="spinner"></div>
<p>Rendering diagram...</p>
</div>
</div>
{/if}
</div>

<style>
.mermaid-renderer {
width: 100%;
border-radius: 4px;
overflow: auto;
background: var(--background-color, #ffffff);
border: 1px solid var(--border-color, #e1e5e9);
position: relative;
}

.mermaid-content {
width: 100%;
height: 100%;
display: flex;
align-items: center;
justify-content: center;
padding: 20px;
box-sizing: border-box;
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
margin: 8px 0 0 0;
font-size: 14px;
}

.spinner {
width: 24px;
height: 24px;
border: 2px solid var(--border-color, #e1e5e9);
border-top: 2px solid var(--primary-color, #3b82f6);
border-radius: 50%;
animation: spin 1s linear infinite;
margin-bottom: 12px;
}

@keyframes spin {
0% { transform: rotate(0deg); }
100% { transform: rotate(360deg); }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
.mermaid-renderer {
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

.spinner {
border-color: #374151;
border-top-color: #60a5fa;
}
}

/* Mermaid SVG styling */
:global(.mermaid-content svg) {
max-width: 100%;
height: auto;
display: block;
margin: 0 auto;
}

/* Better text rendering for diagrams */
:global(.mermaid-content .node rect),
:global(.mermaid-content .node circle),
:global(.mermaid-content .node ellipse),
:global(.mermaid-content .node polygon) {
stroke-width: 1.5px;
}

:global(.mermaid-content .edgeLabel) {
background-color: var(--background-color, #ffffff);
border-radius: 4px;
padding: 2px 4px;
}

@media (prefers-color-scheme: dark) {
:global(.mermaid-content .edgeLabel) {
background-color: #1f2937;
}
}
</style>
