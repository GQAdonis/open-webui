/**
 * Functional test for artifact integration
 * Tests the core functionality without complex mocking
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent, enhancePromptForArtifacts, ArtifactIntent } from './intent-classifier';
import { extractArtifacts } from './artifact-parser';
import { hasArtifactInMessage } from './integration';

describe('Artifact Integration - Functional Tests', () => {
  describe('Intent Classification', () => {
    it('should classify React component requests correctly', () => {
      const result = classifyIntent('Create a React counter component');

      expect(result.intent).toBe(ArtifactIntent.REACT_COMPONENT);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.suggestedPromptEnhancement).toBeDefined();
    });

    it('should classify HTML page requests correctly', () => {
      const result = classifyIntent('Build an HTML page with CSS');

      expect(result.intent).toBe(ArtifactIntent.HTML_PAGE);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should reject informational queries', () => {
      const result = classifyIntent('How do I create a React component?');

      expect(result.intent).toBe(ArtifactIntent.NONE);
    });
  });

  describe('Prompt Enhancement', () => {
    it('should enhance React component prompts with PAS 3.0 template', () => {
      const originalPrompt = 'Create a React button component';
      const classification = classifyIntent(originalPrompt);
      const enhancedPrompt = enhancePromptForArtifacts(originalPrompt, classification);

      expect(enhancedPrompt).toContain('PAS 3.0 compliant artifact');
      expect(enhancedPrompt).toContain('application/vnd.react+tsx');
      expect(enhancedPrompt).toContain('<artifact identifier=');
      expect(enhancedPrompt).toContain('TypeScript with TSX');
    });

    it('should not enhance non-artifact prompts', () => {
      const originalPrompt = 'What is React?';
      const classification = classifyIntent(originalPrompt);
      const enhancedPrompt = enhancePromptForArtifacts(originalPrompt, classification);

      expect(enhancedPrompt).toBe(originalPrompt);
    });
  });

  describe('Artifact Detection', () => {
    it('should detect PAS 3.0 artifacts in responses', () => {
      const responseWithArtifact = `
Here's your component:

<artifact identifier="react-button-123" type="application/vnd.react+tsx" title="Button Component">
<description>A simple button component</description>
<files>
<file path="Button.tsx">
import React from 'react';

export default function Button() {
  return <button>Click me</button>;
}
</file>
</files>
</artifact>
      `;

      const artifacts = extractArtifacts(responseWithArtifact);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('react-button-123');
      expect(artifacts[0].type).toBe('application/vnd.react+tsx');
    });

    it('should return empty array for responses without artifacts', () => {
      const normalResponse = 'This is just a regular response.';
      const artifacts = extractArtifacts(normalResponse);
      expect(artifacts).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify messages with artifacts', () => {
      const messageWithArtifact = '<artifact identifier="test" type="text/html" title="Test"><files><file path="test.html">Test</file></files></artifact>';
      const messageWithoutArtifact = 'Regular message';

      expect(hasArtifactInMessage(messageWithArtifact)).toBe(true);
      expect(hasArtifactInMessage(messageWithoutArtifact)).toBe(false);
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete the full artifact workflow', () => {
      // Step 1: User prompt
      const userPrompt = 'Create a simple React counter';

      // Step 2: Intent classification
      const classification = classifyIntent(userPrompt);
      expect(classification.intent).toBe(ArtifactIntent.REACT_COMPONENT);

      // Step 3: Prompt enhancement
      const enhancedPrompt = enhancePromptForArtifacts(userPrompt, classification);
      expect(enhancedPrompt).toContain('PAS 3.0');

      // Step 4: Simulated LLM response
      const llmResponse = `
I'll create a React counter for you:

<artifact identifier="react-counter-demo" type="application/vnd.react+tsx" title="React Counter">
<description>A simple counter component with increment/decrement buttons</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
</dependencies>
<files>
<file path="Counter.tsx">
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
      `;

      // Step 5: Artifact extraction
      const artifacts = extractArtifacts(llmResponse);
      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('react-counter-demo');
      expect(artifacts[0].type).toBe('application/vnd.react+tsx');
      expect(artifacts[0].files[0].path).toBe('Counter.tsx');
    });
  });
});