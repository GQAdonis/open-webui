# Quick Start: Enhanced Artifact Creation and Preview System

**Feature**: 001-create-and-or
**Date**: 2025-01-27

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

**Status**: ✅ Ready for task generation