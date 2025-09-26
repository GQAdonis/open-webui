<script lang="ts">
import { onMount, onDestroy, createEventDispatcher } from 'svelte';
import type { ParsedArtifact } from '$lib/utils/artifacts/xml-artifact-parser';
import type { DetectedArtifact } from '$lib/artifacts/detectArtifacts';
import { shouldUseSandpack } from '$lib/utils/artifacts/xml-artifact-parser';
import UnifiedSandpackRenderer from './renderers/UnifiedSandpackRenderer.svelte';
import MarkdownRenderer from './renderers/MarkdownRenderer.svelte';
import MermaidRenderer from './renderers/MermaidRenderer.svelte';
import CodeRenderer from './renderers/CodeRenderer.svelte';
import HTMLRenderer from './renderers/HTMLRenderer.svelte';
import SVGRenderer from './renderers/SVGRenderer.svelte';
import JSONRenderer from './renderers/JSONRenderer.svelte';
import EnhancedErrorRecovery from './EnhancedErrorRecovery.svelte';
import { artifactActions } from '$lib/stores/artifacts/artifact-store';
import { retryLoopMonitor } from '$lib/services/retry-loop-monitor';
import type { ComponentState } from '$lib/types/retry-monitoring';

export let artifact: ParsedArtifact | DetectedArtifact;
export let viewMode: 'preview' | 'code' | 'xml' = 'preview';
export let width = '100%';
export let height = '400px';
export let showControls = true;
export let messageContent: string = ''; // NEW: Full message content for dependency resolution

const dispatch = createEventDispatcher();

let containerElement: HTMLDivElement;
let currentRenderer: string | null = null;
let error: string | null = null;
let retryCount = 0;
let isRetrying = false;
let canRetry = true;
let componentId: string;
let renderingTimeout: NodeJS.Timeout | null = null;
let renderStartTime: number | null = null;

// NEW: Enhanced error recovery state
let showSmartRecovery = false;
let smartRecoveryAttempts = 0;
let originalArtifact: ParsedArtifact | DetectedArtifact;

$: {
// Update renderer when artifact or viewMode changes
updateRenderer();
}

onMount(() => {
// Store original artifact for recovery
originalArtifact = JSON.parse(JSON.stringify(artifact));

// Generate unique component ID for retry monitoring
componentId = `artifact-renderer-${Math.random().toString(36).substr(2, 9)}`;

// Initialize retry monitoring
const componentState = retryLoopMonitor.getComponentState(componentId);
if (componentState) {
retryCount = componentState.totalRetries;
canRetry = retryLoopMonitor.canRetry(componentId);
}

console.log('🚀 [ArtifactRenderer] Mounted:', {
componentId,
artifactId: artifact.identifier || 'legacy',
retryCount,
canRetry
});

updateRenderer();
});

onDestroy(() => {
// Clear any pending timeouts
if (renderingTimeout) {
clearTimeout(renderingTimeout);
renderingTimeout = null;
}

console.log('🔥 [ArtifactRenderer] Destroyed:', componentId);
});

function updateRenderer() {
try {
error = null;
showSmartRecovery = false; // Reset smart recovery on renderer update
currentRenderer = getRendererType(artifact, viewMode);

// Clear any existing timeout
if (renderingTimeout) {
clearTimeout(renderingTimeout);
renderingTimeout = null;
}

// Start rendering timer for timeout prevention
if (currentRenderer === 'unified-sandpack') {
startRenderingTimer();
}
} catch (e) {
const errorMessage = e instanceof Error ? e.message : 'Unknown error';
handleRenderingError(errorMessage);
}
}

function startRenderingTimer() {
renderStartTime = Date.now();

// Set timeout to prevent infinite loading (30 seconds)
renderingTimeout = setTimeout(() => {
const duration = Date.now() - (renderStartTime || 0);
handleRenderingTimeout(duration);
}, 30000);
}

function handleRenderingTimeout(duration: number) {
console.error(`⏰ [ArtifactRenderer] Rendering timed out after ${duration}ms`);

const errorMessage = `Rendering timed out after ${duration}ms`;
const componentState = retryLoopMonitor.getComponentState(componentId);

// Enhanced circuit breaker integration with performance monitoring
retryLoopMonitor.recordRetry(componentId, errorMessage, duration);

// Check circuit breaker status
canRetry = retryLoopMonitor.canRetry(componentId);
const newState = retryLoopMonitor.getComponentState(componentId);

// Enhanced error messaging based on circuit breaker state
const config = retryLoopMonitor.getConfig();

if (newState?.isCircuitOpen) {
const cooldownTime = Math.ceil((config.circuitOpenDuration -
(Date.now() - (newState.circuitOpenTime?.getTime() || 0))) / 1000);

error = cooldownTime > 0
? `Circuit breaker active. Please wait ${cooldownTime}s before retrying. ${errorMessage}`
: `Circuit breaker in test mode. ${errorMessage}`;
} else if (!canRetry) {
error = `${errorMessage}. Maximum retry attempts exceeded. Try refreshing the page or simplifying the component.`;
} else {
const attemptsLeft = Math.max(0, config.maxConsecutiveFailures - (newState?.consecutiveFailures || 0));
error = `${errorMessage}. ${attemptsLeft} attempts remaining before circuit breaker activates.`;
}

// NEW: Show smart recovery for bundling-related errors
if (shouldShowSmartRecovery(errorMessage, artifact)) {
showSmartRecovery = true;
}

// Emit enhanced error event with circuit breaker context
dispatch('timeout', {
componentId,
duration,
retryCount,
error: errorMessage,
canRetry,
circuitState: {
isOpen: newState?.isCircuitOpen || false,
consecutiveFailures: newState?.consecutiveFailures || 0,
totalRetries: newState?.totalRetries || 0,
cooldownRemaining: newState?.isCircuitOpen && newState?.circuitOpenTime
? Math.max(0, config.circuitOpenDuration - (Date.now() - newState.circuitOpenTime.getTime()))
: 0
}
});

// Check for infinite loop patterns and alert user
const activeAlerts = retryLoopMonitor.getActiveAlerts();
const loopAlert = activeAlerts.find(alert => alert.componentId === componentId && alert.alertType === 'infinite_loop_detected');

if (loopAlert) {
console.warn('🔄 [ArtifactRenderer] Infinite loop pattern detected:', loopAlert);
error = `${error} Warning: Repeated failures detected - this component may have a persistent issue.`;
}
}

function handleRenderingError(errorMessage: string, duration?: number) {
error = errorMessage;

// Record retry attempt
if (componentId) {
retryLoopMonitor.recordRetry(componentId, errorMessage, duration);
canRetry = retryLoopMonitor.canRetry(componentId);

if (!canRetry) {
error = `${errorMessage}. Maximum retry attempts exceeded.`;
}
}

// NEW: Show smart recovery for appropriate errors
if (shouldShowSmartRecovery(errorMessage, artifact)) {
showSmartRecovery = true;
}

console.error('🔴 [ArtifactRenderer] Rendering error:', {
componentId,
error: errorMessage,
retryCount,
canRetry,
smartRecoveryShown: showSmartRecovery
});
}

// NEW: Determine if smart recovery should be shown
function shouldShowSmartRecovery(errorMessage: string, artifact: any): boolean {
const errorLower = errorMessage.toLowerCase();
const isReactComponent = currentRenderer === 'unified-sandpack' && 
(artifact.type?.includes('react') || artifact.type?.includes('jsx') || artifact.type?.includes('tsx'));

// Show for common bundling/dependency issues
return isReactComponent && (
errorLower.includes('cannot resolve') ||
errorLower.includes('module not found') ||
errorLower.includes('import') ||
errorLower.includes('dependency') ||
errorLower.includes('css') ||
errorLower.includes('bundling') ||
errorLower.includes('timeout')
);
}

// NEW: Handle smart recovery attempts
function handleSmartRecovery(event: CustomEvent) {
const { method, success, result, error: recoveryError } = event.detail;
smartRecoveryAttempts++;

console.log('🧠 [ArtifactRenderer] Smart recovery attempt:', {
method,
success,
attempt: smartRecoveryAttempts
});

if (success && result) {
// Don't hide smart recovery yet - let user see the results
console.log('✅ [ArtifactRenderer] Smart recovery succeeded with method:', method);
} else {
console.warn('❌ [ArtifactRenderer] Smart recovery failed:', recoveryError);
}
}

// NEW: Handle code fixes from smart recovery
function handleCodeFixed(event: CustomEvent) {
const { fixedCode, method, details } = event.detail;

console.log('🔧 [ArtifactRenderer] Code fixed by smart recovery:', {
method,
codeLength: fixedCode.length,
originalLength: getMainContent(originalArtifact)?.length || 0
});

// Update the artifact with the fixed code
try {
const updatedArtifact = createUpdatedArtifact(artifact, fixedCode);
artifact = updatedArtifact;

// Reset error state and retry
error = null;
showSmartRecovery = false;
retryCount = 0;

// Reset circuit breaker state
if (componentId) {
retryLoopMonitor.resetCircuit(componentId);
}

// Update renderer with fixed code
updateRenderer();

dispatch('code-fixed', {
method,
details,
artifact: updatedArtifact
});

} catch (updateError) {
console.error('❌ [ArtifactRenderer] Failed to apply fixed code:', updateError);
error = `Failed to apply fixed code: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`;
}
}

// NEW: Create updated artifact with fixed code
function createUpdatedArtifact(original: ParsedArtifact | DetectedArtifact, fixedCode: string): ParsedArtifact | DetectedArtifact {
const updated = JSON.parse(JSON.stringify(original));

// Handle different artifact structures
if ('files' in updated && updated.files && updated.files.length > 0) {
// PAS 3.0 artifact with files array
updated.files[0].content = fixedCode;
} else if ('entryCode' in updated) {
// Legacy artifact with entryCode
updated.entryCode = fixedCode;
} else if ('content' in updated) {
// Legacy artifact with content
updated.content = fixedCode;
}

return updated;
}

// NEW: Get main content from artifact for comparison
function getMainContent(artifact: ParsedArtifact | DetectedArtifact): string | null {
if ('files' in artifact && artifact.files && artifact.files.length > 0) {
return artifact.files[0].content;
}
if ('entryCode' in artifact) {
return artifact.entryCode;
}
if ('content' in artifact) {
return artifact.content;
}
return null;
}

function getRendererType(artifact: ParsedArtifact | DetectedArtifact, viewMode: string): string {
if (viewMode === 'xml') return 'xml';
if (viewMode === 'code') return 'code';

// Check if this is a legacy artifact
const isLegacy = 'entryCode' in artifact || 'content' in artifact;

if (isLegacy) {
// Legacy artifact handling
const legacyArtifact = artifact as DetectedArtifact;
switch (legacyArtifact.type) {
case 'react':
case 'svelte':
return 'unified-sandpack';
case 'html':
return 'unified-sandpack';
case 'svg':
return 'svg';
case 'mermaid':
return 'mermaid';
default:
return 'code';
}
} else {
// PAS 3.0 artifact handling
const pas3Artifact = artifact as ParsedArtifact;
switch (pas3Artifact.type) {
case 'application/vnd.react+jsx':
case 'application/vnd.react+tsx':
case 'application/vnd.svelte':
case 'application/vnd.svelte+ts':
case 'text/html':
return 'unified-sandpack';
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
}

function getPrimaryFile(artifact: ParsedArtifact | DetectedArtifact) {
if ('files' in artifact && artifact.files && artifact.files.length > 0) {
return artifact.files[0];
}
if ('entryCode' in artifact) {
return { path: 'main', content: artifact.entryCode };
}
if ('content' in artifact) {
return { path: 'main', content: artifact.content };
}
return null;
}

function getLanguageFromType(type: string): string {
switch (type) {
case 'application/vnd.react+jsx':
return 'jsx';
case 'application/vnd.react+tsx':
return 'tsx';
case 'application/vnd.svelte':
case 'application/vnd.svelte+ts':
return 'svelte';
case 'text/html':
return 'html';
case 'text/markdown':
return 'markdown';
case 'application/javascript':
return 'javascript';
case 'application/typescript':
return 'typescript';
case 'application/json':
return 'json';
case 'image/svg+xml':
return 'xml';
case 'application/vnd.mermaid':
return 'mermaid';
default:
return 'text';
}
}

function handleRendererError(event: CustomEvent) {
const duration = renderStartTime ? Date.now() - renderStartTime : undefined;
handleRenderingError(event.detail.message, duration);
dispatch('error', event.detail);
}

function handleRendererLoad(event: CustomEvent) {
// Clear timeout on successful load
if (renderingTimeout) {
clearTimeout(renderingTimeout);
renderingTimeout = null;
}

// Record successful rendering
if (componentId && renderStartTime) {
const duration = Date.now() - renderStartTime;
retryLoopMonitor.recordSuccess(componentId);

console.log('✅ [ArtifactRenderer] Rendering successful:', {
componentId,
duration,
renderer: currentRenderer
});
}

// Hide smart recovery on successful load
showSmartRecovery = false;

dispatch('load', event.detail);
}

function retryRendering() {
if (!canRetry) {
console.warn('🚫 [ArtifactRenderer] Retry not allowed:', componentId);
return;
}

isRetrying = true;
retryCount++;
error = null;
showSmartRecovery = false; // Hide smart recovery during retry

console.log('🔄 [ArtifactRenderer] Retrying rendering:', {
componentId,
retryCount,
renderer: currentRenderer
});

// Reset and retry
setTimeout(() => {
updateRenderer();
isRetrying = false;
}, 1000);
}

function resetRetryState() {
if (componentId) {
retryLoopMonitor.resetCircuit(componentId);
retryCount = 0;
canRetry = true;
error = null;
showSmartRecovery = false;
smartRecoveryAttempts = 0;

console.log('🔄 [ArtifactRenderer] Retry state reset:', componentId);
}
}

function copyToClipboard() {
if (viewMode === 'xml' && 'rawXml' in artifact) {
navigator.clipboard.writeText(artifact.rawXml);
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
a.download = primaryFile.path || 'artifact';
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
dispatch('download');
}
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
<div class="error-header">
<div class="error-icon">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<circle cx="12" cy="12" r="10"/>
<line x1="15" y1="9" x2="9" y2="15"/>
<line x1="9" y1="9" x2="15" y2="15"/>
</svg>
</div>
<h4>Preview Failed</h4>
</div>

<div class="error-details">
<p class="error-message">{error}</p>

<!-- Circuit breaker status -->
{#if componentId}
{@const componentState = retryLoopMonitor.getComponentState(componentId)}
{@const config = retryLoopMonitor.getConfig()}
{#if componentState?.isCircuitOpen}
<div class="circuit-breaker-info">
<div class="circuit-status">
<span class="circuit-icon">🔴</span>
<span>Circuit Breaker Active</span>
</div>
<p class="circuit-details">
Too many failures detected. Waiting {Math.ceil((config.circuitOpenDuration - (Date.now() - (componentState.circuitOpenTime?.getTime() || 0))) / 1000)}s before allowing retries.
</p>
</div>
{:else if componentState?.consecutiveFailures > 0}
<div class="failure-info">
<div class="failure-status">
<span class="failure-icon">⚠️</span>
<span>Failure Count: {componentState.consecutiveFailures}/{config.maxConsecutiveFailures}</span>
</div>
<p class="failure-details">
{config.maxConsecutiveFailures - componentState.consecutiveFailures} attempts remaining before circuit breaker activates.
</p>
</div>
{/if}
{/if}

<!-- Troubleshooting tips -->
<details class="troubleshooting">
<summary>Troubleshooting Tips</summary>
<div class="tips-content">
<ul class="tips-list">
<li><strong>Code Issues:</strong> Check for syntax errors, missing imports, or undefined variables</li>
<li><strong>Dependencies:</strong> Ensure all required packages are available and compatible</li>
<li><strong>Network:</strong> Verify internet connection for external dependencies</li>
<li><strong>Performance:</strong> Large components may timeout - try simplifying</li>
<li><strong>Browser:</strong> Try refreshing the page or using a different browser</li>
</ul>
{#if currentRenderer === 'unified-sandpack'}
<div class="sandpack-tips">
<h5>Sandpack-specific tips:</h5>
<ul>
<li>React components must export a default function</li>
<li>Use modern React syntax (hooks, functional components)</li>
<li>Avoid Node.js-specific modules in browser code</li>
<li>Check console for bundling errors</li>
</ul>
</div>
{/if}
</div>
</details>
</div>

<!-- Action buttons -->
<div class="error-actions">
{#if canRetry && !isRetrying}
<button class="retry-btn primary" on:click={retryRendering} title="Retry rendering">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<polyline points="23 4 23 10 17 10"/>
<polyline points="1 20 1 14 7 14"/>
<path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
</svg>
Retry ({retryCount}/{retryLoopMonitor.getConfig().maxConsecutiveFailures})
</button>
<button class="reset-btn secondary" on:click={resetRetryState} title="Reset retry state">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
<path d="m3 3 2.01 2.01"/>
<path d="m7 7 2.01 2.01"/>
</svg>
Reset State
</button>
{:else if isRetrying}
<div class="retry-status">
<div class="spinner"></div>
<span>Retrying... Please wait</span>
</div>
{:else if !canRetry}
<div class="retry-disabled">
<div class="disabled-info">
<span class="disabled-icon">🚫</span>
<span>Retry limit reached</span>
</div>
<p class="disabled-message">Maximum retry attempts exceeded. You can reset to try again or refresh the page.</p>
<button class="reset-btn primary" on:click={resetRetryState} title="Reset retry state">
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
<path d="m3 3 2.01 2.01"/>
<path d="m7 7 2.01 2.01"/>
</svg>
Reset & Try Again
</button>
</div>
{/if}
</div>

<!-- NEW: Enhanced Smart Recovery Component -->
{#if showSmartRecovery}
<EnhancedErrorRecovery
originalCode={getMainContent(originalArtifact) || ''}
errorMessage={error || 'Unknown error'}
messageContent={messageContent}
language={getLanguageFromType(artifact.type)}
on:recovery-attempt={handleSmartRecovery}
on:code-fixed={handleCodeFixed}
/>
{/if}
</div>
{:else if currentRenderer === 'unified-sandpack'}
<UnifiedSandpackRenderer
{artifact}
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
content={'rawXml' in artifact ? artifact.rawXml : JSON.stringify(artifact, null, 2)}
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
padding: 24px;
background: var(--error-background, #fef2f2);
border-radius: 8px;
border: 1px solid var(--error-border, #fecaca);
margin: 16px;
}

.error-header {
display: flex;
align-items: center;
gap: 12px;
margin-bottom: 16px;
}

.error-icon {
color: var(--error-color, #dc2626);
flex-shrink: 0;
}

.error-header h4 {
margin: 0;
font-size: 18px;
font-weight: 600;
color: var(--error-color, #dc2626);
}

.error-details {
margin-bottom: 20px;
}

.error-message {
margin: 0 0 16px 0;
font-size: 14px;
line-height: 1.5;
color: var(--error-text, #991b1b);
}

.circuit-breaker-info, .failure-info {
background: var(--warning-background, #fefce8);
border: 1px solid var(--warning-border, #fde047);
border-radius: 6px;
padding: 12px;
margin: 12px 0;
}

.circuit-status, .failure-status {
display: flex;
align-items: center;
gap: 8px;
font-weight: 600;
font-size: 13px;
color: var(--warning-text, #92400e);
margin-bottom: 4px;
}

.circuit-details, .failure-details {
margin: 0;
font-size: 12px;
color: var(--warning-text-muted, #a16207);
line-height: 1.4;
}

.troubleshooting {
background: var(--info-background, #f0f9ff);
border: 1px solid var(--info-border, #bae6fd);
border-radius: 6px;
padding: 0;
margin: 12px 0;
overflow: hidden;
}

.troubleshooting summary {
padding: 12px;
cursor: pointer;
font-weight: 500;
font-size: 13px;
color: var(--info-text, #1e40af);
background: var(--info-header, #e0f2fe);
border-bottom: 1px solid var(--info-border, #bae6fd);
}

.troubleshooting summary:hover {
background: var(--info-header-hover, #b3e5fc);
}

.tips-content {
padding: 16px;
}

.tips-list {
margin: 0 0 12px 0;
padding-left: 20px;
font-size: 13px;
line-height: 1.5;
color: var(--info-text, #1e40af);
}

.tips-list li {
margin-bottom: 8px;
}

.tips-list strong {
color: var(--info-text-bold, #1d4ed8);
}

.sandpack-tips {
margin-top: 12px;
padding-top: 12px;
border-top: 1px solid var(--info-border, #bae6fd);
}

.sandpack-tips h5 {
margin: 0 0 8px 0;
font-size: 12px;
font-weight: 600;
color: var(--info-text-bold, #1d4ed8);
}

.sandpack-tips ul {
margin: 0;
padding-left: 20px;
font-size: 12px;
}

.sandpack-tips li {
margin-bottom: 4px;
}

.error-actions {
display: flex;
gap: 12px;
justify-content: center;
flex-wrap: wrap;
}

.retry-btn, .reset-btn {
display: flex;
align-items: center;
gap: 8px;
padding: 10px 16px;
border-radius: 6px;
font-size: 13px;
font-weight: 500;
cursor: pointer;
transition: all 0.2s ease;
border: 1px solid;
min-width: 120px;
justify-content: center;
}

.retry-btn.primary, .reset-btn.primary {
background: var(--primary-color, #3b82f6);
color: white;
border-color: var(--primary-color, #3b82f6);
}

.retry-btn.primary:hover, .reset-btn.primary:hover {
background: var(--primary-hover-color, #2563eb);
transform: translateY(-1px);
}

.retry-btn.secondary, .reset-btn.secondary {
background: var(--secondary-background, #f8fafc);
color: var(--text-color, #1f2937);
border-color: var(--border-color, #e1e5e9);
}

.retry-btn.secondary:hover, .reset-btn.secondary:hover {
background: var(--secondary-hover-background, #f1f5f9);
transform: translateY(-1px);
}

.retry-status {
display: flex;
align-items: center;
justify-content: center;
gap: 10px;
font-size: 14px;
color: var(--text-muted, #6b7280);
padding: 16px;
}

.retry-disabled {
text-align: center;
}

.disabled-info {
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
font-weight: 600;
font-size: 14px;
color: var(--warning-text, #92400e);
margin-bottom: 8px;
}

.disabled-message {
margin: 0 0 16px 0;
font-size: 13px;
color: var(--text-muted, #6b7280);
line-height: 1.4;
max-width: 300px;
margin-left: auto;
margin-right: auto;
}

.spinner {
width: 16px;
height: 16px;
border: 2px solid var(--border-color, #e1e5e9);
border-top: 2px solid var(--primary-color, #3b82f6);
border-radius: 50%;
animation: spin 1s linear infinite;
}

@keyframes spin {
0% { transform: rotate(0deg); }
100% { transform: rotate(360deg); }
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
