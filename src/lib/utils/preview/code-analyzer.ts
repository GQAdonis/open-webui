/**
 * Code Analysis Utilities for React Component Preview System
 * 
 * This module provides functionality to analyze React code and determine
 * whether it's a standalone component, complete application, or code fragment.
 */

export interface CodeAnalysisResult {
  type: 'component' | 'application' | 'fragment';
  hasAppComponent: boolean;
  hasImports: boolean;
  componentNames: string[];
  needsWrapper: boolean;
  entryPoint: string;
  isReactCode: boolean;
}

/**
 * Analyzes React code to determine its structure and requirements
 */
export function analyzeReactCode(code: string): CodeAnalysisResult {
  if (!code || typeof code !== 'string') {
    return createFallbackResult();
  }

  const trimmedCode = code.trim();
  
  // Check if this is actually React code
  const isReactCode = isValidReactCode(trimmedCode);
  if (!isReactCode) {
    return createFallbackResult();
  }

  const hasAppComponent = /function App\(|const App\s*=|class App extends/.test(trimmedCode);
  const hasImports = /import\s+.*\s+from\s+['"]/.test(trimmedCode);
  const hasExportDefault = /export\s+default/.test(trimmedCode);
  const hasReactImport = /import.*React.*from\s+['"]react['"]/.test(trimmedCode);
  
  // Extract component names (functions/classes that start with capital letter)
  const componentNames = extractComponentNames(trimmedCode);
  
  // Determine code type based on analysis
  if (hasAppComponent && hasImports) {
    return {
      type: 'application',
      hasAppComponent: true,
      hasImports: true,
      componentNames,
      needsWrapper: false,
      entryPoint: 'App',
      isReactCode: true
    };
  }
  
  if (hasExportDefault && componentNames.length === 1 && !hasAppComponent) {
    return {
      type: 'component',
      hasAppComponent: false,
      hasImports: hasImports,
      componentNames,
      needsWrapper: true,
      entryPoint: componentNames[0],
      isReactCode: true
    };
  }
  
  if (componentNames.length > 0) {
    return {
      type: 'fragment',
      hasAppComponent: false,
      hasImports: hasImports,
      componentNames,
      needsWrapper: true,
      entryPoint: componentNames[0] || 'Component',
      isReactCode: true
    };
  }
  
  return createFallbackResult();
}

/**
 * Checks if the code appears to be valid React code
 */
function isValidReactCode(code: string): boolean {
  const reactIndicators = [
    /import.*React/i,
    /export.*default/i,
    /function\s+[A-Z]\w*\s*\(/,
    /const\s+[A-Z]\w*\s*=/,
    /class\s+[A-Z]\w*\s+extends/,
    /<[A-Z]\w*[\s\/>]/,
    /jsx|tsx/i,
    /return\s*\(/,
    /useState|useEffect|useContext/,
    /props\./,
    /\.jsx|\.tsx/
  ];
  
  return reactIndicators.some(pattern => pattern.test(code));
}

/**
 * Extracts component names from React code
 */
function extractComponentNames(code: string): string[] {
  const componentPatterns = [
    // Function declarations: function ComponentName(
    /function\s+([A-Z][a-zA-Z0-9]*)\s*\(/g,
    // Arrow functions: const ComponentName = 
    /const\s+([A-Z][a-zA-Z0-9]*)\s*=/g,
    // Class components: class ComponentName extends
    /class\s+([A-Z][a-zA-Z0-9]*)\s+extends/g
  ];
  
  const componentNames: string[] = [];
  
  componentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const componentName = match[1];
      if (componentName && !componentNames.includes(componentName)) {
        componentNames.push(componentName);
      }
    }
  });
  
  return componentNames;
}

/**
 * Creates a fallback result for non-React or invalid code
 */
function createFallbackResult(): CodeAnalysisResult {
  return {
    type: 'fragment',
    hasAppComponent: false,
    hasImports: false,
    componentNames: [],
    needsWrapper: true,
    entryPoint: 'Component',
    isReactCode: false
  };
}

/**
 * Determines if code is a complete React application
 */
export function isCompleteApplication(code: string): boolean {
  const analysis = analyzeReactCode(code);
  return analysis.type === 'application';
}

/**
 * Determines if code is a standalone React component
 */
export function isStandaloneComponent(code: string): boolean {
  const analysis = analyzeReactCode(code);
  return analysis.type === 'component';
}

/**
 * Gets the primary component name from the code
 */
export function getPrimaryComponentName(code: string): string {
  const analysis = analyzeReactCode(code);
  return analysis.entryPoint;
}
