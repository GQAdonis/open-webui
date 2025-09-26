/**
 * Intent Classifier Unit Tests
 *
 * Tests the IntentClassifierService for proper intent detection,
 * confidence scoring, keyword matching, and timeout handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IntentClassifierService } from '../../src/lib/services/intent-classifier';
import {
  type IntentClassificationRequest,
  type IntentClassifierConfig,
  IntentClassificationTimeoutError,
  DEFAULT_INTENT_CONFIG
} from '../../specs/001-create-and-or/contracts/intent-classifier';

describe('IntentClassifierService', () => {
  let classifier: IntentClassifierService;
  let mockDate: Date;

  beforeEach(() => {
    // Setup mock date for consistent timing tests
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    classifier = new IntentClassifierService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const config = classifier.getConfig();
      expect(config).toEqual(DEFAULT_INTENT_CONFIG);
    });

    it('should initialize with custom config', () => {
      const customConfig: Partial<IntentClassifierConfig> = {
        confidenceThreshold: 0.8,
        timeoutMs: 10000
      };

      const customClassifier = new IntentClassifierService(customConfig);
      const config = customClassifier.getConfig();

      expect(config.confidenceThreshold).toBe(0.8);
      expect(config.timeoutMs).toBe(10000);
      expect(config.triggerKeywords).toEqual(DEFAULT_INTENT_CONFIG.triggerKeywords);
    });
  });

  describe('Configuration Management', () => {
    it('should update config correctly', () => {
      const newConfig: Partial<IntentClassifierConfig> = {
        confidenceThreshold: 0.9,
        triggerKeywords: ['custom', 'keywords']
      };

      classifier.updateConfig(newConfig);
      const config = classifier.getConfig();

      expect(config.confidenceThreshold).toBe(0.9);
      expect(config.triggerKeywords).toEqual(['custom', 'keywords']);
      expect(config.timeoutMs).toBe(DEFAULT_INTENT_CONFIG.timeoutMs); // Should remain unchanged
    });

    it('should return a copy of config to prevent external mutation', () => {
      const config1 = classifier.getConfig();
      const config2 = classifier.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      config1.confidenceThreshold = 0.99;
      expect(classifier.getConfig().confidenceThreshold).toBe(DEFAULT_INTENT_CONFIG.confidenceThreshold);
    });
  });

  describe('Intent Classification', () => {
    const createRequest = (prompt: string): IntentClassificationRequest => ({
      prompt,
      sessionId: 'test-session',
      timestamp: new Date()
    });

    describe('Keyword Detection', () => {
      it('should detect artifact keywords', async () => {
        const request = createRequest('Create an artifact with React component');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.detectedKeywords).toContain('artifact');
        expect(response.detectedKeywords).toContain('React');
        expect(response.detectedKeywords).toContain('component');
        expect(response.confidence).toBeGreaterThan(0.5);
      });

      it('should detect component keywords', async () => {
        const request = createRequest('Build a Vue component that renders a button');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.detectedKeywords).toContain('component');
        expect(response.detectedKeywords).toContain('render');
        expect(response.confidence).toBeGreaterThan(0.4);
      });

      it('should detect code-related patterns', async () => {
        const request = createRequest('function MyComponent() { return <div>Hello</div>; }');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.reasoning).toContain('Keywords detected');
      });

      it('should be case insensitive', async () => {
        const request = createRequest('CREATE AN ARTIFACT WITH REACT COMPONENT');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.detectedKeywords).toContain('artifact');
        expect(response.detectedKeywords).toContain('React');
        expect(response.detectedKeywords).toContain('component');
      });
    });

    describe('Confidence Scoring', () => {
      it('should assign high confidence to explicit artifact requests', async () => {
        const request = createRequest('Create an artifact preview component');
        const response = await classifier.classifyIntent(request);

        expect(response.confidence).toBeGreaterThan(0.8);
        expect(response.shouldEnhance).toBe(true);
      });

      it('should assign medium confidence to component requests', async () => {
        const request = createRequest('Build a React component');
        const response = await classifier.classifyIntent(request);

        expect(response.confidence).toBeGreaterThan(0.4);
        expect(response.confidence).toBeLessThan(0.8);
        expect(response.shouldEnhance).toBe(true);
      });

      it('should assign low confidence to non-code requests', async () => {
        const request = createRequest('What is the weather today?');
        const response = await classifier.classifyIntent(request);

        expect(response.confidence).toBe(0);
        expect(response.shouldEnhance).toBe(false);
        expect(response.detectedKeywords).toHaveLength(0);
      });

      it('should boost confidence for multiple code patterns', async () => {
        const request = createRequest('export function MyComponent() { return <div className="test">Hello</div>; }');
        const response = await classifier.classifyIntent(request);

        expect(response.confidence).toBeGreaterThan(0.2);
        expect(response.shouldEnhance).toBe(true);
      });

      it('should cap confidence at 1.0', async () => {
        const request = createRequest('artifact preview component render React Vue Svelte HTML JSX TSX function class export import');
        const response = await classifier.classifyIntent(request);

        expect(response.confidence).toBeLessThanOrEqual(1.0);
        expect(response.shouldEnhance).toBe(true);
      });
    });

    describe('Performance Tracking', () => {
      it('should track processing time', async () => {
        const request = createRequest('Create a React component');

        // Advance time during processing
        const classificationPromise = classifier.classifyIntent(request);
        vi.advanceTimersByTime(50);
        const response = await classificationPromise;

        expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof response.processingTimeMs).toBe('number');
      });

      it('should include reasoning in response', async () => {
        const request = createRequest('Create an artifact');
        const response = await classifier.classifyIntent(request);

        expect(response.reasoning).toBeDefined();
        expect(typeof response.reasoning).toBe('string');
        expect(response.reasoning.length).toBeGreaterThan(0);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty prompts', async () => {
        const request = createRequest('');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(false);
        expect(response.confidence).toBe(0);
        expect(response.detectedKeywords).toHaveLength(0);
        expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
      });

      it('should handle prompts with only whitespace', async () => {
        const request = createRequest('   \n\t  ');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(false);
        expect(response.confidence).toBe(0);
        expect(response.detectedKeywords).toHaveLength(0);
      });

      it('should handle very long prompts', async () => {
        const longPrompt = 'Create a React component '.repeat(1000);
        const request = createRequest(longPrompt);
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.detectedKeywords).toContain('React');
        expect(response.detectedKeywords).toContain('component');
      });

      it('should handle prompts with special characters', async () => {
        const request = createRequest('Create React component with @#$%^&*(){}[]|\\:";\'<>?,./');
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(true);
        expect(response.detectedKeywords).toContain('React');
        expect(response.detectedKeywords).toContain('component');
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after configured duration', async () => {
      const timeoutClassifier = new IntentClassifierService({ timeoutMs: 100 });
      const request = createRequest('Create React component');

      const classificationPromise = timeoutClassifier.classifyIntent(request);

      // Advance time past timeout
      vi.advanceTimersByTime(150);

      await expect(classificationPromise).rejects.toThrow(IntentClassificationTimeoutError);
    });

    it('should handle timeout with proper error message', async () => {
      const timeoutMs = 100;
      const timeoutClassifier = new IntentClassifierService({ timeoutMs });
      const request = createRequest('Create React component');

      const classificationPromise = timeoutClassifier.classifyIntent(request);
      vi.advanceTimersByTime(150);

      try {
        await classificationPromise;
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error).toBeInstanceOf(IntentClassificationTimeoutError);
        expect(error.message).toContain(timeoutMs.toString());
      }
    });

    it('should complete successfully within timeout', async () => {
      const timeoutClassifier = new IntentClassifierService({ timeoutMs: 1000 });
      const request = createRequest('Create React component');

      const classificationPromise = timeoutClassifier.classifyIntent(request);
      vi.advanceTimersByTime(50); // Well within timeout
      const response = await classificationPromise;

      expect(response.shouldEnhance).toBe(true);
      expect(response.confidence).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully with low confidence response', async () => {
      // Mock an internal error by making the performClassification method throw
      const errorClassifier = new IntentClassifierService();
      const originalMethod = (errorClassifier as any).performClassification;

      vi.spyOn(errorClassifier as any, 'performClassification').mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = createRequest('Create React component');
      const response = await errorClassifier.classifyIntent(request);

      expect(response.shouldEnhance).toBe(false);
      expect(response.confidence).toBe(0);
      expect(response.detectedKeywords).toHaveLength(0);
      expect(response.reasoning).toContain('Classification failed');
      expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Restore original method
      (errorClassifier as any).performClassification = originalMethod;
    });
  });

  describe('Real-world Scenarios', () => {
    const testCases = [
      {
        name: 'explicit artifact request',
        prompt: 'Please create an artifact that shows a React component with a button',
        expectedEnhance: true,
        expectedConfidence: 0.8
      },
      {
        name: 'component creation request',
        prompt: 'Build me a Vue component that displays user information',
        expectedEnhance: true,
        expectedConfidence: 0.4
      },
      {
        name: 'code snippet request',
        prompt: 'Show me how to write a function that handles user input',
        expectedEnhance: true,
        expectedConfidence: 0.2
      },
      {
        name: 'general question',
        prompt: 'How do I center a div in CSS?',
        expectedEnhance: false,
        expectedConfidence: 0
      },
      {
        name: 'non-code question',
        prompt: 'What is machine learning and how does it work?',
        expectedEnhance: false,
        expectedConfidence: 0
      },
      {
        name: 'HTML request',
        prompt: 'Create HTML markup for a responsive navigation menu',
        expectedEnhance: true,
        expectedConfidence: 0.2
      }
    ];

    testCases.forEach(({ name, prompt, expectedEnhance, expectedConfidence }) => {
      it(`should handle ${name} correctly`, async () => {
        const request = createRequest(prompt);
        const response = await classifier.classifyIntent(request);

        expect(response.shouldEnhance).toBe(expectedEnhance);

        if (expectedConfidence > 0) {
          expect(response.confidence).toBeGreaterThanOrEqual(expectedConfidence - 0.1);
        } else {
          expect(response.confidence).toBe(0);
        }

        expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
        expect(response.reasoning).toBeDefined();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete classification within performance target', async () => {
      const request = createRequest('Create a React component with state management');

      const startTime = Date.now();
      const response = await classifier.classifyIntent(request);
      const actualTime = Date.now() - startTime;

      // Performance target: <5s (5000ms) as specified in plan.md
      expect(actualTime).toBeLessThan(5000);
      expect(response.processingTimeMs).toBeLessThan(5000);
    });

    it('should handle multiple concurrent classifications', async () => {
      const requests = [
        createRequest('Create React component'),
        createRequest('Build Vue app'),
        createRequest('Make HTML page'),
        createRequest('Write JavaScript function'),
        createRequest('What is TypeScript?')
      ];

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => classifier.classifyIntent(req))
      );
      const totalTime = Date.now() - startTime;

      expect(responses).toHaveLength(5);
      expect(totalTime).toBeLessThan(10000); // Should handle 5 concurrent requests quickly

      responses.forEach(response => {
        expect(response.processingTimeMs).toBeGreaterThanOrEqual(0);
        expect(response.reasoning).toBeDefined();
      });
    });
  });
});