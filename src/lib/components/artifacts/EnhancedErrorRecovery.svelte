<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { dependencyResolver } from '$lib/services/artifact-dependency-resolver/dependency-resolver';
  import { llmAutoFixService } from '$lib/services/artifact-dependency-resolver/llm-autofix-service';
  import type { ResolutionResult } from '$lib/services/artifact-dependency-resolver/dependency-resolver';
  import type { AutoFixResult } from '$lib/services/artifact-dependency-resolver/llm-autofix-service';
  
  export let originalCode: string;
  export let errorMessage: string;
  export let messageContent: string = '';
  export let language: string = 'tsx';
  
  const dispatch = createEventDispatcher<{
    'recovery-attempt': { method: string; success: boolean; result?: any; error?: string };
    'code-fixed': { fixedCode: string; method: string; details: any };
  }>();
  
  let isProcessing = false;
  let currentStep = '';
  let currentMethod: 'auto-resolution' | 'llm-fix' | null = null;
  let lastResults: {
    resolution?: ResolutionResult;
    llmFix?: AutoFixResult;
  } = {};
  
  // Recovery steps for user feedback
  const resolutionSteps = [
    'Scanning for dependencies...',
    'Analyzing code blocks...',
    'Applying resolution strategies...',
    'Validating results...'
  ];
  
  const llmSteps = [
    'Preparing context for AI...',
    'Generating fix with AI...',
    'Validating AI solution...',
    'Applying improvements...'
  ];
  
  async function attemptAutoResolution() {
    if (isProcessing) return;
    
    isProcessing = true;
    currentMethod = 'auto-resolution';
    
    try {
      // Step through resolution process
      for (let i = 0; i < resolutionSteps.length; i++) {
        currentStep = resolutionSteps[i];
        await delay(400);
        
        if (i === 1 && messageContent) {
          dependencyResolver.setMessageContent(messageContent);
        }
        
        if (i === 2) {
          const result = await dependencyResolver.resolveDependencies(originalCode, language);
          lastResults.resolution = result;
          
          // Check if we made improvements
          const hasImprovements = result.fallbacksUsed.length > 0 || result.dependencies.some(d => d.found);
          
          if (hasImprovements && result.resolvedCode !== originalCode) {
            dispatch('recovery-attempt', { method: 'auto-resolution', success: true, result });
            dispatch('code-fixed', { 
              fixedCode: result.resolvedCode, 
              method: 'auto-resolution',
              details: result 
            });
            return;
          }
        }
      }
      
      // If auto-resolution didn't work, automatically try LLM fix
      await attemptLLMFix();
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during resolution';
      dispatch('recovery-attempt', { method: 'auto-resolution', success: false, error: errorMsg });
    } finally {
      if (currentMethod === 'auto-resolution') {
        isProcessing = false;
        currentMethod = null;
        currentStep = '';
      }
    }
  }
  
  async function attemptLLMFix() {
    if (isProcessing && currentMethod !== 'auto-resolution') return;
    
    if (!isProcessing) {
      isProcessing = true;
    }
    currentMethod = 'llm-fix';
    
    try {
      // Step through LLM fix process
      for (let i = 0; i < llmSteps.length; i++) {
        currentStep = llmSteps[i];
        await delay(500);
        
        if (i === 1) {
          const fixRequest = {
            originalCode,
            errorMessage,
            language,
            messageContent
          };
          
          const result = await llmAutoFixService.attemptAutoFix(fixRequest);
          lastResults.llmFix = result;
          
          if (result.success && result.fixedCode) {
            dispatch('recovery-attempt', { method: 'llm-fix', success: true, result });
            dispatch('code-fixed', { 
              fixedCode: result.fixedCode, 
              method: 'llm-fix',
              details: result 
            });
            return;
          }
        }
      }
      
      // If we reach here, LLM fix also failed
      dispatch('recovery-attempt', { 
        method: 'llm-fix', 
        success: false, 
        error: lastResults.llmFix?.errors?.[0] || 'LLM auto-fix failed'
      });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during LLM fix';
      dispatch('recovery-attempt', { method: 'llm-fix', success: false, error: errorMsg });
    } finally {
      isProcessing = false;
      currentMethod = null;
      currentStep = '';
    }
  }
  
  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function getButtonText(): string {
    if (isProcessing) {
      switch (currentMethod) {
        case 'auto-resolution': return 'Auto-Resolving...';
        case 'llm-fix': return 'AI Fixing...';
        default: return 'Processing...';
      }
    }
    
    if (hasAttempted()) {
      return 'Try Again';
    }
    
    return 'Smart Auto-Fix';
  }
  
  function hasAttempted(): boolean {
    return !!(lastResults.resolution || lastResults.llmFix);
  }
  
  function getSuccessfulResult(): { method: string; result: any } | null {
    if (lastResults.resolution?.success) {
      return { method: 'Auto-Resolution', result: lastResults.resolution };
    }
    if (lastResults.llmFix?.success) {
      return { method: 'AI Fix', result: lastResults.llmFix };
    }
    return null;
  }
  
  function getButtonIcon(): string {
    if (isProcessing) {
      return `
        <div class="spinner-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.56 1.23"/>
          </svg>
        </div>
      `;
    }
    
    const successResult = getSuccessfulResult();
    if (successResult) {
      return `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      `;
    }
    
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
    `;
  }
  
  function reset() {
    lastResults = {};
    currentStep = '';
    currentMethod = null;
  }
</script>

<div class="enhanced-recovery-container">
  <button 
    class="smart-recovery-btn" 
    class:processing={isProcessing}
    class:success={!!getSuccessfulResult()}
    class:failed={hasAttempted() && !getSuccessfulResult()}
    on:click={attemptAutoResolution}
    disabled={isProcessing}
    title={isProcessing ? currentStep : 'Intelligent auto-fix using multiple strategies'}
  >
    <div class="btn-icon">
      {@html getButtonIcon()}
    </div>
    <div class="btn-content">
      <span class="btn-text">{getButtonText()}</span>
      {#if !isProcessing && hasAttempted()}
        <span class="btn-subtitle">
          {#if getSuccessfulResult()}
            Fixed with {getSuccessfulResult()?.method}
          {:else}
            Multiple attempts failed
          {/if}
        </span>
      {/if}
    </div>
    {#if hasAttempted() && !isProcessing}
      <button class="reset-btn" on:click|stopPropagation={reset} title="Reset and try again">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6"/>
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
        </svg>
      </button>
    {/if}
  </button>
  
  {#if isProcessing}
    <div class="processing-status">
      <div class="method-indicator">
        <div class="method-badge" class:active={currentMethod === 'auto-resolution'}>
          <span class="method-number">1</span>
          <span class="method-name">Auto-Resolution</span>
        </div>
        <div class="method-arrow" class:active={currentMethod === 'llm-fix'}>→</div>
        <div class="method-badge" class:active={currentMethod === 'llm-fix'}>
          <span class="method-number">2</span>
          <span class="method-name">AI Fix</span>
        </div>
      </div>
      
      <div class="current-step">{currentStep}</div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {getProgressPercentage()}%"></div>
        </div>
        <span class="progress-text">{Math.round(getProgressPercentage())}%</span>
      </div>
    </div>
  {/if}
  
  {#if hasAttempted()}
    <div class="results-summary">
      <div class="results-header">
        <h4>Recovery Attempt Results</h4>
      </div>
      
      <div class="results-grid">
        {#if lastResults.resolution}
          <div class="result-item" class:success={lastResults.resolution.success}>
            <div class="result-status">
              <span class="status-icon">{lastResults.resolution.success ? '✅' : '⚠️'}</span>
              <span class="status-title">Auto-Resolution</span>
            </div>
            <div class="result-details">
              {#if lastResults.resolution.dependencies.length > 0}
                <p>Dependencies: {lastResults.resolution.dependencies.filter(d => d.found).length}/{lastResults.resolution.dependencies.length} resolved</p>
              {/if}
              {#if lastResults.resolution.fallbacksUsed.length > 0}
                <p>Strategies: {lastResults.resolution.fallbacksUsed.join(', ')}</p>
              {/if}
              {#if lastResults.resolution.errors.length > 0}
                <p class="error-count">{lastResults.resolution.errors.length} unresolved issues</p>
              {/if}
            </div>
          </div>
        {/if}
        
        {#if lastResults.llmFix}
          <div class="result-item" class:success={lastResults.llmFix.success}>
            <div class="result-status">
              <span class="status-icon">{lastResults.llmFix.success ? '✅' : '❌'}</span>
              <span class="status-title">AI Fix</span>
            </div>
            <div class="result-details">
              <p>Strategy: {lastResults.llmFix.strategy}</p>
              <p>Confidence: {Math.round(lastResults.llmFix.confidence * 100)}%</p>
              {#if lastResults.llmFix.explanation}
                <p class="explanation">{lastResults.llmFix.explanation}</p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      
      {#if !getSuccessfulResult()}
        <div class="fallback-options">
          <p class="fallback-title">Alternative Solutions:</p>
          <ul class="fallback-list">
            <li>Try simplifying the component structure</li>
            <li>Remove complex dependencies and use basic React features</li>
            <li>Check for syntax errors in the original code</li>
            <li>Consider rewriting the component from scratch</li>
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>

<script>
  function getProgressPercentage(): number {
    if (!currentMethod || !currentStep) return 0;
    
    const steps = currentMethod === 'auto-resolution' ? resolutionSteps : llmSteps;
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex === -1) return 0;
    
    const methodProgress = (currentIndex + 1) / steps.length;
    
    // If we're on LLM fix after auto-resolution, show overall progress
    if (currentMethod === 'llm-fix' && lastResults.resolution) {
      return 50 + (methodProgress * 50); // Second half of overall progress
    }
    
    return methodProgress * (currentMethod === 'auto-resolution' && !lastResults.resolution ? 50 : 100);
  }
</script>

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
