<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { basicReactArtifact, shadcnReactArtifact, pasteableReactJSON } from './SampleReactArtifacts.svelte';
  import { basicSvelteArtifact, shadcnSvelteArtifact, pasteableSvelteJSON } from './SampleSvelteArtifacts.svelte';
  
  const dispatch = createEventDispatcher();
  
  let selectedSample = $state('basicReact');
  
  const samples = {
    basicReact: {
      title: 'Basic React Counter',
      content: basicReactArtifact,
      description: 'Simple React counter with inline styles'
    },
    shadcnReact: {
      title: 'Shadcn React Todo App',
      content: shadcnReactArtifact,
      description: 'Modern todo app using shadcn/ui components'
    },
    dashboardReact: {
      title: 'React Dashboard (JSON)',
      content: pasteableReactJSON,
      description: 'Interactive dashboard with charts and metrics'
    },
    basicSvelte: {
      title: 'Basic Svelte Counter',
      content: basicSvelteArtifact,
      description: 'Simple Svelte counter with inline styles'
    },
    shadcnSvelte: {
      title: 'Shadcn Svelte Task Manager',
      content: shadcnSvelteArtifact,
      description: 'Task manager using shadcn-svelte components'
    },
    weatherSvelte: {
      title: 'Svelte Weather Dashboard (JSON)',
      content: pasteableSvelteJSON,
      description: 'Weather dashboard with animations'
    }
  };
  
  function copySample() {
    const content = samples[selectedSample].content;
    navigator.clipboard.writeText(content).then(() => {
      console.log('Sample copied to clipboard');
      dispatch('copied', { sample: selectedSample });
    });
  }
  
  function insertIntoChat() {
    const content = samples[selectedSample].content;
    // This would ideally dispatch to parent to insert into chat input
    dispatch('insert', { content });
  }
</script>

<div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
  <h3 class="text-lg font-semibold mb-4">Artifact Testing Samples</h3>
  
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium mb-2">Select Sample:</label>
      <select bind:value={selectedSample} class="w-full p-2 border rounded">
        {#each Object.entries(samples) as [key, sample]}
          <option value={key}>{sample.title}</option>
        {/each}
      </select>
    </div>
    
    <div class="bg-gray-50 dark:bg-gray-700 p-3 rounded">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {samples[selectedSample].description}
      </p>
    </div>
    
    <div class="flex space-x-2">
      <button 
        onclick={copySample}
        class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Copy to Clipboard
      </button>
      <button 
        onclick={insertIntoChat}
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
      >
        Insert into Chat
      </button>
    </div>
    
    <details class="text-sm">
      <summary class="cursor-pointer font-medium">Preview Sample Code</summary>
      <pre class="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs"><code>{samples[selectedSample].content}</code></pre>
    </details>
  </div>
</div>
