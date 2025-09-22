<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { generateSandpackFiles } from '$lib/utils/preview/sandpack-generator';
  import { analyzeMessageForArtifacts } from '$lib/utils/preview/message-analyzer';
  import { previewActions } from '$lib/stores/preview/preview-store';
  
  export let code: string;
  export let css: string = '';
  export let title: string = 'Preview';
  export let messageContent: string = '';
  export let showCode: boolean = false;
  
  let containerElement: HTMLDivElement;
  let codeContainerElement: HTMLDivElement;
  let reactRoot: any = null;
  let codeReactRoot: any = null;
  let loading = true;
  let error: string | null = null;
  
  const setupSandpack = async () => {
    if (!browser || !containerElement || !code) return;
    
    try {
      previewActions.setLoading(true);
      error = null;
      
      // Import React dependencies
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');
      
      // Analyze message for better code selection and CSS extraction
      let previewCode = code;
      let previewCSS = css;
      
      if (messageContent) {
        const messageAnalysis = analyzeMessageForArtifacts(messageContent);
        if (messageAnalysis.bestCodeForPreview) {
          previewCode = messageAnalysis.bestCodeForPreview;
          previewCSS = messageAnalysis.allCSS || css;
        }
      }
      
      // Generate Sandpack files
      const files = generateSandpackFiles(previewCode, previewCSS, messageContent);
      
      // Validate files
      if (!files['/App.jsx']?.code || !files['/index.js']?.code) {
        throw new Error('Failed to generate valid Sandpack configuration');
      }
      
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
      
      // Import Sandpack components
      const { Sandpack, SandpackProvider, SandpackLayout, SandpackPreview, SandpackCodeEditor } = 
        await import('@codesandbox/sandpack-react');
      
      // Create main preview element
      const sandpackElement = React.createElement(Sandpack, {
        template: 'react',
        files,
        options: {
          showConsole: false,
          showRefreshButton: true,
          autoReload: true,
          bundlerURL: 'https://preview.prometheusags.ai',
          recompileMode: 'delayed',
          recompileDelay: 500,
          showNavigator: false,
          showTabs: false,
          showLineNumbers: true,
          editorHeight: showCode ? '50%' : 0,
          editorWidthPercentage: showCode ? 40 : 0
        },
        theme: 'auto',
        customSetup: {
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0'
          }
        }
      });
      
      // Render main preview
      reactRoot = createRoot(containerElement);
      reactRoot.render(sandpackElement);
      
      // Render code editor if requested
      if (showCode && codeContainerElement) {
        const codeEditorElement = React.createElement(
          SandpackProvider,
          {
            template: 'react',
            files,
            theme: 'auto'
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
      
      previewActions.setLoading(false);
      
    } catch (err) {
      console.error('Sandpack setup failed:', err);
      error = `Failed to setup preview: ${err instanceof Error ? err.message : 'Unknown error'}`;
      previewActions.setError(error);
    }
  };
  
  // Reactive updates
  $: if (browser && (code || messageContent)) {
    setupSandpack();
  }
  
  $: if (browser && containerElement && showCode !== undefined) {
    // Re-setup when code view toggles
    setTimeout(() => setupSandpack(), 100);
  }
  
  onMount(() => {
    if (browser) {
      setupSandpack();
    }
  });
  
  onDestroy(() => {
    if (reactRoot) {
      try {
        reactRoot.unmount();
      } catch (err) {
        console.warn('Error unmounting Sandpack:', err);
      }
      reactRoot = null;
    }
    
    if (codeReactRoot) {
      try {
        codeReactRoot.unmount();
      } catch (err) {
        console.warn('Error unmounting code editor:', err);
      }
      codeReactRoot = null;
    }
  });
</script>

<div class="sandpack-renderer">
  {#if loading}
    <div class="loading-container">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">Setting up React preview...</p>
        <div class="loading-steps">
          <div class="step">Loading dependencies</div>
          <div class="step">Analyzing code</div>
          <div class="step">Generating files</div>
          <div class="step">Starting bundler</div>
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
          <li>Check if the code is valid React/JSX</li>
          <li>Ensure all components are properly exported</li>
          <li>Verify import statements are correct</li>
          <li>Try refreshing the page</li>
        </ul>
      </details>
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
  .sandpack-renderer {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
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
  
  .step:nth-child(2) { animation-delay: 0.5s; }
  .step:nth-child(3) { animation-delay: 1s; }
  .step:nth-child(4) { animation-delay: 1.5s; }
  
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
