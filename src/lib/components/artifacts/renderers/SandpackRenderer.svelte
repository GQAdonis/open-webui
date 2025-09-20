<script lang="ts">
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import { Sandpack } from '@codesandbox/sandpack-react';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';
import { getSandpackTemplate, getSandpackFiles, isTypeScriptArtifact } from '$lib/utils/artifacts/artifact-parser';

export let artifact: ParsedArtifact;
export let template: string = '';
export let height: string = '400px';

const dispatch = createEventDispatcher();

let containerElement: HTMLDivElement;
let reactRoot: any = null;

$: {
if (containerElement) {
updateSandpack();
}
}

async function updateSandpack() {
if (!containerElement) return;

try {
// Clean up previous instance
if (reactRoot) {
reactRoot.unmount();
reactRoot = null;
}

// Clear container
containerElement.innerHTML = '';

// Dynamically import React
const React = await import('react');
const { createRoot } = await import('react-dom/client');

// Determine template
const sandpackTemplate = template || getSandpackTemplate(artifact);

// Get files for Sandpack
const files = getSandpackFiles(artifact);

// Prepare options
const options = {
showConsole: true,
showConsoleButton: true,
showRefreshButton: true,
showOpenInCodeSandbox: true,
bundlerURL: undefined, // Use default or custom bundler
autoReload: true,
recompileMode: 'delayed' as const,
recompileDelay: 500
};

// Prepare theme (dark mode support)
const theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

// Create Sandpack element
const sandpackElement = React.createElement(Sandpack, {
template: sandpackTemplate,
files,
options,
theme,
onError: (error: Error) => {
console.error('Sandpack error:', error);
dispatch('error', { message: error.message, error });
}
});

// Create React root and render
reactRoot = createRoot(containerElement);
reactRoot.render(sandpackElement);

dispatch('load', { template: sandpackTemplate, files });

} catch (error) {
console.error('Failed to render Sandpack:', error);
dispatch('error', { 
message: `Failed to render interactive preview: ${error instanceof Error ? error.message : 'Unknown error'}`, 
error 
});
}
}

onMount(() => {
updateSandpack();
});

onDestroy(() => {
if (reactRoot) {
reactRoot.unmount();
reactRoot = null;
}
});
</script>

<div 
bind:this={containerElement}
class="sandpack-container"
style="height: {height}; width: 100%;"
>
<!-- Sandpack will be rendered here -->
<div class="loading-placeholder">
<div class="spinner"></div>
<p>Loading interactive preview...</p>
</div>
</div>

<style>
.sandpack-container {
position: relative;
border-radius: 4px;
overflow: hidden;
background: var(--background-color, #ffffff);
}

.loading-placeholder {
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
height: 100%;
color: var(--text-muted, #6b7280);
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
.sandpack-container {
background: #1f2937;
}

.loading-placeholder {
color: #9ca3af;
}

.spinner {
border-color: #374151;
border-top-color: #60a5fa;
}
}

/* Override Sandpack styles for better integration */
:global(.sp-wrapper) {
border-radius: 0 !important;
border: none !important;
height: 100% !important;
}

:global(.sp-layout) {
border-radius: 0 !important;
height: 100% !important;
}

:global(.sp-editor) {
border-radius: 0 !important;
}

:global(.sp-preview) {
border-radius: 0 !important;
}

/* TypeScript-specific styling */
:global(.sp-cm .cm-tooltip) {
background: var(--tooltip-background, #1f2937) !important;
color: var(--tooltip-text, #f9fafb) !important;
border: 1px solid var(--tooltip-border, #374151) !important;
}

:global(.sp-cm .cm-tooltip.cm-tooltip-autocomplete) {
background: var(--autocomplete-background, #ffffff) !important;
color: var(--autocomplete-text, #1f2937) !important;
border: 1px solid var(--autocomplete-border, #e1e5e9) !important;
}

@media (prefers-color-scheme: dark) {
:global(.sp-cm .cm-tooltip.cm-tooltip-autocomplete) {
background: #1f2937 !important;
color: #f9fafb !important;
border-color: #374151 !important;
}
}
</style>
