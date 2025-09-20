<script lang="ts">
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getPrimaryFile, getLanguageFromType } from '$lib/utils/artifacts/artifact-parser';
import SandpackRenderer from './renderers/SandpackRenderer.svelte';
import MarkdownRenderer from './renderers/MarkdownRenderer.svelte';
import MermaidRenderer from './renderers/MermaidRenderer.svelte';
import CodeRenderer from './renderers/CodeRenderer.svelte';
import HTMLRenderer from './renderers/HTMLRenderer.svelte';
import SVGRenderer from './renderers/SVGRenderer.svelte';
import JSONRenderer from './renderers/JSONRenderer.svelte';
import { artifactActions } from '$lib/stores/artifacts/artifact-store';

export let artifact: ParsedArtifact;
export let viewMode: 'preview' | 'code' | 'xml' = 'preview';
export let width = '100%';
export let height = '400px';
export let showControls = true;

const dispatch = createEventDispatcher();

let containerElement: HTMLDivElement;
let currentRenderer: string | null = null;
let error: string | null = null;

$: {
// Update renderer when artifact or viewMode changes
updateRenderer();
}

function updateRenderer() {
try {
error = null;
currentRenderer = getRendererType(artifact, viewMode);
} catch (e) {
error = e instanceof Error ? e.message : 'Unknown error';
console.error('Error updating artifact renderer:', e);
}
}

function getRendererType(artifact: ParsedArtifact, viewMode: string): string {
if (viewMode === 'xml') return 'xml';
if (viewMode === 'code') return 'code';

// For preview mode, determine renderer based on artifact type
switch (artifact.type) {
case 'application/vnd.react+jsx':
return 'sandpack-react';
case 'application/vnd.svelte':
return 'sandpack-svelte';  
case 'application/vnd.vue':
return 'sandpack-vue';
case 'text/html':
return 'html';
case 'text/markdown':
return 'markdown';
case 'application/vnd.mermaid':
return 'mermaid';
case 'image/svg+xml':
return 'svg';
case 'application/json':
return 'json';
case 'application/javascript':
case 'application/typescript':
case 'text/plain':
return 'code';
default:
return 'code';
}
}

function handleRendererError(event: CustomEvent) {
error = event.detail.message;
dispatch('error', event.detail);
}

function handleRendererLoad(event: CustomEvent) {
dispatch('load', event.detail);
}

function copyToClipboard() {
if (viewMode === 'xml') {
navigator.clipboard.writeText(artifact.raw);
} else {
const primaryFile = getPrimaryFile(artifact);
if (primaryFile) {
navigator.clipboard.writeText(primaryFile.content);
}
}
dispatch('copy');
}

function downloadArtifact() {
const primaryFile = getPrimaryFile(artifact);
if (!primaryFile) return;

const blob = new Blob([primaryFile.content], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = primaryFile.path;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
dispatch('download');
}

onMount(() => {
updateRenderer();
});

onDestroy(() => {
// Cleanup if needed
});
</script>

<div
bind:this={containerElement}
class="artifact-renderer"
style="width: {width}; height: {height};"
>
{#if showControls}
<div class="artifact-controls">
<div class="artifact-info">
<h3 class="artifact-title">{artifact.title}</h3>
{#if artifact.description}
<p class="artifact-description">{artifact.description}</p>
{/if}
</div>
<div class="artifact-actions">
<button 
class="action-btn" 
class:active={viewMode === 'preview'}
on:click={() => dispatch('viewModeChange', 'preview')}
title="Preview"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
<circle cx="12" cy="12" r="3"/>
</svg>
</button>
<button 
class="action-btn"
class:active={viewMode === 'code'}
on:click={() => dispatch('viewModeChange', 'code')}
title="View Code"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<polyline points="16,18 22,12 16,6"/>
<polyline points="8,6 2,12 8,18"/>
</svg>
</button>
<button 
class="action-btn"
class:active={viewMode === 'xml'}
on:click={() => dispatch('viewModeChange', 'xml')}
title="View XML"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
<polyline points="14,2 14,8 20,8"/>
<line x1="16" y1="13" x2="8" y2="21"/>
<line x1="8" y1="13" x2="16" y2="21"/>
</svg>
</button>
<div class="divider"></div>
<button class="action-btn" on:click={copyToClipboard} title="Copy">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>
</button>
<button class="action-btn" on:click={downloadArtifact} title="Download">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
<polyline points="7,10 12,15 17,10"/>
<line x1="12" y1="15" x2="12" y2="3"/>
</svg>
</button>
</div>
</div>
{/if}

<div class="renderer-container" class:with-controls={showControls}>
{#if error}
<div class="error-container">
<h4>Rendering Error</h4>
<p>{error}</p>
</div>
{:else if currentRenderer === 'sandpack-react'}
<SandpackRenderer 
{artifact}
template="react"
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'sandpack-svelte'}
<SandpackRenderer 
{artifact}
template="svelte"
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'sandpack-vue'}
<SandpackRenderer 
{artifact}
template="vue"
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'html'}
<HTMLRenderer 
{artifact}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'markdown'}
<MarkdownRenderer 
{artifact}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'mermaid'}
<MermaidRenderer 
{artifact}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'svg'}
<SVGRenderer 
{artifact}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'json'}
<JSONRenderer 
{artifact}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else if currentRenderer === 'xml'}
<CodeRenderer 
content={artifact.raw}
language="xml"
readonly={true}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{:else}
<CodeRenderer 
content={getPrimaryFile(artifact)?.content || ''}
language={getLanguageFromType(artifact.type)}
readonly={viewMode !== 'code'}
on:error={handleRendererError}
on:load={handleRendererLoad}
/>
{/if}
</div>
</div>

<style>
.artifact-renderer {
display: flex;
flex-direction: column;
border: 1px solid var(--border-color, #e1e5e9);
border-radius: 8px;
background: var(--background-color, #ffffff);
overflow: hidden;
}

.artifact-controls {
display: flex;
justify-content: space-between;
align-items: center;
padding: 12px;
border-bottom: 1px solid var(--border-color, #e1e5e9);
background: var(--header-background, #f8f9fa);
}

.artifact-info {
flex: 1;
min-width: 0;
}

.artifact-title {
font-size: 14px;
font-weight: 600;
margin: 0;
color: var(--text-color, #1f2937);
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

.artifact-description {
font-size: 12px;
color: var(--text-muted, #6b7280);
margin: 2px 0 0 0;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
}

.artifact-actions {
display: flex;
align-items: center;
gap: 4px;
}

.action-btn {
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border: 1px solid var(--border-color, #e1e5e9);
border-radius: 6px;
background: var(--button-background, #ffffff);
color: var(--text-muted, #6b7280);
cursor: pointer;
transition: all 0.2s ease;
}

.action-btn:hover {
background: var(--button-hover-background, #f3f4f6);
color: var(--text-color, #1f2937);
}

.action-btn.active {
background: var(--primary-color, #3b82f6);
color: white;
border-color: var(--primary-color, #3b82f6);
}

.divider {
width: 1px;
height: 20px;
background: var(--border-color, #e1e5e9);
margin: 0 4px;
}

.renderer-container {
flex: 1;
min-height: 0;
overflow: hidden;
}

.renderer-container.with-controls {
height: calc(100% - 57px);
}

.error-container {
padding: 20px;
text-align: center;
color: var(--error-color, #dc2626);
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

/* Dark mode support */
@media (prefers-color-scheme: dark) {
.artifact-renderer {
border-color: #374151;
background: #1f2937;
}

.artifact-controls {
border-bottom-color: #374151;
background: #111827;
}

.artifact-title {
color: #f9fafb;
}

.artifact-description {
color: #9ca3af;
}

.action-btn {
border-color: #374151;
background: #1f2937;
color: #9ca3af;
}

.action-btn:hover {
background: #374151;
color: #f9fafb;
}

.divider {
background: #374151;
}

.error-container {
color: #f87171;
}
}
</style>
