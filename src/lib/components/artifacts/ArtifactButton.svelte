<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { artifactStore, artifactUIState, artifactActions } from '$lib/stores/artifacts/artifact-store';
  import { artifactIntegration, hasArtifactInMessage } from '$lib/utils/artifacts/integration';
  import { showArtifacts, showControls } from '$lib/stores';

  export let messageContent: string = '';
  export let messageId: string;
  export let style: 'default' | 'minimal' | 'icon-only' = 'default';
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const dispatch = createEventDispatcher();

  // Check if this message has artifacts
  $: hasArtifacts = messageContent ? hasArtifactInMessage(messageContent) : false;
  $: artifactCount = hasArtifacts ? getArtifactCount() : 0;

  function getArtifactCount(): number {
    try {
      const artifacts = artifactIntegration.processResponse(messageContent, messageId);
      return artifacts.length;
    } catch (error) {
      return 0;
    }
  }

  function handleClick() {
    if (!hasArtifacts) return;

    try {
      // Process and add artifacts to store
      const artifacts = artifactIntegration.processResponse(messageContent, messageId);
      
      // Artifacts are already added to store by processResponse
      // No need to add them again

      // Show artifact panel
      artifactActions.showPanel();
      showArtifacts.set(true);
      showControls.set(true);

      // Select the first artifact
      if (artifacts.length > 0) {
        artifactActions.selectArtifact(artifacts[0].artifact.identifier);
      }

      dispatch('click', { messageId, artifacts });
    } catch (error) {
      console.error('Error handling artifact button click:', error);
    }
  }

  function getButtonText(): string {
    if (style === 'icon-only') return '';
    if (style === 'minimal') return artifactCount > 1 ? `${artifactCount} artifacts` : 'artifact';
    return artifactCount > 1 ? `View ${artifactCount} artifacts` : 'View artifact';
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
</script>

{#if hasArtifacts}
  <button
    class="artifact-button inline-flex items-center gap-1.5 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
           {sizeClasses}
           {style === 'minimal' 
             ? 'text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400' 
             : 'bg-blue-100 text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30'}"
    on:click={handleClick}
    title="View interactive artifacts"
    aria-label={`View ${artifactCount > 1 ? artifactCount + ' artifacts' : 'artifact'}`}
  >
    <!-- Artifact Icon -->
    <svg 
      class="artifact-icon {iconSizeClasses}" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>

    <!-- Button text (if not icon-only) -->
    {#if style !== 'icon-only'}
      <span class="artifact-text">{getButtonText()}</span>
    {/if}

    <!-- Badge for multiple artifacts -->
    {#if artifactCount > 1}
      <span class="artifact-count-badge inline-flex items-center justify-center min-w-[1.25rem] h-5 text-xs font-medium text-white bg-blue-600 rounded-full px-1">
        {artifactCount}
      </span>
    {/if}
  </button>
{/if}

<style>
  .artifact-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .artifact-count-badge {
    font-size: 0.625rem;
    line-height: 1;
  }

  .artifact-icon {
    flex-shrink: 0;
  }

  .artifact-text {
    white-space: nowrap;
  }
</style>
