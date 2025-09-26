/**
 * Sandpack Renderer Service Contract
 * Handles interactive code preview rendering with retry loop prevention
 */

export interface SandpackRenderRequest {
  artifact: ParsedArtifact;
  containerId: string;
  options?: SandpackOptions;
}

export interface SandpackRenderResponse {
  success: boolean;
  renderTimeMs: number;
  errorMessage?: string;
  retryCount: number;
}

export interface SandpackOptions {
  template?: string;
  theme?: 'light' | 'dark' | 'auto';
  showNavigator?: boolean;
  showTabs?: boolean;
  autorun?: boolean;
  timeout?: number; // Loading timeout in ms
}

export interface RendererState {
  status: RendererStatus;
  artifactId: string;
  loadStartTime?: Date;
  lastError?: RendererError;
  retryAttempts: number;
}

export interface RendererError {
  type: RendererErrorType;
  message: string;
  timestamp: Date;
  isRecoverable: boolean;
}

export enum RendererStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export enum RendererErrorType {
  TIMEOUT = 'timeout',
  NETWORK_ERROR = 'network_error',
  COMPILATION_ERROR = 'compilation_error',
  DEPENDENCY_ERROR = 'dependency_error',
  SECURITY_ERROR = 'security_error'
}

/**
 * Service interface for Sandpack rendering
 */
export interface ISandpackRenderer {
  /**
   * Render an artifact in a Sandpack container
   * @param request - Render request with artifact and options
   * @returns Promise resolving to render result
   * @throws SandpackTimeoutError if loading exceeds timeout
   */
  render(request: SandpackRenderRequest): Promise<SandpackRenderResponse>;

  /**
   * Get current renderer state for an artifact
   * @param artifactId - ID of artifact to check
   * @returns Current renderer state or null if not found
   */
  getState(artifactId: string): RendererState | null;

  /**
   * Retry rendering for a failed artifact
   * @param artifactId - ID of artifact to retry
   * @returns Promise resolving to retry result
   */
  retry(artifactId: string): Promise<SandpackRenderResponse>;

  /**
   * Clear renderer state and stop any ongoing renders
   * @param artifactId - ID of artifact to clear
   */
  clear(artifactId: string): void;

  /**
   * Check if retry is allowed for an artifact
   * @param artifactId - ID of artifact to check
   * @returns Whether retry is allowed
   */
  canRetry(artifactId: string): boolean;
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  timeoutMs: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  timeoutMs: 30000,
  backoffMultiplier: 2,
  circuitBreakerThreshold: 5
};

/**
 * Custom error for timeout scenarios
 */
export class SandpackTimeoutError extends Error {
  constructor(artifactId: string, timeoutMs: number) {
    super(`Sandpack rendering timed out for artifact ${artifactId} after ${timeoutMs}ms`);
    this.name = 'SandpackTimeoutError';
  }
}

/**
 * Custom error for retry limit exceeded
 */
export class SandpackRetryLimitError extends Error {
  constructor(artifactId: string, maxAttempts: number) {
    super(`Retry limit exceeded for artifact ${artifactId} (${maxAttempts} attempts)`);
    this.name = 'SandpackRetryLimitError';
  }
}