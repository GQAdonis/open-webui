/**
 * Artifact Store - State Management for PAS 3.0 Artifacts
 * 
 * This module provides Svelte stores for managing artifact state, including
 * storage, retrieval, and UI state management for the artifact system.
 */

import { writable, derived, get } from 'svelte/store';
import type { ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';

export interface ArtifactUIState {
isVisible: boolean;
selectedArtifactId: string | null;
viewMode: 'preview' | 'code' | 'xml';
isPanelCollapsed: boolean;
panelWidth: number;
}

export interface ArtifactContainer {
artifact: ParsedArtifact;
chatId: string;
messageId: string;
createdAt: number;
updatedAt: number;
}

// Core artifact storage
export const artifactStore = writable<Map<string, ArtifactContainer>>(new Map());

// UI state management
export const artifactUIState = writable<ArtifactUIState>({
isVisible: false,
selectedArtifactId: null,
viewMode: 'preview',
isPanelCollapsed: false,
panelWidth: 400
});

// Chat-specific artifacts
export const chatArtifacts = derived(
artifactStore,
($artifactStore) => {
return (chatId: string) => {
const artifacts: ArtifactContainer[] = [];
for (const container of $artifactStore.values()) {
if (container.chatId === chatId) {
artifacts.push(container);
}
}
return artifacts.sort((a, b) => b.createdAt - a.createdAt);
};
}
);

// Currently selected artifact
export const selectedArtifact = derived(
[artifactStore, artifactUIState],
([$artifactStore, $artifactUIState]) => {
if (!$artifactUIState.selectedArtifactId) return null;
return $artifactStore.get($artifactUIState.selectedArtifactId) || null;
}
);

// Artifact actions
export const artifactActions = {
/**
 * Add a new artifact to the store
 */
addArtifact(artifact: ParsedArtifact, chatId: string, messageId: string): void {
const container: ArtifactContainer = {
artifact,
chatId,
messageId,
createdAt: Date.now(),
updatedAt: Date.now()
};

artifactStore.update(store => {
store.set(artifact.identifier, container);
return store;
});

// Auto-select the new artifact if none is selected
artifactUIState.update(state => {
if (!state.selectedArtifactId) {
state.selectedArtifactId = artifact.identifier;
state.isVisible = true;
}
return state;
});
},

/**
 * Update an existing artifact
 */
updateArtifact(identifier: string, updatedArtifact: ParsedArtifact): void {
artifactStore.update(store => {
const container = store.get(identifier);
if (container) {
container.artifact = updatedArtifact;
container.updatedAt = Date.now();
store.set(identifier, container);
}
return store;
});
},

/**
 * Remove an artifact from the store
 */
removeArtifact(identifier: string): void {
artifactStore.update(store => {
store.delete(identifier);
return store;
});

// Clear selection if this artifact was selected
artifactUIState.update(state => {
if (state.selectedArtifactId === identifier) {
state.selectedArtifactId = null;
}
return state;
});
},

/**
 * Clear all artifacts for a specific chat
 */
clearChatArtifacts(chatId: string): void {
artifactStore.update(store => {
const toDelete: string[] = [];
for (const [id, container] of store.entries()) {
if (container.chatId === chatId) {
toDelete.push(id);
}
}
toDelete.forEach(id => store.delete(id));
return store;
});

// Clear selection if it was from this chat
const state = get(artifactUIState);
if (state.selectedArtifactId) {
const selectedContainer = get(artifactStore).get(state.selectedArtifactId);
if (selectedContainer?.chatId === chatId) {
artifactUIState.update(state => {
state.selectedArtifactId = null;
return state;
});
}
}
},

/**
 * Select an artifact for display
 */
selectArtifact(identifier: string | null): void {
artifactUIState.update(state => {
state.selectedArtifactId = identifier;
if (identifier) {
state.isVisible = true;
}
return state;
});
},

/**
 * Toggle artifact panel visibility
 */
togglePanel(): void {
artifactUIState.update(state => {
state.isVisible = !state.isVisible;
return state;
});
},

/**
 * Show artifact panel
 */
showPanel(): void {
artifactUIState.update(state => {
state.isVisible = true;
return state;
});
},

/**
 * Hide artifact panel
 */
hidePanel(): void {
artifactUIState.update(state => {
state.isVisible = false;
return state;
});
},

/**
 * Set view mode
 */
setViewMode(mode: 'preview' | 'code' | 'xml'): void {
artifactUIState.update(state => {
state.viewMode = mode;
return state;
});
},

/**
 * Toggle panel collapse state
 */
togglePanelCollapse(): void {
artifactUIState.update(state => {
state.isPanelCollapsed = !state.isPanelCollapsed;
return state;
});
},

/**
 * Set panel width
 */
setPanelWidth(width: number): void {
artifactUIState.update(state => {
state.panelWidth = Math.max(300, Math.min(800, width));
return state;
});
},

/**
 * Get artifact by identifier
 */
getArtifact(identifier: string): ArtifactContainer | null {
const store = get(artifactStore);
return store.get(identifier) || null;
},

/**
 * Check if artifact exists
 */
hasArtifact(identifier: string): boolean {
const store = get(artifactStore);
return store.has(identifier);
},

/**
 * Get all artifacts as array
 */
getAllArtifacts(): ArtifactContainer[] {
const store = get(artifactStore);
return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt);
},

/**
 * Get artifacts for specific message
 */
getMessageArtifacts(messageId: string): ArtifactContainer[] {
const store = get(artifactStore);
const artifacts: ArtifactContainer[] = [];
for (const container of store.values()) {
if (container.messageId === messageId) {
artifacts.push(container);
}
}
return artifacts.sort((a, b) => b.createdAt - a.createdAt);
}
};

// Persistence utilities
export const artifactPersistence = {
/**
 * Save artifacts to localStorage
 */
saveToLocalStorage(): void {
try {
const store = get(artifactStore);
const serialized = Array.from(store.entries()).map(([id, container]) => ({
id,
...container
}));
localStorage.setItem('openwebui_artifacts', JSON.stringify(serialized));
} catch (error) {
console.warn('Failed to save artifacts to localStorage:', error);
}
},

/**
 * Load artifacts from localStorage
 */
loadFromLocalStorage(): void {
try {
const stored = localStorage.getItem('openwebui_artifacts');
if (stored) {
const serialized = JSON.parse(stored);
const map = new Map<string, ArtifactContainer>();

for (const item of serialized) {
const { id, ...container } = item;
map.set(id, container as ArtifactContainer);
}

artifactStore.set(map);
}
} catch (error) {
console.warn('Failed to load artifacts from localStorage:', error);
}
},

/**
 * Clear all stored artifacts
 */
clearStorage(): void {
try {
localStorage.removeItem('openwebui_artifacts');
artifactStore.set(new Map());
artifactUIState.update(state => {
state.selectedArtifactId = null;
state.isVisible = false;
return state;
});
} catch (error) {
console.warn('Failed to clear artifacts storage:', error);
}
}
};

// Auto-save to localStorage when store changes
artifactStore.subscribe(() => {
artifactPersistence.saveToLocalStorage();
});

// Initialize from localStorage on startup
if (typeof window !== 'undefined') {
artifactPersistence.loadFromLocalStorage();
}
