/**
 * Artifact Parser Service Contract
 * Extracts and validates PAS 3.0 XML artifacts from LLM responses
 */

export interface ArtifactParsingRequest {
  content: string;
  validateSchema: boolean;
  sessionId?: string;
}

export interface ArtifactParsingResponse {
  artifacts: ParsedArtifact[];
  contentWithoutArtifacts: string;
  validationErrors: ValidationError[];
  parsingTimeMs: number;
  hasArtifacts: boolean;
}

export interface ParsedArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  description?: string;
  code: string;
  dependencies: ArtifactDependency[];
  metadata: ArtifactMetadata;
  isValid: boolean;
  rawXml: string;
}

export interface ArtifactDependency {
  name: string;
  version: string;
  source: 'npm' | 'cdn' | 'local';
  isRequired: boolean;
}

export interface ArtifactMetadata {
  framework?: string;
  language: string;
  shadcnPreset?: boolean;
  extraFiles?: Record<string, string>;
  css?: string;
}

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  artifactId?: string;
  line?: number;
  column?: number;
}

export enum ArtifactType {
  REACT = 'react',
  SVELTE = 'svelte',
  HTML = 'html',
  SVG = 'svg',
  MERMAID = 'mermaid'
}

export enum ValidationErrorType {
  SCHEMA_INVALID = 'schema_invalid',
  MISSING_CDATA = 'missing_cdata',
  INVALID_DEPENDENCIES = 'invalid_dependencies',
  SYNTAX_ERROR = 'syntax_error',
  UNKNOWN_TYPE = 'unknown_type'
}

/**
 * Service interface for artifact parsing
 */
export interface IArtifactParser {
  /**
   * Parse artifacts from LLM response content
   * @param request - Parsing request with content and options
   * @returns Promise resolving to parsing results
   * @throws ArtifactParsingError if parsing fails completely
   */
  parseArtifacts(request: ArtifactParsingRequest): Promise<ArtifactParsingResponse>;

  /**
   * Validate a single artifact against PAS 3.0 schema
   * @param artifact - Artifact to validate
   * @returns Validation errors (empty array if valid)
   */
  validateArtifact(artifact: ParsedArtifact): ValidationError[];

  /**
   * Extract code blocks from content (fallback for non-XML artifacts)
   * @param content - Content to scan for code blocks
   * @returns Detected code block artifacts
   */
  extractCodeBlocks(content: string): ParsedArtifact[];
}

/**
 * Custom error for parsing failures
 */
export class ArtifactParsingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ArtifactParsingError';
  }
}