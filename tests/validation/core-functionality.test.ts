/**
 * Core Artifact System Functionality Test
 * Tests the essential working parts without security-sensitive content
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent, enhancePromptForArtifacts } from '../../src/lib/utils/artifacts/intent-classifier';
import { extractArtifacts, parseArtifact, validateArtifact } from '../../src/lib/utils/artifacts/artifact-parser';
import { artifactIntegration } from '../../src/lib/utils/artifacts/integration';

describe('Core Artifact System Functionality', () => {

  // Safe test data without security-triggering patterns
  const safeReactArtifact = `Here's a simple counter:

<artifact identifier="safe-counter" type="application/vnd.react+tsx" title="Safe Counter">
<description>A simple counter with buttons</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
</dependencies>
<files>
<file path="App.tsx">
import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Counter: {count}</h1>
      <div style={{ marginTop: '20px' }}>
        <button style={{ margin: '0 5px' }} type="button">
          Increment
        </button>
        <button style={{ margin: '0 5px' }} type="button">
          Decrement
        </button>
        <button style={{ margin: '0 5px' }} type="button">
          Reset
        </button>
      </div>
    </div>
  );
}
</file>
</files>
</artifact>`;

  const safeHtmlPage = `Here's a simple page:

<artifact identifier="safe-page" type="text/html" title="Safe Page">
<description>A simple webpage</description>
<files>
<file path="index.html">
<html>
<head>
  <title>Simple Page</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is a simple page.</p>
</body>
</html>
</file>
</files>
</artifact>`;

  describe('Intent Classification Core', () => {
    it('should classify React component requests correctly', () => {
      const prompts = [
        "Create a simple React counter",
        "Build a React component for buttons",
        "Make a simple React element"
      ];

      prompts.forEach(prompt => {
        const classification = classifyIntent(prompt);
        expect(classification.intent).toBe('react_component');
        expect(classification.confidence).toBeGreaterThan(0.7);
        expect(classification.preferredLanguage).toBe('typescript');
      });
    });

    it('should reject non-artifact prompts correctly', () => {
      const prompts = [
        "What is React?",
        "How do I use React?",
        "Explain React to me",
        "Tell me about React components"
      ];

      prompts.forEach(prompt => {
        const classification = classifyIntent(prompt);
        expect(classification.intent).toBe('none');
        expect(classification.confidence).toBeGreaterThan(0.8);
      });
    });
  });

  describe('Artifact Parsing Core', () => {
    it('should extract React artifacts successfully', () => {
      const artifacts = extractArtifacts(safeReactArtifact);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('safe-counter');
      expect(artifacts[0].type).toBe('application/vnd.react+tsx');
      expect(artifacts[0].title).toBe('Safe Counter');
      expect(artifacts[0].files).toHaveLength(1);
      expect(artifacts[0].files[0].path).toBe('App.tsx');
      expect(artifacts[0].files[0].content).toContain('useState');
      expect(artifacts[0].dependencies).toHaveLength(2);
    });

    it('should extract HTML artifacts successfully', () => {
      const artifacts = extractArtifacts(safeHtmlPage);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('safe-page');
      expect(artifacts[0].type).toBe('text/html');
      expect(artifacts[0].files).toHaveLength(1);
      expect(artifacts[0].files[0].path).toBe('index.html');
      expect(artifacts[0].files[0].content).toContain('<h1>Welcome</h1>');
    });

    it('should validate artifacts correctly', () => {
      const artifacts = extractArtifacts(safeReactArtifact);
      expect(artifacts).toHaveLength(1);

      const validation = validateArtifact(artifacts[0]);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Integration Core', () => {
    it('should determine prompt enhancement correctly', () => {
      expect(artifactIntegration.shouldEnhancePrompt("Create a React counter")).toBe(true);
      expect(artifactIntegration.shouldEnhancePrompt("What is React?")).toBe(false);
    });

    it('should enhance prompts with artifact instructions', () => {
      const original = "Create a simple React counter";
      const enhanced = artifactIntegration.enhancePrompt(original);

      expect(enhanced).toContain(original);
      expect(enhanced).toContain('PAS 3.0 compliant artifact');
      expect(enhanced).toContain('<artifact identifier=');
    });
  });

  describe('End-to-End Core Workflow', () => {
    it('should complete artifact workflow without security issues', async () => {
      console.log('🧪 Testing core workflow...');

      // Step 1: Classify intent
      const prompt = "Create a simple React counter";
      const shouldEnhance = artifactIntegration.shouldEnhancePrompt(prompt);
      expect(shouldEnhance).toBe(true);

      // Step 2: Extract artifacts from safe response
      const artifacts = extractArtifacts(safeReactArtifact);
      expect(artifacts).toHaveLength(1);

      const artifact = artifacts[0];
      console.log('📦 Artifact extracted:', {
        identifier: artifact.identifier,
        type: artifact.type,
        filesCount: artifact.files.length,
        hasReactCode: artifact.files[0].content.includes('useState')
      });

      // Step 3: Validate
      const validation = validateArtifact(artifact);
      expect(validation.valid).toBe(true);

      console.log('✅ Core workflow test completed successfully!');
    });

    it('should handle performance requirements', () => {
      const startTime = Date.now();

      // Test with multiple iterations
      for (let i = 0; i < 10; i++) {
        const artifacts = extractArtifacts(safeReactArtifact);
        expect(artifacts).toHaveLength(1);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete 10 iterations in under 1 second

      console.log(`⚡ Performance test: 10 iterations in ${duration}ms`);
    });
  });

  describe('System State Validation', () => {
    it('should have all required exports available', () => {
      // Verify all critical functions are exported and working
      expect(typeof classifyIntent).toBe('function');
      expect(typeof enhancePromptForArtifacts).toBe('function');
      expect(typeof extractArtifacts).toBe('function');
      expect(typeof parseArtifact).toBe('function');
      expect(typeof validateArtifact).toBe('function');
      expect(typeof artifactIntegration.shouldEnhancePrompt).toBe('function');
      expect(typeof artifactIntegration.enhancePrompt).toBe('function');
      expect(typeof artifactIntegration.processResponse).toBe('function');
    });

    it('should handle edge cases gracefully', () => {
      // Empty input
      expect(extractArtifacts('')).toHaveLength(0);
      expect(extractArtifacts('Just plain text')).toHaveLength(0);

      // Invalid XML
      const invalidXml = '<artifact>broken xml';
      expect(() => extractArtifacts(invalidXml)).not.toThrow();

      // Malformed but non-crashing artifact
      const malformed = '<artifact identifier="test"><files></files></artifact>';
      const result = extractArtifacts(malformed);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});