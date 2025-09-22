<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { parseArtifactsFromContent } from '$lib/utils/artifacts/xml-artifact-parser';
import ArtifactRenderer from '$lib/components/artifacts/ArtifactRenderer.svelte';
import { showArtifacts, showControls } from '$lib/stores';

export let identifier: string;
export let type: string = 'text/html';
export let title: string = 'Untitled';
export let rawXml: string = '';

let parsedArtifact: any = null;

// Parse artifact from raw XML
$: if (rawXml && identifier && type && title) {
  console.log('🎯 [ArtifactComponent] Parsing raw XML:', rawXml.substring(0, 200) + '...');

  const result = parseArtifactsFromContent(rawXml);
  if (result.hasArtifacts && result.artifacts.length > 0) {
    parsedArtifact = result.artifacts[0];
    console.log('🎯 [ArtifactComponent] Successfully parsed artifact:', parsedArtifact);

    // Show artifact panel
    showArtifacts.set(true);
    showControls.set(true);
  } else {
    console.warn('🎯 [ArtifactComponent] Failed to parse artifact from XML');
  }
}

</script>

<div class="artifact-wrapper my-4">
  {#if parsedArtifact}
    <div class="artifact-container border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <div class="artifact-header bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {type} • {identifier}
            </p>
          </div>
          <div class="text-xs text-gray-400 dark:text-gray-500">
            Artifact
          </div>
        </div>
      </div>

      <div class="artifact-content">
        <ArtifactRenderer artifact={parsedArtifact} viewMode="preview" />
      </div>
    </div>
  {:else}
    <!-- Fallback for when artifact parsing fails -->
    <div class="artifact-fallback border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
      <div class="flex items-center gap-2 mb-2">
        <span class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md dark:bg-blue-900 dark:text-blue-200">
          Artifact
        </span>
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {type} • {identifier}
      </p>
      <div class="text-sm text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap bg-white dark:bg-gray-900 p-3 rounded border">
        {rawXml || 'No content available'}
      </div>
    </div>
  {/if}
</div>

<style>
.artifact-wrapper {
  max-width: 100%;
  overflow: hidden;
}

.artifact-container {
  width: 100%;
}

.artifact-content {
  min-height: 200px;
}

.artifact-fallback {
  border: 1px dashed #d1d5db;
}

/* Dark mode enhancements */
@media (prefers-color-scheme: dark) {
  .artifact-fallback {
    border-color: #374151;
  }
}
</style>