// Legacy artifact detection - maintained for backward compatibility
// This module provides a bridge between the old detection system and PAS 3.0

import { extractArtifacts, type ParsedArtifact } from '$lib/utils/artifacts/artifact-parser';

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

const TSX_FENCE = /```(tsx|jsx)\n([\s\S]*?)```/m;
const TS_FENCE = /```(ts|typescript)\n([\s\S]*?)```/m;
const SVELTE_FENCE = /```svelte\s+([\s\S]*?)```/m;

export function detectArtifactsFromText(text: string): DetectedArtifact[] {
  const out: DetectedArtifact[] = [];
  
  // First try to parse PAS 3.0 artifacts
  try {
    const pasArtifacts = extractArtifacts(text);
    if (pasArtifacts.length > 0) {
      // Convert PAS 3.0 artifacts to legacy format
      return pasArtifacts.map(convertPasToLegacy).filter(Boolean) as DetectedArtifact[];
    }
  } catch (error) {
    // If PAS parsing fails, fall back to legacy detection
    console.debug('PAS 3.0 parsing failed, falling back to legacy detection:', error);
  }
  
  // Legacy detection for backward compatibility
  
  // Check for TSX/JSX code blocks
  const tsxMatch = TSX_FENCE.exec(text);
  if (tsxMatch) {
    out.push({ type: 'react', title: 'React Artifact', entryCode: tsxMatch[2] });
  }

  // Check for Svelte code blocks
  const svelteMatch = SVELTE_FENCE.exec(text);
  if (svelteMatch) {
    out.push({ type: 'svelte', title: 'Svelte Artifact', entryCode: svelteMatch[1] });
  }

  // Check for structured JSON artifacts
  try {
    const j = JSON.parse(text);
    if (j?.artifact?.type === 'react') {
      const files = j.artifact.files ?? {};
      const entry = files['/App.tsx'] ?? files['App.tsx'] ?? files['/index.tsx'] ?? files['index.tsx'];
      if (entry) {
        out.push({ 
          type: 'react', 
          title: j.artifact.title, 
          entryCode: entry, 
          extraFiles: files, 
          dependencies: j.artifact.dependencies ?? {}, 
          css: j.artifact.css,
          shadcnPreset: j.artifact.shadcnPreset ?? false
        });
      }
    } else if (j?.artifact?.type === 'svelte') {
      const files = j.artifact.files ?? {};
      const entry = files['/App.svelte'] ?? files['App.svelte'];
      if (entry) {
        out.push({
          type: 'svelte',
          title: j.artifact.title,
          entryCode: entry,
          extraFiles: files,
          dependencies: j.artifact.dependencies ?? {},
          css: j.artifact.css ?? undefined,
          shadcnSveltePreset: j.artifact.shadcnSveltePreset ?? false
        });
      }
    }
  } catch {
    // Not JSON, continue with other checks
  }

  return out;
}

// Convert PAS 3.0 artifact to legacy format for backward compatibility
function convertPasToLegacy(artifact: ParsedArtifact): DetectedArtifact | null {
  switch (artifact.type) {
    case 'text/tsx':
    case 'application/tsx':
      return {
        type: 'react',
        title: artifact.title,
        entryCode: artifact.files[0]?.content || '',
        // TODO: Extract dependencies and extra files from content if needed
      };
    
    case 'text/jsx':
    case 'application/jsx':
      return {
        type: 'react',
        title: artifact.title,
        entryCode: artifact.files[0]?.content || '',
      };
    
    case 'text/svelte':
    case 'application/svelte':
      return {
        type: 'svelte',
        title: artifact.title,
        entryCode: artifact.files[0]?.content || '',
      };
    
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
    
    case 'application/mermaid':
    case 'text/mermaid':
      return {
        type: 'mermaid',
        content: artifact.files[0]?.content || ''
      };
    
    default:
      // For unsupported MIME types, try to infer from content
      if (artifact.files[0]?.content?.includes('<html') || artifact.files[0]?.content?.includes('<!DOCTYPE html')) {
        return {
          type: 'html',
          content: artifact.files[0]?.content || ''
        };
      }
      
      if (artifact.files[0]?.content?.includes('<svg')) {
        return {
          type: 'svg',
          content: artifact.files[0]?.content || ''
        };
      }
      
      // Return null for unsupported types
      return null;
  }
}
