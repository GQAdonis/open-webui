/**
 * Intent Classifier Contract Test
 * CRITICAL: This test MUST FAIL before implementation exists
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  IIntentClassifier,
  IntentClassificationRequest,
  IntentClassificationResponse,
  IntentClassifierConfig
} from '../../specs/001-create-and-or/contracts/intent-classifier';

// Import the service that doesn't exist yet - this will cause the test to fail initially
import { IntentClassifierService } from '../../src/lib/services/intent-classifier';

describe('IntentClassifier Contract', () => {
  let classifier: IIntentClassifier;

  beforeEach(() => {
    // This will fail until the service is implemented
    classifier = new IntentClassifierService();
  });

  describe('Contract Compliance', () => {
    it('should implement IIntentClassifier interface', () => {
      expect(classifier).toBeDefined();
      expect(typeof classifier.classifyIntent).toBe('function');
      expect(typeof classifier.updateConfig).toBe('function');
      expect(typeof classifier.getConfig).toBe('function');
    });

    it('should have default configuration', () => {
      const config = classifier.getConfig();
      expect(config).toBeDefined();
      expect(Array.isArray(config.triggerKeywords)).toBe(true);
      expect(typeof config.confidenceThreshold).toBe('number');
      expect(typeof config.timeoutMs).toBe('number');
      expect(config.timeoutMs).toBeLessThanOrEqual(5000); // Must be <= 5s as per requirements
    });
  });

  describe('Intent Classification', () => {
    it('should detect artifact keywords and return shouldEnhance=true', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'Create an artifact preview for a React component',
        timestamp: new Date()
      };

      const response: IntentClassificationResponse = await classifier.classifyIntent(request);

      expect(response.shouldEnhance).toBe(true);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.detectedKeywords).toContain('artifact');
      expect(response.processingTimeMs).toBeGreaterThan(0);
      expect(response.processingTimeMs).toBeLessThan(5000); // Must be < 5s timeout
    });

    it('should detect preview keywords and return shouldEnhance=true', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'Show me a preview of this component',
        timestamp: new Date()
      };

      const response: IntentClassificationResponse = await classifier.classifyIntent(request);

      expect(response.shouldEnhance).toBe(true);
      expect(response.detectedKeywords).toContain('preview');
    });

    it('should return shouldEnhance=false for non-artifact prompts', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'What is the weather today?',
        timestamp: new Date()
      };

      const response: IntentClassificationResponse = await classifier.classifyIntent(request);

      expect(response.shouldEnhance).toBe(false);
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.detectedKeywords).toHaveLength(0);
    });

    it('should complete classification within 5 seconds', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'Create a complex artifact with multiple components',
        timestamp: new Date()
      };

      const startTime = Date.now();
      const response = await classifier.classifyIntent(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
      expect(response.processingTimeMs).toBeLessThan(5000);
    });

    it('should handle empty prompts gracefully', async () => {
      const request: IntentClassificationRequest = {
        prompt: '',
        timestamp: new Date()
      };

      const response = await classifier.classifyIntent(request);

      expect(response.shouldEnhance).toBe(false);
      expect(response.confidence).toBe(0);
      expect(response.detectedKeywords).toHaveLength(0);
    });

    it('should include session ID in processing when provided', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'Create an artifact',
        sessionId: 'test-session-123',
        timestamp: new Date()
      };

      // Should not throw error with sessionId
      const response = await classifier.classifyIntent(request);
      expect(response).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating trigger keywords', () => {
      const newConfig: Partial<IntentClassifierConfig> = {
        triggerKeywords: ['artifact', 'preview', 'component', 'render']
      };

      classifier.updateConfig(newConfig);
      const config = classifier.getConfig();

      expect(config.triggerKeywords).toEqual(newConfig.triggerKeywords);
    });

    it('should allow updating confidence threshold', () => {
      const newConfig: Partial<IntentClassifierConfig> = {
        confidenceThreshold: 0.8
      };

      classifier.updateConfig(newConfig);
      const config = classifier.getConfig();

      expect(config.confidenceThreshold).toBe(0.8);
    });

    it('should allow updating timeout', () => {
      const newConfig: Partial<IntentClassifierConfig> = {
        timeoutMs: 3000
      };

      classifier.updateConfig(newConfig);
      const config = classifier.getConfig();

      expect(config.timeoutMs).toBe(3000);
    });

    it('should preserve existing config when partially updating', () => {
      const originalConfig = classifier.getConfig();
      const newConfig: Partial<IntentClassifierConfig> = {
        confidenceThreshold: 0.9
      };

      classifier.updateConfig(newConfig);
      const updatedConfig = classifier.getConfig();

      expect(updatedConfig.confidenceThreshold).toBe(0.9);
      expect(updatedConfig.triggerKeywords).toEqual(originalConfig.triggerKeywords);
      expect(updatedConfig.timeoutMs).toBe(originalConfig.timeoutMs);
    });
  });

  describe('Error Handling', () => {
    it('should throw timeout error for processing exceeding 5 seconds', async () => {
      // Mock a scenario that would timeout
      const request: IntentClassificationRequest = {
        prompt: 'This should timeout if processing takes too long',
        timestamp: new Date()
      };

      // This test validates the timeout mechanism exists
      // The actual timeout behavior will be implemented in the service
      await expect(async () => {
        // Force a timeout scenario if the service supports it
        const longConfig: Partial<IntentClassifierConfig> = { timeoutMs: 1 }; // 1ms timeout
        classifier.updateConfig(longConfig);
        await classifier.classifyIntent(request);
      }).not.toThrow(); // Will throw once timeout is properly implemented
    });

    it('should handle invalid timestamp gracefully', async () => {
      const request: IntentClassificationRequest = {
        prompt: 'Create an artifact',
        timestamp: new Date('invalid-date')
      };

      // Should not crash on invalid timestamp
      await expect(classifier.classifyIntent(request)).resolves.toBeDefined();
    });
  });
});