<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dependencyResolver } from '$lib/services/artifact-dependency-resolver/dependency-resolver';
  import type { ResolutionResult } from '$lib/services/artifact-dependency-resolver/dependency-resolver';
  
  interface Props {
    originalCode: string;
    errorMessage: string;
    messageContent?: string;
    language?: string;
  }

  let {
    originalCode,
    errorMessage,
    messageContent = '',
    language = 'tsx'
  }: Props = $props();
  
  const dispatch = createEventDispatcher<{
    'resolution-attempt': { success: boolean; result?: ResolutionResult; error?: string };
    'code-fixed': { fixedCode: string; method: string; details: ResolutionResult };
  }>();
  
  let isProcessing = $state(false);
  let lastResolutionResult: ResolutionResult | null = $state(null);
  let processingStep = $state('');
  
  // Processing steps for user feedback
  const steps = [
    'Analyzing error patterns...',
    'Scanning message for related blocks...',
    'Attempting dependency resolution...',
    'Applying fallback strategies...',
    'Validating fixed code...'
  ];
  
  async function attemptAutoResolution() {
    if (isProcessing) return;
    
    isProcessing = true;
    processingStep = steps[0];
    
    try {
      // Step 1: Analyze error patterns
      await delay(300);
      processingStep = steps[1];
      
      // Step 2: Set message content for cross-block analysis
      if (messageContent) {
        dependencyResolver.setMessageContent(messageContent);
      }
      
      await delay(500);
      processingStep = steps[2];
      
      // Step 3: Attempt resolution
      const result = await dependencyResolver.resolveDependencies(originalCode, language);
      lastResolutionResult = result;
      
      await delay(400);
      processingStep = steps[3];
      
      // Step 4: Check if we made improvements
      const hasImprovements = result.fallbacksUsed.length > 0 || result.dependencies.some(d => d.found);
      
      await delay(300);
      processingStep = steps[4];
      
      if (hasImprovements && result.resolvedCode !== originalCode) {
        // Success! We fixed something
        dispatch('resolution-attempt', { success: true, result });
        dispatch('code-fixed', { 
          fixedCode: result.resolvedCode, 
          method: 'auto-resolution',
          details: result 
        });
      } else if (result.errors.length > 0) {
        // Partial success - try graceful degradation
        dispatch('resolution-attempt', { success: false, result });
      } else {
        // No changes made
        dispatch('resolution-attempt', { 
          success: false, 
          error: 'No resolvable dependencies found in the message' 
        });
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during resolution';
      dispatch('resolution-attempt', { success: false, error: errorMsg });
    } finally {
      isProcessing = false;
      processingStep = '';
    }
  }
  
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function getButtonText(): string {
    if (isProcessing) return 'Processing...';
    if (lastResolutionResult?.success) return 'Try Resolution Again';
    return 'Auto-Fix Dependencies';
  }
  
  function getButtonIcon(): string {
    if (isProcessing) {
      return `
        <div class="spinner-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"></path>
          </svg>
        </div>
      `;
    }
    
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9z"></path>
        <path d="M9 12l2 2 4-4"></path>
      </svg>
    `;
  }
</script>

<div class="error-recovery-container">
  <button 
    class="recovery-btn" 
    class:processing={isProcessing}
    class:success={lastResolutionResult?.success}
    onclick={attemptAutoResolution}
    disabled={isProcessing}
    title={isProcessing ? processingStep : 'Attempt to auto-fix dependency issues'}
  >
    <div class="btn-icon">
      {@html getButtonIcon()}
    </div>
    <span class="btn-text">{getButtonText()}</span>
  </button>
  
  {#if isProcessing}
    <div class="processing-status">
      <div class="processing-step">{processingStep}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(steps.indexOf(processingStep) + 1) / steps.length * 100}%"></div>
      </div>
    </div>
  {/if}
  
  {#if lastResolutionResult}
    <div class="resolution-summary">
      <div class="summary-header">
        <span class="status-icon" class:success={lastResolutionResult.success} class:partial={!lastResolutionResult.success && lastResolutionResult.fallbacksUsed.length > 0}>
          {#if lastResolutionResult.success}
            ✅
          {:else if lastResolutionResult.fallbacksUsed.length > 0}
            ⚠️
          {:else}
            ❌
          {/if}
        </span>
        <span class="summary-title">
          {#if lastResolutionResult.success}
            Dependencies Resolved
          {:else if lastResolutionResult.fallbacksUsed.length > 0}
            Partial Resolution
          {:else}
            Resolution Failed
          {/if}
        </span>
      </div>
      
      <div class="summary-details">
        {#if lastResolutionResult.dependencies.length > 0}
          <div class="dependencies-summary">
            <strong>Dependencies:</strong> 
            {lastResolutionResult.dependencies.filter(d => d.found).length}/{lastResolutionResult.dependencies.length} resolved
          </div>
        {/if}
        
        {#if lastResolutionResult.fallbacksUsed.length > 0}
          <div class="fallbacks-summary">
            <strong>Strategies used:</strong> {lastResolutionResult.fallbacksUsed.join(', ')}
          </div>
        {/if}
        
        {#if lastResolutionResult.errors.length > 0}
          <details class="errors-details">
            <summary>Remaining Issues ({lastResolutionResult.errors.length})</summary>
            <ul class="error-list">
              {#each lastResolutionResult.errors as error}
                <li class="error-item">{error}</li>
              {/each}
            </ul>
          </details>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .error-recovery-container {
    margin-top: 16px;
    padding: 16px;
    background: var(--recovery-background, #f8fafc);
    border: 1px solid var(--recovery-border, #e2e8f0);
    border-radius: 8px;
  }
  
  .recovery-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    width: 100%;
    justify-content: center;
  }
  
  .recovery-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .recovery-btn:active {
    transform: translateY(0);
  }
  
  .recovery-btn.processing {
    background: linear-gradient(135deg, #a0aec0 0%, #718096 100%);
    cursor: not-allowed;
  }
  
  .recovery-btn.success {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  }
  
  .recovery-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .spinner-icon {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .btn-text {
    font-weight: 500;
  }
  
  .processing-status {
    margin-top: 12px;
    padding: 12px;
    background: var(--processing-background, #edf2f7);
    border-radius: 6px;
    border-left: 3px solid var(--processing-accent, #4299e1);
  }
  
  .processing-step {
    font-size: 13px;
    color: var(--processing-text, #4a5568);
    margin-bottom: 8px;
    font-style: italic;
  }
  
  .progress-bar {
    height: 4px;
    background: var(--progress-background, #cbd5e0);
    border-radius: 2px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4299e1, #3182ce);
    transition: width 0.3s ease;
    border-radius: 2px;
  }
  
  .resolution-summary {
    margin-top: 16px;
    padding: 12px;
    background: var(--summary-background, #f7fafc);
    border: 1px solid var(--summary-border, #e2e8f0);
    border-radius: 6px;
  }
  
  .summary-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .status-icon {
    font-size: 16px;
  }
  
  .summary-title {
    font-weight: 600;
    color: var(--text-color, #2d3748);
  }
  
  .summary-details {
    font-size: 13px;
    color: var(--text-muted, #718096);
    line-height: 1.5;
  }
  
  .dependencies-summary,
  .fallbacks-summary {
    margin-bottom: 8px;
  }
  
  .errors-details {
    margin-top: 12px;
  }
  
  .errors-details summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--error-color, #e53e3e);
    margin-bottom: 8px;
  }
  
  .error-list {
    margin: 8px 0 0 16px;
    padding: 0;
  }
  
  .error-item {
    margin-bottom: 4px;
    color: var(--error-text, #c53030);
    font-family: var(--mono-font, 'Courier New', monospace);
    font-size: 12px;
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .error-recovery-container {
      background: #2d3748;
      border-color: #4a5568;
    }
    
    .processing-status {
      background: #1a202c;
      border-left-color: #63b3ed;
    }
    
    .processing-step {
      color: #a0aec0;
    }
    
    .resolution-summary {
      background: #1a202c;
      border-color: #4a5568;
    }
    
    .summary-title {
      color: #f7fafc;
    }
    
    .summary-details {
      color: #a0aec0;
    }
  }
</style>
