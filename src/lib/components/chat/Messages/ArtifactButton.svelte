<!--
  Artifact Button Component

  Displays an "Open Artifact" button for messages that contain artifacts.
  This provides manual access to the preview panel even if auto-open is disabled.
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { artifactSubscriptions } from '$lib/artifacts/ArtifactChannel';

  export let messageId: string;
  export let variant: 'default' | 'compact' = 'default';

  const dispatch = createEventDispatcher();

  let hasArtifacts = false;
  let artifactCount = 0;

  // Subscribe to artifact events for this message
  const unsubscribeArtifacts = artifactSubscriptions.onArtifact((event) => {
    if (event.messageId === messageId) {
      hasArtifacts = true;
      artifactCount++;
    }
  });

  // Subscribe to stream complete to get final count
  const unsubscribeComplete = artifactSubscriptions.onStreamComplete((event) => {
    if (event.messageId === messageId) {
      artifactCount = event.artifactCount;
      hasArtifacts = event.artifactCount > 0;
    }
  });

  // Cleanup subscriptions
  import { onDestroy } from 'svelte';
  onDestroy(() => {
    unsubscribeArtifacts();
    unsubscribeComplete();
  });

  async function handleClick() {
    try {
      console.log('🔘 [ArtifactButton] Opening preview for message:', messageId.substring(0, 8));

      // Import preview actions and open panel
      const { previewActions } = await import('$lib/stores/preview/preview-store');

      // Get the message content to analyze for artifacts
      // Note: In a full implementation, we might want to pass the content as a prop
      // For now, we'll trigger a generic preview
      previewActions.show('// Artifact content will load here...', {
        title: `Artifact${artifactCount > 1 ? 's' : ''} (${artifactCount})`,
        type: 'react'
      });

      dispatch('open', { messageId });

    } catch (error) {
      console.error('Error opening artifact preview:', error);
    }
  }
</script>

{#if hasArtifacts}
  <button
    class="artifact-button"
    class:compact={variant === 'compact'}
    on:click={handleClick}
    title="Open artifact preview"
  >
    <svg
      class="icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <path d="M9 9h6v6H9z"/>
    </svg>

    {#if variant === 'default'}
      <span class="button-text">
        Open Artifact{artifactCount > 1 ? 's' : ''}
        {#if artifactCount > 1}<span class="count">({artifactCount})</span>{/if}
      </span>
    {/if}
  </button>
{/if}

<style>
  .artifact-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .artifact-button:hover {
    background: var(--primary-hover, #2563eb);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .artifact-button.compact {
    padding: 4px 6px;
    border-radius: 4px;
  }

  .icon {
    flex-shrink: 0;
  }

  .button-text {
    white-space: nowrap;
  }

  .count {
    opacity: 0.9;
    font-weight: 400;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .artifact-button {
      background: var(--primary-dark, #1e40af);
    }

    .artifact-button:hover {
      background: var(--primary-hover-dark, #1d4ed8);
    }
  }

  /* Animation for when button appears */
  .artifact-button {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>