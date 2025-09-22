/**
 * Panel Control System
 *
 * Centralized control for opening/closing preview panels with LibreChat-style UX patterns.
 * This implements the auto-open functionality from the implementation plan.
 */

import { get } from 'svelte/store';
import { settings } from '$lib/stores';
import { artifactSubscriptions } from '$lib/artifacts/ArtifactChannel';
import type { ArtifactBlock } from '$lib/artifacts/ArtifactStreamParser';

// Panel state management
export interface PanelState {
  isOpen: boolean;
  messageId: string | null;
  artifacts: ArtifactBlock[];
  selectedArtifactIndex: number;
  width: string;
  isPinned: boolean;
}

// Global panel state
const panelState: PanelState = {
  isOpen: false,
  messageId: null,
  artifacts: [],
  selectedArtifactIndex: 0,
  width: '60%',
  isPinned: false
};

// Panel event listeners
const panelListeners: Array<(state: PanelState) => void> = [];

/**
 * Subscribe to panel state changes
 */
export function subscribeToPanelState(callback: (state: PanelState) => void): () => void {
  panelListeners.push(callback);

  // Immediately call with current state
  callback({ ...panelState });

  // Return unsubscribe function
  return () => {
    const index = panelListeners.indexOf(callback);
    if (index > -1) {
      panelListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all subscribers of panel state changes
 */
function notifyPanelStateChange(): void {
  const currentState = { ...panelState };
  panelListeners.forEach(callback => {
    try {
      callback(currentState);
    } catch (error) {
      console.error('Error in panel state callback:', error);
    }
  });
}

/**
 * Open artifact preview panel
 */
export interface OpenPanelOptions {
  messageId: string;
  artifact?: ArtifactBlock;
  focusLatest?: boolean;
  autoOpen?: boolean;
}

export function openArtifactPanel(options: OpenPanelOptions): void {
  const { messageId, artifact, focusLatest = true, autoOpen = false } = options;

  console.log('🎯 [PanelControl] Opening artifact panel:', {
    messageId: messageId.substring(0, 8),
    hasArtifact: !!artifact,
    autoOpen
  });

  // Check user preference for auto-open
  if (autoOpen) {
    const userSettings = get(settings);
    const autoOpenEnabled = userSettings?.autoOpenArtifact ?? true;

    if (!autoOpenEnabled) {
      console.log('⏸️ [PanelControl] Auto-open disabled by user preference');
      return;
    }
  }

  // Update panel state
  if (panelState.messageId !== messageId) {
    // New message - reset artifacts
    panelState.artifacts = artifact ? [artifact] : [];
    panelState.selectedArtifactIndex = 0;
  } else if (artifact) {
    // Same message - add artifact if not already present
    const existingIndex = panelState.artifacts.findIndex(a =>
      a.attrs.id === artifact.attrs.id || a.startOffset === artifact.startOffset
    );

    if (existingIndex === -1) {
      panelState.artifacts.push(artifact);
      if (focusLatest) {
        panelState.selectedArtifactIndex = panelState.artifacts.length - 1;
      }
    } else if (focusLatest) {
      panelState.selectedArtifactIndex = existingIndex;
    }
  }

  panelState.isOpen = true;
  panelState.messageId = messageId;

  notifyPanelStateChange();
}

/**
 * Close artifact preview panel
 */
export function closeArtifactPanel(): void {
  console.log('❌ [PanelControl] Closing artifact panel');

  if (!panelState.isPinned) {
    panelState.isOpen = false;
    notifyPanelStateChange();
  }
}

/**
 * Toggle panel pin state
 */
export function togglePanelPin(): void {
  panelState.isPinned = !panelState.isPinned;
  console.log('📌 [PanelControl] Panel pin toggled:', panelState.isPinned);
  notifyPanelStateChange();
}

/**
 * Select artifact by index
 */
export function selectArtifact(index: number): void {
  if (index >= 0 && index < panelState.artifacts.length) {
    panelState.selectedArtifactIndex = index;
    console.log('🎯 [PanelControl] Selected artifact:', index);
    notifyPanelStateChange();
  }
}

/**
 * Update panel width
 */
export function setPanelWidth(width: string): void {
  panelState.width = width;
  notifyPanelStateChange();
}

/**
 * Get current panel state
 */
export function getPanelState(): PanelState {
  return { ...panelState };
}

/**
 * Auto-setup panel system to listen for artifact events
 */
let autoSetupDone = false;

export function setupPanelAutoOpen(): () => void {
  if (autoSetupDone) {
    console.warn('Panel auto-open already setup');
    return () => {};
  }

  console.log('🚀 [PanelControl] Setting up auto-open system');

  // Listen for artifact detection events
  const unsubscribeDetected = artifactSubscriptions.onArtifactDetected((messageId) => {
    console.log('🚨 [PanelControl] Auto-opening panel for detected artifact');
    openArtifactPanel({ messageId, autoOpen: true });
  });

  // Listen for completed artifacts
  const unsubscribeArtifacts = artifactSubscriptions.onArtifact((event) => {
    console.log('✅ [PanelControl] Adding completed artifact to panel');

    if (panelState.isOpen && panelState.messageId === event.messageId) {
      // Panel already open for this message - add artifact
      openArtifactPanel({
        messageId: event.messageId,
        artifact: event.artifact,
        focusLatest: true
      });
    } else {
      // Panel not open yet - this will be handled by onArtifactDetected
    }
  });

  autoSetupDone = true;

  // Return cleanup function
  return () => {
    unsubscribeDetected();
    unsubscribeArtifacts();
    autoSetupDone = false;
  };
}

/**
 * Create "Open Artifact" button handler
 */
export function createArtifactButtonHandler(messageId: string): () => void {
  return () => {
    console.log('🔘 [PanelControl] Artifact button clicked');
    openArtifactPanel({ messageId, focusLatest: true });
  };
}