<script lang="ts">
	/**
	 * Progress Indicator Component
	 * Shows recovery progress with animated indicators and stage information
	 */

	export let progress: number = 0; // 0-100
	export let stage: string = '';
	export let animated: boolean = true;
	export let showPercentage: boolean = true;
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let variant: 'linear' | 'circular' = 'linear';
	export let color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';

	// Reactive values
	$: clampedProgress = Math.max(0, Math.min(100, progress));
	$: isComplete = clampedProgress >= 100;
	$: isIndeterminate = clampedProgress === 0 && animated;

	function getColorClass(): string {
		switch (color) {
			case 'success': return 'progress-success';
			case 'warning': return 'progress-warning';
			case 'danger': return 'progress-danger';
			default: return 'progress-primary';
		}
	}

	function getSizeClass(): string {
		switch (size) {
			case 'small': return 'progress-small';
			case 'large': return 'progress-large';
			default: return 'progress-medium';
		}
	}
</script>

<div class="progress-container {getSizeClass()}" data-testid="progress-indicator">
	{#if variant === 'linear'}
		<div class="progress-header">
			{#if stage}
				<span class="progress-stage" data-testid="current-stage">{stage}</span>
			{/if}
			{#if showPercentage}
				<span class="progress-percentage" data-testid="progress-percentage">
					{Math.round(clampedProgress)}%
				</span>
			{/if}
		</div>

		<div class="progress-track {getColorClass()}">
			<div
				class="progress-fill"
				class:animated
				class:indeterminate={isIndeterminate}
				class:complete={isComplete}
				style="width: {isIndeterminate ? 30 : clampedProgress}%"
			></div>
		</div>
	{:else}
		<!-- Circular progress indicator -->
		<div class="progress-circular {getColorClass()}">
			<svg class="circular-svg" viewBox="0 0 50 50">
				<circle
					class="circular-track"
					cx="25"
					cy="25"
					r="20"
					fill="none"
					stroke-width="4"
				/>
				<circle
					class="circular-fill"
					class:animated
					class:indeterminate={isIndeterminate}
					cx="25"
					cy="25"
					r="20"
					fill="none"
					stroke-width="4"
					stroke-dasharray="125.6"
					stroke-dashoffset="{125.6 - (clampedProgress / 100) * 125.6}"
				/>
			</svg>

			<div class="circular-content">
				{#if showPercentage && !isIndeterminate}
					<span class="circular-percentage">{Math.round(clampedProgress)}%</span>
				{:else if stage}
					<span class="circular-stage">{stage}</span>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.progress-container {
		width: 100%;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	}

	/* Size variants */
	.progress-small {
		font-size: 12px;
	}

	.progress-medium {
		font-size: 14px;
	}

	.progress-large {
		font-size: 16px;
	}

	/* Linear progress */
	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.progress-stage {
		color: #64748b;
		font-weight: 500;
		flex: 1;
		text-align: left;
	}

	.progress-percentage {
		color: #475569;
		font-weight: 600;
		font-size: 0.9em;
	}

	.progress-track {
		width: 100%;
		background-color: #e2e8f0;
		border-radius: 9999px;
		overflow: hidden;
		position: relative;
	}

	.progress-small .progress-track {
		height: 4px;
	}

	.progress-medium .progress-track {
		height: 6px;
	}

	.progress-large .progress-track {
		height: 8px;
	}

	.progress-fill {
		height: 100%;
		border-radius: inherit;
		transition: width 0.3s ease-in-out;
		position: relative;
		overflow: hidden;
	}

	.progress-fill.animated {
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.progress-fill.complete {
		transition: width 0.3s ease-in-out, background-color 0.2s ease;
	}

	/* Color variants for linear */
	.progress-primary .progress-fill {
		background: linear-gradient(90deg, #3b82f6, #1d4ed8);
	}

	.progress-success .progress-fill {
		background: linear-gradient(90deg, #10b981, #059669);
	}

	.progress-warning .progress-fill {
		background: linear-gradient(90deg, #f59e0b, #d97706);
	}

	.progress-danger .progress-fill {
		background: linear-gradient(90deg, #ef4444, #dc2626);
	}

	/* Indeterminate animation for linear */
	.progress-fill.indeterminate {
		animation: indeterminate-linear 1.5s infinite linear;
		background: linear-gradient(90deg, transparent, #3b82f6, transparent);
		width: 40% !important;
	}

	@keyframes indeterminate-linear {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(250%);
		}
	}

	/* Circular progress */
	.progress-circular {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.circular-svg {
		transform: rotate(-90deg);
	}

	.progress-small .circular-svg {
		width: 40px;
		height: 40px;
	}

	.progress-medium .circular-svg {
		width: 60px;
		height: 60px;
	}

	.progress-large .circular-svg {
		width: 80px;
		height: 80px;
	}

	.circular-track {
		stroke: #e2e8f0;
	}

	.circular-fill {
		stroke-linecap: round;
		transition: stroke-dashoffset 0.3s ease-in-out;
	}

	.circular-fill.animated {
		transition: stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Color variants for circular */
	.progress-primary .circular-fill {
		stroke: #3b82f6;
	}

	.progress-success .circular-fill {
		stroke: #10b981;
	}

	.progress-warning .circular-fill {
		stroke: #f59e0b;
	}

	.progress-danger .circular-fill {
		stroke: #ef4444;
	}

	/* Indeterminate animation for circular */
	.circular-fill.indeterminate {
		animation: indeterminate-circular 1.4s ease-in-out infinite;
		stroke-dasharray: 80, 200;
		stroke-dashoffset: 0;
	}

	@keyframes indeterminate-circular {
		0% {
			stroke-dasharray: 1, 200;
			stroke-dashoffset: 0;
		}
		50% {
			stroke-dasharray: 90, 200;
			stroke-dashoffset: -35px;
		}
		100% {
			stroke-dasharray: 90, 200;
			stroke-dashoffset: -125px;
		}
	}

	.circular-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.circular-percentage {
		font-weight: 600;
		color: #374151;
	}

	.circular-stage {
		font-size: 0.8em;
		color: #64748b;
		max-width: 80%;
		word-wrap: break-word;
		line-height: 1.2;
	}

	.progress-small .circular-percentage {
		font-size: 10px;
	}

	.progress-small .circular-stage {
		font-size: 8px;
	}

	.progress-medium .circular-percentage {
		font-size: 12px;
	}

	.progress-medium .circular-stage {
		font-size: 10px;
	}

	.progress-large .circular-percentage {
		font-size: 14px;
	}

	.progress-large .circular-stage {
		font-size: 12px;
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.progress-stage {
			color: #9ca3af;
		}

		.progress-percentage {
			color: #d1d5db;
		}

		.progress-track {
			background-color: #374151;
		}

		.circular-track {
			stroke: #374151;
		}

		.circular-percentage {
			color: #f3f4f6;
		}

		.circular-stage {
			color: #9ca3af;
		}
	}

	/* Pulsing effect for complete state */
	.progress-fill.complete::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: inherit;
		opacity: 0.3;
		animation: pulse-complete 1s ease-in-out;
	}

	@keyframes pulse-complete {
		0% {
			opacity: 0.3;
			transform: scaleY(1);
		}
		50% {
			opacity: 0.6;
			transform: scaleY(1.1);
		}
		100% {
			opacity: 0.3;
			transform: scaleY(1);
		}
	}

	/* Accessibility improvements */
	@media (prefers-reduced-motion: reduce) {
		.progress-fill,
		.circular-fill {
			transition: none;
		}

		.progress-fill.indeterminate,
		.circular-fill.indeterminate {
			animation: none;
		}

		.progress-fill.complete::after {
			animation: none;
		}
	}
</style>