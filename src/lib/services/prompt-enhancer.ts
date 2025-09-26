/**
 * Prompt Enhancer Service
 * Modifies user prompts to ensure PAS 3.0 compliant LLM responses
 */

export interface PromptEnhancementRequest {
	originalPrompt: string;
	userId?: string;
	sessionId?: string;
}

export interface PromptEnhancementResponse {
	enhancedPrompt: string;
	originalPrompt: string;
	enhancementApplied: boolean;
	template: string;
	timestamp: Date;
}

export interface PromptEnhancerConfig {
	enableEnhancement: boolean;
	templateVersion: string;
	maxPromptLength: number;
}

/**
 * PAS 3.0 XML Schema compliance template
 */
const PAS_3_0_TEMPLATE = `
IMPORTANT: When creating code components, wrap them in PAS 3.0 XML format:

<artifact identifier="unique-id" type="text/code" language="javascript" framework="react" title="Component Title">
<![CDATA[
// Your component code here
]]>
</artifact>

Required attributes:
- identifier: unique string identifier
- type: "text/code" for code artifacts
- language: programming language (javascript, typescript, html, css, etc.)
- framework: framework used (react, vue, svelte, vanilla, etc.)
- title: descriptive title for the component

Supported artifact types:
- React components (framework="react", language="javascript" or "typescript")
- Vue components (framework="vue", language="javascript")
- Svelte components (framework="svelte", language="javascript")
- HTML/CSS (framework="vanilla", language="html")
- SVG graphics (type="image/svg+xml")

Example for React:
<artifact identifier="login-form" type="text/code" language="typescript" framework="react" title="Login Form Component">
<![CDATA[
import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="login-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
]]>
</artifact>

`;

export interface IPromptEnhancer {
	/**
	 * Enhance a user prompt to ensure PAS 3.0 XML compliance
	 */
	enhancePrompt(request: PromptEnhancementRequest): Promise<PromptEnhancementResponse>;

	/**
	 * Update enhancement configuration
	 */
	updateConfig(config: Partial<PromptEnhancerConfig>): void;

	/**
	 * Get current configuration
	 */
	getConfig(): PromptEnhancerConfig;
}

export class PromptEnhancerService implements IPromptEnhancer {
	private config: PromptEnhancerConfig;

	constructor(config: Partial<PromptEnhancerConfig> = {}) {
		this.config = {
			enableEnhancement: true,
			templateVersion: '3.0',
			maxPromptLength: 10000,
			...config
		};
	}

	async enhancePrompt(request: PromptEnhancementRequest): Promise<PromptEnhancementResponse> {
		const { originalPrompt } = request;
		const timestamp = new Date();

		// Check if enhancement is enabled
		if (!this.config.enableEnhancement) {
			return {
				enhancedPrompt: originalPrompt,
				originalPrompt,
				enhancementApplied: false,
				template: '',
				timestamp
			};
		}

		// Check prompt length limits
		if (originalPrompt.length > this.config.maxPromptLength) {
			console.warn(`Prompt exceeds max length (${this.config.maxPromptLength}), skipping enhancement`);
			return {
				enhancedPrompt: originalPrompt,
				originalPrompt,
				enhancementApplied: false,
				template: '',
				timestamp
			};
		}

		// Check if prompt already contains PAS 3.0 artifacts
		if (this.containsArtifacts(originalPrompt)) {
			return {
				enhancedPrompt: originalPrompt,
				originalPrompt,
				enhancementApplied: false,
				template: 'Already contains artifacts',
				timestamp
			};
		}

		// Generate enhanced prompt
		const enhancedPrompt = this.buildEnhancedPrompt(originalPrompt);

		return {
			enhancedPrompt,
			originalPrompt,
			enhancementApplied: true,
			template: PAS_3_0_TEMPLATE.trim(),
			timestamp
		};
	}

	private containsArtifacts(prompt: string): boolean {
		// Check for existing PAS 3.0 artifact tags
		const artifactPattern = /<artifact\s+[^>]*>/i;
		return artifactPattern.test(prompt);
	}

	private buildEnhancedPrompt(originalPrompt: string): string {
		// Determine if this is likely a code generation request
		const codeKeywords = [
			'component', 'function', 'class', 'create', 'build', 'make',
			'react', 'vue', 'svelte', 'html', 'javascript', 'typescript',
			'jsx', 'tsx', 'css', 'styled'
		];

		const lowerPrompt = originalPrompt.toLowerCase();
		const hasCodeKeywords = codeKeywords.some(keyword => lowerPrompt.includes(keyword));

		if (!hasCodeKeywords) {
			// For non-code requests, just add a light reminder
			return `${originalPrompt}

If you create any code components, please wrap them in PAS 3.0 XML format with proper artifact tags.`;
		}

		// For code requests, add comprehensive instructions
		return `${originalPrompt}

${PAS_3_0_TEMPLATE}

Please create the requested component following the PAS 3.0 format above. Make sure to:
1. Use a unique identifier for the artifact
2. Set the correct language and framework attributes
3. Wrap all code in CDATA sections
4. Provide a descriptive title
5. Make the component interactive and fully functional`;
	}

	updateConfig(config: Partial<PromptEnhancerConfig>): void {
		this.config = { ...this.config, ...config };
	}

	getConfig(): PromptEnhancerConfig {
		return { ...this.config };
	}
}

// Default singleton instance
export const promptEnhancer = new PromptEnhancerService();