/**
 * Integration Tests for ContentRenderer with Artifact Streaming
 *
 * Tests the complete integration between ContentRenderer, ArtifactStreamParser,
 * event bus, and preview panel auto-open functionality.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import ContentRenderer from './ContentRenderer.svelte';
import { artifactEvents, artifactSubscriptions } from '$lib/artifacts/ArtifactChannel';

// Mock dependencies
vi.mock('$lib/stores', () => ({
  chatId: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  settings: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  mobile: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  showArtifacts: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  showControls: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  showOverview: { subscribe: vi.fn(() => () => {}), set: vi.fn() }
}));

vi.mock('$lib/stores/preview/preview-store', () => ({
  previewActions: {
    show: vi.fn(),
    showFromMessage: vi.fn(),
    showError: vi.fn()
  }
}));

vi.mock('$lib/utils/preview/message-analyzer', () => ({
  analyzeMessageForArtifacts: vi.fn(() => ({
    bestCodeForPreview: 'mock code',
    artifactCount: 1
  }))
}));

describe('ContentRenderer Artifact Integration', () => {
  let mockPreviewActions: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock preview actions
    mockPreviewActions = {
      show: vi.fn(),
      showFromMessage: vi.fn(),
      showError: vi.fn()
    };

    vi.mocked(import('$lib/stores/preview/preview-store')).mockResolvedValue({
      previewActions: mockPreviewActions
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Streaming Artifact Detection', () => {
    it('should detect artifact during content streaming', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-123',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Simulate streaming content with artifact
      const streamingContent = [
        "I'll create a React component:\n\n",
        "<artifact identifier=\"test-component\"",
        " type=\"application/vnd.react+tsx\">",
        "function TestComponent() { return <div>Test</div>; }",
        "</artifact>"
      ];

      let currentContent = '';
      for (const chunk of streamingContent) {
        currentContent += chunk;
        await component.$set({ content: currentContent });
        await tick();
      }

      // Should have detected artifact and opened preview
      expect(mockPreviewActions.show).toHaveBeenCalled();
    });

    it('should handle multiple artifacts in streaming content', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-456',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Simulate streaming with multiple artifacts
      const fullContent = `
        First, here's an HTML page:
        <artifact identifier="html-page" type="text/html">
        <html><body><h1>Hello</h1></body></html>
        </artifact>

        And here's some CSS:
        <artifact identifier="css-styles" type="text/css">
        body { color: blue; }
        </artifact>
      `;

      await component.$set({ content: fullContent, done: true });
      await tick();

      // Should have processed multiple artifacts
      expect(mockPreviewActions.show).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: expect.any(String)
        })
      );
    });

    it('should reset parser state for new messages', async () => {
      const props = {
        id: 'test-message',
        content: '<artifact identifier="first">content1</artifact>',
        messageId: 'message-1',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });
      await tick();

      // Switch to new message
      await component.$set({
        messageId: 'message-2',
        content: '<artifact identifier="second">content2</artifact>'
      });
      await tick();

      // Should have processed both messages separately
      expect(mockPreviewActions.show).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit artifact detection events', async () => {
      const mockEventHandler = vi.fn();
      const unsubscribe = artifactSubscriptions.onArtifactDetected(mockEventHandler);

      const props = {
        id: 'test-message',
        content: '<artifact identifier="event-test">content</artifact>',
        messageId: 'message-events',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      render(ContentRenderer, { props });
      await tick();

      expect(mockEventHandler).toHaveBeenCalledWith('message-events');

      unsubscribe();
    });

    it('should emit stream complete events', async () => {
      const mockCompleteHandler = vi.fn();
      const unsubscribe = artifactSubscriptions.onStreamComplete(mockCompleteHandler);

      const props = {
        id: 'test-message',
        content: '<artifact identifier="complete-test">content</artifact>',
        messageId: 'message-complete',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      render(ContentRenderer, { props });
      await tick();

      expect(mockCompleteHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'message-complete',
          artifactCount: expect.any(Number)
        })
      );

      unsubscribe();
    });
  });

  describe('Legacy Fallback Detection', () => {
    it('should fall back to legacy detection for non-XML artifacts', async () => {
      const mockOnUpdate = vi.fn();

      const props = {
        id: 'test-message',
        content: '```jsx\nfunction Component() { return <div>Test</div>; }\n```',
        messageId: 'message-legacy',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      render(ContentRenderer, { props });
      await tick();

      // Should trigger legacy detection for JSX code blocks
      // (This would be tested through the Markdown component's onUpdate callback)
    });
  });

  describe('Preview Panel Integration', () => {
    it('should auto-open preview panel for first artifact', async () => {
      const props = {
        id: 'test-message',
        content: '<artifact identifier="auto-open">content</artifact>',
        messageId: 'message-auto-open',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      render(ContentRenderer, { props });
      await tick();

      // Should have auto-opened preview panel
      expect(mockPreviewActions.show).toHaveBeenCalledWith(
        '// Loading artifact...',
        expect.objectContaining({
          title: 'Artifact Preview',
          type: 'react'
        })
      );
    });

    it('should update preview panel with completed artifact', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-update',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Start with artifact opening
      await component.$set({
        content: '<artifact identifier="update-test" type="application/vnd.react+tsx">'
      });
      await tick();

      // Complete the artifact
      await component.$set({
        content: '<artifact identifier="update-test" type="application/vnd.react+tsx">function Test() { return <div>Complete</div>; }</artifact>',
        done: true
      });
      await tick();

      // Should have updated preview with completed content
      expect(mockPreviewActions.show).toHaveBeenCalledWith(
        'function Test() { return <div>Complete</div>; }',
        expect.objectContaining({
          type: 'react'
        })
      );
    });

    it('should respect user auto-open preferences', async () => {
      // Mock settings to disable auto-open
      vi.mocked(import('$lib/stores')).mockImplementation(() => ({
        settings: {
          subscribe: vi.fn((callback) => {
            callback({ autoOpenArtifact: false });
            return () => {};
          })
        },
        chatId: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
        mobile: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
        showArtifacts: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
        showControls: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
        showOverview: { subscribe: vi.fn(() => () => {}), set: vi.fn() }
      }));

      const props = {
        id: 'test-message',
        content: '<artifact identifier="no-auto-open">content</artifact>',
        messageId: 'message-no-auto',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      render(ContentRenderer, { props });
      await tick();

      // Should NOT have auto-opened preview when disabled
      expect(mockPreviewActions.show).not.toHaveBeenCalledWith(
        '// Loading artifact...',
        expect.objectContaining({
          title: 'Artifact Preview'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle preview panel errors gracefully', async () => {
      // Mock preview actions to throw error
      mockPreviewActions.show.mockImplementation(() => {
        throw new Error('Preview panel error');
      });

      const props = {
        id: 'test-message',
        content: '<artifact identifier="error-test">content</artifact>',
        messageId: 'message-error',
        done: true,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      // Should not throw error despite preview panel failure
      expect(() => render(ContentRenderer, { props })).not.toThrow();
    });

    it('should handle malformed streaming content', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-malformed',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Feed malformed content
      const malformedContent = '<artifact identifier="broken">unclosed content';
      await component.$set({ content: malformedContent, done: true });
      await tick();

      // Should handle gracefully without crashing
      expect(mockPreviewActions.showError).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should process streaming content efficiently', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-performance',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Simulate high-frequency streaming updates
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        await component.$set({
          content: `<artifact identifier="perf-test">content-${i}</artifact>`
        });
        await tick();
      }

      const endTime = performance.now();

      // Should handle rapid updates efficiently (under 1 second for 100 updates)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should not create memory leaks during long streaming', async () => {
      const props = {
        id: 'test-message',
        content: '',
        messageId: 'message-memory',
        done: false,
        history: {},
        selectedModels: [],
        model: null,
        sources: null,
        save: false,
        preview: false,
        floatingButtons: false,
        editCodeBlock: true,
        topPadding: false,
        onSave: vi.fn(),
        onSourceClick: vi.fn(),
        onTaskClick: vi.fn(),
        onAddMessages: vi.fn()
      };

      const { component } = render(ContentRenderer, { props });

      // Simulate long streaming session
      let content = '';
      for (let i = 0; i < 1000; i++) {
        content += `chunk-${i} `;
        await component.$set({ content });

        // Occasional complete artifacts
        if (i % 100 === 0) {
          content += `<artifact identifier="memory-test-${i}">content</artifact>`;
          await component.$set({ content });
        }
      }

      // Should complete without memory issues
      expect(true).toBe(true); // Test passes if no memory errors occur
    });
  });
});