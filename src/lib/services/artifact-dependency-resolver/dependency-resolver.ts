/**
 * Advanced Artifact Dependency Resolution System
 * Core engine for resolving multi-block artifact bundling failures
 *
 * Implements 4-tier priority strategy system:
 * - Priority 100: CSS Module Conversion
 * - Priority 90:  Direct CSS Injection
 * - Priority 80:  JSON Data Inlining
 * - Priority 10:  Import Removal (Fallback)
 */

export interface CodeBlock {
  type: string;
  content: string;
  language: string;
  startLine?: number;
  endLine?: number;
  malformed?: boolean;
}

export interface ResolutionContext {
  messageContent: string;
  availableBlocks: CodeBlock[];
  targetArtifact?: string;
  errorMessage?: string;
}

export interface CodeChange {
  type: ChangeType;
  originalText: string;
  newText: string;
  lineNumber?: number;
  description: string;
  confidence?: number;
}

export type ChangeType =
  | 'CSS_MODULE_IMPORT_REPLACEMENT'
  | 'CSS_DIRECT_INJECTION'
  | 'JSON_DATA_INLINE'
  | 'IMPORT_REMOVAL'
  | 'STYLE_OBJECT_CONVERSION'
  | 'PROPERTY_CAMELCASE_CONVERSION';

export interface ResolutionResult {
  success: boolean;
  transformedCode: string;
  appliedChanges: CodeChange[];
  confidence: number;
  strategyUsed: string;
  processingTimeMs?: number;
  errorMessage?: string;
  validationErrors?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  syntaxErrors: string[];
  warnings?: string[];
}

export interface DependencyResolverAPI {
  resolveDependencies(messageContent: string, artifactCode: string): Promise<ResolutionResult>;
  extractCodeBlocks(messageContent: string): CodeBlock[];
  applyCSSModuleConversion(code: string, context: ResolutionContext): ResolutionResult;
  convertCSSPropertiesToCamelCase(cssText: string): string;
  validateResolutionResult(result: ResolutionResult): ValidationResult;
}

/**
 * Core dependency resolver implementation
 */
export class DependencyResolver implements DependencyResolverAPI {
  private strategies: Map<string, { priority: number; handler: Function }>;

  constructor() {
    this.strategies = new Map([
      ['CSS_MODULE_CONVERSION', { priority: 100, handler: this.applyCSSModuleConversion.bind(this) }],
      ['DIRECT_CSS_INJECTION', { priority: 90, handler: this.applyDirectCSSInjection.bind(this) }],
      ['JSON_DATA_INLINING', { priority: 80, handler: this.applyJSONDataInlining.bind(this) }],
      ['IMPORT_REMOVAL', { priority: 10, handler: this.applyImportRemoval.bind(this) }]
    ]);
  }

  /**
   * Main resolution method - executes 4-tier strategy system
   */
  async resolveDependencies(messageContent: string, artifactCode: string): Promise<ResolutionResult> {
    const startTime = Date.now();

    try {
      const context: ResolutionContext = {
        messageContent,
        availableBlocks: this.extractCodeBlocks(messageContent),
        targetArtifact: this.extractArtifactName(artifactCode)
      };

      // Execute strategies in priority order (100 → 90 → 80 → 10)
      const sortedStrategies = Array.from(this.strategies.entries())
        .sort((a, b) => b[1].priority - a[1].priority);

      for (const [strategyName, strategy] of sortedStrategies) {
        const result = await this.executeStrategy(strategyName, artifactCode, context);

        if (result.success && result.confidence > 0.7) {
          result.processingTimeMs = Date.now() - startTime;
          return result;
        }
      }

      // All strategies failed
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'NONE',
        processingTimeMs: Date.now() - startTime,
        errorMessage: 'Unable to resolve dependencies - no applicable strategies found'
      };

    } catch (error) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'ERROR',
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract code blocks from message content
   */
  extractCodeBlocks(messageContent: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(messageContent)) !== null) {
      const language = match[1] || 'text';
      const content = match[2].trim();

      if (content.length > 0) {
        blocks.push({
          type: this.normalizeLanguageType(language),
          content,
          language,
          malformed: this.isBlockMalformed(content, language)
        });
      }
    }

    return blocks;
  }

  /**
   * CSS Module Conversion Strategy (Priority 100)
   */
  applyCSSModuleConversion(code: string, context: ResolutionContext): ResolutionResult {
    const cssModuleRegex = /import\s+(\w+)\s+from\s+['"](.*\.module\.(css|scss|sass))['"];?/g;
    const matches = Array.from(code.matchAll(cssModuleRegex));

    if (matches.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        errorMessage: 'No CSS module imports found'
      };
    }

    const cssBlocks = context.availableBlocks.filter(block =>
      block.type === 'css' || block.type === 'scss' || block.type === 'sass'
    );

    if (cssBlocks.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0.1,
        strategyUsed: 'CSS_MODULE_CONVERSION',
        errorMessage: 'No CSS code blocks found in message content'
      };
    }

    let transformedCode = code;
    const appliedChanges: CodeChange[] = [];

    for (const match of matches) {
      const variableName = match[1];
      const importPath = match[2];
      const fullImport = match[0];

      // Find best matching CSS block
      const cssBlock = this.findBestCSSMatch(cssBlocks, importPath);
      if (!cssBlock) continue;

      // Convert CSS to JavaScript object
      const stylesObject = this.convertCSSToStylesObject(cssBlock.content);
      const objectDeclaration = `const ${variableName} = ${this.convertObjectToJavaScript(stylesObject)};`;

      // Replace import with const declaration
      transformedCode = transformedCode.replace(fullImport, objectDeclaration);

      appliedChanges.push({
        type: 'CSS_MODULE_IMPORT_REPLACEMENT',
        originalText: fullImport,
        newText: objectDeclaration,
        description: `Converted CSS module import to inline styles object`,
        confidence: 0.95
      });
    }

    const validation = this.validateTransformation(transformedCode);

    return {
      success: validation.isValid,
      transformedCode: validation.isValid ? transformedCode : '',
      appliedChanges,
      confidence: validation.isValid ? 0.95 : 0.2,
      strategyUsed: 'CSS_MODULE_CONVERSION',
      validationErrors: validation.syntaxErrors
    };
  }

  /**
   * Convert CSS text to camelCase JavaScript object
   */
  convertCSSPropertiesToCamelCase(cssText: string): string {
    // If this looks like CSS rules, parse them
    if (cssText.includes('{') && cssText.includes('}')) {
      const rules = this.parseCSSRules(cssText);
      const jsObject: Record<string, Record<string, string>> = {};

      for (const rule of rules) {
        const className = rule.selector.replace(/^\./, ''); // Remove leading dot
        jsObject[className] = {};

        for (const [property, value] of Object.entries(rule.declarations)) {
          const camelCaseProperty = this.toCamelCase(property);
          jsObject[className][camelCaseProperty] = value;
        }
      }

      return JSON.stringify(jsObject, null, 2);
    }

    // Otherwise, treat as CSS property declarations
    const jsObject: Record<string, string> = {};
    const declarations = cssText.split(';').filter(decl => decl.trim());

    for (const declaration of declarations) {
      const [property, value] = declaration.split(':').map(s => s.trim());
      if (property && value) {
        const camelCaseProperty = this.toCamelCase(property);
        jsObject[camelCaseProperty] = value;
      }
    }

    // Return as JavaScript object string, not JSON
    const entries = Object.entries(jsObject)
      .map(([key, value]) => `${key}: '${value}'`)
      .join(', ');

    return `{ ${entries} }`;
  }

  /**
   * Direct CSS Injection Strategy (Priority 90)
   */
  private applyDirectCSSInjection(code: string, context: ResolutionContext): ResolutionResult {
    const cssImportRegex = /import\s+['"](.*\.(css|scss|sass))['"];?/g;
    const matches = Array.from(code.matchAll(cssImportRegex));

    if (matches.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'DIRECT_CSS_INJECTION',
        errorMessage: 'No CSS imports found for injection'
      };
    }

    const cssBlocks = context.availableBlocks.filter(block => block.type === 'css');
    if (cssBlocks.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0.1,
        strategyUsed: 'DIRECT_CSS_INJECTION',
        errorMessage: 'No CSS blocks available for injection'
      };
    }

    // For direct injection, we create a style element
    const cssContent = cssBlocks.map(block => block.content).join('\n');
    const styleInjection = `
// Injected CSS styles
const styleElement = document.createElement('style');
styleElement.textContent = \`${cssContent}\`;
document.head.appendChild(styleElement);
`;

    let transformedCode = code;

    // Remove CSS imports and add style injection at the top
    for (const match of matches) {
      transformedCode = transformedCode.replace(match[0], '');
    }

    transformedCode = styleInjection + '\n' + transformedCode;

    return {
      success: true,
      transformedCode,
      appliedChanges: [{
        type: 'CSS_DIRECT_INJECTION',
        originalText: matches.map(m => m[0]).join('\n'),
        newText: styleInjection,
        description: 'Injected CSS directly into document head'
      }],
      confidence: 0.85,
      strategyUsed: 'DIRECT_CSS_INJECTION'
    };
  }

  /**
   * JSON Data Inlining Strategy (Priority 80)
   */
  private applyJSONDataInlining(code: string, context: ResolutionContext): ResolutionResult {
    const jsonImportRegex = /import\s+(\w+)\s+from\s+['"](.*\.json)['"];?/g;
    const namedImportRegex = /import\s+\{([^}]+)\}\s+from\s+['"](.*\.json)['"];?/g;

    const defaultMatches = Array.from(code.matchAll(jsonImportRegex));
    const namedMatches = Array.from(code.matchAll(namedImportRegex));

    if (defaultMatches.length === 0 && namedMatches.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'JSON_DATA_INLINING',
        errorMessage: 'No JSON imports found'
      };
    }

    const jsonBlocks = context.availableBlocks.filter(block => block.type === 'json');
    if (jsonBlocks.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0.1,
        strategyUsed: 'JSON_DATA_INLINING',
        errorMessage: 'No JSON blocks available for inlining'
      };
    }

    let transformedCode = code;
    const appliedChanges: CodeChange[] = [];

    // Handle default imports
    for (const match of defaultMatches) {
      const variableName = match[1];
      const importPath = match[2];
      const fullImport = match[0];

      const jsonBlock = this.findBestJSONMatch(jsonBlocks, importPath);
      if (!jsonBlock) continue;

      try {
        // Validate JSON
        JSON.parse(jsonBlock.content);

        const constDeclaration = `const ${variableName} = ${jsonBlock.content};`;
        transformedCode = transformedCode.replace(fullImport, constDeclaration);

        appliedChanges.push({
          type: 'JSON_DATA_INLINE',
          originalText: fullImport,
          newText: constDeclaration,
          description: `Inlined JSON data for ${variableName}`
        });
      } catch (error) {
        // Skip malformed JSON
        continue;
      }
    }

    // Handle named imports
    for (const match of namedMatches) {
      const namedImports = match[1].split(',').map(s => s.trim());
      const importPath = match[2];
      const fullImport = match[0];

      const jsonBlock = this.findBestJSONMatch(jsonBlocks, importPath);
      if (!jsonBlock) continue;

      try {
        const jsonData = JSON.parse(jsonBlock.content);

        // Create destructuring assignment
        const constDeclaration = `const { ${namedImports.join(', ')} } = ${jsonBlock.content};`;
        transformedCode = transformedCode.replace(fullImport, constDeclaration);

        appliedChanges.push({
          type: 'JSON_DATA_INLINE',
          originalText: fullImport,
          newText: constDeclaration,
          description: `Inlined JSON properties: ${namedImports.join(', ')}`
        });
      } catch (error) {
        continue;
      }
    }

    return {
      success: appliedChanges.length > 0,
      transformedCode: appliedChanges.length > 0 ? transformedCode : '',
      appliedChanges,
      confidence: appliedChanges.length > 0 ? 0.9 : 0.1,
      strategyUsed: 'JSON_DATA_INLINING'
    };
  }

  /**
   * Import Removal Strategy (Priority 10) - Fallback
   */
  private applyImportRemoval(code: string, context: ResolutionContext): ResolutionResult {
    const importRegex = /import\s+.*?from\s+['"](.*?)['"];?\s*\n?/g;
    const sideEffectImportRegex = /import\s+['"](.*?)['"];?\s*\n?/g;

    const imports = Array.from(code.matchAll(importRegex));
    const sideEffectImports = Array.from(code.matchAll(sideEffectImportRegex));

    const allImports = [...imports, ...sideEffectImports];

    if (allImports.length === 0) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: 'IMPORT_REMOVAL',
        errorMessage: 'No imports found to remove'
      };
    }

    let transformedCode = code;
    const appliedChanges: CodeChange[] = [];

    // Remove imports and add comments
    for (const match of allImports) {
      const fullImport = match[0];
      const importPath = match[1];

      const comment = `// Removed import: ${importPath}`;
      transformedCode = transformedCode.replace(fullImport, comment + '\n');

      appliedChanges.push({
        type: 'IMPORT_REMOVAL',
        originalText: fullImport,
        newText: comment,
        description: `Removed unresolvable import: ${importPath}`
      });
    }

    return {
      success: true,
      transformedCode,
      appliedChanges,
      confidence: 0.8, // High confidence as fallback always works
      strategyUsed: 'IMPORT_REMOVAL'
    };
  }

  /**
   * Helper Methods
   */
  private async executeStrategy(strategyName: string, code: string, context: ResolutionContext): Promise<ResolutionResult> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyName}`);
    }

    try {
      return await strategy.handler(code, context);
    } catch (error) {
      return {
        success: false,
        transformedCode: '',
        appliedChanges: [],
        confidence: 0,
        strategyUsed: strategyName,
        errorMessage: `Strategy ${strategyName} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private normalizeLanguageType(language: string): string {
    const normalized = language.toLowerCase();
    if (['jsx', 'tsx'].includes(normalized)) return 'jsx';
    if (['css', 'scss', 'sass'].includes(normalized)) return 'css';
    if (['js', 'javascript'].includes(normalized)) return 'javascript';
    if (['ts', 'typescript'].includes(normalized)) return 'typescript';
    if (['json'].includes(normalized)) return 'json';
    return normalized;
  }

  private isBlockMalformed(content: string, language: string): boolean {
    if (language === 'json') {
      try {
        JSON.parse(content);
        return false;
      } catch {
        return true;
      }
    }
    // Add more validation as needed
    return false;
  }

  private extractArtifactName(code: string): string {
    const functionMatch = code.match(/function\s+(\w+)/);
    const exportMatch = code.match(/export\s+default\s+function\s+(\w+)/);

    return exportMatch?.[1] || functionMatch?.[1] || 'Component';
  }

  private findBestCSSMatch(cssBlocks: CodeBlock[], importPath: string): CodeBlock | null {
    // Simple heuristic: return first CSS block
    // Could be enhanced with path matching
    return cssBlocks[0] || null;
  }

  private findBestJSONMatch(jsonBlocks: CodeBlock[], importPath: string): CodeBlock | null {
    // Simple heuristic: return first JSON block
    // Could be enhanced with path matching
    return jsonBlocks[0] || null;
  }

  private convertCSSToStylesObject(cssContent: string): Record<string, Record<string, string>> {
    const rules = this.parseCSSRules(cssContent);
    const stylesObject: Record<string, Record<string, string>> = {};

    for (const rule of rules) {
      const className = rule.selector.replace(/^\./, '').replace(/[:\s].*$/, ''); // Clean selector
      stylesObject[className] = {};

      for (const [property, value] of Object.entries(rule.declarations)) {
        stylesObject[className][this.toCamelCase(property)] = value;
      }
    }

    return stylesObject;
  }

  private parseCSSRules(cssContent: string): Array<{ selector: string; declarations: Record<string, string> }> {
    const rules: Array<{ selector: string; declarations: Record<string, string> }> = [];

    // Simple CSS parser - matches .selector { property: value; }
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(cssContent)) !== null) {
      const selector = match[1].trim();
      const declarationsText = match[2].trim();
      const declarations: Record<string, string> = {};

      // Parse declarations
      const declRegex = /([^:]+):\s*([^;]+);?/g;
      let declMatch;

      while ((declMatch = declRegex.exec(declarationsText)) !== null) {
        const property = declMatch[1].trim();
        const value = declMatch[2].trim();
        declarations[property] = value;
      }

      if (selector.startsWith('.')) {
        rules.push({ selector, declarations });
      }
    }

    return rules;
  }

  private toCamelCase(str: string): string {
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  private convertObjectToJavaScript(obj: Record<string, Record<string, string>>): string {
    const classEntries = Object.entries(obj).map(([className, properties]) => {
      const propertyEntries = Object.entries(properties)
        .map(([prop, value]) => `${prop}: '${value}'`)
        .join(', ');
      return `${className}: { ${propertyEntries} }`;
    }).join(', ');

    return `{ ${classEntries} }`;
  }

  private validateTransformation(code: string): ValidationResult {
    const syntaxErrors: string[] = [];

    // Basic syntax validation
    const braceCount = (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
    if (braceCount !== 0) {
      syntaxErrors.push('Mismatched braces in transformed code');
    }

    const parenCount = (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;
    if (parenCount !== 0) {
      syntaxErrors.push('Mismatched parentheses in transformed code');
    }

    return {
      isValid: syntaxErrors.length === 0,
      syntaxErrors
    };
  }

  validateResolutionResult(result: ResolutionResult): ValidationResult {
    if (!result.success) {
      return { isValid: false, syntaxErrors: ['Resolution was not successful'] };
    }

    return this.validateTransformation(result.transformedCode);
  }
}

// Backward compatibility - preserve existing interface
export interface DependencyInfo {
  type: 'css' | 'js' | 'ts' | 'json' | 'unknown';
  path: string;
  isExternal: boolean;
  isModule: boolean;
  content?: string;
  found: boolean;
}

export class ArtifactDependencyResolver extends DependencyResolver {
  private messageContent: string = '';
  private extractedBlocks: CodeBlock[] = [];

  constructor() {
    super();
  }

  setMessageContent(content: string): void {
    this.messageContent = content;
    this.extractedBlocks = this.extractCodeBlocks(content);
    console.log(`🔍 [DependencyResolver] Found ${this.extractedBlocks.length} code blocks in message`);
  }

  async resolveDependencies(code: string, language: string = 'tsx'): Promise<any> {
    // Use the new API internally
    const result = await super.resolveDependencies(this.messageContent, code);

    // Convert to old format for backward compatibility
    return {
      success: result.success,
      resolvedCode: result.transformedCode,
      dependencies: [],
      fallbacksUsed: result.appliedChanges.map(c => c.description),
      errors: result.errorMessage ? [result.errorMessage] : []
    };
  }
}

// Export singleton instance for backward compatibility
export const dependencyResolver = new ArtifactDependencyResolver();