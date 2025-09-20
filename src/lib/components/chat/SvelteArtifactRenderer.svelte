<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { applyShadcnSveltePreset } from '$lib/artifacts/presets';
  import { createSvelteHtmlTemplate } from '$lib/utils/artifacts/htmlTemplate';
  
  export let artifact: {
    title?: string;
    entryCode: string;
    css?: string;
    extraFiles?: Record<string, string>;
    dependencies?: Record<string, string>;
    useShadcn?: boolean;
  };

  let sandpackContainer: HTMLDivElement;
  let sandpackClient: any = null;
  let loading = true;
  let error: string | null = null;

  // Environment variables
  const BUNDLER_URL = "https://preview.prometheusags.ai";

  const setupSandpack = async () => {
    if (!browser || !sandpackContainer) return;

    try {
      // Import sandpack client
      const { createSandpackClient } = await import('@codesandbox/sandpack-client');
      
      const title = artifact.title ?? "Svelte Artifact";
      const cssContent = artifact.css || "";
      
      let files: Record<string, { code: string }> = {
        "/index.html": {
          code: createSvelteHtmlTemplate(title, cssContent)
        },
        "/main.js": {
          code: "import App from \"./App.svelte\";\nconst app = new App({ target: document.getElementById(\"app\") });\nexport default app;"
        },
        "/App.svelte": { code: artifact.entryCode },
        "/package.json": {
          code: JSON.stringify({
            dependencies: {
              "svelte": "^4.2.0",
              ...(artifact.dependencies || {})
            },
            main: "/main.js"
          }, null, 2)
        }
      };

      let dependencies = {
        "svelte": "^4.2.0",
        ...(artifact.dependencies || {})
      };

      // Add extra files if provided
      if (artifact.extraFiles) {
        Object.entries(artifact.extraFiles).forEach(([path, content]) => {
          files[path] = { code: content };
        });
      }

      // Apply Shadcn-svelte preset if requested
      if (artifact.useShadcn) {
        const presetResult = applyShadcnSveltePreset({
          files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.code])),
          dependencies
        });
        
        files = Object.fromEntries(
          Object.entries(presetResult.files).map(([k, v]) => [k, { code: v }])
        );
        dependencies = presetResult.dependencies;

        // Update package.json with new dependencies
        files["/package.json"] = {
          code: JSON.stringify({
            dependencies,
            main: "/main.js"
          }, null, 2)
        };
      }

      // Create iframe for preview
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '400px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      sandpackContainer.innerHTML = '';
      sandpackContainer.appendChild(iframe);

      // Create sandpack client
      sandpackClient = createSandpackClient(iframe, {
        files,
        template: 'svelte',
        customSetup: {
          dependencies
        }
      }, {
        bundlerURL: BUNDLER_URL,
        startRoute: '/',
        showOpenInCodeSandbox: false
      });

      sandpackClient.listen((message: any) => {
        if (message.type === 'done' && !message.compilationError) {
          loading = false;
          error = null;
        } else if (message.type === 'action' && message.action === 'show-error') {
          error = message.message || 'Compilation error';
          loading = false;
        }
      });

      loading = false;

    } catch (err) {
      console.error('Failed to load Sandpack:', err);
      error = 'Failed to load Svelte preview';
      loading = false;
      
      // Fallback display
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg';
      fallbackDiv.innerHTML = `
        <h3 class="text-lg font-semibold mb-2">${artifact.title || 'Svelte Artifact'}</h3>
        <p class="text-red-500 mb-2">Preview unavailable - Sandpack failed to load</p>
        <details class="text-sm">
          <summary class="cursor-pointer text-gray-700 dark:text-gray-300 font-medium">View Svelte code</summary>
          <pre class="mt-2 bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-auto text-xs"><code>${artifact.entryCode}</code></pre>
        </details>
      `;
      
      sandpackContainer.innerHTML = '';
      sandpackContainer.appendChild(fallbackDiv);
    }
  };

  onMount(() => {
    if (browser) {
      setupSandpack();
    }
  });

  onDestroy(() => {
    if (sandpackClient) {
      try {
        sandpackClient.destroy();
      } catch (err) {
        console.warn('Error destroying sandpack client:', err);
      }
    }
  });
</script>

<div class="w-full h-full relative">
  {#if loading}
    <div class="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading Svelte preview...</p>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
        {artifact.title || 'Svelte Artifact'}
      </h3>
      <p class="text-red-600 dark:text-red-400 mb-2">{error}</p>
      <details class="text-sm">
        <summary class="cursor-pointer text-red-700 dark:text-red-300 font-medium">View Svelte code</summary>
        <pre class="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs"><code>{artifact.entryCode}</code></pre>
      </details>
    </div>
  {/if}

  <div bind:this={sandpackContainer} class="w-full h-full">
    <!-- Sandpack will be rendered here -->
  </div>
</div>
