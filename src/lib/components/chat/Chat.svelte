<!-- @migration-task Error while migrating Svelte code: Cannot subscribe to stores that are not declared at the top level of the component
https://svelte.dev/e/store_invalid_scoped_subscription -->
<script lang="ts">
	import { v4 as uuidv4 } from 'uuid';
	import { toast } from 'svelte-sonner';
	// import { PaneGroup, Pane } from 'paneforge';

	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';

	import { get, type Unsubscriber, type Writable } from 'svelte/store';
	import type { i18n as i18nType } from 'i18next';
	import { WEBUI_BASE_URL } from '$lib/constants';
	import type { FileItem, MessageType, HistoryType, FolderMeta, Folder, Draft, ModelSelection } from '$lib/types';

	const i18n: Writable<i18nType> = getContext('i18n');
	// Translation helper to keep code clean and satisfy TypeScript
	const tr = (key: string) => (get(i18n) as i18nType).t(key);

	import {
		chatId,
		chats,
		config,
		type Model,
		models,
		tags as allTags,
		settings,
		showSidebar,
		WEBUI_NAME,
		banners,
		user,
		socket,
		showControls,
		showCallOverlay,
		currentChatPage,
		temporaryChatEnabled,
		mobile,
		showOverview,
		chatTitle,
		showArtifacts,
		tools,
		toolServers,
		functions,
		selectedFolder,
		pinnedChats
	} from '$lib/stores';

	// Reactive variable for selected folder meta
	let selectedFolderMeta: FolderMeta | undefined;
	$: selectedFolderMeta = ($selectedFolder as Folder | null | undefined)?.meta;
	import {
		convertMessagesToHistory,
		copyToClipboard,
		getMessageContentParts,
		createMessagesList,
		getPromptVariables,
		processDetails,
		removeAllDetails
	} from '$lib/utils';

	import {
		createNewChat,
		getAllTags,
		getChatById,
		getChatList,
		getPinnedChatList,
		getTagsById,
		updateChatById,
		updateChatFolderIdById
	} from '$lib/apis/chats';
	import { generateOpenAIChatCompletion } from '$lib/apis/openai';
	import { processWeb, processWebSearch, processYoutubeVideo } from '$lib/apis/retrieval';
	import { getAndUpdateUserLocation, getUserSettings } from '$lib/apis/users';
	import {
		chatCompleted,
		generateQueries,
		chatAction,
		generateMoACompletion,
		stopTask,
		getTaskIdsByChatId
	} from '$lib/apis';
	import { getTools } from '$lib/apis/tools';
	import { uploadFile } from '$lib/apis/files';
	import { createOpenAITextStream } from '$lib/apis/streaming';
	import { useArtifactIntegration } from '$lib/utils/artifacts/integration';

	// Phase 3.4: Prompt Enhancement Integration
	import { promptEnhancer } from '$lib/services/prompt-enhancer';
	import type { PromptEnhancementRequest } from '$lib/services/prompt-enhancer';

	import { fade } from 'svelte/transition';

	import Banner from '../common/Banner.svelte';
	import MessageInput from '$lib/components/chat/MessageInput.svelte';
	import Messages from '$lib/components/chat/Messages.svelte';
	import Navbar from '$lib/components/chat/Navbar.svelte';
	import ChatControls from './ChatControls.svelte';
	import EventConfirmDialog from '../common/ConfirmDialog.svelte';
	import Placeholder from './Placeholder.svelte';
	import NotificationToast from '../NotificationToast.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import Sidebar from '../icons/Sidebar.svelte';
	import { getFunctions } from '$lib/apis/functions';
	import Image from '../common/Image.svelte';

	export let chatIdProp = '';

	let loading = true;

	const eventTarget = new EventTarget();
	let controlPane: any;
	let controlPaneComponent: any;

	let messageInput: any;

	let autoScroll = true;
	let processing = '';
	let messagesContainerElement: HTMLDivElement;

	let navbarElement;

	let showEventConfirmation = false;
	let eventConfirmationTitle = '';
	let eventConfirmationMessage = '';
	let eventConfirmationInput = false;
	let eventConfirmationInputPlaceholder = '';
	let eventConfirmationInputValue = '';
	let eventCallback: any = null;

	let chatIdUnsubscriber: Unsubscriber | undefined;

	let selectedModels: string[] = [''];
	let atSelectedModel: Model | undefined;

	// Initialize artifact integration
	const { preprocessPrompt, postprocessResponse } = useArtifactIntegration();
	let selectedModelIds: string[] = [];
	$: selectedModelIds = atSelectedModel !== undefined ? [atSelectedModel.id] : selectedModels;

	let selectedToolIds: string[] = [];
	let selectedFilterIds: string[] = [];
	let imageGenerationEnabled = false;
	let webSearchEnabled = false;
	let codeInterpreterEnabled = false;

	let showCommands = false;

	let generating = false;
	let generationController: any = null;

	let chat: any = null;
	let tags: any[] = [];

	let history: HistoryType = {
		messages: {},
		currentId: null
	};

	let taskIds: any = null;

	// Chat Input
	let prompt = '';
	let chatFiles: FileItem[] = [];
	let files: FileItem[] = [];
	let params: any = {};

	$: if (chatIdProp) {
		navigateHandler();
	}

	const navigateHandler = async () => {
		loading = true;

		prompt = '';
		messageInput?.setText('');

		files = [];
		selectedToolIds = [];
		selectedFilterIds = [];
		webSearchEnabled = false;
		imageGenerationEnabled = false;

		const storageChatInput = sessionStorage.getItem(
			`chat-input${chatIdProp ? `-${chatIdProp}` : ''}`
		);

		if (chatIdProp && (await loadChat())) {
			await tick();
			loading = false;
			window.setTimeout(() => scrollToBottom(), 0);

			await tick();

			if (storageChatInput) {
				try {
					const input = JSON.parse(storageChatInput);

					if (!$temporaryChatEnabled) {
						messageInput?.setText(input.prompt);
						files = input.files;
						selectedToolIds = input.selectedToolIds;
						selectedFilterIds = input.selectedFilterIds;
						webSearchEnabled = input.webSearchEnabled;
						imageGenerationEnabled = input.imageGenerationEnabled;
						codeInterpreterEnabled = input.codeInterpreterEnabled;
					}
				} catch (e) {}
			}

			const chatInput = document.getElementById('chat-input');
			chatInput?.focus();
		} else {
			await goto('/');
		}
	};

	const onSelect = async (e: any) => {
		const { type, data } = e;

		if (type === 'prompt') {
			// Handle prompt selection
			messageInput?.setText(data, async () => {
				if (!(($settings as any)?.insertSuggestionPrompt ?? false)) {
					await tick();
					submitPrompt(prompt);
				}
			});
		}
	};

	$: if (selectedModels && chatIdProp !== '') {
		saveSessionSelectedModels();
	}

	const saveSessionSelectedModels = () => {
		if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
			return;
		}
		sessionStorage.selectedModels = JSON.stringify(selectedModels);
		console.log('saveSessionSelectedModels', selectedModels, sessionStorage.selectedModels);
	};

	let oldSelectedModelIds = [''];
	$: if (JSON.stringify(selectedModelIds) !== JSON.stringify(oldSelectedModelIds)) {
		onSelectedModelIdsChange();
	}

	const onSelectedModelIdsChange = () => {
		if (oldSelectedModelIds.filter((id) => id).length > 0) {
			resetInput();
		}
		oldSelectedModelIds = selectedModelIds;
	};

	const resetInput = () => {
		selectedToolIds = [];
		selectedFilterIds = [];
		webSearchEnabled = false;
		imageGenerationEnabled = false;
		codeInterpreterEnabled = false;

		setDefaults();
	};

	const setDefaults = async () => {
		if (!$tools) {
			tools.set(await getTools(localStorage.token));
		}
		if (!$functions) {
			functions.set(await getFunctions(localStorage.token));
		}
		if (selectedModels.length !== 1 && !atSelectedModel) {
			return;
		}

		const model = atSelectedModel ?? $models.find((m: any) => m.id === selectedModels[0]);
		if (model) {
			// Set Default Tools
			if (model?.info?.meta?.toolIds) {
				selectedToolIds = [
					...new Set(
						[...(model?.info?.meta?.toolIds ?? [])].filter((id) => $tools?.find((t: any) => t.id === id))
					)
				];
			}

			// Set Default Filters (Toggleable only)
			{
				// Model meta may not include these fields in its declared type; use a safe local view
				type ModelMetaExtra = { defaultFilterIds?: string[]; defaultFeatureIds?: string[]; capabilities?: Record<string, boolean> };
				const meta = (model?.info?.meta as unknown as ModelMetaExtra) || {};
				const modelFilters = (model as any)?.filters as { id: string }[] | undefined;

				if (meta.defaultFilterIds && modelFilters) {
					selectedFilterIds = meta.defaultFilterIds.filter((id) =>
						modelFilters?.some((f) => f.id === id)
					);
				}
			}

			// Set Default Features
			{
				// Reuse the safe meta view
				type ModelMetaExtra = { defaultFilterIds?: string[]; defaultFeatureIds?: string[]; capabilities?: Record<string, boolean> };
				const meta = (model?.info?.meta as unknown as ModelMetaExtra) || {};
				const caps = meta.capabilities || {};
				const featureIds = meta.defaultFeatureIds || [];

				if (caps['image_generation']) {
					imageGenerationEnabled = featureIds.includes('image_generation');
				}
				if (caps['web_search']) {
					webSearchEnabled = featureIds.includes('web_search');
				}
				if (caps['code_interpreter']) {
					codeInterpreterEnabled = featureIds.includes('code_interpreter');
				}
			}
		}
	};

	const showMessage = async (message: any) => {
		await tick();

	const _chatId = JSON.parse(JSON.stringify(get(chatId)));
		let _messageId = JSON.parse(JSON.stringify(message.id));

		let messageChildrenIds = [];
		if (_messageId === null) {
			messageChildrenIds = Object.keys(history.messages).filter(
				(id) => history.messages[id].parentId === null
			);
		} else {
			messageChildrenIds = history.messages[_messageId].childrenIds;
		}

		while (messageChildrenIds.length !== 0) {
			_messageId = messageChildrenIds.at(-1);
			messageChildrenIds = history.messages[_messageId].childrenIds;
		}

		history.currentId = _messageId;

		await tick();
		await tick();
		await tick();

		if ($settings?.scrollOnBranchChange ?? true) {
			const messageElement = document.getElementById(`message-${message.id}`);
			if (messageElement) {
				messageElement.scrollIntoView({ behavior: 'smooth' });
			}
		}

		await tick();
		saveChatHandler(_chatId, history);
	};

	const chatEventHandler = async (event: any, cb: any) => {
		console.log(event);

	if (event.chat_id === get(chatId)) {
			await tick();
			let message = history.messages[event.message_id];

			if (message) {
				const type = event?.data?.type ?? null;
				const data = event?.data?.data ?? null;

				if (type === 'status') {
					if (message?.statusHistory) {
						message.statusHistory.push(data);
					} else {
						message.statusHistory = [data];
					}
				} else if (type === 'chat:completion') {
					chatCompletionEventHandler(data, message, event.chat_id);
				} else if (type === 'chat:tasks:cancel') {
					taskIds = null;
					const responseMessage = history.currentId ? history.messages[history.currentId] : null;
					// Set all response messages to done
					if (responseMessage?.parentId && history.messages[responseMessage.parentId]) {
						for (const messageId of history.messages[responseMessage.parentId].childrenIds || []) {
							if (history.messages[messageId]) {
								history.messages[messageId].done = true;
							}
						}
					} else {
						console.error('Parent message not found for responseMessage:', responseMessage?.parentId);
					}
				} else if (type === 'chat:message:delta' || type === 'message') {
					message.content += data.content;
				} else if (type === 'chat:message' || type === 'replace') {
					message.content = data.content;
				} else if (type === 'chat:message:files' || type === 'files') {
					message.files = data.files;
				} else if (type === 'chat:message:error') {
					message.error = data.error;
				} else if (type === 'chat:message:follow_ups') {
					message.followUps = data.follow_ups;

					if (autoScroll) {
						scrollToBottom('smooth');
					}
				} else if (type === 'chat:title') {
					chatTitle.set(data);
					currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
				} else if (type === 'chat:tags') {
		chat = await getChatById(localStorage.token, get(chatId));
					allTags.set(await getAllTags(localStorage.token));
				} else if (type === 'source' || type === 'citation') {
					if (data?.type === 'code_execution') {
						// Code execution; update existing code execution by ID, or add new one.
						if (!message?.code_executions) {
							message.code_executions = [];
						}

						const existingCodeExecutionIndex = message.code_executions.findIndex(
							(execution: any) => execution.id === data.id
						);

						if (existingCodeExecutionIndex !== -1) {
							message.code_executions[existingCodeExecutionIndex] = data;
						} else {
							message.code_executions.push(data);
						}

						message.code_executions = message.code_executions;
					} else {
						// Regular source.
						if (message?.sources) {
							message.sources.push(data);
						} else {
							message.sources = [data];
						}
					}
				} else if (type === 'notification') {
					const toastType = data?.type ?? 'info';
					const toastContent = data?.content ?? '';

					if (toastType === 'success') {
						toast.success(toastContent);
					} else if (toastType === 'error') {
						toast.error(toastContent);
					} else if (toastType === 'warning') {
						toast.warning(toastContent);
					} else {
						toast.info(toastContent);
					}
				} else if (type === 'confirmation') {
					eventCallback = cb;

					eventConfirmationInput = false;
					showEventConfirmation = true;

					eventConfirmationTitle = data.title;
					eventConfirmationMessage = data.message;
				} else if (type === 'execute') {
					eventCallback = cb;

					try {
						// Use Function constructor to evaluate code in a safer way
						const asyncFunction = new Function(`return (async () => { ${data.code} })()`);
						const result = await asyncFunction(); // Await the result of the async function

						if (cb) {
							cb(result);
						}
					} catch (error) {
						console.error('Error executing code:', error);
					}
				} else if (type === 'input') {
					eventCallback = cb;

					eventConfirmationInput = true;
					showEventConfirmation = true;

					eventConfirmationTitle = data.title;
					eventConfirmationMessage = data.message;
					eventConfirmationInputPlaceholder = data.placeholder;
					eventConfirmationInputValue = data?.value ?? '';
				} else {
					console.log('Unknown message type', data);
				}

				history.messages[event.message_id] = message;
			}
		}
	};

	const onMessageHandler = async (event: {
		origin: string;
		data: { type: string; text: string };
	}) => {
		if (event.origin !== window.origin) {
			return;
		}

		if (event.data.type === 'action:submit') {
			console.debug(event.data.text);

			if (prompt !== '') {
				await tick();
				submitPrompt(prompt);
			}
		}

		// Replace with your iframe's origin
		if (event.data.type === 'input:prompt') {
			console.debug(event.data.text);

			const inputElement = document.getElementById('chat-input');

			if (inputElement) {
				messageInput?.setText(event.data.text);
				inputElement.focus();
			}
		}

		if (event.data.type === 'input:prompt:submit') {
			console.debug(event.data.text);

			if (event.data.text !== '') {
				await tick();
				submitPrompt(event.data.text);
			}
		}
	};

	let pageSubscribe: any = null;
	onMount(async () => {
		loading = true;
		console.log('mounted');
		window.addEventListener('message', onMessageHandler);
		$socket?.on('chat-events', chatEventHandler);

		pageSubscribe = page.subscribe(async (p) => {
			if (p.url.pathname === '/') {
				await tick();
				initNewChat();
			}
		});

		const storageChatInput = sessionStorage.getItem(
			`chat-input${chatIdProp ? `-${chatIdProp}` : ''}`
		);

		if (!chatIdProp) {
			loading = false;
			await tick();
		}

		if (storageChatInput) {
			prompt = '';
			messageInput?.setText('');

			files = [];
			selectedToolIds = [];
			selectedFilterIds = [];
			webSearchEnabled = false;
			imageGenerationEnabled = false;
			codeInterpreterEnabled = false;

			try {
				const input = JSON.parse(storageChatInput);

				if (!$temporaryChatEnabled) {
					messageInput?.setText(input.prompt);
					files = input.files;
					selectedToolIds = input.selectedToolIds;
					selectedFilterIds = input.selectedFilterIds;
					webSearchEnabled = input.webSearchEnabled;
					imageGenerationEnabled = input.imageGenerationEnabled;
					codeInterpreterEnabled = input.codeInterpreterEnabled;
				}
			} catch (e) {}
		}

		showControls.subscribe(async (value) => {
			if (controlPane && !$mobile) {
				try {
					if (value) {
						controlPaneComponent.openPane();
					} else {
						controlPane.collapse();
					}
				} catch (e) {
					// ignore
				}
			}

			if (!value) {
				showCallOverlay.set(false);
				showOverview.set(false);
				showArtifacts.set(false);
			}
		});

		const chatInput = document.getElementById('chat-input');
		chatInput?.focus();

		chats.subscribe(() => {});
	});

	onDestroy(() => {
		pageSubscribe();
		chatIdUnsubscriber?.();
		window.removeEventListener('message', onMessageHandler);
		$socket?.off('chat-events', chatEventHandler);
	});

	// File upload functions

	const uploadGoogleDriveFile = async (fileData: any) => {
		console.log('Starting uploadGoogleDriveFile with:', {
			id: fileData.id,
			name: fileData.name,
			url: fileData.url,
			headers: {
				Authorization: `Bearer ${localStorage.token}`
			}
		});

		// Validate input
		if (!fileData?.id || !fileData?.name || !fileData?.url || !fileData?.headers?.Authorization) {
			throw new Error('Invalid file data provided');
		}

		const tempItemId = uuidv4();
		const fileItem = {
			type: 'file',
			file: '',
			id: null,
			url: fileData.url,
			name: fileData.name,
			collection_name: '',
			status: 'uploading',
			error: '',
			itemId: tempItemId,
			size: 0
		};

		try {
			files = [...files, fileItem];
			console.log('Processing web file with URL:', fileData.url);

			// Configure fetch options with proper headers
			const fetchOptions = {
				headers: {
					Authorization: fileData.headers.Authorization,
					Accept: '*/*'
				},
				method: 'GET'
			};

			// Attempt to fetch the file
			console.log('Fetching file content from Google Drive...');
			const fileResponse = await fetch(fileData.url, fetchOptions);

			if (!fileResponse.ok) {
				const errorText = await fileResponse.text();
				throw new Error(`Failed to fetch file (${fileResponse.status}): ${errorText}`);
			}

			// Get content type from response
			const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
			console.log('Response received with content-type:', contentType);

			// Convert response to blob
			console.log('Converting response to blob...');
			const fileBlob = await fileResponse.blob();

			if (fileBlob.size === 0) {
				throw new Error('Retrieved file is empty');
			}

			console.log('Blob created:', {
				size: fileBlob.size,
				type: fileBlob.type || contentType
			});

			// Create File object with proper MIME type
			const file = new File([fileBlob], fileData.name, {
				type: fileBlob.type || contentType
			});

			console.log('File object created:', {
				name: file.name,
				size: file.size,
				type: file.type
			});

			if (file.size === 0) {
				throw new Error('Created file is empty');
			}

			// If the file is an audio file, provide the language for STT.
			let metadata = null;
			if (
				(file.type.startsWith('audio/') || file.type.startsWith('video/')) &&
				$settings?.audio?.stt?.language
			) {
				metadata = {
					language: $settings?.audio?.stt?.language
				};
			}

			// Upload file to server
			console.log('Uploading file to server...');
			const uploadedFile = await uploadFile(localStorage.token, file, metadata);

			if (!uploadedFile) {
				throw new Error('Server returned null response for file upload');
			}

			console.log('File uploaded successfully:', uploadedFile);

			// Update file item with upload results
			fileItem.status = 'uploaded';
			fileItem.file = uploadedFile;
			fileItem.id = uploadedFile.id;
			fileItem.size = file.size;
			fileItem.collection_name = uploadedFile?.meta?.collection_name;
			fileItem.url = `${WEBUI_BASE_URL}/files/${uploadedFile.id}`;

			files = files;
			toast.success('File uploaded successfully');
		} catch (e: any) {
			console.error('Error uploading file:', e);
			files = files.filter((f) => f.itemId !== tempItemId);
			toast.error(
				`Error uploading file: ${e.message || 'Unknown error'}`
			);
		}
	};

	const uploadWeb = async (url: string) => {
		console.log(url);

		const fileItem: FileItem = {
			type: 'text',
			name: url,
			collection_name: '',
			status: 'uploading',
			url: url,
			error: ''
		};

		try {
			files = [...files, fileItem];
			const res = await processWeb(localStorage.token, '', url);

			if (res) {
				fileItem.status = 'uploaded';
				fileItem.collection_name = res.collection_name;
				fileItem.file = {
					...res.file,
					...fileItem.file
				};

				files = files;
			}
		} catch (e) {
			// Remove the failed doc from the files array
			files = files.filter((f) => f.name !== url);
			toast.error(JSON.stringify(e));
		}
	};

	const uploadYoutubeTranscription = async (url: string) => {
		console.log(url);

		const fileItem: FileItem = {
			type: 'text',
			name: url,
			collection_name: '',
			status: 'uploading',
			context: 'full',
			url: url,
			error: ''
		};

		try {
			files = [...files, fileItem];
			const res = await processYoutubeVideo(localStorage.token, url);

			if (res) {
				fileItem.status = 'uploaded';
				fileItem.collection_name = res.collection_name;
				fileItem.file = {
					...res.file,
					...fileItem.file
				};
				files = files;
			}
		} catch (e) {
			// Remove the failed doc from the files array
			files = files.filter((f) => f.name !== url);
			toast.error(`${e}`);
		}
	};

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		if ($user?.role !== 'admin' && $user?.permissions?.chat?.temporary_enforced) {
			await temporaryChatEnabled.set(true);
		}

		if (($settings as any)?.temporaryChatByDefault ?? false) {
			if ($temporaryChatEnabled === false) {
				await temporaryChatEnabled.set(true);
			} else if ($temporaryChatEnabled === null) {
				// if set to null set to false; refer to temp chat toggle click handler
				await temporaryChatEnabled.set(false);
			}
		}

		const availableModels = $models
			.filter((m) => !((m?.info?.meta as any)?.hidden ?? false))
			.map((m) => m.id);

		if ($page.url.searchParams.get('models') || $page.url.searchParams.get('model')) {
			const urlModels = (
				$page.url.searchParams.get('models') ||
				$page.url.searchParams.get('model') ||
				''
			)?.split(',');

			if (urlModels.length === 1) {
				const m = $models.find((m) => m.id === urlModels[0]);
				if (!m) {
					const modelSelectorButton = document.getElementById('model-selector-0-button');
					if (modelSelectorButton) {
						modelSelectorButton.click();
						await tick();

						const modelSelectorInput = document.getElementById('model-search-input');
						if (modelSelectorInput) {
							modelSelectorInput.focus();
							(modelSelectorInput as HTMLInputElement).value = urlModels[0];
							modelSelectorInput.dispatchEvent(new Event('input'));
						}
					}
				} else {
					selectedModels = urlModels;
				}
			} else {
				selectedModels = urlModels;
			}

			selectedModels = selectedModels.filter((modelId) =>
				$models.map((m) => m.id).includes(modelId)
			);
		} else {
			if (sessionStorage.selectedModels) {
				selectedModels = JSON.parse(sessionStorage.selectedModels);
				sessionStorage.removeItem('selectedModels');
			} else {
				if ($settings?.models) {
					selectedModels = $settings?.models;
				} else if ($config?.default_models) {
					console.log($config?.default_models.split(',') ?? '');
					selectedModels = $config?.default_models.split(',');
				}
			}
			selectedModels = selectedModels.filter((modelId) => availableModels.includes(modelId));
		}

		if (selectedModels.length === 0 || (selectedModels.length === 1 && selectedModels[0] === '')) {
			if (availableModels.length > 0) {
				selectedModels = [availableModels?.at(0) ?? ''];
			} else {
				selectedModels = [''];
			}
		}

		await showControls.set(false);
		await showCallOverlay.set(false);
		await showOverview.set(false);
		await showArtifacts.set(false);

		if ($page.url.pathname.includes('/c/')) {
			replaceState('/', {});
		}

		autoScroll = true;

		resetInput();
		await chatId.set('');
		await chatTitle.set('');

		history = {
			messages: {},
			currentId: null
		};

		chatFiles = [];
		params = {};

		if ($page.url.searchParams.get('youtube')) {
			uploadYoutubeTranscription(
				`https://www.youtube.com/watch?v=${$page.url.searchParams.get('youtube')}`
			);
		}

		const loadUrl = $page.url.searchParams.get('load-url');
		if (loadUrl) {
			await uploadWeb(loadUrl);
		}

		if ($page.url.searchParams.get('web-search') === 'true') {
			webSearchEnabled = true;
		}

		if ($page.url.searchParams.get('image-generation') === 'true') {
			imageGenerationEnabled = true;
		}

		if ($page.url.searchParams.get('code-interpreter') === 'true') {
			codeInterpreterEnabled = true;
		}

		if ($page.url.searchParams.get('tools')) {
			selectedToolIds = $page.url.searchParams
				.get('tools')
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id) || [];
		} else if ($page.url.searchParams.get('tool-ids')) {
			selectedToolIds = $page.url.searchParams
				.get('tool-ids')
				?.split(',')
				.map((id) => id.trim())
				.filter((id) => id) || [];
		}

		if ($page.url.searchParams.get('call') === 'true') {
			showCallOverlay.set(true);
			showControls.set(true);
		}

		if ($page.url.searchParams.get('q')) {
			const q = $page.url.searchParams.get('q') ?? '';
			messageInput?.setText(q);

			if (q) {
				if (($page.url.searchParams.get('submit') ?? 'true') === 'true') {
					await tick();
					submitPrompt(q);
				}
			}
		}

		selectedModels = selectedModels.map((modelId) =>
			$models.map((m: any) => m.id).includes(modelId) ? modelId : ''
		);

		const userSettings = await getUserSettings(localStorage.token);

		if (userSettings) {
			settings.set(userSettings.ui);
		} else {
			settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
		}

		const chatInput = document.getElementById('chat-input');
		setTimeout(() => chatInput?.focus(), 0);
	};

	const loadChat = async () => {
		chatId.set(chatIdProp);

		if ($temporaryChatEnabled) {
			temporaryChatEnabled.set(false);
		}

	chat = await getChatById(localStorage.token, get(chatId)).catch(async (error) => {
			await goto('/');
			return null;
		});

		if (chat) {
		tags = await getTagsById(localStorage.token, get(chatId)).catch(async (error) => {
				return [];
			});

			const chatContent = chat.chat;

			if (chatContent) {
				console.log(chatContent);

				selectedModels =
					(chatContent?.models ?? undefined) !== undefined
						? chatContent.models
						: [chatContent.models ?? ''];

				if (!($user?.role === 'admin' || ($user?.permissions?.chat?.multiple_models ?? true))) {
					selectedModels = selectedModels.length > 0 ? [selectedModels[0]] : [''];
				}

				oldSelectedModelIds = selectedModels;

				history =
					(chatContent?.history ?? undefined) !== undefined
						? chatContent.history
						: convertMessagesToHistory(chatContent.messages);

				chatTitle.set(chatContent.title);

				const userSettings = await getUserSettings(localStorage.token);

				if (userSettings) {
					await settings.set(userSettings.ui);
				} else {
					await settings.set(JSON.parse(localStorage.getItem('settings') ?? '{}'));
				}

				params = chatContent?.params ?? {};
				chatFiles = chatContent?.files ?? [];

				autoScroll = true;
				await tick();

				if (history.currentId) {
				for (const message of Object.values(history.messages)) {
					if ((message as any).role === 'assistant') {
						(message as any).done = true;
					}
				}
				}

			const taskRes = await getTaskIdsByChatId(localStorage.token, get(chatId)).catch((error) => {
					return null;
				});

				if (taskRes) {
					taskIds = taskRes.task_ids;
				}

				await tick();

				return true;
			} else {
				return null;
			}
		}
	};

	const scrollToBottom = async (behavior: ScrollBehavior = 'auto') => {
		await tick();
		if (messagesContainerElement) {
			messagesContainerElement.scrollTo({
				top: messagesContainerElement.scrollHeight,
				behavior
			});
		}
	};
	const chatCompletedHandler = async (chatId: string, modelId: string, responseMessageId: string, messages: any[]) => {
		const payload: any = {
			model: modelId,
			messages: messages.map((m: any) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				info: m.info ? m.info : undefined,
				timestamp: m.timestamp,
				...(m.usage ? { usage: m.usage } : {}),
				...(m.sources ? { sources: m.sources } : {})
			})),
			filter_ids: selectedFilterIds.length > 0 ? selectedFilterIds : undefined,
		model_item: get(models).find((m) => m.id === modelId),
		chat_id: chatId,
		session_id: (get(socket) as any)?.id,
			id: responseMessageId
		};

		const res = await chatCompleted(localStorage.token, payload).catch((error) => {
			toast.error(`${error}`);
			messages.at(-1).error = { content: error };

			return null;
		});

		if (res !== null && res.messages) {
			// Update chat history with the new messages
			for (const message of res.messages) {
				if (message?.id) {
					// Add null check for message and message.id
					history.messages[message.id] = {
						...history.messages[message.id],
						...(history.messages[message.id].content !== message.content
							? { originalContent: history.messages[message.id].content }
							: {}),
						...message
					};
				}
			}
		}

	await tick();

	if (get(chatId) == chatId) {
		if (!get(temporaryChatEnabled)) {
				chat = await updateChatById(localStorage.token, chatId, {
					models: selectedModels,
					messages: messages,
					history: history,
					params: params,
					files: chatFiles
				});

			currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
			}
		}

		taskIds = null;
	};

	const chatActionHandler = async (chatId: string, actionId: string, modelId: string, responseMessageId: string, event: any = null) => {
		const messages = createMessagesList(history, responseMessageId);

		const actionPayload: any = {
			model: modelId,
			messages: messages.map((m: any) => ({
				id: m.id,
				role: m.role,
				content: m.content,
				info: m.info ? m.info : undefined,
				timestamp: m.timestamp,
				...(m.sources ? { sources: m.sources } : {})
			})),
			...(event ? { event: event } : {}),
			chat_id: chatId,
			session_id: (get(socket) as any)?.id,
			id: responseMessageId
		};

		const res = await chatAction(localStorage.token, actionId, actionPayload).catch((error) => {
			toast.error(`${error}`);
			messages.at(-1).error = { content: error };
			return null;
		});

		if (res !== null && res.messages) {
			// Update chat history with the new messages
			for (const message of res.messages) {
				history.messages[message.id] = {
					...history.messages[message.id],
					...(history.messages[message.id].content !== message.content
						? { originalContent: history.messages[message.id].content }
						: {}),
					...message
				};
			}
		}

	if (get(chatId) == chatId) {
		if (!get(temporaryChatEnabled)) {
				chat = await updateChatById(localStorage.token, chatId, {
					models: selectedModels,
					messages: messages,
					history: history,
					params: params,
					files: chatFiles
				});

			currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
			}
		}
	};

	const getChatEventEmitter = async (modelId: string, chatId: string = '') => {
	return setInterval(() => {
			get(socket)?.emit('usage', {
				action: 'chat',
				model: modelId,
				chat_id: chatId
			});
		}, 1000);
	};

	const createMessagePair = async (userPrompt: string) => {
		messageInput?.setText('');
		if (selectedModels.length === 0) {
			toast.error('Model not selected');
		} else {
			// Phase 1: Artifact Integration - Preprocess prompt for artifact enhancement
			const { preprocessPrompt } = useArtifactIntegration();
			const enhancedPrompt = preprocessPrompt(userPrompt ? userPrompt : `[PROMPT]`);

			console.log('🎯 [Artifact Integration] Enhanced prompt:', {
				original: userPrompt?.substring(0, 100),
				enhanced: enhancedPrompt.substring(0, 100),
				wasEnhanced: enhancedPrompt !== userPrompt
			});

			const modelId = selectedModels[0];
		const model = get(models).filter((m) => m.id === modelId).at(0)!;

			const messages = createMessagesList(history, history.currentId);
			const parentMessage = messages.length !== 0 ? messages.at(-1) : null;

			const userMessageId = uuidv4();
			const responseMessageId = uuidv4();

			const userMessage = {
				id: userMessageId,
				parentId: parentMessage ? parentMessage.id : null,
				childrenIds: [responseMessageId],
				role: 'user',
				content: userPrompt ? userPrompt : `[PROMPT] ${userMessageId}`,
				timestamp: Math.floor(Date.now() / 1000)
			};

			const responseMessage = {
				id: responseMessageId,
				parentId: userMessageId,
				childrenIds: [],
				role: 'assistant',
				content: `[RESPONSE] ${responseMessageId}`,
				done: true,

				model: modelId,
				modelName: model.name ?? model.id,
				modelIdx: 0,
				timestamp: Math.floor(Date.now() / 1000)
			};

			if (parentMessage) {
				parentMessage.childrenIds.push(userMessageId);
				history.messages[parentMessage.id] = parentMessage;
			}
			history.messages[userMessageId] = userMessage;
			history.messages[responseMessageId] = responseMessage;

			history.currentId = responseMessageId;

			await tick();

			if (autoScroll) {
				scrollToBottom();
			}

			if (messages.length === 0) {
				await initChatHandler(history);
			} else {
				await saveChatHandler($chatId, history);
			}
		}
	};

	const addMessages = async ({ modelId, parentId, messages }: { modelId: string; parentId: string; messages: any[] }) => {
	const model = get(models).filter((m) => m.id === modelId).at(0);

		let parentMessage = history.messages[parentId];
		let currentParentId = parentMessage ? parentMessage.id : null;
		for (const message of messages) {
			let messageId = uuidv4();

			if (message.role === 'user') {
				const userMessage = {
					id: messageId,
					parentId: currentParentId,
					childrenIds: [],
					timestamp: Math.floor(Date.now() / 1000),
					...message
				};

				if (parentMessage) {
					parentMessage.childrenIds.push(messageId);
					history.messages[parentMessage.id] = parentMessage;
				}

				history.messages[messageId] = userMessage;
				parentMessage = userMessage;
				currentParentId = messageId;
			} else {
				// Ensure `model` is defined before accessing its properties
				if (!model) {
					console.error('Model is undefined when constructing responseMessage for', messageId);
					continue;
				}
				const responseMessage = {
					id: messageId,
					parentId: currentParentId,
					childrenIds: [],
					done: true,
					model: model.id,
					modelName: model.name ?? model.id,
					modelIdx: 0,
					timestamp: Math.floor(Date.now() / 1000),
					...message
				};

				if (parentMessage) {
					parentMessage.childrenIds.push(messageId);
					history.messages[parentMessage.id] = parentMessage;
				}

				history.messages[messageId] = responseMessage;
				parentMessage = responseMessage;
				currentParentId = messageId;
			}
		}

		history.currentId = currentParentId;
		await tick();

		if (autoScroll) {
			scrollToBottom();
		}

		if (messages.length === 0) {
			await initChatHandler(history);
		} else {
			await saveChatHandler(get(chatId), history);
		}
	};

	const chatCompletionEventHandler = async (data: any, message: any, chatId: string) => {
		const { id, done, choices, content, sources, selected_model_id, error, usage } = data;

		if (error) {
			await handleOpenAIError(error, message);
		}

		if (sources && !message?.sources) {
			message.sources = sources;
		}

		if (choices) {
			if (choices[0]?.message?.content) {
				// Non-stream response
				message.content += choices[0]?.message?.content;
			} else {
				// Stream response
				let value = choices[0]?.delta?.content ?? '';
				if (message.content == '' && value == '\n') {
					console.log('Empty response');
				} else {
					message.content += value;

					if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
						navigator.vibrate(5);
					}

					// Emit chat event for TTS
					const messageContentParts = getMessageContentParts(
						removeAllDetails(message.content),
						($config as any)?.audio?.tts?.split_on ?? 'punctuation'
					);
					messageContentParts.pop();

					// dispatch only last sentence and make sure it hasn't been dispatched before
					if (
						messageContentParts.length > 0 &&
						messageContentParts[messageContentParts.length - 1] !== message.lastSentence
					) {
						message.lastSentence = messageContentParts[messageContentParts.length - 1];
						eventTarget.dispatchEvent(
							new CustomEvent('chat', {
								detail: {
									id: message.id,
									content: messageContentParts[messageContentParts.length - 1]
								}
							})
						);
					}
				}
			}
		}

		if (content) {
			// REALTIME_CHAT_SAVE is disabled
			message.content = content;

			if (navigator.vibrate && ($settings?.hapticFeedback ?? false)) {
				navigator.vibrate(5);
			}

			// Emit chat event for TTS
			const messageContentParts = getMessageContentParts(
				removeAllDetails(message.content),
				($config as any)?.audio?.tts?.split_on ?? 'punctuation'
			);
			messageContentParts.pop();

			// dispatch only last sentence and make sure it hasn't been dispatched before
			if (
				messageContentParts.length > 0 &&
				messageContentParts[messageContentParts.length - 1] !== message.lastSentence
			) {
				message.lastSentence = messageContentParts[messageContentParts.length - 1];
				eventTarget.dispatchEvent(
					new CustomEvent('chat', {
						detail: {
							id: message.id,
							content: messageContentParts[messageContentParts.length - 1]
						}
					})
				);
			}
		}

		if (selected_model_id) {
			message.selectedModelId = selected_model_id;
			message.arena = true;
		}

		if (usage) {
			message.usage = usage;
		}

		history.messages[message.id] = message;

		if (done) {
			message.done = true;

			// Process response for artifacts when message is complete
			const artifactsEnabled = ($config as any)?.features?.enable_artifacts ?? true;
			if (artifactsEnabled) {
				try {
				const artifacts = await postprocessResponse(message.content, message.id, get(chatId));
					if ((artifacts as any).length > 0) {
						console.log(`🚀 [Artifact Integration] Found ${(artifacts as any).length} artifact(s) in response`);
					}
				} catch (error) {
					console.warn('[Artifact Integration] Error processing artifacts:', error);
				}
			}

			if ($settings.responseAutoCopy) {
				copyToClipboard(message.content);
			}

			if ($settings.responseAutoPlayback && !$showCallOverlay) {
				await tick();
				document.getElementById(`speak-button-${message.id}`)?.click();
			}

			// Emit chat event for TTS
			let lastMessageContentPart =
				getMessageContentParts(
					removeAllDetails(message.content),
					($config as any)?.audio?.tts?.split_on ?? 'punctuation'
				)?.at(-1) ?? '';
			if (lastMessageContentPart) {
				eventTarget.dispatchEvent(
					new CustomEvent('chat', {
						detail: { id: message.id, content: lastMessageContentPart }
					})
				);
			}
			eventTarget.dispatchEvent(
				new CustomEvent('chat:finish', {
					detail: {
						id: message.id,
						content: message.content
					}
				})
			);

			history.messages[message.id] = message;

			await tick();
			if (autoScroll) {
				scrollToBottom();
			}

			await chatCompletedHandler(
				chatId,
				message.model,
				message.id,
				createMessagesList(history, message.id)
			);
		}

		console.log(data);
		await tick();

		if (autoScroll) {
			scrollToBottom();
		}
	};

	//////////////////////////
	// Chat functions
	//////////////////////////

	const submitPrompt = async (userPrompt: string, { _raw = false }: { _raw?: boolean } = {}) => {
	console.log('submitPrompt', userPrompt, get(chatId));

		// Apply artifact preprocessing if not raw mode and artifacts are enabled
		const artifactsEnabled = ($config as any)?.features?.enable_artifacts ?? true; // Default to enabled
		let processedPrompt = userPrompt;

		if (!_raw && artifactsEnabled) {
			const { preprocessPrompt } = useArtifactIntegration();
			processedPrompt = preprocessPrompt(userPrompt);
			if (processedPrompt !== userPrompt) {
				console.log('🚀 [Artifact Integration] Prompt enhanced for artifact generation');
			}
		}

		// Phase 3.4: Apply prompt enhancement based on intent classification
		if (!_raw) {
			try {
				// Check if we have recent intent classification results
				const intentData = localStorage.getItem('lastIntentClassification');
				let shouldEnhance = false;
				let intentResult = null;

				if (intentData) {
					const parsed = JSON.parse(intentData);
					// Use intent data if it's recent (within 30 seconds) and matches prompt
					const isRecent = (Date.now() - parsed.timestamp) < 30000;
					const promptMatches = parsed.prompt === userPrompt.trim();

					if (isRecent && promptMatches && parsed.shouldEnhance) {
						shouldEnhance = true;
						intentResult = parsed;
						console.log('🎯 [Chat] Using cached intent classification result');
					}
				}

				if (shouldEnhance && intentResult) {
					console.log('🚀 [Chat] Enhancing prompt based on intent classification');

					const enhancementRequest: PromptEnhancementRequest = {
						originalPrompt: processedPrompt,
					sessionId: get(chatId) || 'default'
					};

					const enhancedResult = await promptEnhancer.enhancePrompt(enhancementRequest);

					if ((enhancedResult as any).wasEnhanced) {
						processedPrompt = (enhancedResult as any).enhancedPrompt;
						console.log('🚀 [Chat] Prompt successfully enhanced:', {
							original: userPrompt.substring(0, 100) + '...',
							enhanced: processedPrompt.substring(0, 100) + '...',
							confidence: (enhancedResult as any).confidence
						});

						// Clean up the cached intent data
						localStorage.removeItem('lastIntentClassification');
					}
				}
			} catch (error) {
				console.warn('🚀 [Chat] Prompt enhancement failed:', error);
				// Continue with original prompt if enhancement fails
			}
		}

	const _selectedModels = selectedModels.map((modelId) =>
		get(models).map((m) => m.id).includes(modelId) ? modelId : ''
	);

		if (JSON.stringify(selectedModels) !== JSON.stringify(_selectedModels)) {
			selectedModels = _selectedModels;
		}

		if (userPrompt === '' && files.length === 0) {
			toast.error('Please enter a prompt');
			return;
		}
		if (selectedModels.includes('')) {
			toast.error('Model not selected');
			return;
		}

		if (
			files.length > 0 &&
			files.filter((file) => file.type !== 'image' && file.status === 'uploading').length > 0
		) {
			toast.error(
				'Oops! There are files still uploading. Please wait for the upload to complete.'
			);
			return;
		}

		if (
			(($config as any)?.file?.max_count ?? null) !== null &&
			files.length + chatFiles.length > ($config as any)?.file?.max_count
		) {
			toast.error(
				`You can only chat with a maximum of ${($config as any)?.file?.max_count} file(s) at a time.`
			);
			return;
		}

		if (history?.currentId) {
			const lastMessage = history.messages[history.currentId] as any;
			if (lastMessage?.done != true) {
				// Response not done
				return;
			}

			if (lastMessage?.error && !lastMessage?.content) {
				// Error in response
				toast.error('Oops! There was an error in the previous response.');
				return;
			}
		}

		messageInput?.setText('');
		prompt = '';

		const messages = createMessagesList(history, history.currentId);
		const _files = JSON.parse(JSON.stringify(files));

		chatFiles.push(
			..._files.filter((item: any) =>
				['doc', 'text', 'file', 'note', 'chat', 'collection'].includes(item.type)
			)
		);
		chatFiles = chatFiles.filter(
			// Remove duplicates
			(item, index, array) =>
				array.findIndex((i) => JSON.stringify(i) === JSON.stringify(item)) === index
		);

		files = [];
		messageInput?.setText('');

		// Create user message
		let userMessageId = uuidv4();
		let userMessage = {
			id: userMessageId,
			parentId: messages.length !== 0 ? messages.at(-1).id : null,
			childrenIds: [],
			role: 'user',
			content: processedPrompt,  // Use processed (potentially enhanced) prompt
			files: _files.length > 0 ? _files : undefined,
			timestamp: Math.floor(Date.now() / 1000), // Unix epoch
			models: selectedModels
		};

		// Add message to history and Set currentId to messageId
		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		// Append messageId to childrenIds of parent message
		if (messages.length !== 0) {
			const lastMessage = messages.at(-1);
			if (lastMessage?.id) {
				const parentMessage = history.messages[lastMessage.id];
				if (parentMessage) {
					if (!parentMessage.childrenIds) {
						parentMessage.childrenIds = [];
					}
					parentMessage.childrenIds.push(userMessageId);
				} else {
					console.error('Parent message not found for userMessage:', lastMessage.id);
				}
			}
		}

		// focus on chat input
		const chatInput = document.getElementById('chat-input');
		chatInput?.focus();

		saveSessionSelectedModels();

		await sendMessage(history, userMessageId, { newChat: true });
	};

	const sendMessage = async (
		_history: any,
		parentId: string,
		{
			messages = null,
			modelId = null,
			modelIdx = null,
			newChat = false
		}: {
			messages?: any[] | null;
			modelId?: string | null;
			modelIdx?: number | null;
			newChat?: boolean;
		} = {}
	) => {
		console.log('🚀 [sendMessage] Starting with parentId:', parentId);
		console.log('🚀 [sendMessage] History messages before deep copy:', Object.keys(_history.messages));
		console.log('🚀 [sendMessage] Parent message exists before deep copy:', !!_history.messages[parentId]);

		if (autoScroll) {
			scrollToBottom();
		}

	let _chatId = JSON.parse(JSON.stringify(get(chatId)));
		_history = JSON.parse(JSON.stringify(_history));

		console.log('🚀 [sendMessage] History messages after deep copy:', Object.keys(_history.messages));
		console.log('🚀 [sendMessage] Parent message exists after deep copy:', !!_history.messages[parentId]);

		const responseMessageIds: Record<PropertyKey, string> = {};
		// If modelId is provided, use it, else use selected model
		let selectedModelIds = modelId
			? [modelId]
			: atSelectedModel !== undefined
				? [atSelectedModel.id]
				: selectedModels;

		// Create response messages for each selected model
		for (const [_modelIdx, modelId] of selectedModelIds.entries()) {
		const model = get(models).filter((m) => m.id === modelId).at(0)!;

			if (model) {
				let responseMessageId = uuidv4();
				console.log('🚀 [sendMessage] Creating responseMessage:', {
					responseMessageId,
					modelId,
					parentId
				});

				let responseMessage = {
					id: responseMessageId,
					parentId: parentId,
					childrenIds: [],
					role: 'assistant',
					content: '',
					model: model.id,
					modelName: model.name ?? model.id,
					modelIdx: modelIdx !== undefined ? modelIdx : _modelIdx,
					timestamp: Math.floor(Date.now() / 1000) // Unix epoch
				};

				// Add message to history and Set currentId to messageId
				history.messages[responseMessageId] = responseMessage;
				history.currentId = responseMessageId;
				console.log('🚀 [sendMessage] Stored responseMessage in history:', {
					responseMessageId,
					historyKeysAfterStore: Object.keys(history.messages),
					responseMessageExists: !!history.messages[responseMessageId]
				});

				// Append messageId to childrenIds of parent message
				if (parentId !== null && history.messages[parentId]) {
					// Add null check before accessing childrenIds
					if (!history.messages[parentId].childrenIds) {
						history.messages[parentId].childrenIds = [];
					}
					history.messages[parentId].childrenIds = [
						...history.messages[parentId].childrenIds,
						responseMessageId
					];
				} else {
					console.error('Parent message not found for responseMessage:', parentId);
				}

				responseMessageIds[`${modelId}-${modelIdx ?? _modelIdx}`] = responseMessageId;
				console.log('🚀 [sendMessage] Added to responseMessageIds:', {
					key: `${modelId}-${modelIdx ?? _modelIdx}`,
					responseMessageId,
					totalResponseMessageIds: Object.keys(responseMessageIds).length
				});
			}
		}
		history = history;

		// Create new chat if newChat is true and first user message
		if (newChat && _history.messages[_history.currentId].parentId === null) {
			_chatId = await initChatHandler(_history);
		}

		await tick();

		_history = JSON.parse(JSON.stringify(history));
		// Save chat after all messages have been created
		await saveChatHandler(_chatId, _history);

		await Promise.all(
			selectedModelIds.map(async (modelId, _modelIdx) => {
				console.log('modelId', modelId);
			const model = get(models).filter((m) => m.id === modelId).at(0);

				if (model) {
					// If there are image files, check if model is vision capable
					const hasImages = createMessagesList(_history, parentId).some((message: any) =>
						((message.files as FileItem[] | undefined)?.some((file: FileItem) => file.type === 'image')) ?? false
					);

					if (hasImages && !((model.info?.meta as any)?.capabilities?.vision ?? true)) {
						toast.error(
							`Model ${model.name ?? model.id} is not vision capable`
						);
					}

					let responseMessageId =
						responseMessageIds[`${modelId}-${modelIdx ?? _modelIdx}`];
					const chatEventEmitter = await getChatEventEmitter(model.id, _chatId);

					scrollToBottom();
					await sendMessageSocket(
						model,
						messages && messages.length > 0
							? messages
							: createMessagesList(_history, responseMessageId),
						_history,
						responseMessageId,
						_chatId
					);

					if (chatEventEmitter) clearInterval(chatEventEmitter);
				} else {
					toast.error(`Model ${modelId} not found`);
				}
			})
		);

		currentChatPage.set(1);
	chats.set(await getChatList(localStorage.token, get(currentChatPage)));
	};

	const getFeatures = () => {
		let features = {};

		if (($config as any)?.features)
			features = {
				image_generation:
					($config as any)?.features?.enable_image_generation &&
					($user?.role === 'admin' || ($user as any)?.permissions?.features?.image_generation)
						? imageGenerationEnabled
						: false,
				code_interpreter:
					($config as any)?.features?.enable_code_interpreter &&
					($user?.role === 'admin' || ($user as any)?.permissions?.features?.code_interpreter)
						? codeInterpreterEnabled
						: false,
				web_search:
					($config as any)?.features?.enable_web_search &&
					($user?.role === 'admin' || ($user as any)?.permissions?.features?.web_search)
						? webSearchEnabled
						: false
			};

		const currentModels = atSelectedModel?.id ? [atSelectedModel.id] : selectedModels;
		if (
			currentModels.filter(
				(model) => ($models.find((m) => m.id === model)?.info?.meta as any)?.capabilities?.web_search ?? true
			).length === currentModels.length
		) {
			if (($config as any)?.features?.enable_web_search && (($settings as any)?.webSearch ?? false) === 'always') {
				features = { ...features, web_search: true };
			}
		}

		if ($settings?.memory ?? false) {
			features = { ...features, memory: true };
		}

		return features;
	};

	const sendMessageSocket = async (model: any, _messages: any[], _history: any, responseMessageId: string, _chatId: string) => {
		const responseMessage = _history.messages[responseMessageId];
		if (!responseMessage) {
			console.error('ResponseMessage not found for ID:', responseMessageId);
			console.error('Available message IDs:', Object.keys(_history.messages));
			return;
		}

		if (!responseMessage.parentId) {
			console.error('ResponseMessage has no parentId:', responseMessage);
			return;
		}

		const userMessage = _history.messages[responseMessage.parentId];
		if (!userMessage) {
			console.error('UserMessage not found for parentId:', responseMessage.parentId);
			console.error('Available message IDs:', Object.keys(_history.messages));
			return;
		}

		const chatMessageFiles = _messages
			.filter((message: any) => message.files)
			.flatMap((message: any) => message.files);

		// Filter chatFiles to only include files that are in the chatMessageFiles
		chatFiles = chatFiles.filter((item: any) => {
			const fileExists = chatMessageFiles.some((messageFile: any) => messageFile.id === item.id);
			return fileExists;
		});

		let files = JSON.parse(JSON.stringify(chatFiles));
		files.push(
			...(userMessage?.files ?? []).filter((item: any) =>
				['doc', 'text', 'file', 'note', 'chat', 'collection'].includes(item.type)
			)
		);
		// Remove duplicates
		files = files.filter(
			(item: any, index: number, array: any[]) =>
				array.findIndex((i: any) => JSON.stringify(i) === JSON.stringify(item)) === index
		);

		scrollToBottom();
		eventTarget.dispatchEvent(
			new CustomEvent('chat:start', {
				detail: {
					id: responseMessageId
				}
			})
		);
		await tick();

		let userLocation;
		if ($settings?.userLocation) {
			userLocation = await getAndUpdateUserLocation(localStorage.token).catch((err) => {
				console.error(err);
				return undefined;
			});
		}

		const stream =
			(model?.info?.params as any)?.stream_response ??
			($settings as any)?.params?.stream_response ??
			(params as any)?.stream_response ??
			true;

		let messages = [
			(params as any)?.system || ($settings as any).system
				? {
						role: 'system',
						content: `${(params as any)?.system ?? ($settings as any)?.system ?? ''}`
					}
				: undefined,
			..._messages.map((message: any) => ({
				...message,
				content: processDetails(message.content)
			}))
		].filter((message: any) => message);

		messages = messages
			.map((message: any, idx: number, arr: any[]) => ({
				role: message.role,
				...((message.files?.filter((file: any) => file.type === 'image').length ?? 0) > 0 &&
				message.role === 'user'
					? {
							content: [
								{
									type: 'text',
									text: message?.merged?.content ?? message.content
								},
								...message.files
									.filter((file: any) => file.type === 'image')
									.map((file: any) => ({
										type: 'image_url',
										image_url: {
											url: file.url
										}
									}))
							]
						}
					: {
							content: message?.merged?.content ?? message.content
						})
			}))
			.filter((message: any) => message?.role === 'user' || message?.content?.trim());

		const toolIds: string[] = [];
		const toolServerIds: any[] = [];

		for (const toolId of selectedToolIds) {
			if (toolId.startsWith('direct_server:')) {
				let serverId = toolId.replace('direct_server:', '');
				// Check if serverId is a number
				if (!isNaN(parseInt(serverId))) {
					toolServerIds.push(parseInt(serverId));
				} else {
					toolServerIds.push(serverId);
				}
			} else {
				toolIds.push(toolId);
			}
		}


			// Log the final prompt sent to LLM
			console.log("=== FINAL PROMPT SENT TO LLM ===");
			console.log("Model ID:", model.id);
			console.log("Messages:", messages);
			console.log("Stream:", stream);
			console.log("===================================");

		const res = await generateOpenAIChatCompletion(
			localStorage.token,
			{
				stream: stream,
				model: model.id,
				messages: messages,
				params: {
			...(get(settings) as any)?.params,
			...params,
			stop:
				((params as any)?.stop ?? (get(settings) as any)?.params?.stop ?? undefined)
					? ((params as any)?.stop.split(',').map((token: string) => token.trim()) ?? (get(settings) as any).params.stop)
							: undefined
				},
				files: (files?.length ?? 0) > 0 ? files : undefined,
				filter_ids: selectedFilterIds.length > 0 ? selectedFilterIds : undefined,
				tool_ids: toolIds.length > 0 ? toolIds : undefined,
		tool_servers: (get(toolServers) ?? []).filter(
					(server: any, idx: number) => toolServerIds.includes(idx) || toolServerIds.includes(server?.id)
				),
				features: getFeatures(),
		variables: {
			...getPromptVariables(get(user)?.name, get(settings)?.userLocation ? userLocation : undefined)
		},
		model_item: get(models).find((m) => m.id === model.id),
		session_id: get(socket)?.id,
		chat_id: get(chatId),
				id: responseMessageId,

				background_tasks: {
			...(!get(temporaryChatEnabled) &&
					(messages.length == 1 ||
						(messages.length == 2 &&
							messages.at(0)?.role === 'system' &&
							messages.at(1)?.role === 'user')) &&
					(selectedModels[0] === model.id || atSelectedModel !== undefined)
						? {
						title_generation: get(settings)?.title?.auto ?? true,
						tags_generation: get(settings)?.autoTags ?? true
							}
						: {}),
			follow_up_generation: get(settings)?.autoFollowUps ?? true
				},

				...(stream && (model.info?.meta?.capabilities?.usage ?? false)
					? {
							stream_options: {
								include_usage: true
							}
						}
					: {})
			},
			`${WEBUI_BASE_URL}/api`
		).catch(async (error) => {
			console.log(error);

			let errorMessage = error;
			if (error?.error?.message) {
				errorMessage = error.error.message;
			} else if (error?.message) {
				errorMessage = error.message;
			}

			if (typeof errorMessage === 'object') {
				errorMessage = `Uh-oh! There was an issue with the response.`;
			}

			toast.error(`${errorMessage}`);
			responseMessage.error = {
				content: error
			};

			responseMessage.done = true;

			history.messages[responseMessageId] = responseMessage;
			history.currentId = responseMessageId;

			return null;
		});

		if (res) {
			if (res.error) {
				await handleOpenAIError(res.error, responseMessage);
			} else {
				if (taskIds) {
					taskIds.push(res.task_id);
				} else {
					taskIds = [res.task_id];
				}
			}
		}

		await tick();
		scrollToBottom();
	};

	const handleOpenAIError = async (error: any, responseMessage: MessageType) => {
		let errorMessage = '';
		let innerError;

		if (error) {
			innerError = error;
		}

		console.error(innerError);
		if ('detail' in innerError) {
			// FastAPI error
			toast.error(innerError.detail);
			errorMessage = innerError.detail;
		} else if ('error' in innerError) {
			// OpenAI error
			if ('message' in innerError.error) {
				toast.error(innerError.error.message);
				errorMessage = innerError.error.message;
			} else {
				toast.error(innerError.error);
				errorMessage = innerError.error;
			}
		} else if ('message' in innerError) {
			// OpenAI error
			toast.error(innerError.message);
			errorMessage = innerError.message;
		}

		responseMessage.error = {
			content: `Uh-oh! There was an issue with the response.` + '\n' + errorMessage
		};
		responseMessage.done = true;

		if (responseMessage.statusHistory) {
			responseMessage.statusHistory = responseMessage.statusHistory.filter(
				(status) => status.action !== 'knowledge_search'
			);
		}

		history.messages[responseMessage.id] = responseMessage;
	};

	const stopResponse = async () => {
		if (taskIds) {
			for (const taskId of taskIds) {
				const res = await stopTask(localStorage.token, taskId).catch((error) => {
					toast.error(`${error}`);
					return null;
				});
			}

			taskIds = null;

			if (history.currentId) {
				const responseMessage = history.messages[history.currentId];
				// Set all response messages to done
				if (responseMessage?.parentId && history.messages[responseMessage.parentId]) {
					for (const messageId of history.messages[responseMessage.parentId].childrenIds || []) {
						if (history.messages[messageId]) {
							history.messages[messageId].done = true;
						}
					}
				} else {
					console.error('Parent message not found for responseMessage in stopResponse:', responseMessage?.parentId);
				}

				history.messages[history.currentId] = responseMessage;

				if (autoScroll) {
					scrollToBottom();
				}
			}
		}

		if (generating) {
			generating = false;
			generationController?.abort();
			generationController = null;
		}
	};

	const submitMessage = async (parentId: string | null, prompt: string) => {
		// Apply artifact preprocessing for enhanced prompts
		const { preprocessPrompt } = useArtifactIntegration();
		let userPrompt = preprocessPrompt(prompt);

		if (userPrompt !== prompt) {
			console.log('🚀 [Artifact Integration] submitMessage: Enhanced prompt for artifacts');
		}

		let userMessageId = uuidv4();

		let userMessage = {
			id: userMessageId,
			parentId: parentId,
			childrenIds: [],
			role: 'user',
			content: userPrompt,
			models: selectedModels,
			timestamp: Math.floor(Date.now() / 1000) // Unix epoch
		};

		if (parentId !== null && history.messages[parentId]) {
			if (!history.messages[parentId].childrenIds) {
				history.messages[parentId].childrenIds = [];
			}
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				userMessageId
			];
		} else if (parentId !== null) {
			console.error('Parent message not found in submitMessage:', parentId);
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();

		if (autoScroll) {
			scrollToBottom();
		}

		await sendMessage(history, userMessageId);
	};

	const regenerateResponse = async (message: MessageType, suggestionPrompt: string | null = null) => {
		console.log('regenerateResponse');

		if (history.currentId && message?.parentId && history.messages[message.parentId]) {
			let userMessage = history.messages[message.parentId];

			// Apply artifact preprocessing to suggestion prompt if provided
			let processedSuggestionPrompt = suggestionPrompt;
			if (suggestionPrompt) {
				const { preprocessPrompt } = useArtifactIntegration();
				processedSuggestionPrompt = preprocessPrompt(suggestionPrompt);
				if (processedSuggestionPrompt !== suggestionPrompt) {
					console.log('🚀 [Artifact Integration] regenerateResponse: Enhanced suggestion prompt');
				}
			}

			if (autoScroll) {
				scrollToBottom();
			}

			await sendMessage(history, userMessage.id, {
				...(processedSuggestionPrompt
					? {
							messages: [
								...createMessagesList(history, message.id),
								{
									role: 'user',
									content: processedSuggestionPrompt
								}
							]
						}
					: {}),
				...((userMessage?.models ?? [...selectedModels]).length > 1
					? {
							// If multiple models are selected, use the model from the message
							modelId: message.model,
							modelIdx: message.modelIdx
						}
					: {})
			});
		}
	};

	const continueResponse = async () => {
		console.log('continueResponse');
	const _chatId = JSON.parse(JSON.stringify(get(chatId)));

		if (history.currentId && history.messages[history.currentId].done == true) {
			const responseMessage = history.messages[history.currentId];
			responseMessage.done = false;
			await tick();

		const model = get(models)
			.filter((m) => m.id === (responseMessage?.selectedModelId ?? responseMessage.model))
				.at(0);

			if (model) {
				await sendMessageSocket(
					model,
					createMessagesList(history, responseMessage.id),
					history,
					responseMessage.id,
					_chatId
				);
			}
		}
	};

	const mergeResponses = async (messageId: string, responses: any[], _chatId: string) => {
		console.log('mergeResponses', messageId, responses);
		const message = history.messages[messageId];
		if (!message) {
			console.error('Message not found for mergeResponses:', messageId);
			return;
		}
		const mergedResponse = {
			status: true,
			content: ''
		};
		message.merged = mergedResponse;
		history.messages[messageId] = message;

		try {
			generating = true;
			if (!message.parentId) {
				console.error('No parent message ID for mergeResponses:', messageId);
				return;
			}
			const parentMessage = history.messages[message.parentId];
			if (!parentMessage) {
				console.error('Parent message not found for mergeResponses:', message.parentId);
				return;
			}
			if (!message.model) {
				console.error('No model specified for mergeResponses:', messageId);
				return;
			}
			const [res, controller] = await generateMoACompletion(
				localStorage.token,
				message.model,
				parentMessage.content,
				responses
			);

			if (res && res instanceof Response && res.ok && res.body && generating) {
				generationController = controller;
			const splitLargeChunks = typeof get(settings).splitLargeChunks === 'boolean' ? get(settings).splitLargeChunks : false;
				const textStream = await createOpenAITextStream(res.body, splitLargeChunks);
				for await (const update of textStream) {
					const { value, done, sources, error, usage } = update;
					if (error || done) {
						generating = false;
						generationController = null;
						break;
					}

					if (mergedResponse.content == '' && value == '\n') {
						continue;
					} else {
						mergedResponse.content += value;
						history.messages[messageId] = message;
					}

					if (autoScroll) {
						scrollToBottom();
					}
				}

				await saveChatHandler(_chatId, history);
			} else {
				console.error(res);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const initChatHandler = async (history: HistoryType) => {
	let _chatId = get(chatId);
	if (!get(temporaryChatEnabled)) {
			chat = await createNewChat(
				localStorage.token,
				{
						id: _chatId,
						title: tr('New Chat'),
					models: selectedModels,
			system: get(settings).system ?? undefined,
					params: params,
					history: history,
					messages: createMessagesList(history, history.currentId),
					tags: [],
					timestamp: Date.now()
				},
		(get(selectedFolder) as any)?.id
			);

			_chatId = chat.id;
			await chatId.set(_chatId);

			replaceState(`/c/${_chatId}`, {});

			await tick();

			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
			currentChatPage.set(1);

			selectedFolder.set(null);
		} else {
			_chatId = 'local';
			await chatId.set('local');
		}
		await tick();

		return _chatId;
	};

	const saveChatHandler = async (_chatId: string, history: HistoryType) => {
	if (get(chatId) == _chatId) {
		if (!get(temporaryChatEnabled)) {
				chat = await updateChatById(localStorage.token, _chatId, {
					models: selectedModels,
					history: history,
					messages: createMessagesList(history, history.currentId),
					params: params,
					files: chatFiles
				});
				currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
			}
		}
	};

	const MAX_DRAFT_LENGTH = 5000;
	let saveDraftTimeout: number | null = null;

	// Local type for draft persistence
	type Draft = { prompt: string | null };

	const saveDraft = async (draft: Draft, chatId: string | null = null) => {
		if (saveDraftTimeout !== null) {
			window.clearTimeout(saveDraftTimeout);
		}

		if (draft.prompt !== null && draft.prompt.length < MAX_DRAFT_LENGTH) {
			saveDraftTimeout = window.setTimeout(async () => {
				await sessionStorage.setItem(
					`chat-input${chatId ? `-${chatId}` : ''}`,
					JSON.stringify(draft)
				);
			}, 500);
		} else {
			sessionStorage.removeItem(`chat-input${chatId ? `-${chatId}` : ''}`);
		}
	};

	const clearDraft = async (chatId: string | null = null) => {
		if (saveDraftTimeout !== null) {
			window.clearTimeout(saveDraftTimeout);
		}
		await sessionStorage.removeItem(`chat-input${chatId ? `-${chatId}` : ''}`);
	};

	const moveChatHandler = async (chatId: string, folderId: string) => {
		if (chatId && folderId) {
			const res = await updateChatFolderIdById(localStorage.token, chatId, folderId).catch(
				(error) => {
					toast.error(`${error}`);
					return null;
				}
			);

			if (res) {
				currentChatPage.set(1);
			await chats.set(await getChatList(localStorage.token, get(currentChatPage)));
				await pinnedChats.set(await getPinnedChatList(localStorage.token));

				toast.success(tr('Chat moved successfully'));
			}
		} else {
			toast.error(tr('Failed to move chat'));
		}
	};
</script>

<svelte:head>
	<title>
		{$chatTitle
			? `${$chatTitle.length > 30 ? `${$chatTitle.slice(0, 30)}...` : $chatTitle} • ${$WEBUI_NAME}`
			: `${$WEBUI_NAME}`}
	</title>
</svelte:head>

<audio id="audioElement" src="" style="display: none;"></audio>

<EventConfirmDialog
	bind:show={showEventConfirmation}
	title={eventConfirmationTitle}
	message={eventConfirmationMessage}
	input={eventConfirmationInput}
	inputPlaceholder={eventConfirmationInputPlaceholder}
	inputValue={eventConfirmationInputValue}
	on:confirm={(e) => {
		if (e.detail) {
			eventCallback(e.detail);
		} else {
			eventCallback(true);
		}
	}}
	on:cancel={() => {
		eventCallback(false);
	}}
/>

<div
	class="h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
		? '  md:max-w-[calc(100%-260px)]'
		: ' '} w-full max-w-full flex flex-col"
	id="chat-container"
>
	{#if !loading}
		<div in:fade={{ duration: 50 }} class="w-full h-full flex flex-col">
			{#if selectedFolderMeta?.background_image_url}
				<div class="absolute {$showSidebar
						? 'md:max-w-[calc(100%-260px)] md:translate-x-[260px]'
						: ''} top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
					style="background-image: url({selectedFolderMeta?.background_image_url})  "></div>

				<div class="absolute top-0 left-0 w-full h-full bg-linear-to-t from-white to-white/85 dark:from-gray-900 dark:to-gray-900/90 z-0"></div>
			{:else if $settings?.backgroundImageUrl ?? $config?.license_metadata?.background_image_url ?? null}
				<div class="absolute {$showSidebar
						? 'md:max-w-[calc(100%-260px)] md:translate-x-[260px]'
						: ''} top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat"
					style="background-image: url({$settings?.backgroundImageUrl ??
						$config?.license_metadata?.background_image_url})  "></div>

				<div class="absolute top-0 left-0 w-full h-full bg-linear-to-t from-white to-white/85 dark:from-gray-900 dark:to-gray-900/90 z-0"></div>
			{/if}

			<div class="w-full h-full flex horizontal">
				<div class="h-full flex relative max-w-full flex-col" style="flex: 1; min-width: 30%">
					<Navbar
						bind:this={navbarElement}
						chat={{
							id: $chatId,
							chat: {
								title: $chatTitle,
								models: selectedModels,
								system: $settings.system ?? undefined,
								params: params,
								history: history,
								timestamp: Date.now()
							}
						}}
						{history}
						bind:selectedModels
						shareEnabled={!!history.currentId}
						{initNewChat}
						archiveChatHandler={() => {}}
						{moveChatHandler}
						onSaveTempChat={async () => {
							try {
								if (!history?.currentId || !Object.keys(history.messages).length) {
									toast.error(tr('No conversation to save'));
									return;
								}
								const messages = createMessagesList(history, history.currentId);
								const title = messages.find((m) => m.role === 'user')?.content ?? tr('New Chat');

								const savedChat = await createNewChat(
									localStorage.token,
									{
										id: uuidv4(),
										title: title.length > 50 ? `${title.slice(0, 50)}...` : title,
										models: selectedModels,
										history: history,
										messages: messages,
										timestamp: Date.now()
									},
									null
								);

								if (savedChat) {
									temporaryChatEnabled.set(false);
									chatId.set(savedChat.id);
									chats.set(await getChatList(localStorage.token, $currentChatPage));

									await goto(`/c/${savedChat.id}`);
									toast.success(tr('Conversation saved successfully'));
								}
							} catch (error) {
								console.error('Error saving conversation:', error);
								toast.error(tr('Failed to save conversation'));
							}
						}}
					/>

					<div class="flex flex-col flex-auto z-10 w-full overflow-auto">
						{#if ($settings?.landingPageMode === 'chat' && !$selectedFolder) || createMessagesList(history, history.currentId).length > 0}
							<div
								class=" pb-2.5 flex flex-col justify-between w-full flex-auto overflow-auto h-0 max-w-full z-10 scrollbar-hidden"
								id="messages-container"
								bind:this={messagesContainerElement}
								on:scroll={(e) => {
									autoScroll =
										messagesContainerElement.scrollHeight - messagesContainerElement.scrollTop <=
										messagesContainerElement.clientHeight + 5;
								}}
							>
								<div class=" h-full w-full flex flex-col">
									<Messages
										chatId={$chatId}
										bind:history
										bind:autoScroll
										bind:prompt
										setInputText={(text: string) => {
											messageInput?.setText(text);
										}}
										{selectedModels}
										{atSelectedModel}
										{sendMessage}
										{showMessage}
										{submitMessage}
										{regenerateResponse}
										{continueResponse}
										{mergeResponses}
										{chatActionHandler}
										{addMessages}
										topPadding={true}
										bottomPadding={files.length > 0}
										{onSelect}
									/>
								</div>
							</div>

							<div class=" pb-2">
								<MessageInput
									bind:this={messageInput}
									{history}
									{taskIds}
									{selectedModels}
									bind:files
									bind:prompt
									bind:autoScroll
									bind:selectedToolIds
									bind:selectedFilterIds
									bind:imageGenerationEnabled
									bind:codeInterpreterEnabled
									bind:webSearchEnabled
									bind:atSelectedModel
									bind:showCommands
									toolServers={$toolServers}
									{generating}
									{stopResponse}
									{createMessagePair}
									onChange={(data) => {
										if (!$temporaryChatEnabled) {
											saveDraft(data, $chatId);
										}
									}}
									on:upload={async (e) => {
										const { type, data } = e.detail;

										if (type === 'web') {
											await uploadWeb(data);
										} else if (type === 'youtube') {
											await uploadYoutubeTranscription(data);
										} else if (type === 'google-drive') {
											await uploadGoogleDriveFile(data);
										}
									}}
									onsubmit={async (e) => {
										clearDraft();

										// Handle both old and new event formats
										const eventData = e.detail;
										let promptText = '';

										if (typeof eventData === 'string') {
											// Legacy format - just the prompt string
											promptText = eventData;
										} else if (eventData && typeof eventData === 'object') {
											// New format with intent data
											promptText = eventData.prompt || '';

											// Store intent data for prompt enhancement
											if (eventData.intentClassification && eventData.shouldEnhance) {
												localStorage.setItem('lastIntentClassification', JSON.stringify({
													...eventData.intentClassification,
													timestamp: Date.now(),
													prompt: promptText.trim()
												}));
												console.log('🎯 [Chat] Stored intent classification for prompt enhancement');
											}
										}

										if (promptText || files.length > 0) {
											await tick();
											submitPrompt(promptText.replaceAll('\n\n', '\n'));
										}
									}}
								/>

								<div
									class="absolute bottom-1 text-xs text-gray-500 text-center line-clamp-1 right-0 left-0"
								>
									<!-- {$i18n.t('LLMs can make mistakes. Verify important information.')} -->
								</div>
							</div>
						{:else}
							<div class="flex items-center h-full">
								<Placeholder
									{history}
									{selectedModels}
									bind:messageInput
									bind:files
									bind:prompt
									bind:autoScroll
									bind:selectedToolIds
									bind:imageGenerationEnabled
									bind:codeInterpreterEnabled
									bind:webSearchEnabled
									bind:atSelectedModel
									bind:showCommands
									toolServers={$toolServers}
									{stopResponse}
									{createMessagePair}
									{onSelect}
									onChange={(data) => {
										if (!$temporaryChatEnabled) {
											saveDraft(data);
										}
									}}
									on:upload={async (e) => {
										const { type, data } = e.detail;

										if (type === 'web') {
											await uploadWeb(data);
										} else if (type === 'youtube') {
											await uploadYoutubeTranscription(data);
										}
									}}
									onsubmit={async (e) => {
										clearDraft();
										if (e.detail || files.length > 0) {
											await tick();
											const prompt = typeof e.detail === 'string' ? e.detail.replaceAll('\n\n', '\n') : e.detail;
											submitPrompt(prompt);
										}
									}}
								/>
							</div>
						{/if}
					</div>
				</div>

				<ChatControls
					bind:this={controlPaneComponent}
					bind:history
					bind:chatFiles
					bind:params
					bind:files
					bind:pane={controlPane}
					chatId={$chatId}
					modelId={selectedModelIds?.at(0) ?? undefined}
					models={$models.filter((m) => selectedModelIds.includes(m.id))}
					{submitPrompt}
					{stopResponse}
					{showMessage}
					{eventTarget}
				/>
			</div>
		</div>
	{:else if loading}
		<div class=" flex items-center justify-center h-full w-full">
			<div class="m-auto">
				<Spinner className="size-5" />
			</div>
		</div>
	{/if}
</div>
