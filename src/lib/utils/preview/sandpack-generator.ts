/**
 * Sandpack File Generation Utilities for Artifact Preview System
 * 
 * This module generates appropriate Sandpack file structures based on
 * code analysis results, handling both standalone components and complete applications.
 */

import { analyzeReactCode, type CodeAnalysisResult } from './code-analyzer';
import { extractCSSFromMessage } from './message-analyzer';

export interface SandpackFiles {
  [filePath: string]: {
    code: string;
  };
}

/**
 * Generates appropriate Sandpack files based on code analysis
 */
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

/**
 * Generates files for complete React applications
 */
function generateApplicationFiles(code: string, css: string, analysis: CodeAnalysisResult): SandpackFiles {
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
      `.trim()
    }
  };
  
  // Handle local imports
  const imports = extractImportStatements(code);
  imports.forEach(({ componentName, isLocalImport }) => {
    if (isLocalImport && !files[`/${componentName}.jsx`]) {
      files[`/${componentName}.jsx`] = {
        code: generatePlaceholderComponent(componentName)
      };
    }
  });
  
  return files;
}

/**
 * Generates files for standalone React components
 */
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
      padding: '40px', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        width: '100%'
      }}>
        <h2 style={{ 
          marginBottom: '24px', 
          textAlign: 'center',
          color: '#333',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          ${componentName} Preview
        </h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'center'
        }}>
          <${componentName} 
            onClick={() => alert('Component clicked!')}
          >
            Sample Content
          </${componentName}>
          
          <${componentName} 
            onClick={() => console.log('Another click!')}
            style={{ marginTop: '8px' }}
          >
            Another Example
          </${componentName}>
        </div>
      </div>
    </div>
  );
}

export default App;
      `.trim()
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
      `.trim()
    }
  };
}

/**
 * Generates files for code fragments
 */
function generateFragmentFiles(code: string, css: string, analysis: CodeAnalysisResult): SandpackFiles {
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
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>
          Code Fragment Preview
        </h1>
        <${componentName} />
      </div>
    </div>
  );
}

export default App;
      `.trim()
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
      `.trim()
    }
  };
}

/**
 * Generates fallback files for unrecognized code
 */
function generateFallbackFiles(code: string, css: string): SandpackFiles {
  return {
    '/App.jsx': {
      code: `
import React from 'react';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f9f9f9', 
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <h1>Code Preview</h1>
      <pre style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        overflow: 'auto',
        border: '1px solid #ddd'
      }}>
        <code>{${JSON.stringify(code)}}</code>
      </pre>
    </div>
  );
}

export default App;
      `.trim()
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
      `.trim()
    }
  };
}

/**
 * Extracts import statements from React code
 */
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

/**
 * Generates a placeholder component for missing dependencies
 */
function generatePlaceholderComponent(componentName: string): string {
  return `
import React from 'react';

const ${componentName} = (props) => {
  return (
    <div style={{ 
      padding: '16px', 
      border: '2px dashed #fbbf24', 
      borderRadius: '8px',
      textAlign: 'center',
      color: '#92400e',
      backgroundColor: '#fef3c7',
      margin: '8px 0'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
        📦 ${componentName}
      </h3>
      <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
        Component definition not found in message
      </p>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.6 }}>
        This is a placeholder. Add the ${componentName} component to see it rendered.
      </p>
    </div>
  );
};

export default ${componentName};
  `.trim();
}

/**
 * Default CSS styles for component previews
 */
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
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}

/* Basic button styles for components */
button {
  cursor: pointer;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 14px;
  transition: all 0.2s ease;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

/* Basic input styles */
input, textarea {
  font-family: inherit;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
}
`;

/**
 * Utility function to validate generated files
 */
export function validateSandpackFiles(files: SandpackFiles): boolean {
  const requiredFiles = ['/App.jsx', '/index.js'];
  return requiredFiles.every(file => files[file] && files[file].code.trim().length > 0);
}

/**
 * Gets the entry point component name from the files
 */
export function getEntryPointName(files: SandpackFiles): string {
  if (files['/App.jsx']) {
    const appCode = files['/App.jsx'].code;
    const match = appCode.match(/function\s+(\w+)|const\s+(\w+)\s*=/);
    return match?.[1] || match?.[2] || 'App';
  }
  return 'App';
}
