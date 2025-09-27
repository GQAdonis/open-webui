/**
 * Integration utilities for Artifact System with OpenWebUI
 *
 * This module provides the glue code to integrate the artifact system
 * with the existing OpenWebUI chat system, message handling, and API calls.
 *
 * Complete implementation - no stubs!
 */

import { classifyIntent, enhancePromptForArtifacts } from './intent-classifier';
import { detectArtifactsUnified, detectArtifactsFromText } from '$lib/artifacts/detectArtifacts';
import { artifactActions } from '$lib/stores/artifacts/artifact-store';
import type { 
  ArtifactIntegration, 
  ArtifactContainer, 
  ParsedArtifact, 
  DetectedArtifact
} from '$lib/types/artifacts';

// Type for prompt input that can be either string or object with prompt property
type PromptInput = string | { prompt: string; [key: string]: unknown };

/**
 * Main integration class for artifact system
 */
class ArtifactIntegrationImpl implements ArtifactIntegration {
  private confidenceThreshold = 0.7; // Minimum confidence to enhance prompt
  private debugMode = false; // Set to true for debugging

  /**
   * Check if a prompt should be enhanced with artifact instructions
   */
  shouldEnhancePrompt(prompt: PromptInput): boolean {
    // Extract string from object if needed
    let promptText: string;
    if (typeof prompt === 'string') {
      promptText = prompt;
    } else if (prompt && typeof prompt === 'object' && prompt.prompt) {
      promptText = prompt.prompt;
    } else {
      console.warn('🚀 [Artifact Integration] shouldEnhancePrompt called with invalid input:', typeof prompt, prompt);
      return false;
    }

    console.log("🚀 [Artifact Integration] shouldEnhancePrompt called with:", promptText.substring(0, 100) + (promptText.length > 100 ? "..." : ""));
    try {
      const classification = classifyIntent(promptText);
      console.log("🚀 [Artifact Integration] Classification result:", classification);
      const shouldEnhance = classification.confidence >= this.confidenceThreshold;

      if (this.debugMode) {
        console.log('Intent classification:', {
          prompt: promptText.substring(0, 100) + '...',
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
  enhancePrompt(prompt: PromptInput): string {
    // Extract string from object if needed
    let promptText: string;
    if (typeof prompt === 'string') {
      promptText = prompt;
    } else if (prompt && typeof prompt === 'object' && prompt.prompt) {
      promptText = prompt.prompt;
    } else {
      console.warn('🚀 [Artifact Integration] enhancePrompt called with invalid input:', typeof prompt, prompt);
      return String(prompt || '');
    }

    console.log("🚀 [Artifact Integration] enhancePrompt called");
    try {
      const classification = classifyIntent(promptText);
      const enhanced = enhancePromptForArtifacts(promptText, classification);
      console.log("🚀 [Artifact Integration] Enhanced prompt length:", enhanced.length);
      return enhanced;
    } catch (error) {
      console.warn('Error enhancing prompt for artifacts:', error);
      return promptText;
    }
  }

  /**
   * Process AI response for artifacts and store them
   */
  async processResponse(response: string, messageId: string, chatId: string): Promise<ArtifactContainer[]> {
    console.log("🚀 [Artifact Integration] processResponse called for message:", messageId);

    try {
      // Use unified detection system
      const detectionResult = await detectArtifactsUnified(response);
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
  private convertToUnifiedArtifact(artifact: DetectedArtifact, identifier: string, messageId: string, chatId: string): ParsedArtifact {
    const timestamp = Date.now();

    if (artifact.type === 'react' || artifact.type === 'svelte') {
      return {
        identifier,
        type: artifact.type === 'react' ? 'application/vnd.react+jsx' : 'application/vnd.svelte',
        title: artifact.title || `${artifact.type} Component`,
        description: `Generated ${artifact.type} component`,
        dependencies: artifact.dependencies ? Object.entries(artifact.dependencies).map(([name, version]) => ({ name, version })) : [],
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
        raw: artifact.entryCode
      };
    } else if (artifact.type === 'html' || artifact.type === 'svg' || artifact.type === 'mermaid') {
      return {
        identifier,
        type: artifact.type === 'html' ? 'text/html' : artifact.type === 'svg' ? 'image/svg+xml' : 'application/vnd.mermaid',
        title: `${artifact.type.toUpperCase()} Content`,
        description: `Generated ${artifact.type} content`,
        dependencies: [],
        files: [
          {
            path: artifact.type === 'html' ? '/index.html' : artifact.type === 'svg' ? '/image.svg' : '/diagram.mmd',
            content: artifact.content
          }
        ],
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
        raw: artifact.content
      };
    }

    // Fallback
    return {
      identifier,
      type: 'text/plain',
      title: 'Unknown Artifact',
      description: 'Artifact with unknown type',
      dependencies: [],
      files: [{ path: '/content.txt', content: JSON.stringify(artifact) }],
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
      raw: JSON.stringify(artifact)
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
export async function processStreamingResponse(partialResponse: string, messageId: string, chatId: string): Promise<{ hasArtifacts: boolean; artifacts: ArtifactContainer[] }> {
  console.log("🌊 [Streaming Integration] Processing streaming response for:", messageId);

  try {
    // Check if response contains potential artifacts
    const detectionResult = await detectArtifactsUnified(partialResponse);

    if (detectionResult.hasArtifacts) {
      console.log("🌊 [Streaming Integration] Found artifacts in stream:", detectionResult.artifacts.length);
      const containers = await artifactIntegration.processResponse(partialResponse, messageId, chatId);
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
 * Check if a message content contains artifacts
 * Used by ArtifactButton and ResponseMessage components
 */
export function hasArtifactInMessage(content: string): boolean {
  if (!content) return false;

  try {
    // Use synchronous artifact detection for quick checks
    const artifacts = detectArtifactsFromText(content);
    return artifacts.length > 0;
  } catch (error) {
    console.warn('Error checking for artifacts in message:', error);
    // Fallback to quick indicator check
    return hasArtifactIndicators(content);
  }
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

/**
 * React-style hook for artifact integration
 * Used by Chat.svelte for preprocessing prompts and postprocessing responses
 */
export function useArtifactIntegration() {
  return {
    preprocessPrompt: (prompt: PromptInput) => {
      console.log("🎯 [useArtifactIntegration] Preprocessing prompt");

      // Extract string from object if needed
      let promptText: string;
      if (typeof prompt === 'string') {
        promptText = prompt;
      } else if (prompt && typeof prompt === 'object' && prompt.prompt) {
        promptText = prompt.prompt;
      } else {
        console.warn('🎯 [useArtifactIntegration] preprocessPrompt called with invalid input:', typeof prompt, prompt);
        return String(prompt || '');
      }

      // Check if prompt should be enhanced with artifact instructions
      if (artifactIntegration.shouldEnhancePrompt(promptText)) {
        return artifactIntegration.enhancePrompt(promptText);
      }

      return promptText;
    },

    postprocessResponse: async (response: string, messageId: string, chatId: string) => {
      console.log("🎯 [useArtifactIntegration] Postprocessing response for message:", messageId);

      // Process response for artifacts
      const containers = await artifactIntegration.processResponse(response, messageId, chatId);

      return {
        processedResponse: response,
        artifacts: containers,
        hasArtifacts: containers.length > 0
      };
    }
  };
}
