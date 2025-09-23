<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { DetectedArtifact } from '$lib/artifacts/detectArtifacts';
  import type { ParsedArtifact } from '$lib/utils/artifacts/xml-artifact-parser';

  export let artifact: DetectedArtifact | ParsedArtifact;
  export let height: string = '400px';
  export let width: string = '100%';
  export let showCode: boolean = false;

  const dispatch = createEventDispatcher();

  let containerElement: HTMLDivElement;
  let codeContainerElement: HTMLDivElement;
  let reactRoot: any = null;
  let codeReactRoot: any = null;
  let loading = true;
  let error: string | null = null;
  let setupAttempts = 0;
  let maxAttempts = 3;
  let isSettingUp = false;

  // Determine if this is a legacy or PAS 3.0 artifact
  const isLegacyArtifact = (art: any): art is DetectedArtifact => {
    return 'entryCode' in art || 'content' in art;
  };

  const setupSandpack = async () => {
    if (!browser || !containerElement || isSettingUp) return;

    try {
      isSettingUp = true;
      setupAttempts++;
      loading = true;
      error = null;

      console.log(`🎨 [Unified Renderer] Setup attempt ${setupAttempts} for artifact:`,
        isLegacyArtifact(artifact) ? artifact.type : artifact.type);

      // Import React dependencies
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');

      // Clean up previous instances
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }

      if (codeReactRoot) {
        codeReactRoot.unmount();
        codeReactRoot = null;
      }

      // Clear containers
      containerElement.innerHTML = '';
      if (codeContainerElement) {
        codeContainerElement.innerHTML = '';
      }

      // Generate Sandpack configuration based on artifact type
      const sandpackConfig = generateSandpackConfig(artifact);
      if (!sandpackConfig) {
        throw new Error('Unable to generate Sandpack configuration for this artifact type');
      }

      console.log('🎨 [Unified Renderer] Generated config:', {
        template: sandpackConfig.template,
        fileCount: Object.keys(sandpackConfig.files).length,
        dependencyCount: Object.keys(sandpackConfig.dependencies).length
      });

      // Import Sandpack components
      const { Sandpack, SandpackProvider, SandpackLayout, SandpackCodeEditor } =
        await import('@codesandbox/sandpack-react');

      // Create main preview element
      const sandpackElement = React.createElement(Sandpack, {
        template: sandpackConfig.template,
        files: sandpackConfig.files,
        options: {
          showConsole: false,
          showRefreshButton: true,
          autoReload: true,
          recompileMode: 'delayed',
          recompileDelay: 500,
          showNavigator: false,
          showTabs: showCode,
          showLineNumbers: true,
          editorHeight: showCode ? '40%' : 0,
          editorWidthPercentage: showCode ? 50 : 0
        },
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        customSetup: {
          dependencies: sandpackConfig.dependencies
        }
      });

      // Render main preview
      reactRoot = createRoot(containerElement);
      reactRoot.render(sandpackElement);

      // Render separate code editor if requested
      if (showCode && codeContainerElement) {
        const codeEditorElement = React.createElement(
          SandpackProvider,
          {
            template: sandpackConfig.template,
            files: sandpackConfig.files,
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            customSetup: {
              dependencies: sandpackConfig.dependencies
            }
          },
          React.createElement(
            SandpackLayout,
            {},
            React.createElement(SandpackCodeEditor, {
              showTabs: true,
              showLineNumbers: true,
              showInlineErrors: true,
              wrapContent: true,
              closableTabs: false
            })
          )
        );

        codeReactRoot = createRoot(codeContainerElement);
        codeReactRoot.render(codeEditorElement);
      }

      // Wait for Sandpack to be ready using multiple strategies
      let isReady = false;
      let timeoutId: NodeJS.Timeout;

      // Strategy 1: Listen for iframe load event
      const checkForIframe = () => {
        const iframe = containerElement.querySelector('iframe');
        if (iframe && !isReady) {
          iframe.onload = () => {
            if (!isReady) {
              isReady = true;
              clearTimeout(timeoutId);
              loading = false;
              isSettingUp = false;
              dispatch('load', { artifact, template: sandpackConfig.template });
            }
          };

          // If iframe is already loaded
          if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            if (!isReady) {
              isReady = true;
              clearTimeout(timeoutId);
              loading = false;
              isSettingUp = false;
              dispatch('load', { artifact, template: sandpackConfig.template });
            }
          }
        }
      };

      // Strategy 2: Check periodically for Sandpack elements
      const checkForSandpackReady = () => {
        const sandpackWrapper = containerElement.querySelector('.sp-wrapper');
        const sandpackPreview = containerElement.querySelector('.sp-preview-container');

        if (sandpackWrapper && sandpackPreview && !isReady) {
          setTimeout(() => {
            if (!isReady) {
              isReady = true;
              clearTimeout(timeoutId);
              loading = false;
              isSettingUp = false;
              dispatch('load', { artifact, template: sandpackConfig.template });
            }
          }, 500);
        }
      };

      // Start checking for readiness
      const readinessInterval = setInterval(() => {
        checkForIframe();
        checkForSandpackReady();

        if (isReady) {
          clearInterval(readinessInterval);
        }
      }, 100);

      // Strategy 3: Fallback timeout
      timeoutId = setTimeout(() => {
        if (!isReady) {
          isReady = true;
          clearInterval(readinessInterval);

          // Check if Sandpack elements exist at least
          const sandpackWrapper = containerElement.querySelector('.sp-wrapper');
          if (sandpackWrapper) {
            loading = false;
            isSettingUp = false;
            dispatch('load', { artifact, template: sandpackConfig.template });
          } else if (setupAttempts < maxAttempts) {
            // Retry setup if no Sandpack elements found
            console.warn('🎨 [Unified Renderer] Sandpack setup incomplete, retrying...');
            isSettingUp = false; // Reset flag before retry
            setTimeout(() => setupSandpack(), 1000);
            return;
          } else {
            // Give up after max attempts
            error = 'Preview took too long to load. The component may have errors or dependency issues.';
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
          }
        }
      }, 8000); // 8 second timeout

      // Clean up interval after 10 seconds regardless
      setTimeout(() => {
        clearInterval(readinessInterval);
      }, 10000);

    } catch (err) {
      console.error('🎨 [Unified Renderer] Sandpack setup failed:', err);
      error = `Failed to setup preview: ${err instanceof Error ? err.message : 'Unknown error'}`;
      loading = false;
      isSettingUp = false;
      dispatch('error', { message: error, error: err, artifact });
    }
  };

  /**
   * Generate Sandpack configuration from artifact
   */
  function generateSandpackConfig(artifact: DetectedArtifact | ParsedArtifact) {
    if (isLegacyArtifact(artifact)) {
      return generateLegacySandpackConfig(artifact);
    } else {
      return generatePAS3SandpackConfig(artifact);
    }
  }

  /**
   * Generate Sandpack config for legacy artifacts
   */
  function generateLegacySandpackConfig(artifact: DetectedArtifact) {
    if (artifact.type === 'react') {
      const isTypeScript = artifact.entryCode.includes('tsx') || artifact.entryCode.includes('interface') || artifact.entryCode.includes('type ');

      let files: Record<string, { code: string }> = {
        [`/App.${isTypeScript ? 'tsx' : 'jsx'}`]: {
          code: artifact.entryCode
        },
        "/index.js": {
          code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
${artifact.css ? 'import "./styles.css";' : ''}

const root = createRoot(document.getElementById("root"));
root.render(<App />);`
        }
      };

      // Add extra files
      if (artifact.extraFiles) {
        Object.entries(artifact.extraFiles).forEach(([path, content]) => {
          const normalizedPath = path.startsWith('/') ? path : `/${path}`;
          files[normalizedPath] = { code: content };
        });
      }

      // Add CSS
      if (artifact.css) {
        files["/styles.css"] = { code: artifact.css };
      }

      const baseDependencies = {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        ...(isTypeScript ? { "@types/react": "^18.0.0", "@types/react-dom": "^18.0.0" } : {})
      };

      return {
        template: isTypeScript ? 'react-ts' : 'react',
        files,
        dependencies: {
          ...baseDependencies,
          ...(artifact.dependencies || {})
        }
      };
    } else if (artifact.type === 'svelte') {
      return {
        template: 'svelte',
        files: {
          "/App.svelte": { code: artifact.entryCode },
          "/main.js": {
            code: `import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;`
          },
          ...(artifact.css ? { "/global.css": { code: artifact.css } } : {}),
          ...(artifact.extraFiles ? Object.fromEntries(
            Object.entries(artifact.extraFiles).map(([path, content]) => [
              path.startsWith('/') ? path : `/${path}`,
              { code: content }
            ])
          ) : {})
        },
        dependencies: {
          svelte: "^4.0.0",
          ...(artifact.dependencies || {})
        }
      };
    } else if (artifact.type === 'html') {
      return {
        template: 'static',
        files: {
          "/index.html": { code: artifact.content },
          "/package.json": {
            code: JSON.stringify({
              name: "html-artifact",
              version: "1.0.0",
              main: "index.html"
            })
          }
        },
        dependencies: {}
      };
    }

    return null;
  }

  /**
   * Generate Sandpack config for PAS 3.0 artifacts
   */
  function generatePAS3SandpackConfig(artifact: ParsedArtifact) {
    const files: Record<string, { code: string }> = {};

    // Convert artifact files
    artifact.files.forEach(file => {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
      files[path] = { code: file.content };
    });

    // Determine template based on type
    let template = 'static';
    let baseDependencies: Record<string, string> = {};

    if (artifact.type === 'application/vnd.react+tsx') {
      template = 'react-ts';
      baseDependencies = {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "@types/react": "^18.0.0",
        "@types/react-dom": "^18.0.0"
      };

      // Add index file if not present
      if (!files['/index.tsx'] && !files['/index.js']) {
        files['/index.tsx'] = {
          code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);`
        };
      }
    } else if (artifact.type === 'application/vnd.react+jsx') {
      template = 'react';
      baseDependencies = {
        react: "^18.2.0",
        "react-dom": "^18.2.0"
      };

      // Add index file if not present
      if (!files['/index.jsx'] && !files['/index.js']) {
        files['/index.js'] = {
          code: `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);`
        };
      }
    } else if (artifact.type === 'application/vnd.svelte' || artifact.type === 'application/vnd.svelte+ts') {
      template = 'svelte';
      baseDependencies = {
        svelte: "^4.0.0"
      };

      // Add main file if not present
      if (!files['/main.js']) {
        files['/main.js'] = {
          code: `import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;`
        };
      }
    } else if (artifact.type === 'text/html') {
      template = 'static';
      // HTML files are already included from artifact.files
    }

    // Combine dependencies
    const dependencies: Record<string, string> = {
      ...baseDependencies
    };

    artifact.dependencies.forEach(dep => {
      dependencies[dep.name] = dep.version;
    });

    return {
      template,
      files,
      dependencies
    };
  }

  // Reactive updates - with guards to prevent infinite loops
  let lastArtifactId: string | undefined;
  let lastShowCode: boolean | undefined;

  $: if (browser && artifact && !loading) {
    const currentArtifactId = isLegacyArtifact(artifact)
      ? `${artifact.type}-${artifact.entryCode?.substring(0, 50)}`
      : `${artifact.type}-${artifact.identifier}`;

    // Only setup if artifact actually changed
    if (currentArtifactId !== lastArtifactId) {
      lastArtifactId = currentArtifactId;
      setupAttempts = 0;
      setupSandpack();
    }
  }

  $: if (browser && containerElement && showCode !== lastShowCode && !loading) {
    // Only re-setup when showCode actually changes, not on initial mount
    if (lastShowCode !== undefined) {
      lastShowCode = showCode;
      setTimeout(() => setupSandpack(), 100);
    } else {
      lastShowCode = showCode;
    }
  }

  onMount(() => {
    if (browser) {
      // Initialize tracking variables
      lastShowCode = showCode;
      if (artifact) {
        lastArtifactId = isLegacyArtifact(artifact)
          ? `${artifact.type}-${artifact.entryCode?.substring(0, 50)}`
          : `${artifact.type}-${artifact.identifier}`;
      }
      setupSandpack();
    }
  });

  onDestroy(() => {
    isSettingUp = false; // Reset flag on cleanup

    if (reactRoot) {
      try {
        reactRoot.unmount();
      } catch (err) {
        console.warn('🎨 [Unified Renderer] Error unmounting Sandpack:', err);
      }
      reactRoot = null;
    }

    if (codeReactRoot) {
      try {
        codeReactRoot.unmount();
      } catch (err) {
        console.warn('🎨 [Unified Renderer] Error unmounting code editor:', err);
      }
      codeReactRoot = null;
    }
  });
</script>

<div class="unified-sandpack-renderer" style="height: {height}; width: {width};">
  {#if loading}
    <div class="loading-container">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">Setting up interactive preview...</p>
        <div class="loading-steps">
          <div class="step">Loading Sandpack runtime</div>
          <div class="step">Analyzing artifact structure</div>
          <div class="step">Generating configuration</div>
          <div class="step">Starting bundler</div>
          {#if setupAttempts > 1}
            <div class="step retry-step">Retrying setup (attempt {setupAttempts})</div>
          {/if}
        </div>
      </div>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="error-icon">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 class="error-title">Preview Failed</h3>
      <p class="error-message">{error}</p>
      <details class="error-details">
        <summary>Troubleshooting</summary>
        <ul>
          <li>Check if the code is valid {isLegacyArtifact(artifact) ? artifact.type : artifact.type}</li>
          <li>Ensure all components are properly exported</li>
          <li>Verify import statements are correct</li>
          <li>Check browser console for additional errors</li>
          <li>Try refreshing the page</li>
        </ul>
      </details>
      <button
        class="retry-button"
        on:click={() => {
          setupAttempts = 0;
          setupSandpack();
        }}
      >
        Retry Preview
      </button>
    </div>
  {/if}

  <!-- Main Preview Container -->
  <div
    bind:this={containerElement}
    class="preview-container"
    class:visible={!loading && !error}
    class:split-view={showCode}
  >
    <!-- Sandpack preview renders here -->
  </div>

  <!-- Code Editor Container (when showCode is true) -->
  {#if showCode}
    <div
      bind:this={codeContainerElement}
      class="code-container"
      class:visible={!loading && !error}
    >
      <!-- Sandpack code editor renders here -->
    </div>
  {/if}
</div>

<style>
  .unified-sandpack-renderer {
    display: flex;
    flex-direction: column;
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: var(--color-gray-50, #f9fafb);
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: var(--color-gray-50, #f9fafb);
  }

  .loading-content {
    text-align: center;
    max-width: 300px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--color-gray-300, #d1d5db);
    border-top: 3px solid var(--color-blue-500, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  .loading-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-gray-900, #111827);
    margin: 0 0 16px 0;
  }

  .loading-steps {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .step {
    font-size: 12px;
    color: var(--color-gray-600, #4b5563);
    opacity: 0.7;
    animation: fadeIn 2s ease-in-out infinite alternate;
  }

  .retry-step {
    color: var(--color-orange-600, #ea580c);
    font-weight: 500;
  }

  .step:nth-child(2) { animation-delay: 0.5s; }
  .step:nth-child(3) { animation-delay: 1s; }
  .step:nth-child(4) { animation-delay: 1.5s; }
  .step:nth-child(5) { animation-delay: 2s; }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    0% { opacity: 0.3; }
    100% { opacity: 1; }
  }

  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 40px 20px;
    text-align: center;
    background: var(--color-red-50, #fef2f2);
    color: var(--color-red-800, #991b1b);
  }

  .error-icon {
    color: var(--color-red-500, #ef4444);
    margin-bottom: 16px;
  }

  .error-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .error-message {
    font-size: 14px;
    margin: 0 0 20px 0;
    max-width: 500px;
    line-height: 1.5;
  }

  .error-details {
    margin-top: 16px;
    text-align: left;
    max-width: 400px;
  }

  .error-details summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .error-details ul {
    margin: 8px 0 0 20px;
    font-size: 13px;
    line-height: 1.4;
  }

  .error-details li {
    margin-bottom: 4px;
  }

  .retry-button {
    margin-top: 16px;
    padding: 8px 16px;
    background: var(--color-red-600, #dc2626);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .retry-button:hover {
    background: var(--color-red-700, #b91c1c);
  }

  .preview-container {
    flex: 1;
    width: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .preview-container.visible {
    opacity: 1;
  }

  .preview-container.split-view {
    height: 60%;
  }

  .code-container {
    height: 40%;
    width: 100%;
    opacity: 0;
    transition: opacity 0.3s ease;
    border-top: 1px solid var(--color-gray-200, #e5e7eb);
  }

  .code-container.visible {
    opacity: 1;
  }

  /* Sandpack customization */
  :global(.sp-wrapper) {
    height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
  }

  :global(.sp-layout) {
    height: 100% !important;
    border-radius: 0 !important;
  }

  :global(.sp-stack) {
    height: 100% !important;
  }

  :global(.sp-preview) {
    border-radius: 0 !important;
    height: 100% !important;
  }

  :global(.sp-preview-container) {
    height: 100% !important;
  }

  :global(.sp-preview-iframe) {
    height: 100% !important;
  }

  /* Hide editor when showCode is false */
  .preview-container:not(.split-view) :global(.sp-editor) {
    display: none !important;
  }

  /* Dark mode support */
  :global(.dark) .unified-sandpack-renderer {
    background: var(--color-gray-800, #1f2937);
  }

  :global(.dark) .loading-container {
    background: var(--color-gray-800, #1f2937);
  }

  :global(.dark) .loading-text {
    color: var(--color-gray-100, #f3f4f6);
  }

  :global(.dark) .step {
    color: var(--color-gray-400, #9ca3af);
  }

  :global(.dark) .error-container {
    background: var(--color-red-900, #7f1d1d);
    color: var(--color-red-100, #fecaca);
  }

  :global(.dark) .code-container {
    border-color: var(--color-gray-700, #374151);
  }
</style>