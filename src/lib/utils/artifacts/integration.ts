/**
 * Integration utilities for Artifact System with OpenWebUI
 * 
 * This module provides the glue code to integrate the artifact system
 * with the existing OpenWebUI chat system, message handling, and API calls.
 */

import { get } from 'svelte/store';
import { chatId } from '$lib/stores';
import { classifyIntent, enhancePromptForArtifacts, type IntentClassificationResult } from './intent-classifier';
import { extractArtifacts, validateArtifact, type ParsedArtifact } from './artifact-parser';
import { artifactActions, type ArtifactContainer } from '$lib/stores/artifacts/artifact-store';

export interface ArtifactIntegration {
shouldEnhancePrompt: (prompt: string) => boolean;
enhancePrompt: (prompt: string) => string;
processResponse: (response: string, messageId: string) => ArtifactContainer[];
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
 * Enhance a prompt with artifact generation instructions
 */
enhancePrompt(prompt: string): string {
try {
const classification = classifyIntent(prompt);
    console.log("🚀 [Artifact Integration] Classification result:", classification);

if (classification.confidence < this.confidenceThreshold) {
return prompt;
}

const enhanced = enhancePromptForArtifacts(prompt, classification);

if (this.debugMode) {
console.log('Enhanced prompt:', {
original: prompt.length,
enhanced: enhanced.length,
intent: classification.intent,
confidence: classification.confidence
});
}

return enhanced;
} catch (error) {
console.warn('Error enhancing prompt for artifacts:', error);
return prompt;
}
}

/**
 * Process an LLM response for artifacts and add them to the store
 */
processResponse(response: string, messageId: string): ArtifactContainer[] {
try {
const currentChatId = get(chatId);
if (!currentChatId) {
console.warn('No current chat ID available for artifacts');
return [];
}

// Extract artifacts from response
const artifacts = extractArtifacts(response);
const containers: ArtifactContainer[] = [];

for (const artifact of artifacts) {
// Validate artifact
const validation = validateArtifact(artifact);

if (!validation.valid) {
console.warn('Invalid artifact found:', {
identifier: artifact.identifier,
errors: validation.errors
});
continue;
}

// Add to artifact store
artifactActions.addArtifact(artifact, currentChatId, messageId);

// Get the container for return
const container = artifactActions.getArtifact(artifact.identifier);
if (container) {
containers.push(container);
}

if (this.debugMode) {
console.log('Added artifact:', {
identifier: artifact.identifier,
type: artifact.type,
title: artifact.title,
files: artifact.files.length
});
}
}

// If we found artifacts, show the panel
if (containers.length > 0) {
artifactActions.showPanel();
}

return containers;
} catch (error) {
console.error('Error processing artifacts from response:', error);
return [];
}
}

/**
 * Check if a message should show an artifact button
 */
showArtifactButton(messageId: string): boolean {
try {
const messageArtifacts = artifactActions.getMessageArtifacts(messageId);
return messageArtifacts.length > 0;
} catch (error) {
console.warn('Error checking for message artifacts:', error);
return false;
}
}

/**
 * Set debug mode
 */
setDebugMode(enabled: boolean): void {
this.debugMode = enabled;
}

/**
 * Set confidence threshold for prompt enhancement
 */
setConfidenceThreshold(threshold: number): void {
this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
}
}

// Create singleton instance
export const artifactIntegration = new ArtifactIntegrationImpl();

/**
 * Utility functions for use in Svelte components
 */
export const artifactUtils = {
/**
 * Handle artifact button click in message
 */
handleArtifactButtonClick(messageId: string): void {
try {
const artifacts = artifactActions.getMessageArtifacts(messageId);

if (artifacts.length === 0) {
console.warn('No artifacts found for message:', messageId);
return;
}

// Select the first artifact and show panel
const firstArtifact = artifacts[0];
artifactActions.selectArtifact(firstArtifact.artifact.identifier);
artifactActions.showPanel();
} catch (error) {
console.error('Error handling artifact button click:', error);
}
},

/**
 * Get artifacts for a specific message
 */
getMessageArtifacts(messageId: string): ArtifactContainer[] {
try {
return artifactActions.getMessageArtifacts(messageId);
} catch (error) {
console.warn('Error getting message artifacts:', error);
return [];
}
},

/**
 * Check if artifacts panel should be visible
 */
shouldShowPanel(): boolean {
try {
// You can add additional logic here if needed
return artifactActions.getAllArtifacts().length > 0;
} catch (error) {
console.warn('Error checking panel visibility:', error);
return false;
}
}
};

/**
 * Hook for integrating with OpenWebUI's message sending system
 */
export function useArtifactIntegration() {
return {
/**
 * Pre-process prompt before sending to API
 */
preprocessPrompt(prompt: string): string {
      console.log("🚀 [Artifact Integration] preprocessPrompt called with:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
if (!prompt || typeof prompt !== 'string') {
return prompt;
}

if (artifactIntegration.shouldEnhancePrompt(prompt)) {
        console.log("🚀 [Artifact Integration] Prompt should be enhanced - calling enhancePrompt");
return artifactIntegration.enhancePrompt(prompt);
}

return prompt;
},

/**
 * Post-process API response for artifacts
 */
postprocessResponse(response: string, messageId: string): ArtifactContainer[] {
if (!response || typeof response !== 'string' || !messageId) {
return [];
}

return artifactIntegration.processResponse(response, messageId);
},

/**
 * Check if message has artifacts
 */
hasArtifacts(messageId: string): boolean {
if (!messageId) return false;
return artifactIntegration.showArtifactButton(messageId);
},

/**
 * Get all artifacts for current chat
 */
getChatArtifacts() {
const currentChatId = get(chatId);
if (!currentChatId) return [];

return artifactActions.getAllArtifacts().filter(
container => container.chatId === currentChatId
);
}
};
}

/**
 * Initialize artifact integration
 */
export function initializeArtifactIntegration(options?: {
debugMode?: boolean;
confidenceThreshold?: number;
}) {
if (options?.debugMode !== undefined) {
artifactIntegration.setDebugMode(options.debugMode);
}

if (options?.confidenceThreshold !== undefined) {
artifactIntegration.setConfidenceThreshold(options.confidenceThreshold);
}

console.log('Artifact integration initialized');
}

/**
 * Check if a message content contains PAS 3.0 artifacts
 * @param content The message content to check
 * @returns True if the message contains artifacts
 */
export function hasArtifactInMessage(content: string): boolean {
  try {
    const artifacts = extractArtifacts(content);
    return artifacts.length > 0;
  } catch (error) {
    return false;
  }
}
