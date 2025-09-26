<!--
Loading Timeout Indicator Component for Artifact System
Reusable component for tracking loading states with timeout visualization
-->
<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';

  export let isLoading = false;
  export let startTime: number | null = null;
  export let timeoutMs = 30000; // 30 seconds default
  export let showProgress = true;
  export let showTimer = true;
  export let warningThreshold = 0.75; // Show warning at 75% of timeout
  export let componentId: string | null = null;
  export let label = 'Loading...';

  const dispatch = createEventDispatcher();

  let currentTime = Date.now();
  let timeoutTimer: NodeJS.Timeout | null = null;
  let progressTimer: NodeJS.Timeout | null = null;

  // Reactive calculations
  $: elapsedMs = startTime ? currentTime - startTime : 0;
  $: progressPercent = Math.min((elapsedMs / timeoutMs) * 100, 100);
  $: remainingMs = Math.max(timeoutMs - elapsedMs, 0);
  $: remainingSeconds = Math.ceil(remainingMs / 1000);
  $: isWarning = progressPercent >= (warningThreshold * 100);
  $: isTimeout = elapsedMs >= timeoutMs && isLoading;

  // Start monitoring when loading begins
  $: if (isLoading && startTime) {
    startMonitoring();
  } else {
    stopMonitoring();
  }

  function startMonitoring() {
    stopMonitoring(); // Clear any existing timers

    // Update current time every 100ms for smooth progress
    progressTimer = setInterval(() => {
      currentTime = Date.now();
    }, 100);

    // Set timeout handler
    timeoutTimer = setTimeout(() => {
      if (isLoading) {
        dispatch('timeout', {
          componentId,
          elapsedMs: timeoutMs,
          startTime
        });
      }
    }, timeoutMs);
  }

  function stopMonitoring() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  }

  function handleCancel() {
    dispatch('cancel', { componentId, elapsedMs });
  }

  onDestroy(() => {
    stopMonitoring();
  });
</script>

{#if isLoading}
  <div class="loading-timeout-indicator" class:warning={isWarning} class:timeout={isTimeout}>
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner"></div>
      </div>

      <div class="loading-info">
        <div class="loading-label">{label}</div>

        {#if showTimer && remainingMs > 0}
          <div class="timer-display" class:warning={isWarning}>
            {remainingSeconds}s remaining
          </div>
        {:else if isTimeout}
          <div class="timeout-message">
            Operation timed out
          </div>
        {/if}
      </div>

      <button
        class="cancel-btn"
        on:click={handleCancel}
        title="Cancel loading"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    {#if showProgress}
      <div class="progress-container">
        <div class="progress-bar">
          <div
            class="progress-fill"
            class:warning={isWarning}
            class:timeout={isTimeout}
            style="width: {progressPercent}%"
          ></div>
        </div>
        <div class="progress-text" class:warning={isWarning}>
          {Math.round(progressPercent)}%
        </div>
      </div>
    {/if}

    {#if isWarning && !isTimeout}
      <div class="warning-message">
        <svg class="warning-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <path d="M12 9v4"/>
          <path d="m12 17 .01 0"/>
        </svg>
        Taking longer than expected...
      </div>
    {/if}
  </div>
{/if}

<style>
  .loading-timeout-indicator {
    padding: 16px;
    background: var(--loading-background, #f8f9fa);
    border: 1px solid var(--loading-border, #e1e5e9);
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .loading-timeout-indicator.warning {
    background: var(--warning-background, #fef3c7);
    border-color: var(--warning-border, #fbbf24);
  }

  .loading-timeout-indicator.timeout {
    background: var(--error-background, #fef2f2);
    border-color: var(--error-border, #fecaca);
  }

  .loading-content {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .loading-spinner {
    flex-shrink: 0;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color, #e1e5e9);
    border-top: 2px solid var(--primary-color, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-timeout-indicator.warning .spinner {
    border-top-color: var(--warning-color, #f59e0b);
  }

  .loading-timeout-indicator.timeout .spinner {
    border-top-color: var(--error-color, #dc2626);
    animation-duration: 0.5s;
  }

  .loading-info {
    flex: 1;
    min-width: 0;
  }

  .loading-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color, #1f2937);
    margin-bottom: 2px;
  }

  .timer-display {
    font-size: 12px;
    color: var(--text-muted, #6b7280);
    font-family: monospace;
  }

  .timer-display.warning {
    color: var(--warning-color, #f59e0b);
    font-weight: 500;
  }

  .timeout-message {
    font-size: 12px;
    color: var(--error-color, #dc2626);
    font-weight: 500;
  }

  .cancel-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 4px;
    background: var(--button-background, #ffffff);
    color: var(--text-muted, #6b7280);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: var(--button-hover-background, #f3f4f6);
    color: var(--text-color, #1f2937);
    transform: scale(1.05);
  }

  .progress-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-bar {
    flex: 1;
    height: 4px;
    background: var(--progress-background, #e5e7eb);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary-color, #3b82f6);
    border-radius: 2px;
    transition: width 0.1s ease-out, background-color 0.3s ease;
  }

  .progress-fill.warning {
    background: var(--warning-color, #f59e0b);
  }

  .progress-fill.timeout {
    background: var(--error-color, #dc2626);
  }

  .progress-text {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted, #6b7280);
    min-width: 30px;
    text-align: right;
    font-family: monospace;
  }

  .progress-text.warning {
    color: var(--warning-color, #f59e0b);
  }

  .warning-message {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px;
    background: var(--warning-background, #fef3c7);
    border: 1px solid var(--warning-border, #fbbf24);
    border-radius: 4px;
    font-size: 12px;
    color: var(--warning-text, #92400e);
  }

  .warning-icon {
    flex-shrink: 0;
    color: var(--warning-color, #f59e0b);
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .loading-timeout-indicator {
      background: var(--loading-background-dark, #1f2937);
      border-color: var(--loading-border-dark, #374151);
    }

    .loading-timeout-indicator.warning {
      background: var(--warning-background-dark, #1e1611);
      border-color: var(--warning-border-dark, #78350f);
    }

    .loading-timeout-indicator.timeout {
      background: var(--error-background-dark, #1f1415);
      border-color: var(--error-border-dark, #553c3c);
    }

    .loading-label {
      color: var(--text-color-dark, #f9fafb);
    }

    .timer-display {
      color: var(--text-muted-dark, #9ca3af);
    }

    .cancel-btn {
      border-color: var(--border-color-dark, #374151);
      background: var(--button-background-dark, #1f2937);
      color: var(--text-muted-dark, #9ca3af);
    }

    .cancel-btn:hover {
      background: var(--button-hover-background-dark, #374151);
      color: var(--text-color-dark, #f9fafb);
    }

    .progress-bar {
      background: var(--progress-background-dark, #374151);
    }

    .warning-message {
      background: var(--warning-background-dark, #1e1611);
      border-color: var(--warning-border-dark, #78350f);
      color: var(--warning-text-dark, #fbbf24);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .loading-timeout-indicator {
      padding: 12px;
    }

    .loading-content {
      gap: 8px;
      margin-bottom: 8px;
    }

    .loading-label {
      font-size: 13px;
    }

    .timer-display {
      font-size: 11px;
    }
  }
</style>