<!--
Error Retry Panel Component for Artifact System
Reusable component for handling retry operations with circuit breaker pattern
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let error: string | null = null;
  export let canRetry = true;
  export let isRetrying = false;
  export let retryCount = 0;
  export let maxRetries = 3;
  export let showResetOption = true;
  export let componentId: string | null = null;

  const dispatch = createEventDispatcher();

  function handleRetry() {
    if (!canRetry || isRetrying) return;
    dispatch('retry', { componentId, retryCount });
  }

  function handleReset() {
    dispatch('reset', { componentId });
  }

  $: retryButtonText = `Retry (${retryCount}/${maxRetries})`;
</script>

{#if error}
  <div class="error-retry-panel">
    <div class="error-header">
      <svg class="error-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h4 class="error-title">Rendering Error</h4>
    </div>

    <p class="error-message">{error}</p>

    {#if canRetry && !isRetrying}
      <div class="retry-actions">
        <button
          class="retry-btn"
          on:click={handleRetry}
          title="Retry rendering"
          disabled={isRetrying}
        >
          <svg class="retry-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          {retryButtonText}
        </button>

        {#if showResetOption}
          <button
            class="reset-btn"
            on:click={handleReset}
            title="Reset retry state"
          >
            <svg class="reset-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="m3 3 2.01 2.01"/>
              <path d="m7 7 2.01 2.01"/>
            </svg>
            Reset
          </button>
        {/if}
      </div>
    {:else if isRetrying}
      <div class="retry-status">
        <div class="spinner"></div>
        <span class="retry-text">Retrying...</span>
      </div>
    {:else if !canRetry}
      <div class="retry-disabled">
        <span class="disabled-text">Maximum retry attempts exceeded.</span>
        {#if showResetOption}
          <button
            class="reset-btn small"
            on:click={handleReset}
            title="Reset retry state"
          >
            <svg class="reset-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="m3 3 2.01 2.01"/>
              <path d="m7 7 2.01 2.01"/>
            </svg>
            Reset
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .error-retry-panel {
    padding: 20px;
    text-align: center;
    background: var(--error-background, #fef2f2);
    border: 1px solid var(--error-border, #fecaca);
    border-radius: 8px;
    color: var(--error-color, #dc2626);
  }

  .error-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .error-icon {
    flex-shrink: 0;
    color: var(--error-color, #dc2626);
  }

  .error-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--error-color, #dc2626);
  }

  .error-message {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: var(--error-text, #991b1b);
    line-height: 1.4;
  }

  .retry-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-top: 16px;
  }

  .retry-btn, .reset-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 6px;
    background: var(--button-background, #ffffff);
    color: var(--text-color, #1f2937);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn {
    background: var(--primary-color, #3b82f6);
    color: white;
    border-color: var(--primary-color, #3b82f6);
  }

  .retry-btn:hover:not(:disabled) {
    background: var(--primary-hover-color, #2563eb);
    transform: translateY(-1px);
  }

  .retry-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .reset-btn:hover {
    background: var(--button-hover-background, #f3f4f6);
    transform: translateY(-1px);
  }

  .reset-btn.small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .retry-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  }

  .retry-text {
    font-size: 13px;
    color: var(--text-muted, #6b7280);
  }

  .retry-disabled {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
  }

  .disabled-text {
    font-size: 13px;
    color: var(--text-muted, #6b7280);
    text-align: center;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color, #e1e5e9);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .retry-icon, .reset-icon {
    flex-shrink: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .error-retry-panel {
      background: var(--error-background-dark, #1f1415);
      border-color: var(--error-border-dark, #553c3c);
    }

    .error-title {
      color: var(--error-color-dark, #f87171);
    }

    .error-message {
      color: var(--error-text-dark, #fca5a5);
    }

    .retry-btn, .reset-btn {
      border-color: var(--border-color-dark, #374151);
      background: var(--button-background-dark, #1f2937);
      color: var(--text-color-dark, #f9fafb);
    }

    .reset-btn:hover {
      background: var(--button-hover-background-dark, #374151);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .error-retry-panel {
      padding: 16px;
    }

    .retry-actions {
      flex-direction: column;
      align-items: center;
    }

    .retry-btn, .reset-btn {
      width: 100%;
      max-width: 200px;
    }
  }
</style>