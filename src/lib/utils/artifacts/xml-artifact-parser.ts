/**
 * XML-based Artifact Parser with CDATA Support
 *
 * This module provides a proper XML parser using fast-xml-parser to handle
 * PAS 3.0 artifact tags with full CDATA section support for embedded code.
 */

import { XMLParser } from 'fast-xml-parser';

export interface ArtifactFile {
  path: string;
  content: string;
}

export interface ArtifactDependency {
  name: string;
  version: string;
}

export interface ParsedArtifact {
  identifier: string;
  type: string;
  title: string;
  description?: string;
  dependencies: ArtifactDependency[];
  files: ArtifactFile[];
  rawXml: string;
}

export interface ArtifactParseResult {
  artifacts: ParsedArtifact[];
  contentWithoutArtifacts: string;
  hasArtifacts: boolean;
}

/**
 * Configuration for the XML parser optimized for artifact processing
 */
const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  cdataPropName: "#cdata",
  parseTrueNumberOnly: false,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: true,
  htmlEntities: false,
  ignoreNameSpace: false,
  allowBooleanAttributes: true,
  parseNodeValue: true,
  parseTagValue: true,
  preserveOrder: false,
  arrayMode: false,
  stopNodes: ["*.CDATA"],
  alwaysCreateTextNode: false
};

/**
 * Create and configure the XML parser
 */
const xmlParser = new XMLParser(XML_PARSER_OPTIONS);

/**
 * Extract artifact XML blocks from content
 */
function extractArtifactBlocks(content: string): { blocks: string[], contentWithoutArtifacts: string } {
  const artifactBlocks: string[] = [];
  const artifactRegex = /<artifact[^>]*>[\s\S]*?<\/artifact>/gi;
  let match;

  // Extract all artifact blocks
  while ((match = artifactRegex.exec(content)) !== null) {
    artifactBlocks.push(match[0]);
  }

  // Remove artifact blocks from content
  const contentWithoutArtifacts = content.replace(artifactRegex, '').trim();

  return { blocks: artifactBlocks, contentWithoutArtifacts };
}

/**
 * Parse a single artifact XML block
 */
function parseArtifactBlock(xmlBlock: string): ParsedArtifact | null {
  try {
    console.log('🔧 [XML Parser] Parsing artifact block:', xmlBlock.substring(0, 200) + '...');

    const parsed = xmlParser.parse(xmlBlock);
    console.log('🔧 [XML Parser] Parsed result:', JSON.stringify(parsed, null, 2));

    if (!parsed.artifact) {
      console.warn('🔧 [XML Parser] No artifact element found in parsed XML');
      return null;
    }

    const artifact = parsed.artifact;

    // Extract basic artifact properties
    const identifier = artifact['@_identifier'] || '';
    const type = artifact['@_type'] || '';
    const title = artifact['@_title'] || '';

    if (!identifier || !type) {
      console.warn('🔧 [XML Parser] Missing required artifact attributes:', { identifier, type });
      return null;
    }

    // Extract description
    const description = artifact.description || '';

    // Extract dependencies
    const dependencies: ArtifactDependency[] = [];
    if (artifact.dependencies && artifact.dependencies.dependency) {
      const deps = Array.isArray(artifact.dependencies.dependency)
        ? artifact.dependencies.dependency
        : [artifact.dependencies.dependency];

      deps.forEach((dep: any) => {
        if (dep['@_name'] && dep['@_version']) {
          dependencies.push({
            name: dep['@_name'],
            version: dep['@_version']
          });
        }
      });
    }

    // Extract files with CDATA content
    const files: ArtifactFile[] = [];
    if (artifact.files && artifact.files.file) {
      const fileElements = Array.isArray(artifact.files.file)
        ? artifact.files.file
        : [artifact.files.file];

      fileElements.forEach((file: any) => {
        const path = file['@_path'];
        if (!path) return;

        // Handle CDATA content - fast-xml-parser puts CDATA in #cdata property
        let content = '';
        if (file['#cdata']) {
          content = file['#cdata'];
        } else if (file['#text']) {
          content = file['#text'];
        } else if (typeof file === 'string') {
          content = file;
        }

        files.push({
          path,
          content: content.trim()
        });
      });
    }

    console.log('🔧 [XML Parser] Successfully parsed artifact:', {
      identifier,
      type,
      title,
      dependencies: dependencies.length,
      files: files.length
    });

    return {
      identifier,
      type,
      title,
      description,
      dependencies,
      files,
      rawXml: xmlBlock
    };

  } catch (error) {
    console.error('🔧 [XML Parser] Error parsing artifact XML:', error);
    console.error('🔧 [XML Parser] Problematic XML:', xmlBlock);
    return null;
  }
}

/**
 * Main function to parse artifacts from content
 */
export function parseArtifactsFromContent(content: string): ArtifactParseResult {
  console.log('🔧 [XML Parser] Starting artifact parsing from content');

  const { blocks, contentWithoutArtifacts } = extractArtifactBlocks(content);
  console.log('🔧 [XML Parser] Found', blocks.length, 'artifact blocks');

  if (blocks.length === 0) {
    return {
      artifacts: [],
      contentWithoutArtifacts: content,
      hasArtifacts: false
    };
  }

  const artifacts: ParsedArtifact[] = [];

  for (const block of blocks) {
    const parsed = parseArtifactBlock(block);
    if (parsed) {
      artifacts.push(parsed);
    }
  }

  console.log('🔧 [XML Parser] Successfully parsed', artifacts.length, 'artifacts');

  return {
    artifacts,
    contentWithoutArtifacts,
    hasArtifacts: artifacts.length > 0
  };
}

/**
 * Check if content contains artifact tags
 */
export function hasArtifactTags(content: string): boolean {
  return /<artifact[^>]*>[\s\S]*?<\/artifact>/i.test(content);
}

/**
 * Validate parsed artifact structure
 */
export function validateArtifact(artifact: ParsedArtifact): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!artifact.identifier) {
    errors.push('Missing identifier');
  }

  if (!artifact.type) {
    errors.push('Missing type');
  }

  if (!artifact.title) {
    errors.push('Missing title');
  }

  if (!artifact.files || artifact.files.length === 0) {
    errors.push('No files found');
  }

  // Validate file paths
  artifact.files.forEach((file, index) => {
    if (!file.path) {
      errors.push(`File ${index} missing path`);
    }
    if (!file.content) {
      errors.push(`File ${index} (${file.path}) has no content`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get supported artifact types
 */
export function getSupportedArtifactTypes(): string[] {
  return [
    'text/html',
    'application/vnd.react+jsx',
    'application/vnd.react+tsx',
    'application/vnd.svelte',
    'application/vnd.svelte+ts',
    'application/javascript',
    'application/typescript',
    'text/markdown',
    'application/vnd.mermaid',
    'image/svg+xml',
    'application/json'
  ];
}

/**
 * Determine if an artifact type should use Sandpack
 */
export function shouldUseSandpack(artifactType: string): boolean {
  return [
    'text/html',
    'application/vnd.react+jsx',
    'application/vnd.react+tsx',
    'application/vnd.svelte',
    'application/vnd.svelte+ts'
  ].includes(artifactType);
}

/**
 * Convert parsed artifact to Sandpack template
 */
export function getSandpackTemplate(artifact: ParsedArtifact): string {
  switch (artifact.type) {
    case 'application/vnd.react+jsx':
      return 'react';
    case 'application/vnd.react+tsx':
      return 'react-ts';
    case 'application/vnd.svelte':
    case 'application/vnd.svelte+ts':
      return 'svelte';
    case 'text/html':
    default:
      return 'static';
  }
}

/**
 * Convert artifact files to Sandpack files format
 */
export function getSandpackFiles(artifact: ParsedArtifact): Record<string, string> {
  const files: Record<string, string> = {};

  artifact.files.forEach(file => {
    // Convert file paths to Sandpack-compatible format
    let sandpackPath = file.path;

    // For React artifacts, ensure proper file extensions
    if (artifact.type === 'application/vnd.react+jsx' || artifact.type === 'application/vnd.react+tsx') {
      if (sandpackPath === 'App.jsx' || sandpackPath === 'App.tsx') {
        sandpackPath = '/App.' + (artifact.type.includes('tsx') ? 'tsx' : 'jsx');
      } else if (!sandpackPath.startsWith('/')) {
        sandpackPath = '/' + sandpackPath;
      }
    }

    // For HTML artifacts, map to index.html if needed
    if (artifact.type === 'text/html' && sandpackPath === 'index.html') {
      sandpackPath = '/index.html';
    }

    // For Svelte artifacts
    if (artifact.type.includes('svelte')) {
      if (sandpackPath.endsWith('.svelte') && !sandpackPath.startsWith('/')) {
        sandpackPath = '/' + sandpackPath;
      }
    }

    files[sandpackPath] = file.content;
  });

  return files;
}

/**
 * Check if artifact uses TypeScript
 */
export function isTypeScriptArtifact(artifact: ParsedArtifact): boolean {
  return artifact.type.includes('tsx') || artifact.type.includes('+ts');
}