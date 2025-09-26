/**
 * Enhanced Artifact Types
 * Extended type definitions for the enhanced artifact system
 */

// Re-export contract types
export {
	type ArtifactParsingRequest,
	type ArtifactParsingResponse,
	type ParsedArtifact,
	type ArtifactDependency,
	type ArtifactMetadata,
	type ValidationError,
	ArtifactType,
	ValidationErrorType,
	type IArtifactParser,
	ArtifactParsingError
} from '../../specs/001-create-and-or/contracts/artifact-parser';

/**
 * Enhanced artifact metadata with additional fields
 */
export interface EnhancedArtifactMetadata extends ArtifactMetadata {
	pasVersion?: string;          // PAS version (3.0, etc.)
	createdAt: Date;             // Creation timestamp
	updatedAt?: Date;            // Last update timestamp
	author?: string;             // Creator information
	tags: string[];              // Classification tags
	complexity: ComplexityLevel; // Code complexity level
	fileSize: number;           // Size in bytes
	lineCount: number;          // Number of lines
	hasTests?: boolean;         // Whether tests are included
	performance?: PerformanceHints; // Performance characteristics
}

export enum ComplexityLevel {
	SIMPLE = 'simple',     // Basic components
	MODERATE = 'moderate', // Components with state/logic
	COMPLEX = 'complex',   // Advanced patterns
	ADVANCED = 'advanced'  // Highly complex implementations
}

export interface PerformanceHints {
	bundleSize?: number;        // Estimated bundle size in KB
	renderTime?: number;        // Expected render time in ms
	memoryUsage?: number;       // Memory usage in MB
	optimizationLevel: 'low' | 'medium' | 'high';
}

/**
 * Enhanced parsed artifact with additional functionality
 */
export interface EnhancedParsedArtifact extends ParsedArtifact {
	metadata: EnhancedArtifactMetadata;
	validationStatus: ValidationStatus;
	renderingState: RenderingState;
	previewUrl?: string;         // Generated preview URL
	thumbnailUrl?: string;       // Thumbnail image URL
	parentId?: string;          // Parent artifact if this is a variant
	variants: string[];         // IDs of variant artifacts
	usage: UsageMetrics;        // Usage tracking
}

export interface ValidationStatus {
	isValid: boolean;
	lastValidated: Date;
	validationVersion: string;
	schemaErrors: ValidationError[];
	lintWarnings: LintWarning[];
	securityIssues: SecurityIssue[];
}

export interface LintWarning {
	rule: string;
	message: string;
	line?: number;
	column?: number;
	severity: 'warning' | 'error' | 'info';
}

export interface SecurityIssue {
	type: SecurityIssueType;
	severity: SecuritySeverity;
	message: string;
	line?: number;
	recommendation: string;
}

export enum SecurityIssueType {
	XSS_VULNERABILITY = 'xss_vulnerability',
	UNSAFE_HTML = 'unsafe_html',
	EXTERNAL_SCRIPT = 'external_script',
	UNSAFE_EVAL = 'unsafe_eval',
	INSECURE_URL = 'insecure_url'
}

export enum SecuritySeverity {
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical'
}

export interface RenderingState {
	status: RenderingStatus;
	lastRendered?: Date;
	renderTime?: number;
	error?: RenderingError;
	retryCount: number;
	isRetryable: boolean;
}

export enum RenderingStatus {
	NOT_RENDERED = 'not_rendered',
	QUEUED = 'queued',
	RENDERING = 'rendering',
	RENDERED = 'rendered',
	FAILED = 'failed',
	TIMEOUT = 'timeout'
}

export interface RenderingError {
	type: RenderingErrorType;
	message: string;
	stack?: string;
	timestamp: Date;
	recoverable: boolean;
}

export enum RenderingErrorType {
	COMPILATION_ERROR = 'compilation_error',
	RUNTIME_ERROR = 'runtime_error',
	DEPENDENCY_ERROR = 'dependency_error',
	TIMEOUT_ERROR = 'timeout_error',
	SECURITY_ERROR = 'security_error',
	NETWORK_ERROR = 'network_error'
}

export interface UsageMetrics {
	viewCount: number;
	renderCount: number;
	errorCount: number;
	averageRenderTime: number;
	lastAccessed: Date;
	popularityScore: number;
}

/**
 * Artifact collection and management types
 */
export interface ArtifactCollection {
	id: string;
	name: string;
	description?: string;
	artifacts: string[]; // Artifact IDs
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
	isPublic: boolean;
	owner?: string;
}

export interface ArtifactSearchOptions {
	query?: string;
	type?: ArtifactType;
	tags?: string[];
	complexity?: ComplexityLevel;
	dateRange?: {
		from: Date;
		to: Date;
	};
	sortBy?: ArtifactSortField;
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

export enum ArtifactSortField {
	CREATED_AT = 'createdAt',
	UPDATED_AT = 'updatedAt',
	POPULARITY = 'popularityScore',
	COMPLEXITY = 'complexity',
	RENDER_TIME = 'averageRenderTime',
	NAME = 'title'
}

export interface ArtifactSearchResult {
	artifacts: EnhancedParsedArtifact[];
	totalCount: number;
	hasMore: boolean;
	searchTime: number;
}

/**
 * Preview generation types
 */
export interface PreviewGenerationRequest {
	artifact: EnhancedParsedArtifact;
	options: PreviewOptions;
}

export interface PreviewOptions {
	theme: 'light' | 'dark' | 'auto';
	viewport: ViewportSize;
	includeControls: boolean;
	autorun: boolean;
	showCode: boolean;
	generateThumbnail: boolean;
}

export interface ViewportSize {
	width: number;
	height: number;
	devicePixelRatio?: number;
}

export interface PreviewGenerationResult {
	success: boolean;
	previewUrl?: string;
	thumbnailUrl?: string;
	renderTime: number;
	error?: RenderingError;
}

/**
 * Artifact caching types
 */
export interface ArtifactCache {
	get(id: string): EnhancedParsedArtifact | null;
	set(id: string, artifact: EnhancedParsedArtifact, ttl?: number): void;
	delete(id: string): boolean;
	clear(): void;
	size(): number;
	keys(): string[];
}

export interface CacheConfig {
	maxSize: number;
	defaultTTL: number; // Time to live in milliseconds
	enableCompression: boolean;
	persistToDisk: boolean;
}

/**
 * Event types for artifact system
 */
export interface ArtifactEvents {
	'artifact_parsed': {
		artifact: EnhancedParsedArtifact;
		parseTime: number;
	};
	'artifact_rendered': {
		artifactId: string;
		renderTime: number;
		success: boolean;
	};
	'artifact_error': {
		artifactId: string;
		error: RenderingError;
	};
	'artifact_cached': {
		artifactId: string;
		cacheSize: number;
	};
	'artifact_updated': {
		artifactId: string;
		changes: Partial<EnhancedParsedArtifact>;
	};
}

/**
 * Factory and service interfaces
 */
export interface EnhancedArtifactFactory {
	createFromXML(xml: string): Promise<EnhancedParsedArtifact>;
	createFromCode(code: string, type: ArtifactType): Promise<EnhancedParsedArtifact>;
	enhance(artifact: ParsedArtifact): EnhancedParsedArtifact;
}

export interface ArtifactRepository {
	save(artifact: EnhancedParsedArtifact): Promise<void>;
	findById(id: string): Promise<EnhancedParsedArtifact | null>;
	search(options: ArtifactSearchOptions): Promise<ArtifactSearchResult>;
	delete(id: string): Promise<boolean>;
	update(id: string, updates: Partial<EnhancedParsedArtifact>): Promise<void>;
}

/**
 * Type guards and utilities
 */
export function isEnhancedArtifact(obj: any): obj is EnhancedParsedArtifact {
	return obj &&
		typeof obj.id === 'string' &&
		obj.metadata &&
		obj.validationStatus &&
		obj.renderingState &&
		obj.usage;
}

export function isValidArtifactType(type: string): type is ArtifactType {
	return Object.values(ArtifactType).includes(type as ArtifactType);
}

/**
 * Default configurations
 */
export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
	theme: 'auto',
	viewport: { width: 800, height: 600 },
	includeControls: true,
	autorun: true,
	showCode: false,
	generateThumbnail: true
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
	maxSize: 100, // Maximum number of cached artifacts
	defaultTTL: 3600000, // 1 hour in milliseconds
	enableCompression: true,
	persistToDisk: false
};