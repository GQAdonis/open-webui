<script lang="ts">
	/**
	 * Recovery Button Component
	 * Specialized button for recovery actions with various states and animations
	 */

	import { createEventDispatcher } from 'svelte';

	export let variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' = 'primary';
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let disabled: boolean = false;
	export let loading: boolean = false;
	export let icon: string = '';
	export let loadingText: string = '';
	export let type: 'button' | 'submit' | 'reset' = 'button';
	export let fullWidth: boolean = false;
	export let pulse: boolean = false;
	export let success: boolean = false;
	export let testId: string = '';

	const dispatch = createEventDispatcher<{
		click: MouseEvent;
	}>();

	function handleClick(event: MouseEvent) {
		if (!disabled && !loading) {
			dispatch('click', event);
		}
	}

	function getVariantClass(): string {
		switch (variant) {
			case 'primary': return 'btn-primary';
			case 'secondary': return 'btn-secondary';
			case 'success': return 'btn-success';
			case 'warning': return 'btn-warning';
			case 'danger': return 'btn-danger';
			default: return 'btn-primary';
		}
	}

	function getSizeClass(): string {
		switch (size) {
			case 'small': return 'btn-small';
			case 'large': return 'btn-large';
			default: return 'btn-medium';
		}
	}

	$: buttonText = loading && loadingText ? loadingText : $$slots.default;
</script>

<button
	{type}
	class="recovery-btn {getVariantClass()} {getSizeClass()}"
	class:disabled
	class:loading
	class:full-width={fullWidth}
	class:pulse
	class:success
	{disabled}
	on:click={handleClick}
	data-testid={testId}
	{...$$restProps}
>
	<div class="btn-content">
		{#if loading}
			<div class="btn-spinner" aria-hidden="true">
				<svg class="spinner-svg" viewBox="0 0 24 24" fill="none">
					<circle
						class="spinner-circle"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</div>
		{:else if success}
			<div class="btn-icon success-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="20,6 9,17 4,12"></polyline>
				</svg>
			</div>
		{:else if icon}
			<div class="btn-icon" aria-hidden="true">
				{@html icon}
			</div>
		{/if}

		<span class="btn-text">
			<slot />
		</span>
	</div>

	{#if pulse && !disabled && !loading}
		<div class="pulse-ring" aria-hidden="true"></div>
	{/if}
</button>

<style>
	.recovery-btn {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 8px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
		user-select: none;
		text-decoration: none;
		outline: none;
		box-sizing: border-box;
	}

	.recovery-btn:focus-visible {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
	}

	/* Size variants */
	.btn-small {
		padding: 6px 12px;
		font-size: 12px;
		min-height: 28px;
		gap: 4px;
	}

	.btn-medium {
		padding: 8px 16px;
		font-size: 14px;
		min-height: 36px;
		gap: 6px;
	}

	.btn-large {
		padding: 12px 24px;
		font-size: 16px;
		min-height: 44px;
		gap: 8px;
	}

	/* Full width */
	.full-width {
		width: 100%;
	}

	/* Content layout */
	.btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: inherit;
		position: relative;
		z-index: 1;
	}

	.btn-text {
		white-space: nowrap;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-small .btn-icon {
		width: 14px;
		height: 14px;
	}

	.btn-medium .btn-icon {
		width: 16px;
		height: 16px;
	}

	.btn-large .btn-icon {
		width: 20px;
		height: 20px;
	}

	/* Spinner */
	.btn-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.btn-small .btn-spinner {
		width: 14px;
		height: 14px;
	}

	.btn-medium .btn-spinner {
		width: 16px;
		height: 16px;
	}

	.btn-large .btn-spinner {
		width: 20px;
		height: 20px;
	}

	.spinner-svg {
		width: 100%;
		height: 100%;
		animation: spin 1s linear infinite;
	}

	.spinner-circle {
		stroke-dasharray: 60;
		stroke-dashoffset: 60;
		animation: spinner-dash 1.5s ease-in-out infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes spinner-dash {
		0% {
			stroke-dasharray: 1, 150;
			stroke-dashoffset: 0;
		}
		50% {
			stroke-dasharray: 90, 150;
			stroke-dashoffset: -35;
		}
		100% {
			stroke-dasharray: 90, 150;
			stroke-dashoffset: -124;
		}
	}

	/* Color variants */
	.btn-primary {
		background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
	}

	.btn-primary:hover:not(.disabled):not(.loading) {
		background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: linear-gradient(135deg, #64748b 0%, #475569 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(100, 116, 139, 0.3);
	}

	.btn-secondary:hover:not(.disabled):not(.loading) {
		background: linear-gradient(135deg, #475569 0%, #334155 100%);
		box-shadow: 0 4px 12px rgba(100, 116, 139, 0.4);
		transform: translateY(-1px);
	}

	.btn-success {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
	}

	.btn-success:hover:not(.disabled):not(.loading) {
		background: linear-gradient(135deg, #059669 0%, #047857 100%);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
		transform: translateY(-1px);
	}

	.btn-warning {
		background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
	}

	.btn-warning:hover:not(.disabled):not(.loading) {
		background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
		box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
		transform: translateY(-1px);
	}

	.btn-danger {
		background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
		color: white;
		box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
	}

	.btn-danger:hover:not(.disabled):not(.loading) {
		background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
		box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
		transform: translateY(-1px);
	}

	/* States */
	.recovery-btn.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none !important;
		box-shadow: none !important;
	}

	.recovery-btn.loading {
		cursor: wait;
		transform: none !important;
	}

	.recovery-btn.success {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
	}

	.success-icon {
		animation: success-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
	}

	@keyframes success-pop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Pulse effect */
	.pulse-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border: 2px solid currentColor;
		border-radius: inherit;
		width: 100%;
		height: 100%;
		opacity: 0;
		animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
		pointer-events: none;
	}

	@keyframes pulse-ring {
		0% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 0.7;
		}
		100% {
			transform: translate(-50%, -50%) scale(1.4);
			opacity: 0;
		}
	}

	/* Active state */
	.recovery-btn:active:not(.disabled):not(.loading) {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.recovery-btn:focus-visible {
			outline-color: #60a5fa;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.recovery-btn,
		.btn-spinner,
		.spinner-svg,
		.spinner-circle,
		.success-icon,
		.pulse-ring {
			animation: none;
			transition: none;
		}

		.recovery-btn:hover:not(.disabled):not(.loading) {
			transform: none;
		}

		.recovery-btn:active:not(.disabled):not(.loading) {
			transform: none;
		}
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.recovery-btn {
			border: 2px solid;
		}

		.btn-primary {
			border-color: #1d4ed8;
		}

		.btn-secondary {
			border-color: #475569;
		}

		.btn-success {
			border-color: #059669;
		}

		.btn-warning {
			border-color: #d97706;
		}

		.btn-danger {
			border-color: #dc2626;
		}
	}
</style>