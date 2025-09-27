<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';
import { artifactUIState, selectedArtifact, artifactActions } from '$lib/stores/artifacts/artifact-store';
import ArtifactRenderer from './ArtifactRenderer.svelte';
import { chatId } from '$lib/stores';

const dispatch = createEventDispatcher();

let panelElement: HTMLDivElement = $state();
let isDragging = $state(false);
let dragStartX = 0;
let dragStartWidth = 0;

// Subscribe to stores
let uiState = $derived($artifactUIState);
let artifact = $derived($selectedArtifact);

function handleClose() {
artifactActions.hidePanel();
}

function handleToggleCollapse() {
artifactActions.togglePanelCollapse();
}

function handleViewModeChange(event: CustomEvent) {
artifactActions.setViewMode(event.detail);
}

function handleArtifactError(event: CustomEvent) {
console.error('Artifact error:', event.detail);
dispatch('artifactError', event.detail);
}

function handleArtifactLoad(event: CustomEvent) {
dispatch('artifactLoad', event.detail);
}

// Panel resizing functionality
function startResize(event: MouseEvent) {
isDragging = true;
dragStartX = event.clientX;
dragStartWidth = uiState.panelWidth;

document.addEventListener('mousemove', handleResize);
document.addEventListener('mouseup', stopResize);
event.preventDefault();
}

function handleResize(event: MouseEvent) {
if (!isDragging) return;

const deltaX = dragStartX - event.clientX;
const newWidth = dragStartWidth + deltaX;
artifactActions.setPanelWidth(newWidth);
}

function stopResize() {
isDragging = false;
document.removeEventListener('mousemove', handleResize);
document.removeEventListener('mouseup', stopResize);
}

onMount(() => {
return () => {
// Cleanup event listeners
document.removeEventListener('mousemove', handleResize);
document.removeEventListener('mouseup', stopResize);
};
});
</script>

<div 
bind:this={panelElement}
class="artifact-panel"
class:visible={uiState.isVisible}
class:collapsed={uiState.isPanelCollapsed}
class:dragging={isDragging}
style="width: {uiState.panelWidth}px;"
>
<!-- Resize handle -->
<div 
class="resize-handle" 
onmousedown={startResize}
title="Drag to resize panel"
></div>

<!-- Panel header -->
<div class="panel-header">
<div class="panel-title">
<button 
class="collapse-btn" 
onclick={handleToggleCollapse}
title={uiState.isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
>
<svg 
width="16" 
height="16" 
viewBox="0 0 24 24" 
fill="none" 
stroke="currentColor" 
stroke-width="2"
class:collapsed={uiState.isPanelCollapsed}
>
<polyline points="15,18 9,12 15,6"/>
</svg>
</button>
<h3>Artifacts</h3>
</div>
<button 
class="close-btn" 
onclick={handleClose}
title="Close artifacts panel"
>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<line x1="18" y1="6" x2="6" y2="18"></line>
<line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
</button>
</div>

{#if !uiState.isPanelCollapsed}
<!-- Panel content -->
<div class="panel-content">
{#if artifact}
<ArtifactRenderer
artifact={artifact.artifact}
viewMode={uiState.viewMode}
width="100%"
height="calc(100vh - 120px)"
on:viewModeChange={handleViewModeChange}
on:error={handleArtifactError}
on:load={handleArtifactLoad}
/>
{:else}
<div class="empty-state">
<div class="empty-state-content">
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
<polyline points="14,2 14,8 20,8"/>
<line x1="16" y1="13" x2="8" y2="21"></line>
<line x1="8" y1="13" x2="16" y2="21"></line>
</svg>
<h4>No Artifact Selected</h4>
<p>Create or select an artifact to view it here.</p>
</div>
</div>
{/if}
</div>
{:else}
<!-- Collapsed state -->
<div class="collapsed-indicator">
{#if artifact}
<div class="artifact-indicator">
<div class="artifact-icon">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
<polyline points="14,2 14,8 20,8"/>
<line x1="16" y1="13" x2="8" y2="21"></line>
<line x1="8" y1="13" x2="16" y2="21"></line>
</svg>
</div>
<div class="artifact-title" title={artifact.artifact.title}>
{artifact.artifact.title}
</div>
</div>
{/if}
</div>
{/if}
</div>

<!-- Panel overlay for mobile -->
<div 
class="panel-overlay" 
class:visible={uiState.isVisible}
onclick={handleClose}
></div>

<style>
.artifact-panel {
position: fixed;
top: 0;
right: 0;
height: 100vh;
background: var(--panel-background, #ffffff);
border-left: 1px solid var(--border-color, #e1e5e9);
box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
z-index: 1000;
display: flex;
flex-direction: column;
transform: translateX(100%);
transition: transform 0.3s ease;
min-width: 300px;
max-width: 80vw;
}

.artifact-panel.visible {
transform: translateX(0);
}

.artifact-panel.collapsed {
width: 60px !important;
}

.artifact-panel.dragging {
transition: none;
user-select: none;
}

.resize-handle {
position: absolute;
left: 0;
top: 0;
width: 4px;
height: 100%;
cursor: col-resize;
background: transparent;
z-index: 1001;
}

.resize-handle:hover {
background: var(--primary-color, #3b82f6);
opacity: 0.5;
}

.panel-header {
display: flex;
align-items: center;
justify-content: space-between;
padding: 16px;
border-bottom: 1px solid var(--border-color, #e1e5e9);
background: var(--header-background, #f8f9fa);
min-height: 56px;
}

.panel-title {
display: flex;
align-items: center;
gap: 8px;
flex: 1;
min-width: 0;
}

.panel-title h3 {
margin: 0;
font-size: 16px;
font-weight: 600;
color: var(--text-color, #1f2937);
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
}

.collapsed .panel-title h3 {
display: none;
}

.collapse-btn,
.close-btn {
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border: none;
border-radius: 6px;
background: transparent;
color: var(--text-muted, #6b7280);
cursor: pointer;
transition: all 0.2s ease;
flex-shrink: 0;
}

.collapse-btn:hover,
.close-btn:hover {
background: var(--button-hover-background, #f3f4f6);
color: var(--text-color, #1f2937);
}

.collapse-btn svg.collapsed {
transform: rotate(180deg);
}

.collapsed .close-btn {
display: none;
}

.panel-content {
flex: 1;
min-height: 0;
overflow: hidden;
}

.empty-state {
display: flex;
align-items: center;
justify-content: center;
height: 100%;
padding: 40px 20px;
}

.empty-state-content {
text-align: center;
color: var(--text-muted, #6b7280);
}

.empty-state-content svg {
margin-bottom: 16px;
opacity: 0.5;
}

.empty-state-content h4 {
margin: 0 0 8px 0;
font-size: 18px;
font-weight: 600;
color: var(--text-color, #1f2937);
}

.empty-state-content p {
margin: 0;
font-size: 14px;
}

.collapsed-indicator {
flex: 1;
padding: 16px 8px;
}

.artifact-indicator {
display: flex;
flex-direction: column;
align-items: center;
gap: 8px;
text-align: center;
}

.artifact-icon {
display: flex;
align-items: center;
justify-content: center;
width: 32px;
height: 32px;
border-radius: 6px;
background: var(--primary-color, #3b82f6);
color: white;
}

.artifact-title {
font-size: 10px;
font-weight: 500;
color: var(--text-muted, #6b7280);
writing-mode: vertical-rl;
text-orientation: mixed;
max-height: 200px;
overflow: hidden;
text-overflow: ellipsis;
}

.panel-overlay {
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(0, 0, 0, 0.5);
z-index: 999;
opacity: 0;
visibility: hidden;
transition: all 0.3s ease;
display: none;
}

.panel-overlay.visible {
opacity: 1;
visibility: visible;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
.artifact-panel {
width: 100vw !important;
max-width: 100vw;
}

.artifact-panel.collapsed {
width: 60px !important;
}

.panel-overlay {
display: block;
}

.resize-handle {
display: none;
}
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
.artifact-panel {
background: #1f2937;
border-left-color: #374151;
box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
}

.panel-header {
border-bottom-color: #374151;
background: #111827;
}

.panel-title h3 {
color: #f9fafb;
}

.collapse-btn,
.close-btn {
color: #9ca3af;
}

.collapse-btn:hover,
.close-btn:hover {
background: #374151;
color: #f9fafb;
}

.empty-state-content h4 {
color: #f9fafb;
}

.empty-state-content {
color: #9ca3af;
}

.artifact-title {
color: #9ca3af;
}
}
</style>
