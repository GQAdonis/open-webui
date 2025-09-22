# Optimal Artifact Design Theory and Common Problems

*A comprehensive reference for implementing reliable streaming artifact systems*

## Executive Summary

The optimal approach for streaming artifact detection and rendering is a **Finite State Machine with Event Bus Architecture**. This solves the fundamental timing and state management issues that cause artifact systems to fail repeatedly across different implementations (Svelte, React, etc.).

**Core Principle**: Detect artifacts immediately upon seeing `<artifact` tags during streaming, not after intent classification or complete parsing.

## Optimal Architecture Principles

### 1. Immediate Detection Pattern
```
Stream chunk arrives → FSM processes → On "<artifact" detected → Immediately switch modes
```

**Why this works:**
- No dependency on intent classification timing
- No waiting for complete artifact parsing
- Immediate UI feedback to users
- Prevents stream completion failures

### 2. Event-Driven Decoupling
```
Parser Events → Event Bus → UI Components
```

**Components:**
- **ArtifactStreamParser**: FSM-based chunk-safe tokenizer
- **Event Bus**: Decouples detection from rendering
- **Render Mode Store**: Per-message state isolation
- **Preview Panel**: Subscribes to artifact events

### 3. Per-Message State Isolation
```
New Message → Reset State → Fresh FSM Instance → Clean Slate
```

**Prevents:** State bleeding between conversations that causes subsequent requests to fail.

## Core Implementation Specifications

### Finite State Machine Design

**States:**
- `MARKDOWN` - Default state, processing regular text
- `ARTIFACT_OPENING` - Detected `<artifact`, parsing attributes
- `ARTIFACT_INNER` - Inside artifact, before CDATA
- `CDATA` - Processing code content within `<![CDATA[...]]>`
- `ARTIFACT_CLOSING` - Detected `</artifact>`, finalizing

**Critical Transitions:**
```typescript
// Immediate detection - don't wait for complete tag
if (chunk.includes('<artifact')) {
  state = 'ARTIFACT_OPENING';
  emitEvent('artifact:detected'); // UI switches modes immediately
}

// Chunk-safe CDATA detection
if (buffer.includes('<![CDATA[')) {
  state = 'CDATA';
  // Begin code accumulation
}
```

### Event Bus Pattern

**Core Events:**
```typescript
interface ArtifactEvents {
  'artifact:detected': { messageId: string, position: number };
  'artifact:completed': { messageId: string, artifact: ArtifactBlock };
  'stream:finalized': { messageId: string };
}
```

**Decoupling Benefits:**
- Parser focuses on tokenization
- UI components focus on presentation
- No race conditions between detection and rendering
- Clean error recovery

### State Management Architecture

```typescript
// Per-message isolation
export function resetForNewMessage(messageId: string) {
  currentMessageId.set(messageId);
  renderMode.set('markdown');
  parser.reset();
}

// Mode transitions
export const modes = {
  markdown: 'Regular text rendering',
  artifact: 'Single artifact detected',
  mixed: 'Text + artifacts in same message'
};
```

## Common Failure Patterns (Anti-Patterns)

### 1. Intent Classification Dependency
**Problem:** Waiting for intent classification before switching to artifact mode.

**Why it fails:**
- Intent classification happens pre-stream
- Artifacts can be created for reasons other than initial intent
- Creates timing dependency that breaks real-time detection

**Solution:** Detect artifacts during streaming regardless of initial intent.

### 2. Complete Parsing Requirement
**Problem:** Waiting for complete `</artifact>` before switching modes.

**Why it fails:**
- User sees markdown rendering for seconds before switch
- Stream chunks may split tags across boundaries
- Creates poor UX with delayed mode switches

**Solution:** Switch modes immediately on `<artifact` detection.

### 3. Shared State Between Messages
**Problem:** State from previous artifact attempts affects new messages.

**Why it fails:**
- Previous artifact parsing errors leave FSM in broken state
- Mode switches don't reset properly
- Subsequent messages start in wrong rendering mode

**Solution:** Complete state reset on every new message.

### 4. Synchronous Coupling
**Problem:** Tight coupling between detection, parsing, and rendering.

**Why it fails:**
- If one component fails, entire pipeline breaks
- Error in rendering prevents detection of subsequent artifacts
- Hard to debug which component is failing

**Solution:** Event-driven architecture with independent components.

### 5. Chunk Alignment Assumptions
**Problem:** Assuming artifact tags arrive in complete chunks.

**Why it fails:**
- Network streams can split tags: `<art` + `ifact>`
- CDATA content can span many small chunks
- Parser breaks on partial tag detection

**Solution:** Chunk-safe tokenization with rolling buffer.

## Root Cause Analysis

### The Fundamental Timing Problem

**Traditional Approach:**
```
User Input → Intent Classification → Enhanced Prompt → LLM Response → Parse Complete Response → Switch Mode
```

**Why this fails:**
- User sees wrong rendering mode during streaming
- Stream completion issues when mode switch fails
- State confusion between requests

**Optimal Approach:**
```
LLM Response Streaming → Immediate Tag Detection → Mode Switch → Continue Parsing
```

### Stream Completion Issues

**Problem:** Artifact streams that never complete properly.

**Root Causes:**
1. Parser gets stuck waiting for closing tags that were split across chunks
2. Error in artifact rendering prevents stream finalization signal
3. UI state doesn't reset properly, affecting subsequent streams

**Solution:** Always call `finalize()` with recovery logic for incomplete streams.

### State Bleeding Between Requests

**Problem:** Previous artifact attempt affects next message rendering.

**Root Causes:**
1. Global state not reset between messages
2. Event listeners not cleaned up properly
3. Previous FSM state persists to next parsing attempt

**Solution:** Complete isolation with per-message state containers.

## Implementation Requirements Checklist

### Parser Requirements
- [ ] Finite state machine with explicit states
- [ ] Chunk-safe tokenization (handles split tags)
- [ ] Rolling buffer for boundary detection
- [ ] Multiple artifacts per message support
- [ ] Graceful fallback for malformed XML
- [ ] Always callable `finalize()` method

### Event System Requirements
- [ ] Event bus for decoupled communication
- [ ] Structured event payload interfaces
- [ ] Clean event listener lifecycle management
- [ ] Debug mode for event tracing

### State Management Requirements
- [ ] Per-message state isolation
- [ ] Explicit state reset on new messages
- [ ] Mode transition validation
- [ ] State debugging/inspection tools

### UI Integration Requirements
- [ ] Immediate mode switching on detection
- [ ] "Open Artifact" button auto-generation
- [ ] Auto-open preview panel (with user preference)
- [ ] Preview panel state management
- [ ] Multiple artifact support in single message

## Testing Strategy

### Unit Tests Required
```typescript
describe('ArtifactStreamParser', () => {
  test('handles artifact tag split across chunks');
  test('processes multiple artifacts in single message');
  test('gracefully handles incomplete artifacts on finalize');
  test('maintains state isolation between messages');
  test('emits correct events at each transition');
});
```

### Integration Tests Required
```typescript
describe('Artifact Workflow', () => {
  test('message with artifact triggers UI mode switch');
  test('auto-opens preview panel when artifact detected');
  test('resets to markdown mode on next message');
  test('handles stream completion properly');
});
```

### Manual Validation Scenarios
1. **Mixed Content**: Markdown → Artifact → Markdown in single message
2. **Split Tags**: Artifact tags split across network chunks
3. **Multiple Artifacts**: Several artifacts in one message
4. **Error Recovery**: Malformed artifact XML
5. **State Reset**: Clean transition between different message types

## Debugging and Observability

### Essential Logging
```typescript
// State transitions
console.log(`[FSM] ${oldState} → ${newState} (trigger: ${event})`);

// Event emissions
console.log(`[Events] Emitted ${eventName}:`, payload);

// Mode changes
console.log(`[RenderMode] ${messageId}: ${oldMode} → ${newMode}`);

// Stream boundaries
console.log(`[Stream] ${messageId}: Started/Completed/Finalized`);
```

### Debug UI Components
- Stream buffer visualization
- FSM state display
- Event log viewer
- Mode transition history

## Historical Context: Evolution of Understanding

### Initial Problem Statement
*"For some reason, this detection always fails. What should be happening is the Artifact SANDPACK Renderer should be starting and receive the stream from the Artifact tag to the End Artifact tag."*

### Root Cause Discovery
*"The problem is not in the generation of the artifact. It is always in the detection that the artifact is supposed to be rendered. There's always a mismatch between deciding to render a markdown versus the artifact."*

### State Management Insight
*"Even when it attempts to build the artifact, the stream doesn't complete. Every subsequent request in the same chain does not know that you still need to render markdown after that question."*

### Solution Architecture Recognition
*"As soon as the incremental stream includes the literal <artifact start tag (even mid-chunk), switch the active renderer to Artifact for this message (do not wait for intent classification)."*

## Conclusion

The key insight is that **artifact detection must be real-time and independent of intent classification**. The solution requires:

1. **Finite State Machine** for robust parsing
2. **Event Bus** for decoupled architecture
3. **Per-Message Isolation** for state cleanliness
4. **Immediate Detection** for responsive UX

This architecture has been proven necessary across multiple implementation attempts (Svelte, React) and solves the fundamental timing and state management issues that cause artifact streaming systems to fail.

---

*Document Version: 1.0*
*Created: September 21, 2025*
*Purpose: Reference architecture for reliable artifact streaming systems*