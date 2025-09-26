/**
 * Artifact Parser Contract Test
 * CRITICAL: This test MUST FAIL before implementation exists
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  IArtifactParser,
  ArtifactParsingRequest,
  ArtifactParsingResponse,
  ParsedArtifact,
  ArtifactType,
  ValidationErrorType
} from '../../specs/001-create-and-or/contracts/artifact-parser';

// Import the service that doesn't exist yet - this will cause the test to fail initially
import { ArtifactParserService } from '../../src/lib/services/artifact-parser';

describe('ArtifactParser Contract', () => {
  let parser: IArtifactParser;

  beforeEach(() => {
    // This will fail until the service is implemented
    parser = new ArtifactParserService();
  });

  describe('Contract Compliance', () => {
    it('should implement IArtifactParser interface', () => {
      expect(parser).toBeDefined();
      expect(typeof parser.parseArtifacts).toBe('function');
      expect(typeof parser.validateArtifact).toBe('function');
      expect(typeof parser.extractCodeBlocks).toBe('function');
    });
  });

  describe('PAS 3.0 XML Parsing', () => {
    const validPAS3Artifact = `
      <artifact xmlns="https://prometheusags.ai/schema/v3.0" type="react" id="test-component">
        <metadata>
          <title>Test Component</title>
          <description>A test React component</description>
        </metadata>
        <dependencies>
          <dependency name="react" version="^19.0.0"/>
        </dependencies>
        <code language="typescript">
          <![CDATA[
          import React from 'react';

          export const TestComponent: React.FC = () => {
            return <div>Hello World</div>;
          };

          export default TestComponent;
          ]]>
        </code>
      </artifact>
    `;

    it('should parse valid PAS 3.0 XML artifacts', async () => {
      const request: ArtifactParsingRequest = {
        content: validPAS3Artifact,
        validateSchema: true
      };

      const response: ArtifactParsingResponse = await parser.parseArtifacts(request);

      expect(response.hasArtifacts).toBe(true);
      expect(response.artifacts).toHaveLength(1);
      expect(response.validationErrors).toHaveLength(0);
      expect(response.parsingTimeMs).toBeGreaterThan(0);
      expect(response.parsingTimeMs).toBeLessThan(10000); // Must be < 10s timeout

      const artifact = response.artifacts[0];
      expect(artifact.id).toBe('test-component');
      expect(artifact.type).toBe('react');
      expect(artifact.title).toBe('Test Component');
      expect(artifact.code).toContain('TestComponent');
      expect(artifact.dependencies).toHaveLength(1);
      expect(artifact.dependencies[0].name).toBe('react');
      expect(artifact.isValid).toBe(true);
    });

    it('should extract CDATA content correctly', async () => {
      const request: ArtifactParsingRequest = {
        content: validPAS3Artifact,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);
      const artifact = response.artifacts[0];

      expect(artifact.code).toContain('import React from \'react\';');
      expect(artifact.code).toContain('export const TestComponent');
      expect(artifact.code).toContain('Hello World');
      expect(artifact.code).not.toContain('<![CDATA[');
      expect(artifact.code).not.toContain(']]>');
    });

    it('should parse multiple artifacts in one response', async () => {
      const multipleArtifacts = `
        ${validPAS3Artifact}

        <artifact xmlns="https://prometheusags.ai/schema/v3.0" type="svelte" id="svelte-component">
          <metadata>
            <title>Svelte Component</title>
          </metadata>
          <code language="typescript">
            <![CDATA[
            <script>
              let count = 0;
            </script>
            <div>{count}</div>
            ]]>
          </code>
        </artifact>
      `;

      const request: ArtifactParsingRequest = {
        content: multipleArtifacts,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.artifacts).toHaveLength(2);
      expect(response.artifacts[0].type).toBe('react');
      expect(response.artifacts[1].type).toBe('svelte');
    });

    it('should remove artifacts from content and return clean text', async () => {
      const contentWithArtifact = `
        Here is some explanation text.

        ${validPAS3Artifact}

        And here is more text after the artifact.
      `;

      const request: ArtifactParsingRequest = {
        content: contentWithArtifact,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.contentWithoutArtifacts).toContain('Here is some explanation text');
      expect(response.contentWithoutArtifacts).toContain('And here is more text after');
      expect(response.contentWithoutArtifacts).not.toContain('<artifact');
      expect(response.contentWithoutArtifacts).not.toContain('</artifact>');
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = `
        <artifact xmlns="https://prometheusags.ai/schema/v3.0" type="react" id="broken">
          <metadata>
            <title>Broken Component</title>
          </metadata>
          <code language="typescript">
            <![CDATA[
            import React from 'react';
            // Missing closing CDATA tag
          </code>
        </artifact>
      `;

      const request: ArtifactParsingRequest = {
        content: malformedXml,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.hasArtifacts).toBe(false);
      expect(response.validationErrors.length).toBeGreaterThan(0);
      expect(response.validationErrors[0].type).toBe('SCHEMA_INVALID' as ValidationErrorType);
    });
  });

  describe('Code Block Fallback', () => {
    it('should extract TSX code blocks when no XML artifacts present', async () => {
      const tsxContent = `
        Here's a React component:

        \`\`\`tsx
        import React from 'react';

        const Button: React.FC = () => {
          return <button>Click me</button>;
        };

        export default Button;
        \`\`\`

        This should create an artifact too.
      `;

      const artifacts = await parser.extractCodeBlocks(tsxContent);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('react');
      expect(artifacts[0].code).toContain('const Button');
      expect(artifacts[0].code).toContain('Click me');
    });

    it('should extract JSX code blocks', async () => {
      const jsxContent = `
        \`\`\`jsx
        function Component() {
          return <div>JSX Component</div>;
        }
        \`\`\`
      `;

      const artifacts = await parser.extractCodeBlocks(jsxContent);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('react');
      expect(artifacts[0].code).toContain('function Component');
    });

    it('should extract Svelte code blocks', async () => {
      const svelteContent = `
        \`\`\`svelte
        <script>
          let name = 'World';
        </script>

        <h1>Hello {name}!</h1>
        \`\`\`
      `;

      const artifacts = await parser.extractCodeBlocks(svelteContent);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('svelte');
      expect(artifacts[0].code).toContain('let name = \'World\'');
    });

    it('should ignore non-UI code blocks', async () => {
      const mixedContent = `
        \`\`\`python
        def hello():
            print("Hello")
        \`\`\`

        \`\`\`tsx
        const Component = () => <div>React</div>;
        \`\`\`

        \`\`\`sql
        SELECT * FROM users;
        \`\`\`
      `;

      const artifacts = await parser.extractCodeBlocks(mixedContent);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].code).toContain('const Component');
    });
  });

  describe('Validation', () => {
    it('should validate artifact schema when requested', async () => {
      const invalidArtifact = `
        <artifact xmlns="https://prometheusags.ai/schema/v3.0" type="invalid-type" id="test">
          <code><![CDATA[console.log('test');]]></code>
        </artifact>
      `;

      const request: ArtifactParsingRequest = {
        content: invalidArtifact,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.validationErrors.length).toBeGreaterThan(0);
      expect(response.validationErrors.some(e => e.type === 'UNKNOWN_TYPE')).toBe(true);
    });

    it('should validate individual artifacts', async () => {
      const artifact: ParsedArtifact = {
        id: '',  // Invalid: empty ID
        type: 'react' as ArtifactType,
        title: '',  // Invalid: empty title
        code: 'const x = 1;',
        dependencies: [],
        metadata: { language: 'typescript' },
        isValid: false,
        rawXml: '<artifact></artifact>'
      };

      const errors = await parser.validateArtifact(artifact);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('id'))).toBe(true);
      expect(errors.some(e => e.message.includes('title'))).toBe(true);
    });

    it('should skip validation when validateSchema is false', async () => {
      const invalidArtifact = `
        <artifact xmlns="https://prometheusags.ai/schema/v3.0" type="invalid-type">
          <code><![CDATA[test]]></code>
        </artifact>
      `;

      const request: ArtifactParsingRequest = {
        content: invalidArtifact,
        validateSchema: false
      };

      const response = await parser.parseArtifacts(request);

      // Should still parse but not validate
      expect(response.validationErrors).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should complete parsing within 10 seconds', async () => {
      const largeContent = validPAS3Artifact.repeat(5); // 5 artifacts

      const request: ArtifactParsingRequest = {
        content: largeContent,
        validateSchema: true
      };

      const startTime = Date.now();
      const response = await parser.parseArtifacts(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000);
      expect(response.parsingTimeMs).toBeLessThan(10000);
    });

    it('should handle empty content quickly', async () => {
      const request: ArtifactParsingRequest = {
        content: '',
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.hasArtifacts).toBe(false);
      expect(response.artifacts).toHaveLength(0);
      expect(response.parsingTimeMs).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Error Handling', () => {
    it('should handle session ID gracefully', async () => {
      const request: ArtifactParsingRequest = {
        content: validPAS3Artifact,
        validateSchema: true,
        sessionId: 'test-session'
      };

      // Should not throw with sessionId
      await expect(parser.parseArtifacts(request)).resolves.toBeDefined();
    });

    it('should handle very large content', async () => {
      const largeContent = 'x'.repeat(1000000) + validPAS3Artifact; // 1MB+ content

      const request: ArtifactParsingRequest = {
        content: largeContent,
        validateSchema: true
      };

      const response = await parser.parseArtifacts(request);

      expect(response.hasArtifacts).toBe(true);
      expect(response.artifacts).toHaveLength(1);
    });
  });
});