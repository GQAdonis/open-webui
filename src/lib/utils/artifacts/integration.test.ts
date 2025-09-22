/**
 * Comprehensive test suite for artifact integration
 * Tests intent classification, prompt enhancement, and response processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useArtifactIntegration,
  artifactIntegration,
  hasArtifactInMessage,
  initializeArtifactIntegration
} from './integration';
import { ArtifactIntent } from './intent-classifier';

// Mock stores
vi.mock('$lib/stores', () => ({
  chatId: {
    subscribe: vi.fn(() => () => {}),
    set: vi.fn(),
    update: vi.fn()
  }
}));

// Mock get function from svelte/store
vi.mock('svelte/store', async () => {
  const actual = await vi.importActual('svelte/store');
  return {
    ...actual,
    get: vi.fn(() => 'test-chat-id')
  };
});

vi.mock('$lib/stores/artifacts/artifact-store', () => ({
  artifactActions: {
    addArtifact: vi.fn(),
    getArtifact: vi.fn(),
    getMessageArtifacts: vi.fn(() => []),
    showPanel: vi.fn()
  }
}));

describe('Artifact Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset integration to default state
    initializeArtifactIntegration({ debugMode: false, confidenceThreshold: 0.7 });
  });

  describe('useArtifactIntegration Hook', () => {
    it('should return integration functions', () => {
      const { preprocessPrompt, postprocessResponse, hasArtifacts, getChatArtifacts } = useArtifactIntegration();

      expect(typeof preprocessPrompt).toBe('function');
      expect(typeof postprocessResponse).toBe('function');
      expect(typeof hasArtifacts).toBe('function');
      expect(typeof getChatArtifacts).toBe('function');
    });
  });

  describe('Intent Classification and Prompt Enhancement', () => {
    const { preprocessPrompt } = useArtifactIntegration();

    it('should enhance React component requests', () => {
      const originalPrompt = 'Create a React counter component';
      const enhancedPrompt = preprocessPrompt(originalPrompt);

      expect(enhancedPrompt).not.toBe(originalPrompt);
      expect(enhancedPrompt).toContain('PAS 3.0 compliant artifact');
      expect(enhancedPrompt).toContain('application/vnd.react+tsx');
      expect(enhancedPrompt).toContain('<artifact identifier=');
    });

    it('should enhance HTML page requests', () => {
      const originalPrompt = 'Build a simple HTML page with CSS styling';
      const enhancedPrompt = preprocessPrompt(originalPrompt);

      expect(enhancedPrompt).not.toBe(originalPrompt);
      expect(enhancedPrompt).toContain('text/html');
      expect(enhancedPrompt).toContain('index.html');
    });

    it('should enhance Svelte component requests', () => {
      const originalPrompt = 'Make a Svelte todo list component';
      const enhancedPrompt = preprocessPrompt(originalPrompt);

      expect(enhancedPrompt).not.toBe(originalPrompt);
      expect(enhancedPrompt).toContain('application/vnd.svelte+ts');
      expect(enhancedPrompt).toContain('Component.svelte');
    });

    it('should enhance diagram requests', () => {
      const originalPrompt = 'Create a flowchart diagram';
      const enhancedPrompt = preprocessPrompt(originalPrompt);

      expect(enhancedPrompt).not.toBe(originalPrompt);
      expect(enhancedPrompt).toContain('application/vnd.mermaid');
      expect(enhancedPrompt).toContain('diagram.mmd');
    });

    it('should NOT enhance informational queries', () => {
      const informationalPrompts = [
        'How do I create a React component?',
        'What is the difference between let and const?',
        'Explain to me how closures work',
        'Tell me about React hooks',
        'Can you describe the differences between TypeScript and JavaScript?'
      ];

      informationalPrompts.forEach(prompt => {
        const result = preprocessPrompt(prompt);
        expect(result).toBe(prompt); // Should remain unchanged
      });
    });

    it('should prefer TypeScript by default', () => {
      const prompt = 'Create a function component';
      const enhanced = preprocessPrompt(prompt);

      expect(enhanced).toContain('TypeScript');
      expect(enhanced).toContain('tsx');
    });

    it('should detect JavaScript preference when explicitly requested', () => {
      const prompt = 'Create a React component in JavaScript, no TypeScript please';
      const enhanced = preprocessPrompt(prompt);

      expect(enhanced).toContain('JavaScript');
      expect(enhanced).toContain('jsx');
    });

    it('should handle empty or invalid prompts gracefully', () => {
      expect(preprocessPrompt('')).toBe('');
      expect(preprocessPrompt('   ')).toBe('   ');
      expect(() => preprocessPrompt(null as any)).not.toThrow();
      expect(() => preprocessPrompt(undefined as any)).not.toThrow();
    });
  });

  describe('Response Processing', () => {
    const { postprocessResponse } = useArtifactIntegration();

    it('should detect and parse PAS 3.0 artifacts', () => {
      const responseWithArtifact = `
Here's your React counter component:

<artifact identifier="react-counter-123" type="application/vnd.react+tsx" title="Counter Component">
<description>A simple counter component with increment and decrement buttons</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
</dependencies>
<files>
<file path="App.tsx">
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}
</file>
</files>
</artifact>

This component demonstrates basic React state management with hooks.
      `;

      const artifacts = postprocessResponse(responseWithArtifact, 'test-message-id');

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].artifact.identifier).toBe('react-counter-123');
      expect(artifacts[0].artifact.type).toBe('application/vnd.react+tsx');
      expect(artifacts[0].artifact.files).toHaveLength(1);
      expect(artifacts[0].artifact.dependencies).toHaveLength(2);
    });

    it('should handle multiple artifacts in one response', () => {
      const responseWithMultipleArtifacts = `
<artifact identifier="html-page-1" type="text/html" title="HTML Page">
<files><file path="index.html"><html><body>Test</body></html></file></files>
</artifact>

<artifact identifier="css-styles-1" type="text/css" title="CSS Styles">
<files><file path="styles.css">body { color: blue; }</file></files>
</artifact>
      `;

      const artifacts = postprocessResponse(responseWithMultipleArtifacts, 'test-message-id');
      expect(artifacts).toHaveLength(2);
    });

    it('should handle responses without artifacts', () => {
      const normalResponse = 'This is just a regular response without any artifacts.';
      const artifacts = postprocessResponse(normalResponse, 'test-message-id');

      expect(artifacts).toHaveLength(0);
    });

    it('should handle malformed artifacts gracefully', () => {
      const malformedResponse = `
<artifact identifier="broken-xml">
<files>
<file path="test.js">console.log("test");
</artifact>
      `;

      expect(() => postprocessResponse(malformedResponse, 'test-message-id')).not.toThrow();
      const artifacts = postprocessResponse(malformedResponse, 'test-message-id');
      expect(artifacts).toHaveLength(0); // Should return empty array, not crash
    });
  });

  describe('Artifact Detection Utility', () => {
    it('should correctly identify messages with artifacts', () => {
      const messageWithArtifact = `
        <artifact identifier="test" type="text/html" title="Test">
        <files><file path="test.html">Test</file></files>
        </artifact>
      `;

      expect(hasArtifactInMessage(messageWithArtifact)).toBe(true);
    });

    it('should correctly identify messages without artifacts', () => {
      const messageWithoutArtifact = 'This is just a regular message.';
      expect(hasArtifactInMessage(messageWithoutArtifact)).toBe(false);
    });
  });

  describe('Configuration and Settings', () => {
    it('should respect confidence threshold settings', () => {
      // Initialize with high threshold
      initializeArtifactIntegration({ confidenceThreshold: 0.9 });

      const { preprocessPrompt } = useArtifactIntegration();
      const prompt = 'create component'; // Lower confidence prompt

      // With high threshold, this should not be enhanced
      expect(preprocessPrompt(prompt)).toBe(prompt);

      // Reset to lower threshold
      initializeArtifactIntegration({ confidenceThreshold: 0.5 });

      // Now it should be enhanced
      expect(preprocessPrompt(prompt)).not.toBe(prompt);
    });

    it('should enable debug mode when configured', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      initializeArtifactIntegration({ debugMode: true });

      const { preprocessPrompt } = useArtifactIntegration();
      preprocessPrompt('create a React component');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle preprocessing errors gracefully', () => {
      const { preprocessPrompt } = useArtifactIntegration();

      // Mock intent classifier to throw error
      vi.doMock('./intent-classifier', () => ({
        classifyIntent: () => { throw new Error('Classification failed'); }
      }));

      expect(() => preprocessPrompt('test prompt')).not.toThrow();
    });

    it('should handle postprocessing errors gracefully', () => {
      const { postprocessResponse } = useArtifactIntegration();

      expect(() => postprocessResponse('invalid content', 'message-id')).not.toThrow();
    });
  });

  describe('Integration State Management', () => {
    it('should maintain integration instance state', () => {
      expect(artifactIntegration).toBeDefined();
      expect(typeof artifactIntegration.shouldEnhancePrompt).toBe('function');
      expect(typeof artifactIntegration.enhancePrompt).toBe('function');
      expect(typeof artifactIntegration.processResponse).toBe('function');
    });

    it('should provide consistent results across calls', () => {
      const { preprocessPrompt } = useArtifactIntegration();
      const prompt = 'Create a React counter component';

      const result1 = preprocessPrompt(prompt);
      const result2 = preprocessPrompt(prompt);

      expect(result1).toBe(result2);
    });
  });

  describe('Performance Considerations', () => {
    it('should complete intent classification quickly', () => {
      const { preprocessPrompt } = useArtifactIntegration();
      const prompt = 'Create a React component with state management';

      const startTime = performance.now();
      preprocessPrompt(prompt);
      const endTime = performance.now();

      // Classification should complete in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle large prompts efficiently', () => {
      const { preprocessPrompt } = useArtifactIntegration();
      const largePrompt = 'Create a React component ' + 'with many features '.repeat(1000);

      const startTime = performance.now();
      const result = preprocessPrompt(largePrompt);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(200);
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle Unicode and special characters', () => {
      const { preprocessPrompt } = useArtifactIntegration();
      const unicodePrompt = 'Create a React component with émojis 🚀 and spëcial châractërs';

      expect(() => preprocessPrompt(unicodePrompt)).not.toThrow();
    });

    it('should handle very long artifact responses', () => {
      const { postprocessResponse } = useArtifactIntegration();
      const longContent = 'console.log("test");'.repeat(10000);
      const longArtifact = `
        <artifact identifier="long-test" type="application/javascript" title="Long Code">
        <files><file path="test.js">${longContent}</file></files>
        </artifact>
      `;

      expect(() => postprocessResponse(longArtifact, 'test-id')).not.toThrow();
    });
  });
});

// Integration Tests (would typically be in a separate file)
describe('End-to-End Integration Tests', () => {
  it('should handle complete workflow: prompt -> enhancement -> response -> artifacts', async () => {
    const { preprocessPrompt, postprocessResponse } = useArtifactIntegration();

    // Step 1: User prompt
    const userPrompt = 'Create a simple React button component';

    // Step 2: Preprocessing
    const enhancedPrompt = preprocessPrompt(userPrompt);
    expect(enhancedPrompt).toContain('PAS 3.0');

    // Step 3: Simulated LLM response (would normally come from API)
    const llmResponse = `
I'll create a React button component for you:

<artifact identifier="react-button-demo" type="application/vnd.react+tsx" title="React Button Component">
<description>A reusable button component with customizable text and click handler</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
</dependencies>
<files>
<file path="Button.tsx">
import React from 'react';

interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function Button({ text, onClick, disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
    >
      {text}
    </button>
  );
}
</file>
</files>
</artifact>

This component accepts text, an onClick handler, and an optional disabled prop.
    `;

    // Step 4: Response processing
    const artifacts = postprocessResponse(llmResponse, 'test-message-123');

    // Verify end-to-end flow
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].artifact.identifier).toBe('react-button-demo');
    expect(artifacts[0].artifact.type).toBe('application/vnd.react+tsx');
    expect(artifacts[0].messageId).toBe('test-message-123');
  });
});