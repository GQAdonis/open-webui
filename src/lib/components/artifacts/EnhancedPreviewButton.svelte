<!--
Enhanced Preview Button with Intent Classification and Retry Prevention
Extends the existing ArtifactButton.svelte with enhanced functionality
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { artifactStore, artifactUIState, artifactActions } from '$lib/stores/artifacts/artifact-store';
  import { artifactIntegration, hasArtifactInMessage } from '$lib/utils/artifacts/integration';
  import { showArtifacts, showControls } from '$lib/stores';
  import { intentClassifier } from '$lib/services/intent-classifier';
  import { retryLoopMonitor } from '$lib/services/retry-loop-monitor';
  import { detectArtifactsWithContext } from '$lib/artifacts/detectArtifacts';
  import type { IntentClassificationRequest } from '$lib/types/intent-classifier';

  export let messageContent: string = '';
  export let messageId: string;
  export let style: 'default' | 'minimal' | 'icon-only' | 'enhanced' = 'enhanced';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let enableIntentClassification = true;
  export let showRetryInfo = true;

  const dispatch = createEventDispatcher();

  // Enhanced state management
  let isLoading = false;
  let isAnalyzing = false;
  let intentConfidence = 0;
  let shouldEnhance = false;
  let hasArtifacts = false;
  let artifactCount = 0;
  let retryState: any = null;
  let componentId: string;

  // Initialize on mount
  onMount(async () => {
    componentId = `enhanced-button-${messageId}-${Math.random().toString(36).substr(2, 9)}`;
    await analyzeMessage();
  });

  // Reactive checks
  $: if (messageContent) {
    analyzeMessage();
  }

  async function analyzeMessage() {
    if (!messageContent || isAnalyzing) return;

    isAnalyzing = true;

    try {
      // Step 1: Check for existing artifacts
      hasArtifacts = hasArtifactInMessage(messageContent);
      artifactCount = hasArtifacts ? getArtifactCount() : 0;

      // Step 2: Intent classification (if enabled and no artifacts found)
      if (enableIntentClassification && !hasArtifacts) {
        await performIntentClassification();
      }

      // Step 3: Check retry state
      if (componentId) {
        retryState = retryLoopMonitor.getComponentState(componentId);
      }

    } catch (error) {
      console.error('Enhanced preview button analysis failed:', error);
    } finally {
      isAnalyzing = false;
    }
  }

  async function performIntentClassification() {
    try {
      const request: IntentClassificationRequest = {
        prompt: messageContent,
        sessionId: messageId,
        timestamp: new Date()
      };

      const result = await intentClassifier.classifyIntent(request);
      intentConfidence = result.confidence;
      shouldEnhance = result.shouldEnhance;

      console.log('🎯 [EnhancedPreviewButton] Intent classification:', {
        messageId,
        shouldEnhance,
        confidence: intentConfidence,
        keywords: result.detectedKeywords
      });

    } catch (error) {
      console.warn('Intent classification failed:', error);
      intentConfidence = 0;
      shouldEnhance = false;
    }
  }

  function getArtifactCount(): number {
    try {
      const artifacts = artifactIntegration.processResponse(messageContent, messageId);
      return artifacts.length;
    } catch (error) {
      return 0;
    }
  }

  async function handleClick() {
    if (isLoading) return;

    isLoading = true;

    try {
      if (hasArtifacts) {
        // Handle existing artifacts
        await handleExistingArtifacts();
      } else if (shouldEnhance) {
        // Handle potential artifacts with context-aware detection
        await handlePotentialArtifacts();
      }
    } catch (error) {
      console.error('Enhanced preview button click failed:', error);
      retryLoopMonitor.recordRetry(componentId, error.message);
    } finally {
      isLoading = false;
    }
  }

  async function handleExistingArtifacts() {
    const artifacts = artifactIntegration.processResponse(messageContent, messageId);

    // Show artifact panel
    artifactActions.showPanel();
    showArtifacts.set(true);
    showControls.set(true);

    // Select the first artifact
    if (artifacts.length > 0) {
      artifactActions.selectArtifact(artifacts[0].artifact.identifier);
      retryLoopMonitor.recordSuccess(componentId);
    }

    dispatch('click', { messageId, artifacts, type: 'existing' });
  }

  async function handlePotentialArtifacts() {
    try {
      // Use enhanced detection with context
      const detectionResult = await detectArtifactsWithContext(messageContent, {
        sessionId: messageId,
        userIntent: 'create_artifact'
      });

      if (detectionResult.hasArtifacts) {
        // Found artifacts through enhanced detection
        const processedArtifacts = artifactIntegration.processResponse(messageContent, messageId);

        artifactActions.showPanel();
        showArtifacts.set(true);
        showControls.set(true);

        if (processedArtifacts.length > 0) {
          artifactActions.selectArtifact(processedArtifacts[0].artifact.identifier);
        }

        dispatch('click', {
          messageId,
          artifacts: processedArtifacts,
          type: 'detected',
          metadata: detectionResult.detectionMetadata
        });
      } else {
        // Suggest enhancement
        dispatch('enhancementSuggested', {
          messageId,
          confidence: intentConfidence,
          suggestion: 'This message might benefit from artifact enhancement'
        });
      }
    } catch (error) {
      console.error('Enhanced artifact detection failed:', error);
      throw error;
    }
  }

  function getButtonText(): string {
    if (isAnalyzing) return 'Analyzing...';
    if (isLoading) return 'Loading...';
    if (style === 'icon-only') return '';

    if (hasArtifacts) {
      if (style === 'minimal') return artifactCount > 1 ? `${artifactCount} artifacts` : 'artifact';
      return artifactCount > 1 ? `View ${artifactCount} artifacts` : 'View artifact';
    }

    if (shouldEnhance) {
      return `Create artifact (${Math.round(intentConfidence * 100)}% confidence)`;
    }

    return 'Create artifact';
  }

  function getButtonTitle(): string {
    if (hasArtifacts) {
      return `View ${artifactCount > 1 ? artifactCount + ' interactive artifacts' : 'interactive artifact'}`;
    }

    if (shouldEnhance) {
      return `Intent detected with ${Math.round(intentConfidence * 100)}% confidence. Click to create artifact.`;
    }

    return 'Create interactive artifact from this content';
  }

  function canShowButton(): boolean {
    return hasArtifacts || shouldEnhance || style === 'enhanced';
  }

  // Size classes
  $: sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2'
  }[size];

  // Icon size classes
  $: iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }[size];

  // Button style classes
  $: buttonStyleClasses = (() => {
    if (style === 'minimal') {
      return 'text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400';
    }

    if (hasArtifacts) {
      return 'bg-blue-100 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30';
    }

    if (shouldEnhance) {
      return 'bg-green-100 text-green-800 border border-green-200 rounded-lg hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/30';
    }

    return 'bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700';
  })();
</script>

{#if canShowButton()}
  <button
    class="enhanced-preview-button inline-flex items-center gap-1.5 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
           {sizeClasses} {buttonStyleClasses}"
    class:loading={isLoading}
    class:analyzing={isAnalyzing}
    class:has-artifacts={hasArtifacts}
    class:should-enhance={shouldEnhance}
    on:click={handleClick}
    disabled={isLoading || isAnalyzing}
    title={getButtonTitle()}
    aria-label={getButtonText()}
  >
    <!-- Loading/Analysis indicator -->
    {#if isLoading || isAnalyzing}
      <div class="spinner {iconSizeClasses}"></div>
    {:else}
      <!-- Artifact/Intent icon -->
      <svg
        class="button-icon {iconSizeClasses}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {#if hasArtifacts}
          <!-- Existing artifact icon -->
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        {:else if shouldEnhance}
          <!-- Intent detected icon -->
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        {:else}
          <!-- Create artifact icon -->
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        {/if}
      </svg>
    {/if}

    <!-- Button text -->
    {#if style !== 'icon-only'}
      <span class="button-text">{getButtonText()}</span>
    {/if}

    <!-- Confidence indicator -->
    {#if shouldEnhance && intentConfidence > 0.7 && showRetryInfo}
      <div class="confidence-indicator" title="High confidence intent detection">
        <div class="confidence-bar" style="width: {intentConfidence * 100}%"></div>
      </div>
    {/if}

    <!-- Artifact count badge -->
    {#if artifactCount > 1}
      <span class="artifact-count-badge inline-flex items-center justify-center min-w-[1.25rem] h-5 text-xs font-medium text-white bg-blue-600 rounded-full px-1">
        {artifactCount}
      </span>
    {/if}

    <!-- Retry indicator -->
    {#if retryState && retryState.consecutiveFailures > 0 && showRetryInfo}
      <div class="retry-indicator" title="Previous rendering attempts: {retryState.consecutiveFailures}">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
    {/if}
  </button>
{/if}

<style>
  .enhanced-preview-button {
    position: relative;
    overflow: hidden;
  }

  .enhanced-preview-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .enhanced-preview-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .enhanced-preview-button.loading,
  .enhanced-preview-button.analyzing {
    pointer-events: none;
  }

  .spinner {
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .button-icon {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .enhanced-preview-button:hover .button-icon {
    transform: scale(1.1);
  }

  .button-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .confidence-indicator {
    position: relative;
    width: 20px;
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    overflow: hidden;
  }

  .confidence-bar {
    height: 100%;
    background: linear-gradient(90deg, #fbbf24, #10b981);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .artifact-count-badge {
    font-size: 0.625rem;
    line-height: 1;
    animation: pulse 2s infinite;
  }

  .retry-indicator {
    color: #f59e0b;
    opacity: 0.8;
  }

  /* State-specific styles */
  .enhanced-preview-button.has-artifacts {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  .enhanced-preview-button.should-enhance {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    animation: pulse-green 2s infinite;
  }

  @keyframes pulse-green {
    0%, 100% {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
    }
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .confidence-indicator {
      background: rgba(255, 255, 255, 0.1);
    }

    .enhanced-preview-button.has-artifacts {
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }

    .enhanced-preview-button.should-enhance {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
    }
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .button-text {
      max-width: 120px;
    }

    .confidence-indicator {
      display: none;
    }
  }
</style>