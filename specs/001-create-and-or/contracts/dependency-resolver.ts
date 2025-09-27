/**
 * Contract: Advanced Artifact Dependency Resolution System
 *
 * Core resolution engine with 4-tier strategy system for handling
 * multi-block artifact bundling failures and dependency issues.
 */

// Types
export interface DependencyResolver {
  messageContent: string;
  strategies: ResolutionStrategy[];
  resolvedArtifacts: ResolvedArtifact[];
  failedResolutions: FailedResolution[];
  processingTimeMs: number;
}

export interface ResolutionStrategy {
  name: string;
  priority: 100 | 90 | 80 | 10;
  targetPattern: RegExp;
  canHandle: (code: string) => boolean;
  apply: (code: string, context: ResolutionContext) => ResolutionResult;
}

export interface ResolutionResult {
  success: boolean;
  transformedCode: string;
  appliedChanges: CodeChange[];
  confidence: number; // 0-1
  errorMessage?: string;
  strategyUsed: string;
}

export interface CodeChange {
  type: ChangeType;
  originalText: string;
  newText: string;
  lineNumber: number;
  description: string;
}

export interface ResolutionContext {
  messageContent: string;
  availableBlocks: CodeBlock[];
  targetArtifact: string;
}

export interface CodeBlock {
  type: 'css' | 'javascript' | 'typescript' | 'json';
  content: string;
  filename?: string;
  language: string;
}

export interface ResolvedArtifact {
  originalCode: string;
  resolvedCode: string;
  strategiesApplied: string[];
  confidence: number;
}

export interface FailedResolution {
  originalCode: string;
  errorMessage: string;
  strategiesAttempted: string[];
}

export enum ChangeType {
  CSS_MODULE_IMPORT_REPLACEMENT = 'css_module_import_replacement',
  CSS_PROPERTY_CAMELCASE = 'css_property_camelcase',
  JSON_DATA_INLINE = 'json_data_inline',
  IMPORT_REMOVAL = 'import_removal',
  DIRECT_CSS_INJECTION = 'direct_css_injection'
}

// API Contract
export interface DependencyResolverAPI {
  /**
   * Resolve dependencies in artifact code using 4-tier strategy system
   * @param messageContent - Full message content containing code blocks
   * @param artifactCode - Specific artifact code with dependency issues
   * @returns Resolution result with transformed code or error
   */
  resolveDependencies(
    messageContent: string,
    artifactCode: string
  ): Promise<ResolutionResult>;

  /**
   * Extract code blocks from message content using regex patterns
   * @param messageContent - Source message content
   * @returns Array of extracted code blocks with metadata
   */
  extractCodeBlocks(messageContent: string): CodeBlock[];

  /**
   * Apply CSS module conversion strategy (Priority 100)
   * @param code - Code containing CSS module imports
   * @param context - Resolution context with available CSS blocks
   * @returns Resolution result with inline styles
   */
  applyCSSModuleConversion(code: string, context: ResolutionContext): ResolutionResult;

  /**
   * Apply direct CSS injection strategy (Priority 90)
   * @param code - Code with unresolved CSS dependencies
   * @param context - Resolution context with CSS blocks
   * @returns Resolution result with injected styles
   */
  applyDirectCSSInjection(code: string, context: ResolutionContext): ResolutionResult;

  /**
   * Apply JSON data inlining strategy (Priority 80)
   * @param code - Code with JSON import statements
   * @param context - Resolution context with JSON blocks
   * @returns Resolution result with inlined data
   */
  applyJSONDataInlining(code: string, context: ResolutionContext): ResolutionResult;

  /**
   * Apply import removal fallback strategy (Priority 10)
   * @param code - Code with problematic imports
   * @param context - Resolution context
   * @returns Resolution result with imports removed
   */
  applyImportRemoval(code: string, context: ResolutionContext): ResolutionResult;

  /**
   * Convert CSS properties to camelCase for React style objects
   * @param cssText - CSS text with kebab-case properties
   * @returns CSS text with camelCase properties
   */
  convertCSSPropertiesToCamelCase(cssText: string): string;

  /**
   * Validate resolution result for basic syntax correctness
   * @param result - Resolution result to validate
   * @returns Validation result with any syntax errors
   */
  validateResolutionResult(result: ResolutionResult): {
    isValid: boolean;
    syntaxErrors: string[];
  };
}

// Test Contract Requirements
export interface DependencyResolverTests {
  /**
   * Test CSS module import conversion
   * Input: `import styles from "./Button.module.css"`
   * Expected: `const styles = { className: { property: 'value' } }`
   */
  testCSSModuleConversion(): void;

  /**
   * Test CSS property camelCase conversion
   * Input: `background-color: red; border-radius: 4px;`
   * Expected: `backgroundColor: 'red', borderRadius: '4px'`
   */
  testCSSPropertyCamelCase(): void;

  /**
   * Test JSON import inlining
   * Input: `import data from "./config.json"`
   * Expected: `const data = { "key": "value" }`
   */
  testJSONDataInlining(): void;

  /**
   * Test import removal fallback
   * Input: `import unknown from "./missing.js"`
   * Expected: Code with import statement removed
   */
  testImportRemovalFallback(): void;

  /**
   * Test strategy priority execution order
   * Expected: Strategies execute in order 100 → 90 → 80 → 10
   */
  testStrategyPriorityOrder(): void;

  /**
   * Test first-success termination
   * Expected: Processing stops after first successful strategy
   */
  testFirstSuccessTermination(): void;

  /**
   * Test malformed input handling
   * Input: Empty or invalid message content
   * Expected: Graceful error handling without crashes
   */
  testMalformedInputHandling(): void;

  /**
   * Test performance requirements
   * Expected: Resolution completes in <1 second
   */
  testPerformanceRequirements(): void;
}

// Validation Test Cases
export const VALIDATION_TEST_CASES = {
  CSS_MODULE_BASIC: {
    input: `import styles from "./Button.module.css";
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`,
    cssBlock: `.primary { background-color: blue; font-size: 16px; }`,
    expected: `const styles = { primary: { backgroundColor: 'blue', fontSize: '16px' } };
export default function Button() {
  return <button className={styles.primary}>Click me</button>;
}`
  },

  MULTIPLE_CSS_FILES: {
    input: `import buttonStyles from "./Button.module.css";
import cardStyles from "./Card.module.css";`,
    cssBlocks: [
      { filename: "Button.module.css", content: ".btn { padding: 8px; }" },
      { filename: "Card.module.css", content: ".card { margin: 4px; }" }
    ],
    expected: `const buttonStyles = { btn: { padding: '8px' } };
const cardStyles = { card: { margin: '4px' } };`
  },

  JSON_IMPORT: {
    input: `import config from "./config.json";
console.log(config.apiUrl);`,
    jsonBlock: `{ "apiUrl": "https://api.example.com", "timeout": 5000 }`,
    expected: `const config = { "apiUrl": "https://api.example.com", "timeout": 5000 };
console.log(config.apiUrl);`
  },

  MIXED_DEPENDENCIES: {
    input: `import styles from "./App.module.css";
import data from "./data.json";
import unknown from "./missing.js";`,
    blocks: [
      { type: "css", content: ".app { width: 100%; }" },
      { type: "json", content: '{ "version": "1.0" }' }
    ],
    expected: `const styles = { app: { width: '100%' } };
const data = { "version": "1.0" };
// import unknown from "./missing.js"; - removed (unresolvable)`
  }
} as const;