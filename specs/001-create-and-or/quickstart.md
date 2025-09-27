# Quick Start: Enhanced Artifact Creation and Preview System

**Feature**: 001-create-and-or
**Date**: 2025-01-27
**Update**: Enhanced with Advanced Artifact Dependency Resolution System validation

## Overview
This guide validates the complete artifact creation and preview workflow from user prompt to interactive Sandpack rendering.

## Prerequisites
- Node.js 18+ and npm installed
- OpenAI or Claude API key for testing
- Playwright browser dependencies

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Environment Configuration
Create `.env.local` with test API credentials:
```bash
# E2E Testing Configuration
OPENAI_API_KEY=sk-test-...  # Test API key
CLAUDE_API_KEY=sk-ant-...   # Test API key
E2E_TIMEOUT=60000           # 60 second timeout
```

### 3. Build and Start Development Server
```bash
npm run build
npm run dev
```

## Validation Tests

### Test 1: Intent Classification
**Objective**: Verify intent classifier detects artifact requests

```bash
# Start chat interface
# Type: "Create an artifact preview for a React login component"
# Expected: Intent classifier triggers (keyword: "artifact", "preview")
# Validation: Check browser console for intent classification logs
```

**Success Criteria**:
- [ ] Intent classification completes within 5 seconds
- [ ] Keywords "artifact" and "preview" detected
- [ ] Prompt enhancement triggered

### Test 2: PAS 3.0 XML Parsing
**Objective**: Verify PAS 3.0 XML artifacts are properly parsed

```bash
# Test with sample PAS 3.0 XML response
npm run test:unit -- --grep="artifact-parser"
```

**Success Criteria**:
- [ ] XML parsing extracts CDATA sections correctly
- [ ] Dependencies and metadata parsed
- [ ] Schema validation passes
- [ ] Parsing completes within 10 seconds

### Test 3: Sandpack Rendering
**Objective**: Verify interactive preview renders without infinite loops

```bash
# Run Sandpack rendering test
npm run test:e2e:artifacts
```

**Success Criteria**:
- [ ] Preview button appears in chat interface
- [ ] Clicking preview opens Sandpack renderer
- [ ] Component renders within 30 seconds
- [ ] No infinite loading states detected

### Test 4: TSX Code Block Fallback
**Objective**: Verify TSX code blocks generate preview buttons

```bash
# Test TSX code block detection
npm run test:e2e:tsx
```

**Success Criteria**:
- [ ] TSX code blocks detected in LLM responses
- [ ] Preview button appears for TSX content
- [ ] Fallback rendering works without PAS 3.0 XML

### Test 5: End-to-End Workflow
**Objective**: Validate complete workflow with real LLM

```bash
# Run full E2E test suite
npm run test:e2e:test-page
```

**Success Criteria**:
- [ ] Prompt sent to production LLM endpoint
- [ ] Response contains parseable artifacts
- [ ] Artifacts render successfully in preview
- [ ] No retry loops or timeout errors
- [ ] Total workflow completes within 60 seconds

## Manual Testing Scenarios

### Scenario 1: Basic React Component
1. Open chat interface at http://localhost:8080
2. Type: "Create a React component artifact for a todo list"
3. Wait for LLM response
4. Click the preview button that appears
5. Verify interactive component renders

**Expected Result**: Working todo list component in Sandpack preview

### Scenario 2: Error Recovery
1. Type: "Create an artifact with invalid dependencies"
2. Wait for parsing to complete
3. Observe error message with retry button
4. Click retry button
5. Verify fallback behavior

**Expected Result**: Error message displayed with retry option, no infinite loading

### Scenario 3: Performance Validation
1. Type: "Create multiple artifacts in one response"
2. Monitor browser performance tab
3. Verify all artifacts render
4. Check memory usage and loading times

**Expected Result**: All artifacts render within performance constraints

## Troubleshooting

### Common Issues

**Issue**: Intent classification not triggering
**Solution**: Ensure keywords "artifact" or "preview" are in prompt
**Debug**: Check browser console for classification logs

**Issue**: Sandpack stuck loading
**Solution**: Check network tab for bundle loading errors
**Debug**: Look for timeout errors in console after 30 seconds

**Issue**: PAS 3.0 parsing fails
**Solution**: Verify XML format matches PAS 3.0 schema
**Debug**: Enable XML parser debug logging

**Issue**: E2E tests failing
**Solution**: Verify API keys are valid and have quota
**Debug**: Check test output for specific failure stage

### Debug Commands

```bash
# Run with debug logging
DEBUG=artifact-system npm run dev

# Run specific test with UI
npm run test:e2e:artifacts:ui

# Run with debug mode
npm run test:e2e:artifacts:debug

# Check artifact system health
npm run test:frontend -- --grep="artifact"
```

## Performance Benchmarks

### Expected Performance Metrics
- Intent classification: < 5 seconds
- Artifact parsing: < 10 seconds
- Sandpack loading: < 30 seconds
- End-to-end workflow: < 60 seconds

### Memory Usage Limits
- Maximum 10 active artifacts per session
- Artifact content limited to 1MB each
- Browser memory usage under 500MB

## Success Validation Checklist

**Core Functionality**:
- [ ] Intent classifier works with keyword detection
- [ ] Prompt enhancement generates PAS 3.0 compliant requests
- [ ] XML parser extracts CDATA content correctly
- [ ] Preview buttons appear for detected artifacts
- [ ] Sandpack renderer displays interactive components
- [ ] TSX code blocks generate preview functionality
- [ ] Retry loop prevention works correctly
- [ ] Error handling shows retry buttons

**Performance**:
- [ ] All operations complete within specified timeouts
- [ ] Memory usage stays within limits
- [ ] UI remains responsive during processing
- [ ] No memory leaks detected

**Integration**:
- [ ] E2E tests pass with real LLM endpoints
- [ ] Production API keys work correctly
- [ ] Playwright tests run reliably in CI
- [ ] No flaky test failures

**User Experience**:
- [ ] Clear error messages for failures
- [ ] Loading indicators during processing
- [ ] Retry buttons for failed operations
- [ ] Responsive design on different screen sizes

## Next Steps

After successful validation:
1. Deploy to staging environment
2. Run extended performance testing
3. Gather user feedback on artifact workflow
4. Monitor error rates and retry loop incidents
5. Optimize based on usage patterns

## Advanced Dependency Resolution System Validation

### Test 6: Core Dependency Resolution
**Objective**: Validate 4-tier strategy system for resolving dependencies

```bash
# Run dependency resolver tests
npm run test src/lib/services/artifact-dependency-resolver/
```

**Success Criteria**:
- [ ] CSS module imports converted to inline styles
- [ ] CSS properties transformed to camelCase (background-color → backgroundColor)
- [ ] JSON imports replaced with inline data objects
- [ ] Unresolvable imports cleanly removed
- [ ] Strategy execution follows priority order (100 → 90 → 80 → 10)
- [ ] First successful strategy terminates processing
- [ ] Auto-resolution completes in <1 second

### Test 7: Enhanced Error Recovery UI
**Objective**: Validate two-stage recovery process with progress indicators

```bash
# Test UI components
npm run test:component EnhancedErrorRecovery
```

**Success Criteria**:
- [ ] Component appears only for bundling/dependency-related errors
- [ ] Two-stage process: Auto-resolution → AI Fix progression
- [ ] Progress indicators accurately reflect current stage
- [ ] Button states update correctly (processing, success, failed)
- [ ] Results display shows meaningful strategy information
- [ ] Reset functionality clears state properly
- [ ] Handles both successful and failed recovery attempts

### Test 8: Integration with ArtifactRenderer
**Objective**: Validate smart recovery integration with existing artifact system

```bash
# Integration test with artifact renderer
npm run test:integration artifact-rendering
```

**Success Criteria**:
- [ ] Message content passed to dependency resolution system
- [ ] Smart recovery triggered for CSS module, import, and bundling errors
- [ ] Fixed code properly applied to artifact structure
- [ ] Existing error handling maintained for non-recoverable errors
- [ ] Circuit breaker state reset after successful fixes
- [ ] Original artifact structure preserved during updates

### Test 9: Strategy System Validation
**Objective**: Validate priority-based strategy execution

```bash
# Run strategy system tests
npm run test src/lib/services/artifact-dependency-resolver/strategies/
```

**Success Criteria**:
- [ ] CSS module conversion has highest priority (100)
- [ ] Direct CSS injection has second priority (90)
- [ ] JSON data injection has third priority (80)
- [ ] Import removal fallback has lowest priority (10)
- [ ] Higher priority strategies attempted first
- [ ] System stops after first successful resolution
- [ ] Failed strategies don't prevent subsequent attempts

### Test 10: LLM Integration Validation
**Objective**: Validate AI-powered code fixing service

```bash
# Test LLM auto-fix service
npm run test src/lib/services/llm-autofix-service/
```

**Success Criteria**:
- [ ] Appropriate prompts generated for different error types
- [ ] API failures handled gracefully with meaningful error messages
- [ ] Fixed code validated for basic syntax correctness
- [ ] Confidence scores and explanations provided
- [ ] Retry limits prevent infinite loops
- [ ] Code safety and security maintained

### Test 11: Edge Case Validation
**Objective**: Test system behavior with challenging inputs

```bash
# Run edge case tests
npm run test:edge-cases dependency-resolution
```

**Success Criteria**:
- [ ] Empty or malformed message content handled without crashing
- [ ] CSS blocks without matching imports processed correctly
- [ ] Multiple CSS files with same class names resolved deterministically
- [ ] Nested CSS selectors and pseudo-elements parsed correctly
- [ ] TypeScript vs JavaScript artifact types handled appropriately
- [ ] Large code blocks perform acceptably
- [ ] Circular dependency scenarios fail gracefully

### Test 12: Performance Benchmarking
**Objective**: Validate performance meets specified targets

```bash
# Performance benchmark
npm run test:performance dependency-resolution
```

**Success Criteria**:
- [ ] Auto-resolution completes in <1 second
- [ ] Dependency resolution success rate >85% for CSS modules
- [ ] UI remains responsive during processing
- [ ] Memory usage acceptable with large inputs
- [ ] Performance consistent across different browsers

## Manual Testing Scenarios (Advanced System)

### Scenario 4: CSS Module Import Resolution
1. Send prompt: "Create a React button component with CSS modules"
2. Ensure LLM responds with separate CSS and JSX blocks
3. Wait for artifact error due to CSS module import
4. Verify smart recovery button appears automatically
5. Click auto-fix button
6. Observe CSS converted to inline styles
7. Verify component re-renders successfully

**Expected Result**: CSS module import converted to inline styles, component renders

### Scenario 5: Multi-Block Dependency Resolution
1. Send prompt generating React component + CSS + JSON data blocks
2. Wait for bundling failure due to multiple dependencies
3. Verify auto-resolution processes all dependencies
4. Check that CSS properties are camelCased
5. Verify JSON data is inlined
6. Confirm component renders with all dependencies resolved

**Expected Result**: All dependencies resolved, component fully functional

### Scenario 6: LLM Fallback Recovery
1. Create artifact with complex dependency issue auto-resolution can't fix
2. Verify auto-resolution fails gracefully
3. Observe system automatically attempts LLM-based fix
4. Wait for AI to generate corrected code
5. Verify fixed code is validated before application
6. Confirm component renders with AI-generated solution

**Expected Result**: LLM successfully fixes complex issues, component renders

### Scenario 7: Circuit Breaker Functionality
1. Create artifact that consistently fails resolution
2. Trigger multiple recovery attempts
3. Verify circuit breaker opens after threshold
4. Confirm auto-recovery disabled temporarily
5. Wait for circuit timeout period
6. Verify circuit resets and allows new attempts

**Expected Result**: Circuit breaker prevents infinite loops, recovers gracefully

## Advanced Validation Checklist

**Core Functionality**:
- [ ] Regex-based code block extraction works correctly
- [ ] CSS module imports identified and converted
- [ ] CSS property camelCase conversion accurate
- [ ] JSON import inlining functional
- [ ] Import removal fallback strategy works
- [ ] Strategy priority execution order maintained
- [ ] First-success termination implemented
- [ ] Graceful failure handling for all strategies

**Error Recovery UI**:
- [ ] Conditional display for appropriate errors only
- [ ] Two-stage process progression clear
- [ ] Progress indicators smooth and informative
- [ ] Button states visually distinct
- [ ] Results summary shows meaningful information
- [ ] Reset functionality fully operational
- [ ] Accessibility standards maintained

**Integration**:
- [ ] Message content properly passed to resolution system
- [ ] Smart recovery appears for relevant error types
- [ ] Fixed code correctly applied to artifact structure
- [ ] Circuit breaker prevents infinite retry loops
- [ ] Existing error handling preserved
- [ ] Artifact re-rendering after successful fixes

**Strategy System**:
- [ ] Priority-based execution (100 → 90 → 80 → 10)
- [ ] CSS module conversion highest priority
- [ ] Direct CSS injection second priority
- [ ] JSON data injection third priority
- [ ] Import removal lowest priority
- [ ] Processing stops after first success
- [ ] Strategy failures handled gracefully

**LLM Integration**:
- [ ] Context-aware prompt generation
- [ ] API failure graceful handling
- [ ] Basic syntax validation of fixes
- [ ] Confidence scoring implemented
- [ ] Retry limits enforced
- [ ] Security validation maintained

**Edge Cases**:
- [ ] Malformed input handled without crashes
- [ ] Performance acceptable with large inputs
- [ ] Ambiguous matches resolved deterministically
- [ ] Complex CSS parsed correctly or fails gracefully
- [ ] Browser compatibility maintained
- [ ] Memory usage within limits

**User Experience**:
- [ ] Clear feedback during processing
- [ ] Meaningful error messages for failures
- [ ] Users understand what was changed
- [ ] Options to retry or reset available
- [ ] Responsive design across browsers
- [ ] Smooth progress indicators

## Phase 3.6: Performance & Polish Validation

### Test 13: Performance Optimization Validation
**Objective**: Validate performance optimizer and memory manager

```bash
# Run performance optimization tests
npm run test src/lib/services/artifact-dependency-resolver/performance-optimizer.ts
npm run test src/lib/utils/artifacts/memory-manager.ts
```

**Success Criteria**:
- [ ] Caching reduces repeated resolution time by >50%
- [ ] Parallel processing improves multi-strategy performance
- [ ] Early termination prevents unnecessary processing
- [ ] Memory manager handles large artifacts without crashes
- [ ] Streaming processing works for content >50MB
- [ ] Garbage collection triggers at appropriate thresholds
- [ ] Performance monitoring provides accurate metrics

### Test 14: Cross-Browser Compatibility
**Objective**: Validate system works across Chrome, Firefox, and Safari

```bash
# Run browser compatibility tests
npm run test src/lib/test/compatibility/test-browser-compatibility.spec.ts
```

**Success Criteria**:
- [ ] Chrome: Full feature support with performance API
- [ ] Firefox: Works without performance.memory API
- [ ] Safari: Handles vendor prefixes and limited features
- [ ] Performance variations <100% between browsers
- [ ] Error handling consistent across browsers
- [ ] Feature detection works properly

### Test 15: UI Responsiveness Validation
**Objective**: Ensure UI remains responsive during intensive operations

```bash
# Run UI responsiveness tests
npm run test src/lib/test/ui/test-ui-responsiveness.spec.ts
```

**Success Criteria**:
- [ ] UI handles rapid user interactions during processing
- [ ] Animations maintain >30fps during operations
- [ ] Memory usage stays <50MB growth during processing
- [ ] Event loop yields prevent blocking
- [ ] Resource cleanup on component unmount
- [ ] High-frequency updates handled smoothly

### Test 16: Success Rate Validation
**Objective**: Validate >85% success rate for CSS module conversions

```bash
# Run success rate validation tests
npm run test src/lib/test/performance/test-success-rates.spec.ts
```

**Success Criteria**:
- [ ] CSS module conversion success rate >85%
- [ ] JSON inlining success rate >80%
- [ ] Fallback strategies success rate >70%
- [ ] Overall system success rate >80%
- [ ] Performance <1s average per resolution
- [ ] Consistent success rates across multiple runs
- [ ] Load testing maintains success rates

### Test 17: User Experience Validation
**Objective**: Validate excellent user experience throughout process

```bash
# Run user experience validation tests
npm run test src/lib/test/ux/test-user-experience.spec.ts
```

**Success Criteria**:
- [ ] Clear and inviting initial state
- [ ] Helpful guidance about recovery process
- [ ] Clear progress feedback during operations
- [ ] Encouraging messaging during two-stage progression
- [ ] Intuitive controls and keyboard navigation
- [ ] Logical information hierarchy
- [ ] Appropriate visual design and accessibility

### Test 18: Accessibility Standards Validation
**Objective**: Ensure WCAG 2.1 AA compliance

```bash
# Run accessibility validation tests
npm run test src/lib/test/a11y/test-accessibility.spec.ts
```

**Success Criteria**:
- [ ] Proper semantic HTML structure
- [ ] Adequate color contrast ratios (4.5:1 minimum)
- [ ] Full keyboard navigation support
- [ ] ARIA labels and descriptions provided
- [ ] Screen reader announcements working
- [ ] Click targets ≥44x44px
- [ ] Works without color alone to convey information
- [ ] Visual alternatives to audio cues

### Test 19: Security Validation
**Objective**: Ensure generated code is secure and prevents vulnerabilities

```bash
# Run security validation tests
npm run test src/lib/test/security/test-code-security.spec.ts
```

**Success Criteria**:
- [ ] XSS prevention in CSS and JSON content
- [ ] Code injection prevention in templates
- [ ] CSP-compliant output generation
- [ ] URL validation and sanitization
- [ ] Proper output encoding and escaping
- [ ] AI-generated code security validation
- [ ] No sensitive information exposure in errors

## Manual Testing Scenarios (Phase 3.6)

### Scenario 8: Performance Under Load
1. Create 10 artifacts simultaneously with CSS module dependencies
2. Monitor browser performance and memory usage
3. Verify all artifacts resolve successfully
4. Check that UI remains responsive
5. Validate memory cleanup after completion

**Expected Result**: All artifacts resolve with maintained performance

### Scenario 9: Accessibility Testing
1. Navigate using only keyboard
2. Test with screen reader (NVDA/JAWS/VoiceOver)
3. Verify high contrast mode support
4. Test at 200% zoom level
5. Validate focus indicators and announcements

**Expected Result**: Full accessibility across all scenarios

### Scenario 10: Security Validation
1. Attempt to inject malicious CSS with javascript: URLs
2. Try XSS through JSON data injection
3. Test with malformed/dangerous input patterns
4. Verify error messages don't expose sensitive paths
5. Check AI-generated code for security issues

**Expected Result**: All malicious content sanitized, no vulnerabilities

### Scenario 11: Browser Compatibility
1. Test same artifact resolution in Chrome, Firefox, Safari
2. Compare performance and success rates
3. Verify vendor prefix handling in Safari
4. Test memory management without performance API
5. Validate consistent error handling

**Expected Result**: Consistent behavior across all browsers

## Advanced Performance Benchmarks

### Performance Targets (Phase 3.6)
- Cache hit performance improvement: >50% reduction
- Memory streaming threshold: 50MB+ content
- UI responsiveness: >30fps during processing
- Cross-browser performance variation: <100%
- Memory growth limit: <50MB during processing
- Garbage collection efficiency: >90% cleanup

### Success Rate Targets
- **CSS Module Conversion**: >85% success rate
- **JSON Data Inlining**: >80% success rate
- **Fallback Strategies**: >70% success rate
- **Overall System**: >80% success rate
- **Load Testing**: Maintain rates under 20 concurrent requests

### User Experience Metrics
- **Time to Understanding**: <5 seconds to comprehend interface
- **Task Completion**: >90% users can successfully trigger recovery
- **Satisfaction**: >4.0/5.0 rating for clarity and helpfulness
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Error Recovery**: <10 seconds to understand and retry failures

## Comprehensive Validation Checklist (Phase 3.6)

**Performance Optimization**:
- [ ] Caching system reduces redundant processing
- [ ] Parallel processing improves throughput
- [ ] Early termination prevents unnecessary work
- [ ] Memory manager handles large content safely
- [ ] Performance monitoring provides insights
- [ ] Resource cleanup prevents memory leaks

**Browser Compatibility**:
- [ ] Chrome optimizations fully utilized
- [ ] Firefox limitations properly handled
- [ ] Safari vendor prefixes correctly applied
- [ ] Feature detection working reliably
- [ ] Performance consistent across browsers
- [ ] Error messages standardized

**UI Responsiveness**:
- [ ] Non-blocking operations during processing
- [ ] Smooth animations throughout
- [ ] Memory pressure handled gracefully
- [ ] Event loop management prevents freezing
- [ ] Cleanup on component unmount
- [ ] High-frequency updates processed smoothly

**Success Rates**:
- [ ] CSS module conversions exceed 85% success
- [ ] JSON inlining maintains high success rate
- [ ] Fallback strategies provide reliability
- [ ] Overall system performance targets met
- [ ] Consistency across multiple test runs
- [ ] Load testing validates scalability

**User Experience**:
- [ ] Initial interface clear and inviting
- [ ] Process guidance helpful and informative
- [ ] Progress feedback accurate and encouraging
- [ ] Controls intuitive and accessible
- [ ] Information architecture logical
- [ ] Visual design supports usability

**Accessibility**:
- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation fully functional
- [ ] Screen reader compatibility confirmed
- [ ] Color contrast standards met
- [ ] Motor impairment accommodations working
- [ ] Cognitive accessibility features present

**Security**:
- [ ] XSS prevention mechanisms effective
- [ ] Code injection attacks blocked
- [ ] CSP compliance maintained
- [ ] Input validation and sanitization working
- [ ] Output encoding prevents exploits
- [ ] AI-generated code security validated

**Status**: ✅ Ready for comprehensive Phase 3.6 validation with Performance & Polish testing