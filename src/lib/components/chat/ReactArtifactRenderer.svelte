<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { applyShadcnReactPreset } from '$lib/artifacts/presets';
  
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

  // Environment variables - commented out to use default Sandpack bundler
  // const BUNDLER_URL = "https://preview.prometheusags.ai";

  const setupSandpack = async () => {
    if (!browser || !sandpackContainer) return;

    try {
      // Import sandpack client
      const { createSandpackClient } = await import('@codesandbox/sandpack-client');
      
      let files: Record<string, { code: string }> = {
        "/index.tsx": {
          code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
${artifact.useShadcn ? 'import "./globals.css";' : ''}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);`
        },
        "/App.tsx": { code: artifact.entryCode },
        "/package.json": {
          code: JSON.stringify({
            dependencies: {
              react: "^18.2.0",
              "react-dom": "^18.2.0",
              "@types/react": "^18.0.0",
              "@types/react-dom": "^18.0.0",
              ...(artifact.dependencies || {})
            },
            main: "/index.tsx"
          }, null, 2)
        }
      };

      // Apply Shadcn-ui preset if requested
      if (artifact.useShadcn) {
        files = applyShadcnReactPreset(files);
      }

      // Add extra files if provided (this will override preset files if same path)
      if (artifact.extraFiles) {
        Object.entries(artifact.extraFiles).forEach(([path, content]) => {
          files[path] = { code: content };
        });
      }

      // Add CSS if provided
      if (artifact.css && !artifact.useShadcn) {
        files["/styles.css"] = { code: artifact.css };
        files["/index.tsx"].code = files["/index.tsx"].code.replace(
          'import App from "./App";',
          'import App from "./App";\nimport "./styles.css";'
        );
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
        template: 'react-ts',
        customSetup: {
          dependencies: files["/package.json"].code ? JSON.parse(files["/package.json"].code).dependencies : {}
        }
      }, {
        // bundlerURL: BUNDLER_URL, // Commented out to use default Sandpack bundler
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
      error = 'Failed to load React preview';
      loading = false;
      
      // Fallback display
      sandpackContainer.innerHTML = `
        <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold mb-2">${artifact.title || 'React Artifact'}</h3>
          <p class="text-red-500 mb-2">Preview unavailable - Sandpack failed to load</p>
          <details class="text-sm">
            <summary class="cursor-pointer text-gray-700 dark:text-gray-300 font-medium">View React code</summary>
            <pre class="mt-2 bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-auto text-xs"><code>${artifact.entryCode}</code></pre>
          </details>
        </div>
      `;
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
        <p class="text-sm text-gray-600 dark:text-gray-400">Loading React preview...</p>
      </div>
    </div>
  {:else if error}
    <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
      <h3 class="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
        {artifact.title || 'React Artifact'}
      </h3>
      <p class="text-red-600 dark:text-red-400 mb-2">{error}</p>
      <details class="text-sm">
        <summary class="cursor-pointer text-red-700 dark:text-red-300 font-medium">View React code</summary>
        <pre class="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto text-xs"><code>{artifact.entryCode}</code></pre>
      </details>
    </div>
  {/if}

  <div bind:this={sandpackContainer} class="w-full h-full">
    <!-- Sandpack will be rendered here -->
  </div>
</div>
