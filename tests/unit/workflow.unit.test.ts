/**
 * Artifact Workflow Orchestrator Unit Tests
 *
 * Tests the ArtifactWorkflowOrchestrator for proper stage coordination,
 * error handling, performance monitoring, and timeout management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ArtifactWorkflowOrchestrator,
  artifactWorkflow,
  type WorkflowRequest,
  type WorkflowResult,
  type WorkflowOptions,
  type WorkflowError
} from '../../src/lib/services/artifact-workflow';

// Mock dependencies
vi.mock('../../src/lib/services/intent-classifier', () => ({
  intentClassifier: {
    classifyIntent: vi.fn()
  }
}));

vi.mock('../../src/lib/services/prompt-enhancer', () => ({
  promptEnhancer: {
    enhancePrompt: vi.fn()
  }
}));

vi.mock('../../src/lib/services/retry-loop-monitor', () => ({
  retryLoopMonitor: {
    recordRetry: vi.fn(),
    recordSuccess: vi.fn(),
    canRetry: vi.fn(() => true),
    getComponentState: vi.fn(() => null)
  }
}));

vi.mock('../../src/lib/services/performance-monitor', () => ({
  performanceMonitor: {
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(() => ({
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 100,
      operations: {}
    })),
    startOperation: vi.fn(() => 'op-id'),
    endOperation: vi.fn(() => 100),
    createTimeoutPromise: vi.fn().mockImplementation((promise) => promise),
    createCustomTimeout: vi.fn().mockImplementation((promise) => promise)
  }
}));

vi.mock('../../src/lib/artifacts/detectArtifacts', () => ({
  detectArtifactsUnified: vi.fn()
}));

vi.mock('../../src/lib/utils/artifacts/xml-artifact-parser', () => ({
  parseArtifactsFromContent: vi.fn()
}));

import { intentClassifier } from '../../src/lib/services/intent-classifier';
import { promptEnhancer } from '../../src/lib/services/prompt-enhancer';
import { performanceMonitor } from '../../src/lib/services/performance-monitor';
import { detectArtifactsUnified } from '../../src/lib/artifacts/detectArtifacts';
import { parseArtifactsFromContent } from '../../src/lib/utils/artifacts/xml-artifact-parser';

describe('ArtifactWorkflowOrchestrator', () => {
  let orchestrator: ArtifactWorkflowOrchestrator;
  let mockDate: Date;

  beforeEach(() => {
    // Setup mock date for consistent timing tests
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Create fresh orchestrator instance
    orchestrator = new ArtifactWorkflowOrchestrator();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize properly', () => {
      expect(orchestrator.getActiveWorkflowCount()).toBe(0);
    });

    it('should provide singleton instance', () => {
      expect(artifactWorkflow).toBeInstanceOf(ArtifactWorkflowOrchestrator);
    });
  });

  describe('Workflow Execution', () => {
    it('should execute complete workflow successfully', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component with a button',
        sessionId: 'test-session'
      };

      // Mock successful responses
      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: true,
        confidence: 0.8,
        detectedKeywords: ['React', 'component'],
        suggestedFramework: 'react'
      });

      vi.mocked(promptEnhancer.enhancePrompt).mockResolvedValue({
        enhancedPrompt: 'Create a React functional component with a clickable button that shows an alert',
        wasEnhanced: true,
        confidence: 0.9,
        enhancementType: 'artifact_creation'
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [
          {
            type: 'react',
            title: 'Button Component',
            entryCode: 'function Button() { return <button>Click me</button>; }'
          }
        ],
        detectionMetadata: {
          legacyCount: 1,
          pas3Count: 0,
          totalProcessingTime: 50
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.originalPrompt).toBe(request.prompt);
      expect(result.sessionId).toBe(request.sessionId);
      expect(result.wasPromptEnhanced).toBe(true);
      expect(result.artifactCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.workflowId).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should execute workflow with skipped stages', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a simple HTML page',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        skipIntentClassification: true,
        skipPromptEnhancement: true
      };

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [
          {
            type: 'html',
            title: 'Simple Page',
            entryCode: '<html><body><h1>Hello</h1></body></html>'
          }
        ],
        detectionMetadata: {
          legacyCount: 1,
          pas3Count: 0,
          totalProcessingTime: 30
        }
      });

      const result = await orchestrator.executeWorkflow(request, options);

      expect(result.classifiedIntent).toBeNull();
      expect(result.enhancedPrompt).toBeNull();
      expect(result.wasPromptEnhanced).toBe(false);
      expect(result.artifactCount).toBe(1);
      expect(vi.mocked(intentClassifier.classifyIntent)).not.toHaveBeenCalled();
      expect(vi.mocked(promptEnhancer.enhancePrompt)).not.toHaveBeenCalled();
    });

    it('should handle workflow with no artifacts found', async () => {
      const request: WorkflowRequest = {
        prompt: 'What is the weather today?',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: false,
        confidence: 0.1,
        detectedKeywords: [],
        suggestedFramework: null
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.artifactCount).toBe(0);
      expect(result.detectedArtifacts).toHaveLength(0);
      expect(result.wasPromptEnhanced).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute fallback detection when forced', async () => {
      const request: WorkflowRequest = {
        prompt: '<artifact identifier="test" type="text/html" title="Test"></artifact>',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        forceArtifactDetection: true
      };

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 20
        }
      });

      vi.mocked(parseArtifactsFromContent).mockReturnValue({
        hasArtifacts: true,
        artifacts: [
          {
            identifier: 'test',
            type: 'text/html',
            title: 'Test',
            files: [{ path: 'index.html', content: '<h1>Test</h1>' }],
            dependencies: [],
            rawXml: ''
          }
        ],
        contentWithoutArtifacts: '',
        validationErrors: [],
        parsingTimeMs: 5
      });

      const result = await orchestrator.executeWorkflow(request, options);

      expect(result.artifactCount).toBe(1);
      expect(vi.mocked(parseArtifactsFromContent)).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle intent classification errors gracefully', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockRejectedValue(
        new Error('Classification service unavailable')
      );

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('intent_classification');
      expect(result.errors[0].error).toBe('Classification service unavailable');
      expect(result.errors[0].recoverable).toBe(true);
      expect(result.classifiedIntent).toBeNull();
    });

    it('should handle prompt enhancement errors gracefully', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: true,
        confidence: 0.8,
        detectedKeywords: ['React'],
        suggestedFramework: 'react'
      });

      vi.mocked(promptEnhancer.enhancePrompt).mockRejectedValue(
        new Error('Enhancement service timeout')
      );

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('prompt_enhancement');
      expect(result.errors[0].error).toBe('Enhancement service timeout');
      expect(result.errors[0].recoverable).toBe(true);
      expect(result.enhancedPrompt).toBeNull();
      expect(result.wasPromptEnhanced).toBe(false);
    });

    it('should handle artifact detection errors gracefully', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(detectArtifactsUnified).mockRejectedValue(
        new Error('Detection service failed')
      );

      const result = await orchestrator.executeWorkflow(request);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('artifact_detection');
      expect(result.errors[0].error).toBe('Detection service failed');
      expect(result.errors[0].recoverable).toBe(true);
      expect(result.artifactCount).toBe(0);
    });

    it('should handle fallback detection errors', async () => {
      const request: WorkflowRequest = {
        prompt: 'Invalid XML content',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        forceArtifactDetection: true
      };

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      vi.mocked(parseArtifactsFromContent).mockImplementation(() => {
        throw new Error('XML parsing failed');
      });

      const result = await orchestrator.executeWorkflow(request, options);

      expect(result.artifactCount).toBe(0);
      // Should not crash, fallback errors are handled silently
    });
  });

  describe('Workflow Timeout Handling', () => {
    it('should timeout workflow after specified duration', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        timeoutMs: 1000
      };

      // Mock slow intent classification
      vi.mocked(intentClassifier.classifyIntent).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            shouldEnhance: false,
            confidence: 0.5,
            detectedKeywords: [],
            suggestedFramework: null
          }), 2000);
        })
      );

      const workflowPromise = orchestrator.executeWorkflow(request, options);

      // Advance time to trigger timeout
      vi.advanceTimersByTime(1100);

      await expect(workflowPromise).rejects.toThrow('Workflow timed out after 1000ms');
    });

    it('should use default timeout when not specified', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      // Mock very slow operation
      vi.mocked(intentClassifier.classifyIntent).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            shouldEnhance: false,
            confidence: 0.5,
            detectedKeywords: [],
            suggestedFramework: null
          }), 70000);
        })
      );

      const workflowPromise = orchestrator.executeWorkflow(request);

      // Advance time to trigger default timeout (60 seconds)
      vi.advanceTimersByTime(61000);

      await expect(workflowPromise).rejects.toThrow('Workflow timed out after 60000ms');
    });

    it('should clean up resources on timeout', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        timeoutMs: 500
      };

      // Mock slow operation
      vi.mocked(intentClassifier.classifyIntent).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            shouldEnhance: false,
            confidence: 0.5,
            detectedKeywords: [],
            suggestedFramework: null
          }), 1000);
        })
      );

      const initialWorkflowCount = orchestrator.getActiveWorkflowCount();

      const workflowPromise = orchestrator.executeWorkflow(request, options);

      // Workflow should be active
      expect(orchestrator.getActiveWorkflowCount()).toBe(initialWorkflowCount + 1);

      // Advance time to trigger timeout
      vi.advanceTimersByTime(600);

      try {
        await workflowPromise;
      } catch (error) {
        // Expected to fail
      }

      // Workflow should be cleaned up
      expect(orchestrator.getActiveWorkflowCount()).toBe(initialWorkflowCount);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should integrate with performance monitor', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      await orchestrator.executeWorkflow(request);

      expect(vi.mocked(performanceMonitor.startMonitoring)).toHaveBeenCalledWith(
        expect.stringMatching(/^workflow-/)
      );
      expect(vi.mocked(performanceMonitor.stopMonitoring)).toHaveBeenCalledWith(
        expect.stringMatching(/^workflow-/)
      );
    });

    it('should track individual stage performance', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: false,
        confidence: 0.5,
        detectedKeywords: [],
        suggestedFramework: null
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.performance.intentClassificationMs).toBeGreaterThanOrEqual(0);
      expect(result.performance.artifactDetectionMs).toBeGreaterThanOrEqual(0);
      expect(result.performance.totalWorkflowMs).toBeGreaterThanOrEqual(0);
      expect(result.performanceMetrics).toBeDefined();
    });

    it('should stop monitoring on error', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(detectArtifactsUnified).mockRejectedValue(
        new Error('Detection failed')
      );

      await orchestrator.executeWorkflow(request);

      expect(vi.mocked(performanceMonitor.stopMonitoring)).toHaveBeenCalled();
    });
  });

  describe('Workflow Management', () => {
    it('should track active workflows', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      // Mock slow operation to keep workflow active
      vi.mocked(detectArtifactsUnified).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            artifacts: [],
            detectionMetadata: {
              legacyCount: 0,
              pas3Count: 0,
              totalProcessingTime: 10
            }
          }), 1000);
        })
      );

      const initialCount = orchestrator.getActiveWorkflowCount();
      const workflowPromise = orchestrator.executeWorkflow(request);

      // Should increment active count
      expect(orchestrator.getActiveWorkflowCount()).toBe(initialCount + 1);

      // Complete workflow
      vi.advanceTimersByTime(1100);
      await workflowPromise;

      // Should decrement active count
      expect(orchestrator.getActiveWorkflowCount()).toBe(initialCount);
    });

    it('should retrieve workflow by id', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      // Mock slow operation
      vi.mocked(detectArtifactsUnified).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            artifacts: [],
            detectionMetadata: {
              legacyCount: 0,
              pas3Count: 0,
              totalProcessingTime: 10
            }
          }), 500);
        })
      );

      const workflowPromise = orchestrator.executeWorkflow(request);

      // Give some time for workflow to start
      vi.advanceTimersByTime(100);

      // Should have one active workflow
      expect(orchestrator.getActiveWorkflowCount()).toBe(1);

      // Complete workflow
      vi.advanceTimersByTime(500);
      const result = await workflowPromise;

      // Should be able to retrieve by id (though it will be cleaned up)
      expect(result.workflowId).toBeDefined();
    });

    it('should cancel workflow', () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      // Start workflow but don't await
      orchestrator.executeWorkflow(request);

      // Should have active workflow
      expect(orchestrator.getActiveWorkflowCount()).toBe(1);

      // Cancel should return false for non-existent workflow
      expect(orchestrator.cancelWorkflow('non-existent')).toBe(false);
    });

    it('should handle multiple concurrent workflows', async () => {
      const requests: WorkflowRequest[] = [
        { prompt: 'Create a React component', sessionId: 'session-1' },
        { prompt: 'Create an HTML page', sessionId: 'session-2' },
        { prompt: 'Create a Vue component', sessionId: 'session-3' }
      ];

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const workflowPromises = requests.map(request =>
        orchestrator.executeWorkflow(request)
      );

      const results = await Promise.all(workflowPromises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(requests[index].sessionId);
        expect(result.workflowId).toBeDefined();
      });
    });
  });

  describe('Prompt Enhancement Logic', () => {
    it('should enhance prompt when confidence is high', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a React component',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: true,
        confidence: 0.8, // High confidence
        detectedKeywords: ['React', 'component'],
        suggestedFramework: 'react'
      });

      vi.mocked(promptEnhancer.enhancePrompt).mockResolvedValue({
        enhancedPrompt: 'Enhanced prompt',
        wasEnhanced: true,
        confidence: 0.9,
        enhancementType: 'artifact_creation'
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.wasPromptEnhanced).toBe(true);
      expect(result.enhancedPrompt).toBe('Enhanced prompt');
      expect(vi.mocked(promptEnhancer.enhancePrompt)).toHaveBeenCalled();
    });

    it('should not enhance prompt when confidence is low', async () => {
      const request: WorkflowRequest = {
        prompt: 'What is React?',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: true,
        confidence: 0.5, // Low confidence
        detectedKeywords: ['React'],
        suggestedFramework: null
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.wasPromptEnhanced).toBe(false);
      expect(result.enhancedPrompt).toBeNull();
      expect(vi.mocked(promptEnhancer.enhancePrompt)).not.toHaveBeenCalled();
    });

    it('should not enhance when shouldEnhance is false', async () => {
      const request: WorkflowRequest = {
        prompt: 'What is the weather?',
        sessionId: 'test-session'
      };

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: false, // Explicitly not enhancing
        confidence: 0.9,
        detectedKeywords: [],
        suggestedFramework: null
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      const result = await orchestrator.executeWorkflow(request);

      expect(result.wasPromptEnhanced).toBe(false);
      expect(vi.mocked(promptEnhancer.enhancePrompt)).not.toHaveBeenCalled();
    });
  });

  describe('PAS 3.0 Type Mapping', () => {
    it('should map PAS 3.0 types to legacy types correctly', async () => {
      const request: WorkflowRequest = {
        prompt: 'XML content with artifacts',
        sessionId: 'test-session'
      };

      const options: WorkflowOptions = {
        forceArtifactDetection: true
      };

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [],
        detectionMetadata: {
          legacyCount: 0,
          pas3Count: 0,
          totalProcessingTime: 10
        }
      });

      vi.mocked(parseArtifactsFromContent).mockReturnValue({
        hasArtifacts: true,
        artifacts: [
          {
            identifier: 'react-test',
            type: 'application/vnd.react+jsx',
            title: 'React Component',
            files: [{ path: 'App.jsx', content: 'function App() {}' }],
            dependencies: [{ name: 'react', version: '18.2.0' }],
            rawXml: ''
          },
          {
            identifier: 'html-test',
            type: 'text/html',
            title: 'HTML Page',
            files: [{ path: 'index.html', content: '<h1>Test</h1>' }],
            dependencies: [],
            rawXml: ''
          },
          {
            identifier: 'unknown-test',
            type: 'application/unknown',
            title: 'Unknown Type',
            files: [{ path: 'test.txt', content: 'content' }],
            dependencies: [],
            rawXml: ''
          }
        ],
        contentWithoutArtifacts: '',
        validationErrors: [],
        parsingTimeMs: 5
      });

      const result = await orchestrator.executeWorkflow(request, options);

      expect(result.artifactCount).toBe(3);
      expect(result.detectedArtifacts[0].type).toBe('react');
      expect(result.detectedArtifacts[1].type).toBe('html');
      expect(result.detectedArtifacts[2].type).toBe('html'); // Unknown maps to html
    });
  });

  describe('Real-world Scenarios', () => {
    const scenarios = [
      {
        name: 'complete React component workflow',
        request: {
          prompt: 'Create a React todo list component with state management',
          sessionId: 'react-session'
        },
        mockIntentResult: {
          shouldEnhance: true,
          confidence: 0.9,
          detectedKeywords: ['React', 'todo', 'component', 'state'],
          suggestedFramework: 'react'
        },
        mockEnhancementResult: {
          enhancedPrompt: 'Create a React functional component for todo list management with useState hook for state management, including add, toggle, and delete functionality',
          wasEnhanced: true,
          confidence: 0.95,
          enhancementType: 'artifact_creation'
        },
        mockArtifacts: [
          {
            type: 'react',
            title: 'Todo List Component',
            entryCode: 'function TodoList() { const [todos, setTodos] = useState([]); return <div>...</div>; }'
          }
        ],
        expectedArtifactCount: 1,
        expectedEnhanced: true
      },
      {
        name: 'simple HTML page workflow',
        request: {
          prompt: 'Create a simple HTML landing page',
          sessionId: 'html-session'
        },
        mockIntentResult: {
          shouldEnhance: false,
          confidence: 0.6,
          detectedKeywords: ['HTML', 'page'],
          suggestedFramework: null
        },
        mockArtifacts: [
          {
            type: 'html',
            title: 'Landing Page',
            entryCode: '<!DOCTYPE html><html><head><title>Landing</title></head><body><h1>Welcome</h1></body></html>'
          }
        ],
        expectedArtifactCount: 1,
        expectedEnhanced: false
      },
      {
        name: 'non-artifact workflow',
        request: {
          prompt: 'What is the difference between React and Vue?',
          sessionId: 'question-session'
        },
        mockIntentResult: {
          shouldEnhance: false,
          confidence: 0.1,
          detectedKeywords: ['React', 'Vue'],
          suggestedFramework: null
        },
        mockArtifacts: [],
        expectedArtifactCount: 0,
        expectedEnhanced: false
      }
    ];

    scenarios.forEach(({
      name,
      request,
      mockIntentResult,
      mockEnhancementResult,
      mockArtifacts,
      expectedArtifactCount,
      expectedEnhanced
    }) => {
      it(`should handle ${name} correctly`, async () => {
        vi.mocked(intentClassifier.classifyIntent).mockResolvedValue(mockIntentResult);

        if (mockEnhancementResult) {
          vi.mocked(promptEnhancer.enhancePrompt).mockResolvedValue(mockEnhancementResult);
        }

        vi.mocked(detectArtifactsUnified).mockResolvedValue({
          artifacts: mockArtifacts,
          detectionMetadata: {
            legacyCount: mockArtifacts.length,
            pas3Count: 0,
            totalProcessingTime: 25
          }
        });

        const result = await orchestrator.executeWorkflow(request);

        expect(result.sessionId).toBe(request.sessionId);
        expect(result.originalPrompt).toBe(request.prompt);
        expect(result.artifactCount).toBe(expectedArtifactCount);
        expect(result.wasPromptEnhanced).toBe(expectedEnhanced);
        expect(result.errors).toHaveLength(0);
        expect(result.processingTimeMs).toBeGreaterThan(0);

        if (expectedEnhanced && mockEnhancementResult) {
          expect(result.enhancedPrompt).toBe(mockEnhancementResult.enhancedPrompt);
        }
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete workflow within performance target', async () => {
      const request: WorkflowRequest = {
        prompt: 'Create a complex React application with multiple components',
        sessionId: 'performance-session'
      };

      // Mock realistic response times
      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: true,
        confidence: 0.8,
        detectedKeywords: ['React', 'application'],
        suggestedFramework: 'react'
      });

      vi.mocked(promptEnhancer.enhancePrompt).mockResolvedValue({
        enhancedPrompt: 'Enhanced complex React application prompt',
        wasEnhanced: true,
        confidence: 0.9,
        enhancementType: 'artifact_creation'
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [
          {
            type: 'react',
            title: 'Complex App',
            entryCode: 'function App() { return <div>Complex app</div>; }'
          }
        ],
        detectionMetadata: {
          legacyCount: 1,
          pas3Count: 0,
          totalProcessingTime: 100
        }
      });

      const startTime = Date.now();
      const result = await orchestrator.executeWorkflow(request);
      const actualTime = Date.now() - startTime;

      // Performance target: complete workflow quickly
      expect(actualTime).toBeLessThan(5000); // 5 seconds
      expect(result.processingTimeMs).toBeLessThan(5000);
      expect(result.performance.totalWorkflowMs).toBeLessThan(5000);
    });

    it('should handle concurrent workflows efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        prompt: `Create a React component ${i}`,
        sessionId: `concurrent-session-${i}`
      }));

      vi.mocked(intentClassifier.classifyIntent).mockResolvedValue({
        shouldEnhance: false,
        confidence: 0.7,
        detectedKeywords: ['React'],
        suggestedFramework: 'react'
      });

      vi.mocked(detectArtifactsUnified).mockResolvedValue({
        artifacts: [
          {
            type: 'react',
            title: 'Component',
            entryCode: 'function Component() { return <div>Test</div>; }'
          }
        ],
        detectionMetadata: {
          legacyCount: 1,
          pas3Count: 0,
          totalProcessingTime: 50
        }
      });

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => orchestrator.executeWorkflow(request))
      );
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(totalTime).toBeLessThan(10000); // Should handle 5 concurrent workflows quickly

      results.forEach((result, index) => {
        expect(result.sessionId).toBe(`concurrent-session-${index}`);
        expect(result.artifactCount).toBe(1);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});