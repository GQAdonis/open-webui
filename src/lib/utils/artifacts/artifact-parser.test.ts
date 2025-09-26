/**
 * Tests for PAS 3.0 Artifact Parser
 */

import { describe, it, expect } from 'vitest';
import {
  extractArtifacts,
  parseArtifact,
  validateArtifact,
  getPrimaryFile,
  getLanguageFromType,
  isTypeScriptArtifact,
  getSandpackTemplate,
  getSandpackFiles
} from './artifact-parser';

describe('Artifact Parser', () => {
  const sampleReactArtifact = `
<artifact identifier="simple-counter" type="application/vnd.react+tsx" title="Simple Counter">
<description>A simple React counter component</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
</dependencies>
<files>
<file path="App.tsx">
import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button onClick={() => setCount(count - 1)}>
        Decrement
      </button>
    </div>
  );
}
</file>
</files>
</artifact>`;

  const sampleHtmlArtifact = `
<artifact identifier="landing-page" type="text/html" title="Landing Page">
<description>A simple landing page</description>
<files>
<file path="index.html">
<!DOCTYPE html>
<html>
<head>
  <title>Landing Page</title>
  <style>
    body { font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is a sample landing page.</p>
</body>
</html>
</file>
</files>
</artifact>`;

  describe('extractArtifacts', () => {
    it('should extract React artifact from response text', () => {
      console.log('🧪 Testing extractArtifacts with React artifact');
      const response = `Here's your counter component:\n\n${sampleReactArtifact}\n\nThis component uses React hooks.`;

      const artifacts = extractArtifacts(response);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('simple-counter');
      expect(artifacts[0].type).toBe('application/vnd.react+tsx');
      expect(artifacts[0].title).toBe('Simple Counter');
      expect(artifacts[0].files).toHaveLength(1);
      expect(artifacts[0].files[0].path).toBe('App.tsx');
    });

    it('should extract HTML artifact from response text', () => {
      console.log('🧪 Testing extractArtifacts with HTML artifact');
      const response = `Here's your landing page:\n\n${sampleHtmlArtifact}`;

      const artifacts = extractArtifacts(response);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].identifier).toBe('landing-page');
      expect(artifacts[0].type).toBe('text/html');
      expect(artifacts[0].files[0].path).toBe('index.html');
    });

    it('should return empty array when no artifacts found', () => {
      const response = 'This is just a regular response with no artifacts.';
      const artifacts = extractArtifacts(response);
      expect(artifacts).toHaveLength(0);
    });

    it('should handle multiple artifacts in one response', () => {
      const response = `${sampleReactArtifact}\n\nAnd here's also:\n\n${sampleHtmlArtifact}`;
      const artifacts = extractArtifacts(response);
      expect(artifacts).toHaveLength(2);
    });
  });

  describe('parseArtifact', () => {
    it('should parse valid React artifact', () => {
      console.log('🧪 Testing parseArtifact with React artifact');
      const artifact = parseArtifact(sampleReactArtifact);

      expect(artifact).not.toBeNull();
      expect(artifact?.identifier).toBe('simple-counter');
      expect(artifact?.type).toBe('application/vnd.react+tsx');
      expect(artifact?.title).toBe('Simple Counter');
      expect(artifact?.description).toBe('A simple React counter component');
      expect(artifact?.dependencies).toHaveLength(2);
      expect(artifact?.files).toHaveLength(1);
      expect(artifact?.files[0].path).toBe('App.tsx');
      expect(artifact?.files[0].content).toContain('useState');
    });

    it('should return null for invalid XML', () => {
      const invalidXml = '<artifact>invalid</artifact>';
      const artifact = parseArtifact(invalidXml);
      expect(artifact).toBeNull();
    });

    it('should return null for missing required attributes', () => {
      const invalidArtifact = '<artifact type="react"><files><file path="test.js">code</file></files></artifact>';
      const artifact = parseArtifact(invalidArtifact);
      expect(artifact).toBeNull();
    });
  });

  describe('validateArtifact', () => {
    it('should validate valid artifact', () => {
      const artifact = parseArtifact(sampleReactArtifact);
      expect(artifact).not.toBeNull();

      const validation = validateArtifact(artifact!);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidArtifact = {
        identifier: '',
        type: 'application/vnd.react+tsx',
        title: 'Test',
        dependencies: [],
        files: [],
        raw: '<artifact></artifact>'
      };

      const validation = validateArtifact(invalidArtifact);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required identifier');
      expect(validation.errors).toContain('At least one file is required');
    });
  });

  describe('getPrimaryFile', () => {
    it('should return App.tsx as primary file for React artifact', () => {
      const artifact = parseArtifact(sampleReactArtifact);
      expect(artifact).not.toBeNull();

      const primaryFile = getPrimaryFile(artifact!);
      expect(primaryFile?.path).toBe('App.tsx');
    });

    it('should return index.html as primary file for HTML artifact', () => {
      const artifact = parseArtifact(sampleHtmlArtifact);
      expect(artifact).not.toBeNull();

      const primaryFile = getPrimaryFile(artifact!);
      expect(primaryFile?.path).toBe('index.html');
    });
  });

  describe('getLanguageFromType', () => {
    it('should return tsx for React TSX type', () => {
      expect(getLanguageFromType('application/vnd.react+tsx')).toBe('tsx');
    });

    it('should return jsx for React JSX type', () => {
      expect(getLanguageFromType('application/vnd.react+jsx')).toBe('jsx');
    });

    it('should return html for HTML type', () => {
      expect(getLanguageFromType('text/html')).toBe('html');
    });

    it('should default to typescript for unknown types', () => {
      expect(getLanguageFromType('unknown/type')).toBe('typescript');
    });
  });

  describe('isTypeScriptArtifact', () => {
    it('should detect TypeScript artifacts by type', () => {
      const artifact = parseArtifact(sampleReactArtifact);
      expect(artifact).not.toBeNull();
      expect(isTypeScriptArtifact(artifact!)).toBe(true);
    });

    it('should detect TypeScript artifacts by file extension', () => {
      const tsArtifact = sampleReactArtifact.replace('App.tsx', 'App.ts');
      const artifact = parseArtifact(tsArtifact);
      expect(artifact).not.toBeNull();
      expect(isTypeScriptArtifact(artifact!)).toBe(true);
    });
  });

  describe('getSandpackTemplate', () => {
    it('should return react-ts template for React TSX artifact', () => {
      const artifact = parseArtifact(sampleReactArtifact);
      expect(artifact).not.toBeNull();
      expect(getSandpackTemplate(artifact!)).toBe('react-ts');
    });

    it('should return static template for HTML artifact', () => {
      const artifact = parseArtifact(sampleHtmlArtifact);
      expect(artifact).not.toBeNull();
      expect(getSandpackTemplate(artifact!)).toBe('static');
    });
  });

  describe('getSandpackFiles', () => {
    it('should convert artifact files to Sandpack format', () => {
      const artifact = parseArtifact(sampleReactArtifact);
      expect(artifact).not.toBeNull();

      const files = getSandpackFiles(artifact!);
      expect(files['/App.tsx']).toBeDefined();
      expect(files['/App.tsx']).toContain('useState');
      expect(files['/package.json']).toBeDefined();

      const packageJson = JSON.parse(files['/package.json']);
      expect(packageJson.dependencies.react).toBe('18.2.0');
    });
  });
});