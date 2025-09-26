<script lang="ts">
import { onDestroy, onMount, tick, getContext } from 'svelte';
const i18n = getContext('i18n');

import Markdown from './Markdown.svelte';
import {
	artifactCode,
	chatId,
	mobile,
	settings,
	showArtifacts,
	showControls,
	showOverview
} from '$lib/stores';
import FloatingButtons from '../ContentRenderer/FloatingButtons.svelte';
import { createMessagesList } from '$lib/utils';

// Phase 2: Streaming Detection - Import new artifact streaming system
import { ArtifactStreamParser } from '$lib/artifacts/ArtifactStreamParser';
import { artifactEvents, artifactSubscriptions } from '$lib/artifacts/ArtifactChannel';
import { resetForNewMessage, setRenderMode, incrementArtifactCount, markStreamComplete } from '$lib/state/renderMode';

// Phase 3.4: Enhanced Artifact Detection - Import unified detection system
import { detectArtifactsUnified } from '$lib/artifacts/detectArtifacts';

// Phase 3.4: Performance Monitoring - Import timeout handling
import { performanceMonitor } from '$lib/services/performance-monitor';

export let id;
export let content;

export let history;
export let messageId;

export let selectedModels = [];

export let done = true;
export let model = null;
export let sources = null;

export let save = false;
export let preview = false;
export let floatingButtons = true;

export let editCodeBlock = true;
export let topPadding = false;

export let onSave = (e) => {};
export let onSourceClick = (e) => {};
export let onTaskClick = (e) => {};
export let onAddMessages = (e) => {};

let contentContainerElement;
let floatingButtonsElement;

// Phase 2: Streaming Detection - Parser state management
let streamParser = new ArtifactStreamParser(true); // Enable debug mode
let lastProcessedContent = '';
let hasDetectedArtifacts = false;

const updateButtonPosition = (event) => {
	const buttonsContainerElement = document.getElementById(`floating-buttons-${id}`);
	if (
		!contentContainerElement?.contains(event.target) &&
		!buttonsContainerElement?.contains(event.target)
	) {
		closeFloatingButtons();
		return;
	}

	setTimeout(async () => {
		await tick();

		if (!contentContainerElement?.contains(event.target)) return;

		let selection = window.getSelection();

		if (selection.toString().trim().length > 0) {
			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();

			const parentRect = contentContainerElement.getBoundingClientRect();

			// Adjust based on parent rect
			const top = rect.bottom - parentRect.top;
			const left = rect.left - parentRect.left;

			if (buttonsContainerElement) {
				buttonsContainerElement.style.display = 'block';

				// Calculate space available on the right
				const spaceOnRight = parentRect.width - left;
				let halfScreenWidth = $mobile ? window.innerWidth / 2 : window.innerWidth / 3;

				if (spaceOnRight < halfScreenWidth) {
					const right = parentRect.right - rect.right;
					buttonsContainerElement.style.right = `${right}px`;
					buttonsContainerElement.style.left = 'auto'; // Reset left
				} else {
					// Enough space, position using 'left'
					buttonsContainerElement.style.left = `${left}px`;
					buttonsContainerElement.style.right = 'auto'; // Reset right
				}
				buttonsContainerElement.style.top = `${top + 5}px`; // +5 to add some spacing
			}
		} else {
			closeFloatingButtons();
		}
	}, 0);
};

const closeFloatingButtons = () => {
	const buttonsContainerElement = document.getElementById(`floating-buttons-${id}`);
	if (buttonsContainerElement) {
		buttonsContainerElement.style.display = 'none';
	}

	if (floatingButtonsElement) {
		// check if closeHandler is defined

		if (typeof floatingButtonsElement?.closeHandler === 'function') {
			// call the closeHandler function
			floatingButtonsElement?.closeHandler();
		}
	}
};

const keydownHandler = (e) => {
	if (e.key === 'Escape') {
		closeFloatingButtons();
	}
};

// Phase 2: Streaming Detection - Process content updates
$: if (messageId && content !== lastProcessedContent) {
	console.log('🔄 [ContentRenderer] Processing content update for message:', messageId.substring(0, 8));
	processContentUpdate(content);
}

// Phase 2: Streaming Detection - Reset parser for new messages
$: if (messageId) {
	resetParserForMessage(messageId);
}

function resetParserForMessage(newMessageId: string) {
	console.log('🔄 [ContentRenderer] Resetting parser for message:', newMessageId.substring(0, 8));
	streamParser.reset();
	lastProcessedContent = '';
	hasDetectedArtifacts = false;
	resetForNewMessage(newMessageId);
}

function processContentUpdate(newContent: string) {
	if (!newContent || newContent === lastProcessedContent) {
		return;
	}

	// Calculate the delta (new content since last processing)
	const delta = newContent.slice(lastProcessedContent.length);

	if (delta.length === 0) {
		return;
	}

	console.log('📊 [ContentRenderer] Processing delta:', delta.substring(0, 50) + (delta.length > 50 ? '...' : ''));

	// Feed delta to streaming parser
	const update = streamParser.feed(delta);

	// Handle mode changes
	if (update.mode !== 'markdown') {
		setRenderMode(update.mode);
	}

	// Handle events
	update.events.forEach(event => {
		if (event.name === 'artifact:detected' || event.name === 'state_transition' && event.detail?.to === 'ARTIFACT_OPENING') {
			if (!hasDetectedArtifacts) {
				console.log('🚨 [ContentRenderer] First artifact detected!');
				hasDetectedArtifacts = true;

				// Emit artifact detection event
				artifactEvents.emitArtifactDetected(messageId);

				// Update UI state
				showArtifacts.set(true);
				showControls.set(true);

				// Phase 3: Auto-open preview panel for first artifact
				openPreviewPanelForArtifact();
			}
		}
	});

	// Handle completed artifacts
	if (update.newArtifacts && update.newArtifacts.length > 0) {
		update.newArtifacts.forEach(artifact => {
			console.log('✅ [ContentRenderer] New artifact completed:', artifact.attrs);

			// Emit artifact to event bus
			artifactEvents.emitArtifact(messageId, artifact);

			// Update counters
			incrementArtifactCount();

			// Add to legacy artifact store for backward compatibility
			tryAddToLegacyStore(artifact);

			// Phase 3: Update preview panel with completed artifact
			updatePreviewPanelWithArtifact(artifact);
		});
	}

	// Update last processed content
	lastProcessedContent = newContent;

	// If message is done, finalize the parser
	if (done && newContent === content) {
		const finalUpdate = streamParser.finalize();
		markStreamComplete();

		// Emit final events
		if (hasDetectedArtifacts) {
			artifactEvents.emitStreamComplete(messageId, streamParser.getCurrentState().artifactCount);
		}

		console.log('🏁 [ContentRenderer] Stream finalized for message:', messageId.substring(0, 8));
	}
}

async function tryAddToLegacyStore(artifact: any) {
	try {
		// Convert to legacy format and add to store
		const { artifactStore } = await import('$lib/stores/artifacts/artifact-store');
		const legacyArtifact = {
			identifier: artifact.attrs.id || `artifact-${Date.now()}`,
			type: artifact.attrs.type || 'application/vnd.react+jsx',
			title: artifact.attrs.name || 'Artifact',
			description: '',
			dependencies: [],
			files: [{
				path: 'main.jsx',
				content: artifact.code
			}],
			rawXml: artifact.raw
		};

		const container = {
			messageId,
			chatId: $chatId,
			artifact: legacyArtifact,
			createdAt: Date.now()
		};

		artifactStore.addArtifact(container);
		console.log('🔄 [ContentRenderer] Added to legacy store:', legacyArtifact.identifier);
	} catch (error) {
		console.warn('Failed to add artifact to legacy store:', error);
	}
}

// Phase 3.4: Enhanced Artifact Detection Integration with Performance Monitoring
async function processContentWithUnifiedDetection(content: string) {
	if (!content || !done) {
		return; // Only process completed messages to avoid interfering with streaming
	}

	// Start performance monitoring for artifact detection
	const sessionId = `content-render-${messageId}`;
	performanceMonitor.startMonitoring(sessionId);
	const operationId = performanceMonitor.startOperation(sessionId, 'artifactDetection');

	try {
		console.log('🔍 [ContentRenderer] Running unified artifact detection with performance monitoring');

		// Use the unified detection system with timeout handling
		const detectionPromise = detectArtifactsUnified(content, messageId);
		const detectionResult = await performanceMonitor.createTimeoutPromise(
			detectionPromise,
			'artifactDetection',
			'Content Renderer Artifact Detection'
		);

		const detectionTime = performanceMonitor.endOperation(operationId, sessionId, 'artifactDetection', true);

		if (detectionResult.hasArtifacts) {
			console.log(`🚀 [ContentRenderer] Unified detection found ${detectionResult.artifacts.length} artifacts in ${detectionTime}ms:`, {
				legacyCount: detectionResult.detectionMetadata.legacyCount,
				pas3Count: detectionResult.detectionMetadata.pas3Count,
				intentClassified: detectionResult.detectionMetadata.intentClassified,
				intentConfidence: detectionResult.detectionMetadata.intentConfidence
			});

			// Update UI state
			if (!hasDetectedArtifacts) {
				hasDetectedArtifacts = true;
				showArtifacts.set(true);
				showControls.set(true);
				openPreviewPanelForArtifact();
			}

			// Process each detected artifact with performance tracking
			const processingStartTime = Date.now();
			detectionResult.artifacts.forEach((artifact, index) => {
				// Convert to legacy format for compatibility
				const legacyArtifact = {
					identifier: `unified-${messageId}-${index}`,
					type: artifact.type === 'react' ? 'application/vnd.react+jsx' :
						  artifact.type === 'svelte' ? 'application/vnd.svelte' :
						  artifact.type === 'html' ? 'text/html' : 'text/plain',
					title: artifact.title || `${artifact.type} Artifact`,
					description: '',
					dependencies: Object.entries(artifact.dependencies || {}).map(([name, version]) => ({ name, version })),
					files: [{
						path: artifact.type === 'react' ? 'App.jsx' :
							  artifact.type === 'svelte' ? 'App.svelte' : 'index.html',
						content: artifact.entryCode || artifact.content || ''
					}],
					rawXml: `<artifact type="${artifact.type}" title="${artifact.title || ''}">${artifact.entryCode || artifact.content || ''}</artifact>`
				};

				// Add to legacy store for backward compatibility
				tryAddToLegacyStore({ attrs: { type: artifact.type }, code: artifact.entryCode || artifact.content, raw: legacyArtifact.rawXml });

				// Emit events for other components
				artifactEvents.emitArtifact(messageId, { artifact: legacyArtifact });
				incrementArtifactCount();
			});

			const processingTime = Date.now() - processingStartTime;
			console.log(`✅ [ContentRenderer] Processed ${detectionResult.artifacts.length} artifacts in ${processingTime}ms`);

			// Emit completion event
			artifactEvents.emitStreamComplete(messageId, detectionResult.artifacts.length);
		}
	} catch (error) {
		console.warn('🔍 [ContentRenderer] Unified artifact detection failed:', error);

		// Record failure
		performanceMonitor.endOperation(operationId, sessionId, 'artifactDetection', false);

		// Check if it's a timeout error
		if (error.message.includes('timed out')) {
			console.error('⏰ [ContentRenderer] Artifact detection timed out - this may indicate performance issues');
		}
	} finally {
		// Stop performance monitoring and log final metrics
		const finalMetrics = performanceMonitor.stopMonitoring(sessionId);
		if (finalMetrics) {
			console.log('📊 [ContentRenderer] Final performance metrics:', {
				sessionId: sessionId.substring(0, 20),
				totalTime: finalMetrics.duration,
				operations: Object.keys(finalMetrics.operations).length,
				memoryUsage: finalMetrics.memoryUsage?.percentage
			});
		}
	}
}

// Run unified detection when content and message are complete
$: if (done && content && messageId) {
	processContentWithUnifiedDetection(content);
}

// Phase 3: Preview Panel Integration Functions
async function openPreviewPanelForArtifact() {
	try {
		console.log('🚀 [ContentRenderer] Auto-opening preview panel for artifact detection');

		// Check user preference for auto-open
		const autoOpenEnabled = $settings?.autoOpenArtifact ?? true;
		if (!autoOpenEnabled) {
			console.log('⏸️ [ContentRenderer] Auto-open disabled by user preference');
			return;
		}

		// Import preview actions
		const { previewActions } = await import('$lib/stores/preview/preview-store');

		// Show preview panel with placeholder content while artifacts load
		previewActions.show('// Loading artifact...', {
			title: 'Artifact Preview',
			type: 'react',
			messageContent: content
		});

	} catch (error) {
		console.error('Error opening preview panel:', error);
	}
}

async function updatePreviewPanelWithArtifact(artifact: any) {
	try {
		console.log('🔄 [ContentRenderer] Updating preview panel with completed artifact');

		// Import preview actions
		const { previewActions } = await import('$lib/stores/preview/preview-store');

		// Determine artifact type for preview
		const artifactType = determinePreviewType(artifact.attrs.type);

		// Update preview with actual artifact code
		previewActions.show(artifact.code, {
			title: artifact.attrs.name || artifact.attrs.title || 'Artifact',
			type: artifactType,
			messageContent: content
		});

	} catch (error) {
		console.error('Error updating preview panel:', error);
	}
}

function determinePreviewType(artifactType: string): 'react' | 'html' | 'svg' | 'component' {
	if (!artifactType) return 'react';

	if (artifactType.includes('react') || artifactType.includes('jsx') || artifactType.includes('tsx')) {
		return 'react';
	} else if (artifactType.includes('html')) {
		return 'html';
	} else if (artifactType.includes('svg')) {
		return 'svg';
	} else {
		return 'component';
	}
}


onMount(() => {
	if (floatingButtons) {
		contentContainerElement?.addEventListener('mouseup', updateButtonPosition);
		document.addEventListener('mouseup', updateButtonPosition);
		document.addEventListener('keydown', keydownHandler);
	}
});

onDestroy(() => {
	if (floatingButtons) {
		contentContainerElement?.removeEventListener('mouseup', updateButtonPosition);
		document.removeEventListener('mouseup', updateButtonPosition);
		document.removeEventListener('keydown', keydownHandler);
	}
});

</script>

<div bind:this={contentContainerElement}>
	<!-- All content now goes through markdown processing with artifact extension -->
	<Markdown
		{id}
		{content}
		{model}
		{save}
		{preview}
		{done}
		{editCodeBlock}
		{topPadding}
		sourceIds={(sources ?? []).reduce((acc, source) => {
			let ids = [];
			source.document.forEach((document, index) => {
				if (model?.info?.meta?.capabilities?.citations == false) {
					ids.push('N/A');
					return ids;
				}

				const metadata = source.metadata?.[index];
				const id = metadata?.source ?? 'N/A';

				if (metadata?.name) {
					ids.push(metadata.name);
					return ids;
				}

				if (id.startsWith('http://') || id.startsWith('https://')) {
					ids.push(id);
				} else {
					ids.push(source?.source?.name ?? id);
				}

				return ids;
			});

			acc = [...acc, ...ids];

			// remove duplicates
			return acc.filter((item, index) => acc.indexOf(item) === index);
		}, [])}
		{onSourceClick}
		{onTaskClick}
		{onSave}
		onUpdate={(token) => {
			// Phase 2: Streaming Detection - The new streaming parser handles all artifact detection
			// This onUpdate is now primarily for legacy compatibility and fallback detection

			const { lang, text: code } = token;

			// Only run legacy detection if streaming parser hasn't detected artifacts
			if (done && !hasDetectedArtifacts) {
				console.log('🔄 [ContentRenderer] Running fallback artifact detection');

				// Fallback: Legacy code block detection for non-XML artifacts
				if (
					($settings?.detectArtifacts ?? true) &&
					((['html', 'svg', 'tsx', 'jsx', 'svelte'].includes(lang)) || (lang === 'xml' && code.includes('svg'))) &&
					!$mobile &&
					$chatId
				) {
					console.log('📋 [ContentRenderer] Legacy code block artifact detected');
					showArtifacts.set(true);
					showControls.set(true);
				}
			}
		}}
		onPreview={async (value) => {
			console.log('Preview', value);
			// Use new preview system instead of chat controls
			const { previewActions } = await import('$lib/stores/preview/preview-store');
			const { analyzeMessageForArtifacts } = await import('$lib/utils/preview/message-analyzer');

			try {
				// Analyze the full message content for better preview
				const messageAnalysis = analyzeMessageForArtifacts(content);

				if (messageAnalysis.bestCodeForPreview) {
					// Use message analysis for comprehensive preview
					previewActions.showFromMessage(content, messageAnalysis, 'Component Preview');
				} else {
					// Fallback to direct code preview
					previewActions.show(value, {
						title: 'Code Preview',
						type: 'react',
						messageContent: content
					});
				}
			} catch (error) {
				console.error('Preview error:', error);
				previewActions.showError('Failed to open preview: ' + (error instanceof Error ? error.message : String(error)));
			}
		}}
	/>
</div>

{#if floatingButtons && model}
	<FloatingButtons
		bind:this={floatingButtonsElement}
		{id}
		{messageId}
		actions={$settings?.floatingActionButtons ?? []}
		model={(selectedModels ?? []).includes(model?.id)
			? model?.id
			: (selectedModels ?? []).length > 0
			? selectedModels.at(0)
			: model?.id}
		messages={createMessagesList(history, id)}
		onAdd={({ modelId, parentId, messages }) => {
			console.log(modelId, parentId, messages);
			onAddMessages({ modelId, parentId, messages });
			closeFloatingButtons();
		}}
	/>
{/if}