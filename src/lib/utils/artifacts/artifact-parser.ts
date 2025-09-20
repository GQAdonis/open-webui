/**
 * PAS 3.0 Artifact Parser
 * 
 * This module implements parsing and validation of PAS 3.0 compliant artifacts
 * from LLM responses according to the specification in docs/PAS_3.md
 * 
 * NOTE: TypeScript is the default for all code artifacts unless explicitly requested otherwise.
 */

export interface ArtifactFile {
path: string;
content: string;
language?: string;
}

export interface ArtifactDependency {
name: string;
version: string;
source?: string;
}

export interface ArtifactAction {
type: string;
label: string;
description?: string;
handler?: string;
}

export interface ArtifactPermissions {
network?: boolean;
storage?: boolean;
execution?: boolean;
scope?: string[];
}

export interface ParsedArtifact {
identifier: string;
type: string;
title: string;
description?: string;
version?: string;
author?: string;
license?: string;
dependencies: ArtifactDependency[];
files: ArtifactFile[];
actions?: ArtifactAction[];
permissions?: ArtifactPermissions;
metadata?: Record<string, any>;
config?: Record<string, any>;
raw: string;
}

/**
 * Extract all PAS 3.0 artifacts from response text
 */
export function extractArtifacts(responseText: string): ParsedArtifact[] {
const artifacts: ParsedArtifact[] = [];

// Match artifact XML blocks
const artifactRegex = /<artifact[^>]*>[\s\S]*?<\/artifact>/gi;
const matches = responseText.match(artifactRegex);

if (!matches) return artifacts;

for (const match of matches) {
try {
const parsed = parseArtifact(match);
if (parsed) {
artifacts.push(parsed);
}
} catch (error) {
console.warn('Failed to parse artifact:', error);
}
}

return artifacts;
}

/**
 * Parse a single PAS 3.0 artifact XML
 */
export function parseArtifact(artifactXml: string): ParsedArtifact | null {
try {
// Create a DOM parser
const parser = new DOMParser();
const doc = parser.parseFromString(artifactXml, 'text/xml');

const artifactElement = doc.querySelector('artifact');
if (!artifactElement) return null;

// Extract required attributes
const identifier = artifactElement.getAttribute('identifier');
const type = artifactElement.getAttribute('type');
const title = artifactElement.getAttribute('title');

if (!identifier || !type || !title) {
console.warn('Missing required artifact attributes:', { identifier, type, title });
return null;
}

// Extract optional attributes
const version = artifactElement.getAttribute('version');
const author = artifactElement.getAttribute('author');
const license = artifactElement.getAttribute('license');

// Extract description
const descriptionElement = artifactElement.querySelector('description');
const description = descriptionElement?.textContent?.trim();

// Extract dependencies
const dependencies = extractDependencies(artifactElement);

// Extract files
const files = extractFiles(artifactElement);
if (files.length === 0) {
console.warn('No files found in artifact');
return null;
}

// Extract actions
const actions = extractActions(artifactElement);

// Extract permissions
const permissions = extractPermissions(artifactElement);

// Extract metadata
const metadata = extractMetadata(artifactElement);

// Extract config
const config = extractConfig(artifactElement);

return {
identifier,
type,
title,
description,
version,
author,
license,
dependencies,
files,
actions,
permissions,
metadata,
config,
raw: artifactXml
};
} catch (error) {
console.error('Error parsing artifact XML:', error);
return null;
}
}

/**
 * Extract dependencies from artifact XML
 */
function extractDependencies(artifactElement: Element): ArtifactDependency[] {
const dependencies: ArtifactDependency[] = [];
const depsElement = artifactElement.querySelector('dependencies');

if (!depsElement) return dependencies;

const depElements = depsElement.querySelectorAll('dependency');
for (const depElement of depElements) {
const name = depElement.getAttribute('name');
const version = depElement.getAttribute('version');
const source = depElement.getAttribute('source');

if (name && version) {
dependencies.push({
name,
version,
source: source || undefined
});
}
}

return dependencies;
}

/**
 * Extract files from artifact XML
 */
function extractFiles(artifactElement: Element): ArtifactFile[] {
const files: ArtifactFile[] = [];
const filesElement = artifactElement.querySelector('files');

if (!filesElement) return files;

const fileElements = filesElement.querySelectorAll('file');
for (const fileElement of fileElements) {
const path = fileElement.getAttribute('path');
const language = fileElement.getAttribute('language');
const content = fileElement.textContent?.trim();

if (path && content) {
files.push({
path,
content,
language: language || undefined
});
}
}

return files;
}

/**
 * Extract actions from artifact XML
 */
function extractActions(artifactElement: Element): ArtifactAction[] {
const actions: ArtifactAction[] = [];
const actionsElement = artifactElement.querySelector('actions');

if (!actionsElement) return actions;

const actionElements = actionsElement.querySelectorAll('action');
for (const actionElement of actionElements) {
const type = actionElement.getAttribute('type');
const label = actionElement.getAttribute('label');
const description = actionElement.getAttribute('description');
const handler = actionElement.getAttribute('handler');

if (type && label) {
actions.push({
type,
label,
description: description || undefined,
handler: handler || undefined
});
}
}

return actions;
}

/**
 * Extract permissions from artifact XML
 */
function extractPermissions(artifactElement: Element): ArtifactPermissions | undefined {
const permissionsElement = artifactElement.querySelector('permissions');

if (!permissionsElement) return undefined;

const permissions: ArtifactPermissions = {};

// Extract boolean permissions
const network = permissionsElement.getAttribute('network');
if (network !== null) {
permissions.network = network === 'true';
}

const storage = permissionsElement.getAttribute('storage');
if (storage !== null) {
permissions.storage = storage === 'true';
}

const execution = permissionsElement.getAttribute('execution');
if (execution !== null) {
permissions.execution = execution === 'true';
}

// Extract scope array
const scope = permissionsElement.getAttribute('scope');
if (scope) {
permissions.scope = scope.split(',').map(s => s.trim());
}

return Object.keys(permissions).length > 0 ? permissions : undefined;
}

/**
 * Extract metadata from artifact XML
 */
function extractMetadata(artifactElement: Element): Record<string, any> | undefined {
const metadataElement = artifactElement.querySelector('metadata');

if (!metadataElement) return undefined;

const metadata: Record<string, any> = {};

// Extract all child elements as metadata
for (const child of metadataElement.children) {
const key = child.tagName.toLowerCase();
const value = child.textContent?.trim();

if (value) {
// Try to parse as JSON for complex values
try {
metadata[key] = JSON.parse(value);
} catch {
metadata[key] = value;
}
}
}

return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Extract config from artifact XML
 */
function extractConfig(artifactElement: Element): Record<string, any> | undefined {
const configElement = artifactElement.querySelector('config');

if (!configElement) return undefined;

const config: Record<string, any> = {};

// Extract all attributes as config
for (const attr of configElement.attributes) {
const key = attr.name;
const value = attr.value;

// Try to parse as JSON for complex values
try {
config[key] = JSON.parse(value);
} catch {
config[key] = value;
}
}

// Extract child elements as config
for (const child of configElement.children) {
const key = child.tagName.toLowerCase();
const value = child.textContent?.trim();

if (value) {
// Try to parse as JSON for complex values
try {
config[key] = JSON.parse(value);
} catch {
config[key] = value;
}
}
}

return Object.keys(config).length > 0 ? config : undefined;
}

/**
 * Validate artifact against PAS 3.0 specification
 */
export function validateArtifact(artifact: ParsedArtifact): { valid: boolean; errors: string[] } {
const errors: string[] = [];

// Check required fields
if (!artifact.identifier) {
errors.push('Missing required identifier');
}

if (!artifact.type) {
errors.push('Missing required type');
}

if (!artifact.title) {
errors.push('Missing required title');
}

if (!artifact.files || artifact.files.length === 0) {
errors.push('At least one file is required');
}

// Validate identifier format
if (artifact.identifier && !/^[a-zA-Z0-9-_]+$/.test(artifact.identifier)) {
errors.push('Invalid identifier format (use alphanumeric, hyphens, underscores only)');
}

// Validate type format with TypeScript-first approach
const validTypes = [
'text/html',
'text/markdown',
'text/plain',
'application/json',
'application/javascript',
'application/typescript',
'application/vnd.react+jsx',
'application/vnd.react+tsx',  // TypeScript React
'application/vnd.svelte',
'application/vnd.svelte+ts',  // TypeScript Svelte
'application/vnd.vue',
'application/vnd.mermaid',
'image/svg+xml'
];

if (artifact.type && !validTypes.includes(artifact.type) && !artifact.type.startsWith('application/x-')) {
errors.push(`Invalid artifact type: ${artifact.type}`);
}

// Validate files
for (const file of artifact.files) {
if (!file.path) {
errors.push('File missing required path');
}

if (!file.content) {
errors.push(`File ${file.path} missing content`);
}
}

// Validate dependencies
for (const dep of artifact.dependencies) {
if (!dep.name) {
errors.push('Dependency missing required name');
}

if (!dep.version) {
errors.push(`Dependency ${dep.name} missing required version`);
}
}

return {
valid: errors.length === 0,
errors
};
}

/**
 * Get the primary file content from an artifact
 */
export function getPrimaryFile(artifact: ParsedArtifact): ArtifactFile | null {
if (artifact.files.length === 0) return null;

// Look for common primary file names (TypeScript-first)
const primaryFiles = [
'index.html', 
'App.tsx', 'App.jsx',  // React (TSX first) 
'Component.svelte',     // Svelte
'main.ts', 'main.js',   // TypeScript first
'index.ts', 'index.js'  // TypeScript first
];

for (const fileName of primaryFiles) {
const file = artifact.files.find(f => f.path.toLowerCase().includes(fileName.toLowerCase()));
if (file) return file;
}

// Return first file if no primary file found
return artifact.files[0];
}

/**
 * Get language from artifact type (TypeScript-first)
 */
export function getLanguageFromType(type: string): string {
const typeMap: Record<string, string> = {
'text/html': 'html',
'text/markdown': 'markdown',
'text/plain': 'text',
'application/json': 'json',
'application/javascript': 'javascript',
'application/typescript': 'typescript',
'application/vnd.react+jsx': 'jsx',
'application/vnd.react+tsx': 'tsx',
'application/vnd.svelte': 'svelte',
'application/vnd.svelte+ts': 'svelte',  // Svelte with TypeScript
'application/vnd.vue': 'vue',
'application/vnd.mermaid': 'mermaid',
'image/svg+xml': 'xml'
};

return typeMap[type] || 'typescript';  // Default to TypeScript instead of 'text'
}

/**
 * Check if artifact uses TypeScript
 */
export function isTypeScriptArtifact(artifact: ParsedArtifact): boolean {
const typeScriptTypes = [
'application/typescript',
'application/vnd.react+tsx',
'application/vnd.svelte+ts'
];

if (typeScriptTypes.includes(artifact.type)) return true;

// Check file extensions
const primaryFile = getPrimaryFile(artifact);
if (primaryFile?.path) {
const extension = primaryFile.path.split('.').pop()?.toLowerCase();
return ['ts', 'tsx'].includes(extension || '');
}

return false;
}

/**
 * Get appropriate Sandpack template based on artifact type
 */
export function getSandpackTemplate(artifact: ParsedArtifact): string {
switch (artifact.type) {
case 'application/vnd.react+jsx':
return 'react';
case 'application/vnd.react+tsx':
return 'react-ts';
case 'application/vnd.svelte':
return 'svelte';
case 'application/vnd.svelte+ts':
return 'svelte';  // Sandpack will handle TS in Svelte
case 'application/vnd.vue':
return 'vue';
case 'application/typescript':
return 'node';  // For standalone TypeScript
case 'application/javascript':
return 'vanilla';
case 'text/html':
return 'static';
default:
return isTypeScriptArtifact(artifact) ? 'react-ts' : 'react';
}
}

/**
 * Get appropriate file structure for Sandpack based on artifact
 */
export function getSandpackFiles(artifact: ParsedArtifact): Record<string, string> {
const files: Record<string, string> = {};

for (const file of artifact.files) {
files[`/${file.path}`] = file.content;
}

// Add package.json if not present and we have dependencies
if (artifact.dependencies.length > 0 && !files['/package.json']) {
const dependencies: Record<string, string> = {};
for (const dep of artifact.dependencies) {
dependencies[dep.name] = dep.version;
}

files['/package.json'] = JSON.stringify({
name: artifact.identifier,
version: artifact.version || '1.0.0',
dependencies
}, null, 2);
}

return files;
}
