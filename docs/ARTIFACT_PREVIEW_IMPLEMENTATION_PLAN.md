# Artifact Preview System Implementation Plan

## Executive Summary

This document outlines the implementation plan for fixing the artifact preview functionality in OpenWebUI. Currently, the Preview button incorrectly opens the Chat Controls panel instead of showing a Sandpack live preview of React components. This plan details the technical approach, UI/UX design decisions, and implementation phases based on industry best practices.

## Problem Statement

### Current Issue
- **Symptom**: Preview button on React code blocks opens Chat Controls panel (LLM settings like top_p, top_k, temperature)
- **Expected Behavior**: Preview button should open a Sandpack viewer showing the rendered React component with applied CSS styles
- **Root Cause**: Store routing issue where `showControls` is triggering the wrong UI panel

### Requirements
1. **Functional Preview**: Show live, interactive React components in Sandpack
2. **Style Integration**: Automatically apply CSS from the same message/context
3. **Security**: Sandboxed execution environment for user code
4. **UX Consistency**: Seamless integration with existing OpenWebUI interface
5. **Performance**: Fast loading and responsive interaction

## Research Findings

### Industry Best Practices

Based on research of leading platforms (Claude Artifacts, CodeSandbox, Sandpack documentation):

#### 1. **UI/UX Patterns**
- **Side Panel Approach**: Most effective for code previews (used by Claude, CodeSandbox)
- **Modal Alternative**: For full-screen focus when needed
- **Split View**: Editor + preview side-by-side for development workflow
- **Overlay Positioning**: Non-blocking overlays for supplementary content

#### 2. **Sandpack Best Practices**
- **Component Architecture**: Use `SandpackProvider` + custom components for flexibility
- **Security**: Implement proper iframe sandboxing with restricted permissions
- **Performance**: Lazy loading, auto-reload configurations, and debounced updates
- **Theming**: Dark/light mode support with consistent styling

#### 3. **Security Considerations**
- **Iframe Sandboxing**: `sandbox="allow-scripts allow-same-origin"` for React components
- **Origin Validation**: Validate postMessage origins for cross-frame communication
- **CSP Policies**: Content Security Policy headers for additional protection
- **Code Execution**: Isolated execution context preventing parent page access

## Technical Architecture

### 1. **Component Structure**

```
ArtifactPreviewSystem/
├── ArtifactPreviewPanel.svelte      # Main preview container
├── SandpackPreviewRenderer.svelte   # Sandpack-specific renderer
├── PreviewToolbar.svelte           # Controls (close, fullscreen, etc.)
├── StyleExtractor.ts               # CSS extraction utility
└── PreviewStore.ts                 # State management
```

### 2. **Data Flow**

```mermaid
graph TD
    A[Preview Button Click] --> B[Extract Code & CSS]
    B --> C[PreviewStore.showPreview()]
    C --> D[ArtifactPreviewPanel]
    D --> E[SandpackPreviewRenderer]
    E --> F[Sandpack Component]
    F --> G[Live React Preview]
```

### 3. **Store Management**

**New Stores:**
- `previewStore`: Manages preview panel state
- `artifactPreviewCode`: Holds current preview content
- `previewPanelVisible`: Controls panel visibility

**Modified Logic:**
- Separate preview controls from chat controls
- Independent state management for artifact previews

## UI/UX Design Specifications

### 1. **Preview Panel Design**

#### **Side Panel Approach** (Recommended)
- **Position**: Right side of screen, overlaying chat area
- **Width**: 60% of viewport (responsive)
- **Height**: Full height with header/footer
- **Animation**: Slide-in from right (300ms ease-out)
- **Background**: Semi-transparent backdrop-blur

#### **Key Features**:
- **Header**: Component title, close button, fullscreen toggle
- **Body**: Sandpack preview with live component
- **Footer**: View code button, settings toggle
- **Responsive**: Collapses to modal on mobile devices

### 2. **Visual Specifications**

```css
.artifact-preview-panel {
  position: fixed;
  right: 0;
  top: 0;
  width: 60%;
  height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-left: 1px solid var(--border-color);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease-out;
}

.artifact-preview-panel.visible {
  transform: translateX(0);
}
```

### 3. **Interaction Patterns**

#### **Opening Preview**:
1. User clicks Preview button
2. Panel slides in from right
3. Loading state while Sandpack initializes
4. Component renders with applied styles

#### **Closing Preview**:
- Click close button (×)
- Press Escape key
- Click backdrop area
- Navigate away from chat

#### **Responsive Behavior**:
- **Desktop**: Side panel (60% width)
- **Tablet**: Side panel (80% width)  
- **Mobile**: Full-screen modal

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

#### **Tasks:**
1. **Create Preview Store System**
   - `src/lib/stores/preview-store.ts`
   - State management for preview panel
   - Integration with existing store architecture

2. **Fix Store Routing Issue**
   - Identify why `showControls` opens wrong panel
   - Create separate `showPreview` action
   - Update ContentRenderer.svelte routing

3. **Basic Preview Panel Component**
   - `ArtifactPreviewPanel.svelte`
   - Basic slide-in animation
   - Close functionality

#### **Success Criteria:**
- Preview button no longer opens Chat Controls
- Basic preview panel appears/disappears correctly
- No regression in existing functionality

### Phase 2: Sandpack Integration (Week 2)

#### **Tasks:**
1. **Sandpack Renderer Component**
   - `SandpackPreviewRenderer.svelte`
   - React component execution
   - Error handling and loading states

2. **CSS Integration System**
   - Extract CSS from message context
   - Apply styles to Sandpack environment
   - Handle multiple CSS blocks

3. **Security Implementation**
   - Iframe sandboxing
   - Origin validation
   - Content Security Policy

#### **Success Criteria:**
- React components render in preview
- CSS styles applied correctly
- Secure execution environment

### Phase 3: UX Polish (Week 3)

#### **Tasks:**
1. **Advanced UI Features**
   - Fullscreen mode
   - Resizable panels
   - Dark/light theme support

2. **Performance Optimization**
   - Lazy loading
   - Debounced updates
   - Memory management

3. **Mobile Responsiveness**
   - Modal view for mobile
   - Touch-friendly interactions
   - Responsive breakpoints

#### **Success Criteria:**
- Smooth animations and interactions
- Optimal performance on all devices
- Consistent with OpenWebUI design system

### Phase 4: Testing & Deployment (Week 4)

#### **Tasks:**
1. **Testing Suite**
   - Unit tests for components
   - Integration tests for preview flow
   - Security vulnerability testing

2. **Documentation**
   - User documentation
   - Developer API docs
   - Troubleshooting guide

3. **Deployment**
   - Feature flag rollout
   - Performance monitoring
   - User feedback collection

## Technical Implementation Details

### 1. **Store Implementation**

```typescript
// src/lib/stores/preview-store.ts
import { writable } from 'svelte/store';

interface PreviewState {
  isVisible: boolean;
  code: string;
  css: string;
  type: 'react' | 'html' | 'svg';
  title: string;
}

export const previewStore = writable<PreviewState>({
  isVisible: false,
  code: '',
  css: '',
  type: 'react',
  title: 'Preview'
});

export const previewActions = {
  show: (code: string, css?: string, title?: string) => {
    previewStore.update(state => ({
      ...state,
      isVisible: true,
      code,
      css: css || '',
      title: title || 'Component Preview'
    }));
  },
  hide: () => {
    previewStore.update(state => ({
      ...state,
      isVisible: false
    }));
  }
};
```

### 2. **CSS Extraction Logic**

```typescript
// src/lib/utils/style-extractor.ts
export function extractCSSFromMessage(messageContent: string): string {
  const cssBlocks = [];
  
  // Extract CSS from ```css blocks
  const cssMatches = messageContent.match(/```css\n([\s\S]*?)\n```/g);
  if (cssMatches) {
    cssMatches.forEach(block => {
      const css = block.replace(/```css\n/, '').replace(/\n```/, '');
      cssBlocks.push(css);
    });
  }
  
  // Extract styles from <style> tags in HTML
  const styleMatches = messageContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
  if (styleMatches) {
    styleMatches.forEach(block => {
      const css = block.replace(/<style[^>]*>/, '').replace(/<\/style>/, '');
      cssBlocks.push(css);
    });
  }
  
  return cssBlocks.join('\n\n');
}
```

### 3. **Sandpack Configuration**

```svelte
<!-- SandpackPreviewRenderer.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Sandpack } from '@codesandbox/sandpack-react';
  
  export let code: string;
  export let css: string = '';
  export let title: string = 'Preview';
  
  let containerElement: HTMLDivElement;
  let reactRoot: any = null;
  
  const setupSandpack = async () => {
    const React = await import('react');
    const { createRoot } = await import('react-dom/client');
    
    const files = {
      '/App.jsx': {
        code: code
      },
      '/styles.css': {
        code: css || '/* No custom styles */'
      },
      '/index.js': {
        code: `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import App from './App';
          import './styles.css';
          
          const root = createRoot(document.getElementById('root'));
          root.render(<App />);
        `
      }
    };
    
    const sandpackElement = React.createElement(Sandpack, {
      template: 'react',
      files,
      options: {
        showConsole: true,
        showRefreshButton: true,
        autoReload: true,
        bundlerURL: 'https://preview.prometheusags.ai'
      },
      theme: 'auto'
    });
    
    reactRoot = createRoot(containerElement);
    reactRoot.render(sandpackElement);
  };
  
  onMount(() => {
    setupSandpack();
  });
</script>

<div 
  bind:this={containerElement}
  class="sandpack-container w-full h-full"
>
  <!-- Sandpack renders here -->
</div>
```

## Security Considerations

### 1. **Iframe Sandboxing**
```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms"
  src="about:blank"
  class="w-full h-full border-0"
/>
```

### 2. **Content Security Policy**
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-eval' https://preview.prometheusags.ai;
               style-src 'self' 'unsafe-inline';
               connect-src 'self' https://preview.prometheusags.ai;">
```

### 3. **Origin Validation**
```typescript
window.addEventListener('message', (event) => {
  const allowedOrigins = [
    'https://preview.prometheusags.ai',
    window.location.origin
  ];
  
  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Blocked message from untrusted origin:', event.origin);
    return;
  }
  
  // Handle trusted message
});
```

## Testing Strategy

### 1. **Unit Tests**
- Component rendering tests
- Store state management tests
- CSS extraction utility tests

### 2. **Integration Tests**
- Preview button → panel opening flow
- Code + CSS integration
- Error handling scenarios

### 3. **Security Tests**
- XSS prevention tests
- Iframe escape attempts
- Origin validation tests

### 4. **Performance Tests**
- Load time measurements
- Memory usage monitoring
- Responsive design validation

## Risk Assessment

### **High Risk**
- **Security vulnerabilities**: Mitigated by sandboxing and CSP
- **Performance impact**: Mitigated by lazy loading and optimization

### **Medium Risk**
- **Browser compatibility**: Mitigated by feature detection
- **Mobile usability**: Mitigated by responsive design

### **Low Risk**
- **Code complexity**: Mitigated by modular architecture
- **Maintenance burden**: Mitigated by good documentation

## Success Metrics

### **Functional Metrics**
- ✅ Preview button opens correct panel (not Chat Controls)
- ✅ React components render successfully
- ✅ CSS styles apply correctly
- ✅ Secure execution environment

### **UX Metrics**
- ⏱️ Panel opens in <300ms
- 📱 Works on mobile devices
- 🎨 Consistent with OpenWebUI design
- ♿ Accessible keyboard navigation

### **Performance Metrics**
- 🚀 <2s initial load time
- 💾 <50MB memory usage
- 📊 No console errors
- 🔄 Smooth animations (60fps)

## Future Enhancements

### **Phase 2 Features**
- Multiple file support
- Real-time collaboration
- Component library integration
- Export functionality

### **Advanced Features**
- TypeScript support
- Hot reloading
- Debug console
- Performance profiler

---

**Document Version**: 1.0  
**Date**: September 21, 2025  
**Author**: Development Team  
**Review Status**: Ready for Implementation

## ADDENDUM: Handling React Components vs Complete Applications

### Problem Extension

The original plan assumed all code would be complete React applications, but we need to handle two distinct scenarios:

1. **React Component/Fragment**: Individual component definitions that need a wrapper application
2. **Complete React Application**: Full applications with imports, usage examples, and App components

### Code Pattern Analysis

#### **Scenario 1: React Component Only**
```jsx
// BlackGoldButton.jsx - Just the component
const BlackGoldButton = ({ children, onClick, className = "", ...props }) => {
  return (
    <button
      type="button"
      className={`bgold-button ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default BlackGoldButton;
```

#### **Scenario 2: Complete Application**
```jsx
// App.jsx - Full application with usage
import React from "react";
import BlackGoldButton from "./BlackGoldButton";

function App() {
  return (
    <div style={{ padding: 20, background: "#0a0a0a", minHeight: "100vh" }}>
      <BlackGoldButton onClick={() => alert("Clicked!")}>Click me</BlackGoldButton>
      <BlackGoldButton className="large" style={{ marginLeft: 12 }} onClick={() => {}}>
        Large Button
      </BlackGoldButton>
    </div>
  );
}

export default App;
```

## Enhanced Technical Architecture

### 1. **Code Analysis and Classification**

```typescript
// src/lib/utils/code-analyzer.ts
export interface CodeAnalysisResult {
  type: 'component' | 'application' | 'fragment';
  hasAppComponent: boolean;
  hasImports: boolean;
  componentNames: string[];
  needsWrapper: boolean;
  entryPoint: string;
}

export function analyzeReactCode(code: string): CodeAnalysisResult {
  const hasAppComponent = /function App\(|const App\s*=|class App extends/.test(code);
  const hasImports = /import\s+.*\s+from\s+['"]/.test(code);
  const hasExportDefault = /export\s+default/.test(code);
  
  // Extract component names
  const componentMatches = code.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/g);
  const componentNames = componentMatches ? 
    componentMatches.map(match => match.split(/\s+/)[1]) : [];
  
  if (hasAppComponent && hasImports) {
    return {
      type: 'application',
      hasAppComponent: true,
      hasImports: true,
      componentNames,
      needsWrapper: false,
      entryPoint: 'App'
    };
  }
  
  if (hasExportDefault && componentNames.length === 1) {
    return {
      type: 'component',
      hasAppComponent: false,
      hasImports: false,
      componentNames,
      needsWrapper: true,
      entryPoint: componentNames[0]
    };
  }
  
  return {
    type: 'fragment',
    hasAppComponent: false,
    hasImports: hasImports,
    componentNames,
    needsWrapper: true,
    entryPoint: componentNames[0] || 'Component'
  };
}
```

### 2. **Dynamic Sandpack File Generation**

```typescript
// src/lib/utils/sandpack-generator.ts
import { analyzeReactCode, CodeAnalysisResult } from './code-analyzer';
import { extractCSSFromMessage } from './style-extractor';

export interface SandpackFiles {
  [filePath: string]: {
    code: string;
  };
}

export function generateSandpackFiles(
  code: string, 
  css: string = '', 
  messageContent?: string
): SandpackFiles {
  const analysis = analyzeReactCode(code);
  const extractedCSS = messageContent ? extractCSSFromMessage(messageContent) : css;
  
  switch (analysis.type) {
    case 'application':
      return generateApplicationFiles(code, extractedCSS, analysis);
    case 'component':
      return generateComponentFiles(code, extractedCSS, analysis);
    case 'fragment':
      return generateFragmentFiles(code, extractedCSS, analysis);
    default:
      return generateFallbackFiles(code, extractedCSS);
  }
}

function generateApplicationFiles(code: string, css: string, analysis: CodeAnalysisResult): SandpackFiles {
  // For complete applications, use the code as-is but handle imports
  const files: SandpackFiles = {
    '/App.jsx': { code },
    '/styles.css': { code: css || defaultStyles },
    '/index.js': {
      code: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import App from './App';
        import './styles.css';
        
        const root = createRoot(document.getElementById('root'));
        root.render(<App />);
      `
    }
  };
  
  // Extract and create separate component files if needed
  const imports = extractImportStatements(code);
  imports.forEach(({ componentName, isLocalImport }) => {
    if (isLocalImport && !files[`/${componentName}.jsx`]) {
      // If it's a local import but file doesn't exist, create a placeholder
      files[`/${componentName}.jsx`] = {
        code: generatePlaceholderComponent(componentName)
      };
    }
  });
  
  return files;
}

function generateComponentFiles(code: string, css: string, analysis: CodeAnalysisResult): SandpackFiles {
  const componentName = analysis.entryPoint;
  
  return {
    [`/${componentName}.jsx`]: { code },
    '/App.jsx': {
      code: `
        import React from 'react';
        import ${componentName} from './${componentName}';
        
        function App() {
          return (
            <div style={{ 
              padding: '20px', 
              background: '#f5f5f5', 
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
                  ${componentName} Preview
                </h2>
                <${componentName} onClick={() => alert('Component clicked!')}>
                  Sample Content
                </${componentName}>
              </div>
            </div>
          );
        }
        
        export default App;
      `
    },
    '/styles.css': { code: css || defaultStyles },
    '/index.js': {
      code: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import App from './App';
        import './styles.css';
        
        const root = createRoot(document.getElementById('root'));
        root.render(<App />);
      `
    }
  };
}

function generateFragmentFiles(code: string, css: string, analysis: CodeAnalysisResult): SandpackFiles {
  // For code fragments, wrap in a functional component
  const componentName = analysis.entryPoint || 'Component';
  
  return {
    '/App.jsx': {
      code: `
        import React from 'react';
        
        ${code}
        
        function App() {
          return (
            <div style={{ 
              padding: '20px', 
              background: '#f5f5f5', 
              minHeight: '100vh'
            }}>
              <${componentName} />
            </div>
          );
        }
        
        export default App;
      `
    },
    '/styles.css': { code: css || defaultStyles },
    '/index.js': {
      code: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import App from './App';
        import './styles.css';
        
        const root = createRoot(document.getElementById('root'));
        root.render(<App />);
      `
    }
  };
}

// Helper functions
function extractImportStatements(code: string): Array<{componentName: string, isLocalImport: boolean}> {
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const imports = [];
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const [, componentName, importPath] = match;
    const isLocalImport = importPath.startsWith('./') || importPath.startsWith('../');
    imports.push({ componentName, isLocalImport });
  }
  
  return imports;
}

function generatePlaceholderComponent(componentName: string): string {
  return `
    import React from 'react';
    
    const ${componentName} = (props) => {
      return (
        <div style={{ 
          padding: '10px', 
          border: '2px dashed #ccc', 
          borderRadius: '4px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>Placeholder for ${componentName}</p>
          <p>Component definition not found in message</p>
        </div>
      );
    };
    
    export default ${componentName};
  `;
}

const defaultStyles = `
/* Default styles for component preview */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  height: 100vh;
}
`;
```

### 3. **Enhanced Message Context Analysis**

```typescript
// src/lib/utils/message-analyzer.ts
export interface MessageAnalysis {
  codeBlocks: Array<{
    language: string;
    code: string;
    isComplete: boolean;
    componentNames: string[];
  }>;
  cssBlocks: string[];
  hasCompleteApplication: boolean;
  primaryComponent: string | null;
}

export function analyzeMessageForArtifacts(messageContent: string): MessageAnalysis {
  // Extract all code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  const codeBlocks = [];
  const cssBlocks = [];
  let match;
  
  while ((match = codeBlockRegex.exec(messageContent)) !== null) {
    const [, language, code] = match;
    
    if (language === 'css') {
      cssBlocks.push(code);
    } else if (language === 'jsx' || language === 'javascript' || language === 'js') {
      const analysis = analyzeReactCode(code);
      codeBlocks.push({
        language: language || 'jsx',
        code,
        isComplete: analysis.type === 'application',
        componentNames: analysis.componentNames
      });
    }
  }
  
  // Determine if we have a complete application
  const hasCompleteApplication = codeBlocks.some(block => block.isComplete);
  
  // Find the primary component (first complete app or largest component)
  let primaryComponent = null;
  if (hasCompleteApplication) {
    primaryComponent = codeBlocks.find(block => block.isComplete)?.code || null;
  } else if (codeBlocks.length > 0) {
    primaryComponent = codeBlocks.reduce((prev, current) => 
      prev.code.length > current.code.length ? prev : current
    ).code;
  }
  
  return {
    codeBlocks,
    cssBlocks,
    hasCompleteApplication,
    primaryComponent
  };
}
```

### 4. **Updated Sandpack Renderer**

```svelte
<!-- SandpackPreviewRenderer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { generateSandpackFiles } from '$lib/utils/sandpack-generator';
  import { analyzeMessageForArtifacts } from '$lib/utils/message-analyzer';
  
  export let code: string;
  export let css: string = '';
  export let title: string = 'Preview';
  export let messageContent: string = '';
  
  let containerElement: HTMLDivElement;
  let reactRoot: any = null;
  let loading = true;
  let error: string | null = null;
  
  const setupSandpack = async () => {
    try {
      const React = await import('react');
      const { createRoot } = await import('react-dom/client');
      
      // Analyze the message to determine the best preview approach
      const messageAnalysis = messageContent ? 
        analyzeMessageForArtifacts(messageContent) : null;
      
      // Use message analysis if available, otherwise use direct code
      const previewCode = messageAnalysis?.primaryComponent || code;
      const previewCSS = messageAnalysis?.cssBlocks.join('\n\n') || css;
      
      // Generate appropriate Sandpack files
      const files = generateSandpackFiles(previewCode, previewCSS, messageContent);
      
      // Create Sandpack element
      const { Sandpack } = await import('@codesandbox/sandpack-react');
      const sandpackElement = React.createElement(Sandpack, {
        template: 'react',
        files,
        options: {
          showConsole: false,
          showRefreshButton: true,
          autoReload: true,
          bundlerURL: 'https://preview.prometheusags.ai'
        },
        theme: 'auto'
      });
      
      // Render
      reactRoot = createRoot(containerElement);
      reactRoot.render(sandpackElement);
      
      loading = false;
      error = null;
      
    } catch (err) {
      console.error('Sandpack setup failed:', err);
      error = `Failed to setup preview: ${err.message}`;
      loading = false;
    }
  };
  
  onMount(() => {
    setupSandpack();
  });
  
  onDestroy(() => {
    if (reactRoot) {
      reactRoot.unmount();
      reactRoot = null;
    }
  });
</script>

<div class="sandpack-renderer w-full h-full relative">
  {#if loading}
    <div class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p class="text-sm text-gray-600 dark:text-gray-400">Setting up preview...</p>
      </div>
    </div>
  {:else if error}
    <div class="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20">
      <div class="text-center p-4">
        <div class="text-red-500 mb-2">
          <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Preview Error</p>
        <p class="text-xs text-red-500 dark:text-red-300">{error}</p>
      </div>
    </div>
  {/if}
  
  <div 
    bind:this={containerElement}
    class="w-full h-full"
    class:hidden={loading || error}
  >
    <!-- Sandpack renders here -->
  </div>
</div>
```

## Updated Implementation Phases

### **Phase 1: Enhanced Core Infrastructure**

#### **Additional Tasks:**
1. **Code Analysis System**
   - Implement `code-analyzer.ts` with component vs application detection
   - Create `message-analyzer.ts` for full message context analysis
   
2. **Dynamic File Generation**
   - Implement `sandpack-generator.ts` with smart file creation
   - Handle import resolution and placeholder components

3. **Enhanced Preview Store**
   - Add support for message context
   - Include analysis results in store state

#### **Updated Success Criteria:**
- ✅ Correctly identifies React components vs complete applications
- ✅ Generates appropriate Sandpack file structure for both scenarios
- ✅ Handles CSS extraction from full message context

### **Phase 2: Enhanced Sandpack Integration**

#### **Additional Tasks:**
1. **Smart Component Wrapping**
   - Auto-wrap standalone components in demo applications
   - Generate meaningful usage examples for components

2. **Import Resolution**
   - Handle local component imports in complete applications
   - Create placeholder components for missing dependencies

3. **Enhanced Error Handling**
   - Graceful fallbacks for analysis failures
   - Clear error messages for users

## Testing Scenarios

### **Test Case 1: Standalone Component**
```jsx
const BlackGoldButton = ({ children, onClick, className = "", ...props }) => {
  // Component code...
};
export default BlackGoldButton;
```
**Expected**: Auto-wrapped in demo app with usage example

### **Test Case 2: Complete Application**
```jsx
import React from "react";
import BlackGoldButton from "./BlackGoldButton";

function App() {
  return (
    <div>
      <BlackGoldButton>Click me</BlackGoldButton>
    </div>
  );
}
export default App;
```
**Expected**: Used as-is with proper import resolution

### **Test Case 3: Mixed Content Message**
- Multiple code blocks (component definition + usage example)
- Associated CSS styles
- Text explanations

**Expected**: Intelligent selection of primary code and CSS integration

---

This addendum ensures the preview system can handle the real-world scenarios shown in your screenshot, providing appropriate previews for both individual components and complete applications.
