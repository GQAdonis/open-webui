<script lang="ts">
	/**
	 * Recovery Results Component
	 * Displays detailed recovery results, diagnostics, and performance metrics
	 */

	import type { RecoveryResult } from '../../services/artifact-dependency-resolver/strategy-executor';

	interface Props {
		result: RecoveryResult;
		showDiagnostics?: boolean;
		showPerformanceMetrics?: boolean;
		compact?: boolean;
	}

	let {
		result,
		showDiagnostics = false,
		showPerformanceMetrics = true,
		compact = false
	}: Props = $props();

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	function getStageIcon(status: string): string {
		switch (status) {
			case 'completed': return '✅';
			case 'failed': return '❌';
			case 'running': return '⏳';
			case 'skipped': return '⏭️';
			default: return '⚪';
		}
	}

	function getStageColor(status: string): string {
		switch (status) {
			case 'completed': return 'text-green-600';
			case 'failed': return 'text-red-600';
			case 'running': return 'text-blue-600';
			case 'skipped': return 'text-gray-400';
			default: return 'text-gray-500';
		}
	}

	function getConfidenceColor(confidence: number): string {
		if (confidence >= 0.8) return 'text-green-600';
		if (confidence >= 0.6) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getConfidenceLabel(confidence: number): string {
		if (confidence >= 0.9) return 'Very High';
		if (confidence >= 0.8) return 'High';
		if (confidence >= 0.6) return 'Medium';
		if (confidence >= 0.4) return 'Low';
		return 'Very Low';
	}

	let totalStages = $derived(result.stages.length);
	let completedStages = $derived(result.stages.filter(s => s.status === 'completed').length);
	let failedStages = $derived(result.stages.filter(s => s.status === 'failed').length);
	let successRate = $derived(totalStages > 0 ? (completedStages / totalStages) * 100 : 0);
</script>

<div class="recovery-results" data-testid="recovery-results">
	<!-- Overall Status -->
	<div class="result-header" class:compact>
		<div class="status-indicator">
			<span class="status-icon">
				{result.success ? '✅' : '❌'}
			</span>
			<div class="status-details">
				<h3 class="status-title">
					{result.success ? 'Recovery Successful' : 'Recovery Failed'}
				</h3>
				<p class="status-subtitle">
					Strategy: {result.strategy} •
					Confidence: {Math.round(result.confidence * 100)}% •
					Time: {formatDuration(result.processingTimeMs)}
				</p>
			</div>
		</div>

		{#if result.success}
			<div class="success-badge" data-testid="recovery-success">
				<span class="badge-text">Fixed</span>
			</div>
		{:else}
			<div class="failure-badge" data-testid="recovery-failed">
				<span class="badge-text">Failed</span>
			</div>
		{/if}
	</div>

	{#if !compact}
		<!-- Performance Metrics -->
		{#if showPerformanceMetrics}
			<div class="metrics-section">
				<h4 class="section-title">Performance Metrics</h4>
				<div class="metrics-grid">
					<div class="metric-card">
						<span class="metric-label">Processing Time</span>
						<span class="metric-value" data-testid="processing-time">
							{formatDuration(result.processingTimeMs)}
						</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Success Rate</span>
						<span class="metric-value" data-testid="success-rate">
							{Math.round(successRate)}%
						</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Confidence</span>
						<span class="metric-value {getConfidenceColor(result.confidence)}" data-testid="confidence-score">
							{getConfidenceLabel(result.confidence)}
						</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Circuit State</span>
						<span class="metric-value" data-testid="circuit-state">
							{result.circuitState || 'Unknown'}
						</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Stage Details -->
		<div class="stages-section">
			<h4 class="section-title">Recovery Stages</h4>
			<div class="stages-list">
				{#each result.stages as stage, index}
					<div class="stage-item" class:failed={stage.status === 'failed'}>
						<div class="stage-header">
							<span class="stage-icon">{getStageIcon(stage.status)}</span>
							<span class="stage-name">{stage.name}</span>
							<span class="stage-status {getStageColor(stage.status)}">
								{stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
							</span>
						</div>

						{#if stage.startTime && stage.endTime}
							<div class="stage-timing">
								Duration: {formatDuration(stage.endTime - stage.startTime)}
							</div>
						{/if}

						{#if stage.error}
							<div class="stage-error">
								<span class="error-label">Error:</span>
								<span class="error-message">{stage.error}</span>
							</div>
						{/if}

						{#if showDiagnostics && stage.result}
							<div class="stage-result">
								<details>
									<summary>Stage Result</summary>
									<pre class="result-data">{JSON.stringify(stage.result, null, 2)}</pre>
								</details>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Error Details -->
		{#if result.errors.length > 0}
			<div class="errors-section">
				<h4 class="section-title">Errors Encountered</h4>
				<div class="errors-list">
					{#each result.errors as error, index}
						<div class="error-item">
							<span class="error-index">{index + 1}.</span>
							<span class="error-text">{error}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Classification & Context -->
		{#if result.classification}
			<div class="classification-section">
				<h4 class="section-title">Error Classification</h4>
				<div class="classification-details">
					<div class="classification-item">
						<span class="classification-label">Error Type:</span>
						<span class="classification-value">{result.classification.errorType}</span>
					</div>
					<div class="classification-item">
						<span class="classification-label">Can Resolve:</span>
						<span class="classification-value {result.classification.canResolve ? 'text-green-600' : 'text-red-600'}">
							{result.classification.canResolve ? 'Yes' : 'No'}
						</span>
					</div>
					{#if result.classification.suggestedStrategy}
						<div class="classification-item">
							<span class="classification-label">Suggested Strategy:</span>
							<span class="classification-value">{result.classification.suggestedStrategy}</span>
						</div>
					{/if}
					{#if result.classification.reasoning}
						<div class="classification-item">
							<span class="classification-label">Reasoning:</span>
							<span class="classification-value">{result.classification.reasoning}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Context Information -->
		{#if result.context}
			<div class="context-section">
				<h4 class="section-title">Context Analysis</h4>
				<div class="context-details">
					<div class="context-item">
						<span class="context-label">Available Blocks:</span>
						<span class="context-value">{result.context.availableBlocks.length}</span>
					</div>
					<div class="context-item">
						<span class="context-label">Has CSS:</span>
						<span class="context-value {result.context.hasRelevantCSS ? 'text-green-600' : 'text-gray-500'}">
							{result.context.hasRelevantCSS ? 'Yes' : 'No'}
						</span>
					</div>
					<div class="context-item">
						<span class="context-label">Has JSON:</span>
						<span class="context-value {result.context.hasRelevantJSON ? 'text-green-600' : 'text-gray-500'}">
							{result.context.hasRelevantJSON ? 'Yes' : 'No'}
						</span>
					</div>
					<div class="context-item">
						<span class="context-label">Has Imports:</span>
						<span class="context-value {result.context.hasImportStatements ? 'text-green-600' : 'text-gray-500'}">
							{result.context.hasImportStatements ? 'Yes' : 'No'}
						</span>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.recovery-results {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-size: 14px;
		line-height: 1.5;
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		border-bottom: 1px solid #f3f4f6;
	}

	.result-header.compact {
		padding: 12px 16px;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.status-icon {
		font-size: 1.5em;
	}

	.status-title {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #111827;
	}

	.status-subtitle {
		margin: 2px 0 0 0;
		font-size: 12px;
		color: #6b7280;
	}

	.success-badge {
		background: #dcfce7;
		color: #15803d;
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 12px;
		font-weight: 600;
	}

	.failure-badge {
		background: #fee2e2;
		color: #dc2626;
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 12px;
		font-weight: 600;
	}

	.section-title {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
	}

	/* Metrics Section */
	.metrics-section {
		padding: 16px;
		border-bottom: 1px solid #f3f4f6;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 12px;
	}

	.metric-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px;
		background: #f9fafb;
		border-radius: 6px;
		text-align: center;
	}

	.metric-label {
		font-size: 11px;
		color: #6b7280;
		margin-bottom: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-value {
		font-size: 16px;
		font-weight: 600;
		color: #111827;
	}

	/* Stages Section */
	.stages-section {
		padding: 16px;
		border-bottom: 1px solid #f3f4f6;
	}

	.stages-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.stage-item {
		padding: 12px;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.stage-item.failed {
		background: #fef2f2;
		border-color: #fecaca;
	}

	.stage-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.stage-name {
		flex: 1;
		font-weight: 500;
		color: #374151;
	}

	.stage-status {
		font-size: 12px;
		font-weight: 500;
	}

	.stage-timing {
		font-size: 11px;
		color: #6b7280;
		margin-bottom: 4px;
	}

	.stage-error {
		display: flex;
		gap: 4px;
		margin-top: 4px;
	}

	.error-label {
		font-weight: 500;
		color: #dc2626;
		font-size: 12px;
	}

	.error-message {
		color: #7f1d1d;
		font-size: 12px;
	}

	.stage-result {
		margin-top: 8px;
	}

	.stage-result details {
		cursor: pointer;
	}

	.stage-result summary {
		font-size: 12px;
		color: #4b5563;
		font-weight: 500;
		margin-bottom: 4px;
	}

	.result-data {
		background: #1f2937;
		color: #f3f4f6;
		padding: 8px;
		border-radius: 4px;
		font-size: 11px;
		overflow-x: auto;
		margin: 4px 0 0 0;
	}

	/* Errors Section */
	.errors-section {
		padding: 16px;
		border-bottom: 1px solid #f3f4f6;
	}

	.errors-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.error-item {
		display: flex;
		gap: 8px;
		padding: 8px;
		background: #fef2f2;
		border-radius: 4px;
	}

	.error-index {
		font-weight: 600;
		color: #dc2626;
		flex-shrink: 0;
	}

	.error-text {
		color: #7f1d1d;
	}

	/* Classification Section */
	.classification-section,
	.context-section {
		padding: 16px;
		border-bottom: 1px solid #f3f4f6;
	}

	.classification-section:last-child,
	.context-section:last-child {
		border-bottom: none;
	}

	.classification-details,
	.context-details {
		display: grid;
		gap: 8px;
	}

	.classification-item,
	.context-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 6px 0;
	}

	.classification-label,
	.context-label {
		font-weight: 500;
		color: #374151;
	}

	.classification-value,
	.context-value {
		color: #6b7280;
	}

	/* Utility classes */
	.text-green-600 { color: #16a34a; }
	.text-yellow-600 { color: #d97706; }
	.text-red-600 { color: #dc2626; }
	.text-blue-600 { color: #2563eb; }
	.text-gray-400 { color: #9ca3af; }
	.text-gray-500 { color: #6b7280; }

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.recovery-results {
			background: #111827;
			border-color: #374151;
			color: #f3f4f6;
		}

		.result-header {
			border-color: #374151;
		}

		.status-title {
			color: #f9fafb;
		}

		.status-subtitle {
			color: #9ca3af;
		}

		.section-title {
			color: #d1d5db;
		}

		.metric-card,
		.stage-item {
			background: #1f2937;
			border-color: #374151;
		}

		.stage-name {
			color: #d1d5db;
		}

		.stage-timing {
			color: #9ca3af;
		}

		.classification-label,
		.context-label {
			color: #d1d5db;
		}

		.classification-value,
		.context-value {
			color: #9ca3af;
		}

		.error-item {
			background: #7f1d1d;
		}

		.stage-item.failed {
			background: #7f1d1d;
			border-color: #dc2626;
		}
	}
</style>