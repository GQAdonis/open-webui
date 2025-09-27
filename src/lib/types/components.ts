/**
 * Common component prop types
 * Consolidated from various components to avoid duplication
 */

import type { Writable } from 'svelte/store';
import type { i18n as i18nType } from 'i18next';
import type { HistoryType, ModelSelection, AdvancedParams, MessageType } from './chat';

// Common context types
export type I18nContext = Writable<i18nType>;

// Message component props
export type MessageComponentProps = {
	chatId: string;
	selectedModels: ModelSelection;
	idx?: number;
	history: HistoryType;
	messageId: string;
	user?: any;
	setInputText?: Function;
	gotoMessage?: Function;
	showPreviousMessage?: Function;
	showNextMessage?: Function;
	updateChat?: Function;
	editMessage?: Function;
	saveMessage?: Function;
	deleteMessage?: Function;
	rateMessage?: Function;
	actionMessage?: Function;
	submitMessage?: Function;
	regenerateResponse?: Function;
	continueResponse?: Function;
	mergeResponses?: Function;
	addMessages?: Function;
	triggerScroll?: Function;
	readOnly?: boolean;
	editCodeBlock?: boolean;
	topPadding?: boolean;
};

// Response message specific props
export type ResponseMessageProps = MessageComponentProps & {
	isLastMessage?: boolean;
	siblings?: string[];
};

// Multi-response message props
export type MultiResponseMessageProps = MessageComponentProps & {
	isLastMessage: boolean;
};

// Advanced parameters component props
export type AdvancedParamsProps = {
	params: AdvancedParams;
	onParamsChange?: (params: AdvancedParams) => void;
};

// Common event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type ClickHandler = EventHandler<MouseEvent>;
export type ChangeHandler = EventHandler<Event & { target: EventTarget & { value: string } }>;
export type KeyHandler = EventHandler<KeyboardEvent>;

// Input component types
export type InputChangeEvent = Event & {
	target: EventTarget & {
		value: string;
	} | null;
};

// More specific event types for common scenarios
export type SelectChangeEvent = Event & {
	target: (EventTarget & HTMLSelectElement) | null;
};

export type InputEvent = Event & {
	target: (EventTarget & HTMLInputElement) | null;
};

export type TextareaEvent = Event & {
	target: (EventTarget & HTMLTextAreaElement) | null;
};
