<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import type { DetectedArtifact } from '$lib/artifacts/detectArtifacts';
  import type { ParsedArtifact } from '$lib/utils/artifacts/xml-artifact-parser';
  import { RendererStateMachine } from '$lib/services/renderer-state-machine';
  import type { RendererState } from '$lib/services/renderer-state-machine';

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
  let abortController: AbortController | null = null;

  // State machine integration
  let stateMachine: RendererStateMachine;
  let currentState: RendererState = 'idle';
  let stateUnsubscribe: (() => void) | null = null;

  // Determine if this is a legacy or PAS 3.0 artifact
  const isLegacyArtifact = (art: any): art is DetectedArtifact => {
    return 'entryCode' in art || 'content' in art;
  };

  const setupSandpack = async (): Promise<void> => {
    if (!browser || !containerElement || isSettingUp) return;

    // Abort any previous setup
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    try {
      isSettingUp = true;
      setupAttempts++;
      loading = true;
      error = null;

      // Check if aborted
      if (signal.aborted) return;

      // Initialize state machine if not already done
      if (!stateMachine) {
        const artifactType = isLegacyArtifact(artifact) ? artifact.type : artifact.type;
        const componentId = `unified-renderer-${Math.random().toString(36).substr(2, 9)}`;
        stateMachine = new RendererStateMachine(componentId, artifactType);

        // Subscribe to state changes
        stateUnsubscribe = stateMachine.onStateChange((newState, context) => {
          currentState = newState;
          loading = !['ready', 'error', 'timeout'].includes(newState);

          // Update component state based on state machine
          if (newState === 'error' || newState === 'timeout') {
            error = context.error || 'Unknown error occurred';
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
          } else if (newState === 'ready') {
            loading = false;
            isSettingUp = false;
            dispatch('load', { artifact, template: 'sandpack' });
          }
        });
      }

      // Start the state machine
      stateMachine.send('START');

      console.log(`🎨 [Unified Renderer] Setup attempt ${setupAttempts} for artifact:`,
        isLegacyArtifact(artifact) ? artifact.type : artifact.type);

      // State: Loading dependencies
      stateMachine.send('DEPENDENCIES_LOADED');

      // Check if aborted before async operations
      if (signal.aborted) return;

      // Import React dependencies
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');

      // Check if aborted after imports
      if (signal.aborted) return;

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

      // State: Configuring sandbox
      stateMachine.send('CONFIG_READY');

      // Generate Sandpack configuration based on artifact type
      const sandpackConfig = generateSandpackConfig(artifact);
      if (!sandpackConfig) {
        stateMachine.send('ERROR', 'Unable to generate Sandpack configuration for this artifact type');
        return;
      }

      console.log('🎨 [Unified Renderer] Generated config:', {
        template: sandpackConfig.template,
        fileCount: Object.keys(sandpackConfig.files).length,
        dependencyCount: Object.keys(sandpackConfig.dependencies).length
      });

      // Check if aborted before Sandpack import
      if (signal.aborted) return;

      // Import Sandpack components
      const { Sandpack, SandpackProvider, SandpackLayout, SandpackCodeEditor } =
        await import('@codesandbox/sandpack-react');

      // Check if aborted after Sandpack import
      if (signal.aborted) return;

      // State: Mounting components
      stateMachine.send('MOUNTED');

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

      // Enhanced timeout configuration for different phases
      let isReady = false;
      let timeoutId: NodeJS.Timeout;
      let currentPhase = 'initialization';
      let phaseStartTime = Date.now();

      const phaseTimeouts = {
        initialization: 3000,  // 3s for initial setup
        iframeLoad: 8000,      // 8s for iframe loading
        contentReady: 15000,   // 15s total for content readiness
        fallbackMax: 25000     // 25s absolute maximum
      };

      // State: Bundling code
      stateMachine.send('BUNDLED');

      const completeSetup = (reason: string) => {
        if (!isReady) {
          isReady = true;
          clearTimeout(timeoutId);
          console.log(`✅ [Unified Renderer] Setup completed: ${reason}`);

          // State: Rendering complete
          stateMachine.send('RENDERED');
        }
      };

      // Strategy 1: Listen for iframe load event with enhanced error detection
      const checkForIframe = () => {
        const iframe = containerElement.querySelector('iframe');
        if (iframe && !isReady) {
          currentPhase = 'iframeLoad';

          iframe.onload = () => {
            currentPhase = 'contentReady';
            completeSetup('iframe loaded');
          };

          iframe.onerror = (err) => {
            console.error('🔴 [Unified Renderer] Iframe load error:', err);
            if (setupAttempts < maxAttempts) {
              console.warn('🔄 [Unified Renderer] Retrying due to iframe error...');
              isSettingUp = false;
              stateMachine.send('RETRY');
              setTimeout(() => setupSandpack(), 1500);
            } else {
              const errorMsg = 'Preview iframe failed to load. This may be due to CSP restrictions or network issues.';
              stateMachine.send('ERROR', errorMsg);
            }
          };

          // If iframe is already loaded
          if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            currentPhase = 'contentReady';
            completeSetup('iframe already loaded');
          }
        }
      };

      // Strategy 2: Check for Sandpack elements with better error detection
      const checkForSandpackReady = () => {
        const sandpackWrapper = containerElement.querySelector('.sp-wrapper');
        const sandpackPreview = containerElement.querySelector('.sp-preview-container');
        const sandpackError = containerElement.querySelector('.sp-error, .sp-console-error');

        // Check for errors first
        if (sandpackError && !isReady) {
          const errorText = sandpackError.textContent || 'Unknown Sandpack error';
          console.error('🔴 [Unified Renderer] Sandpack error detected:', errorText);

          if (setupAttempts < maxAttempts) {
            console.warn('🔄 [Unified Renderer] Retrying due to Sandpack error...');
            isSettingUp = false;
            setTimeout(() => setupSandpack(), 2000);
          } else {
            error = `Preview error: ${errorText}`;
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
          }
          return true; // Error handled
        }

        if (sandpackWrapper && sandpackPreview && !isReady) {
          currentPhase = 'contentReady';
          // Give it a moment to fully render before marking as ready
          setTimeout(() => {
            if (!isReady) {
              completeSetup('Sandpack elements detected');
            }
          }, 300);
        }

        return false; // No error
      };

      // Strategy 3: Network and bundling timeout detection
      const checkForNetworkIssues = () => {
        const loadingIndicators = containerElement.querySelectorAll('.sp-loading, .sp-spinner');
        const networkError = containerElement.querySelector('.sp-network-error');

        if (networkError) {
          console.error('🔴 [Unified Renderer] Network error detected');
          if (setupAttempts < maxAttempts) {
            isSettingUp = false;
            setTimeout(() => setupSandpack(), 3000);
          } else {
            error = 'Network error loading preview. Check your internet connection.';
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
          }
          return true;
        }

        return false;
      };

      // Start enhanced readiness polling
      const readinessInterval = setInterval(() => {
        const elapsed = Date.now() - phaseStartTime;

        // Check for completion or errors
        if (isReady) {
          clearInterval(readinessInterval);
          return;
        }

        // Check strategies in order
        checkForIframe();
        if (checkForSandpackReady()) return; // Error handled, stop polling
        if (checkForNetworkIssues()) return; // Error handled, stop polling

        // Phase-specific timeout handling
        const currentTimeout = phaseTimeouts[currentPhase] || phaseTimeouts.fallbackMax;

        if (elapsed > currentTimeout) {
          console.warn(`⏰ [Unified Renderer] Phase timeout: ${currentPhase} after ${elapsed}ms`);

          // Try to move to next phase or retry
          if (currentPhase === 'initialization' && elapsed < phaseTimeouts.iframeLoad) {
            currentPhase = 'iframeLoad';
            phaseStartTime = Date.now();
          } else if (currentPhase === 'iframeLoad' && elapsed < phaseTimeouts.contentReady) {
            currentPhase = 'contentReady';
            phaseStartTime = Date.now();
          } else if (setupAttempts < maxAttempts) {
            // Retry the entire setup
            clearInterval(readinessInterval);
            console.warn(`🔄 [Unified Renderer] Retrying setup (attempt ${setupAttempts + 1}/${maxAttempts})`);
            isSettingUp = false;
            setTimeout(() => setupSandpack(), 2000);
            return;
          } else {
            // Final failure
            clearInterval(readinessInterval);
            const totalElapsed = Date.now() - phaseStartTime;
            error = `Preview timeout in ${currentPhase} phase (${Math.round(totalElapsed/1000)}s). This may indicate bundling issues or heavy dependencies.`;
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
            return;
          }
        }
      }, 200); // Check every 200ms for more responsive detection

      // Absolute safety timeout to prevent infinite waiting
      timeoutId = setTimeout(() => {
        if (!isReady) {
          clearInterval(readinessInterval);
          const totalElapsed = Date.now() - phaseStartTime;
          console.error(`🔴 [Unified Renderer] Absolute timeout reached: ${totalElapsed}ms in phase ${currentPhase}`);

          // Last chance - check if anything rendered despite timeout
          const sandpackWrapper = containerElement.querySelector('.sp-wrapper');
          const iframe = containerElement.querySelector('iframe');

          if (sandpackWrapper || iframe) {
            console.warn('🎯 [Unified Renderer] Elements found despite timeout, allowing preview');
            completeSetup('elements found after timeout');
          } else {
            error = `Preview failed: absolute timeout (${Math.round(totalElapsed/1000)}s). Sandpack may be experiencing issues or dependencies are too heavy.`;
            loading = false;
            isSettingUp = false;
            dispatch('error', { message: error, artifact });
          }
        }
      }, phaseTimeouts.fallbackMax);

      // Enhanced cleanup after extended period
      setTimeout(() => {
        clearInterval(readinessInterval);
      }, phaseTimeouts.fallbackMax + 2000);

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
  let pendingSetup: Promise<void> | null = null;

  $: if (browser && artifact && !loading && !isSettingUp) {
    const currentArtifactId = isLegacyArtifact(artifact)
      ? `${artifact.type}-${artifact.entryCode?.substring(0, 50)}`
      : `${artifact.type}-${artifact.identifier}`;

    // Only setup if artifact actually changed and no setup is in progress
    if (currentArtifactId !== lastArtifactId && !pendingSetup) {
      lastArtifactId = currentArtifactId;
      setupAttempts = 0;
      pendingSetup = setupSandpack().finally(() => {
        pendingSetup = null;
      });
    }
  }

  $: if (browser && containerElement && showCode !== lastShowCode && !loading && !isSettingUp) {
    // Only re-setup when showCode actually changes, not on initial mount
    if (lastShowCode !== undefined && !pendingSetup) {
      lastShowCode = showCode;
      pendingSetup = new Promise(resolve => {
        setTimeout(() => {
          setupSandpack().finally(() => {
            pendingSetup = null;
            resolve();
          });
        }, 100);
      });
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

    // Abort any pending setup
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    // Cancel pending setup promise
    if (pendingSetup) {
      pendingSetup = null;
    }

    // Clean up state machine
    if (stateUnsubscribe) {
      stateUnsubscribe();
      stateUnsubscribe = null;
    }

    if (stateMachine) {
      stateMachine.destroy();
      stateMachine = null;
    }

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
          <div class="step" class:active={currentState === 'initializing'}>Loading Sandpack runtime</div>
          <div class="step" class:active={currentState === 'loading'}>Loading dependencies</div>
          <div class="step" class:active={currentState === 'configuring'}>Generating configuration</div>
          <div class="step" class:active={currentState === 'mounting'}>Mounting components</div>
          <div class="step" class:active={currentState === 'bundling'}>Bundling code</div>
          <div class="step" class:active={currentState === 'rendering'}>Rendering preview</div>
          {#if currentState === 'retrying'}
            <div class="step retry-step active">Retrying setup (attempt {setupAttempts})</div>
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
    opacity: 0.5;
    transition: all 0.3s ease;
  }

  .step.active {
    opacity: 1;
    color: var(--color-blue-600, #2563eb);
    font-weight: 500;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .retry-step {
    color: var(--color-orange-600, #ea580c);
    font-weight: 500;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
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