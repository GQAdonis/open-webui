/**
 * Chat-related type definitions
 * Consolidated from various components to avoid duplication
 */

// File handling types
export type FileItem = {
	type: string;
	file?: any;
	id?: string | null;
	url?: string;
	name?: string;
	collection_name?: string;
	status?: string;
	error?: string;
	itemId?: string;
	size?: number;
	context?: string;
};

// Message types
export type MessageType = {
    id: string;
    parentId: string | null;
    childrenIds: string[];
    role: string;
    content: string;
    timestamp: number;
    done?: boolean;
    error?: boolean | { content?: string; [k: string]: unknown };
    model?: string;
    modelName?: string;
    modelIdx?: number | null;
    files?: any[];
    sources?: any[];
    citations?: any[];
    usage?: any;
    selectedModelId?: string;
    arena?: boolean;
    statusHistory?: Array<{
        done?: boolean;
        action?: string;
        description?: string;
        urls?: string[];
        query?: string;
        hidden?: boolean;
    }>;
    status?: {
        done?: boolean;
        action?: string;
        description?: string;
        urls?: string[];
        query?: string;
    };
    code_executions?: Array<{
        uuid: string;
        name: string;
        code: string;
        language?: string;
        result?: {
            error?: string;
            output?: string;
            files?: { name: string; url: string }[];
        };
    }>;
    followUps?: any[];
    merged?: { status?: boolean; content?: string; timestamp?: number };
    info?: any;
    annotation?: { type?: string; rating?: number; tags?: string[] } | undefined;
    models?: string[];
};

export type HistoryType = {
	messages: Record<string, MessageType>;
	currentId: string | null;
};

// Folder types
export type FolderMeta = { 
	background_image_url?: string;
};

export type Folder = { 
	id?: string; 
	name?: string; 
	meta?: FolderMeta;
};

// Model selection types - fixing the string[] vs [""] issue
export type ModelSelection = string[] | [""];

// Draft types for chat input persistence
export type Draft = { 
	prompt: string | null;
};

// Chat component prop types
export type ChatComponentProps = {
	selectedModels: ModelSelection;
	history: HistoryType;
	files: FileItem[];
	// Add other common props as needed
};

// Placeholder component specific types
export type PlaceholderProps = {
	selectedModels: ModelSelection;
	history?: HistoryType;
	// Add other placeholder-specific props
};

// Function types for chat operations
export type ChatFunction = (...args: any[]) => any;
export type SetInputTextFunction = (text: string) => void;
export type GotoMessageFunction = (messageId: string) => void;
export type ShowMessageFunction = (messageId: string) => void;
export type UpdateChatFunction = () => Promise<void>;
export type EditMessageFunction = (messageId: string, content: string) => void;
export type SaveMessageFunction = (messageId: string) => void;
export type RateMessageFunction = (messageId: string, rating: number) => void;
export type ActionMessageFunction = (messageId: string, action: string) => void;
export type DeleteMessageFunction = (messageId: string) => void;
export type SubmitMessageFunction = (content: string) => void;
export type RegenerateResponseFunction = (messageId: string) => void;
export type ContinueResponseFunction = (messageId: string) => void;
export type MergeResponsesFunction = (messageIds: string[]) => void;
export type AddMessagesFunction = (messages: MessageType[]) => void;
export type TriggerScrollFunction = () => void;

// Advanced Parameters types - commonly used in chat settings
export type AdvancedParams = {
	stream_response?: boolean | null;
	stream_delta_chunk_size?: number | null;
	function_calling?: string | null;
	reasoning_tags?: boolean | string[] | null;
	seed?: number | null;
	stop?: string | null;
	temperature?: number | null;
	reasoning_effort?: string | null;
	logit_bias?: string | null;
	max_tokens?: number | null;
	top_k?: number | null;
	top_p?: number | null;
	min_p?: number | null;
	frequency_penalty?: number | null;
	presence_penalty?: number | null;
	mirostat?: number | null;
	mirostat_eta?: number | null;
	mirostat_tau?: number | null;
	repeat_last_n?: number | null;
	tfs_z?: number | null;
	repeat_penalty?: number | null;
	use_mmap?: boolean | null;
	use_mlock?: boolean | null;
	think?: boolean | null;
	format?: string | null;
	num_keep?: number | null;
	num_ctx?: number | null;
	num_batch?: number | null;
	num_thread?: number | null;
	num_gpu?: number | null;
	keep_alive?: string | null;
	custom_params?: Record<string, any>;
};
