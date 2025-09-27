<script lang="ts">
	import { run } from 'svelte/legacy';

import { onMount, createEventDispatcher } from 'svelte';
import type { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { xml } from '@codemirror/lang-xml';
import { oneDark } from '@codemirror/theme-one-dark';

	interface Props {
		content: string;
		language?: string; // Default to TypeScript
		readonly?: boolean;
		height?: string;
	}

	let {
		content,
		language = 'typescript',
		readonly = false,
		height = '400px'
	}: Props = $props();

const dispatch = createEventDispatcher();

let editorContainer: HTMLDivElement = $state();
let editorView: EditorView | null = $state(null);


function getLanguageExtension() {
switch (language.toLowerCase()) {
case 'javascript':
case 'js':
return javascript();
case 'typescript':
case 'ts':
case 'tsx':
case 'jsx':
return javascript();
case 'html':
return html();
case 'css':
return css();
case 'json':
return json();
case 'python':
case 'py':
return python();
case 'xml':
return xml();
default:
return javascript(); // Default to TypeScript
}
}

function updateEditor() {
if (!editorView || !editorContainer) return;

try {
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

const extensions = [
basicSetup,
getLanguageExtension(),
...(isDark ? [oneDark] : []),
EditorState.readOnly.of(readonly)
];

const newState = EditorState.create({
doc: content,
extensions
});

editorView.setState(newState);
dispatch('load', { language, readonly });

} catch (error) {
console.error('Error updating CodeMirror editor:', error);
dispatch('error', { 
message: `Failed to update code editor: ${error instanceof Error ? error.message : 'Unknown error'}`,
error 
});
}
}

onMount(async () => {
if (!editorContainer) return;

try {
const { EditorView } = await import('@codemirror/view');

const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

const extensions = [
basicSetup,
getLanguageExtension(),
...(isDark ? [oneDark] : []),
EditorState.readOnly.of(readonly)
];

const state = EditorState.create({
doc: content,
extensions
});

editorView = new EditorView({
state,
parent: editorContainer
});

dispatch('load', { language, readonly });

} catch (error) {
console.error('Error initializing CodeMirror:', error);
dispatch('error', { 
message: `Failed to initialize code editor: ${error instanceof Error ? error.message : 'Unknown error'}`,
error 
});
}
});

// Listen for theme changes
if (typeof window !== 'undefined') {
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', () => {
if (editorView) {
updateEditor();
}
});
}
run(() => {
if (editorView && editorContainer) {
updateEditor();
}
});
</script>

<div 
bind:this={editorContainer}
class="code-renderer"
class:readonly
style="height: {height};"
>
<!-- CodeMirror editor will be mounted here -->
</div>

<style>
.code-renderer {
width: 100%;
border-radius: 4px;
overflow: hidden;
border: 1px solid var(--border-color, #e1e5e9);
background: var(--editor-background, #ffffff);
position: relative;
}

.code-renderer.readonly {
opacity: 0.9;
}

/* CodeMirror customizations */
:global(.cm-editor) {
border-radius: 4px;
font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
font-size: 13px;
line-height: 1.5;
}

:global(.cm-focused) {
outline: none;
}

:global(.cm-scroller) {
border-radius: 4px;
}

/* TypeScript/JavaScript syntax highlighting enhancements */
:global(.cm-editor .cm-line) {
padding-left: 12px;
padding-right: 12px;
}

:global(.cm-editor .cm-lineNumbers) {
padding-left: 8px;
padding-right: 8px;
border-right: 1px solid var(--border-color, #e1e5e9);
background: var(--line-numbers-background, #f8f9fa);
color: var(--line-numbers-color, #6b7280);
}

/* Dark mode overrides */
@media (prefers-color-scheme: dark) {
.code-renderer {
border-color: #374151;
background: #1f2937;
}

:global(.cm-editor .cm-lineNumbers) {
border-right-color: #374151;
background: #111827;
color: #9ca3af;
}
}

/* Syntax highlighting for TypeScript */
:global(.cm-editor .tok-keyword) {
color: var(--syntax-keyword, #0ea5e9);
font-weight: 600;
}

:global(.cm-editor .tok-string) {
color: var(--syntax-string, #10b981);
}

:global(.cm-editor .tok-number) {
color: var(--syntax-number, #f59e0b);
}

:global(.cm-editor .tok-comment) {
color: var(--syntax-comment, #6b7280);
font-style: italic;
}

:global(.cm-editor .tok-variableName) {
color: var(--syntax-variable, #1f2937);
}

:global(.cm-editor .tok-typeName) {
color: var(--syntax-type, #8b5cf6);
font-weight: 500;
}

/* Dark mode syntax colors */
@media (prefers-color-scheme: dark) {
:global(.cm-editor .tok-keyword) {
color: #38bdf8;
}

:global(.cm-editor .tok-string) {
color: #34d399;
}

:global(.cm-editor .tok-number) {
color: #fbbf24;
}

:global(.cm-editor .tok-comment) {
color: #9ca3af;
}

:global(.cm-editor .tok-variableName) {
color: #f9fafb;
}

:global(.cm-editor .tok-typeName) {
color: #a78bfa;
}
}
</style>
