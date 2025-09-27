/**
 * Common types for the Artifact System
 * 
 * This file contains shared type definitions used across the artifact system
 * to ensure consistency and avoid duplication.
 */

// Import types from other modules
import type { ParsedArtifact, ArtifactFile, ArtifactDependency } from '$lib/utils/artifacts/artifact-parser';
import type { ArtifactContainer } from '$lib/stores/artifacts/artifact-store';
import type { DetectedArtifact } from '$lib/artifacts/detectArtifacts';

/**
 * Interface for artifact integration functionality
 */
export interface ArtifactIntegration {
  shouldEnhancePrompt: (prompt: string) => boolean;
  enhancePrompt: (prompt: string) => string;
  processResponse: (response: string, messageId: string, chatId: string) => Promise<ArtifactContainer[]>;
  showArtifactButton: (messageId: string) => boolean;
}

/**
 * Re-export commonly used types from other modules
 */
export type { ParsedArtifact, ArtifactFile, ArtifactDependency, ArtifactContainer, DetectedArtifact };

/**
 * Streaming response result for artifacts
 */
export interface StreamingArtifactResult {
  hasArtifacts: boolean;
  artifacts: ArtifactContainer[];
}

/**
 * Artifact processing result
 */
export interface ArtifactProcessingResult {
  processedResponse: string;
  artifacts: ArtifactContainer[];
  hasArtifacts: boolean;
}

/**
 * Intent classification result for artifact enhancement
 */
export interface IntentClassification {
  intent: string;
  confidence: number;
  shouldEnhance?: boolean;
}
