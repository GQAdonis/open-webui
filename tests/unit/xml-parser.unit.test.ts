/**
 * XML Artifact Parser Unit Tests
 *
 * Tests the XML artifact parser for proper PAS 3.0 schema compliance,
 * CDATA handling, validation, and performance requirements.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  parseArtifactsFromContent,
  parseArtifactsWithValidation,
  hasArtifactTags,
  validateArtifact,
  validateArtifactPAS3,
  getSupportedArtifactTypes,
  shouldUseSandpack,
  getSandpackTemplate,
  getSandpackFiles,
  isTypeScriptArtifact,
  PAS3_SCHEMA,
  type ParsedArtifact,
  type ArtifactParseResult,
  type ArtifactFile
} from '../../src/lib/utils/artifacts/xml-artifact-parser';
import type { ArtifactParsingRequest } from '../../src/lib/types/enhanced-artifacts';

describe('XML Artifact Parser', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Setup mock date for consistent timing tests
    mockDate = new Date('2024-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Artifact Detection', () => {
    it('should detect artifact tags in content', () => {
      const content = `
        Here is some text.
        <artifact identifier="test" type="text/html" title="Test">
          <file path="index.html"><![CDATA[<h1>Hello</h1>]]></file>
        </artifact>
        More text here.
      `;

      expect(hasArtifactTags(content)).toBe(true);
    });

    it('should not detect artifact tags in plain content', () => {
      const content = 'This is just plain text with no artifacts.';
      expect(hasArtifactTags(content)).toBe(false);
    });

    it('should detect multiple artifact tags', () => {
      const content = `
        <artifact identifier="test1" type="text/html" title="First">
          <file path="index.html"><![CDATA[<h1>First</h1>]]></file>
        </artifact>
        Some text between artifacts.
        <artifact identifier="test2" type="application/vnd.react+jsx" title="Second">
          <file path="App.jsx"><![CDATA[function App() { return <div>Second</div>; }]]></file>
        </artifact>
      `;

      expect(hasArtifactTags(content)).toBe(true);
    });

    it('should handle malformed artifact tags gracefully', () => {
      const content = '<artifact>incomplete tag without closing';
      expect(hasArtifactTags(content)).toBe(false);
    });
  });

  describe('Basic Parsing', () => {
    it('should parse a simple HTML artifact', () => {
      const content = `
        <artifact identifier="html-test" type="text/html" title="HTML Example">
          <description>A simple HTML page</description>
          <files>
            <file path="index.html"><![CDATA[
              <!DOCTYPE html>
              <html>
                <head><title>Test</title></head>
                <body><h1>Hello World</h1></body>
              </html>
            ]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);

      expect(result.hasArtifacts).toBe(true);
      expect(result.artifacts).toHaveLength(1);

      const artifact = result.artifacts[0];
      expect(artifact.identifier).toBe('html-test');
      expect(artifact.type).toBe('text/html');
      expect(artifact.title).toBe('HTML Example');
      expect(artifact.description).toBe('A simple HTML page');
      expect(artifact.files).toHaveLength(1);
      expect(artifact.files[0].path).toBe('index.html');
      expect(artifact.files[0].content).toContain('Hello World');
    });

    it('should parse a React artifact with dependencies', () => {
      const content = `
        <artifact identifier="react-test" type="application/vnd.react+jsx" title="React Component">
          <description>A React button component</description>
          <dependencies>
            <dependency name="react" version="18.2.0" />
            <dependency name="react-dom" version="18.2.0" />
          </dependencies>
          <files>
            <file path="App.jsx"><![CDATA[
              function App() {
                return <button onClick={() => alert('Clicked!')}>Click me</button>;
              }
              export default App;
            ]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);

      expect(result.hasArtifacts).toBe(true);
      expect(result.artifacts).toHaveLength(1);

      const artifact = result.artifacts[0];
      expect(artifact.identifier).toBe('react-test');
      expect(artifact.type).toBe('application/vnd.react+jsx');
      expect(artifact.dependencies).toHaveLength(2);
      expect(artifact.dependencies[0].name).toBe('react');
      expect(artifact.dependencies[0].version).toBe('18.2.0');
      expect(artifact.files[0].content).toContain('function App()');
    });

    it('should parse multiple files in an artifact', () => {
      const content = `
        <artifact identifier="multi-file" type="application/vnd.react+tsx" title="Multi-file Component">
          <files>
            <file path="App.tsx"><![CDATA[
              import { Button } from './Button';
              export default function App() {
                return <Button />;
              }
            ]]></file>
            <file path="Button.tsx"><![CDATA[
              export function Button() {
                return <button>Custom Button</button>;
              }
            ]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact.files).toHaveLength(2);
      expect(artifact.files[0].path).toBe('App.tsx');
      expect(artifact.files[1].path).toBe('Button.tsx');
      expect(artifact.files[0].content).toContain('import { Button }');
      expect(artifact.files[1].content).toContain('export function Button');
    });

    it('should handle single dependency correctly', () => {
      const content = `
        <artifact identifier="single-dep" type="application/vnd.svelte" title="Svelte Component">
          <dependencies>
            <dependency name="svelte" version="4.0.0" />
          </dependencies>
          <files>
            <file path="App.svelte"><![CDATA[<h1>Hello Svelte</h1>]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact.dependencies).toHaveLength(1);
      expect(artifact.dependencies[0].name).toBe('svelte');
    });
  });

  describe('CDATA Handling', () => {
    it('should handle CDATA sections properly', () => {
      const content = `
        <artifact identifier="cdata-test" type="text/html" title="CDATA Test">
          <files>
            <file path="index.html"><![CDATA[
              <script>
                if (x < 5 && y > 3) {
                  console.log("Special characters: <>&\"'");
                }
              </script>
            ]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact.files[0].content).toContain('if (x < 5 && y > 3)');
      expect(artifact.files[0].content).toContain('Special characters: <>&"\'');
    });

    it('should handle content without CDATA', () => {
      const content = `
        <artifact identifier="no-cdata" type="text/html" title="No CDATA">
          <files>
            <file path="simple.html">Simple text content</file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact.files[0].content).toBe('Simple text content');
    });

    it('should handle mixed CDATA and regular content', () => {
      const content = `
        <artifact identifier="mixed-content" type="application/vnd.react+jsx" title="Mixed Content">
          <files>
            <file path="App.jsx"><![CDATA[
              function App() {
                return <div>JSX content</div>;
              }
            ]]></file>
            <file path="README.md">Simple markdown content</file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact.files[0].content).toContain('function App()');
      expect(artifact.files[1].content).toBe('Simple markdown content');
    });
  });

  describe('Content Separation', () => {
    it('should separate artifact content from regular content', () => {
      const content = `
        Here is some introduction text.

        <artifact identifier="example" type="text/html" title="Example">
          <files>
            <file path="index.html"><![CDATA[<h1>Example</h1>]]></file>
          </files>
        </artifact>

        Here is some concluding text.
      `;

      const result = parseArtifactsFromContent(content);

      expect(result.contentWithoutArtifacts).toContain('Here is some introduction text.');
      expect(result.contentWithoutArtifacts).toContain('Here is some concluding text.');
      expect(result.contentWithoutArtifacts).not.toContain('<artifact');
      expect(result.hasArtifacts).toBe(true);
    });

    it('should handle multiple artifacts with interspersed content', () => {
      const content = `
        First paragraph.

        <artifact identifier="first" type="text/html" title="First">
          <files><file path="first.html"><![CDATA[<h1>First</h1>]]></file></files>
        </artifact>

        Middle paragraph.

        <artifact identifier="second" type="text/html" title="Second">
          <files><file path="second.html"><![CDATA[<h1>Second</h1>]]></file></files>
        </artifact>

        Last paragraph.
      `;

      const result = parseArtifactsFromContent(content);

      expect(result.artifacts).toHaveLength(2);
      expect(result.contentWithoutArtifacts).toContain('First paragraph.');
      expect(result.contentWithoutArtifacts).toContain('Middle paragraph.');
      expect(result.contentWithoutArtifacts).toContain('Last paragraph.');
    });
  });

  describe('Performance Tracking', () => {
    it('should track parsing time', () => {
      const content = `
        <artifact identifier="perf-test" type="text/html" title="Performance Test">
          <files>
            <file path="index.html"><![CDATA[<h1>Performance</h1>]]></file>
          </files>
        </artifact>
      `;

      // Advance time during parsing
      const parsePromise = Promise.resolve().then(() => parseArtifactsFromContent(content));
      vi.advanceTimersByTime(10);

      return parsePromise.then(result => {
        expect(result.parsingTimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof result.parsingTimeMs).toBe('number');
      });
    });

    it('should handle large content efficiently', () => {
      const largeContent = `
        <artifact identifier="large-test" type="text/html" title="Large Test">
          <files>
            <file path="large.html"><![CDATA[
              ${'<p>Large content</p>\n'.repeat(1000)}
            ]]></file>
          </files>
        </artifact>
      `;

      const startTime = Date.now();
      const result = parseArtifactsFromContent(largeContent);
      const elapsed = Date.now() - startTime;

      // Should parse within reasonable time (< 1s target)
      expect(elapsed).toBeLessThan(1000);
      expect(result.artifacts).toHaveLength(1);
      expect(result.artifacts[0].files[0].content).toContain('Large content');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed XML gracefully', () => {
      const content = `
        <artifact identifier="malformed" type="text/html" title="Test">
          <files>
            <file path="test.html"><![CDATA[<h1>Content</h1>]]>
          </files>  <!-- Missing closing file tag -->
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);

      // Should not crash, but may not parse successfully
      expect(result.artifacts).toHaveLength(0);
      expect(result.hasArtifacts).toBe(false);
    });

    it('should handle missing required attributes', () => {
      const content = `
        <artifact title="Missing Identifier">
          <files>
            <file path="test.html"><![CDATA[<h1>Content</h1>]]></file>
          </files>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);

      // Should not parse artifact without required attributes
      expect(result.artifacts).toHaveLength(0);
    });

    it('should handle artifacts with no files', () => {
      const content = `
        <artifact identifier="no-files" type="text/html" title="No Files">
          <description>Artifact without files</description>
        </artifact>
      `;

      const result = parseArtifactsFromContent(content);
      const artifact = result.artifacts[0];

      expect(artifact).toBeDefined();
      expect(artifact.files).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = parseArtifactsFromContent('');

      expect(result.hasArtifacts).toBe(false);
      expect(result.artifacts).toHaveLength(0);
      expect(result.contentWithoutArtifacts).toBe('');
      expect(result.validationErrors).toHaveLength(0);
    });

    it('should handle null and undefined gracefully', () => {
      expect(() => parseArtifactsFromContent(null as any)).toThrow();
      expect(() => parseArtifactsFromContent(undefined as any)).toThrow();
    });
  });

  describe('Validation', () => {
    describe('Basic Validation', () => {
      it('should validate a complete artifact', () => {
        const artifact: ParsedArtifact = {
          identifier: 'valid-test',
          type: 'text/html',
          title: 'Valid Test',
          description: 'A valid artifact',
          dependencies: [],
          files: [
            { path: 'index.html', content: '<h1>Valid</h1>' }
          ],
          rawXml: '<artifact>...</artifact>'
        };

        const validation = validateArtifact(artifact);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should invalidate artifact missing required fields', () => {
        const artifact: ParsedArtifact = {
          identifier: '',
          type: '',
          title: '',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        const validation = validateArtifact(artifact);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('Missing identifier');
        expect(validation.errors).toContain('Missing type');
        expect(validation.errors).toContain('Missing title');
        expect(validation.errors).toContain('No files found');
      });

      it('should validate file structure', () => {
        const artifact: ParsedArtifact = {
          identifier: 'file-test',
          type: 'text/html',
          title: 'File Test',
          dependencies: [],
          files: [
            { path: '', content: 'content' },
            { path: 'valid.html', content: '' }
          ],
          rawXml: ''
        };

        const validation = validateArtifact(artifact);

        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain('File 0 missing path');
        expect(validation.errors).toContain('File 1 (valid.html) has no content');
      });
    });

    describe('PAS 3.0 Schema Validation', () => {
      it('should validate required attributes', () => {
        const artifact: ParsedArtifact = {
          identifier: 'pas3-test',
          type: 'text/html',
          title: 'PAS 3.0 Test',
          dependencies: [],
          files: [{ path: 'index.html', content: '<h1>Test</h1>' }],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors).toHaveLength(0);
      });

      it('should validate artifact type support', () => {
        const artifact: ParsedArtifact = {
          identifier: 'unsupported-test',
          type: 'application/unsupported',
          title: 'Unsupported Type',
          dependencies: [],
          files: [{ path: 'test.txt', content: 'content' }],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.type === 'unknown_type')).toBe(true);
        expect(errors.some(e => e.message.includes('Unsupported artifact type'))).toBe(true);
      });

      it('should validate file extensions for type', () => {
        const artifact: ParsedArtifact = {
          identifier: 'extension-test',
          type: 'application/vnd.react+jsx',
          title: 'Extension Test',
          dependencies: [],
          files: [{ path: 'component.txt', content: 'function App() {}' }],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.message.includes('required extensions'))).toBe(true);
      });

      it('should validate content size limits', () => {
        const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB content
        const artifact: ParsedArtifact = {
          identifier: 'size-test',
          type: 'text/html',
          title: 'Size Test',
          dependencies: [],
          files: [{ path: 'large.html', content: largeContent }],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.message.includes('Content size'))).toBe(true);
        expect(errors.some(e => e.message.includes('exceeds maximum'))).toBe(true);
      });

      it('should validate dependencies', () => {
        const artifact: ParsedArtifact = {
          identifier: 'dep-test',
          type: 'application/vnd.react+jsx',
          title: 'Dependency Test',
          dependencies: [
            { name: 'invalid-package', version: '1.0.0' },
            { name: 'react', version: 'invalid-version' }
          ],
          files: [{ path: 'App.jsx', content: 'function App() {}' }],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.type === 'invalid_dependencies')).toBe(true);
      });

      it('should validate CDATA sections', () => {
        const artifact: ParsedArtifact = {
          identifier: 'cdata-test',
          type: 'application/vnd.react+jsx',
          title: 'CDATA Test',
          dependencies: [],
          files: [{ path: 'App.jsx', content: 'function App() { return <div>Test</div>; }' }],
          rawXml: '<artifact><file>function App() { return <div>Test</div>; }</file></artifact>'
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.type === 'missing_cdata')).toBe(true);
        expect(errors.some(e => e.message.includes('CDATA sections'))).toBe(true);
      });

      it('should validate file path safety', () => {
        const artifact: ParsedArtifact = {
          identifier: 'path-test',
          type: 'text/html',
          title: 'Path Test',
          dependencies: [],
          files: [
            { path: 'valid.html', content: '<h1>Valid</h1>' },
            { path: '../../../unsafe.html', content: '<h1>Unsafe</h1>' },
            { path: 'file<with>unsafe*chars.html', content: '<h1>Unsafe</h1>' }
          ],
          rawXml: ''
        };

        const errors = validateArtifactPAS3(artifact);

        expect(errors.some(e => e.message.includes('unsafe characters'))).toBe(true);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('Supported Types', () => {
      it('should return list of supported artifact types', () => {
        const types = getSupportedArtifactTypes();

        expect(types).toContain('text/html');
        expect(types).toContain('application/vnd.react+jsx');
        expect(types).toContain('application/vnd.react+tsx');
        expect(types).toContain('application/vnd.svelte');
        expect(types).toContain('image/svg+xml');
        expect(types).toContain('application/vnd.mermaid');
        expect(types.length).toBeGreaterThan(5);
      });
    });

    describe('Sandpack Integration', () => {
      it('should identify types that use Sandpack', () => {
        expect(shouldUseSandpack('text/html')).toBe(true);
        expect(shouldUseSandpack('application/vnd.react+jsx')).toBe(true);
        expect(shouldUseSandpack('application/vnd.react+tsx')).toBe(true);
        expect(shouldUseSandpack('application/vnd.svelte')).toBe(true);
        expect(shouldUseSandpack('image/svg+xml')).toBe(false);
        expect(shouldUseSandpack('application/json')).toBe(false);
      });

      it('should get correct Sandpack template', () => {
        const reactArtifact: ParsedArtifact = {
          identifier: 'react-test',
          type: 'application/vnd.react+jsx',
          title: 'React Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        const tsxArtifact: ParsedArtifact = {
          identifier: 'tsx-test',
          type: 'application/vnd.react+tsx',
          title: 'TSX Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        const svelteArtifact: ParsedArtifact = {
          identifier: 'svelte-test',
          type: 'application/vnd.svelte',
          title: 'Svelte Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        expect(getSandpackTemplate(reactArtifact)).toBe('react');
        expect(getSandpackTemplate(tsxArtifact)).toBe('react-ts');
        expect(getSandpackTemplate(svelteArtifact)).toBe('svelte');
      });

      it('should convert artifact files to Sandpack format', () => {
        const artifact: ParsedArtifact = {
          identifier: 'sandpack-test',
          type: 'application/vnd.react+jsx',
          title: 'Sandpack Test',
          dependencies: [],
          files: [
            { path: 'App.jsx', content: 'function App() { return <div>Test</div>; }' },
            { path: 'utils.js', content: 'export const helper = () => {};' }
          ],
          rawXml: ''
        };

        const sandpackFiles = getSandpackFiles(artifact);

        expect(sandpackFiles['/App.jsx']).toBe('function App() { return <div>Test</div>; }');
        expect(sandpackFiles['/utils.js']).toBe('export const helper = () => {};');
      });
    });

    describe('TypeScript Detection', () => {
      it('should detect TypeScript artifacts', () => {
        const tsxArtifact: ParsedArtifact = {
          identifier: 'tsx-test',
          type: 'application/vnd.react+tsx',
          title: 'TSX Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        const svelteTS: ParsedArtifact = {
          identifier: 'svelte-ts-test',
          type: 'application/vnd.svelte+ts',
          title: 'Svelte TS Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        const jsxArtifact: ParsedArtifact = {
          identifier: 'jsx-test',
          type: 'application/vnd.react+jsx',
          title: 'JSX Test',
          dependencies: [],
          files: [],
          rawXml: ''
        };

        expect(isTypeScriptArtifact(tsxArtifact)).toBe(true);
        expect(isTypeScriptArtifact(svelteTS)).toBe(true);
        expect(isTypeScriptArtifact(jsxArtifact)).toBe(false);
      });
    });
  });

  describe('Enhanced Parsing API', () => {
    it('should parse with validation request', () => {
      const request: ArtifactParsingRequest = {
        content: `
          <artifact identifier="api-test" type="application/vnd.react+jsx" title="API Test">
            <files>
              <file path="App.jsx"><![CDATA[
                function App() {
                  return <div>API Test</div>;
                }
                export default App;
              ]]></file>
            </files>
          </artifact>
        `,
        validateSchema: true,
        sessionId: 'test-session',
        timestamp: new Date()
      };

      const response = parseArtifactsWithValidation(request);

      expect(response.hasArtifacts).toBe(true);
      expect(response.artifacts).toHaveLength(1);
      expect(response.artifacts[0].id).toBe('api-test');
      expect(response.artifacts[0].type).toBe('application/vnd.react+jsx');
      expect(response.artifacts[0].isValid).toBe(true);
      expect(response.parsingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include validation errors in response', () => {
      const request: ArtifactParsingRequest = {
        content: `
          <artifact identifier="" type="invalid/type" title="">
            <files>
              <file path=""><![CDATA[]]></file>
            </files>
          </artifact>
        `,
        validateSchema: true,
        sessionId: 'test-session',
        timestamp: new Date()
      };

      const response = parseArtifactsWithValidation(request);

      expect(response.validationErrors.length).toBeGreaterThan(0);
      expect(response.artifacts[0]?.isValid).toBe(false);
    });

    it('should handle metadata extraction', () => {
      const request: ArtifactParsingRequest = {
        content: `
          <artifact identifier="metadata-test" type="application/vnd.react+tsx" title="Metadata Test">
            <dependencies>
              <dependency name="react" version="18.2.0" />
            </dependencies>
            <files>
              <file path="App.tsx"><![CDATA[
                export default function App() {
                  return <div>Metadata Test</div>;
                }
              ]]></file>
              <file path="utils.ts"><![CDATA[
                export const helper = () => 'helper';
              ]]></file>
            </files>
          </artifact>
        `,
        validateSchema: false,
        sessionId: 'test-session',
        timestamp: new Date()
      };

      const response = parseArtifactsWithValidation(request);
      const artifact = response.artifacts[0];

      expect(artifact.metadata.framework).toBe('react');
      expect(artifact.metadata.language).toBe('typescript');
      expect(artifact.metadata.extraFiles).toBeDefined();
      expect(artifact.metadata.extraFiles?.['utils.ts']).toContain('helper');
    });
  });

  describe('PAS 3.0 Schema Configuration', () => {
    it('should have valid schema configuration', () => {
      expect(PAS3_SCHEMA.version).toBe('3.0');
      expect(PAS3_SCHEMA.requiredAttributes).toContain('identifier');
      expect(PAS3_SCHEMA.requiredAttributes).toContain('type');
      expect(PAS3_SCHEMA.requiredAttributes).toContain('title');
      expect(PAS3_SCHEMA.optionalAttributes).toContain('description');
    });

    it('should have type-specific schemas', () => {
      const htmlSchema = PAS3_SCHEMA.supportedTypes['text/html'];
      expect(htmlSchema).toBeDefined();
      expect(htmlSchema.requiredFileExtensions).toContain('.html');
      expect(htmlSchema.maxFileSize).toBeGreaterThan(0);

      const reactSchema = PAS3_SCHEMA.supportedTypes['application/vnd.react+jsx'];
      expect(reactSchema).toBeDefined();
      expect(reactSchema.allowedDependencies).toContain('react');
    });
  });

  describe('Real-world Scenarios', () => {
    const testCases = [
      {
        name: 'complete React component',
        content: `
          <artifact identifier="todo-app" type="application/vnd.react+jsx" title="Todo App">
            <description>A simple todo list application</description>
            <dependencies>
              <dependency name="react" version="18.2.0" />
              <dependency name="react-dom" version="18.2.0" />
            </dependencies>
            <files>
              <file path="App.jsx"><![CDATA[
                import { useState } from 'react';

                function App() {
                  const [todos, setTodos] = useState([]);
                  const [input, setInput] = useState('');

                  const addTodo = () => {
                    if (input.trim()) {
                      setTodos([...todos, { id: Date.now(), text: input, done: false }]);
                      setInput('');
                    }
                  };

                  return (
                    <div>
                      <h1>Todo App</h1>
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                      />
                      <button onClick={addTodo}>Add</button>
                      <ul>
                        {todos.map(todo => (
                          <li key={todo.id}>{todo.text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                export default App;
              ]]></file>
            </files>
          </artifact>
        `,
        expectedValid: true,
        expectedFiles: 1,
        expectedDeps: 2
      },
      {
        name: 'HTML page with CSS',
        content: `
          <artifact identifier="landing-page" type="text/html" title="Landing Page">
            <description>A responsive landing page</description>
            <files>
              <file path="index.html"><![CDATA[
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Landing Page</title>
                  <link rel="stylesheet" href="styles.css">
                </head>
                <body>
                  <header>
                    <h1>Welcome to Our Product</h1>
                    <p>The best solution for your needs</p>
                  </header>
                  <main>
                    <section>
                      <h2>Features</h2>
                      <ul>
                        <li>Feature 1</li>
                        <li>Feature 2</li>
                        <li>Feature 3</li>
                      </ul>
                    </section>
                  </main>
                </body>
                </html>
              ]]></file>
              <file path="styles.css"><![CDATA[
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }

                body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                }

                header {
                  background: #007bff;
                  color: white;
                  text-align: center;
                  padding: 2rem;
                }

                main {
                  max-width: 800px;
                  margin: 2rem auto;
                  padding: 0 1rem;
                }
              ]]></file>
            </files>
          </artifact>
        `,
        expectedValid: true,
        expectedFiles: 2,
        expectedDeps: 0
      },
      {
        name: 'SVG illustration',
        content: `
          <artifact identifier="icon-set" type="image/svg+xml" title="Icon Set">
            <description>Custom SVG icons</description>
            <files>
              <file path="icons.svg"><![CDATA[
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <defs>
                    <g id="home">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </g>
                    <g id="search">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </g>
                  </defs>

                  <use href="#home" x="0" y="0" fill="#333"/>
                  <use href="#search" x="24" y="0" fill="#666"/>
                </svg>
              ]]></file>
            </files>
          </artifact>
        `,
        expectedValid: true,
        expectedFiles: 1,
        expectedDeps: 0
      }
    ];

    testCases.forEach(({ name, content, expectedValid, expectedFiles, expectedDeps }) => {
      it(`should handle ${name} correctly`, () => {
        const result = parseArtifactsFromContent(content, true);

        expect(result.hasArtifacts).toBe(true);
        expect(result.artifacts).toHaveLength(1);

        const artifact = result.artifacts[0];
        expect(artifact.files).toHaveLength(expectedFiles);
        expect(artifact.dependencies).toHaveLength(expectedDeps);

        if (expectedValid) {
          const validation = validateArtifact(artifact);
          expect(validation.valid).toBe(true);
        }

        expect(result.parsingTimeMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should parse artifacts within performance target', () => {
      const complexContent = Array.from({ length: 5 }, (_, i) => `
        <artifact identifier="perf-test-${i}" type="application/vnd.react+jsx" title="Performance Test ${i}">
          <description>Performance testing artifact ${i}</description>
          <dependencies>
            <dependency name="react" version="18.2.0" />
            <dependency name="react-dom" version="18.2.0" />
          </dependencies>
          <files>
            <file path="App.jsx"><![CDATA[
              import { useState, useEffect } from 'react';

              function App() {
                const [data, setData] = useState([]);

                useEffect(() => {
                  const items = Array.from({ length: 100 }, (_, i) => ({
                    id: i,
                    name: \`Item \${i}\`,
                    value: Math.random()
                  }));
                  setData(items);
                }, []);

                return (
                  <div>
                    <h1>Performance Test ${i}</h1>
                    <ul>
                      {data.map(item => (
                        <li key={item.id}>{item.name}: {item.value.toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                );
              }

              export default App;
            ]]></file>
          </files>
        </artifact>
      `).join('\n');

      const startTime = Date.now();
      const result = parseArtifactsFromContent(complexContent, true);
      const actualTime = Date.now() - startTime;

      // Performance target: <1s as specified in plan.md
      expect(actualTime).toBeLessThan(1000);
      expect(result.artifacts).toHaveLength(5);
      expect(result.parsingTimeMs).toBeLessThan(1000);
    });

    it('should handle concurrent parsing efficiently', () => {
      const content = `
        <artifact identifier="concurrent-test" type="text/html" title="Concurrent Test">
          <files>
            <file path="index.html"><![CDATA[<h1>Concurrent parsing test</h1>]]></file>
          </files>
        </artifact>
      `;

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(parseArtifactsFromContent(content))
      );

      return Promise.all(promises).then(results => {
        const totalTime = Date.now() - startTime;

        expect(results).toHaveLength(10);
        expect(totalTime).toBeLessThan(2000); // Should handle 10 concurrent parses quickly

        results.forEach(result => {
          expect(result.hasArtifacts).toBe(true);
          expect(result.artifacts).toHaveLength(1);
        });
      });
    });
  });
});