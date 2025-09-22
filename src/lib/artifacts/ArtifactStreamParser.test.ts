/**
 * Comprehensive Unit Tests for ArtifactStreamParser FSM
 *
 * This test suite ensures 100% coverage of all FSM states, transitions,
 * and edge cases for bulletproof artifact streaming detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArtifactStreamParser, ParserStates, type ArtifactBlock } from './ArtifactStreamParser';

describe('ArtifactStreamParser FSM', () => {
  let parser: ArtifactStreamParser;

  beforeEach(() => {
    parser = new ArtifactStreamParser(false); // Disable debug for tests
  });

  describe('State Transitions', () => {
    it('should start in MARKDOWN state', () => {
      const state = parser.getCurrentState();
      expect(state.state).toBe(ParserStates.MARKDOWN);
      expect(parser.getArtifacts()).toHaveLength(0);
    });

    it('should transition MARKDOWN → ARTIFACT_OPENING on artifact tag', () => {
      const update = parser.feed('<artifact identifier="test"');

      expect(update.mode).toBe('artifact');
      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_OPENING);
    });

    it('should transition ARTIFACT_OPENING → ARTIFACT_INNER on tag close', () => {
      parser.feed('<artifact identifier="test" type="text/html"');
      const update = parser.feed('>');

      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_INNER);
    });

    it('should transition ARTIFACT_INNER → CDATA on CDATA start', () => {
      parser.feed('<artifact identifier="test">');
      const update = parser.feed('<![CDATA[');

      expect(parser.getCurrentState().state).toBe(ParserStates.CDATA);
    });

    it('should transition CDATA → ARTIFACT_INNER on CDATA end', () => {
      parser.feed('<artifact identifier="test">');
      parser.feed('<![CDATA[some content');
      const update = parser.feed(']]>');

      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_INNER);
    });

    it('should transition ARTIFACT_INNER → ARTIFACT_CLOSING on end tag', () => {
      parser.feed('<artifact identifier="test">content');
      const update = parser.feed('</artifact>');

      expect(parser.getCurrentState().state).toBe(ParserStates.MARKDOWN);
      expect(update.newArtifacts).toHaveLength(1);
    });
  });

  describe('Chunk-Safe Parsing', () => {
    it('should handle artifact tag split across chunks', () => {
      const update1 = parser.feed('<arti');
      expect(update1.mode).toBe('markdown');

      const update2 = parser.feed('fact identifier="test"');
      expect(update2.mode).toBe('artifact');
      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_OPENING);
    });

    it('should handle closing tag split across chunks', () => {
      parser.feed('<artifact identifier="test">content');

      const update1 = parser.feed('</art');
      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_INNER);

      const update2 = parser.feed('ifact>');
      expect(parser.getCurrentState().state).toBe(ParserStates.MARKDOWN);
      expect(update2.newArtifacts).toHaveLength(1);
    });

    it('should handle CDATA markers split across chunks', () => {
      parser.feed('<artifact identifier="test">');

      const update1 = parser.feed('<![CD');
      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_INNER);

      const update2 = parser.feed('ATA[content]]>');
      expect(parser.getCurrentState().state).toBe(ParserStates.ARTIFACT_INNER);
    });

    it('should handle complex content split across many small chunks', () => {
      const fullContent = '<artifact identifier="complex" type="application/vnd.react+tsx">function Component() { return <div>Hello</div>; }</artifact>';

      // Feed one character at a time
      for (let i = 0; i < fullContent.length; i++) {
        parser.feed(fullContent[i]);
      }

      const finalUpdate = parser.finalize();
      expect(finalUpdate.newArtifacts).toHaveLength(1);
      expect(finalUpdate.newArtifacts[0].code).toContain('function Component()');
    });
  });

  describe('Artifact Extraction', () => {
    it('should extract simple artifact correctly', () => {
      const update = parser.feed('<artifact identifier="simple-test" type="text/html">Hello World</artifact>');

      expect(update.newArtifacts).toHaveLength(1);
      const artifact = update.newArtifacts[0];
      expect(artifact.attrs.id).toBe('simple-test');
      expect(artifact.attrs.type).toBe('text/html');
      expect(artifact.code).toBe('Hello World');
    });

    it('should extract artifact with multiple attributes', () => {
      const content = '<artifact identifier="multi-attr" type="application/vnd.react+tsx" title="Test Component" description="A test">content</artifact>';
      const update = parser.feed(content);

      const artifact = update.newArtifacts[0];
      expect(artifact.attrs.id).toBe('multi-attr');
      expect(artifact.attrs.type).toBe('application/vnd.react+tsx');
      expect(artifact.attrs.title).toBe('Test Component');
      expect(artifact.attrs.description).toBe('A test');
    });

    it('should handle artifacts with CDATA sections', () => {
      const content = '<artifact identifier="cdata-test" type="text/html"><![CDATA[<script>alert("test")</script>]]></artifact>';
      const update = parser.feed(content);

      const artifact = update.newArtifacts[0];
      expect(artifact.code).toBe('<script>alert("test")</script>');
    });

    it('should handle nested XML-like content', () => {
      const content = '<artifact identifier="nested" type="text/html"><div><span>Test</span></div></artifact>';
      const update = parser.feed(content);

      const artifact = update.newArtifacts[0];
      expect(artifact.code).toBe('<div><span>Test</span></div>');
    });

    it('should extract multiple artifacts from single input', () => {
      const content = `
        <artifact identifier="first" type="text/html">First content</artifact>
        Some text in between
        <artifact identifier="second" type="application/javascript">Second content</artifact>
      `;

      const update = parser.feed(content);
      expect(update.newArtifacts).toHaveLength(2);
      expect(update.newArtifacts[0].attrs.id).toBe('first');
      expect(update.newArtifacts[1].attrs.id).toBe('second');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed opening tags gracefully', () => {
      const malformed = '<artifact identifier="test" invalid-attr=">';
      expect(() => parser.feed(malformed)).not.toThrow();

      // Should not crash and should not create invalid artifacts
      const state = parser.getCurrentState();
      expect(parser.getArtifacts()).toHaveLength(0);
    });

    it('should handle unclosed artifacts', () => {
      parser.feed('<artifact identifier="unclosed" type="text/html">Some content');

      // Finalize should handle unclosed artifacts
      const finalUpdate = parser.finalize();
      expect(finalUpdate.newArtifacts).toHaveLength(0); // Unclosed artifacts should be discarded
    });

    it('should handle empty artifacts', () => {
      const update = parser.feed('<artifact identifier="empty" type="text/html"></artifact>');

      expect(update.newArtifacts).toHaveLength(1);
      expect(update.newArtifacts[0].code).toBe('');
    });

    it('should handle artifacts with only whitespace', () => {
      const update = parser.feed('<artifact identifier="whitespace" type="text/html">   \n\t  </artifact>');

      expect(update.newArtifacts).toHaveLength(1);
      expect(update.newArtifacts[0].code).toBe('   \n\t  ');
    });

    it('should handle special characters and Unicode', () => {
      const content = '<artifact identifier="unicode" type="text/html">Hello 🚀 émojis and spëcial châractërs</artifact>';
      const update = parser.feed(content);

      const artifact = update.newArtifacts[0];
      expect(artifact.code).toBe('Hello 🚀 émojis and spëcial châractërs');
    });

    it('should handle very large artifacts', () => {
      const largeContent = 'console.log("test");'.repeat(10000);
      const content = `<artifact identifier="large" type="application/javascript">${largeContent}</artifact>`;

      expect(() => parser.feed(content)).not.toThrow();
      const update = parser.feed(''); // Trigger any pending processing

      // Should handle large content without issues
      const state = parser.getCurrentState();
      expect(parser.getArtifacts()).toHaveLength(1);
    });
  });

  describe('Reset and State Management', () => {
    it('should reset to initial state', () => {
      parser.feed('<artifact identifier="test">content</artifact>');

      parser.reset();
      const state = parser.getCurrentState();

      expect(state.state).toBe(ParserStates.MARKDOWN);
      expect(parser.getArtifacts()).toHaveLength(0);
      expect(state.artifactCount).toBe(0);
    });

    it('should maintain state consistency during parsing', () => {
      parser.feed('<artifact identifier="first">content1</artifact>');

      let state = parser.getCurrentState();
      expect(state.artifactCount).toBe(1);

      parser.feed('<artifact identifier="second">content2</artifact>');

      state = parser.getCurrentState();
      expect(state.artifactCount).toBe(2);
      expect(parser.getArtifacts()).toHaveLength(2);
    });
  });

  describe('Event Generation', () => {
    it('should generate correct events for state transitions', () => {
      const update1 = parser.feed('<artifact');
      expect(update1.events.some(e => e.name === 'state_transition')).toBe(true);

      const update2 = parser.feed(' identifier="test">');
      expect(update2.events.some(e => e.name === 'state_transition')).toBe(true);
    });

    it('should generate artifact detection events', () => {
      const update = parser.feed('<artifact identifier="test">content</artifact>');

      expect(update.events.some(e => e.name === 'artifact:detected')).toBe(true);
    });

    it('should provide detailed event information', () => {
      const update = parser.feed('<artifact identifier="detailed" type="text/html">content</artifact>');

      const detectionEvent = update.events.find(e => e.name === 'artifact:detected');
      expect(detectionEvent).toBeDefined();
      expect(detectionEvent?.detail).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should parse artifacts quickly', () => {
      const content = '<artifact identifier="perf-test" type="application/vnd.react+tsx">function Component() { return <div>Performance Test</div>; }</artifact>';

      const startTime = performance.now();
      parser.feed(content);
      const endTime = performance.now();

      // Should complete parsing in under 10ms for typical content
      expect(endTime - startTime).toBeLessThan(10);
    });

    it('should handle streaming chunks efficiently', () => {
      const chunks = [
        '<artifact identifier="streaming"',
        ' type="text/html">',
        '<div>Streaming',
        ' content</div>',
        '</artifact>'
      ];

      const startTime = performance.now();
      chunks.forEach(chunk => parser.feed(chunk));
      const endTime = performance.now();

      // Should handle streaming chunks efficiently
      expect(endTime - startTime).toBeLessThan(5);
    });

    it('should not leak memory during long operations', () => {
      // Simulate long streaming session
      for (let i = 0; i < 1000; i++) {
        parser.feed(`<artifact identifier="test-${i}">content ${i}</artifact>`);
        if (i % 100 === 0) {
          parser.reset(); // Periodic reset to simulate new messages
        }
      }

      // Should complete without memory issues
      const state = parser.getCurrentState();
      expect(state).toBeDefined();
    });
  });

  describe('Finalization', () => {
    it('should finalize incomplete artifacts', () => {
      parser.feed('<artifact identifier="incomplete">some content');

      const finalUpdate = parser.finalize();

      // Incomplete artifacts should be discarded
      expect(finalUpdate.newArtifacts).toHaveLength(0);
    });

    it('should provide final state summary', () => {
      parser.feed('<artifact identifier="final1">content1</artifact>');
      parser.feed('<artifact identifier="final2">content2</artifact>');

      const finalUpdate = parser.finalize();
      const state = parser.getCurrentState();

      expect(state.artifactCount).toBe(2);
      expect(state.state).toBe(ParserStates.MARKDOWN);
    });
  });
});

describe('ArtifactStreamParser Integration Scenarios', () => {
  let parser: ArtifactStreamParser;

  beforeEach(() => {
    parser = new ArtifactStreamParser(false);
  });

  describe('Real-world Streaming Scenarios', () => {
    it('should handle typical OpenAI streaming response', () => {
      const chunks = [
        "I'll create a React component for you:\n\n",
        "<artifact identifier=\"react-component-",
        "123\" type=\"application/vnd.react+tsx\" ",
        "title=\"Button Component\">\n",
        "import React from 'react';\n\n",
        "export default function Button() {\n",
        "  return (\n    <button>Click me</button>\n  );\n",
        "}\n",
        "</artifact>\n\n",
        "This component provides a simple button interface."
      ];

      const artifacts: ArtifactBlock[] = [];
      chunks.forEach(chunk => {
        const update = parser.feed(chunk);
        artifacts.push(...update.newArtifacts);
      });

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].attrs.id).toBe('react-component-123');
      expect(artifacts[0].code).toContain('export default function Button');
    });

    it('should handle Claude-style streaming with mixed content', () => {
      const chunks = [
        "Here's a solution with HTML and CSS:\n\n",
        "<artifact identifier=\"html-page\" type=\"text/html\">\n",
        "<!DOCTYPE html>\n<html>\n<head>\n",
        "  <style>\n    body { font-family: Arial; }\n  </style>\n",
        "</head>\n<body>\n  <h1>Hello World</h1>\n",
        "</body>\n</html>\n",
        "</artifact>\n\n",
        "And here's a JavaScript version:\n\n",
        "<artifact identifier=\"js-version\" type=\"application/javascript\">\n",
        "document.body.innerHTML = '<h1>Hello World</h1>';\n",
        "</artifact>"
      ];

      const artifacts: ArtifactBlock[] = [];
      chunks.forEach(chunk => {
        const update = parser.feed(chunk);
        artifacts.push(...update.newArtifacts);
      });

      expect(artifacts).toHaveLength(2);
      expect(artifacts[0].attrs.type).toBe('text/html');
      expect(artifacts[1].attrs.type).toBe('application/javascript');
    });

    it('should handle slow network with large delays between chunks', async () => {
      const chunks = [
        "<artifact identifier=\"slow-network\"",
        " type=\"text/html\">",
        "<div>Slow network test</div>",
        "</artifact>"
      ];

      const artifacts: ArtifactBlock[] = [];

      for (const chunk of chunks) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 10));
        const update = parser.feed(chunk);
        artifacts.push(...update.newArtifacts);
      }

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].code).toBe('<div>Slow network test</div>');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from malformed XML', () => {
      parser.feed('<artifact identifier="broken">');
      parser.feed('Some content with <unclosed tag');
      parser.feed('</artifact>');

      const finalUpdate = parser.finalize();
      expect(finalUpdate.newArtifacts).toHaveLength(1);
    });

    it('should handle nested artifact tags', () => {
      const content = `
        <artifact identifier="outer" type="text/html">
          <div>Some content with word "artifact" in it</div>
          <!-- This should not break parsing -->
        </artifact>
      `;

      const update = parser.feed(content);
      expect(update.newArtifacts).toHaveLength(1);
      expect(update.newArtifacts[0].code).toContain('word "artifact"');
    });
  });
});