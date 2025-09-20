/**
 * Artifact Security Module
 * 
 * This module implements security measures for artifact code execution,
 * network access controls, and content sanitization according to the
 * security requirements outlined in docs/PAS_3.md
 */

import type { ParsedArtifact, ArtifactPermissions } from './artifact-parser';

export interface SecurityConfig {
allowNetworkAccess: boolean;
allowCodeExecution: boolean;
allowStorageAccess: boolean;
trustedDomains: string[];
maxArtifactSize: number; // in bytes
sandboxMode: 'strict' | 'moderate' | 'permissive';
}

export interface SecurityViolation {
type: 'network' | 'execution' | 'storage' | 'size' | 'content';
severity: 'low' | 'medium' | 'high' | 'critical';
message: string;
details?: any;
}

export interface SecurityCheck {
allowed: boolean;
violations: SecurityViolation[];
sanitizedArtifact?: ParsedArtifact;
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: SecurityConfig = {
allowNetworkAccess: false,
allowCodeExecution: true, // Sandboxed execution only
allowStorageAccess: false,
trustedDomains: ['localhost', '127.0.0.1', 'codesandbox.io'],
maxArtifactSize: 1024 * 1024, // 1MB
sandboxMode: 'strict'
};

/**
 * Security manager class
 */
class ArtifactSecurityManager {
private config: SecurityConfig;

constructor(config?: Partial<SecurityConfig>) {
this.config = { ...DEFAULT_CONFIG, ...config };
}

/**
 * Perform comprehensive security check on an artifact
 */
checkArtifactSecurity(artifact: ParsedArtifact): SecurityCheck {
const violations: SecurityViolation[] = [];
let sanitizedArtifact: ParsedArtifact | undefined;

try {
// Size check
const sizeViolation = this.checkArtifactSize(artifact);
if (sizeViolation) violations.push(sizeViolation);

// Content security check
const contentViolations = this.checkContentSecurity(artifact);
violations.push(...contentViolations);

// Permission check
const permissionViolations = this.checkPermissions(artifact);
violations.push(...permissionViolations);

// If there are critical violations, deny access
const hasCriticalViolations = violations.some(v => v.severity === 'critical');

if (hasCriticalViolations) {
return {
allowed: false,
violations
};
}

// Sanitize artifact if there are medium/low violations
const hasViolations = violations.length > 0;
if (hasViolations) {
sanitizedArtifact = this.sanitizeArtifact(artifact, violations);
}

return {
allowed: true,
violations,
sanitizedArtifact
};

} catch (error) {
violations.push({
type: 'content',
severity: 'critical',
message: 'Failed to perform security check',
details: { error: error.message }
});

return {
allowed: false,
violations
};
}
}

/**
 * Check artifact size constraints
 */
private checkArtifactSize(artifact: ParsedArtifact): SecurityViolation | null {
const totalSize = artifact.files.reduce(
(sum, file) => sum + (file.content?.length || 0), 
0
);

if (totalSize > this.config.maxArtifactSize) {
return {
type: 'size',
severity: 'high',
message: `Artifact size (${totalSize} bytes) exceeds maximum allowed size (${this.config.maxArtifactSize} bytes)`,
details: { size: totalSize, maxSize: this.config.maxArtifactSize }
};
}

return null;
}

/**
 * Check content security (dangerous patterns, scripts, etc.)
 */
private checkContentSecurity(artifact: ParsedArtifact): SecurityViolation[] {
const violations: SecurityViolation[] = [];

// Dangerous patterns to check for
const dangerousPatterns = {
// Script injection patterns
scriptInjection: [
/<script[^>]*>[\s\S]*?<\/script>/gi,
/javascript:/gi,
/vbscript:/gi,
/data:text\/html/gi,
/on\w+\s*=\s*["'][^"']*["']/gi // Event handlers
],

// Network access patterns
networkAccess: [
/fetch\s*\(/gi,
/XMLHttpRequest/gi,
/axios\./gi,
/\$\.ajax/gi,
/\$\.get/gi,
/\$\.post/gi,
/WebSocket/gi,
/EventSource/gi
],

// File system access (mainly for Node.js contexts)
fileSystemAccess: [
/require\s*\(\s*['"]fs['"]/gi,
/import.*from\s*['"]fs['"]/gi,
/process\.env/gi,
/require\s*\(\s*['"]child_process['"]/gi
],

// Dangerous eval patterns
dangerousEval: [
/eval\s*\(/gi,
/Function\s*\(/gi,
/setTimeout\s*\(\s*['"`]/gi,
/setInterval\s*\(\s*['"`]/gi
]
};

for (const file of artifact.files) {
if (!file.content) continue;

// Check each pattern category
for (const [category, patterns] of Object.entries(dangerousPatterns)) {
for (const pattern of patterns) {
if (pattern.test(file.content)) {
const severity = this.getViolationSeverity(category);

violations.push({
type: 'content',
severity,
message: `Potentially dangerous ${category} detected in ${file.path}`,
details: { 
file: file.path, 
category, 
pattern: pattern.source 
}
});
}
}
}
}

return violations;
}

/**
 * Check artifact permissions against security policy
 */
private checkPermissions(artifact: ParsedArtifact): SecurityViolation[] {
const violations: SecurityViolation[] = [];
const permissions = artifact.permissions;

if (!permissions) return violations;

// Check network access
if (permissions.network && !this.config.allowNetworkAccess) {
violations.push({
type: 'network',
severity: 'high',
message: 'Artifact requests network access but it is not allowed',
details: { requested: permissions.network, allowed: this.config.allowNetworkAccess }
});
}

// Check storage access
if (permissions.storage && !this.config.allowStorageAccess) {
violations.push({
type: 'storage',
severity: 'medium',
message: 'Artifact requests storage access but it is not allowed',
details: { requested: permissions.storage, allowed: this.config.allowStorageAccess }
});
}

// Check execution permissions
if (permissions.execution && !this.config.allowCodeExecution) {
violations.push({
type: 'execution',
severity: 'critical',
message: 'Artifact requests code execution but it is not allowed',
details: { requested: permissions.execution, allowed: this.config.allowCodeExecution }
});
}

return violations;
}

/**
 * Sanitize artifact by removing/modifying dangerous content
 */
private sanitizeArtifact(artifact: ParsedArtifact, violations: SecurityViolation[]): ParsedArtifact {
const sanitized = { ...artifact };
sanitized.files = artifact.files.map(file => ({ ...file }));

// Apply sanitization based on violations
for (const violation of violations) {
if (violation.severity === 'critical') continue; // Skip critical ones

if (violation.type === 'content' && violation.details?.file) {
const fileIndex = sanitized.files.findIndex(f => f.path === violation.details.file);

if (fileIndex >= 0) {
// Apply content sanitization
sanitized.files[fileIndex].content = this.sanitizeFileContent(
sanitized.files[fileIndex].content,
violation.details.category
);
}
}
}

return sanitized;
}

/**
 * Sanitize file content based on violation category
 */
private sanitizeFileContent(content: string, category: string): string {
switch (category) {
case 'scriptInjection':
// Remove script tags and event handlers
return content
.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '<!-- Script removed for security -->')
.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

case 'networkAccess':
// Comment out network access code
return content
.replace(/(fetch\s*\()/gi, '// $1')
.replace(/(XMLHttpRequest)/gi, '// $1')
.replace(/(axios\.)/gi, '// $1');

case 'dangerousEval':
// Comment out eval patterns
return content
.replace(/(eval\s*\()/gi, '// $1')
.replace(/(Function\s*\()/gi, '// $1');

default:
return content;
}
}

/**
 * Get violation severity based on category
 */
private getViolationSeverity(category: string): SecurityViolation['severity'] {
const severityMap: Record<string, SecurityViolation['severity']> = {
scriptInjection: 'critical',
dangerousEval: 'critical',
networkAccess: 'high',
fileSystemAccess: 'high',
};

return severityMap[category] || 'medium';
}

/**
 * Get safe sandbox attributes for iframe
 */
getSandboxAttributes(): string {
const attributes = [];

if (this.config.allowCodeExecution) {
attributes.push('allow-scripts');
}

// Always allow same origin for proper rendering
attributes.push('allow-same-origin');

// Allow forms for interactive components
attributes.push('allow-forms');

// Conditionally allow other features based on sandbox mode
switch (this.config.sandboxMode) {
case 'permissive':
attributes.push('allow-popups', 'allow-modals', 'allow-downloads');
break;
case 'moderate':
attributes.push('allow-popups');
break;
case 'strict':
default:
// Minimal permissions
break;
}

return attributes.join(' ');
}

/**
 * Update security configuration
 */
updateConfig(newConfig: Partial<SecurityConfig>): void {
this.config = { ...this.config, ...newConfig };
}

/**
 * Get current configuration
 */
getConfig(): SecurityConfig {
return { ...this.config };
}
}

// Create singleton instance
export const artifactSecurity = new ArtifactSecurityManager();

/**
 * Convenience function for security checks
 */
export function checkArtifactSecurity(artifact: ParsedArtifact): SecurityCheck {
return artifactSecurity.checkArtifactSecurity(artifact);
}

/**
 * Initialize security with custom config
 */
export function initializeArtifactSecurity(config?: Partial<SecurityConfig>) {
if (config) {
artifactSecurity.updateConfig(config);
}

console.log('Artifact security initialized with config:', artifactSecurity.getConfig());
}
