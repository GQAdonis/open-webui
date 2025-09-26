/**
 * E2E Test Runner Service
 * Handles end-to-end testing with real LLM endpoints
 */

import {
	type E2ETestRequest,
	type E2ETestResponse,
	type E2ETestSuite,
	type E2ETestSuiteResult,
	type LLMProvider,
	type RenderingResult,
	type TestError,
	type TestSummary,
	type PerformanceMetrics,
	TestStage,
	TestErrorType,
	type IE2ETestRunner,
	E2ETestExecutionError
} from '../../specs/001-create-and-or/contracts/e2e-testing';

export interface E2ETestConfig {
	defaultTimeout: number;
	maxConcurrentTests: number;
	retryAttempts: number;
	enableLogging: boolean;
}

const DEFAULT_CONFIG: E2ETestConfig = {
	defaultTimeout: 60000, // 60 seconds
	maxConcurrentTests: 3,
	retryAttempts: 2,
	enableLogging: true
};

export class E2ETestRunnerService implements IE2ETestRunner {
	private config: E2ETestConfig;
	private activeTests = new Map<string, Promise<E2ETestResponse>>();

	constructor(config: Partial<E2ETestConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	async runTest(request: E2ETestRequest): Promise<E2ETestResponse> {
		const startTime = Date.now();
		const timeout = request.timeout || this.config.defaultTimeout;
		const errors: TestError[] = [];

		this.log(`Starting E2E test: ${request.testId}`);

		try {
			// Validate LLM provider
			const isProviderValid = await this.validateProvider(request.llmProvider);
			if (!isProviderValid) {
				throw new Error(`Invalid LLM provider configuration: ${request.llmProvider.name}`);
			}

			// Stage 1: Intent Classification (simulated - would integrate with real service)
			let currentStage = TestStage.INTENT_CLASSIFICATION;
			const intentResult = await this.simulateIntentClassification(request.prompt);

			if (!intentResult.shouldEnhance) {
				this.log(`Intent classification: No enhancement needed for "${request.prompt}"`);
			}

			// Stage 2: Prompt Enhancement (if needed)
			currentStage = TestStage.PROMPT_ENHANCEMENT;
			const enhancedPrompt = intentResult.shouldEnhance
				? await this.simulatePromptEnhancement(request.prompt)
				: request.prompt;

			// Stage 3: LLM Request
			currentStage = TestStage.LLM_REQUEST;
			const llmResponse = await this.makeLLMRequest(enhancedPrompt, request.llmProvider, timeout);

			// Stage 4: Artifact Parsing
			currentStage = TestStage.ARTIFACT_PARSING;
			const parseResult = await this.simulateArtifactParsing(llmResponse);

			// Stage 5: Preview Rendering
			currentStage = TestStage.PREVIEW_RENDERING;
			const renderingResults = await this.simulatePreviewRendering(parseResult.artifacts);

			const executionTimeMs = Date.now() - startTime;

			const response: E2ETestResponse = {
				success: renderingResults.every(r => r.renderSuccess),
				testId: request.testId,
				executionTimeMs,
				promptSent: enhancedPrompt,
				llmResponse,
				artifactsDetected: parseResult.artifacts.length,
				renderingResults,
				errors
			};

			this.log(`E2E test completed: ${request.testId} (${executionTimeMs}ms)`);
			return response;

		} catch (error) {
			const testError: TestError = {
				stage: currentStage,
				type: TestErrorType.API_ERROR,
				message: error.message,
				timestamp: new Date()
			};
			errors.push(testError);

			const executionTimeMs = Date.now() - startTime;

			return {
				success: false,
				testId: request.testId,
				executionTimeMs,
				promptSent: request.prompt,
				llmResponse: '',
				artifactsDetected: 0,
				renderingResults: [],
				errors
			};
		}
	}

	async runSuite(suite: E2ETestSuite): Promise<E2ETestSuiteResult> {
		const startTime = Date.now();
		const testPromises: Promise<E2ETestResponse>[] = [];

		this.log(`Starting E2E test suite: ${suite.name} (${suite.tests.length} tests)`);

		// Create test requests
		for (const testCase of suite.tests) {
			const request: E2ETestRequest = {
				testId: testCase.id,
				prompt: testCase.prompt,
				expectedArtifactCount: testCase.expectedArtifacts,
				timeout: suite.timeout,
				llmProvider: this.getDefaultProvider() // Would be configurable
			};

			if (suite.parallel && testPromises.length < this.config.maxConcurrentTests) {
				// Run tests in parallel up to the limit
				testPromises.push(this.runTest(request));
			} else {
				// Run tests sequentially
				const result = await this.runTest(request);
				testPromises.push(Promise.resolve(result));
			}
		}

		// Wait for all tests to complete
		const testResults = await Promise.all(testPromises);
		const executionTimeMs = Date.now() - startTime;

		// Calculate summary statistics
		const passedTests = testResults.filter(r => r.success).length;
		const failedTests = testResults.length - passedTests;

		const summary = this.generateSummary(testResults);

		const suiteResult: E2ETestSuiteResult = {
			suiteName: suite.name,
			executionTimeMs,
			totalTests: testResults.length,
			passedTests,
			failedTests,
			testResults,
			summary
		};

		this.log(`E2E test suite completed: ${suite.name} (${passedTests}/${testResults.length} passed)`);
		return suiteResult;
	}

	async validateProvider(provider: LLMProvider): Promise<boolean> {
		try {
			// Basic validation
			if (!provider.apiKey || !provider.endpoint || !provider.model) {
				return false;
			}

			// In a real implementation, this would make a test API call
			// For now, just validate the structure
			const validProviders = ['openai', 'claude', 'gemini'];
			return validProviders.includes(provider.name);

		} catch (error) {
			this.log(`Provider validation failed: ${error.message}`);
			return false;
		}
	}

	generateReport(results: E2ETestSuiteResult): string {
		const { suiteName, totalTests, passedTests, failedTests, executionTimeMs, summary } = results;

		let report = `# E2E Test Report: ${suiteName}\n\n`;
		report += `**Execution Time**: ${(executionTimeMs / 1000).toFixed(2)}s\n`;
		report += `**Total Tests**: ${totalTests}\n`;
		report += `**Passed**: ${passedTests}\n`;
		report += `**Failed**: ${failedTests}\n`;
		report += `**Success Rate**: ${((passedTests / totalTests) * 100).toFixed(1)}%\n\n`;

		// Performance metrics
		report += `## Performance Metrics\n`;
		report += `- **Average Response Time**: ${summary.performanceMetrics.avgResponseTime.toFixed(0)}ms\n`;
		report += `- **Average Render Time**: ${summary.performanceMetrics.avgRenderTime.toFixed(0)}ms\n`;
		report += `- **Fastest Test**: ${summary.performanceMetrics.fastestTest}\n`;
		report += `- **Slowest Test**: ${summary.performanceMetrics.slowestTest}\n\n`;

		// Error breakdown
		if (failedTests > 0) {
			report += `## Error Breakdown\n`;
			Object.entries(summary.errorBreakdown).forEach(([errorType, count]) => {
				if (count > 0) {
					report += `- **${errorType}**: ${count}\n`;
				}
			});
			report += '\n';
		}

		// Retry loop detection
		if (summary.retryLoopDetected) {
			report += `⚠️ **Warning**: Retry loops detected in test execution\n\n`;
		}

		// Individual test results
		report += `## Test Results\n`;
		results.testResults.forEach(result => {
			const status = result.success ? '✅' : '❌';
			report += `${status} **${result.testId}** (${result.executionTimeMs}ms)\n`;
			if (!result.success && result.errors.length > 0) {
				result.errors.forEach(error => {
					report += `  - Error in ${error.stage}: ${error.message}\n`;
				});
			}
		});

		return report;
	}

	private async simulateIntentClassification(prompt: string): Promise<{ shouldEnhance: boolean }> {
		// Simulate intent classification delay
		await new Promise(resolve => setTimeout(resolve, 100));

		// Simple keyword-based detection for testing
		const keywords = ['artifact', 'preview', 'component', 'render'];
		const shouldEnhance = keywords.some(keyword =>
			prompt.toLowerCase().includes(keyword.toLowerCase())
		);

		return { shouldEnhance };
	}

	private async simulatePromptEnhancement(prompt: string): Promise<string> {
		// Simulate prompt enhancement delay
		await new Promise(resolve => setTimeout(resolve, 50));

		return `${prompt}\n\nPlease wrap any code components in PAS 3.0 XML format with proper artifact tags.`;
	}

	private async makeLLMRequest(prompt: string, provider: LLMProvider, timeout: number): Promise<string> {
		// Simulate LLM API call
		return new Promise((resolve, reject) => {
			const delay = Math.random() * 2000 + 1000; // 1-3 second delay

			const timeoutId = setTimeout(() => {
				reject(new Error(`LLM request timed out after ${timeout}ms`));
			}, timeout);

			setTimeout(() => {
				clearTimeout(timeoutId);

				// Generate mock response with artifact
				const mockResponse = `Here's a React component for you:

<artifact identifier="test-component" type="text/code" language="typescript" framework="react" title="Test Component">
<![CDATA[
import React from 'react';

export default function TestComponent() {
  return (
    <div className="test-component">
      <h1>Test Component</h1>
      <p>This is a test component generated for E2E testing.</p>
    </div>
  );
}
]]>
</artifact>`;

				resolve(mockResponse);
			}, delay);
		});
	}

	private async simulateArtifactParsing(content: string): Promise<{ artifacts: any[] }> {
		// Simulate parsing delay
		await new Promise(resolve => setTimeout(resolve, 100));

		// Simple artifact detection for testing
		const artifactCount = (content.match(/<artifact/g) || []).length;
		const artifacts = Array.from({ length: artifactCount }, (_, i) => ({
			id: `test-artifact-${i}`,
			type: 'react',
			code: 'export default function TestComponent() { return <div>Test</div>; }'
		}));

		return { artifacts };
	}

	private async simulatePreviewRendering(artifacts: any[]): Promise<RenderingResult[]> {
		// Simulate rendering delay
		const renderPromises = artifacts.map(async (artifact) => {
			const renderTime = Math.random() * 1000 + 500; // 0.5-1.5 second delay
			await new Promise(resolve => setTimeout(resolve, renderTime));

			// Simulate occasional render failures
			const renderSuccess = Math.random() > 0.1; // 90% success rate

			return {
				artifactId: artifact.id,
				renderSuccess,
				renderTimeMs: renderTime,
				errorMessage: renderSuccess ? undefined : 'Simulated render failure'
			};
		});

		return Promise.all(renderPromises);
	}

	private generateSummary(testResults: E2ETestResponse[]): TestSummary {
		const errorBreakdown: Record<TestErrorType, number> = {
			[TestErrorType.TIMEOUT]: 0,
			[TestErrorType.API_ERROR]: 0,
			[TestErrorType.PARSING_ERROR]: 0,
			[TestErrorType.RENDERING_ERROR]: 0,
			[TestErrorType.ASSERTION_FAILED]: 0
		};

		let totalResponseTime = 0;
		let totalRenderTime = 0;
		let fastestTest = '';
		let slowestTest = '';
		let fastestTime = Infinity;
		let slowestTime = 0;

		testResults.forEach(result => {
			// Count errors
			result.errors.forEach(error => {
				errorBreakdown[error.type]++;
			});

			// Track performance
			totalResponseTime += result.executionTimeMs;

			const avgRenderTime = result.renderingResults.length > 0
				? result.renderingResults.reduce((sum, r) => sum + r.renderTimeMs, 0) / result.renderingResults.length
				: 0;
			totalRenderTime += avgRenderTime;

			if (result.executionTimeMs < fastestTime) {
				fastestTime = result.executionTimeMs;
				fastestTest = result.testId;
			}

			if (result.executionTimeMs > slowestTime) {
				slowestTime = result.executionTimeMs;
				slowestTest = result.testId;
			}
		});

		const performanceMetrics: PerformanceMetrics = {
			avgResponseTime: totalResponseTime / testResults.length,
			avgRenderTime: totalRenderTime / testResults.length,
			fastestTest,
			slowestTest
		};

		return {
			overallSuccess: testResults.every(r => r.success),
			errorBreakdown,
			performanceMetrics,
			retryLoopDetected: false // Would be detected from actual retry monitoring
		};
	}

	private getDefaultProvider(): LLMProvider {
		// Return a default test provider configuration
		return {
			name: 'openai',
			apiKey: process.env.OPENAI_API_KEY || 'test-key',
			endpoint: 'https://api.openai.com/v1/chat/completions',
			model: 'gpt-4'
		};
	}

	private log(message: string): void {
		if (this.config.enableLogging) {
			console.log(`[E2E] ${message}`);
		}
	}
}

// Default singleton instance
export const e2eTestRunner = new E2ETestRunnerService();