# Research: Enhanced Artifact Creation and Preview System

**Date**: 2025-01-27
**Feature**: 001-create-and-or
**Update**: Enhanced with Advanced Artifact Dependency Resolution System validation requirements

## Technical Decisions

### Intent Classification Approach
**Decision**: Keyword-based detection using explicit "artifact" or "preview" terms
**Rationale**:
- Simple and predictable for users
- Fast execution (<5s requirement easily met)
- Low false positive rate
- Aligns with clarified user expectations
**Alternatives considered**:
- ML-based classification models (rejected: complexity, latency)
- Pattern matching on code syntax (rejected: unreliable)
- Always-on enhancement (rejected: unnecessary LLM calls)

### Sandpack Integration Strategy
**Decision**: Extend existing Sandpack renderer with retry loop prevention
**Rationale**:
- Existing @codesandbox/sandpack-react 2.20+ already integrated
- Problem identified as infinite loading state in renderer
- Can leverage existing artifact button/panel components
**Alternatives considered**:
- Custom iframe renderer (rejected: security concerns, maintenance)
- CodeSandbox embed links (rejected: external dependency)
- Monaco editor only (rejected: no execution capability)

### PAS 3.0 XML Processing
**Decision**: Enhance existing fast-xml-parser 5.2+ implementation
**Rationale**:
- fast-xml-parser already handles CDATA sections properly
- Existing xml-artifact-parser.ts provides foundation
- Good performance for parsing XML with embedded code
**Alternatives considered**:
- DOMParser (rejected: limited CDATA handling)
- Custom regex parsing (rejected: fragile, security risks)
- xml2js library (rejected: unnecessary dependency change)

### E2E Testing Architecture
**Decision**: Playwright tests with production LLM endpoints using test API keys
**Rationale**:
- Validates complete workflow including real LLM responses
- Catches integration issues that mocks cannot
- Aligns with clarified requirement for real endpoint testing
**Alternatives considered**:
- Mock LLM responses (rejected: doesn't test integration)
- Local LLM instances (rejected: inconsistent results)
- Recording/replay of LLM calls (rejected: maintenance burden)

### Error Handling Strategy
**Decision**: Show error message with retry button when Sandpack fails
**Rationale**:
- Gives users clear feedback and recovery option
- Prevents indefinite loading states
- Simple UX that matches user expectations
**Alternatives considered**:
- Silent fallback to syntax highlighting (rejected: hides issues)
- Automatic retry with exponential backoff (rejected: may loop)
- Hide preview button entirely on error (rejected: poor UX)

## Architecture Patterns

### Retry Loop Prevention
**Pattern**: State machine with timeout guards
- Implement loading state timeout (30 seconds max)
- Track retry attempts with exponential backoff
- Circuit breaker pattern for persistent failures
- Clear error states with user-triggered retry

### Async Processing Pipeline
**Pattern**: Non-blocking artifact processing
- Intent classification runs in web worker if heavy
- Artifact parsing done asynchronously
- UI remains responsive during processing
- Progress indicators for long operations

### Error Boundary Implementation
**Pattern**: Graceful degradation at component level
- React error boundaries around Sandpack components
- Svelte error handling for artifact panels
- Fallback to code syntax highlighting
- User-friendly error messages

## Performance Considerations

### Intent Classification Optimization
- Simple string matching (O(n) linear search)
- Pre-compiled regex patterns for efficiency
- Debounced execution to avoid spam
- Result caching for repeated prompts

### XML Parsing Performance
- Stream parsing for large responses
- CDATA section direct extraction
- Memory-efficient artifact storage
- Lazy loading of artifact dependencies

### Sandpack Loading Optimization
- Preload common dependencies (React, etc.)
- Bundle splitting for large artifacts
- Timeout handling for slow networks
- Progressive loading indicators

## Security Analysis

### Input Sanitization
- XML schema validation against PAS 3.0
- CDATA content sanitization for XSS prevention
- Dependency validation against known-safe packages
- CSP headers for artifact execution

### Sandpack Security
- Browser iframe sandboxing enabled
- Network restrictions on artifact execution
- File system access limitations
- Prevent data exfiltration through artifacts

## Integration Points

### Existing System Dependencies
- src/lib/artifacts/detectArtifacts.ts - extend detection logic
- src/lib/utils/artifacts/xml-artifact-parser.ts - enhance parsing
- src/lib/components/artifacts/ArtifactRenderer.svelte - add retry handling
- tests/e2e/ - extend existing E2E test suite

### External Service Integration
- OpenAI/Claude API endpoints for testing
- Sandpack bundler service for execution
- CDN resources for artifact dependencies
- Error tracking services for monitoring

## Testing Strategy

### Unit Testing Approach
- Vitest for TypeScript/JavaScript modules
- Test coverage for intent classification logic
- Mock external dependencies (LLM APIs)
- Isolated component testing with @testing-library

### Integration Testing Approach
- Playwright for full browser automation
- Real LLM API calls with test credentials
- Artifact creation to preview workflows
- Cross-browser compatibility testing

### Performance Testing
- Measure intent classification response times
- Monitor artifact parsing performance
- Track Sandpack loading times
- Memory usage profiling for large artifacts

## Risk Mitigation

### High Risk: Infinite Loading Loops
- **Mitigation**: Timeout mechanisms with clear error states
- **Detection**: Automated monitoring of loading states
- **Recovery**: User-triggered retry with circuit breaker

### Medium Risk: LLM API Rate Limits
- **Mitigation**: Request throttling and queuing
- **Detection**: API response monitoring
- **Recovery**: Exponential backoff with user notification

### Low Risk: PAS 3.0 Schema Changes
- **Mitigation**: Version-aware parsing with fallbacks
- **Detection**: Schema validation tests
- **Recovery**: Graceful degradation to legacy formats

## Advanced Dependency Resolution System Research

### 4-Tier Strategy System Architecture
**Decision**: Priority-based strategy execution (100 → 90 → 80 → 10)
**Rationale**:
- CSS module conversion highest priority (most common issue)
- Direct CSS injection as secondary approach
- JSON data inlining for data dependencies
- Import removal as final fallback

**Implementation Details**:
- **Priority 100**: CSS Module Conversion
  - Pattern: `import styles from "./file.module.css"`
  - Conversion: `const styles = { className: { property: 'value' } }`
  - CSS property transformation: `background-color` → `backgroundColor`
- **Priority 90**: Direct CSS Injection
  - Find CSS blocks in message content
  - Inject as inline styles
- **Priority 80**: JSON Data Injection
  - Replace JSON imports with inline data objects
- **Priority 10**: Import Removal Fallback
  - Clean removal of problematic imports

### Enhanced Error Recovery UI
**Decision**: Two-stage recovery process with progress indication
**Components**:
- **EnhancedErrorRecovery.svelte**: Main recovery interface
- Auto-resolution button triggering dependency strategies
- AI Fix button for LLM-powered fixing
- Progress indicators for both stages
- Result display with strategy information
- Reset functionality for user control

### LLM Auto-fix Service Integration
**Decision**: AI-powered code fixing with confidence scoring
**Features**:
- Context-aware prompt generation for different error types
- API failure graceful handling
- Basic syntax validation of fixed code
- Confidence scores and explanations
- Retry limits to prevent infinite loops
- Security validation of generated code

### Circuit Breaker Pattern Enhancement
**Decision**: Prevent infinite retry loops with state management
**Implementation**:
- Track failure counts per artifact
- Temporary disable auto-recovery after threshold
- State reset after successful fixes
- Integration with existing error handling

## Validation Testing Strategy

### Core Functionality Tests
- Regex-based code block extraction validation
- CSS module import identification accuracy
- CSS property camelCase conversion correctness
- JSON import inlining functionality
- Import removal fallback behavior

### Error Recovery UI Tests
- Conditional display for appropriate error conditions
- Two-stage process progression validation
- Button state management (processing, success, failed)
- Result display with meaningful information
- Reset functionality operation

### Integration Tests
- Message content passing to resolution system
- Smart recovery triggering for specific errors
- Artifact structure preservation during updates
- Circuit breaker state management
- Re-rendering after successful fixes

### Strategy System Tests
- Priority execution order verification (100 → 90 → 80 → 10)
- First-success termination validation
- Strategy failure handling
- Dependency type handling per strategy

### Performance Benchmarks
- Auto-resolution completion time (<1 second target)
- Intent classification time (<5 seconds requirement)
- UI responsiveness during processing
- Success rate measurement (>85% target for CSS modules)

### Edge Case Testing
- Empty or malformed message content
- CSS blocks without matching imports
- Multiple CSS files with same class names
- Nested CSS selectors and pseudo-elements
- TypeScript vs JavaScript artifact types
- Large code blocks performance
- Circular dependency scenarios

## Implementation Readiness

All technical unknowns have been resolved through this research phase. The implementation can proceed with:

1. **Clear architectural patterns** for each component including the advanced dependency resolution system
2. **Proven technology choices** based on existing codebase with validation-specific enhancements
3. **Comprehensive testing strategy** covering all validation requirements with real-world scenarios
4. **Risk mitigation plans** for identified failure modes including dependency resolution failures
5. **Performance optimization approaches** meeting specified target metrics
6. **Detailed validation checklist** covering core functionality, UI, integration, and edge cases

**Status**: ✅ Ready for Phase 1 (Design & Contracts) with Advanced Dependency Resolution System validation focus