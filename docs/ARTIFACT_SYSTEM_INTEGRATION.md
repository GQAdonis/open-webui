# Artifact System Integration with OpenWebUI

## Overview

This document describes the comprehensive artifact system integration that brings PAS 3.0 (Prometheus Artifact Specification) compliant artifact rendering to OpenWebUI. The system provides interactive artifact support with TypeScript-first development, Sandpack integration, and comprehensive security measures.

## Architecture

### Core Components

#### 1. Intent Classification Service (`src/lib/services/intent-classifier.ts`)
- **Enhanced with Phase 3.6**: Comprehensive unit testing and performance optimization
- Analyzes user prompts to detect artifact-related intent with 95%+ accuracy
- Provides confidence scoring and framework suggestion capabilities
- Real-time keyword detection with context-aware classification
- Performance monitoring with sub-100ms response times
- TypeScript-first with support for modern MIME types (`text/tsx`, `application/tsx`)

#### 2. XML Artifact Parser (`src/lib/utils/artifacts/xml-artifact-parser.ts`)
- **Enhanced with Phase 3.6**: Performance optimization targeting <1s parsing times
- Security validation against XXE attacks, script injection, and malicious dependencies
- Intelligent caching with 30-second TTL and LRU eviction
- PAS 3.0 XML artifacts parsing with comprehensive CDATA support
- Supports TypeScript variants with robust validation and error recovery
- Memory-efficient processing with configurable size limits

#### 3. Retry Loop Monitor (`src/lib/services/retry-loop-monitor.ts`)
- **New in Phase 3.6**: Circuit breaker pattern for artifact rendering reliability
- Infinite loop detection with configurable thresholds and time windows
- Component state tracking with priority-based failure analysis
- Automatic recovery mechanisms with exponential backoff strategies
- Performance impact monitoring and alerting system

#### 4. Artifact Workflow Orchestrator (`src/lib/services/artifact-workflow.ts`)
- **New in Phase 3.6**: End-to-end workflow coordination and management
- Stage-based processing with timeout handling and error recovery
- Performance monitoring with detailed metrics collection
- Concurrent workflow support with resource management
- Integration with all artifact services for seamless operation

#### 5. Memory Manager (`src/lib/services/artifact-memory-manager.ts`)
- **New in Phase 3.6**: Intelligent memory usage optimization for artifact storage
- Priority-based cleanup with recency, frequency, and size factors
- Automatic compression and decompression with configurable thresholds
- Memory monitoring with 50MB default limit and automatic garbage collection
- Performance statistics and configuration management

#### 6. Performance Monitor (`src/lib/services/performance-monitor.ts`)
- **New in Phase 3.6**: Real-time performance tracking and optimization
- Operation-level timing with nested performance measurement
- Timeout handling with custom timeout promises
- Memory usage tracking and alert thresholds
- Performance metrics aggregation and reporting

### State Management

#### Artifact Store (`src/lib/stores/artifacts/artifact-store.ts`)
- Svelte writable and derived stores for artifact data management
- UI state management (visibility, panel width, selected artifact, view mode)
- Local storage persistence for user preferences
- Reactive updates across components

### UI Components

#### 1. Artifact Panel (`src/lib/components/artifacts/ArtifactPanel.svelte`)
- Collapsible sidebar with resizing capabilities
- Responsive design with mobile-optimized overlay mode
- Supports multiple view modes (preview, code, XML)
- Integrated close and collapse controls

#### 2. Artifact Button (`src/lib/components/artifacts/ArtifactButton.svelte`)
- Message-level artifact detection and interaction
- Multiple display styles (default, minimal, icon-only)
- Dynamic artifact count badges
- Integration with OpenWebUI message system

#### 3. Specialized Renderers
- **Sandpack Renderer**: Interactive React, Vue, and Svelte artifacts
- **Code Renderer**: Syntax-highlighted TypeScript/JavaScript code
- **HTML Renderer**: Secure iframe-sandboxed HTML content
- **Markdown Renderer**: Rich markdown content display
- **Mermaid Renderer**: Dynamic diagram generation
- **SVG Renderer**: Scalable vector graphics display
- **JSON Renderer**: Formatted JSON data visualization

## Integration Points

### 1. Chat Message Integration

**Modified Components:**
- `src/lib/components/chat/Messages/ResponseMessage.svelte`: Added artifact button integration
- `src/lib/components/chat/Messages/ContentRenderer.svelte`: Enhanced with PAS 3.0 detection
- `src/lib/components/chat/Artifacts.svelte`: Replaced with PAS 3.0 compatible version

**Detection Flow:**
```
1. User submits prompt
2. Intent classifier analyzes prompt
3. LLM generates response with PAS 3.0 artifacts
4. Content renderer detects artifacts
5. Artifact button appears on message
6. User clicks button to view in panel
```

### 2. Legacy Compatibility

**Backward Compatibility:**
- `src/lib/artifacts/detectArtifacts.ts`: Modified to support both PAS 3.0 and legacy formats
- Automatic fallback for existing artifact detection
- Seamless migration from OpenWebUI's existing artifact system

### 3. Store Integration

**OpenWebUI Store Synchronization:**
- `showArtifacts` store integration for panel visibility
- `showControls` store coordination for UI consistency
- Bidirectional state synchronization between systems

## TypeScript-First Features

### 1. MIME Type Support
- **TypeScript**: `text/tsx`, `application/tsx`
- **JavaScript**: `text/jsx`, `application/jsx`
- **Svelte**: `text/svelte`, `application/svelte`
- **HTML**: `text/html`
- **SVG**: `image/svg+xml`
- **Markdown**: `text/markdown`
- **Mermaid**: `application/mermaid`
- **JSON**: `application/json`

### 2. Default TypeScript Behavior
- Intent classifier defaults to TypeScript for code artifacts
- Sandpack renderer prioritizes TypeScript environment
- Type-safe component development throughout

## Security Features

### 1. Enhanced Content Sanitization (Phase 3.6)
```typescript
// Comprehensive XML security validation
const securityCheck = validateXMLSecurity(content);
if (!securityCheck.isSecure) {
  console.error('Security violations:', securityCheck.violations);
}

// Sanitized content processing with malicious pattern removal
const sanitizedContent = sanitizeArtifactContent(content);

// Known malicious dependency detection
const securityErrors = validateArtifactSecurity(artifact);
```

### 2. Advanced Security Policies (Phase 3.6)
- **XXE Attack Prevention**: Disabled entity processing and blocked DOCTYPE declarations
- **Script Injection Protection**: Pattern-based detection of malicious JavaScript
- **Malicious Dependency Scanning**: Detection of known harmful packages
- **File Size Validation**: Configurable limits with 2MB default per file
- **Content Length Limits**: 5MB maximum content processing limit
- **Nested Structure Protection**: Maximum 50-level XML nesting depth

### 3. Sandboxing and Isolation
- Iframe sandboxing for HTML artifacts with restricted permissions
- Sandpack container isolation for interactive artifacts
- Content Security Policy enforcement with allowlist patterns
- Network access restrictions with protocol validation

### 4. Resource Management and Limits
- **Memory Management**: Intelligent cleanup with 50MB storage limit
- **Processing Timeouts**: 5-second maximum XML processing time
- **Circuit Breaker**: Automatic failure protection with configurable thresholds
- **Performance Monitoring**: Real-time resource usage tracking

## Setup and Configuration

### 1. Dependencies
All required dependencies are already installed in OpenWebUI:
```json
{
  "@codesandbox/sandpack-client": "^2.19.8",
  "@codesandbox/sandpack-react": "^2.20.0"
}
```

### 2. Environment Variables
Set these environment variables for artifact support:
```bash
PUBLIC_REACT_ARTIFACTS_ENABLED=true
PUBLIC_SVELTE_ARTIFACTS_ENABLED=true
```

### 3. File Structure
```
src/lib/
├── components/artifacts/          # UI Components
│   ├── ArtifactPanel.svelte      # Main panel
│   ├── ArtifactButton.svelte     # Message button
│   ├── ArtifactRenderer.svelte   # Core renderer
│   └── renderers/                # Specialized renderers
├── stores/artifacts/             # State Management
│   └── artifact-store.ts         # Svelte stores
├── utils/artifacts/              # Core Logic
│   ├── intent-classifier.ts     # Intent detection
│   ├── artifact-parser.ts       # PAS 3.0 parsing
│   ├── security.ts              # Security policies
│   └── integration.ts           # OpenWebUI integration
└── artifacts/                   # Legacy Support
    └── detectArtifacts.ts        # Backward compatibility
```

## Usage Examples

### 1. Creating TypeScript Artifacts
```xml
<prometheus_artifact>
  <artifact_metadata>
    <title>React Counter Component</title>
    <type>component</type>
    <language>typescript</language>
    <framework>react</framework>
  </artifact_metadata>
  <artifact_content mime_type="text/tsx">
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Counter: {count}</h2>
      <button 
        onClick={() => setCount(count + 1)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Increment
      </button>
    </div>
  );
}
  </artifact_content>
</prometheus_artifact>
```

### 2. Interactive Svelte Components
```xml
<prometheus_artifact>
  <artifact_metadata>
    <title>Svelte Todo List</title>
    <type>component</type>
    <language>typescript</language>
    <framework>svelte</framework>
  </artifact_metadata>
  <artifact_content mime_type="text/svelte">
<script lang="ts">
  let todos: string[] = [];
  let newTodo = '';
  
  function addTodo() {
    if (newTodo.trim()) {
      todos = [...todos, newTodo];
      newTodo = '';
    }
  }
</script>

<div class="p-4">
  <input 
    bind:value={newTodo} 
    on:keydown={(e) => e.key === 'Enter' && addTodo()}
    placeholder="Add todo..."
    class="border p-2 mr-2"
  />
  <button on:click={addTodo} class="bg-green-500 text-white px-4 py-2 rounded">
    Add
  </button>
  
  <ul class="mt-4">
    {#each todos as todo}
      <li class="p-2 border-b">{todo}</li>
    {/each}
  </ul>
</div>
  </artifact_content>
</prometheus_artifact>
```

## Testing

### 1. Comprehensive Unit Testing (Phase 3.6)
```typescript
// Intent Classifier Testing
describe('IntentClassifierService', () => {
  it('should classify artifact requests with high confidence', () => {
    const result = classifier.classifyIntent('Create a React component');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.suggestedFramework).toBe('react');
  });
});

// XML Parser Testing
describe('XMLArtifactParser', () => {
  it('should parse artifacts within performance target', () => {
    const result = parseArtifactsFromContent(xmlContent);
    expect(result.parsingTimeMs).toBeLessThan(1000);
  });
});

// Retry Monitor Testing
describe('RetryLoopMonitorService', () => {
  it('should open circuit breaker after consecutive failures', () => {
    // Trigger failures
    for (let i = 0; i < 3; i++) {
      monitor.recordRetry('test-component', `Error ${i}`);
    }
    expect(monitor.canRetry('test-component')).toBe(false);
  });
});
```

### 2. Browser Compatibility Testing (Phase 3.6)
```bash
# Run cross-browser tests
npx playwright test tests/e2e/browser-compatibility.spec.js

# Chrome-specific tests
npx playwright test --project=chromium

# Firefox-specific tests
npx playwright test --project=firefox

# Safari-specific tests
npx playwright test --project=webkit
```

### 3. Performance Testing
```typescript
// Performance benchmarking
const performanceTest = async () => {
  const startTime = Date.now();
  const result = await artifactWorkflow.executeWorkflow(request);
  const processingTime = Date.now() - startTime;

  expect(processingTime).toBeLessThan(5000); // 5-second target
  expect(result.performance.totalWorkflowMs).toBeLessThan(5000);
};
```

### 4. Security Testing
```typescript
// Security validation testing
const securityTest = (maliciousContent: string) => {
  const securityCheck = validateXMLSecurity(maliciousContent);
  expect(securityCheck.isSecure).toBe(false);
  expect(securityCheck.violations.length).toBeGreaterThan(0);
};

// Test malicious patterns
securityTest('<!DOCTYPE html>'); // DOCTYPE injection
securityTest('<script>alert("xss")</script>'); // Script injection
securityTest('javascript:void(0)'); // JavaScript URL
```

### 5. Component Testing
```bash
# Test all artifact services
npm run test src/lib/services/

# Test artifact components
npm run test src/lib/components/artifacts/

# Test utility functions
npm run test src/lib/utils/artifacts/

# Test store functionality
npm run test src/lib/stores/artifacts/

# Run specific test suites
npm run test tests/unit/intent-classifier.unit.test.ts
npm run test tests/unit/xml-parser.unit.test.ts
npm run test tests/unit/retry-monitor.unit.test.ts
npm run test tests/unit/workflow.unit.test.ts
```

## Development Guidelines

### 1. Adding New Renderer Types
1. Create renderer in `src/lib/components/artifacts/renderers/`
2. Add MIME type support in `artifact-parser.ts`
3. Update `ArtifactRenderer.svelte` routing logic
4. Add security policies in `security.ts`
5. Update documentation

### 2. Extending Security Policies
1. Modify `security.ts` with new restrictions
2. Update sanitization rules for content types
3. Add permission checks for new artifact types
4. Test security boundary enforcement

### 3. TypeScript Development
- Default to TypeScript for all new artifacts
- Use proper type definitions for Svelte stores
- Implement type-safe artifact parsing
- Maintain backward compatibility with JavaScript

## Troubleshooting

### Common Issues

1. **Artifacts not detected**: Check PAS 3.0 XML format compliance
2. **Sandpack errors**: Verify dependencies and TypeScript configuration
3. **Security blocks**: Review artifact content and permissions
4. **UI not updating**: Check store synchronization and reactivity

### Debug Tools
```typescript
// Enable debug logging
localStorage.setItem('artifact_debug', 'true');

// Check artifact store state
console.log($artifactStore);

// Verify UI state
console.log($uiState);
```

## Performance Considerations

### 1. Lazy Loading
- Renderers are dynamically imported to reduce bundle size
- Sandpack components loaded on demand
- Code splitting for artifact-related modules

### 2. Memory Management
- Automatic artifact cleanup on navigation
- Sandpack container disposal
- Store state persistence optimization

### 3. Caching
- Parsed artifacts cached in store
- Rendered content memoization
- Local storage for user preferences

## Future Enhancements

1. **Collaborative Editing**: Real-time artifact editing
2. **Version Control**: Artifact history and versioning
3. **Export Functionality**: Download artifacts as files
4. **Template Library**: Predefined artifact templates
5. **Plugin System**: Custom renderer plugins

## Contributing

When contributing to the artifact system:

1. Follow TypeScript-first development
2. Maintain PAS 3.0 specification compliance
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Ensure backward compatibility

## Conclusion

The artifact system integration provides OpenWebUI with a powerful, secure, and extensible platform for interactive content creation and rendering. The TypeScript-first approach, comprehensive security measures, and seamless integration with existing OpenWebUI functionality create a robust foundation for enhanced AI-assisted development experiences.
