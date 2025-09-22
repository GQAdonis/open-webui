/**
 * Render Mode State Management
 *
 * Per-message state isolation to prevent bleeding between conversations.
 * This implements the state management pattern from optimal artifact design theory.
 */

import { writable, derived, type Writable } from 'svelte/store';

export type RenderMode = 'markdown' | 'artifact' | 'mixed';

// Per-message state stores
export const renderMode: Writable<RenderMode> = writable('markdown');
export const currentMessageId: Writable<string | null> = writable(null);
export const artifactCount: Writable<number> = writable(0);
export const streamingActive: Writable<boolean> = writable(false);

// Derived stores for convenience
export const isArtifactMode = derived(
  renderMode,
  ($renderMode) => $renderMode === 'artifact' || $renderMode === 'mixed'
);

export const shouldShowArtifactUI = derived(
  [renderMode, artifactCount],
  ([$mode, $count]) => $mode !== 'markdown' || $count > 0
);

/**
 * Reset all state for a new message
 * CRITICAL: This must be called at the start of every new message
 */
export function resetForNewMessage(messageId: string): void {
  console.log('🔄 [RenderMode] Resetting for new message:', messageId.substring(0, 8));

  currentMessageId.set(messageId);
  renderMode.set('markdown');
  artifactCount.set(0);
  streamingActive.set(true);

  // Clean up any lingering event listeners or state
  // This is where we would reset parser instances, etc.
}

/**
 * Update render mode for current message
 */
export function setRenderMode(mode: RenderMode): void {
  renderMode.update(currentMode => {
    if (currentMode !== mode) {
      console.log('🎯 [RenderMode] Mode change:', currentMode, '→', mode);
      return mode;
    }
    return currentMode;
  });
}

/**
 * Increment artifact count
 */
export function incrementArtifactCount(): void {
  artifactCount.update(count => {
    const newCount = count + 1;
    console.log('📊 [RenderMode] Artifact count:', count, '→', newCount);
    return newCount;
  });
}

/**
 * Mark streaming as complete
 */
export function markStreamComplete(): void {
  console.log('✅ [RenderMode] Stream marked complete');
  streamingActive.set(false);
}

/**
 * Get current state snapshot (for debugging)
 */
export function getCurrentState(): {
  messageId: string | null;
  mode: RenderMode;
  artifactCount: number;
  streaming: boolean;
} {
  const state = {
    messageId: null as string | null,
    mode: 'markdown' as RenderMode,
    artifactCount: 0,
    streaming: false
  };

  // Synchronously get current values
  const unsubscribeMessageId = currentMessageId.subscribe(v => state.messageId = v);
  const unsubscribeMode = renderMode.subscribe(v => state.mode = v);
  const unsubscribeCount = artifactCount.subscribe(v => state.artifactCount = v);
  const unsubscribeStreaming = streamingActive.subscribe(v => state.streaming = v);

  // Clean up subscriptions immediately
  unsubscribeMessageId();
  unsubscribeMode();
  unsubscribeCount();
  unsubscribeStreaming();

  return state;
}