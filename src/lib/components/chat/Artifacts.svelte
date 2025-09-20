<script lang="ts">
import { toast } from 'svelte-sonner';
import { onMount, getContext, createEventDispatcher } from 'svelte';
const i18n = getContext('i18n');
const dispatch = createEventDispatcher();

import { artifactCode, chatId, settings, showArtifacts, showControls } from '$lib/stores';
import { copyToClipboard, createMessagesList } from '$lib/utils';
import { detectArtifactsFromText } from '$lib/artifacts/detectArtifacts';

import XMark from '../icons/XMark.svelte';
import ArrowsPointingOut from '../icons/ArrowsPointingOut.svelte';
import Tooltip from '../common/Tooltip.svelte';
import SvgPanZoom from '../common/SVGPanZoom.svelte';
import ArrowLeft from '../icons/ArrowLeft.svelte';
import Download from '../icons/Download.svelte';
import ReactArtifactRenderer from './ReactArtifactRenderer.svelte';
import SvelteArtifactRenderer from './SvelteArtifactRenderer.svelte';

export let overlay = false;
export let history;
let messages = [];

let contents: Array<{ type: string; content?: string; artifact?: any }> = [];
let selectedContentIdx = 0;

let copied = false;
let iframeElement: HTMLIFrameElement;

// Check environment variables for artifact support
import { PUBLIC_REACT_ARTIFACTS_ENABLED, PUBLIC_SVELTE_ARTIFACTS_ENABLED } from "$env/static/public";

$: if (history) {
messages = createMessagesList(history, history.currentId);
getContents();
} else {
messages = [];
getContents();
}

const getContents = () => {
contents = [];
messages.forEach((message) => {
if (message?.role !== 'user' && message?.content) {
// Check for React artifacts if enabled
if (PUBLIC_REACT_ARTIFACTS_ENABLED === 'true') {
const reactArtifacts = detectArtifactsFromText(message.content);
reactArtifacts.forEach((artifact) => {
if (artifact.type === 'react') {
contents = [...contents, { type: 'react', artifact }];
}
});
}

// Check for Svelte artifacts if enabled
if (PUBLIC_SVELTE_ARTIFACTS_ENABLED === 'true') {
const svelteArtifacts = detectArtifactsFromText(message.content);
svelteArtifacts.forEach((artifact) => {
if (artifact.type === 'svelte') {
contents = [...contents, { type: 'svelte', artifact }];
}
});
}

// Then check for existing HTML/CSS/JS artifacts
const codeBlockContents = message.content.match(/```[\s\S]*?```/g);
let codeBlocks = [];

if (codeBlockContents) {
codeBlockContents.forEach((block) => {
const lang = block.split('\n')[0].replace('```', '').trim().toLowerCase();
const code = block.replace(/```[\s\S]*?\n/, '').replace(/```$/, '');

// Skip React and Svelte blocks as they're handled above
if (lang !== 'tsx' && lang !== 'jsx' && lang !== 'svelte') {
codeBlocks.push({ lang, code });
}
});
}

let htmlContent = '';
let cssContent = '';
let jsContent = '';

codeBlocks.forEach((block) => {
const { lang, code } = block;

if (lang === 'html') {
htmlContent += code + '\n';
} else if (lang === 'css') {
cssContent += code + '\n';
} else if (lang === 'javascript' || lang === 'js') {
jsContent += code + '\n';
}
});

const inlineHtml = message.content.match(/<html>[\s\S]*?<\/html>/gi);
const inlineCss = message.content.match(/<style>[\s\S]*?<\/style>/gi);
const inlineJs = message.content.match(/<script>[\s\S]*?<\/script>/gi);

if (inlineHtml) {
inlineHtml.forEach((block) => {
const content = block.replace(/<\/?html>/gi, ''); // Remove <html> tags
htmlContent += content + '\n';
});
}
if (inlineCss) {
inlineCss.forEach((block) => {
const content = block.replace(/<\/?style>/gi, ''); // Remove <style> tags
cssContent += content + '\n';
});
}
if (inlineJs) {
inlineJs.forEach((block) => {
const content = block.replace(/<\/?script>/gi, ''); // Remove <script> tags
jsContent += content + '\n';
});
}

if (htmlContent || cssContent || jsContent) {
const renderedContent = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
<${''}style>
body {
background-color: white; /* Ensure the iframe has a white background */
}

${cssContent}
</${''}style>
                        </head>
                        <body>
                            ${htmlContent}

<${''}script>
                            ${jsContent}
</${''}script>
                        </body>
                        </html>
                    `;
contents = [...contents, { type: 'iframe', content: renderedContent }];
} else {
// Check for SVG content
for (const block of codeBlocks) {
if (block.lang === 'svg' || (block.lang === 'xml' && block.code.includes('<svg'))) {
contents = [...contents, { type: 'svg', content: block.code }];
}
}
}
}
});

if (contents.length === 0) {
showControls.set(false);
showArtifacts.set(false);
}

selectedContentIdx = contents ? contents.length - 1 : 0;
};

function navigateContent(direction: 'prev' | 'next') {
console.log(selectedContentIdx);

selectedContentIdx =
direction === 'prev'
? Math.max(selectedContentIdx - 1, 0)
: Math.min(selectedContentIdx + 1, contents.length - 1);

console.log(selectedContentIdx);
}

const iframeLoadHandler = () => {
iframeElement.contentWindow.addEventListener(
'click',
function (e) {
const target = e.target.closest('a');
if (target && target.href) {
e.preventDefault();
const url = new URL(target.href, iframeElement.baseURI);
if (url.origin === window.location.origin) {
iframeElement.contentWindow.history.pushState(
null,
'',
url.pathname + url.search + url.hash
);
} else {
console.info('External navigation blocked:', url.href);
}
}
},
true
);

// Cancel drag when hovering over iframe
iframeElement.contentWindow.addEventListener('mouseenter', function (e) {
e.preventDefault();
iframeElement.contentWindow.addEventListener('dragstart', (event) => {
event.preventDefault();
});
});
};

const showFullScreen = () => {
if (iframeElement?.requestFullscreen) {
iframeElement.requestFullscreen();
} else if (iframeElement?.webkitRequestFullscreen) {
iframeElement.webkitRequestFullscreen();
} else if (iframeElement?.msRequestFullscreen) {
iframeElement.msRequestFullscreen();
}
};

const downloadArtifact = () => {
const current = contents[selectedContentIdx];
if (current.type === 'react') {
// Download React artifact as tsx file
const blob = new Blob([current.artifact.entryCode], { type: 'text/typescript' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `react-artifact-${$chatId}-${selectedContentIdx}.tsx`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
} else if (current.type === 'svelte') {
// Download Svelte artifact as svelte file
const blob = new Blob([current.artifact.entryCode], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `svelte-artifact-${$chatId}-${selectedContentIdx}.svelte`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
} else if (current.content) {
// Download HTML/SVG artifact
const blob = new Blob([current.content], { 
type: current.type === 'svg' ? 'image/svg+xml' : 'text/html' 
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `artifact-${$chatId}-${selectedContentIdx}.${current.type === 'svg' ? 'svg' : 'html'}`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}
};

const getContentForCopy = () => {
const current = contents[selectedContentIdx];
if (current.type === 'react' || current.type === 'svelte') {
return current.artifact.entryCode;
}
return current.content || '';
};

onMount(() => {
artifactCode.subscribe((value) => {
if (contents) {
const codeIdx = contents.findIndex((content) => {
if (content.type === 'react' || content.type === 'svelte') {
return content.artifact.entryCode.includes(value);
}
return content.content?.includes(value);
});
selectedContentIdx = codeIdx !== -1 ? codeIdx : 0;
}
});
});
</script>

<div
class=" w-full h-full relative flex flex-col bg-white dark:bg-gray-850"
id="artifacts-container"
>
<div class="w-full h-full flex flex-col flex-1 relative">
{#if contents.length > 0}
<div
class="pointer-events-auto z-20 flex justify-between items-center p-2.5 font-primar text-gray-900 dark:text-white"
>
<div class="flex-1 flex items-center justify-between pr-1">
<div class="flex items-center space-x-2">
<div class="flex items-center gap-0.5 self-center min-w-fit" dir="ltr">
<button
class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition disabled:cursor-not-allowed"
on:click={() => navigateContent('prev')}
disabled={contents.length <= 1}
>
<svg
xmlns="http://www.w3.org/2000/svg"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
stroke-width="2.5"
class="size-3.5"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="M15.75 19.5 8.25 12l7.5-7.5"
/>
</svg>
</button>

<div class="text-xs self-center dark:text-gray-100 min-w-fit">
{$i18n.t('Version {{selectedVersion}} of {{totalVersions}}', {
selectedVersion: selectedContentIdx + 1,
totalVersions: contents.length
})}
</div>

<button
class="self-center p-1 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-black rounded-md transition disabled:cursor-not-allowed"
on:click={() => navigateContent('next')}
disabled={contents.length <= 1}
>
<svg
xmlns="http://www.w3.org/2000/svg"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
stroke-width="2.5"
class="size-3.5"
>
<path
stroke-linecap="round"
stroke-linejoin="round"
d="m8.25 4.5 7.5 7.5-7.5 7.5"
/>
</svg>
</button>
</div>
</div>

<div class="flex items-center gap-1.5">
<button
class="copy-code-button bg-none border-none text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-md px-1.5 py-0.5"
on:click={() => {
copyToClipboard(getContentForCopy());
copied = true;

setTimeout(() => {
copied = false;
}, 2000);
}}>{copied ? $i18n.t('Copied') : $i18n.t('Copy')}</button
>

<Tooltip content={$i18n.t('Download')}>
<button
class=" bg-none border-none text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-md p-0.5"
on:click={downloadArtifact}
>
<Download className="size-3.5" />
</button>
</Tooltip>

{#if contents[selectedContentIdx].type === 'iframe'}
<Tooltip content={$i18n.t('Open in full screen')}>
<button
class=" bg-none border-none text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-md p-0.5"
on:click={showFullScreen}
>
<ArrowsPointingOut className="size-3.5" />
</button>
</Tooltip>
{/if}
</div>
</div>

<button
class="self-center pointer-events-auto p-1 rounded-full bg-white dark:bg-gray-850"
on:click={() => {
dispatch('close');
showControls.set(false);
showArtifacts.set(false);
}}
>
<XMark className="size-3.5 text-gray-900 dark:text-white" />
</button>
</div>
{/if}

{#if overlay}
<div class=" absolute top-0 left-0 right-0 bottom-0 z-10"></div>
{/if}

<div class="flex-1 w-full h-full">
<div class=" h-full flex flex-col">
{#if contents.length > 0}
<div class="max-w-full w-full h-full">
{#if contents[selectedContentIdx].type === 'iframe'}
<iframe
bind:this={iframeElement}
title="Content"
srcdoc={contents[selectedContentIdx].content}
class="w-full border-0 h-full rounded-none"
sandbox="allow-scripts allow-downloads{($settings?.iframeSandboxAllowForms ?? false)
? ' allow-forms'
: ''}{($settings?.iframeSandboxAllowSameOrigin ?? false)
? ' allow-same-origin'
: ''}"
on:load={iframeLoadHandler}
></iframe>
{:else if contents[selectedContentIdx].type === 'svg'}
<SvgPanZoom
className=" w-full h-full max-h-full overflow-hidden"
svg={contents[selectedContentIdx].content}
/>
{:else if contents[selectedContentIdx].type === 'react'}
<ReactArtifactRenderer artifact={contents[selectedContentIdx].artifact} />
{:else if contents[selectedContentIdx].type === 'svelte'}
<SvelteArtifactRenderer artifact={contents[selectedContentIdx].artifact} />
{/if}
</div>
{:else}
<div class="m-auto font-medium text-xs text-gray-900 dark:text-white">
{$i18n.t('No HTML, CSS, JavaScript, React, or Svelte content found.')}
</div>
{/if}
</div>
</div>
</div>
</div>
