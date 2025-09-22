/**
 * Artifact Stream Parser - Finite State Machine for Real-time Artifact Detection
 *
 * This implements the FSM approach from optimal artifact design theory to solve
 * the fundamental streaming detection problem. It provides:
 *
 * - Immediate <artifact tag detection during streaming
 * - Chunk-safe tokenization for network streams
 * - Event-driven architecture for decoupled components
 * - Per-message state isolation
 * - Robust error recovery
 */

export interface ArtifactBlock {
  attrs: Record<string, string>; // type, id, name, etc.
  code: string;                   // from CDATA
  raw: string;                    // full artifact XML
  startOffset: number;
  endOffset?: number;
}

export interface ParseUpdate {
  appendMarkdown?: string;                 // markdown delta since last call
  newArtifacts?: ArtifactBlock[];          // any completed artifacts in this feed
  mode: 'markdown' | 'artifact' | 'mixed'; // hints for UI
  events: Array<{ at: number; name: string; detail?: any }>;
}

export type ParserState = 'MARKDOWN' | 'ARTIFACT_OPENING' | 'ARTIFACT_INNER' | 'CDATA' | 'ARTIFACT_CLOSING';

// Export const values for testing
export const ParserStates = {
  MARKDOWN: 'MARKDOWN' as const,
  ARTIFACT_OPENING: 'ARTIFACT_OPENING' as const,
  ARTIFACT_INNER: 'ARTIFACT_INNER' as const,
  CDATA: 'CDATA' as const,
  ARTIFACT_CLOSING: 'ARTIFACT_CLOSING' as const
} as const;

/**
 * Finite State Machine for parsing streaming artifact content
 */
export class ArtifactStreamParser {
  private state: ParserState = 'MARKDOWN';
  private buffer = '';
  private rollingBuffer = ''; // Last 64 chars for split-token detection
  private current: Partial<ArtifactBlock> = {};
  private artifacts: ArtifactBlock[] = [];
  private markdownAccumulator = '';
  private lastMarkdownEmit = 0;
  private debugMode = false;

  // Regular expressions for parsing
  private static readonly ARTIFACT_OPEN_RE = /<artifact\b([^>]*)>/i;
  private static readonly ARTIFACT_CLOSE_RE = /<\/artifact\s*>/i;
  private static readonly CDATA_OPEN = '<![CDATA[';
  private static readonly CDATA_CLOSE = ']]>';

  constructor(debugMode = false) {
    this.debugMode = debugMode;
    this.log('Parser initialized');
  }

  /**
   * Feed a chunk of streaming text to the parser
   */
  feed(chunk: string): ParseUpdate {
    this.buffer += chunk;
    this.rollingBuffer = (this.rollingBuffer + chunk).slice(-64); // Keep last 64 chars

    const events: Array<{ at: number; name: string; detail?: any }> = [];
    const newArtifacts: ArtifactBlock[] = [];
    let appendMarkdown = '';

    this.log(`Feed: "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}" (state: ${this.state})`);

    // Process buffer based on current state
    while (this.buffer.length > 0) {
      const oldState = this.state;
      const processed = this.processCurrentState();

      if (!processed) {
        // No more processing possible with current buffer
        break;
      }

      if (oldState !== this.state) {
        events.push({
          at: Date.now(),
          name: 'state_transition',
          detail: { from: oldState, to: this.state }
        });
        this.log(`State transition: ${oldState} → ${this.state}`);
      }
    }

    // Handle completed artifacts
    if (this.current.endOffset !== undefined) {
      const completedArtifact: ArtifactBlock = {
        attrs: this.current.attrs || {},
        code: this.current.code || '',
        raw: this.current.raw || '',
        startOffset: this.current.startOffset || 0,
        endOffset: this.current.endOffset
      };

      newArtifacts.push(completedArtifact);
      this.artifacts.push(completedArtifact);
      this.current = {}; // Reset for next artifact

      events.push({
        at: Date.now(),
        name: 'artifact_completed',
        detail: { artifact: completedArtifact }
      });

      this.log('Artifact completed:', completedArtifact);
    }

    // Emit markdown delta if we have new content
    if (this.markdownAccumulator.length > this.lastMarkdownEmit) {
      appendMarkdown = this.markdownAccumulator.slice(this.lastMarkdownEmit);
      this.lastMarkdownEmit = this.markdownAccumulator.length;
    }

    // Determine current mode
    const mode = this.determineMode();

    return {
      appendMarkdown,
      newArtifacts: newArtifacts.length > 0 ? newArtifacts : undefined,
      mode,
      events
    };
  }

  /**
   * Finalize parsing (called at end of stream)
   */
  finalize(): ParseUpdate {
    this.log('Finalizing parser');

    const events: Array<{ at: number; name: string; detail?: any }> = [];

    // If we're in the middle of an artifact and buffer has content, treat as markdown
    if (this.state !== 'MARKDOWN' && this.buffer.length > 0) {
      this.log('Recovery: treating incomplete artifact as markdown');
      this.markdownAccumulator += this.buffer;
      this.buffer = '';
      this.state = 'MARKDOWN';
      this.current = {};

      events.push({
        at: Date.now(),
        name: 'recovery_fallback',
        detail: { reason: 'incomplete_artifact' }
      });
    }

    // Emit any remaining markdown
    let appendMarkdown = '';
    if (this.markdownAccumulator.length > this.lastMarkdownEmit) {
      appendMarkdown = this.markdownAccumulator.slice(this.lastMarkdownEmit);
      this.lastMarkdownEmit = this.markdownAccumulator.length;
    }

    events.push({
      at: Date.now(),
      name: 'finalize',
      detail: { artifacts_count: this.artifacts.length }
    });

    return {
      appendMarkdown,
      mode: this.artifacts.length > 0 ? 'mixed' : 'markdown',
      events
    };
  }

  /**
   * Reset parser for new message
   */
  reset(): void {
    this.log('Resetting parser for new message');
    this.state = 'MARKDOWN';
    this.buffer = '';
    this.rollingBuffer = '';
    this.current = {};
    this.artifacts = [];
    this.markdownAccumulator = '';
    this.lastMarkdownEmit = 0;
  }

  /**
   * Process current state and advance if possible
   */
  private processCurrentState(): boolean {
    switch (this.state) {
      case 'MARKDOWN':
        return this.processMarkdown();
      case 'ARTIFACT_OPENING':
        return this.processArtifactOpening();
      case 'ARTIFACT_INNER':
        return this.processArtifactInner();
      case 'CDATA':
        return this.processCDATA();
      case 'ARTIFACT_CLOSING':
        return this.processArtifactClosing();
      default:
        this.log('Unknown state:', this.state);
        return false;
    }
  }

  /**
   * Process MARKDOWN state
   */
  private processMarkdown(): boolean {
    // Look for artifact opening tag
    const match = this.buffer.match(ArtifactStreamParser.ARTIFACT_OPEN_RE);

    if (match) {
      // Found artifact start - extract markdown before it
      const beforeArtifact = this.buffer.substring(0, match.index!);
      this.markdownAccumulator += beforeArtifact;

      // Set up artifact parsing
      this.current = {
        attrs: this.parseAttributes(match[1] || ''),
        startOffset: this.markdownAccumulator.length,
        raw: match[0]
      };

      // Advance buffer and state
      this.buffer = this.buffer.substring(match.index! + match[0].length);
      this.state = 'ARTIFACT_OPENING';

      this.log('Artifact detected!', this.current.attrs);
      return true;
    }

    // No artifact found - all current buffer is markdown
    if (this.buffer.length > 64) {
      // Emit most of buffer as markdown, keep last 64 chars for potential split tags
      const toEmit = this.buffer.substring(0, this.buffer.length - 64);
      this.markdownAccumulator += toEmit;
      this.buffer = this.buffer.substring(toEmit.length);
      return true;
    }

    return false; // Wait for more data
  }

  /**
   * Process ARTIFACT_OPENING state
   */
  private processArtifactOpening(): boolean {
    // Look for CDATA opening
    const cdataIndex = this.buffer.indexOf(ArtifactStreamParser.CDATA_OPEN);

    if (cdataIndex !== -1) {
      // Found CDATA start
      const beforeCDATA = this.buffer.substring(0, cdataIndex);
      this.current.raw += beforeCDATA + ArtifactStreamParser.CDATA_OPEN;

      this.buffer = this.buffer.substring(cdataIndex + ArtifactStreamParser.CDATA_OPEN.length);
      this.state = 'CDATA';
      this.current.code = ''; // Initialize code accumulator

      return true;
    }

    // Look for artifact content without CDATA (alternative format)
    const closeTagIndex = this.buffer.search(ArtifactStreamParser.ARTIFACT_CLOSE_RE);
    if (closeTagIndex !== -1) {
      // Direct content without CDATA
      const content = this.buffer.substring(0, closeTagIndex);
      this.current.code = content;
      this.current.raw += content;

      this.buffer = this.buffer.substring(closeTagIndex);
      this.state = 'ARTIFACT_CLOSING';
      return true;
    }

    // Not enough data yet
    return false;
  }

  /**
   * Process ARTIFACT_INNER state (unused in current implementation)
   */
  private processArtifactInner(): boolean {
    // Currently not used - we go directly from OPENING to CDATA
    return false;
  }

  /**
   * Process CDATA state
   */
  private processCDATA(): boolean {
    // Look for CDATA closing
    const cdataCloseIndex = this.buffer.indexOf(ArtifactStreamParser.CDATA_CLOSE);

    if (cdataCloseIndex !== -1) {
      // Found CDATA end
      const codeContent = this.buffer.substring(0, cdataCloseIndex);
      this.current.code = (this.current.code || '') + codeContent;
      this.current.raw += codeContent + ArtifactStreamParser.CDATA_CLOSE;

      this.buffer = this.buffer.substring(cdataCloseIndex + ArtifactStreamParser.CDATA_CLOSE.length);
      this.state = 'ARTIFACT_CLOSING';

      return true;
    }

    // Accumulate code content (no CDATA close yet)
    if (this.buffer.length > ArtifactStreamParser.CDATA_CLOSE.length) {
      const safeToConsume = this.buffer.length - ArtifactStreamParser.CDATA_CLOSE.length;
      const codeChunk = this.buffer.substring(0, safeToConsume);
      this.current.code = (this.current.code || '') + codeChunk;
      this.current.raw += codeChunk;
      this.buffer = this.buffer.substring(safeToConsume);
      return true;
    }

    return false; // Wait for more data
  }

  /**
   * Process ARTIFACT_CLOSING state
   */
  private processArtifactClosing(): boolean {
    // Look for closing tag
    const match = this.buffer.match(ArtifactStreamParser.ARTIFACT_CLOSE_RE);

    if (match) {
      // Found closing tag
      const beforeClose = this.buffer.substring(0, match.index!);
      this.current.raw += beforeClose + match[0];
      this.current.endOffset = (this.current.startOffset || 0) + this.current.raw!.length;

      // Advance buffer and reset state
      this.buffer = this.buffer.substring(match.index! + match[0].length);
      this.state = 'MARKDOWN';

      return true;
    }

    return false; // Wait for more data
  }

  /**
   * Parse XML attributes from attribute string
   */
  private parseAttributes(attrString: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      attrs[match[1]] = match[2];
    }

    return attrs;
  }

  /**
   * Determine current parsing mode
   */
  private determineMode(): 'markdown' | 'artifact' | 'mixed' {
    if (this.state === 'MARKDOWN' && this.artifacts.length === 0) {
      return 'markdown';
    } else if (this.state !== 'MARKDOWN') {
      return 'artifact';
    } else {
      return 'mixed'; // Have artifacts but currently in markdown
    }
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[ArtifactStreamParser]', ...args);
    }
  }

  /**
   * Get current state (for debugging)
   */
  getCurrentState(): { state: ParserState; bufferLength: number; artifactCount: number } {
    return {
      state: this.state,
      bufferLength: this.buffer.length,
      artifactCount: this.artifacts.length
    };
  }

  getArtifacts(): ArtifactBlock[] {
    return this.artifacts;
  }
}