<!--
Artifact Error Boundary Component
Provides comprehensive error handling and recovery for artifact rendering failures
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { retryLoopMonitor } from '$lib/services/retry-loop-monitor';
  import type { ComponentState } from '$lib/types/retry-monitoring';

  export let artifactId: string;
  export let componentId: string = `error-boundary-${artifactId}`;
  export let maxRetries = 3;
  export let showDetails = false;
  export let autoRetry = false;
  export let retryDelay = 2000;

  const dispatch = createEventDispatcher();

  let error: Error | null = null;
  let errorInfo: any = null;
  let hasError = false;
  let retryCount = 0;
  let isRetrying = false;
  let retryTimer: NodeJS.Timeout | null = null;
  let componentState: ComponentState | null = null;

  // Error types for better handling
  interface ArtifactError extends Error {
    type?: 'rendering' | 'parsing' | 'timeout' | 'network' | 'validation';
    artifactId?: string;
    recoverable?: boolean;
    retryable?: boolean;
  }

  // Update component state from retry monitor
  $: if (componentId) {
    componentState = retryLoopMonitor.getComponentState(componentId);
    if (componentState) {
      retryCount = componentState.totalRetries;
    }
  }

  // Enhanced error handling function
  export function handleError(err: ArtifactError, info?: any) {
    console.error('🚨 [ArtifactErrorBoundary] Error caught:', err, info);

    error = err;
    errorInfo = info;
    hasError = true;

    // Classify error type
    const errorType = classifyError(err);
    const enhancedError: ArtifactError = {
      ...err,
      type: errorType,
      artifactId,
      recoverable: isRecoverableError(errorType),
      retryable: isRetryableError(errorType)
    };

    // Record the error in retry monitor
    retryLoopMonitor.recordRetry(componentId, err.message);

    // Emit error event
    dispatch('error', {
      error: enhancedError,
      errorInfo: info,
      componentId,
      artifactId
    });

    // Auto-retry if enabled and error is retryable
    if (autoRetry && enhancedError.retryable && retryCount < maxRetries) {
      scheduleRetry();
    }
  }

  // Classify error type based on error message and stack
  function classifyError(err: Error): ArtifactError['type'] {
    const message = err.message.toLowerCase();
    const stack = err.stack?.toLowerCase() || '';

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('parse') || message.includes('syntax') || message.includes('invalid')) {
      return 'parsing';
    }
    if (message.includes('validation') || message.includes('schema')) {
      return 'validation';
    }
    if (stack.includes('render') || message.includes('render')) {
      return 'rendering';
    }

    return 'rendering'; // Default fallback
  }

  // Determine if error type is recoverable
  function isRecoverableError(errorType: ArtifactError['type']): boolean {
    switch (errorType) {
      case 'timeout':
      case 'network':
      case 'rendering':
        return true;
      case 'parsing':
      case 'validation':
        return false;
      default:
        return true;
    }
  }

  // Determine if error type is retryable
  function isRetryableError(errorType: ArtifactError['type']): boolean {
    switch (errorType) {
      case 'timeout':
      case 'network':
      case 'rendering':
        return true;
      case 'parsing':
      case 'validation':
        return false;
      default:
        return false;
    }
  }

  // Schedule automatic retry
  function scheduleRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
    }

    isRetrying = true;
    console.log('⏳ [ArtifactErrorBoundary] Scheduling retry in', retryDelay, 'ms');

    retryTimer = setTimeout(() => {
      retry();
    }, retryDelay);
  }

  // Manual or automatic retry
  function retry() {
    if (isRetrying) {
      clearRetryTimer();
    }

    if (retryCount >= maxRetries) {
      console.warn('🚫 [ArtifactErrorBoundary] Max retries exceeded');
      return;
    }

    console.log('🔄 [ArtifactErrorBoundary] Retrying artifact render');

    // Reset error state
    error = null;
    errorInfo = null;
    hasError = false;
    isRetrying = false;

    // Emit retry event
    dispatch('retry', {
      retryCount: retryCount + 1,
      componentId,
      artifactId
    });
  }

  // Reset error boundary state
  function reset() {
    console.log('🔄 [ArtifactErrorBoundary] Resetting error boundary');

    error = null;
    errorInfo = null;
    hasError = false;
    isRetrying = false;
    retryCount = 0;

    clearRetryTimer();

    // Reset retry monitor state
    retryLoopMonitor.resetCircuit(componentId);

    // Emit reset event
    dispatch('reset', {
      componentId,
      artifactId
    });
  }

  // Clear retry timer
  function clearRetryTimer() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  // Report error to external service (placeholder)
  function reportError() {
    console.log('📤 [ArtifactErrorBoundary] Reporting error to external service');

    const errorReport = {
      error: error?.message,
      stack: error?.stack,
      artifactId,
      componentId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorInfo
    };

    // In a real implementation, this would send to an error reporting service
    console.log('Error report:', errorReport);

    dispatch('errorReported', errorReport);
  }

  // Get error severity
  function getErrorSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) return 'low';

    const errorType = (error as ArtifactError).type;
    const isRecoverable = (error as ArtifactError).recoverable;

    if (!isRecoverable) return 'critical';
    if (errorType === 'timeout' || errorType === 'network') return 'medium';
    if (retryCount >= maxRetries) return 'high';

    return 'low';
  }

  // Get user-friendly error message
  function getUserFriendlyMessage(): string {
    if (!error) return '';

    const errorType = (error as ArtifactError).type;

    switch (errorType) {
      case 'timeout':
        return 'The artifact took too long to load. This might be due to complex code or slow processing.';
      case 'network':
        return 'Unable to load the artifact due to network issues. Please check your connection.';
      case 'parsing':
        return 'The artifact code contains syntax errors or invalid formatting.';
      case 'validation':
        return 'The artifact failed validation checks. The code may not be compatible.';
      case 'rendering':
        return 'An error occurred while displaying the artifact. This might be a temporary issue.';
      default:
        return 'An unexpected error occurred while processing the artifact.';
    }
  }

  // Get suggested actions
  function getSuggestedActions(): string[] {
    if (!error) return [];

    const errorType = (error as ArtifactError).type;
    const actions: string[] = [];

    switch (errorType) {
      case 'timeout':
        actions.push('Try refreshing the page');
        actions.push('Check if the artifact code is overly complex');
        break;
      case 'network':
        actions.push('Check your internet connection');
        actions.push('Try again in a few moments');
        break;
      case 'parsing':
        actions.push('Review the artifact code for syntax errors');
        actions.push('Ensure the code follows the expected format');
        break;
      case 'validation':
        actions.push('Check if the artifact type is supported');
        actions.push('Verify the code follows the required structure');
        break;
      case 'rendering':
        actions.push('Try refreshing the artifact');
        actions.push('Clear your browser cache');
        break;
    }

    if ((error as ArtifactError).retryable) {
      actions.push('Click the retry button below');
    }

    return actions;
  }

  onDestroy(() => {
    clearRetryTimer();
  });
</script>

{#if hasError && error}
  <div class="artifact-error-boundary" class:severe={getErrorSeverity() === 'high' || getErrorSeverity() === 'critical'}>
    <div class="error-header">
      <div class="error-icon">
        {#if getErrorSeverity() === 'critical'}
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
        {:else}
          <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        {/if}
      </div>
      <div class="error-title">
        <h3>Artifact Error</h3>
        <span class="error-severity severity-{getErrorSeverity()}">{getErrorSeverity()}</span>
      </div>
    </div>

    <div class="error-content">
      <p class="error-message">{getUserFriendlyMessage()}</p>

      {#if showDetails}
        <details class="error-details">
          <summary>Technical Details</summary>
          <div class="technical-info">
            <div><strong>Error:</strong> {error.message}</div>
            <div><strong>Type:</strong> {(error as ArtifactError).type || 'unknown'}</div>
            <div><strong>Artifact ID:</strong> {artifactId}</div>
            <div><strong>Component ID:</strong> {componentId}</div>
            <div><strong>Retry Count:</strong> {retryCount}/{maxRetries}</div>
            {#if error.stack}
              <div><strong>Stack Trace:</strong> <pre>{error.stack}</pre></div>
            {/if}
          </div>
        </details>
      {/if}

      <div class="suggested-actions">
        <h4>Suggested Actions:</h4>
        <ul>
          {#each getSuggestedActions() as action}
            <li>{action}</li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="error-actions">
      {#if isRetrying}
        <div class="retry-status">
          <div class="spinner"></div>
          <span>Retrying...</span>
        </div>
      {:else if (error as ArtifactError).retryable && retryCount < maxRetries}
        <button class="retry-btn" on:click={retry}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Retry ({retryCount}/{maxRetries})
        </button>
      {/if}

      <button class="reset-btn" on:click={reset}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Reset
      </button>

      <button class="report-btn" on:click={reportError}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
        </svg>
        Report Issue
      </button>

      <button class="details-toggle" on:click={() => showDetails = !showDetails}>
        {showDetails ? 'Hide' : 'Show'} Details
      </button>
    </div>
  </div>
{:else}
  <!-- Render children when no error -->
  <slot />
{/if}

<style>
  .artifact-error-boundary {
    padding: 20px;
    margin: 16px 0;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    background: #fef2f2;
    color: #991b1b;
  }

  .artifact-error-boundary.severe {
    border-color: #dc2626;
    background: #fee2e2;
  }

  .error-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .error-icon {
    flex-shrink: 0;
  }

  .error-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .error-title h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .error-severity {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .severity-low { background: #dbeafe; color: #1e40af; }
  .severity-medium { background: #fef3c7; color: #92400e; }
  .severity-high { background: #fed7d7; color: #c53030; }
  .severity-critical { background: #fee2e2; color: #dc2626; }

  .error-content {
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .error-details {
    margin: 12px 0;
    border: 1px solid #fca5a5;
    border-radius: 4px;
    overflow: hidden;
  }

  .error-details summary {
    padding: 8px 12px;
    background: #fee2e2;
    cursor: pointer;
    font-weight: 500;
  }

  .technical-info {
    padding: 12px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.4;
  }

  .technical-info div {
    margin-bottom: 8px;
  }

  .technical-info pre {
    background: #f3f4f6;
    padding: 8px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 11px;
  }

  .suggested-actions h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
  }

  .suggested-actions ul {
    margin: 0;
    padding-left: 20px;
  }

  .suggested-actions li {
    margin-bottom: 4px;
    font-size: 13px;
  }

  .error-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .retry-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #6b7280;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    color: #374151;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  button:hover {
    background: #f9fafb;
    transform: translateY(-1px);
  }

  .retry-btn {
    background: #3b82f6;
    color: white;
    border-color: #2563eb;
  }

  .retry-btn:hover {
    background: #2563eb;
  }

  .reset-btn {
    background: #f59e0b;
    color: white;
    border-color: #d97706;
  }

  .reset-btn:hover {
    background: #d97706;
  }

  .report-btn {
    background: #dc2626;
    color: white;
    border-color: #b91c1c;
  }

  .report-btn:hover {
    background: #b91c1c;
  }

  .details-toggle {
    background: #6b7280;
    color: white;
    border-color: #4b5563;
  }

  .details-toggle:hover {
    background: #4b5563;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .artifact-error-boundary {
      background: #1f1415;
      border-color: #553c3c;
      color: #f87171;
    }

    .artifact-error-boundary.severe {
      background: #1c1017;
      border-color: #7c2d12;
    }

    .error-details summary {
      background: #292524;
    }

    .technical-info pre {
      background: #1f2937;
      color: #e5e7eb;
    }

    button {
      background: #374151;
      color: #f9fafb;
      border-color: #4b5563;
    }

    button:hover {
      background: #4b5563;
    }
  }
</style>