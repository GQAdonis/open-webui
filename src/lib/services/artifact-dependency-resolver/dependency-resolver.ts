/**
 * Advanced Dependency Resolution Service for Multi-Block Artifacts
 * 
 * This service implements best practices from research:
 * - Auto-resolution with fallback strategies
 * - Graceful degradation for missing dependencies  
 * - CSS module to inline style conversion
 * - Cross-block content detection and injection
 * - Error recovery with smart retry mechanisms
 */

export interface CodeBlock {
  language: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface DependencyInfo {
  type: 'css' | 'js' | 'ts' | 'json' | 'unknown';
  path: string;
  isExternal: boolean;
  isModule: boolean;
  content?: string;
  found: boolean;
}

export interface ResolutionResult {
  success: boolean;
  resolvedCode: string;
  dependencies: DependencyInfo[];
  fallbacksUsed: string[];
  errors: string[];
}

export interface ResolutionStrategy {
  name: string;
  priority: number;
  canHandle: (dependency: DependencyInfo, blocks: CodeBlock[]) => boolean;
  resolve: (dependency: DependencyInfo, blocks: CodeBlock[], originalCode: string) => Promise<string>;
}

export class ArtifactDependencyResolver {
  private strategies: ResolutionStrategy[] = [];
  private messageContent: string = '';
  private extractedBlocks: CodeBlock[] = [];

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Set the full message content to scan for dependencies
   */
  setMessageContent(content: string): void {
    this.messageContent = content;
    this.extractedBlocks = this.extractCodeBlocks(content);
    console.log(`🔍 [DependencyResolver] Found ${this.extractedBlocks.length} code blocks in message`);
  }

  /**
   * Main resolution method - attempts to resolve all dependencies in the code
   */
  async resolveDependencies(code: string, language: string = 'tsx'): Promise<ResolutionResult> {
    const dependencies = this.extractDependencies(code);
    const result: ResolutionResult = {
      success: true,
      resolvedCode: code,
      dependencies: [],
      fallbacksUsed: [],
      errors: []
    };

    console.log(`🎯 [DependencyResolver] Found ${dependencies.length} dependencies to resolve`);

    // Process each dependency
    for (const dependency of dependencies) {
      try {
        const resolved = await this.resolveDependency(dependency, result.resolvedCode);
        result.dependencies.push({...dependency, found: !!resolved.content});
        
        if (resolved.content) {
          result.resolvedCode = resolved.code;
          if (resolved.fallbackUsed) {
            result.fallbacksUsed.push(resolved.fallbackUsed);
          }
        } else {
          result.errors.push(`Could not resolve: ${dependency.path}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error resolving ${dependency.path}: ${message}`);
        result.success = false;
      }
    }

    // If we have unresolved dependencies but no major errors, try graceful degradation
    if (result.errors.length > 0 && result.errors.length < dependencies.length) {
      result.resolvedCode = await this.applyGracefulDegradation(result.resolvedCode, result.errors);
      result.fallbacksUsed.push('graceful-degradation');
    }

    return result;
  }

  /**
   * Extract all dependencies (imports, requires) from code
   */
  private extractDependencies(code: string): DependencyInfo[] {
    const dependencies: DependencyInfo[] = [];
    
    // React-style imports (import ... from "...")
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["']([^"']+)["']/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      const path = match[1];
      dependencies.push({
        type: this.detectFileType(path),
        path,
        isExternal: !path.startsWith('.') && !path.startsWith('/'),
        isModule: path.includes('.module.'),
        found: false
      });
    }

    // CSS @import statements
    const cssImportRegex = /@import\s+["']([^"']+)["']/g;
    while ((match = cssImportRegex.exec(code)) !== null) {
      dependencies.push({
        type: 'css',
        path: match[1],
        isExternal: !match[1].startsWith('.'),
        isModule: false,
        found: false
      });
    }

    // RequireJS/CommonJS requires
    const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push({
        type: this.detectFileType(match[1]),
        path: match[1],
        isExternal: !match[1].startsWith('.'),
        isModule: false,
        found: false
      });
    }

    return dependencies;
  }

  /**
   * Extract code blocks from message content
   */
  private extractCodeBlocks(content: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        content: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    return blocks;
  }

  /**
   * Attempt to resolve a single dependency using available strategies
   */
  private async resolveDependency(dependency: DependencyInfo, currentCode: string): Promise<{
    content?: string;
    code: string;
    fallbackUsed?: string;
  }> {
    // Skip external dependencies for now - they should be handled by bundler
    if (dependency.isExternal && !dependency.isModule) {
      return { code: currentCode };
    }

    // Sort strategies by priority
    const applicableStrategies = this.strategies
      .filter(s => s.canHandle(dependency, this.extractedBlocks))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        console.log(`🔧 [DependencyResolver] Trying strategy: ${strategy.name} for ${dependency.path}`);
        const resolvedCode = await strategy.resolve(dependency, this.extractedBlocks, currentCode);
        
        if (resolvedCode !== currentCode) {
          console.log(`✅ [DependencyResolver] Successfully resolved ${dependency.path} using ${strategy.name}`);
          return {
            content: 'resolved',
            code: resolvedCode,
            fallbackUsed: strategy.name
          };
        }
      } catch (error) {
        console.warn(`⚠️ [DependencyResolver] Strategy ${strategy.name} failed:`, error);
      }
    }

    return { code: currentCode };
  }

  /**
   * Initialize resolution strategies in order of preference
   */
  private initializeStrategies(): void {
    // Strategy 1: CSS Module to Inline Styles (Highest Priority)
    this.strategies.push({
      name: 'css-module-to-inline',
      priority: 100,
      canHandle: (dep, blocks) => dep.isModule && dep.type === 'css',
      resolve: async (dep, blocks, code) => {
        const cssBlock = this.findMatchingCSSBlock(dep.path, blocks);
        if (!cssBlock) return code;

        return this.convertCSSModuleToInlineStyles(code, dep.path, cssBlock.content);
      }
    });

    // Strategy 2: Direct CSS Injection
    this.strategies.push({
      name: 'css-injection',
      priority: 90,
      canHandle: (dep, blocks) => dep.type === 'css' && !dep.isModule,
      resolve: async (dep, blocks, code) => {
        const cssBlock = this.findMatchingCSSBlock(dep.path, blocks);
        if (!cssBlock) return code;

        return this.injectGlobalCSS(code, cssBlock.content);
      }
    });

    // Strategy 3: JSON Data Injection
    this.strategies.push({
      name: 'json-data-injection',
      priority: 80,
      canHandle: (dep, blocks) => dep.type === 'json',
      resolve: async (dep, blocks, code) => {
        const jsonBlock = blocks.find(b => 
          b.language === 'json' && 
          (b.content.includes(dep.path) || this.isSimilarPath(dep.path, b.content))
        );
        
        if (!jsonBlock) return code;

        return this.inlineJSONData(code, dep.path, jsonBlock.content);
      }
    });

    // Strategy 4: Remove Import Fallback
    this.strategies.push({
      name: 'remove-import-fallback',
      priority: 10,
      canHandle: () => true,
      resolve: async (dep, blocks, code) => {
        console.log(`🔄 [DependencyResolver] Removing problematic import: ${dep.path}`);
        return this.removeImport(code, dep.path);
      }
    });
  }

  /**
   * Convert CSS module import to inline styles
   */
  private convertCSSModuleToInlineStyles(code: string, cssPath: string, cssContent: string): string {
    // Extract CSS classes and convert to camelCase object
    const styles = this.parseCSSToStyleObject(cssContent);
    
    // Replace import statement with inline styles object
    const importRegex = new RegExp(`import\\s+(?:\\*\\s+as\\s+)?(\\w+)\\s+from\\s+["']${cssPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];?`, 'g');
    
    return code.replace(importRegex, (match, varName) => {
      const stylesObject = JSON.stringify(styles, null, 2);
      return `const ${varName} = ${stylesObject};`;
    });
  }

  /**
   * Parse CSS content and convert to React style object
   */
  private parseCSSToStyleObject(cssContent: string): Record<string, Record<string, string>> {
    const styles: Record<string, Record<string, string>> = {};
    
    // Simple CSS parser - handles basic class definitions
    const classRegex = /\.([a-zA-Z][\w-]*)\s*{([^}]*)}/g;
    let match;
    
    while ((match = classRegex.exec(cssContent)) !== null) {
      const className = match[1];
      const rules = match[2];
      
      const styleObj: Record<string, string> = {};
      
      // Parse individual CSS rules
      const ruleRegex = /([a-zA-Z-]+)\s*:\s*([^;]+);?/g;
      let ruleMatch;
      
      while ((ruleMatch = ruleRegex.exec(rules)) !== null) {
        const property = this.cssPropertyToCamelCase(ruleMatch[1].trim());
        const value = ruleMatch[2].trim();
        styleObj[property] = value;
      }
      
      styles[className] = styleObj;
    }
    
    return styles;
  }

  /**
   * Convert CSS property names to camelCase for React
   */
  private cssPropertyToCamelCase(property: string): string {
    return property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Inject global CSS into React component
   */
  private injectGlobalCSS(code: string, cssContent: string): string {
    // Add CSS injection at the top of the component
    const cssInjectionCode = `
// Auto-injected CSS
React.useEffect(() => {
  const style = document.createElement('style');
  style.textContent = \`${cssContent.replace(/`/g, '\\`')}\`;
  document.head.appendChild(style);
  return () => document.head.removeChild(style);
}, []);
`;

    // Find the component function and inject CSS
    const functionRegex = /(const\s+\w+:\s*React\.FC[^=]*=\s*\([^)]*\)\s*=>\s*{)/;
    return code.replace(functionRegex, `$1${cssInjectionCode}`);
  }

  /**
   * Inline JSON data into component
   */
  private inlineJSONData(code: string, jsonPath: string, jsonContent: string): string {
    try {
      const data = JSON.parse(jsonContent);
      const importRegex = new RegExp(`import\\s+(\\w+)\\s+from\\s+["']${jsonPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];?`, 'g');
      
      return code.replace(importRegex, (match, varName) => {
        return `const ${varName} = ${JSON.stringify(data, null, 2)};`;
      });
    } catch {
      return this.removeImport(code, jsonPath);
    }
  }

  /**
   * Remove problematic import statements
   */
  private removeImport(code: string, importPath: string): string {
    const importRegex = new RegExp(`import\\s+[^;]*from\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];?\\n?`, 'g');
    return code.replace(importRegex, '');
  }

  /**
   * Apply graceful degradation for unresolved dependencies
   */
  private async applyGracefulDegradation(code: string, errors: string[]): Promise<string> {
    console.log('🛡️ [DependencyResolver] Applying graceful degradation');
    
    // Remove all problematic imports mentioned in errors
    let degradedCode = code;
    
    for (const error of errors) {
      const pathMatch = error.match(/Could not resolve: (.+)/);
      if (pathMatch) {
        degradedCode = this.removeImport(degradedCode, pathMatch[1]);
      }
    }
    
    return degradedCode;
  }

  /**
   * Find matching CSS block in extracted blocks
   */
  private findMatchingCSSBlock(path: string, blocks: CodeBlock[]): CodeBlock | null {
    // Direct filename match
    const filename = path.split('/').pop()?.replace('.module.css', '').replace('.css', '');
    
    return blocks.find(block => 
      block.language === 'css' || 
      (block.language === 'scss' && filename) ||
      this.isSimilarPath(path, block.content)
    ) || null;
  }

  /**
   * Check if path is similar to content (fuzzy matching)
   */
  private isSimilarPath(path: string, content: string): boolean {
    const pathParts = path.split(/[\/\.]/).filter(p => p.length > 2);
    return pathParts.some(part => content.toLowerCase().includes(part.toLowerCase()));
  }

  /**
   * Detect file type from path
   */
  private detectFileType(path: string): DependencyInfo['type'] {
    if (path.endsWith('.css') || path.endsWith('.scss')) return 'css';
    if (path.endsWith('.js')) return 'js';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'ts';
    if (path.endsWith('.json')) return 'json';
    return 'unknown';
  }
}

// Export singleton instance
export const dependencyResolver = new ArtifactDependencyResolver();
