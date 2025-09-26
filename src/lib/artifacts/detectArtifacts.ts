/**
 * Unified Artifact Detection System
 *
 * This module provides complete artifact detection supporting both:
 * 1. Legacy formats: code blocks (```jsx, ```tsx, ```svelte) and JSON artifacts
 * 2. PAS 3.0 formats: XML-based artifacts with CDATA sections
 * 3. Intent-based detection and enhancement
 *
 * Enhanced with intent classification integration for improved detection accuracy.
 */

import { parseArtifactsFromContent, type ParsedArtifact } from '$lib/utils/artifacts/xml-artifact-parser';
import { intentClassifier } from '$lib/services/intent-classifier';
import type { IntentClassificationRequest } from '$lib/types/intent-classifier';

export type DetectedArtifact =
  | {
      type: 'react';
      title?: string;
      entryCode: string;
      css?: string;
      extraFiles?: Record<string, string>;
      dependencies?: Record<string, string>;
      shadcnPreset?: boolean;
    }
  | {
      type: 'svelte';
      title?: string;
      entryCode: string;
      css?: string;
      extraFiles?: Record<string, string>;
      dependencies?: Record<string, string>;
      shadcnSveltePreset?: boolean;
    }
  | { type: 'html' | 'svg' | 'mermaid'; content: string }
  | { type: 'iframe'; content: string };

// Enhanced patterns for better detection
const TSX_FENCE = /```(tsx|typescript-react)\n([\s\S]*?)```/gm;
const JSX_FENCE = /```(jsx|javascript-react)\n([\s\S]*?)```/gm;
const SVELTE_FENCE = /```svelte\s*\n([\s\S]*?)```/gm;
const HTML_FENCE = /```html\s*\n([\s\S]*?)```/gm;
const CSS_FENCE = /```css\s*\n([\s\S]*?)```/gm;

export interface ArtifactDetectionResult {
  artifacts: DetectedArtifact[];
  contentWithoutArtifacts: string;
  hasArtifacts: boolean;
  detectionMetadata: {
    legacyCount: number;
    pas3Count: number;
    processingTimeMs: number;
    intentClassified: boolean;
    intentConfidence: number;
    suggestEnhancement: boolean;
  };
}

export function detectArtifactsFromText(text: string): DetectedArtifact[] {
  // Maintain backward compatibility with synchronous API
  return detectArtifactsFromTextSync(text);
}

/**
 * Unified artifact detection - supports both legacy and PAS 3.0 formats
 * Enhanced with intent classification integration
 */
export async function detectArtifactsUnified(text: string, sessionId?: string): Promise<ArtifactDetectionResult> {
  const startTime = performance.now();
  const allArtifacts: DetectedArtifact[] = [];
  let contentWithoutArtifacts = text;

  console.log('🔍 [Artifact Detection] Starting unified detection with intent classification');

  // 1. First perform intent classification to understand user intent
  let intentClassified = false;
  let intentConfidence = 0;
  let suggestEnhancement = false;

  try {
    const intentRequest: IntentClassificationRequest = {
      prompt: text,
      sessionId,
      timestamp: new Date()
    };

    const intentResult = await intentClassifier.classifyIntent(intentRequest);
    intentClassified = true;
    intentConfidence = intentResult.confidence;
    suggestEnhancement = intentResult.shouldEnhance;

    console.log('🔍 [Intent Classification] Result:', {
      shouldEnhance: intentResult.shouldEnhance,
      confidence: intentResult.confidence,
      keywords: intentResult.detectedKeywords
    });
  } catch (error) {
    console.warn('🔍 [Intent Classification] Failed:', error);
    // Continue with detection even if intent classification fails
  }

  // 2. Detect PAS 3.0 XML artifacts
  const pas3Result = parseArtifactsFromContent(text);
  console.log(`🔍 [Artifact Detection] Found ${pas3Result.artifacts.length} PAS 3.0 artifacts`);

  if (pas3Result.hasArtifacts) {
    // Convert PAS 3.0 artifacts to legacy format
    const convertedArtifacts = pas3Result.artifacts
      .map(convertPasToLegacy)
      .filter(Boolean) as DetectedArtifact[];

    allArtifacts.push(...convertedArtifacts);
    contentWithoutArtifacts = pas3Result.contentWithoutArtifacts;
    console.log(`🔍 [Artifact Detection] Converted ${convertedArtifacts.length} PAS 3.0 artifacts`);
  }

  // 3. Then detect legacy code blocks and JSON artifacts from remaining content
  // Use intent classification to improve detection accuracy
  const legacyArtifacts = detectLegacyArtifacts(contentWithoutArtifacts, suggestEnhancement, intentConfidence);
  console.log(`🔍 [Artifact Detection] Found ${legacyArtifacts.length} legacy artifacts`);

  if (legacyArtifacts.length > 0) {
    allArtifacts.push(...legacyArtifacts);
    // Remove legacy artifacts from content
    contentWithoutArtifacts = removeLegacyArtifactsFromContent(contentWithoutArtifacts, legacyArtifacts);
  }

  const processingTime = performance.now() - startTime;
  console.log(`🔍 [Artifact Detection] Completed in ${processingTime.toFixed(2)}ms - Total: ${allArtifacts.length} artifacts`);

  return {
    artifacts: allArtifacts,
    contentWithoutArtifacts: contentWithoutArtifacts.trim(),
    hasArtifacts: allArtifacts.length > 0,
    detectionMetadata: {
      legacyCount: legacyArtifacts.length,
      pas3Count: pas3Result.artifacts.length,
      processingTimeMs: processingTime,
      intentClassified,
      intentConfidence,
      suggestEnhancement
    }
  };
}

/**
 * Detect legacy artifacts (code blocks and JSON)
 * Enhanced with intent classification guidance
 */
function detectLegacyArtifacts(text: string, suggestEnhancement = false, intentConfidence = 0): DetectedArtifact[] {
  const artifacts: DetectedArtifact[] = [];

  // Use intent classification to adjust detection sensitivity
  const confidenceThreshold = suggestEnhancement ? 0.5 : 0.8;
  const shouldDetectAggressive = intentConfidence > confidenceThreshold;

  // Reset regex global state
  TSX_FENCE.lastIndex = 0;
  JSX_FENCE.lastIndex = 0;
  SVELTE_FENCE.lastIndex = 0;
  HTML_FENCE.lastIndex = 0;
  CSS_FENCE.lastIndex = 0;

  // Check for TSX code blocks
  let match;
  while ((match = TSX_FENCE.exec(text)) !== null) {
    const code = match[2].trim();
    if (shouldDetectAggressive || isLikelyComponent(code)) {
      artifacts.push({
        type: 'react',
        title: 'React Component (TSX)',
        entryCode: code
      });
    }
  }

  // Check for JSX code blocks
  while ((match = JSX_FENCE.exec(text)) !== null) {
    const code = match[2].trim();
    if (shouldDetectAggressive || isLikelyComponent(code)) {
      artifacts.push({
        type: 'react',
        title: 'React Component (JSX)',
        entryCode: code
      });
    }
  }

  // Check for Svelte code blocks
  while ((match = SVELTE_FENCE.exec(text)) !== null) {
    const code = match[1].trim();
    if (shouldDetectAggressive || isLikelyComponent(code)) {
      artifacts.push({
        type: 'svelte',
        title: 'Svelte Component',
        entryCode: code
      });
    }
  }

  // Check for HTML code blocks
  while ((match = HTML_FENCE.exec(text)) !== null) {
    const code = match[1].trim();
    if (shouldDetectAggressive || isLikelyHTMLArtifact(code)) {
      artifacts.push({
        type: 'html',
        content: code
      });
    }
  }

  // Check for structured JSON artifacts
  const jsonArtifacts = detectJSONArtifacts(text);
  artifacts.push(...jsonArtifacts);

  return artifacts;
}

/**
 * Detect JSON-based artifacts
 */
function detectJSONArtifacts(text: string): DetectedArtifact[] {
  const artifacts: DetectedArtifact[] = [];

  // Look for JSON blocks that might contain artifacts
  const jsonBlocks = extractJSONBlocks(text);

  for (const jsonText of jsonBlocks) {
    try {
      const parsed = JSON.parse(jsonText);
      const artifact = parseJSONArtifact(parsed);
      if (artifact) {
        artifacts.push(artifact);
      }
    } catch (error) {
      // Not valid JSON or not an artifact
      continue;
    }
  }

  return artifacts;
}

/**
 * Extract potential JSON blocks from text
 */
function extractJSONBlocks(text: string): string[] {
  const blocks: string[] = [];

  // Look for JSON code blocks
  const jsonFence = /```(?:json)?\s*\n([\s\S]*?)```/gm;
  let match;

  while ((match = jsonFence.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }

  // Also check for inline JSON that looks like artifacts
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('{') && line.includes('artifact')) {
      // Try to extract multiline JSON
      let jsonText = line;
      let braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      for (let j = i + 1; j < lines.length && braceCount > 0; j++) {
        const nextLine = lines[j];
        jsonText += '\n' + nextLine;
        braceCount += (nextLine.match(/{/g) || []).length - (nextLine.match(/}/g) || []).length;
      }

      if (braceCount === 0) {
        blocks.push(jsonText);
      }
    }
  }

  return blocks;
}

/**
 * Parse a JSON object to extract artifact information
 */
function parseJSONArtifact(json: any): DetectedArtifact | null {
  if (!json?.artifact) return null;

  const artifact = json.artifact;

  if (artifact.type === 'react') {
    const files = artifact.files ?? {};
    const entry = files['/App.tsx'] ?? files['App.tsx'] ?? files['/index.tsx'] ?? files['index.tsx'] ?? files['/App.jsx'] ?? files['App.jsx'];

    if (entry) {
      return {
        type: 'react',
        title: artifact.title || 'React Artifact',
        entryCode: entry,
        extraFiles: files,
        dependencies: artifact.dependencies ?? {},
        css: artifact.css,
        shadcnPreset: artifact.shadcnPreset ?? false
      };
    }
  } else if (artifact.type === 'svelte') {
    const files = artifact.files ?? {};
    const entry = files['/App.svelte'] ?? files['App.svelte'];

    if (entry) {
      return {
        type: 'svelte',
        title: artifact.title || 'Svelte Artifact',
        entryCode: entry,
        extraFiles: files,
        dependencies: artifact.dependencies ?? {},
        css: artifact.css,
        shadcnSveltePreset: artifact.shadcnSveltePreset ?? false
      };
    }
  } else if (artifact.type === 'html') {
    return {
      type: 'html',
      content: artifact.content || artifact.files?.['/index.html'] || ''
    };
  }

  return null;
}

/**
 * Remove legacy artifacts from content
 */
function removeLegacyArtifactsFromContent(content: string, artifacts: DetectedArtifact[]): string {
  let result = content;

  // Remove code fences
  result = result.replace(TSX_FENCE, '');
  result = result.replace(JSX_FENCE, '');
  result = result.replace(SVELTE_FENCE, '');
  result = result.replace(HTML_FENCE, '');
  result = result.replace(/```(?:json)?\s*\n[\s\S]*?```/gm, '');

  // Clean up extra whitespace
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

  return result.trim();
}

/**
 * Convert PAS 3.0 artifact to legacy format for backward compatibility
 */
function convertPasToLegacy(artifact: ParsedArtifact): DetectedArtifact | null {
  console.log(`🔄 [Conversion] Converting PAS 3.0 artifact: ${artifact.identifier} (${artifact.type})`);

  switch (artifact.type) {
    case 'application/vnd.react+tsx':
    case 'text/tsx':
      return convertReactArtifact(artifact, true);

    case 'application/vnd.react+jsx':
    case 'text/jsx':
      return convertReactArtifact(artifact, false);

    case 'application/vnd.svelte':
    case 'application/vnd.svelte+ts':
    case 'text/svelte':
      return convertSvelteArtifact(artifact);

    case 'text/html':
      return {
        type: 'html',
        content: artifact.files[0]?.content || ''
      };

    case 'image/svg+xml':
      return {
        type: 'svg',
        content: artifact.files[0]?.content || ''
      };

    case 'application/vnd.mermaid':
    case 'text/mermaid':
      return {
        type: 'mermaid',
        content: artifact.files[0]?.content || ''
      };

    default:
      console.warn(`🔄 [Conversion] Unsupported PAS 3.0 artifact type: ${artifact.type}`);

      // Try to infer from content
      const content = artifact.files[0]?.content || '';
      if (content.includes('<html') || content.includes('<!DOCTYPE html')) {
        return { type: 'html', content };
      }
      if (content.includes('<svg')) {
        return { type: 'svg', content };
      }

      return null;
  }
}

/**
 * Convert React PAS 3.0 artifact to legacy format
 */
function convertReactArtifact(artifact: ParsedArtifact, isTypeScript: boolean): DetectedArtifact {
  const entryFile = artifact.files.find(f =>
    f.path === '/App.tsx' || f.path === '/App.jsx' ||
    f.path === 'App.tsx' || f.path === 'App.jsx' ||
    f.path === '/index.tsx' || f.path === '/index.jsx'
  ) || artifact.files[0];

  const extraFiles: Record<string, string> = {};
  let css = '';

  artifact.files.forEach(file => {
    if (file !== entryFile) {
      extraFiles[file.path] = file.content;
      if (file.path.endsWith('.css')) {
        css += file.content + '\n';
      }
    }
  });

  const dependencies: Record<string, string> = {};
  artifact.dependencies.forEach(dep => {
    dependencies[dep.name] = dep.version;
  });

  return {
    type: 'react',
    title: artifact.title || (isTypeScript ? 'React Component (TSX)' : 'React Component (JSX)'),
    entryCode: entryFile?.content || '',
    css: css || undefined,
    extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
    dependencies: Object.keys(dependencies).length > 0 ? dependencies : undefined
  };
}

/**
 * Convert Svelte PAS 3.0 artifact to legacy format
 */
function convertSvelteArtifact(artifact: ParsedArtifact): DetectedArtifact {
  const entryFile = artifact.files.find(f =>
    f.path === '/App.svelte' || f.path === 'App.svelte'
  ) || artifact.files[0];

  const extraFiles: Record<string, string> = {};
  let css = '';

  artifact.files.forEach(file => {
    if (file !== entryFile) {
      extraFiles[file.path] = file.content;
      if (file.path.endsWith('.css')) {
        css += file.content + '\n';
      }
    }
  });

  const dependencies: Record<string, string> = {};
  artifact.dependencies.forEach(dep => {
    dependencies[dep.name] = dep.version;
  });

  return {
    type: 'svelte',
    title: artifact.title || 'Svelte Component',
    entryCode: entryFile?.content || '',
    css: css || undefined,
    extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
    dependencies: Object.keys(dependencies).length > 0 ? dependencies : undefined
  };
}

/**
 * Helper functions for intent-guided detection
 */

/**
 * Determine if code looks like a component worth creating an artifact for
 */
function isLikelyComponent(code: string): boolean {
  // Check for component-like patterns
  const componentPatterns = [
    /export\s+default\s+function/,          // export default function Component
    /function\s+[A-Z][a-zA-Z]*\s*\(/,       // function ComponentName(
    /const\s+[A-Z][a-zA-Z]*\s*=\s*\(/,      // const ComponentName = (
    /export\s+function\s+[A-Z]/,            // export function Component
    /class\s+[A-Z][a-zA-Z]*\s+extends/,     // class Component extends
    /return\s*\(/,                          // return (
    /<[A-Z][a-zA-Z]*\s*[^>]*>/,             // <ComponentName>
    /import.*from\s+['"]react/,             // React imports
    /useState|useEffect|useContext/,        // React hooks
    /\.jsx$|\.tsx$/                         // File extensions in comments
  ];

  // Must have JSX-like content or component structure
  const hasJSX = /<[a-zA-Z]/.test(code) || /\{.*\}/.test(code);
  const hasComponentPattern = componentPatterns.some(pattern => pattern.test(code));

  // Exclude simple code snippets
  const lines = code.split('\n').filter(line => line.trim().length > 0);
  const hasMinimumComplexity = lines.length >= 3;

  return hasJSX && hasComponentPattern && hasMinimumComplexity;
}

/**
 * Determine if HTML code is substantial enough for an artifact
 */
function isLikelyHTMLArtifact(code: string): boolean {
  // Check for meaningful HTML structure
  const htmlPatterns = [
    /<html[^>]*>/i,                         // Full HTML document
    /<head[^>]*>/i,                         // Has head section
    /<body[^>]*>/i,                         // Has body section
    /<div[^>]*class=/i,                     // Styled divs
    /<\w+[^>]*style=/i,                     // Inline styles
    /<script[^>]*>/i,                       // Contains JavaScript
    /<style[^>]*>/i,                        // Contains CSS
    /<!DOCTYPE\s+html>/i                    // DOCTYPE declaration
  ];

  // Must have structural elements
  const hasStructure = htmlPatterns.some(pattern => pattern.test(code));

  // Check for interactive elements
  const interactiveElements = /<(button|input|form|select|textarea|canvas|video|audio)/i.test(code);

  // Exclude simple snippets
  const lines = code.split('\n').filter(line => line.trim().length > 0);
  const hasMinimumSize = lines.length >= 5 || code.length > 200;

  return (hasStructure || interactiveElements) && hasMinimumSize;
}

/**
 * Provide a legacy detection fallback for backward compatibility
 */
export function detectArtifactsFromTextSync(text: string): DetectedArtifact[] {
  // For backward compatibility, provide a synchronous version
  // This uses the original detection logic without intent classification
  return detectLegacyArtifacts(text, false, 0);
}

/**
 * Enhanced artifact detection with context awareness
 */
export async function detectArtifactsWithContext(
  text: string,
  context?: {
    sessionId?: string;
    previousArtifacts?: DetectedArtifact[];
    userIntent?: string;
  }
): Promise<ArtifactDetectionResult> {
  // Enhanced detection that considers conversation context
  const result = await detectArtifactsUnified(text, context?.sessionId);

  // TODO: Use context to improve detection accuracy
  // - Consider previous artifacts in the session
  // - Use explicit user intent if provided
  // - Adjust detection thresholds based on context

  return result;
}