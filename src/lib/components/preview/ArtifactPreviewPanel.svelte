<script lang="ts">
  import { createBubbler, stopPropagation } from 'svelte/legacy';

  const bubble = createBubbler();
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { previewStore, previewConfig, previewActions, configActions } from '$lib/stores/preview/preview-store';
  import UnifiedSandpackRenderer from '../artifacts/renderers/UnifiedSandpackRenderer.svelte';
  
  // State subscriptions
  let isVisible = $derived($previewStore.isVisible);
  let config = $derived($previewConfig);
  let loading = $derived($previewStore.loading);
  let error = $derived($previewStore.error);
  let title = $derived($previewStore.title);
  
  let panelElement: HTMLDivElement = $state();
  let isAnimating = false;
  
  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isVisible && !isAnimating) {
      closePanel();
    }
  }
  
  // Handle backdrop click
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !isAnimating) {
      closePanel();
    }
  }
  
  // Close panel with animation
  function closePanel() {
    if (isAnimating) return;
    
    isAnimating = true;
    previewActions.hide();
    
    // Reset animation state after transition
    setTimeout(() => {
      isAnimating = false;
    }, 300);
  }
  
  // Toggle fullscreen mode
  function toggleFullscreen() {
    if (config.width >= 90) {
      configActions.setWidth(60);
    } else {
      configActions.setWidth(95);
    }
  }
  
  // Toggle code view
  function toggleCodeView() {
    configActions.toggleCodeView();
  }
  
  // Lifecycle
  onMount(() => {
    if (browser) {
      document.addEventListener('keydown', handleKeydown);
    }
  });
  
  onDestroy(() => {
    if (browser) {
      document.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

<!-- Backdrop -->
{#if isVisible}
  <div 
    class="preview-backdrop"
    class:visible={isVisible}
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="preview-title"
  >
    <!-- Preview Panel -->
    <div 
      bind:this={panelElement}
      class="preview-panel"
      class:visible={isVisible}
      class:position-right={config.position === 'right'}
      class:position-left={config.position === 'left'}
      style="width: {config.width}%"
      onclick={stopPropagation(bubble('click'))}
      onkeydown={stopPropagation(bubble('keydown'))}
    >
      <!-- Panel Header -->
      <div class="preview-header">
        <div class="header-content">
          <div class="header-left">
            <h2 id="preview-title" class="preview-title">
              {title}
            </h2>
            {#if loading}
              <div class="loading-indicator">
                <div class="spinner"></div>
              </div>
            {/if}
          </div>
          
          <div class="header-actions">
            <!-- Toggle Code View -->
            <button
              class="header-button"
              class:active={config.showCode}
              onclick={toggleCodeView}
              title="Toggle code view"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
              </svg>
            </button>
            
            <!-- Toggle Fullscreen -->
            <button
              class="header-button"
              onclick={toggleFullscreen}
              title={config.width >= 90 ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {#if config.width >= 90}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4m-4 0l4 4m8-4h4m0 0v4m0-4l-4 4M4 16v4m0 0h4m-4 0l4-4m16 4v-4m0 4h-4m4 0l-4-4"></path>
                </svg>
              {/if}
            </button>
            
            <!-- Close Button -->
            <button
              class="header-button close-button"
              onclick={closePanel}
              title="Close preview"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6m0 12L6 6"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Panel Content -->
      <div class="preview-content">
        {#if error}
          <div class="error-container">
            <div class="error-icon">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="error-title">Preview Error</h3>
            <p class="error-message">{error}</p>
            <button class="retry-button" onclick={() => previewActions.clearError()}>
              Try Again
            </button>
          </div>
        {:else}
          <UnifiedSandpackRenderer
            artifact={{
              type: 'react',
              title: title || 'React Component',
              entryCode: $previewStore.code || '',
              css: $previewStore.css,
              extraFiles: undefined,
              dependencies: undefined
            }}
            showCode={config.showCode}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .preview-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  
  .preview-backdrop.visible {
    opacity: 1;
    pointer-events: auto;
  }
  
  .preview-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--color-gray-50, #f9fafb);
    border: 1px solid var(--color-gray-200, #e5e7eb);
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease;
    max-width: 95vw;
  }
  
  .preview-panel.position-right {
    right: 0;
    border-left: 1px solid var(--color-gray-200, #e5e7eb);
    border-right: none;
    transform: translateX(100%);
  }
  
  .preview-panel.position-left {
    left: 0;
    border-right: 1px solid var(--color-gray-200, #e5e7eb);
    border-left: none;
    transform: translateX(-100%);
  }
  
  .preview-panel.visible {
    transform: translateX(0);
  }
  
  .preview-header {
    background: var(--color-white, #ffffff);
    border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
    padding: 16px 20px;
    flex-shrink: 0;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }
  
  .preview-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-gray-900, #111827);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .loading-indicator {
    display: flex;
    align-items: center;
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--color-gray-300, #d1d5db);
    border-top: 2px solid var(--color-blue-500, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .header-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-gray-600, #4b5563);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .header-button:hover {
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-gray-900, #111827);
  }
  
  .header-button.active {
    background: var(--color-blue-100, #dbeafe);
    color: var(--color-blue-600, #2563eb);
  }
  
  .close-button:hover {
    background: var(--color-red-100, #fee2e2);
    color: var(--color-red-600, #dc2626);
  }
  
  .preview-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    text-align: center;
    color: var(--color-gray-600, #4b5563);
  }
  
  .error-icon {
    color: var(--color-red-500, #ef4444);
    margin-bottom: 16px;
  }
  
  .error-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-gray-900, #111827);
    margin: 0 0 8px 0;
  }
  
  .error-message {
    font-size: 14px;
    margin: 0 0 20px 0;
    max-width: 400px;
  }
  
  .retry-button {
    background: var(--color-blue-600, #2563eb);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  .retry-button:hover {
    background: var(--color-blue-700, #1d4ed8);
  }
  
  /* Mobile responsiveness */
  @media (max-width: 768px) {
    .preview-panel {
      width: 100% !important;
      left: 0 !important;
      right: 0 !important;
    }
    
    .preview-panel.position-right {
      transform: translateY(100%);
    }
    
    .preview-panel.position-right.visible {
      transform: translateY(0);
    }
    
    .preview-title {
      font-size: 16px;
    }
    
    .header-content {
      padding: 12px 16px;
    }
  }
  
  /* Dark mode support */
  :global(.dark) .preview-panel {
    background: var(--color-gray-900, #111827);
    border-color: var(--color-gray-700, #374151);
  }
  
  :global(.dark) .preview-header {
    background: var(--color-gray-800, #1f2937);
    border-color: var(--color-gray-700, #374151);
  }
  
  :global(.dark) .preview-title {
    color: var(--color-gray-100, #f3f4f6);
  }
  
  :global(.dark) .header-button {
    color: var(--color-gray-400, #9ca3af);
  }
  
  :global(.dark) .header-button:hover {
    background: var(--color-gray-700, #374151);
    color: var(--color-gray-100, #f3f4f6);
  }
  
  :global(.dark) .error-title {
    color: var(--color-gray-100, #f3f4f6);
  }
  
  :global(.dark) .error-container {
    color: var(--color-gray-400, #9ca3af);
  }
</style>
