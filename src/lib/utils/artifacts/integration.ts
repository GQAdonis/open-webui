/**
 * Integration utilities for Artifact System with OpenWebUI
 *
 * This module provides the glue code to integrate the artifact system
 * with the existing OpenWebUI chat system, message handling, and API calls.
 *
 * Complete implementation - no stubs!
 */

import { get } from 'svelte/store';
import { chatId } from '$lib/stores';
import { classifyIntent, enhancePromptForArtifacts } from './intent-classifier';
import { detectArtifactsUnified, type DetectedArtifact, type ArtifactDetectionResult } from '$lib/artifacts/detectArtifacts';
import { artifactActions, type ArtifactContainer } from '$lib/stores/artifacts/artifact-store';

export interface ArtifactIntegration {
  shouldEnhancePrompt: (prompt: string) => boolean;
  enhancePrompt: (prompt: string) => string;
  processResponse: (response: string, messageId: string, chatId: string) => ArtifactContainer[];
  showArtifactButton: (messageId: string) => boolean;
}

/**
 * Main integration class for artifact system
 */
class ArtifactIntegrationImpl implements ArtifactIntegration {
  private confidenceThreshold = 0.7; // Minimum confidence to enhance prompt
  private debugMode = false; // Set to true for debugging

  /**
   * Check if a prompt should be enhanced with artifact instructions
   */
  shouldEnhancePrompt(prompt: string): boolean {
    console.log("🚀 [Artifact Integration] shouldEnhancePrompt called with:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
    try {
      const classification = classifyIntent(prompt);
      console.log("🚀 [Artifact Integration] Classification result:", classification);
      const shouldEnhance = classification.confidence >= this.confidenceThreshold;

      if (this.debugMode) {
        console.log('Intent classification:', {
          prompt: prompt.substring(0, 100) + '...',
          intent: classification.intent,
          confidence: classification.confidence,
          shouldEnhance
        });
      }

      return shouldEnhance;
    } catch (error) {
      console.warn('Error in artifact intent classification:', error);
      return false;
    }
  }

  /**
   * Enhance prompt with artifact generation instructions
   */
  enhancePrompt(prompt: string): string {
    console.log("🚀 [Artifact Integration] enhancePrompt called");
    try {
      const enhanced = enhancePromptForArtifacts(prompt);
      console.log("🚀 [Artifact Integration] Enhanced prompt length:", enhanced.length);
      return enhanced;
    } catch (error) {
      console.warn('Error enhancing prompt for artifacts:', error);
      return prompt;
    }
  }

  /**
   * Process AI response for artifacts and store them
   */
  processResponse(response: string, messageId: string, chatId: string): ArtifactContainer[] {
    console.log("🚀 [Artifact Integration] processResponse called for message:", messageId);

    try {
      // Use unified detection system
      const detectionResult = detectArtifactsUnified(response);
      console.log("🚀 [Artifact Integration] Detection result:", {
        hasArtifacts: detectionResult.hasArtifacts,
        totalArtifacts: detectionResult.artifacts.length,
        legacyCount: detectionResult.detectionMetadata.legacyCount,
        pas3Count: detectionResult.detectionMetadata.pas3Count,
        processingTime: detectionResult.detectionMetadata.processingTimeMs
      });

      if (!detectionResult.hasArtifacts) {
        return [];
      }

      // Convert detected artifacts to unified format and store them
      const containers: ArtifactContainer[] = [];

      detectionResult.artifacts.forEach((artifact, index) => {
        try {
          // Create a unique identifier for each artifact
          const identifier = `${messageId}-artifact-${index}`;

          // Convert to unified artifact format
          const unifiedArtifact = this.convertToUnifiedArtifact(artifact, identifier, messageId, chatId);

          // Store in artifact store
          artifactActions.addArtifact(unifiedArtifact, chatId, messageId);

          // Get the container that was just created
          const container = artifactActions.getArtifact(identifier);
          if (container) {
            containers.push(container);
            console.log("🚀 [Artifact Integration] Stored artifact:", identifier);
          }
        } catch (error) {
          console.error('Error processing individual artifact:', error, artifact);
        }
      });

      console.log("🚀 [Artifact Integration] Successfully processed", containers.length, "artifacts");
      return containers;

    } catch (error) {
      console.error('Error in artifact response processing:', error);
      return [];
    }
  }

  /**
   * Convert detected artifact to unified format for storage
   */
  private convertToUnifiedArtifact(artifact: DetectedArtifact, identifier: string, messageId: string, chatId: string): any {
    const timestamp = Date.now();

    if (artifact.type === 'react' || artifact.type === 'svelte') {
      return {
        identifier,
        type: artifact.type === 'react' ? 'application/vnd.react+jsx' : 'application/vnd.svelte',
        title: artifact.title || `${artifact.type} Component`,
        description: `Generated ${artifact.type} component`,
        files: [
          {
            path: artifact.type === 'react' ? '/App.jsx' : '/App.svelte',
            content: artifact.entryCode
          },
          ...(artifact.extraFiles ? Object.entries(artifact.extraFiles).map(([path, content]) => ({
            path: path.startsWith('/') ? path : `/${path}`,
            content
          })) : []),
          ...(artifact.css ? [{ path: '/styles.css', content: artifact.css }] : [])
        ],
        dependencies: artifact.dependencies ? Object.entries(artifact.dependencies).map(([name, version]) => ({ name, version })) : [],
        metadata: {
          style: 'legacy',
          originalFormat: 'code-block',
          createdAt: timestamp,
          updatedAt: timestamp,
          chatId,
          messageId,
          renderCount: 0,
          errorCount: 0
        },
        rawSource: artifact.entryCode,
        sourceFormat: 'legacy'
      };
    } else if (artifact.type === 'html' || artifact.type === 'svg' || artifact.type === 'mermaid') {
      return {
        identifier,
        type: artifact.type === 'html' ? 'text/html' : artifact.type === 'svg' ? 'image/svg+xml' : 'application/vnd.mermaid',
        title: `${artifact.type.toUpperCase()} Content`,
        description: `Generated ${artifact.type} content`,
        files: [
          {
            path: artifact.type === 'html' ? '/index.html' : artifact.type === 'svg' ? '/image.svg' : '/diagram.mmd',
            content: artifact.content
          }
        ],
        dependencies: [],
        metadata: {
          style: 'legacy',
          originalFormat: 'code-block',
          createdAt: timestamp,
          updatedAt: timestamp,
          chatId,
          messageId,
          renderCount: 0,
          errorCount: 0
        },
        rawSource: artifact.content,
        sourceFormat: 'legacy'
      };
    }

    // Fallback
    return {
      identifier,
      type: 'text/plain',
      title: 'Unknown Artifact',
      description: 'Artifact with unknown type',
      files: [{ path: '/content.txt', content: JSON.stringify(artifact) }],
      dependencies: [],
      metadata: {
        style: 'legacy',
        originalFormat: 'unknown',
        createdAt: timestamp,
        updatedAt: timestamp,
        chatId,
        messageId,
        renderCount: 0,
        errorCount: 0
      },
      rawSource: JSON.stringify(artifact),
      sourceFormat: 'legacy'
    };
  }

  /**
   * Check if a message should show artifact button
   */
  showArtifactButton(messageId: string): boolean {
    const artifacts = artifactActions.getMessageArtifacts(messageId);
    return artifacts.length > 0;
  }
}

// Create instance and export
export const artifactIntegration = new ArtifactIntegrationImpl();

/**
 * Process streaming response for artifacts
 * This is called during streaming to detect artifacts as they arrive
 */
export function processStreamingResponse(partialResponse: string, messageId: string, chatId: string): { hasArtifacts: boolean; artifacts: ArtifactContainer[] } {
  console.log("🌊 [Streaming Integration] Processing streaming response for:", messageId);

  try {
    // Check if response contains potential artifacts
    const detectionResult = detectArtifactsUnified(partialResponse);

    if (detectionResult.hasArtifacts) {
      console.log("🌊 [Streaming Integration] Found artifacts in stream:", detectionResult.artifacts.length);
      const containers = artifactIntegration.processResponse(partialResponse, messageId, chatId);
      return { hasArtifacts: true, artifacts: containers };
    }

    return { hasArtifacts: false, artifacts: [] };
  } catch (error) {
    console.error('Error processing streaming response:', error);
    return { hasArtifacts: false, artifacts: [] };
  }
}

/**
 * Check if content contains potential artifacts without full processing
 * Useful for quick checks during streaming
 */
export function hasArtifactIndicators(content: string): boolean {
  // Quick checks for artifact indicators
  const indicators = [
    '<artifact',
    '```jsx',
    '```tsx',
    '```react',
    '```svelte',
    '```html',
    '{"artifact"',
    'function ',
    'const ',
    'import ',
    'export ',
    '<div',
    '<script',
    '<style'
  ];

  return indicators.some(indicator => content.includes(indicator));
}

/**
 * Initialize artifact system for a chat session
 */
export function initializeArtifactSystem(chatId: string): void {
  console.log("🚀 [Artifact Integration] Initializing artifact system for chat:", chatId);

  // Load any persisted artifacts for this chat
  try {
    const chatArtifacts = artifactActions.getAllArtifacts().filter(container => container.chatId === chatId);
    console.log("🚀 [Artifact Integration] Loaded", chatArtifacts.length, "persisted artifacts for chat");
  } catch (error) {
    console.warn('Error loading persisted artifacts:', error);
  }
}

/**
 * Clean up artifact system for a chat session
 */
export function cleanupArtifactSystem(chatId: string): void {
  console.log("🚀 [Artifact Integration] Cleaning up artifact system for chat:", chatId);

  try {
    artifactActions.clearChatArtifacts(chatId);
    console.log("🚀 [Artifact Integration] Cleared artifacts for chat");
  } catch (error) {
    console.warn('Error cleaning up artifacts:', error);
  }
}

/**
 * Get artifacts for a specific message
 */
export function getMessageArtifacts(messageId: string): ArtifactContainer[] {
  return artifactActions.getMessageArtifacts(messageId);
}

/**
 * Get all artifacts for a chat
 */
export function getChatArtifacts(chatId: string): ArtifactContainer[] {
  return artifactActions.getAllArtifacts().filter(container => container.chatId === chatId);
}