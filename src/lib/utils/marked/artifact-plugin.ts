/**
 * Marked extension for handling XML-based artifacts in OpenWebUI
 *
 * This extension processes our XML artifact specification:
 * <artifact identifier="id" type="text/html" title="title">
 *   <description>...</description>
 *   <dependencies>...</dependencies>
 *   <files>
 *     <file path="index.html"><![CDATA[...]]></file>
 *   </files>
 * </artifact>
 *
 * Inspired by LibreChat's plugin approach but adapted for marked and our XML format
 */

// Helper function to find matching closing tag
function findMatchingClosingTag(src: string, openTag: string, closeTag: string): number {
	let depth = 1;
	let index = openTag.length;
	while (depth > 0 && index < src.length) {
		if (src.startsWith(openTag, index)) {
			depth++;
		} else if (src.startsWith(closeTag, index)) {
			depth--;
		}
		if (depth > 0) {
			index++;
		}
	}
	return depth === 0 ? index + closeTag.length : -1;
}

// Function to parse attributes from artifact opening tag
function parseArtifactAttributes(tag: string): { [key: string]: string } {
	const attributes: { [key: string]: string } = {};
	const attrRegex = /(\w+)=["']([^"']+)["']/g;
	let match;
	while ((match = attrRegex.exec(tag)) !== null) {
		attributes[match[1]] = match[2];
	}
	return attributes;
}

function artifactTokenizer(src: string) {
	// Look for artifact opening tag
	const artifactRegex = /^<artifact(\s+[^>]*)?>/;
	const artifactMatch = artifactRegex.exec(src);

	if (artifactMatch) {
		const endIndex = findMatchingClosingTag(src, '<artifact', '</artifact>');
		if (endIndex === -1) return;

		const fullMatch = src.slice(0, endIndex);
		const artifactTag = artifactMatch[0];
		const attributes = parseArtifactAttributes(artifactTag);

		// Extract the full XML content
		const xmlContent = fullMatch;

		return {
			type: 'artifact',
			raw: fullMatch,
			identifier: attributes.identifier || `artifact-${Date.now()}`,
			artifactType: attributes.type || 'text/html',
			title: attributes.title || 'Untitled',
			rawXml: xmlContent,
			attributes: attributes
		};
	}
}

function artifactStart(src: string) {
	return src.match(/^<artifact/) ? 0 : -1;
}

function artifactRenderer(token: any) {
	// Return a custom HTML element that will be handled by our Svelte component
	return `<artifact-component
		identifier="${token.identifier}"
		type="${token.artifactType}"
		title="${token.title}"
		data-raw-xml="${encodeURIComponent(token.rawXml)}"
	></artifact-component>`;
}

// Extension wrapper function
function artifactExtension() {
	return {
		name: 'artifact',
		level: 'block',
		start: artifactStart,
		tokenizer: artifactTokenizer,
		renderer: artifactRenderer
	};
}

/**
 * Main extension export function
 */
export default function (options = {}) {
	return {
		extensions: [artifactExtension(options)]
	};
}