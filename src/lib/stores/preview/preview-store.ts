/**
 * Preview Store System for Artifact Preview Panel
 * 
 * This module provides state management for the artifact preview functionality,
 * separate from chat controls and other UI elements.
 */

import { writable, derived, get } from 'svelte/store';
import type { MessageAnalysis } from '$lib/utils/preview/message-analyzer';

export interface PreviewState {
  isVisible: boolean;
  code: string;
  css: string;
  type: 'react' | 'html' | 'svg' | 'component';
  title: string;
  messageContent: string;
  analysis: MessageAnalysis | null;
  loading: boolean;
  error: string | null;
}

export interface PreviewPanelConfig {
  width: number; // percentage of viewport
  position: 'right' | 'left';
  showCode: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// Core preview state
export const previewStore = writable<PreviewState>({
  isVisible: false,
  code: '',
  css: '',
  type: 'react',
  title: 'Preview',
  messageContent: '',
  analysis: null,
  loading: false,
  error: null
});

// Panel configuration
export const previewConfig = writable<PreviewPanelConfig>({
  width: 60,
  position: 'right',
  showCode: false,
  theme: 'auto'
});

// Derived stores for convenience
export const isPreviewVisible = derived(
  previewStore,
  ($previewStore) => $previewStore.isVisible
);

export const previewLoading = derived(
  previewStore,
  ($previewStore) => $previewStore.loading
);

export const previewError = derived(
  previewStore,
  ($previewStore) => $previewStore.error
);

export const hasPreviewContent = derived(
  previewStore,
  ($previewStore) => Boolean($previewStore.code || $previewStore.messageContent)
);

/**
 * Preview Actions - Methods to control the preview system
 */
export const previewActions = {
  /**
   * Show preview with code and optional CSS
   */
  show: (
    code: string,
    options: {
      css?: string;
      title?: string;
      type?: PreviewState['type'];
      messageContent?: string;
      analysis?: MessageAnalysis;
    } = {}
  ) => {
    previewStore.update(state => ({
      ...state,
      isVisible: true,
      code,
      css: options.css || '',
      title: options.title || 'Component Preview',
      type: options.type || 'react',
      messageContent: options.messageContent || '',
      analysis: options.analysis || null,
      loading: true,
      error: null
    }));
  },

  /**
   * Show preview from message analysis
   */
  showFromMessage: (messageContent: string, analysis: MessageAnalysis, title?: string) => {
    if (!analysis.bestCodeForPreview) {
      previewActions.showError('No previewable code found in message');
      return;
    }

    previewStore.update(state => ({
      ...state,
      isVisible: true,
      code: analysis.bestCodeForPreview!,
      css: analysis.allCSS,
      title: title || (analysis.hasCompleteApplication ? 'React App Preview' : 'Component Preview'),
      type: 'react',
      messageContent,
      analysis,
      loading: true,
      error: null
    }));
  },

  /**
   * Hide the preview panel
   */
  hide: () => {
    previewStore.update(state => ({
      ...state,
      isVisible: false,
      loading: false,
      error: null
    }));
  },

  /**
   * Toggle preview visibility
   */
  toggle: () => {
    previewStore.update(state => ({
      ...state,
      isVisible: !state.isVisible,
      loading: false,
      error: null
    }));
  },

  /**
   * Set loading state
   */
  setLoading: (loading: boolean) => {
    previewStore.update(state => ({
      ...state,
      loading,
      error: loading ? null : state.error
    }));
  },

  /**
   * Set error state
   */
  setError: (error: string) => {
    previewStore.update(state => ({
      ...state,
      loading: false,
      error
    }));
  },

  /**
   * Show error and make panel visible
   */
  showError: (error: string) => {
    previewStore.update(state => ({
      ...state,
      isVisible: true,
      loading: false,
      error
    }));
  },

  /**
   * Clear error state
   */
  clearError: () => {
    previewStore.update(state => ({
      ...state,
      error: null
    }));
  },

  /**
   * Update preview content without changing visibility
   */
  updateContent: (updates: Partial<Pick<PreviewState, 'code' | 'css' | 'title' | 'type'>>) => {
    previewStore.update(state => ({
      ...state,
      ...updates,
      loading: true,
      error: null
    }));
  },

  /**
   * Reset the preview store to initial state
   */
  reset: () => {
    previewStore.set({
      isVisible: false,
      code: '',
      css: '',
      type: 'react',
      title: 'Preview',
      messageContent: '',
      analysis: null,
      loading: false,
      error: null
    });
  }
};

/**
 * Configuration Actions - Methods to control panel behavior
 */
export const configActions = {
  /**
   * Set panel width (percentage)
   */
  setWidth: (width: number) => {
    const clampedWidth = Math.max(20, Math.min(90, width));
    previewConfig.update(config => ({
      ...config,
      width: clampedWidth
    }));
  },

  /**
   * Set panel position
   */
  setPosition: (position: 'right' | 'left') => {
    previewConfig.update(config => ({
      ...config,
      position
    }));
  },

  /**
   * Toggle code view
   */
  toggleCodeView: () => {
    previewConfig.update(config => ({
      ...config,
      showCode: !config.showCode
    }));
  },

  /**
   * Set theme
   */
  setTheme: (theme: 'light' | 'dark' | 'auto') => {
    previewConfig.update(config => ({
      ...config,
      theme
    }));
  }
};

/**
 * Utility function to get current state
 */
export const getPreviewState = (): PreviewState => get(previewStore);
export const getPreviewConfig = (): PreviewPanelConfig => get(previewConfig);

/**
 * Subscribe to preview visibility changes (useful for cleanup)
 */
export const onPreviewVisibilityChange = (callback: (visible: boolean) => void) => {
  return isPreviewVisible.subscribe(callback);
};

/**
 * Check if preview is currently showing any content
 */
export const hasActivePreview = (): boolean => {
  const state = getPreviewState();
  return state.isVisible && (Boolean(state.code) || Boolean(state.messageContent));
};
