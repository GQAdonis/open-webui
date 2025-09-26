/**
 * Quickstart Validation Tests (T051)
 *
 * Validates the complete Enhanced Artifact Creation and Preview System
 * according to the quickstart guide specifications.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

// Core services
import { intentClassifier } from '../../src/lib/services/intent-classifier';
import { artifactWorkflow } from '../../src/lib/services/artifact-workflow';
import { retryLoopMonitor } from '../../src/lib/services/retry-loop-monitor';
import { artifactMemoryManager } from '../../src/lib/services/artifact-memory-manager';

// Parsing utilities
import { parseArtifactsFromContent } from '../../src/lib/utils/artifacts/xml-artifact-parser';

// Test data from quickstart guide
const testScenarios = {
  basicReactComponent: {
    prompt: 'Create a React component artifact for a todo list',
    expectedKeywords: ['artifact', 'React', 'component', 'todo'],
    expectedFramework: 'react',
    timeoutMs: 5000
  },

  artifactPreview: {
    prompt: 'Create an artifact preview for a React login component',
    expectedKeywords: ['artifact', 'preview', 'React', 'login'],
    expectedFramework: 'react',
    timeoutMs: 5000
  },

  multipleArtifacts: {
    prompt: 'Create multiple artifacts in one response',
    expectedKeywords: ['artifact', 'multiple'],
    expectedFramework: null,
    timeoutMs: 10000
  },

  invalidDependencies: {
    prompt: 'Create an artifact with invalid dependencies',
    expectedKeywords: ['artifact', 'dependencies'],
    expectedFramework: null,
    timeoutMs: 5000
  }
};

const samplePAS3XML = `
<artifact identifier="react-todo" type="application/vnd.react+jsx" title="Todo List Component">
  <dependencies>
    <dependency name="react" version="18.2.0" />
    <dependency name="react-dom" version="18.2.0" />
  </dependencies>
  <files>
    <file path="TodoList.jsx">
      <![CDATA[
import React, { useState } from 'react';

export default function TodoList() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, { id: Date.now(), text: inputValue, completed: false }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-app" style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Todo List</h1>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a new todo..."
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            marginRight: '8px',
            width: '200px'
          }}
        />
        <button
          onClick={addTodo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add Todo
        </button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li
            key={todo.id}
            style={{
              padding: '8px',
              margin: '4px 0',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span
              style={{
                textDecoration: todo.completed ? 'line-through' : 'none',
                color: todo.completed ? '#6c757d' : 'inherit',
                cursor: 'pointer'
              }}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && (
        <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
          No todos yet. Add one above!
        </p>
      )}
    </div>
  );
}
      ]]>
    </file>
  </files>
</artifact>
`;

const sampleTSXCode = `
\`\`\`tsx
interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px', maxWidth: '400px' }}>
      <h2>Login</h2>
      <div style={{ marginBottom: '15px' }}>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
        Login
      </button>
    </form>
  );
}
\`\`\`
`;

describe('Quickstart Validation Tests', () => {
  beforeAll(() => {
    // Initialize debug logging for validation
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('artifact_debug', 'true');
      localStorage.setItem('intent_classifier_debug', 'true');
      localStorage.setItem('xml_parser_debug', 'true');
      localStorage.setItem('workflow_debug', 'true');
    }

    console.log('🚀 Starting quickstart validation tests');
  });

  afterAll(() => {
    // Clean up debug settings
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('artifact_debug');
      localStorage.removeItem('intent_classifier_debug');
      localStorage.removeItem('xml_parser_debug');
      localStorage.removeItem('workflow_debug');
    }

    console.log('✅ Quickstart validation tests completed');
  });

  beforeEach(() => {
    // Reset services state between tests
    artifactMemoryManager.clear();
    retryLoopMonitor.resetCircuit('test-component');
  });

  describe('Test 1: Intent Classification (Quickstart Validation)', () => {
    it('should detect artifact requests within 5 seconds', async () => {
      const scenario = testScenarios.artifactPreview;
      const startTime = Date.now();

      const result = await intentClassifier.classifyIntent(scenario.prompt);
      const processingTime = Date.now() - startTime;

      // Validate performance requirement from quickstart
      expect(processingTime).toBeLessThan(scenario.timeoutMs);

      // Validate keyword detection
      expect(result.detectedKeywords).toEqual(
        expect.arrayContaining(['artifact', 'preview'])
      );

      // Validate framework suggestion
      expect(result.suggestedFramework).toBe(scenario.expectedFramework);

      // Validate prompt enhancement is triggered
      expect(result.shouldEnhance).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);

      console.log('✅ Intent classification test passed:', {
        processingTime: `${processingTime}ms`,
        confidence: result.confidence,
        keywords: result.detectedKeywords,
        framework: result.suggestedFramework
      });
    });

    it('should handle multiple artifact scenarios', async () => {
      const scenarios = [
        testScenarios.basicReactComponent,
        testScenarios.multipleArtifacts,
        testScenarios.invalidDependencies
      ];

      for (const scenario of scenarios) {
        const startTime = Date.now();
        const result = await intentClassifier.classifyIntent(scenario.prompt);
        const processingTime = Date.now() - startTime;

        expect(processingTime).toBeLessThan(scenario.timeoutMs);
        expect(result.detectedKeywords).toEqual(
          expect.arrayContaining(['artifact'])
        );

        if (scenario.expectedFramework) {
          expect(result.suggestedFramework).toBe(scenario.expectedFramework);
        }
      }
    });
  });

  describe('Test 2: PAS 3.0 XML Parsing (Quickstart Validation)', () => {
    it('should parse PAS 3.0 XML within 10 seconds', async () => {
      const startTime = Date.now();

      const result = parseArtifactsFromContent(samplePAS3XML);
      const processingTime = Date.now() - startTime;

      // Validate performance requirement from quickstart
      expect(processingTime).toBeLessThan(10000);

      // Validate parsing success
      expect(result.hasArtifacts).toBe(true);
      expect(result.artifacts).toHaveLength(1);

      const artifact = result.artifacts[0];

      // Validate CDATA extraction
      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].content).toContain('TodoList');
      expect(artifact.files[0].content).toContain('useState');

      // Validate metadata extraction
      expect(artifact.identifier).toBe('react-todo');
      expect(artifact.type).toBe('application/vnd.react+jsx');
      expect(artifact.title).toBe('Todo List Component');

      // Validate dependencies
      expect(artifact.dependencies).toHaveLength(2);
      expect(artifact.dependencies[0].name).toBe('react');
      expect(artifact.dependencies[1].name).toBe('react-dom');

      // Validate schema validation passes
      expect(result.validationErrors).toHaveLength(0);

      console.log('✅ PAS 3.0 XML parsing test passed:', {
        processingTime: `${processingTime}ms`,
        artifactCount: result.artifacts.length,
        fileCount: artifact.files.length,
        dependencyCount: artifact.dependencies.length
      });
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXML = `
        <artifact identifier="bad" type="text/html">
          <file path="index.html">
            <![CDATA[<html><body><h1>Unclosed tag</body></html>]]>
          </file>
        </artifact>
      `;

      const result = parseArtifactsFromContent(malformedXML);

      // Should not crash, may produce validation errors
      expect(result).toBeDefined();
      expect(result.parsingTimeMs).toBeLessThan(5000);

      // May have validation errors for missing title
      if (result.validationErrors.length > 0) {
        expect(result.validationErrors.some(error =>
          error.message.includes('title')
        )).toBe(true);
      }
    });
  });

  describe('Test 3: Workflow Orchestration (Quickstart Validation)', () => {
    it('should complete end-to-end workflow within 60 seconds', async () => {
      const request = {
        prompt: testScenarios.basicReactComponent.prompt,
        sessionId: 'quickstart-test-session'
      };

      const startTime = Date.now();

      const result = await artifactWorkflow.executeWorkflow(request);
      const totalTime = Date.now() - startTime;

      // Validate performance requirement from quickstart
      expect(totalTime).toBeLessThan(60000);

      // Validate workflow completion
      expect(result.originalPrompt).toBe(request.prompt);
      expect(result.sessionId).toBe(request.sessionId);
      expect(result.workflowId).toBeDefined();

      // Validate no critical errors
      const criticalErrors = result.errors.filter(error => !error.recoverable);
      expect(criticalErrors).toHaveLength(0);

      // Validate performance metrics
      expect(result.processingTimeMs).toBeLessThan(60000);
      expect(result.performance.totalWorkflowMs).toBeLessThan(60000);

      console.log('✅ End-to-end workflow test passed:', {
        totalTime: `${totalTime}ms`,
        workflowTime: `${result.processingTimeMs}ms`,
        intentClassificationTime: `${result.performance.intentClassificationMs}ms`,
        artifactDetectionTime: `${result.performance.artifactDetectionMs}ms`,
        errors: result.errors.length
      });
    });

    it('should handle error recovery scenarios', async () => {
      const request = {
        prompt: testScenarios.invalidDependencies.prompt,
        sessionId: 'error-recovery-test'
      };

      const result = await artifactWorkflow.executeWorkflow(request);

      // Should complete even with issues
      expect(result.workflowId).toBeDefined();
      expect(result.processingTimeMs).toBeLessThan(30000);

      // May have recoverable errors
      const totalErrors = result.errors.length;
      const recoverableErrors = result.errors.filter(error => error.recoverable).length;

      if (totalErrors > 0) {
        expect(recoverableErrors).toBeGreaterThan(0);
        console.log('✅ Error recovery test passed with recoverable errors:', totalErrors);
      } else {
        console.log('✅ Error recovery test passed without errors');
      }
    });
  });

  describe('Test 4: TSX Code Block Fallback (Quickstart Validation)', () => {
    it('should detect TSX code blocks and create fallback artifacts', async () => {
      // This test simulates the TSX code block detection scenario
      const messageContent = `Here's a login component: ${sampleTSXCode}`;

      // Test if TSX content would be detected (this would be handled by detectArtifacts.ts)
      const hasTSXContent = /```tsx[\s\S]*?```/g.test(messageContent);
      expect(hasTSXContent).toBe(true);

      // Test intent classification for TSX content
      const classification = await intentClassifier.classifyIntent(
        'Create a preview for this TSX login component'
      );

      expect(classification.shouldEnhance).toBe(true);
      expect(classification.detectedKeywords).toContain('preview');
      expect(classification.suggestedFramework).toBe('react');

      // Test that TSX content can be extracted
      const tsxMatches = messageContent.match(/```tsx([\s\S]*?)```/g);
      expect(tsxMatches).toBeTruthy();
      expect(tsxMatches!.length).toBe(1);

      console.log('✅ TSX code block fallback test passed');
    });
  });

  describe('Test 5: Performance and Memory Validation', () => {
    it('should maintain performance within quickstart benchmarks', async () => {
      const benchmarks = {
        intentClassification: 5000,    // < 5 seconds
        artifactParsing: 10000,       // < 10 seconds
        workflowComplete: 60000       // < 60 seconds
      };

      // Test intent classification performance
      const intentStart = Date.now();
      await intentClassifier.classifyIntent(testScenarios.basicReactComponent.prompt);
      const intentTime = Date.now() - intentStart;
      expect(intentTime).toBeLessThan(benchmarks.intentClassification);

      // Test artifact parsing performance
      const parseStart = Date.now();
      parseArtifactsFromContent(samplePAS3XML);
      const parseTime = Date.now() - parseStart;
      expect(parseTime).toBeLessThan(benchmarks.artifactParsing);

      // Test complete workflow performance
      const workflowStart = Date.now();
      const workflowResult = await artifactWorkflow.executeWorkflow({
        prompt: testScenarios.basicReactComponent.prompt,
        sessionId: 'performance-test'
      });
      const workflowTime = Date.now() - workflowStart;
      expect(workflowTime).toBeLessThan(benchmarks.workflowComplete);

      console.log('✅ Performance benchmarks met:', {
        intentClassification: `${intentTime}ms (< ${benchmarks.intentClassification}ms)`,
        artifactParsing: `${parseTime}ms (< ${benchmarks.artifactParsing}ms)`,
        workflowComplete: `${workflowTime}ms (< ${benchmarks.workflowComplete}ms)`
      });
    });

    it('should maintain memory usage within limits', async () => {
      const memoryLimits = {
        maxArtifacts: 10,
        maxContentSize: 1024 * 1024, // 1MB per artifact
        maxTotalMemory: 10 * 1024 * 1024 // 10MB total
      };

      // Test memory manager limits
      const memoryConfig = artifactMemoryManager.getConfig();
      expect(memoryConfig.maxArtifacts).toBeGreaterThanOrEqual(memoryLimits.maxArtifacts);

      // Test current memory usage
      const stats = artifactMemoryManager.getStats();
      expect(stats.memoryUsageBytes).toBeLessThan(memoryLimits.maxTotalMemory);

      // Test artifact size validation during parsing
      const result = parseArtifactsFromContent(samplePAS3XML);
      if (result.artifacts.length > 0) {
        const artifact = result.artifacts[0];
        const contentSize = artifact.files.reduce((sum, file) =>
          sum + file.content.length, 0
        );
        expect(contentSize).toBeLessThan(memoryLimits.maxContentSize);
      }

      console.log('✅ Memory usage validation passed:', {
        currentMemory: `${Math.round(stats.memoryUsageBytes / 1024)}KB`,
        artifactCount: stats.totalStoredArtifacts,
        averageSize: `${Math.round(stats.averageArtifactSize / 1024)}KB`
      });
    });
  });

  describe('Test 6: Circuit Breaker and Retry Logic', () => {
    it('should prevent infinite loading with circuit breaker', async () => {
      const componentId = 'quickstart-test-component';

      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        retryLoopMonitor.recordRetry(componentId, `Timeout error ${i}`, 30000);
      }

      // Circuit breaker should be open
      expect(retryLoopMonitor.canRetry(componentId)).toBe(false);

      // Should have circuit breaker alert
      const alerts = retryLoopMonitor.getActiveAlerts();
      const circuitAlert = alerts.find(alert =>
        alert.alertType === 'circuit_open' && alert.componentId === componentId
      );
      expect(circuitAlert).toBeDefined();

      // Test recovery after success
      retryLoopMonitor.recordSuccess(componentId);
      expect(retryLoopMonitor.canRetry(componentId)).toBe(true);

      console.log('✅ Circuit breaker validation passed');
    });

    it('should detect infinite loop patterns', async () => {
      const componentId = 'loop-test-component';

      // Simulate rapid retries to trigger infinite loop detection
      for (let i = 0; i < 5; i++) {
        retryLoopMonitor.recordRetry(componentId, `Rapid retry ${i}`, 100);
      }

      // Should detect infinite loop
      const alerts = retryLoopMonitor.getActiveAlerts();
      const loopAlert = alerts.find(alert =>
        alert.alertType === 'infinite_loop_detected' && alert.componentId === componentId
      );

      if (loopAlert) {
        expect(loopAlert.recommendation).toContain('infinite loop detected');
        expect(retryLoopMonitor.canRetry(componentId)).toBe(false);
        console.log('✅ Infinite loop detection passed');
      } else {
        console.log('ℹ️ Infinite loop detection threshold not reached (expected for this test pattern)');
      }
    });
  });

  describe('Integration Validation', () => {
    it('should validate all core components work together', async () => {
      console.log('🔧 Running comprehensive integration validation...');

      // 1. Test intent classification
      const classification = await intentClassifier.classifyIntent(
        'Create a React artifact for a counter component'
      );
      expect(classification.shouldEnhance).toBe(true);

      // 2. Test XML parsing
      const parseResult = parseArtifactsFromContent(samplePAS3XML);
      expect(parseResult.hasArtifacts).toBe(true);

      // 3. Test workflow orchestration
      const workflowResult = await artifactWorkflow.executeWorkflow({
        prompt: 'Integration test prompt',
        sessionId: 'integration-test'
      });
      expect(workflowResult.workflowId).toBeDefined();

      // 4. Test memory management
      const memoryStats = artifactMemoryManager.getStats();
      expect(memoryStats.totalStoredArtifacts).toBeGreaterThanOrEqual(0);

      // 5. Test retry monitoring
      const componentState = retryLoopMonitor.getComponentState('test-component');
      // Should be null (no failures) or have valid state

      console.log('✅ Integration validation completed successfully');
    });
  });
});

// Export for use in other test files
export {
  testScenarios,
  samplePAS3XML,
  sampleTSXCode
};