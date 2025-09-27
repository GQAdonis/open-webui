<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { defaultStrategyExecutor, type RecoveryRequest, type RecoveryResult } from '../../services/artifact-dependency-resolver/strategy-executor';
  import ProgressIndicator from './ProgressIndicator.svelte';
  import RecoveryButton from './RecoveryButton.svelte';
  import RecoveryResults from './RecoveryResults.svelte';

  interface Props {
    artifactId: string;
    artifactCode: string;
    errorMessage: string;
    messageContent?: string;
    language?: string;
    autoStart?: boolean;
    showAdvancedOptions?: boolean;
  }

  let {
    artifactId,
    artifactCode,
    errorMessage,
    messageContent = '',
    language = 'javascript',
    autoStart = false,
    showAdvancedOptions = false
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    recovery_started: { artifactId: string; request: RecoveryRequest };
    recovery_completed: { artifactId: string; result: RecoveryResult };
    recovery_failed: { artifactId: string; error: string };
    code_applied: { artifactId: string; code: string; strategy: string };
    manual_retry: { artifactId: string };
  }>();

  // Recovery state
  let recoveryState: 'idle' | 'running' | 'completed' | 'failed' = $state('idle');
  let currentRecoveryResult: RecoveryResult | null = $state(null);
  let recoveryError: string | null = $state(null);
  let isAutoResolutionPhase = $state(true);
  let recoveryStartTime: number = 0;

  // UI state
  let showDetails = $state(false);
  let userConfirmationRequired = $state(false);
  
  /**
   * Start the recovery process
   */
  async function startRecovery() {
    console.log(`🚀 [Enhanced Recovery] Starting recovery for artifact: ${artifactId}`);

    recoveryState = 'running';
    currentRecoveryResult = null;
    recoveryError = null;
    isAutoResolutionPhase = true;
    recoveryStartTime = Date.now();

    const request: RecoveryRequest = {
      artifactId,
      artifactCode,
      errorMessage,
      messageContent,
      language,
      attemptId: `${artifactId}-${Date.now()}`
    };

    dispatch('recovery_started', { artifactId, request });

    try {
      const result = await defaultStrategyExecutor.executeRecovery(request);

      currentRecoveryResult = result;
      recoveryState = result.success ? 'completed' : 'failed';

      if (result.success) {
        console.log(`✅ [Enhanced Recovery] Recovery succeeded with strategy: ${result.strategy}`);
        dispatch('recovery_completed', { artifactId, result });

        // For high-confidence results, auto-apply the fix
        if (result.confidence > 0.8 && !userConfirmationRequired) {
          applyRecoveredCode();
        }
      } else {
        console.log(`❌ [Enhanced Recovery] Recovery failed: ${result.errors.join(', ')}`);
        recoveryError = result.errors.join(', ') || 'Recovery failed for unknown reasons';
        dispatch('recovery_failed', { artifactId, error: recoveryError });
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown recovery error';
      console.error('🔥 [Enhanced Recovery] Fatal recovery error:', errorMsg);

      recoveryState = 'failed';
      recoveryError = errorMsg;
      dispatch('recovery_failed', { artifactId, error: errorMsg });
    }
  }

  /**
   * Apply the recovered code to the artifact
   */
  function applyRecoveredCode() {
    if (!currentRecoveryResult?.finalCode) {
      console.warn('⚠️ [Enhanced Recovery] No recovered code to apply');
      return;
    }

    console.log(`🔧 [Enhanced Recovery] Applying recovered code using strategy: ${currentRecoveryResult.strategy}`);

    dispatch('code_applied', {
      artifactId,
      code: currentRecoveryResult.finalCode,
      strategy: currentRecoveryResult.strategy
    });
  }

  /**
   * Retry the recovery process
   */
  function retryRecovery() {
    console.log(`🔄 [Enhanced Recovery] Retrying recovery for artifact: ${artifactId}`);
    dispatch('manual_retry', { artifactId });
    startRecovery();
  }

  /**
   * Reset circuit breaker for this artifact
   */
  function resetCircuitBreaker() {
    console.log(`🔄 [Enhanced Recovery] Resetting circuit breaker for artifact: ${artifactId}`);
    defaultStrategyExecutor.resetCircuitBreaker(artifactId);
    retryRecovery();
  }

  /**
   * Get recovery statistics
   */
  function getRecoveryStats() {
    return defaultStrategyExecutor.getRecoveryStats(artifactId);
  }

  /**
   * Format processing time for display
   */
  function formatProcessingTime(timeMs: number): string {
    if (timeMs < 1000) return `${timeMs}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  }

  /**
   * Get strategy display name
   */
  function getStrategyDisplayName(strategy: string): string {
    const strategyNames: Record<string, string> = {
      'CSS_MODULE_CONVERSION': 'CSS Module Conversion',
      'DIRECT_CSS_INJECTION': 'Direct CSS Injection',
      'JSON_DATA_INLINING': 'JSON Data Inlining',
      'IMPORT_REMOVAL': 'Import Removal',
      'LLM_css-module-fix': 'AI CSS Module Fix',
      'LLM_dependency-fix': 'AI Dependency Fix',
      'LLM_syntax-fix': 'AI Syntax Fix',
      'LLM_generic-fix': 'AI Generic Fix',
      'CIRCUIT_BREAKER_BLOCKED': 'Blocked (Too Many Failures)',
      'CLASSIFICATION_FAILED': 'Error Classification Failed',
      'ALL_STRATEGIES_FAILED': 'All Strategies Failed',
      'EXECUTION_ERROR': 'Execution Error'
    };
    return strategyNames[strategy] || strategy;
  }

  // Auto-start recovery if enabled
  onMount(() => {
    if (autoStart) {
      startRecovery();
    }
  });
</script>

<div class="enhanced-error-recovery">
  <div class="recovery-header">
    <div class="error-info">
      <h3 class="error-title">Artifact Recovery Assistant</h3>
      <p class="error-message">{errorMessage}</p>
      {#if artifactId}
        <p class="artifact-info">
          <span class="artifact-id">Artifact: {artifactId}</span>
          <span class="language-badge">{language}</span>
        </p>
      {/if}
    </div>

    {#if recoveryState === 'idle'}
      <RecoveryButton
        variant="primary"
        size="medium"
        onclick={startRecovery}
        disabled={!artifactCode || !errorMessage}
      >
        Start Recovery
      </RecoveryButton>
    {:else if recoveryState === 'running'}
      <RecoveryButton
        variant="secondary"
        size="medium"
        loading={true}
        disabled={true}
        loadingText="Processing..."
      >
        Processing...
      </RecoveryButton>
    {:else if recoveryState === 'completed'}
      <RecoveryButton
        variant="success"
        size="medium"
        success={true}
        onclick={retryRecovery}
      >
        Success
      </RecoveryButton>
    {:else if recoveryState === 'failed'}
      <RecoveryButton
        variant="danger"
        size="medium"
        onclick={retryRecovery}
      >
        Retry Recovery
      </RecoveryButton>
    {/if}
  </div>
  
  {#if recoveryState === 'running'}
    <div class="recovery-progress">
      <ProgressIndicator
        progress={currentRecoveryResult?.stages ? Math.round((currentRecoveryResult.stages.filter(s => s.status === 'completed').length / currentRecoveryResult.stages.length) * 100) : 0}
        stage={isAutoResolutionPhase ? 'Auto-Resolution' : 'AI Fallback'}
        animated={true}
        showPercentage={true}
        size="medium"
        variant="linear"
        color="primary"
      />
    </div>
  {/if}
  
  {#if currentRecoveryResult}
    <div class="recovery-results">
      <RecoveryResults
        result={currentRecoveryResult}
        showDiagnostics={showDetails}
        showPerformanceMetrics={true}
        compact={false}
        on:apply_code={applyRecoveredCode}
        on:toggle_details={() => showDetails = !showDetails}
      />

      {#if currentRecoveryResult.success}
        <div class="success-actions">
          <button
            class="apply-button primary"
            onclick={applyRecoveredCode}
          >
            Apply Fix ({getStrategyDisplayName(currentRecoveryResult.strategy)})
          </button>

          <button
            class="details-button secondary"
            onclick={() => showDetails = !showDetails}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      {:else}
        <div class="failure-actions">
          <button
            class="retry-button secondary"
            onclick={retryRecovery}
          >
            Try Again
          </button>

          {#if currentRecoveryResult.circuitState === 'OPEN'}
            <button
              class="reset-button warning"
              onclick={resetCircuitBreaker}
            >
              Reset & Retry
            </button>
          {/if}

          <button
            class="details-button secondary"
            onclick={() => showDetails = !showDetails}
          >
            {showDetails ? 'Hide' : 'Show'} Error Details
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if recoveryError && !currentRecoveryResult}
    <div class="error-display">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h4>Recovery Failed</h4>
        <p>{recoveryError}</p>
        <div class="error-actions">
          <button class="retry-button secondary" onclick={retryRecovery}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showAdvancedOptions}
    <div class="advanced-options">
      <h4>Advanced Options</h4>
      <div class="option-row">
        <label>
          <input
            type="checkbox"
            bind:checked={userConfirmationRequired}
          />
          Require confirmation before applying fixes
        </label>
      </div>

      <div class="stats-section">
        <h5>Recovery Statistics</h5>
        {#if recoveryState !== 'idle'}
          {@const stats = getRecoveryStats()}
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Circuit State:</span>
              <span class="stat-value {stats.circuitState.toLowerCase()}">{stats.circuitState}</span>
            </div>
            {#if currentRecoveryResult}
              <div class="stat-item">
                <span class="stat-label">Processing Time:</span>
                <span class="stat-value">{formatProcessingTime(currentRecoveryResult.processingTimeMs)}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Confidence:</span>
                <span class="stat-value">{Math.round(currentRecoveryResult.confidence * 100)}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Stages Completed:</span>
                <span class="stat-value">{currentRecoveryResult.stages.filter(s => s.status === 'completed').length}/{currentRecoveryResult.stages.length}</span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .enhanced-recovery-container {
    margin-top: 16px;
    padding: 20px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }
  
  .smart-recovery-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    width: 100%;
    position: relative;
  }
  
  .smart-recovery-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
  }
  
  .smart-recovery-btn.processing {
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
    cursor: not-allowed;
  }
  
  .smart-recovery-btn.success {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  
  .smart-recovery-btn.failed {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  .btn-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  
  .btn-text {
    font-weight: 600;
    font-size: 14px;
  }
  
  .btn-subtitle {
    font-size: 12px;
    opacity: 0.9;
    font-weight: 400;
  }
  
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .spinner-icon {
    animation: spin 1s linear infinite;
  }
  
  .reset-btn {
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  
  .reset-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
  
  .processing-status {
    margin-top: 16px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  
  .method-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    gap: 12px;
  }
  
  .method-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f1f5f9;
    border: 2px solid #e2e8f0;
    border-radius: 20px;
    transition: all 0.3s ease;
  }
  
  .method-badge.active {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1d4ed8;
    font-weight: 600;
  }
  
  .method-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #64748b;
    color: white;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
  }
  
  .method-badge.active .method-number {
    background: #3b82f6;
  }
  
  .method-name {
    font-size: 13px;
    font-weight: 500;
  }
  
  .method-arrow {
    color: #cbd5e0;
    font-weight: bold;
    transition: color 0.3s ease;
  }
  
  .method-arrow.active {
    color: #3b82f6;
  }
  
  .current-step {
    text-align: center;
    font-style: italic;
    color: #64748b;
    margin-bottom: 12px;
    font-size: 13px;
  }
  
  .progress-container {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .progress-bar {
    flex: 1;
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    transition: width 0.3s ease;
    border-radius: 3px;
  }
  
  .progress-text {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    min-width: 40px;
    text-align: right;
  }
  
  .results-summary {
    margin-top: 20px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  
  .results-header {
    margin-bottom: 16px;
  }
  
  .results-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  }
  
  .results-grid {
    display: grid;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .result-item {
    padding: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #f9fafb;
  }
  
  .result-item.success {
    border-color: #10b981;
    background: #ecfdf5;
  }
  
  .result-status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .status-title {
    font-weight: 600;
    font-size: 14px;
  }
  
  .result-details {
    font-size: 12px;
    color: #6b7280;
    line-height: 1.4;
  }
  
  .result-details p {
    margin: 4px 0;
  }
  
  .error-count {
    color: #ef4444;
    font-weight: 500;
  }
  
  .explanation {
    font-style: italic;
  }
  
  .fallback-options {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }
  
  .fallback-title {
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }
  
  .fallback-list {
    margin: 0;
    padding-left: 20px;
    color: #6b7280;
    font-size: 13px;
  }
  
  .fallback-list li {
    margin-bottom: 4px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .enhanced-recovery-container {
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      border-color: #374151;
    }
    
    .processing-status,
    .results-summary {
      background: #111827;
      border-color: #374151;
    }
    
    .method-badge {
      background: #1f2937;
      border-color: #374151;
      color: #d1d5db;
    }
    
    .method-badge.active {
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #dbeafe;
    }
    
    .current-step {
      color: #9ca3af;
    }
    
    .progress-text {
      color: #9ca3af;
    }
    
    .results-header h4 {
      color: #f9fafb;
    }
    
    .result-item {
      background: #1f2937;
      border-color: #374151;
    }
    
    .result-item.success {
      background: #064e3b;
      border-color: #10b981;
    }
  }
</style>
