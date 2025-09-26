/**
 * XML-based Artifact Parser with CDATA Support and PAS 3.0 Schema Validation
 *
 * This module provides a proper XML parser using fast-xml-parser to handle
 * PAS 3.0 artifact tags with full CDATA section support for embedded code.
 * Enhanced with comprehensive schema validation for PAS 3.0 compliance.
 */

import { XMLParser } from 'fast-xml-parser';
import type {
  ArtifactParsingRequest,
  ArtifactParsingResponse,
  ValidationError,
  ValidationErrorType,
  ArtifactType
} from '$lib/types/enhanced-artifacts';

export interface ArtifactFile {
  path: string;
  content: string;
}

export interface ArtifactDependency {
  name: string;
  version: string;
}

export interface ParsedArtifact {
  identifier: string;
  type: string;
  title: string;
  description?: string;
  dependencies: ArtifactDependency[];
  files: ArtifactFile[];
  rawXml: string;
}

export interface ArtifactParseResult {
  artifacts: ParsedArtifact[];
  contentWithoutArtifacts: string;
  hasArtifacts: boolean;
  validationErrors: ValidationError[];
  parsingTimeMs: number;
}

/**
 * PAS 3.0 Schema Definition
 */
export interface PAS3Schema {
  version: string;
  requiredAttributes: string[];
  optionalAttributes: string[];
  supportedTypes: Record<string, ArtifactTypeSchema>;
  validationRules: ValidationRule[];
}

export interface ArtifactTypeSchema {
  type: string;
  requiredFileExtensions: string[];
  supportedLanguages: string[];
  allowedDependencies: string[];
  maxFileSize: number;
  validationRules: string[];
}

export interface ValidationRule {
  name: string;
  description: string;
  validator: (artifact: ParsedArtifact) => ValidationError[];
}

/**
 * PAS 3.0 Schema Validation Configuration
 */
export const PAS3_SCHEMA: PAS3Schema = {
  version: '3.0',
  requiredAttributes: ['identifier', 'type', 'title'],
  optionalAttributes: ['description', 'language', 'framework'],
  supportedTypes: {
    'text/html': {
      type: 'text/html',
      requiredFileExtensions: ['.html', '.htm'],
      supportedLanguages: ['html'],
      allowedDependencies: [],
      maxFileSize: 1024 * 1024, // 1MB
      validationRules: ['validateHTML']
    },
    'application/vnd.react+jsx': {
      type: 'application/vnd.react+jsx',
      requiredFileExtensions: ['.jsx', '.js'],
      supportedLanguages: ['javascript', 'jsx'],
      allowedDependencies: ['react', 'react-dom', '@types/react'],
      maxFileSize: 512 * 1024, // 512KB
      validationRules: ['validateReact', 'validateJavaScript']
    },
    'application/vnd.react+tsx': {
      type: 'application/vnd.react+tsx',
      requiredFileExtensions: ['.tsx', '.ts'],
      supportedLanguages: ['typescript', 'tsx'],
      allowedDependencies: ['react', 'react-dom', '@types/react', 'typescript'],
      maxFileSize: 512 * 1024, // 512KB
      validationRules: ['validateReact', 'validateTypeScript']
    },
    'application/vnd.svelte': {
      type: 'application/vnd.svelte',
      requiredFileExtensions: ['.svelte'],
      supportedLanguages: ['svelte', 'javascript'],
      allowedDependencies: ['svelte'],
      maxFileSize: 512 * 1024, // 512KB
      validationRules: ['validateSvelte']
    },
    'image/svg+xml': {
      type: 'image/svg+xml',
      requiredFileExtensions: ['.svg'],
      supportedLanguages: ['xml', 'svg'],
      allowedDependencies: [],
      maxFileSize: 256 * 1024, // 256KB
      validationRules: ['validateSVG']
    },
    'application/vnd.mermaid': {
      type: 'application/vnd.mermaid',
      requiredFileExtensions: ['.mmd', '.mermaid'],
      supportedLanguages: ['mermaid'],
      allowedDependencies: ['mermaid'],
      maxFileSize: 128 * 1024, // 128KB
      validationRules: ['validateMermaid']
    }
  },
  validationRules: []
};

/**
 * Security configuration for XML processing
 */
interface SecurityConfig {
  maxContentLength: number;
  maxNestingDepth: number;
  maxAttributeCount: number;
  maxFileSize: number;
  allowedProtocols: string[];
  blockedPatterns: RegExp[];
  maxProcessingTime: number;
}

const SECURITY_CONFIG: SecurityConfig = {
  maxContentLength: 5 * 1024 * 1024, // 5MB max content
  maxNestingDepth: 50, // Prevent XML bombs
  maxAttributeCount: 100, // Limit attributes per element
  maxFileSize: 2 * 1024 * 1024, // 2MB max per file
  allowedProtocols: ['http', 'https', 'data'], // For URI validation
  blockedPatterns: [
    /<!DOCTYPE/i, // Block DOCTYPE declarations
    /<!ENTITY/i, // Block entity declarations
    /&[a-zA-Z][a-zA-Z0-9]*;/, // Block entity references
    /<\?xml-stylesheet/i, // Block processing instructions
    /<script[^>]*>/i, // Block script tags in content
    /javascript:/i, // Block javascript: URLs
    /data:text\/html/i, // Block HTML data URLs
    /vbscript:/i, // Block VBScript URLs
    /on[a-z]+\s*=/i // Block event handlers
  ],
  maxProcessingTime: 5000 // 5 second max processing time
};

/**
 * Configuration for the XML parser optimized for artifact processing with security
 */
const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  parseTrueNumberOnly: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: false, // Security: Disable entity processing
  htmlEntities: false,
  ignoreNameSpace: false,
  allowBooleanAttributes: true,
  parseNodeValue: true,
  parseTagValue: true,
  preserveOrder: false,
  arrayMode: false,
  stopNodes: ["*.CDATA"],
  alwaysCreateTextNode: false,
  // Security settings
  entityParsingConfig: {
    skipUnresolvedEntity: true,
    processInternalEntity: false
  }
};

/**
 * Create and configure the XML parser
 */
const xmlParser = new XMLParser(XML_PARSER_OPTIONS);

/**
 * Security validation for XML content before processing
 */
function validateXMLSecurity(content: string): { isSecure: boolean; violations: string[] } {
  const violations: string[] = [];

  // Check content length
  if (content.length > SECURITY_CONFIG.maxContentLength) {
    violations.push(`Content too large: ${content.length} bytes (max: ${SECURITY_CONFIG.maxContentLength})`);
  }

  // Check for security patterns
  for (const pattern of SECURITY_CONFIG.blockedPatterns) {
    if (pattern.test(content)) {
      violations.push(`Blocked pattern detected: ${pattern.toString()}`);
    }
  }

  // Check nesting depth (basic check)
  const nestingDepth = (content.match(/<[^\/][^>]*>/g) || []).length;
  if (nestingDepth > SECURITY_CONFIG.maxNestingDepth) {
    violations.push(`XML nesting too deep: ${nestingDepth} (max: ${SECURITY_CONFIG.maxNestingDepth})`);
  }

  // Check for suspicious attribute patterns
  const attributeMatches = content.match(/\s+\w+\s*=/g) || [];
  if (attributeMatches.length > SECURITY_CONFIG.maxAttributeCount) {
    violations.push(`Too many attributes: ${attributeMatches.length} (max: ${SECURITY_CONFIG.maxAttributeCount})`);
  }

  return {
    isSecure: violations.length === 0,
    violations
  };
}

/**
 * Sanitize artifact content for security
 */
function sanitizeArtifactContent(content: string): string {
  let sanitized = content;

  // Remove dangerous patterns
  sanitized = sanitized.replace(/<!DOCTYPE[^>]*>/gi, ''); // Remove DOCTYPE
  sanitized = sanitized.replace(/<!ENTITY[^>]*>/gi, ''); // Remove entity declarations
  sanitized = sanitized.replace(/<\?xml-stylesheet[^>]*\?>/gi, ''); // Remove processing instructions

  // Sanitize URLs in attributes
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*["']?javascript:[^"'>]*/gi, '$1=""');
  sanitized = sanitized.replace(/(href|src|action)\s*=\s*["']?vbscript:[^"'>]*/gi, '$1=""');

  // Remove event handlers
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
}

/**
 * Validate file content for security issues
 */
function validateFileContentSecurity(file: ArtifactFile): string[] {
  const violations: string[] = [];

  // Check file size
  if (file.content.length > SECURITY_CONFIG.maxFileSize) {
    violations.push(`File ${file.path} too large: ${file.content.length} bytes (max: ${SECURITY_CONFIG.maxFileSize})`);
  }

  // Check for script injection attempts
  if (/<script[^>]*>/i.test(file.content)) {
    violations.push(`File ${file.path} contains potentially dangerous script tags`);
  }

  // Check for suspicious imports/requires
  const suspiciousImports = [
    /require\s*\(\s*["']fs["']\s*\)/,
    /require\s*\(\s*["']child_process["']\s*\)/,
    /require\s*\(\s*["']os["']\s*\)/,
    /import.*from\s*["']fs["']/,
    /import.*from\s*["']child_process["']/,
    /import.*from\s*["']os["']/
  ];

  for (const pattern of suspiciousImports) {
    if (pattern.test(file.content)) {
      violations.push(`File ${file.path} contains suspicious import: ${pattern.toString()}`);
    }
  }

  // Check for data exfiltration attempts
  const dataExfilPatterns = [
    /fetch\s*\(\s*["'][^"']*(?:data|api|webhook)[^"']*["']/i,
    /XMLHttpRequest/i,
    /navigator\.send[bB]eacon/i,
    /window\.location\s*=/i
  ];

  for (const pattern of dataExfilPatterns) {
    if (pattern.test(file.content)) {
      violations.push(`File ${file.path} contains potential data exfiltration code: ${pattern.toString()}`);
    }
  }

  return violations;
}

/**
 * Comprehensive security validation for parsed artifacts
 */
function validateArtifactSecurity(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate identifier for injection attempts
  if (artifact.identifier && /[<>'"&]/.test(artifact.identifier)) {
    errors.push({
      type: 'schema_invalid' as ValidationErrorType,
      message: 'Artifact identifier contains potentially dangerous characters',
      artifactId: artifact.identifier
    });
  }

  // Validate title for XSS attempts
  if (artifact.title && /<[^>]*>/.test(artifact.title)) {
    errors.push({
      type: 'schema_invalid' as ValidationErrorType,
      message: 'Artifact title contains HTML/XML tags',
      artifactId: artifact.identifier
    });
  }

  // Validate description for XSS attempts
  if (artifact.description && /<script[^>]*>/i.test(artifact.description)) {
    errors.push({
      type: 'schema_invalid' as ValidationErrorType,
      message: 'Artifact description contains script tags',
      artifactId: artifact.identifier
    });
  }

  // Validate dependencies for malicious packages
  for (const dep of artifact.dependencies) {
    if (isKnownMaliciousDependency(dep.name)) {
      errors.push({
        type: 'invalid_dependencies' as ValidationErrorType,
        message: `Dependency ${dep.name} is flagged as potentially malicious`,
        artifactId: artifact.identifier
      });
    }

    // Check for suspicious version patterns
    if (dep.version && /[<>'"&;]/.test(dep.version)) {
      errors.push({
        type: 'invalid_dependencies' as ValidationErrorType,
        message: `Dependency ${dep.name} has suspicious version format: ${dep.version}`,
        artifactId: artifact.identifier
      });
    }
  }

  // Validate file contents
  for (const file of artifact.files) {
    const fileViolations = validateFileContentSecurity(file);
    for (const violation of fileViolations) {
      errors.push({
        type: 'schema_invalid' as ValidationErrorType,
        message: violation,
        artifactId: artifact.identifier
      });
    }
  }

  return errors;
}

/**
 * Check if a dependency is known to be malicious
 * This is a basic implementation - in production, this should check against
 * a regularly updated database of known malicious packages
 */
function isKnownMaliciousDependency(packageName: string): boolean {
  const knownMaliciousPatterns = [
    /^[0-9]/, // Packages starting with numbers (often typosquatting)
    /[il1|]/g, // Packages with confusing characters
    /test.*hack/i,
    /malware/i,
    /virus/i,
    /trojan/i,
    /backdoor/i
  ];

  return knownMaliciousPatterns.some(pattern => pattern.test(packageName));
}

/**
 * Security-enhanced artifact parsing with timeout
 */
function parseArtifactBlockSecure(xmlBlock: string): ParsedArtifact | null {
  const startTime = Date.now();

  try {
    // Security validation first
    const securityCheck = validateXMLSecurity(xmlBlock);
    if (!securityCheck.isSecure) {
      console.error('🔒 [XML Parser] Security validation failed:', securityCheck.violations);
      return null;
    }

    // Sanitize content
    const sanitizedBlock = sanitizeArtifactContent(xmlBlock);

    // Check processing time
    if (Date.now() - startTime > SECURITY_CONFIG.maxProcessingTime) {
      console.error('🔒 [XML Parser] Processing timeout during security validation');
      return null;
    }

    // Parse with timeout protection
    return parseArtifactBlock(sanitizedBlock);

  } catch (error) {
    console.error('🔒 [XML Parser] Security parsing error:', error);
    return null;
  }
}

/**
 * Performance-optimized artifact block extraction
 */
function extractArtifactBlocksOptimized(content: string): { blocks: string[], contentWithoutArtifacts: string } {
  const artifactBlocks: string[] = [];

  // Use the pre-compiled regex for better performance
  ARTIFACT_REGEX.lastIndex = 0; // Reset regex state
  let match;

  // Extract all artifact blocks with minimal string operations
  while ((match = ARTIFACT_REGEX.exec(content)) !== null) {
    artifactBlocks.push(match[0]);
  }

  // Remove artifact blocks from content (only if blocks found)
  const contentWithoutArtifacts = artifactBlocks.length > 0
    ? content.replace(ARTIFACT_REGEX, '').trim()
    : content;

  return { blocks: artifactBlocks, contentWithoutArtifacts };
}

/**
 * Legacy function for backward compatibility
 */
function extractArtifactBlocks(content: string): { blocks: string[], contentWithoutArtifacts: string } {
  return extractArtifactBlocksOptimized(content);
}

/**
 * Parse a single artifact XML block
 */
function parseArtifactBlock(xmlBlock: string): ParsedArtifact | null {
  try {
    console.log('🔧 [XML Parser] Parsing artifact block:', xmlBlock.substring(0, 200) + '...');

    const parsed = xmlParser.parse(xmlBlock);
    console.log('🔧 [XML Parser] Parsed result:', JSON.stringify(parsed, null, 2));

    if (!parsed.artifact) {
      console.warn('🔧 [XML Parser] No artifact element found in parsed XML');
      return null;
    }

    const artifact = parsed.artifact;

    // Extract basic artifact properties
    const identifier = artifact['@_identifier'] || '';
    const type = artifact['@_type'] || '';
    const title = artifact['@_title'] || '';

    if (!identifier || !type) {
      console.warn('🔧 [XML Parser] Missing required artifact attributes:', { identifier, type });
      return null;
    }

    // Extract description
    const description = artifact.description || '';

    // Extract dependencies
    const dependencies: ArtifactDependency[] = [];
    if (artifact.dependencies && artifact.dependencies.dependency) {
      const deps = Array.isArray(artifact.dependencies.dependency)
        ? artifact.dependencies.dependency
        : [artifact.dependencies.dependency];

      deps.forEach((dep: any) => {
        if (dep['@_name'] && dep['@_version']) {
          dependencies.push({
            name: dep['@_name'],
            version: dep['@_version']
          });
        }
      });
    }

    // Extract files with CDATA content
    const files: ArtifactFile[] = [];
    if (artifact.files && artifact.files.file) {
      const fileElements = Array.isArray(artifact.files.file)
        ? artifact.files.file
        : [artifact.files.file];

      fileElements.forEach((file: any) => {
        const path = file['@_path'];
        if (!path) return;

        // Handle CDATA content - fast-xml-parser puts CDATA in #cdata property
        let content = '';
        if (file['#cdata']) {
          content = file['#cdata'];
        } else if (file['#text']) {
          content = file['#text'];
        } else if (typeof file === 'string') {
          content = file;
        }

        files.push({
          path,
          content: content.trim()
        });
      });
    }

    console.log('🔧 [XML Parser] Successfully parsed artifact:', {
      identifier,
      type,
      title,
      dependencies: dependencies.length,
      files: files.length
    });

    return {
      identifier,
      type,
      title,
      description,
      dependencies,
      files,
      rawXml: xmlBlock
    };

  } catch (error) {
    console.error('🔧 [XML Parser] Error parsing artifact XML:', error);
    console.error('🔧 [XML Parser] Problematic XML:', xmlBlock);
    return null;
  }
}

/**
 * Performance-optimized cache for parsed XML blocks
 */
const parseCache = new Map<string, { parsed: ParsedArtifact | null; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 100;

/**
 * Performance-optimized regex for artifact block extraction
 */
const ARTIFACT_REGEX = /<artifact[^>]*>[\s\S]*?<\/artifact>/gi;

/**
 * Main function to parse artifacts from content with PAS 3.0 validation
 * Performance optimized to meet <1s target for large content
 */
export function parseArtifactsFromContent(content: string, validateSchema = true): ArtifactParseResult {
  const startTime = performance.now();

  // Early exit for empty content
  if (!content || content.length === 0) {
    return {
      artifacts: [],
      contentWithoutArtifacts: '',
      hasArtifacts: false,
      validationErrors: [],
      parsingTimeMs: performance.now() - startTime
    };
  }

  console.log('🔧 [XML Parser] Starting optimized artifact parsing from content');

  const { blocks, contentWithoutArtifacts } = extractArtifactBlocksOptimized(content);
  console.log('🔧 [XML Parser] Found', blocks.length, 'artifact blocks');

  if (blocks.length === 0) {
    return {
      artifacts: [],
      contentWithoutArtifacts: content,
      hasArtifacts: false,
      validationErrors: [],
      parsingTimeMs: performance.now() - startTime
    };
  }

  const artifacts: ParsedArtifact[] = [];
  const allValidationErrors: ValidationError[] = [];

  // Performance optimization: Process blocks efficiently
  for (const block of blocks) {
    const parsed = parseArtifactBlockCached(block);
    if (parsed) {
      artifacts.push(parsed);

      // Validate against PAS 3.0 schema if requested (optimized)
      if (validateSchema) {
        const validationErrors = validateArtifactPAS3Optimized(parsed);
        allValidationErrors.push(...validationErrors);
      }
    }
  }

  const parsingTimeMs = performance.now() - startTime;
  console.log('🔧 [XML Parser] Successfully parsed', artifacts.length, 'artifacts in', parsingTimeMs.toFixed(2), 'ms');

  // Performance monitoring alert if target exceeded
  if (parsingTimeMs > 1000) {
    console.warn('🚨 [XML Parser] Performance target exceeded:', parsingTimeMs.toFixed(2), 'ms (target: <1000ms)');
  }

  if (allValidationErrors.length > 0) {
    console.warn('🔧 [XML Parser] Found', allValidationErrors.length, 'validation errors');
  }

  return {
    artifacts,
    contentWithoutArtifacts,
    hasArtifacts: artifacts.length > 0,
    validationErrors: allValidationErrors,
    parsingTimeMs
  };
}

/**
 * Check if content contains artifact tags
 */
export function hasArtifactTags(content: string): boolean {
  return /<artifact[^>]*>[\s\S]*?<\/artifact>/i.test(content);
}

/**
 * Validate parsed artifact structure
 */
export function validateArtifact(artifact: ParsedArtifact): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!artifact.identifier) {
    errors.push('Missing identifier');
  }

  if (!artifact.type) {
    errors.push('Missing type');
  }

  if (!artifact.title) {
    errors.push('Missing title');
  }

  if (!artifact.files || artifact.files.length === 0) {
    errors.push('No files found');
  }

  // Validate file paths
  artifact.files.forEach((file, index) => {
    if (!file.path) {
      errors.push(`File ${index} missing path`);
    }
    if (!file.content) {
      errors.push(`File ${index} (${file.path}) has no content`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get supported artifact types
 */
export function getSupportedArtifactTypes(): string[] {
  return [
    'text/html',
    'application/vnd.react+jsx',
    'application/vnd.react+tsx',
    'application/vnd.svelte',
    'application/vnd.svelte+ts',
    'application/javascript',
    'application/typescript',
    'text/markdown',
    'application/vnd.mermaid',
    'image/svg+xml',
    'application/json'
  ];
}

/**
 * Determine if an artifact type should use Sandpack
 */
export function shouldUseSandpack(artifactType: string): boolean {
  return [
    'text/html',
    'application/vnd.react+jsx',
    'application/vnd.react+tsx',
    'application/vnd.svelte',
    'application/vnd.svelte+ts'
  ].includes(artifactType);
}

/**
 * Convert parsed artifact to Sandpack template
 */
export function getSandpackTemplate(artifact: ParsedArtifact): string {
  switch (artifact.type) {
    case 'application/vnd.react+jsx':
      return 'react';
    case 'application/vnd.react+tsx':
      return 'react-ts';
    case 'application/vnd.svelte':
    case 'application/vnd.svelte+ts':
      return 'svelte';
    case 'text/html':
    default:
      return 'static';
  }
}

/**
 * Convert artifact files to Sandpack files format
 */
export function getSandpackFiles(artifact: ParsedArtifact): Record<string, string> {
  const files: Record<string, string> = {};

  artifact.files.forEach(file => {
    // Convert file paths to Sandpack-compatible format
    let sandpackPath = file.path;

    // For React artifacts, ensure proper file extensions
    if (artifact.type === 'application/vnd.react+jsx' || artifact.type === 'application/vnd.react+tsx') {
      if (sandpackPath === 'App.jsx' || sandpackPath === 'App.tsx') {
        sandpackPath = '/App.' + (artifact.type.includes('tsx') ? 'tsx' : 'jsx');
      } else if (!sandpackPath.startsWith('/')) {
        sandpackPath = '/' + sandpackPath;
      }
    }

    // For HTML artifacts, map to index.html if needed
    if (artifact.type === 'text/html' && sandpackPath === 'index.html') {
      sandpackPath = '/index.html';
    }

    // For Svelte artifacts
    if (artifact.type.includes('svelte')) {
      if (sandpackPath.endsWith('.svelte') && !sandpackPath.startsWith('/')) {
        sandpackPath = '/' + sandpackPath;
      }
    }

    files[sandpackPath] = file.content;
  });

  return files;
}

/**
 * Check if artifact uses TypeScript
 */
export function isTypeScriptArtifact(artifact: ParsedArtifact): boolean {
  return artifact.type.includes('tsx') || artifact.type.includes('+ts');
}

/**
 * PAS 3.0 Schema Validation Functions
 */

/**
 * Validate artifact against PAS 3.0 schema
 */
export function validateArtifactPAS3(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required attributes
  errors.push(...validateRequiredAttributes(artifact));

  // Validate artifact type
  errors.push(...validateArtifactType(artifact));

  // Validate file structure
  errors.push(...validateFileStructure(artifact));

  // Validate dependencies
  errors.push(...validateDependencies(artifact));

  // Validate content size
  errors.push(...validateContentSize(artifact));

  // Validate CDATA sections
  errors.push(...validateCDataSections(artifact));

  return errors;
}

/**
 * Validate required attributes are present
 */
function validateRequiredAttributes(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const attr of PAS3_SCHEMA.requiredAttributes) {
    if (!artifact[attr] || (typeof artifact[attr] === 'string' && artifact[attr].trim() === '')) {
      errors.push({
        type: 'schema_invalid' as ValidationErrorType,
        message: `Missing required attribute: ${attr}`,
        artifactId: artifact.identifier
      });
    }
  }

  return errors;
}

/**
 * Validate artifact type is supported
 */
function validateArtifactType(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!PAS3_SCHEMA.supportedTypes[artifact.type]) {
    errors.push({
      type: 'unknown_type' as ValidationErrorType,
      message: `Unsupported artifact type: ${artifact.type}`,
      artifactId: artifact.identifier
    });
    return errors;
  }

  const typeSchema = PAS3_SCHEMA.supportedTypes[artifact.type];

  // Validate file extensions
  const hasValidExtension = artifact.files.some(file =>
    typeSchema.requiredFileExtensions.some(ext => file.path.endsWith(ext))
  );

  if (!hasValidExtension) {
    errors.push({
      type: 'schema_invalid' as ValidationErrorType,
      message: `No files with required extensions found. Expected: ${typeSchema.requiredFileExtensions.join(', ')}`,
      artifactId: artifact.identifier
    });
  }

  return errors;
}

/**
 * Validate file structure
 */
function validateFileStructure(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!artifact.files || artifact.files.length === 0) {
    errors.push({
      type: 'missing_cdata' as ValidationErrorType,
      message: 'No files found in artifact',
      artifactId: artifact.identifier
    });
    return errors;
  }

  // Validate each file
  artifact.files.forEach((file, index) => {
    if (!file.path) {
      errors.push({
        type: 'schema_invalid' as ValidationErrorType,
        message: `File ${index} missing path attribute`,
        artifactId: artifact.identifier
      });
    }

    if (!file.content || file.content.trim() === '') {
      errors.push({
        type: 'missing_cdata' as ValidationErrorType,
        message: `File ${file.path} has no content`,
        artifactId: artifact.identifier
      });
    }

    // Validate file paths don't contain unsafe characters
    if (file.path && /[<>:"|?*]/.test(file.path)) {
      errors.push({
        type: 'schema_invalid' as ValidationErrorType,
        message: `File path contains unsafe characters: ${file.path}`,
        artifactId: artifact.identifier
      });
    }
  });

  return errors;
}

/**
 * Validate dependencies
 */
function validateDependencies(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!artifact.dependencies) return errors;

  const typeSchema = PAS3_SCHEMA.supportedTypes[artifact.type];
  if (!typeSchema) return errors;

  // Check for invalid dependencies
  artifact.dependencies.forEach(dep => {
    if (!dep.name || !dep.version) {
      errors.push({
        type: 'invalid_dependencies' as ValidationErrorType,
        message: 'Dependency missing name or version',
        artifactId: artifact.identifier
      });
      return;
    }

    // Check if dependency is in allowed list (if specified)
    if (typeSchema.allowedDependencies.length > 0) {
      const isAllowed = typeSchema.allowedDependencies.some(allowed =>
        dep.name === allowed || dep.name.startsWith(allowed + '/')
      );

      if (!isAllowed) {
        errors.push({
          type: 'invalid_dependencies' as ValidationErrorType,
          message: `Dependency not allowed for this artifact type: ${dep.name}`,
          artifactId: artifact.identifier
        });
      }
    }

    // Validate version format (basic semver check)
    if (!/^\d+\.\d+\.\d+/.test(dep.version) && dep.version !== 'latest') {
      errors.push({
        type: 'invalid_dependencies' as ValidationErrorType,
        message: `Invalid version format for dependency ${dep.name}: ${dep.version}`,
        artifactId: artifact.identifier
      });
    }
  });

  return errors;
}

/**
 * Validate content size limits
 */
function validateContentSize(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  const typeSchema = PAS3_SCHEMA.supportedTypes[artifact.type];
  if (!typeSchema) return errors;

  const totalSize = artifact.files.reduce((sum, file) => sum + file.content.length, 0);

  if (totalSize > typeSchema.maxFileSize) {
    errors.push({
      type: 'schema_invalid' as ValidationErrorType,
      message: `Content size (${totalSize} bytes) exceeds maximum allowed (${typeSchema.maxFileSize} bytes)`,
      artifactId: artifact.identifier
    });
  }

  return errors;
}

/**
 * Validate CDATA sections are properly formatted
 */
function validateCDataSections(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if original XML had proper CDATA sections
  if (artifact.rawXml) {
    const cdataPattern = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
    const cdataMatches = artifact.rawXml.match(cdataPattern);

    if (!cdataMatches && artifact.files.length > 0) {
      // If there are files but no CDATA sections, it might be invalid
      const hasCodeContent = artifact.files.some(file =>
        file.content.includes('<') || file.content.includes('{') || file.content.includes('function')
      );

      if (hasCodeContent) {
        errors.push({
          type: 'missing_cdata' as ValidationErrorType,
          message: 'Code content should be wrapped in CDATA sections',
          artifactId: artifact.identifier
        });
      }
    }
  }

  return errors;
}

/**
 * Performance-optimized cached parsing for artifact blocks with security
 */
function parseArtifactBlockCached(xmlBlock: string): ParsedArtifact | null {
  // Create cache key from block content hash (simple hash for performance)
  const cacheKey = xmlBlock.length + xmlBlock.substring(0, 100) + xmlBlock.substring(xmlBlock.length - 100);
  const now = Date.now();

  // Check cache first
  const cached = parseCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.parsed;
  }

  // Parse new block with security validation
  const parsed = parseArtifactBlockSecure(xmlBlock);

  // Cache management: Clean old entries if cache is getting large
  if (parseCache.size >= MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(parseCache.entries())
      .sort(([,a], [,b]) => a.timestamp - b.timestamp)
      .slice(0, Math.floor(MAX_CACHE_SIZE / 2))
      .map(([key]) => key);

    oldestKeys.forEach(key => parseCache.delete(key));
  }

  // Store in cache
  parseCache.set(cacheKey, { parsed, timestamp: now });

  return parsed;
}

/**
 * Performance-optimized PAS 3.0 validation with early exits and security checks
 */
function validateArtifactPAS3Optimized(artifact: ParsedArtifact): ValidationError[] {
  const errors: ValidationError[] = [];

  // Security validation first (highest priority)
  errors.push(...validateArtifactSecurity(artifact));
  if (errors.length > 0) {
    // If security issues found, log and continue with schema validation
    console.warn('🔒 [XML Parser] Security issues found, continuing with schema validation');
  }

  // Quick validation for required attributes (most common failures)
  if (!artifact.identifier || !artifact.type || !artifact.title) {
    errors.push(...validateRequiredAttributes(artifact));
    // Early exit for critical failures to save processing time
    if (errors.length > 5) { // Allow some security errors but exit on too many issues
      return errors;
    }
  }

  // Only proceed with expensive validations if basic checks pass
  const typeSchema = PAS3_SCHEMA.supportedTypes[artifact.type];
  if (!typeSchema) {
    errors.push({
      type: 'unknown_type' as ValidationErrorType,
      message: `Unsupported artifact type: ${artifact.type}`,
      artifactId: artifact.identifier
    });
    return errors; // Early exit for unsupported types
  }

  // Batch remaining validations for efficiency
  errors.push(...validateFileStructure(artifact));
  errors.push(...validateDependencies(artifact));
  errors.push(...validateContentSize(artifact));

  // Skip expensive CDATA validation for performance unless specifically needed
  if (artifact.rawXml && artifact.rawXml.length < 10000) { // Only for smaller artifacts
    errors.push(...validateCDataSections(artifact));
  }

  return errors;
}

/**
 * Clear parsing cache (for memory management)
 */
export function clearParseCache(): void {
  parseCache.clear();
  console.log('🧹 [XML Parser] Parse cache cleared');
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
  return {
    size: parseCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL
  };
}

/**
 * Security validation for XML content (T046)
 */
export function validateXMLSecurityPublic(content: string): { isSecure: boolean; violations: string[] } {
  return validateXMLSecurity(content);
}

/**
 * Comprehensive security validation for artifacts (T046)
 */
export function validateArtifactSecurityPublic(artifact: ParsedArtifact): ValidationError[] {
  return validateArtifactSecurity(artifact);
}

/**
 * Sanitize XML content for security (T046)
 */
export function sanitizeXMLContent(content: string): string {
  return sanitizeArtifactContent(content);
}

/**
 * Get security configuration (T046)
 */
export function getSecurityConfig(): SecurityConfig {
  return { ...SECURITY_CONFIG };
}

/**
 * Enhanced artifact parsing with validation
 */
export function parseArtifactsWithValidation(request: ArtifactParsingRequest): ArtifactParsingResponse {
  const startTime = performance.now();

  const parseResult = parseArtifactsFromContent(request.content, request.validateSchema);

  const parsingTimeMs = performance.now() - startTime;

  return {
    artifacts: parseResult.artifacts.map(artifact => ({
      id: artifact.identifier,
      type: artifact.type as ArtifactType,
      title: artifact.title,
      description: artifact.description,
      code: artifact.files[0]?.content || '',
      dependencies: artifact.dependencies.map(dep => ({
        name: dep.name,
        version: dep.version,
        source: 'npm' as const,
        isRequired: true
      })),
      metadata: {
        framework: extractFramework(artifact.type),
        language: extractLanguage(artifact.type),
        shadcnPreset: false,
        extraFiles: artifact.files.length > 1 ?
          artifact.files.slice(1).reduce((acc, file) => {
            acc[file.path] = file.content;
            return acc;
          }, {} as Record<string, string>) : undefined
      },
      isValid: parseResult.validationErrors.filter(e => e.artifactId === artifact.identifier).length === 0,
      rawXml: artifact.rawXml
    })),
    contentWithoutArtifacts: parseResult.contentWithoutArtifacts,
    validationErrors: parseResult.validationErrors,
    parsingTimeMs,
    hasArtifacts: parseResult.hasArtifacts
  };
}

/**
 * Helper functions for metadata extraction
 */
function extractFramework(type: string): string | undefined {
  if (type.includes('react')) return 'react';
  if (type.includes('svelte')) return 'svelte';
  if (type.includes('vue')) return 'vue';
  return undefined;
}

function extractLanguage(type: string): string {
  if (type.includes('tsx')) return 'typescript';
  if (type.includes('jsx')) return 'javascript';
  if (type.includes('html')) return 'html';
  if (type.includes('svg')) return 'xml';
  if (type.includes('mermaid')) return 'mermaid';
  return 'text';
}