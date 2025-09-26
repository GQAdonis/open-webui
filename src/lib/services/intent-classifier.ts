/**
 * Intent Classifier Service
 * Analyzes user prompts to determine when artifact enhancement is needed
 */

import {
	type IntentClassificationRequest,
	type IntentClassificationResponse,
	type IntentClassifierConfig,
	type IIntentClassifier,
	DEFAULT_INTENT_CONFIG,
	IntentClassificationTimeoutError
} from '../types/intent-classifier';

export class IntentClassifierService implements IIntentClassifier {
	private config: IntentClassifierConfig;

	constructor(config: Partial<IntentClassifierConfig> = {}) {
		this.config = { ...DEFAULT_INTENT_CONFIG, ...config };
	}

	async classifyIntent(request: IntentClassificationRequest): Promise<IntentClassificationResponse> {
		const startTime = Date.now();

		// Create timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new IntentClassificationTimeoutError(this.config.timeoutMs));
			}, this.config.timeoutMs);
		});

		// Create classification promise
		const classificationPromise = this.performClassification(request, startTime);

		try {
			// Race between classification and timeout
			return await Promise.race([classificationPromise, timeoutPromise]);
		} catch (error) {
			if (error instanceof IntentClassificationTimeoutError) {
				throw error;
			}
			// Return low confidence result for other errors
			return {
				shouldEnhance: false,
				confidence: 0,
				detectedKeywords: [],
				processingTimeMs: Date.now() - startTime,
				reasoning: `Classification failed: ${error.message}`
			};
		}
	}

	private async performClassification(
		request: IntentClassificationRequest,
		startTime: number
	): Promise<IntentClassificationResponse> {
		const { prompt } = request;

		// Convert prompt to lowercase for case-insensitive matching
		const lowerPrompt = prompt.toLowerCase();

		// Find matching keywords
		const detectedKeywords: string[] = [];
		for (const keyword of this.config.triggerKeywords) {
			if (lowerPrompt.includes(keyword.toLowerCase())) {
				detectedKeywords.push(keyword);
			}
		}

		// Calculate confidence based on keyword matches and context
		let confidence = 0;

		if (detectedKeywords.length > 0) {
			// Base confidence from number of keyword matches
			confidence = Math.min(detectedKeywords.length * 0.3, 1.0);

			// Boost confidence for explicit artifact requests
			if (detectedKeywords.includes('artifact') || detectedKeywords.includes('preview')) {
				confidence = Math.min(confidence + 0.4, 1.0);
			}

			// Boost confidence for component-related terms
			if (detectedKeywords.includes('component') || detectedKeywords.includes('render')) {
				confidence = Math.min(confidence + 0.2, 1.0);
			}

			// Additional context analysis
			const codePatterns = [
				'react', 'vue', 'svelte', 'html', 'jsx', 'tsx',
				'function', 'const', 'class', 'export', 'import',
				'<', '>', 'component', 'element'
			];

			const codeMatches = codePatterns.filter(pattern =>
				lowerPrompt.includes(pattern.toLowerCase())
			).length;

			if (codeMatches > 2) {
				confidence = Math.min(confidence + 0.2, 1.0);
			}
		}

		const shouldEnhance = confidence >= this.config.confidenceThreshold;
		const processingTimeMs = Date.now() - startTime;

		return {
			shouldEnhance,
			confidence,
			detectedKeywords,
			processingTimeMs,
			reasoning: shouldEnhance
				? `Keywords detected: ${detectedKeywords.join(', ')}. Confidence: ${confidence.toFixed(2)}`
				: `No significant keywords detected. Confidence: ${confidence.toFixed(2)}`
		};
	}

	updateConfig(config: Partial<IntentClassifierConfig>): void {
		this.config = { ...this.config, ...config };
	}

	getConfig(): IntentClassifierConfig {
		return { ...this.config };
	}
}

// Default singleton instance
export const intentClassifier = new IntentClassifierService();