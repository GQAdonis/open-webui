/**
 * Artifact Event Bus - Decoupled Communication Channel
 *
 * This implements the event bus pattern from optimal artifact design theory
 * to decouple artifact detection from UI rendering. Benefits:
 *
 * - No race conditions between detection and rendering
 * - Clean separation of concerns
 * - Easy to add new subscribers (preview panels, debug tools, etc.)
 * - Robust error handling
 */

import type { ArtifactBlock } from './ArtifactStreamParser';

export interface ArtifactRenderEvent {
  messageId: string;
  artifact: ArtifactBlock;
  timestamp: number;
}

export interface StreamModeEvent {
  messageId: string;
  mode: 'markdown' | 'artifact' | 'mixed';
  timestamp: number;
}

export interface StreamCompleteEvent {
  messageId: string;
  artifactCount: number;
  timestamp: number;
}

/**
 * Global event bus for artifact communication
 */
export const artifactBus = new EventTarget();

/**
 * Event emitters for different types of artifact events
 */
export const artifactEvents = {
  /**
   * Emit when a new artifact is detected and parsed
   */
  emitArtifact(messageId: string, artifact: ArtifactBlock): void {
    const event: ArtifactRenderEvent = {
      messageId,
      artifact,
      timestamp: Date.now()
    };

    console.log('🎯 [ArtifactChannel] Emitting artifact event:', {
      messageId: messageId.substring(0, 8),
      type: artifact.attrs.type,
      id: artifact.attrs.id
    });

    artifactBus.dispatchEvent(new CustomEvent('artifact', { detail: event }));
  },

  /**
   * Emit when stream mode changes (markdown -> artifact -> mixed)
   */
  emitModeChange(messageId: string, mode: 'markdown' | 'artifact' | 'mixed'): void {
    const event: StreamModeEvent = {
      messageId,
      mode,
      timestamp: Date.now()
    };

    console.log('🔄 [ArtifactChannel] Emitting mode change:', { messageId: messageId.substring(0, 8), mode });

    artifactBus.dispatchEvent(new CustomEvent('mode_change', { detail: event }));
  },

  /**
   * Emit when artifact stream is complete
   */
  emitStreamComplete(messageId: string, artifactCount: number): void {
    const event: StreamCompleteEvent = {
      messageId,
      artifactCount,
      timestamp: Date.now()
    };

    console.log('✅ [ArtifactChannel] Emitting stream complete:', { messageId: messageId.substring(0, 8), artifactCount });

    artifactBus.dispatchEvent(new CustomEvent('stream_complete', { detail: event }));
  },

  /**
   * Emit when artifact detection first occurs (for immediate UI response)
   */
  emitArtifactDetected(messageId: string): void {
    console.log('🚨 [ArtifactChannel] Emitting artifact detected:', { messageId: messageId.substring(0, 8) });

    artifactBus.dispatchEvent(new CustomEvent('artifact_detected', {
      detail: { messageId, timestamp: Date.now() }
    }));
  }
};

/**
 * Event listeners for easy subscription management
 */
export const artifactSubscriptions = {
  /**
   * Subscribe to new artifacts
   */
  onArtifact(callback: (event: ArtifactRenderEvent) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<ArtifactRenderEvent>;
      callback(customEvent.detail);
    };

    artifactBus.addEventListener('artifact', handler);
    return () => artifactBus.removeEventListener('artifact', handler);
  },

  /**
   * Subscribe to mode changes
   */
  onModeChange(callback: (event: StreamModeEvent) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<StreamModeEvent>;
      callback(customEvent.detail);
    };

    artifactBus.addEventListener('mode_change', handler);
    return () => artifactBus.removeEventListener('mode_change', handler);
  },

  /**
   * Subscribe to stream completion
   */
  onStreamComplete(callback: (event: StreamCompleteEvent) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<StreamCompleteEvent>;
      callback(customEvent.detail);
    };

    artifactBus.addEventListener('stream_complete', handler);
    return () => artifactBus.removeEventListener('stream_complete', handler);
  },

  /**
   * Subscribe to artifact detection (for immediate UI response)
   */
  onArtifactDetected(callback: (messageId: string) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ messageId: string; timestamp: number }>;
      callback(customEvent.detail.messageId);
    };

    artifactBus.addEventListener('artifact_detected', handler);
    return () => artifactBus.removeEventListener('artifact_detected', handler);
  }
};

/**
 * Debug utilities
 */
export const artifactDebug = {
  /**
   * Enable debug logging for all artifact events
   */
  enableDebugLogging(): () => void {
    const handler = (e: Event) => {
      console.log(`[ArtifactChannel:DEBUG] Event: ${e.type}`, (e as CustomEvent).detail);
    };

    const events = ['artifact', 'mode_change', 'stream_complete', 'artifact_detected'];
    events.forEach(eventType => {
      artifactBus.addEventListener(eventType, handler);
    });

    return () => {
      events.forEach(eventType => {
        artifactBus.removeEventListener(eventType, handler);
      });
    };
  },

  /**
   * Get current event listener count (for memory leak detection)
   */
  getListenerCount(): Record<string, any> {
    // Note: EventTarget doesn't provide a way to count listeners
    // This is a placeholder for debugging purposes
    return {
      note: 'EventTarget does not expose listener count. Use browser dev tools to monitor.'
    };
  }
};

/**
 * Utility to create a message-specific event bus
 * Useful for components that only care about specific messages
 */
export function createMessageEventBus(messageId: string) {
  return {
    onArtifact: (callback: (artifact: ArtifactBlock) => void) => {
      return artifactSubscriptions.onArtifact((event) => {
        if (event.messageId === messageId) {
          callback(event.artifact);
        }
      });
    },

    onModeChange: (callback: (mode: 'markdown' | 'artifact' | 'mixed') => void) => {
      return artifactSubscriptions.onModeChange((event) => {
        if (event.messageId === messageId) {
          callback(event.mode);
        }
      });
    },

    onStreamComplete: (callback: (artifactCount: number) => void) => {
      return artifactSubscriptions.onStreamComplete((event) => {
        if (event.messageId === messageId) {
          callback(event.artifactCount);
        }
      });
    },

    onArtifactDetected: (callback: () => void) => {
      return artifactSubscriptions.onArtifactDetected((eventMessageId) => {
        if (eventMessageId === messageId) {
          callback();
        }
      });
    }
  };
}