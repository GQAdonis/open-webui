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
