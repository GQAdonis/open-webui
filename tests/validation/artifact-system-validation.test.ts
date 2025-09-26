/**
 * Comprehensive Artifact System Validation
 * Tests the complete workflow from prompt classification to artifact rendering
 */

import { describe, it, expect } from 'vitest';
import { classifyIntent, enhancePromptForArtifacts } from '../../src/lib/utils/artifacts/intent-classifier';
import { extractArtifacts, parseArtifact, validateArtifact } from '../../src/lib/utils/artifacts/artifact-parser';
import { artifactIntegration } from '../../src/lib/utils/artifacts/integration';

describe('Complete Artifact System Validation', () => {

  // Test data representing real AI responses
  const sampleAIResponses = {
    reactCounter: `Here's a simple React counter component:

<artifact identifier="react-counter-demo" type="application/vnd.react+tsx" title="React Counter">
<description>A simple counter component with increment and decrement buttons</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
<dependency name="@types/react" version="18.2.0"/>
<dependency name="@types/react-dom" version="18.2.0"/>
</dependencies>
<files>
<file path="App.tsx">
import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>Counter: {count}</h1>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: '10px 20px',
            margin: '0 10px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
        <button
          onClick={() => setCount(count - 1)}
          style={{
            padding: '10px 20px',
            margin: '0 10px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          -
        </button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setCount(0)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
</file>
</files>
</artifact>

This counter component includes:
- State management with React hooks
- Clean styling with inline CSS
- Three buttons: increment, decrement, and reset`,

    htmlLandingPage: `Here's a simple landing page:

<artifact identifier="simple-landing" type="text/html" title="Landing Page">
<description>A responsive landing page with modern design</description>
<files>
<file path="index.html">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - Landing Page</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            max-width: 800px;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            text-align: center;
        }

        h1 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 2.5em;
        }

        p {
            margin-bottom: 30px;
            font-size: 1.2em;
            color: #7f8c8d;
        }

        .cta-button {
            display: inline-block;
            padding: 15px 30px;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: all 0.3s ease;
        }

        .cta-button:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Our Platform</h1>
        <p>Discover amazing features and join thousands of satisfied users who trust our service.</p>
        <a href="#" class="cta-button">Get Started</a>
    </div>
</body>
</html>
</file>
</files>
</artifact>

This landing page features:
- Responsive design
- Modern gradient background
- Clean typography
- Call-to-action button with hover effects`
  };

  const testPrompts = {
    reactCounter: "Create a simple React counter with increment and decrement buttons",
    htmlLanding: "Build a landing page with modern design",
    nonArtifact: "What is React and how does it work?",
    buttonComponent: "Make a button component"
  };

  describe('Intent Classification', () => {
    it('should correctly classify React component prompts with high confidence', () => {
      const classification = classifyIntent(testPrompts.reactCounter);

      expect(classification.intent).toBe('react_component');
      expect(classification.confidence).toBeGreaterThan(0.7);
      expect(classification.preferredLanguage).toBe('typescript');
      expect(classification.suggestedPromptEnhancement).toContain('PAS 3.0');
      expect(classification.suggestedPromptEnhancement).toContain('application/vnd.react+tsx');
    });

    it('should correctly classify HTML page prompts', () => {
      const classification = classifyIntent(testPrompts.htmlLanding);

      expect(classification.intent).toBe('html_page');
      expect(classification.confidence).toBeGreaterThan(0.7);
    });

    it('should reject non-artifact prompts', () => {
      const classification = classifyIntent(testPrompts.nonArtifact);

      expect(classification.intent).toBe('none');
      expect(classification.confidence).toBeGreaterThan(0.8);
    });

    it('should classify simple component requests', () => {
      const classification = classifyIntent(testPrompts.buttonComponent);

      expect(classification.intent).toBe('react_component');
      expect(classification.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Prompt Enhancement', () => {
    it('should enhance artifact-worthy prompts', () => {
      const classification = classifyIntent(testPrompts.reactCounter);
      const enhanced = enhancePromptForArtifacts(testPrompts.reactCounter, classification);

      expect(enhanced).toContain(testPrompts.reactCounter);
      expect(enhanced).toContain('PAS 3.0 compliant artifact');
      expect(enhanced).toContain('<artifact identifier=');
      expect(enhanced).toContain('application/vnd.react+tsx');
    });

    it('should not enhance non-artifact prompts', () => {
      const classification = classifyIntent(testPrompts.nonArtifact);
      const enhanced = enhancePromptForArtifacts(testPrompts.nonArtifact, classification);

      expect(enhanced).toBe(testPrompts.nonArtifact);
    });
  });

  describe('Artifact Parsing and Validation', () => {
    it('should extract and parse React counter artifact', () => {
      const artifacts = extractArtifacts(sampleAIResponses.reactCounter);

      expect(artifacts).toHaveLength(1);

      const artifact = artifacts[0];
      expect(artifact.identifier).toBe('react-counter-demo');
      expect(artifact.type).toBe('application/vnd.react+tsx');
      expect(artifact.title).toBe('React Counter');
      expect(artifact.dependencies).toHaveLength(4);
      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].path).toBe('App.tsx');
      expect(artifact.files[0].content).toContain('useState');
      expect(artifact.files[0].content).toContain('setCount');

      const validation = validateArtifact(artifact);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should extract and parse HTML landing page artifact', () => {
      const artifacts = extractArtifacts(sampleAIResponses.htmlLandingPage);

      expect(artifacts).toHaveLength(1);

      const artifact = artifacts[0];
      expect(artifact.identifier).toBe('simple-landing');
      expect(artifact.type).toBe('text/html');
      expect(artifact.title).toBe('Landing Page');
      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].path).toBe('index.html');
      expect(artifact.files[0].content).toContain('<!DOCTYPE html>');
      expect(artifact.files[0].content).toContain('Welcome to Our Platform');

      const validation = validateArtifact(artifact);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle responses with no artifacts', () => {
      const response = "This is just a regular explanation about React components without any artifacts.";
      const artifacts = extractArtifacts(response);

      expect(artifacts).toHaveLength(0);
    });
  });

  describe('Integration Workflow', () => {
    it('should determine when to enhance prompts', () => {
      expect(artifactIntegration.shouldEnhancePrompt(testPrompts.reactCounter)).toBe(true);
      expect(artifactIntegration.shouldEnhancePrompt(testPrompts.htmlLanding)).toBe(true);
      expect(artifactIntegration.shouldEnhancePrompt(testPrompts.nonArtifact)).toBe(false);
    });

    it('should enhance prompts correctly', () => {
      const enhanced = artifactIntegration.enhancePrompt(testPrompts.reactCounter);

      expect(enhanced).toContain(testPrompts.reactCounter);
      expect(enhanced).toContain('PAS 3.0');
    });

    it('should process AI responses and extract artifacts', async () => {
      const containers = await artifactIntegration.processResponse(
        sampleAIResponses.reactCounter,
        'test-message-123',
        'test-chat-456'
      );

      expect(containers).toHaveLength(1);

      const container = containers[0];
      expect(container.identifier).toContain('test-message-123');
      expect(container.type).toBe('application/vnd.react+jsx'); // Converted to legacy format
      expect(container.files).toHaveLength(1);
      expect(container.files[0].content).toContain('useState');
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('should complete the full artifact creation workflow', async () => {
      console.log('🧪 Testing complete artifact workflow...');

      // Step 1: User submits prompt
      const userPrompt = testPrompts.reactCounter;
      console.log('📝 User prompt:', userPrompt);

      // Step 2: System checks if prompt should be enhanced
      const shouldEnhance = artifactIntegration.shouldEnhancePrompt(userPrompt);
      console.log('🤔 Should enhance prompt:', shouldEnhance);
      expect(shouldEnhance).toBe(true);

      // Step 3: System enhances prompt with artifact instructions
      const enhancedPrompt = artifactIntegration.enhancePrompt(userPrompt);
      console.log('✨ Enhanced prompt length:', enhancedPrompt.length);
      expect(enhancedPrompt).toContain('PAS 3.0');

      // Step 4: AI responds with artifact (simulated)
      const aiResponse = sampleAIResponses.reactCounter;
      console.log('🤖 AI response length:', aiResponse.length);

      // Step 5: System processes response and extracts artifacts
      const containers = await artifactIntegration.processResponse(
        aiResponse,
        'workflow-test-msg-789',
        'workflow-test-chat-101'
      );
      console.log('🎯 Extracted containers:', containers.length);
      expect(containers).toHaveLength(1);

      // Step 6: Validate artifact container
      const container = containers[0];
      console.log('📦 Container details:', {
        identifier: container.identifier,
        type: container.type,
        filesCount: container.files.length,
        hasMetadata: !!container.metadata
      });

      expect(container.identifier).toBeDefined();
      expect(container.type).toBeDefined();
      expect(container.files).toHaveLength(1);
      expect(container.files[0].content).toContain('useState');
      expect(container.metadata).toBeDefined();
      expect(container.metadata.createdAt).toBeDefined();

      console.log('✅ Complete workflow test passed!');
    });

    it('should handle non-artifact workflow correctly', async () => {
      const userPrompt = testPrompts.nonArtifact;

      // Should not enhance
      const shouldEnhance = artifactIntegration.shouldEnhancePrompt(userPrompt);
      expect(shouldEnhance).toBe(false);

      // Should return original prompt
      const enhancedPrompt = artifactIntegration.enhancePrompt(userPrompt);
      expect(enhancedPrompt).toBe(userPrompt);

      // Should not find artifacts in response
      const simpleResponse = "React is a JavaScript library for building user interfaces...";
      const containers = await artifactIntegration.processResponse(
        simpleResponse,
        'non-artifact-msg',
        'non-artifact-chat'
      );
      expect(containers).toHaveLength(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large artifact responses efficiently', async () => {
      const largeContent = 'console.log("test");'.repeat(1000);
      const largeArtifact = `
<artifact identifier="large-test" type="application/javascript" title="Large Script">
<files>
<file path="script.js">${largeContent}</file>
</files>
</artifact>`;

      const startTime = Date.now();
      const artifacts = extractArtifacts(largeArtifact);
      const processingTime = Date.now() - startTime;

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].files[0].content).toHaveLength(largeContent.length);
      expect(processingTime).toBeLessThan(1000); // Should parse in under 1 second
    });

    it('should handle multiple artifacts in one response', async () => {
      const multipleArtifacts = sampleAIResponses.reactCounter + '\n\nAnd here\'s also:\n\n' + sampleAIResponses.htmlLandingPage;

      const containers = await artifactIntegration.processResponse(
        multipleArtifacts,
        'multi-artifact-msg',
        'multi-artifact-chat'
      );

      expect(containers).toHaveLength(2);
      expect(containers[0].type).toBe('application/vnd.react+jsx');
      expect(containers[1].type).toBe('text/html');
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedArtifact = `
<artifact identifier="broken" type="react">
<files>
<file path="test.js">broken xml content</file>
</artifact>`;

      const containers = await artifactIntegration.processResponse(
        malformedArtifact,
        'broken-msg',
        'broken-chat'
      );

      // Should handle gracefully without crashing
      expect(Array.isArray(containers)).toBe(true);
    });
  });
});