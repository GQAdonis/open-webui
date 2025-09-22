/**
 * Message Analysis Utilities for Artifact Preview System
 * 
 * This module analyzes chat messages to extract code blocks, CSS styles,
 * and determine the best content for preview generation.
 */

import { analyzeReactCode, type CodeAnalysisResult } from './code-analyzer';

export interface MessageCodeBlock {
  language: string;
  code: string;
  isComplete: boolean;
  componentNames: string[];
  analysis: CodeAnalysisResult;
}

export interface MessageAnalysis {
  codeBlocks: MessageCodeBlock[];
  cssBlocks: string[];
  hasCompleteApplication: boolean;
  primaryComponent: string | null;
  allCSS: string;
  bestCodeForPreview: string | null;
}

/**
 * Analyzes a chat message to extract and classify code blocks and CSS
 */
export function analyzeMessageForArtifacts(messageContent: string): MessageAnalysis {
  if (!messageContent || typeof messageContent !== 'string') {
    return createEmptyAnalysis();
  }

  const codeBlocks = extractCodeBlocks(messageContent);
  const cssBlocks = extractCSSBlocks(messageContent);
  
  // Determine if we have a complete application
  const hasCompleteApplication = codeBlocks.some(block => block.isComplete);
  
  // Find the best code for preview
  const bestCodeForPreview = findBestCodeForPreview(codeBlocks);
  
  // Combine all CSS
  const allCSS = cssBlocks.join('\n\n');
  
  return {
    codeBlocks,
    cssBlocks,
    hasCompleteApplication,
    primaryComponent: bestCodeForPreview,
    allCSS,
    bestCodeForPreview
  };
}

/**
 * Extracts all code blocks from a message
 */
function extractCodeBlocks(messageContent: string): MessageCodeBlock[] {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
  const codeBlocks: MessageCodeBlock[] = [];
  let match;
  
  while ((match = codeBlockRegex.exec(messageContent)) !== null) {
    const [, language, code] = match;
    
    // Skip CSS blocks - they're handled separately
    if (language === 'css' || language === 'scss' || language === 'less') {
      continue;
    }
    
    // Process JavaScript/React code blocks
    if (isJavaScriptLanguage(language)) {
      const analysis = analyzeReactCode(code);
      
      codeBlocks.push({
        language: language || 'jsx',
        code: code.trim(),
        isComplete: analysis.type === 'application',
        componentNames: analysis.componentNames,
        analysis
      });
    }
  }
  
  return codeBlocks;
}

/**
 * Extracts CSS blocks from a message
 */
function extractCSSBlocks(messageContent: string): string[] {
  const cssBlocks: string[] = [];
  
  // Extract CSS from ```css blocks
  const cssCodeRegex = /```(?:css|scss|less)\n([\s\S]*?)\n```/g;
  let match;
  
  while ((match = cssCodeRegex.exec(messageContent)) !== null) {
    const css = match[1].trim();
    if (css) {
      cssBlocks.push(css);
    }
  }
  
  // Extract CSS from <style> tags
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleTagRegex.exec(messageContent)) !== null) {
    const css = match[1].trim();
    if (css) {
      cssBlocks.push(css);
    }
  }
  
  return cssBlocks;
}

/**
 * Finds the best code block for preview
 * Prioritizes: Complete applications > Standalone components > Largest fragment
 */
function findBestCodeForPreview(codeBlocks: MessageCodeBlock[]): string | null {
  if (codeBlocks.length === 0) {
    return null;
  }
  
  // First priority: Complete applications
  const completeApps = codeBlocks.filter(block => block.isComplete);
  if (completeApps.length > 0) {
    // Return the largest complete application
    return completeApps.reduce((prev, current) => 
      prev.code.length > current.code.length ? prev : current
    ).code;
  }
  
  // Second priority: Standalone components
  const components = codeBlocks.filter(block => 
    block.analysis.type === 'component' && block.analysis.isReactCode
  );
  if (components.length > 0) {
    return components[0].code; // Return first valid component
  }
  
  // Third priority: Any React code fragments
  const reactFragments = codeBlocks.filter(block => 
    block.analysis.isReactCode
  );
  if (reactFragments.length > 0) {
    return reactFragments.reduce((prev, current) => 
      prev.code.length > current.code.length ? prev : current
    ).code;
  }
  
  // Fallback: Largest code block
  return codeBlocks.reduce((prev, current) => 
    prev.code.length > current.code.length ? prev : current
  ).code;
}

/**
 * Checks if a language identifier represents JavaScript/React
 */
function isJavaScriptLanguage(language?: string): boolean {
  if (!language) return true; // Default to JavaScript if no language specified
  
  const jsLanguages = [
    'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'react'
  ];
  
  return jsLanguages.includes(language.toLowerCase());
}

/**
 * Creates an empty analysis result
 */
function createEmptyAnalysis(): MessageAnalysis {
  return {
    codeBlocks: [],
    cssBlocks: [],
    hasCompleteApplication: false,
    primaryComponent: null,
    allCSS: '',
    bestCodeForPreview: null
  };
}

/**
 * Utility function to extract CSS from legacy artifactCode usage
 */
export function extractCSSFromMessage(messageContent: string): string {
  const analysis = analyzeMessageForArtifacts(messageContent);
  return analysis.allCSS;
}

/**
 * Gets all component names mentioned in the message
 */
export function getAllComponentNames(messageContent: string): string[] {
  const analysis = analyzeMessageForArtifacts(messageContent);
  const allNames: string[] = [];
  
  analysis.codeBlocks.forEach(block => {
    block.componentNames.forEach(name => {
      if (!allNames.includes(name)) {
        allNames.push(name);
      }
    });
  });
  
  return allNames;
}

/**
 * Checks if the message contains previewable React content
 */
export function hasPreviewableContent(messageContent: string): boolean {
  const analysis = analyzeMessageForArtifacts(messageContent);
  return analysis.bestCodeForPreview !== null;
}
