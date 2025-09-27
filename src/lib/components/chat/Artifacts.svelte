<script lang="ts">
  import { onMount, getContext, createEventDispatcher, onDestroy } from 'svelte';
  import { artifactCode, chatId, settings, showArtifacts, showControls } from '$lib/stores';
  import { artifactStore, artifactUIState, artifactActions } from '$lib/stores/artifacts/artifact-store';
  import { artifactIntegration } from '$lib/utils/artifacts/integration';
  import { createMessagesList } from '$lib/utils';
  import ArtifactPanel from '$lib/components/artifacts/ArtifactPanel.svelte';
  import UnifiedSandpackRenderer from '../artifacts/renderers/UnifiedSandpackRenderer.svelte';

  const i18n = getContext('i18n');
  const dispatch = createEventDispatcher();

  export let overlay = false;
  export let history;

  let messages = [];
  let unsubscribe: (() => void) | null = null;
  let artifactCodeUnsubscribe: (() => void) | null = null;
  let legacyArtifactCode = null;

  // Process messages and detect artifacts when history changes
  $: if (history) {
    messages = createMessagesList(history, history.currentId);
    processMessages();
  } else {
    messages = [];
    if ($chatId) {
      artifactActions.clearChatArtifacts($chatId);
    }
  }

  // Process messages for PAS 3.0 artifacts
  const processMessages = async () => {
    if (!messages?.length) {
      return;
    }

    // Clear existing artifacts
    if ($chatId) {
      artifactActions.clearChatArtifacts($chatId);
    }

    // Process each assistant message for artifacts
    for (const [messageIndex, message] of messages.entries()) {
      if (message?.role !== 'user' && message?.content) {
        try {
          const artifacts = await artifactIntegration.processResponse(
            message.content,
            message.id || `msg_${messageIndex}`,
            $chatId || 'unknown'
          );

          // Add artifacts to the store
          artifacts.forEach(artifact => {
            artifactActions.addArtifact(artifact, $chatId || 'unknown', message.id || `msg_${messageIndex}`);
          });
        } catch (error) {
          console.error('Error processing artifacts for message:', message.id, error);
        }
      }
    }

    // Show artifact panel if artifacts were found
    const currentArtifacts = $artifactStore;
    if (currentArtifacts.length > 0) {
      artifactActions.showPanel();
      // Select the most recent artifact
      const latestArtifact = currentArtifacts[currentArtifacts.length - 1];
      artifactActions.selectArtifact(latestArtifact.id);
    }
  };

  // Handle legacy artifact code system (for Preview button functionality)
  const handleLegacyArtifactCode = (code) => {
    if (!code) {
      legacyArtifactCode = null;
      return;
    }

    // Try to detect the type of code to create a proper artifact
    let artifactType = 'text/html';
    let title = 'Code Preview';
    
    if (code.includes('import React') || code.includes('export default') || code.includes('function ')) {
      artifactType = 'application/vnd.react+jsx';
      title = 'React Component Preview';
    } else if (code.includes('<script') && code.includes('<' + '/script>')) {
      artifactType = 'text/html';
      title = 'HTML Preview';
    } else if (code.includes('<svg') || code.includes('svg')) {
      artifactType = 'image/svg+xml';
      title = 'SVG Preview';
    }

    legacyArtifactCode = {
      title,
      entryCode: code,
      type: artifactType
    };
  };

  // Subscribe to artifact store changes to sync with OpenWebUI's showArtifacts
  onMount(() => {
    unsubscribe = artifactUIState.subscribe((state) => {
      if (state.isVisible !== $showArtifacts) {
        showArtifacts.set(state.isVisible);
      }
    });

    // Also sync the other direction
    const showArtifactsUnsubscribe = showArtifacts.subscribe((visible) => {
      if (visible !== $artifactUIState.isVisible) {
        if (visible) { artifactActions.showPanel(); } else { artifactActions.hidePanel(); }
      }
    });

    // Subscribe to legacy artifact code for Preview button functionality
    artifactCodeUnsubscribe = artifactCode.subscribe((code) => {
      handleLegacyArtifactCode(code);
    });

    return () => {
      showArtifactsUnsubscribe();
    };
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (artifactCodeUnsubscribe) {
      artifactCodeUnsubscribe();
    }
  });

  // Handle close event from artifact panel
  const handleClose = () => {
    showArtifacts.set(false);
    artifactActions.hidePanel();
    // Also clear legacy artifact code
    artifactCode.set(null);
    legacyArtifactCode = null;
    dispatch('close');
  };

  // Handle artifact selection changes
  const handleArtifactChange = (event) => {
    const { artifactId } = event.detail;
    artifactActions.selectArtifact(artifactId);
  };
</script>

<div 
  class="artifact-container h-full w-full {overlay ? 'overlay-mode' : ''}"
  class:visible={$showArtifacts}
>
  {#if $showArtifacts}
    {#if $artifactStore.length > 0}
      <!-- Show PAS 3.0 artifacts -->
      <ArtifactPanel 
        on:close={handleClose}
        on:artifact-change={handleArtifactChange}
      />
    {:else if legacyArtifactCode}
      <!-- Show legacy artifact code (Preview button functionality) -->
      <div class="legacy-artifact-container h-full w-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {legacyArtifactCode.title}
          </h3>
          <button 
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            on:click={handleClose}
            title="Close preview"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-4 h-full">
          {#if legacyArtifactCode.type === 'application/vnd.react+jsx'}
            <UnifiedSandpackRenderer
              artifact={{
                type: 'react',
                title: legacyArtifactCode.title,
                entryCode: legacyArtifactCode.entryCode
              }}
            />
          {:else if legacyArtifactCode.type === 'text/html'}
            <div class="w-full h-96 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <iframe 
                srcdoc={legacyArtifactCode.entryCode}
                class="w-full h-full"
                title="HTML Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          {:else if legacyArtifactCode.type === 'image/svg+xml'}
            <div class="w-full h-96 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center bg-white">
              {@html legacyArtifactCode.entryCode}
            </div>
          {:else}
            <!-- Fallback for other code types -->
            <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg h-96 overflow-auto">
              <pre class="text-sm text-gray-800 dark:text-gray-200"><code>{legacyArtifactCode.entryCode}</code></pre>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Fallback UI when no artifacts are detected -->
      <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <div class="text-lg font-medium mb-2">
            {$i18n?.t('No artifacts found') ?? 'No artifacts found'}
          </div>
          <div class="text-sm">
            {$i18n?.t('Artifacts will appear here when generated by the AI') ?? 'Artifacts will appear here when generated by the AI'}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .artifact-container {
    transition: all 0.2s ease-in-out;
  }

  .artifact-container:not(.visible) {
    opacity: 0;
    pointer-events: none;
  }

  .artifact-container.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .overlay-mode {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
  }

  .legacy-artifact-container {
    display: flex;
    flex-direction: column;
  }
</style>
