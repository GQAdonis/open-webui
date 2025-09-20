# Intent Classifier and Artifact Prompt Template System

## Overview

This document outlines the design and implementation of an intent classification system for OpenWebUI that automatically detects when user requests should generate artifacts and enhances prompts to ensure proper artifact formatting according to the Prometheus Artifact Specification (PAS) 3.0.

## Problem Statement

OpenWebUI currently only detects artifacts from code blocks in LLM responses (`tsx`, `jsx`, `svelte`, `html`, `svg`). However, many artifact-worthy requests are not generating proper artifacts because:

1. **No Intent Detection**: The system doesn't analyze user intent to determine if an artifact should be created
2. **No Prompt Enhancement**: Raw user prompts don't instruct the LLM to format responses as artifacts
3. **Limited Format Support**: Only detects specific code block languages, missing other artifact types
4. **Inconsistent Output**: LLMs don't consistently format responses for artifact detection

## Solution Architecture

### 1. Intent Classification Pipeline

```
User Input → Intent Classifier → Prompt Enhancer → LLM → Artifact Detector → Renderer
```

### 2. Core Components

#### A. Intent Classifier
- **Purpose**: Analyze user input to determine artifact creation intent
- **Method**: Hybrid approach using pattern matching + ML-based classification
- **Output**: Intent type, confidence score, artifact specification

#### B. Prompt Template System
- **Purpose**: Enhance prompts to ensure artifact-formatted responses
- **Method**: Template injection based on detected intent
- **Output**: Enhanced prompt with artifact instructions

#### C. Response Parser
- **Purpose**: Extract and validate artifact content from LLM responses
- **Method**: Pattern matching for PAS 3.0 XML format + code block parsing
- **Output**: Validated artifact data

## Intent Classification Strategy

Based on research, the most effective approach combines:

1. **Pattern-based Classification** (Fast, reliable for common patterns)
2. **Contextual Analysis** (Understanding request context)
3. **Confidence Scoring** (Multi-layered validation)
4. **Feedback Learning** (Continuous improvement)

### Classification Categories

| Intent Type | Artifact Type | Confidence Indicators |
|-------------|---------------|----------------------|
| `ui-component` | React/Svelte/Vue | "create component", "build interface", "make form" |
| `interactive-app` | HTML/JS | "create app", "build tool", "make calculator" |
| `documentation` | Markdown | "create guide", "write docs", "explain process" |
| `diagram` | SVG/Mermaid | "show diagram", "create flowchart", "visualize" |
| `agent` | Agent Definition | "create agent", "build assistant", "make bot" |

### Pattern Detection Rules

#### High-Confidence Patterns (Score: 80-100)
```javascript
const HIGH_CONFIDENCE_PATTERNS = [
  // UI Components
  /create.*(?:react|vue|svelte).*component/i,
  /build.*(?:interface|ui|form|dashboard)/i,
  /make.*(?:interactive|calculator|widget)/i,
  
  // Applications
  /create.*(?:app|application|tool|game)/i,
  /build.*(?:webpage|website|landing.page)/i,
  
  // Documentation
  /create.*(?:documentation|guide|manual)/i,
  /write.*(?:guide|tutorial|readme)/i,
  
  // Diagrams
  /(?:create|show|draw|generate).*(?:diagram|chart|flowchart)/i,
  /visualize.*(?:process|flow|architecture)/i
];
```

#### Medium-Confidence Patterns (Score: 50-79)
```javascript
const MEDIUM_CONFIDENCE_PATTERNS = [
  /(?:make|build|create).*(?:something|thing)/i,
  /help.*(?:with|me).*(?:creating|building)/i,
  /design.*(?:for|a)/i
];
```

### Context Analysis

#### Technology Keywords (Boost Score)
```javascript
const TECH_KEYWORDS = {
  ui: ['react', 'vue', 'svelte', 'html', 'css', 'tailwind', 'component'],
  interactive: ['button', 'form', 'input', 'click', 'interactive', 'dynamic'],
  visualization: ['chart', 'graph', 'diagram', 'flowchart', 'sequence'],
  documentation: ['guide', 'tutorial', 'documentation', 'readme', 'manual']
};
```

#### Action Verbs (Intent Strength)
```javascript
const ACTION_VERBS = {
  strong: ['create', 'build', 'make', 'generate', 'design'],
  medium: ['help', 'show', 'explain', 'write'],
  weak: ['can', 'how', 'what', 'tell']
};
```

## Prompt Template System

### Template Structure

```typescript
interface PromptTemplate {
  systemPrompt: string;
  userPromptEnhancement: string;
  artifactInstructions: string;
  examples: string[];
}
```

### Templates by Intent Type

#### React Component Template
```typescript
const REACT_COMPONENT_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert React developer. When creating components, always format your response as a complete, working React component using the Prometheus Artifact Specification (PAS) 3.0.

IMPORTANT: Wrap your React component in the following XML artifact format:

<artifact type="react" kind="ui" id="component-name">
  <dependencies>
    <dependency name="react" version="^18.0.0"/>
    <!-- Add other dependencies as needed -->
  </dependencies>
  <code language="typescript">
    <![CDATA[
    // Your React component code here
    ]]>
  </code>
</artifact>

Ensure the component is:
- Fully functional and self-contained
- Uses TypeScript for type safety
- Follows React best practices
- Includes proper error handling
- Uses modern React patterns (hooks, functional components)`,

  userPromptEnhancement: `Create a complete, working React component for: {USER_REQUEST}

Requirements:
- Format as PAS 3.0 artifact XML
- Use TypeScript
- Make it production-ready
- Include proper styling
- Add error boundaries if needed`,

  artifactInstructions: `Format your response as a PAS 3.0 artifact with type="react" and kind="ui". Include all necessary dependencies and ensure the component is complete and functional.`
};
```

#### Documentation Template
```typescript
const DOCUMENTATION_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are a technical documentation expert. Create comprehensive, well-structured documentation using Markdown format within the Prometheus Artifact Specification (PAS) 3.0.

IMPORTANT: Wrap your documentation in the following XML artifact format:

<artifact type="markdown" kind="markdown" id="documentation-name">
  <markdown-renderer>
    <feature name="mermaid" enabled="true"/>
    <feature name="codeCopy" enabled="true"/>
    <feature name="toc" enabled="true"/>
  </markdown-renderer>
  <code language="markdown">
    <![CDATA[
    # Your Markdown documentation here
    ]]>
  </code>
</artifact>

Include:
- Clear structure with headings
- Code examples where relevant
- Diagrams using Mermaid syntax
- Table of contents for long documents`,

  userPromptEnhancement: `Create comprehensive documentation for: {USER_REQUEST}

Requirements:
- Format as PAS 3.0 artifact XML
- Use proper Markdown structure
- Include examples and code snippets
- Add diagrams if helpful
- Make it beginner-friendly`,

  artifactInstructions: `Format your response as a PAS 3.0 artifact with type="markdown" and kind="markdown". Enable Mermaid diagrams and code copying features.`
};
```

#### Diagram Template
```typescript
const DIAGRAM_TEMPLATE: PromptTemplate = {
  systemPrompt: `You are an expert in creating technical diagrams and visualizations. Create clear, informative diagrams using Mermaid syntax within Markdown artifacts.

IMPORTANT: Use the following format for diagrams:

<artifact type="markdown" kind="markdown" id="diagram-name">
  <markdown-renderer>
    <feature name="mermaid" enabled="true"/>
  </markdown-renderer>
  <code language="markdown">
    <![CDATA[
    # Diagram Title

    \`\`\`mermaid
    // Your Mermaid diagram code here
    \`\`\`

    ## Explanation
    // Description of the diagram
    ]]>
  </code>
</artifact>

Use appropriate Mermaid diagram types:
- flowchart: For process flows
- sequenceDiagram: For interaction sequences  
- graph: For relationships
- classDiagram: For system architecture
- erDiagram: For data models`,

  userPromptEnhancement: `Create a clear, informative diagram for: {USER_REQUEST}

Requirements:
- Use appropriate Mermaid diagram type
- Format as PAS 3.0 artifact XML
- Include explanatory text
- Make it visually clear and easy to understand
- Use proper labeling`,

  artifactInstructions: `Create a Mermaid diagram within a Markdown artifact. Choose the most appropriate diagram type for the request and include explanatory text.`
};
```

## Implementation Plan

### Phase 1: Core Intent Classifier (Week 1-2)
```typescript
class ArtifactIntentClassifier {
  // Pattern-based classification
  classifyByPatterns(prompt: string): IntentResult
  
  // Context analysis
  analyzeContext(prompt: string): ContextScore
  
  // Confidence calculation
  calculateConfidence(patterns: PatternMatch[], context: ContextScore): number
  
  // Main classification method
  classify(prompt: string): ClassificationResult
}
```

### Phase 2: Prompt Template Engine (Week 2-3)
```typescript
class PromptTemplateEngine {
  // Template management
  getTemplate(intentType: string): PromptTemplate
  
  // Prompt enhancement
  enhancePrompt(originalPrompt: string, intent: ClassificationResult): EnhancedPrompt
  
  // System prompt injection
  injectSystemPrompt(template: PromptTemplate): string
}
```

### Phase 3: Response Parser (Week 3-4)
```typescript
class ArtifactResponseParser {
  // PAS 3.0 XML parsing
  parseArtifactXML(response: string): ParsedArtifact | null
  
  // Code block extraction (fallback)
  extractCodeBlocks(response: string): CodeBlock[]
  
  // Validation
  validateArtifact(artifact: ParsedArtifact): ValidationResult
}
```

### Phase 4: Integration (Week 4)
```typescript
// Integration with OpenWebUI message processing
class MessageProcessor {
  async processMessage(message: UserMessage): Promise<ProcessedMessage> {
    // 1. Classify intent
    const intent = this.classifier.classify(message.content);
    
    // 2. Enhance prompt if artifact intent detected
    if (intent.shouldCreateArtifact) {
      message.content = this.templateEngine.enhancePrompt(
        message.content, 
        intent
      );
      message.systemPrompt = this.templateEngine.getSystemPrompt(intent.type);
    }
    
    // 3. Send to LLM
    const response = await this.sendToLLM(message);
    
    // 4. Parse response for artifacts
    const artifact = this.parser.parseArtifactXML(response.content);
    
    // 5. Attach artifact data to response
    if (artifact) {
      response.artifact = artifact;
      response.renderAsArtifact = true;
    }
    
    return response;
  }
}
```

## Success Metrics

### Quantitative Metrics
1. **Classification Accuracy**: >85% correct intent detection
2. **Artifact Generation Rate**: 2x increase in successful artifact creation
3. **User Satisfaction**: >4.5/5 rating for artifact quality
4. **Response Time**: <200ms additional latency

### Qualitative Metrics
1. **User Experience**: Seamless artifact creation
2. **Content Quality**: Well-formatted, functional artifacts
3. **Consistency**: Reliable artifact detection and rendering
4. **Flexibility**: Support for diverse artifact types

## Testing Strategy

### Unit Tests
- Intent classification accuracy across various prompt types
- Template rendering with different parameters
- Artifact parsing and validation

### Integration Tests
- End-to-end artifact creation workflow
- LLM integration and response handling
- UI rendering of different artifact types

### User Testing
- A/B testing with and without intent classifier
- User feedback on artifact quality
- Edge case handling

## Rollout Plan

### Phase 1: Internal Testing (Week 5)
- Deploy to development environment
- Internal team testing and feedback
- Bug fixes and optimizations

### Phase 2: Beta Release (Week 6)
- Limited user group (power users)
- Collect usage metrics and feedback
- Iterative improvements

### Phase 3: Full Release (Week 7)
- Production deployment
- Monitor performance metrics
- Continuous optimization based on usage data

## Future Enhancements

### Machine Learning Integration
- Fine-tune classification model based on user feedback
- Implement reinforcement learning for prompt optimization
- Add semantic similarity matching for better intent detection

### Advanced Features
- Multi-language support for non-English prompts
- Custom artifact templates per user
- Integration with external APIs for enhanced artifacts
- Real-time collaboration on artifacts

### Analytics and Optimization
- Detailed usage analytics dashboard
- A/B testing framework for prompt templates
- Performance monitoring and automatic scaling
- User behavior analysis for UX improvements

## Conclusion

This intent classification and prompt template system will significantly improve OpenWebUI's artifact creation capabilities by:

1. **Proactive Detection**: Automatically identifying when users want to create artifacts
2. **Prompt Optimization**: Enhancing prompts to ensure proper artifact formatting
3. **Consistent Output**: Standardizing LLM responses according to PAS 3.0
4. **Better UX**: Seamless transition from request to rendered artifact

The hybrid approach combining pattern matching with contextual analysis provides both speed and accuracy, while the template system ensures consistent, high-quality artifact generation across all supported types.
