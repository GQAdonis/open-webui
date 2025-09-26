/**
 * Intent Classifier for Artifact Detection
 *
 * This module implements the hybrid intent classification system described in
 * docs/INTENT_CLASSIFIER_AND_ARTIFACT_PROMPT_TEMPLATE.md
 *
 * It uses pattern matching and contextual analysis to determine if a user prompt
 * should expect an artifact response that can be rendered in the UI.
 *
 * NOTE: TypeScript is the default for all code artifacts unless explicitly requested otherwise.
 */

export enum ArtifactIntent {
  NONE = 'none',
  REACT_COMPONENT = 'react_component',
  HTML_PAGE = 'html_page',
  SVELTE_COMPONENT = 'svelte_component',
  CODE_SNIPPET = 'code_snippet',
  MARKDOWN_DOCUMENT = 'markdown_document',
  DIAGRAM = 'diagram',
  DATA_VISUALIZATION = 'data_visualization'
}

export interface IntentClassificationResult {
  intent: ArtifactIntent;
  confidence: number;
  reasoning: string;
  suggestedPromptEnhancement?: string;
  preferredLanguage?: 'typescript' | 'javascript';
}

// Pattern-based classification rules
const ARTIFACT_PATTERNS = {
  [ArtifactIntent.REACT_COMPONENT]: [
    /create\s+.*react.*component/i,
    /build\s+.*react.*app/i,
    /make\s+.*interactive.*component/i,
    /react.*component.*with/i,
    /jsx.*component/i,
    /tsx.*component/i,
    /functional.*component/i,
    /react.*hook/i,
    // Add missing common patterns
    /create.*component/i,
    /simple.*react.*counter/i,
    /react.*counter/i,
    /counter.*component/i,
    /button.*component/i,
    /make.*component/i,
    /build.*component/i,
    /create.*simple.*react/i,
    /react.*element/i,
    /interactive.*element/i
  ],
  [ArtifactIntent.HTML_PAGE]: [
    /create.*html.*page/i,
    /build.*website/i,
    /make.*web.*page/i,
    /html.*with.*css/i,
    /landing.*page/i,
    /web.*interface/i
  ],
  [ArtifactIntent.SVELTE_COMPONENT]: [
    /create.*svelte.*component/i,
    /build.*svelte.*app/i,
    /svelte.*component.*with/i,
    /make.*svelte/i
  ],
  [ArtifactIntent.CODE_SNIPPET]: [
    /write.*code/i,
    /create.*function/i,
    /implement.*algorithm/i,
    /code.*example/i,
    /show.*implementation/i,
    /write.*script/i
  ],
  [ArtifactIntent.MARKDOWN_DOCUMENT]: [
    /create.*document/i,
    /write.*guide/i,
    /make.*tutorial/i,
    /documentation.*for/i,
    /markdown.*document/i,
    /readme.*file/i
  ],
  [ArtifactIntent.DIAGRAM]: [
    /create.*diagram/i,
    /draw.*flowchart/i,
    /make.*chart/i,
    /visualize.*process/i,
    /mermaid.*diagram/i,
    /flow.*diagram/i
  ],
  [ArtifactIntent.DATA_VISUALIZATION]: [
    /create.*chart/i,
    /visualize.*data/i,
    /plot.*graph/i,
    /make.*dashboard/i,
    /data.*visualization/i,
    /interactive.*chart/i
  ]
};

// JavaScript-specific patterns (when user explicitly requests JS over TS)
const JAVASCRIPT_PATTERNS = [
  /javascript/i,
  /\.js/i,
  /jsx.*not.*typescript/i,
  /no.*typescript/i,
  /vanilla.*js/i,
  /plain.*javascript/i
];

// Contextual keywords that increase artifact likelihood
const ARTIFACT_CONTEXT_KEYWORDS = [
  'interactive', 'component', 'ui', 'interface', 'visual', 'display',
  'render', 'show', 'create', 'build', 'make', 'generate', 'design',
  'prototype', 'demo', 'example', 'preview', 'runnable', 'executable'
];

// Anti-patterns that suggest no artifact needed
const NON_ARTIFACT_PATTERNS = [
  /how.*do.*i/i,
  /what.*is/i,
  /explain.*to.*me/i,
  /tell.*me.*about/i,
  /help.*me.*understand/i,
  /can.*you.*describe/i,
  /difference.*between/i,
  /pros.*and.*cons/i,
  /advantages.*disadvantages/i
];

/**
 * Classifies user intent to determine if an artifact should be expected
 */
export function classifyIntent(prompt: string): IntentClassificationResult {
  console.log("🔍 [Intent Classifier] Starting classification for prompt:", prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""));
  const normalizedPrompt = prompt.toLowerCase().trim();
  console.log("🔍 [Intent Classifier] Normalized prompt:", normalizedPrompt.substring(0, 100) + (normalizedPrompt.length > 100 ? "..." : ""));

  // Check for anti-patterns first
  console.log("🔍 [Intent Classifier] Checking anti-patterns...");
  for (const pattern of NON_ARTIFACT_PATTERNS) {
    if (pattern.test(normalizedPrompt)) {
      console.log("❌ [Intent Classifier] Anti-pattern matched:", pattern.source);
      const result = {
        intent: ArtifactIntent.NONE,
        confidence: 0.9,
        reasoning: 'Prompt appears to be asking for explanation or information rather than creation'
      };
      console.log("❌ [Intent Classifier] Returning NONE due to anti-pattern:", result);
      return result;
    }
  }

  // Determine language preference (default to TypeScript)
  const preferredLanguage = detectLanguagePreference(normalizedPrompt);

  // Pattern matching for specific artifact types
  let bestMatch: IntentClassificationResult = {
    intent: ArtifactIntent.NONE,
    confidence: 0,
    reasoning: 'No artifact patterns detected',
    preferredLanguage
  };

  for (const [intent, patterns] of Object.entries(ARTIFACT_PATTERNS)) {
    console.log("🔍 [Intent Classifier] Checking patterns for intent:", intent);
    for (const pattern of patterns) {
      if (pattern.test(normalizedPrompt)) {
        console.log("✅ [Intent Classifier] Pattern matched:", pattern.source, "for intent:", intent);
        const confidence = calculatePatternConfidence(normalizedPrompt, pattern);
        console.log("🔍 [Intent Classifier] Pattern confidence:", confidence);

        if (confidence > bestMatch.confidence) {
          console.log("🎯 [Intent Classifier] New best match found:", { intent, confidence });
          bestMatch = {
            intent: intent as ArtifactIntent,
            confidence,
            reasoning: `Strong pattern match: ${pattern.source}`,
            preferredLanguage
          };
        }
      }
    }
  }

  // Contextual analysis boost
  const contextScore = calculateContextScore(normalizedPrompt);
  bestMatch.confidence = Math.min(0.95, bestMatch.confidence + contextScore);

  // Add prompt enhancement suggestion if confidence is high
  if (bestMatch.confidence >= 0.7) {
    bestMatch.suggestedPromptEnhancement = generatePromptEnhancement(bestMatch.intent, preferredLanguage);
  }

  console.log("🔍 [Intent Classifier] Final result:", bestMatch);
  return bestMatch;
}

/**
 * Detect user's language preference from prompt
 */
function detectLanguagePreference(prompt: string): 'typescript' | 'javascript' {
  // Check for explicit JavaScript requests
  for (const pattern of JAVASCRIPT_PATTERNS) {
    if (pattern.test(prompt)) {
      return 'javascript';
    }
  }

  // Default to TypeScript for all code artifacts
  return 'typescript';
}

/**
 * Calculate confidence score based on pattern strength and context
 */
function calculatePatternConfidence(prompt: string, pattern: RegExp): number {
  const match = prompt.match(pattern);
  if (!match) return 0;

  // Base confidence from pattern match
  let confidence = 0.7;

  // Boost for longer, more specific matches
  if (match[0].length > 10) confidence += 0.1;

  // Boost for multiple keyword matches
  const keywordCount = ARTIFACT_CONTEXT_KEYWORDS.filter(keyword =>
    prompt.includes(keyword)
  ).length;
  confidence += Math.min(0.2, keywordCount * 0.05);

  return Math.min(0.95, confidence);
}

/**
 * Calculate contextual relevance score
 */
function calculateContextScore(prompt: string): number {
  const words = prompt.split(/\s+/);
  const contextMatches = words.filter(word =>
    ARTIFACT_CONTEXT_KEYWORDS.some(keyword =>
      word.includes(keyword) || keyword.includes(word)
    )
  );

  return Math.min(0.2, contextMatches.length * 0.03);
}

/**
 * Generate prompt enhancement based on detected intent and language preference
 */
function generatePromptEnhancement(intent: ArtifactIntent, language: 'typescript' | 'javascript'): string {
  const isTypeScript = language === 'typescript';
  const fileExtension = getFileExtension(intent, language);
  const artifactType = getArtifactType(intent, language);

  const enhancements = {
    [ArtifactIntent.REACT_COMPONENT]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="react-component-{unique-id}" type="${artifactType}" title="React Component">
<description>Brief description of the component</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
${isTypeScript ? '<dependency name="@types/react" version="18.2.0"/>\\n<dependency name="@types/react-dom" version="18.2.0"/>' : ''}
</dependencies>
<files>
<file path="App.${fileExtension}">
<![CDATA[
// Your React component code here using ${isTypeScript ? 'TypeScript with TSX' : 'JavaScript with JSX'}
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.HTML_PAGE]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="html-page-{unique-id}" type="text/html" title="HTML Page">
<description>Brief description of the page</description>
<files>
<file path="index.html">
<![CDATA[
<!-- Your HTML code here with inline CSS and ${isTypeScript ? 'TypeScript' : 'JavaScript'} -->
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.SVELTE_COMPONENT]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="svelte-component-{unique-id}" type="${artifactType}" title="Svelte Component">
<description>Brief description of the component</description>
<files>
<file path="Component.svelte">
<![CDATA[
<!-- Your Svelte component code here using ${isTypeScript ? 'TypeScript in script lang="ts"' : 'JavaScript'} -->
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.MARKDOWN_DOCUMENT]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="document-{unique-id}" type="text/markdown" title="Document">
<description>Brief description of the document</description>
<files>
<file path="document.md">
<![CDATA[
<!-- Your Markdown content here -->
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.DIAGRAM]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="diagram-{unique-id}" type="application/vnd.mermaid" title="Diagram">
<description>Brief description of the diagram</description>
<files>
<file path="diagram.mmd">
<![CDATA[
<!-- Your Mermaid diagram code here -->
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.DATA_VISUALIZATION]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="chart-{unique-id}" type="${artifactType}" title="Data Visualization">
<description>Brief description of the visualization</description>
<dependencies>
<dependency name="react" version="18.2.0"/>
<dependency name="react-dom" version="18.2.0"/>
<dependency name="chart.js" version="4.4.0"/>
<dependency name="react-chartjs-2" version="5.2.0"/>
${isTypeScript ? '<dependency name="@types/react" version="18.2.0"/>\\n<dependency name="@types/react-dom" version="18.2.0"/>' : ''}
</dependencies>
<files>
<file path="Chart.${fileExtension}">
<![CDATA[
// Your Chart.js or D3.js visualization code here using ${isTypeScript ? 'TypeScript with TSX' : 'JavaScript with JSX'}
]]>
</file>
</files>
</artifact>`,

    [ArtifactIntent.CODE_SNIPPET]: `

IMPORTANT: Please provide your response as a PAS 3.0 compliant artifact. Use the following XML format:

<artifact identifier="code-{unique-id}" type="${artifactType}" title="Code Snippet">
<description>Brief description of the code</description>
<files>
<file path="code.${fileExtension}">
<![CDATA[
// Your code here using ${isTypeScript ? 'TypeScript' : 'JavaScript'}
]]>
</file>
</files>
</artifact>`
  };

  return enhancements[intent] || '';
}

/**
 * Get appropriate file extension based on intent and language
 */
function getFileExtension(intent: ArtifactIntent, language: 'typescript' | 'javascript'): string {
  const isTypeScript = language === 'typescript';

  switch (intent) {
    case ArtifactIntent.REACT_COMPONENT:
    case ArtifactIntent.DATA_VISUALIZATION:
      return isTypeScript ? 'tsx' : 'jsx';
    case ArtifactIntent.CODE_SNIPPET:
      return isTypeScript ? 'ts' : 'js';
    default:
      return isTypeScript ? 'ts' : 'js';
  }
}

/**
 * Get appropriate artifact MIME type based on intent and language
 */
function getArtifactType(intent: ArtifactIntent, language: 'typescript' | 'javascript'): string {
  const isTypeScript = language === 'typescript';

  switch (intent) {
    case ArtifactIntent.REACT_COMPONENT:
    case ArtifactIntent.DATA_VISUALIZATION:
      return isTypeScript ? 'application/vnd.react+tsx' : 'application/vnd.react+jsx';
    case ArtifactIntent.SVELTE_COMPONENT:
      return isTypeScript ? 'application/vnd.svelte+ts' : 'application/vnd.svelte';
    case ArtifactIntent.CODE_SNIPPET:
      return isTypeScript ? 'application/typescript' : 'application/javascript';
    default:
      return isTypeScript ? 'application/typescript' : 'application/javascript';
  }
}

/**
 * Utility function to enhance prompts with artifact instructions
 */
export function enhancePromptForArtifacts(
  originalPrompt: string,
  classification: IntentClassificationResult
): string {
  if (classification.intent === ArtifactIntent.NONE || !classification.suggestedPromptEnhancement) {
    return originalPrompt;
  }

  return originalPrompt + classification.suggestedPromptEnhancement;
}
