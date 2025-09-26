# Artifact System Troubleshooting Guide (T050)

## Overview

This guide provides comprehensive troubleshooting information for common issues encountered with the Enhanced Artifact Creation and Preview System in Open WebUI. The system includes intent classification, XML parsing, retry monitoring, workflow orchestration, and browser compatibility features.

## Quick Diagnosis

### System Health Check

Run these commands to quickly assess system health:

```bash
# Check if artifact system is enabled
curl -s http://localhost:3000/api/config | grep -i artifact

# Test XML parsing performance
npm run test tests/unit/xml-parser.unit.test.ts -- --reporter=verbose

# Verify browser compatibility
npx playwright test tests/e2e/browser-compatibility.spec.js --headed

# Check memory usage
npm run test tests/unit/workflow.unit.test.ts -- --grep "Performance"
```

### Common Symptoms and Quick Fixes

| Symptom | Quick Fix | Section |
|---------|-----------|---------|
| Artifacts not detected | Check XML format | [Artifact Detection Issues](#artifact-detection-issues) |
| Infinite loading | Circuit breaker triggered | [Rendering Issues](#rendering-issues) |
| Performance degradation | Clear artifact cache | [Performance Issues](#performance-issues) |
| Security warnings | Validate XML content | [Security Issues](#security-issues) |
| Browser incompatibility | Update browser/check features | [Browser Issues](#browser-compatibility-issues) |

## Artifact Detection Issues

### Problem: Artifacts Not Being Detected

**Symptoms:**
- Artifact button doesn't appear on messages
- Intent classifier returns low confidence scores
- No artifacts parsed from LLM responses

**Diagnostic Steps:**

1. **Check XML Format Compliance**
   ```typescript
   // Verify PAS 3.0 format
   const xmlContent = `<artifact identifier="test" type="text/html" title="Test">
   <file path="index.html">
   <![CDATA[<h1>Hello World</h1>]]>
   </file>
   </artifact>`;

   const result = parseArtifactsFromContent(xmlContent);
   console.log('Parsing result:', result);
   ```

2. **Test Intent Classification**
   ```typescript
   import { intentClassifier } from '$lib/services/intent-classifier';

   const result = await intentClassifier.classifyIntent('Create a React component');
   console.log('Intent classification:', result);

   // Expected: confidence > 0.7, shouldEnhance = true
   ```

3. **Verify Artifact Keywords**
   ```typescript
   // Check for required keywords
   const keywords = ['create', 'build', 'make', 'component', 'app', 'website'];
   const prompt = 'Your user prompt here';
   const hasKeywords = keywords.some(keyword =>
     prompt.toLowerCase().includes(keyword.toLowerCase())
   );
   ```

**Solutions:**

1. **Fix XML Format Issues**
   - Ensure proper CDATA wrapping for code content
   - Include required attributes: `identifier`, `type`, `title`
   - Use valid MIME types: `text/html`, `application/vnd.react+jsx`, etc.

2. **Enhance Prompt Detection**
   ```typescript
   // Add more specific keywords
   const enhancedPrompt = `Create a React component that displays a counter with increment button`;
   // vs vague: "Make something interactive"
   ```

3. **Enable Debug Logging**
   ```typescript
   localStorage.setItem('artifact_debug', 'true');
   localStorage.setItem('intent_classifier_debug', 'true');
   ```

### Problem: False Positive Detection

**Symptoms:**
- Artifact buttons appear on non-artifact messages
- Intent classifier over-triggers
- Unwanted XML parsing attempts

**Solutions:**

1. **Adjust Classification Thresholds**
   ```typescript
   // Lower confidence threshold for stricter detection
   const config = {
     confidenceThreshold: 0.8, // Increase from default 0.7
     minKeywordMatches: 2       // Require more keyword matches
   };
   intentClassifier.updateConfig(config);
   ```

2. **Add Negative Keywords**
   ```typescript
   const negativeKeywords = ['what is', 'explain', 'how does', 'why'];
   // These should reduce artifact confidence
   ```

## Rendering Issues

### Problem: Infinite Loading or Rendering Failures

**Symptoms:**
- Sandpack components never finish loading
- Circuit breaker alerts in console
- Retry loop monitor blocking attempts

**Diagnostic Steps:**

1. **Check Circuit Breaker Status**
   ```typescript
   import { retryLoopMonitor } from '$lib/services/retry-loop-monitor';

   const componentId = 'artifact-renderer-123';
   const canRetry = retryLoopMonitor.canRetry(componentId);
   const state = retryLoopMonitor.getComponentState(componentId);

   console.log('Can retry:', canRetry);
   console.log('Component state:', state);
   ```

2. **Monitor Performance**
   ```typescript
   import { performanceMonitor } from '$lib/services/performance-monitor';

   const sessionId = performanceMonitor.startMonitoring('debug-render');
   // ... rendering attempt ...
   const metrics = performanceMonitor.stopMonitoring(sessionId);
   console.log('Performance metrics:', metrics);
   ```

3. **Check Browser Console**
   - Look for Sandpack errors
   - Check for network request failures
   - Verify iframe sandbox permissions

**Solutions:**

1. **Reset Circuit Breaker**
   ```typescript
   retryLoopMonitor.resetCircuit('artifact-renderer-123');
   ```

2. **Increase Timeout Settings**
   ```typescript
   import { getBrowserTimeouts } from '$lib/utils/browser-compatibility';

   const timeouts = getBrowserTimeouts();
   console.log('Browser-specific timeouts:', timeouts);

   // Manually increase for slow connections
   const customTimeouts = {
     sandpackLoad: 30000,    // 30 seconds
     artifactRender: 20000,  // 20 seconds
     networkRequest: 10000   // 10 seconds
   };
   ```

3. **Clear Sandpack Cache**
   ```typescript
   // Clear Sandpack internal cache
   if (typeof window !== 'undefined') {
     localStorage.removeItem('sandpack-cache');
     sessionStorage.clear();
   }
   ```

### Problem: Specific Browser Rendering Issues

**Safari-specific Issues:**
```typescript
// Safari workarounds
if (browserInfo.name === 'Safari') {
  // Increase timeouts
  const safariTimeouts = getBrowserTimeouts(browserInfo);

  // Handle webkit-specific CSS
  document.documentElement.style.setProperty('--webkit-transform', 'translateZ(0)');
}
```

**Firefox-specific Issues:**
```typescript
// Firefox CSP issues
if (browserInfo.name === 'Firefox') {
  // Check for content security policy violations
  console.log('Firefox CSP mode detected, using compatible rendering');
}
```

## Performance Issues

### Problem: Slow Artifact Processing

**Symptoms:**
- XML parsing takes >1 second
- Intent classification exceeds 100ms
- Memory usage grows continuously
- Page becomes unresponsive

**Diagnostic Steps:**

1. **Performance Profiling**
   ```typescript
   // Enable performance monitoring
   const startTime = performance.now();

   const result = await artifactWorkflow.executeWorkflow(request);

   const endTime = performance.now();
   console.log(`Workflow completed in ${endTime - startTime}ms`);

   // Target: <5000ms for complete workflow
   ```

2. **Memory Usage Check**
   ```typescript
   import { artifactMemoryManager } from '$lib/services/artifact-memory-manager';

   const stats = artifactMemoryManager.getStats();
   console.log('Memory stats:', stats);

   // Check if approaching limits
   if (stats.memoryUsageBytes > 40 * 1024 * 1024) { // 40MB
     console.warn('High memory usage detected');
   }
   ```

3. **Cache Performance**
   ```typescript
   import { getCacheStats } from '$lib/utils/artifacts/xml-artifact-parser';

   const cacheStats = getCacheStats();
   console.log('Cache performance:', cacheStats);
   ```

**Solutions:**

1. **Clear Memory Cache**
   ```typescript
   // Clear artifact memory
   artifactMemoryManager.clear();

   // Clear parsing cache
   clearParseCache();

   // Force garbage collection (Chrome DevTools)
   if (window.gc) window.gc();
   ```

2. **Optimize Configuration**
   ```typescript
   // Reduce memory limits for low-memory devices
   artifactMemoryManager.updateConfig({
     maxMemoryUsage: 25 * 1024 * 1024, // 25MB instead of 50MB
     maxArtifacts: 500,                 // 500 instead of 1000
     cleanupThreshold: 0.7              // Clean earlier at 70%
   });
   ```

3. **Enable Compression**
   ```typescript
   // Ensure compression is enabled
   const config = artifactMemoryManager.getConfig();
   if (!config.compressionEnabled) {
     artifactMemoryManager.updateConfig({ compressionEnabled: true });
   }
   ```

### Problem: Memory Leaks

**Symptoms:**
- Browser tab memory continuously increases
- Artifact count grows without bounds
- Performance degrades over time

**Solutions:**

1. **Monitor Active Workflows**
   ```typescript
   import { artifactWorkflow } from '$lib/services/artifact-workflow';

   const activeCount = artifactWorkflow.getActiveWorkflowCount();
   if (activeCount > 5) {
     console.warn('Too many active workflows:', activeCount);
   }
   ```

2. **Implement Periodic Cleanup**
   ```typescript
   // Set up cleanup interval
   setInterval(() => {
     const stats = artifactMemoryManager.getStats();
     if (stats.memoryUsageBytes > 30 * 1024 * 1024) {
       artifactMemoryManager.performCleanup();
     }
   }, 60000); // Every minute
   ```

## Security Issues

### Problem: Security Validation Failures

**Symptoms:**
- XML security warnings in console
- Artifacts blocked from rendering
- CSP violations in browser console

**Diagnostic Steps:**

1. **Test Security Validation**
   ```typescript
   import { validateXMLSecurity } from '$lib/utils/artifacts/xml-artifact-parser';

   const content = `<!-- Your XML content here -->`;
   const securityCheck = validateXMLSecurity(content);

   if (!securityCheck.isSecure) {
     console.error('Security violations:', securityCheck.violations);
   }
   ```

2. **Check for Malicious Patterns**
   ```typescript
   const patterns = [
     /<!DOCTYPE/i,           // DOCTYPE declarations
     /<!ENTITY/i,           // Entity declarations
     /<script[^>]*>/i,      // Script tags
     /javascript:/i,        // JavaScript URLs
     /on[a-z]+\s*=/i       // Event handlers
   ];

   patterns.forEach(pattern => {
     if (pattern.test(content)) {
       console.warn('Potentially dangerous pattern found:', pattern);
     }
   });
   ```

**Solutions:**

1. **Sanitize Content**
   ```typescript
   import { sanitizeXMLContent } from '$lib/utils/artifacts/xml-artifact-parser';

   const sanitized = sanitizeXMLContent(content);
   ```

2. **Validate Dependencies**
   ```typescript
   // Check for suspicious dependencies
   const dependencies = ['react', 'lodash']; // Your dependencies
   const suspicious = dependencies.filter(dep => {
     return /^[0-9]/.test(dep) || // Starts with number
            /[il1|]/.test(dep) ||  // Confusing characters
            /(hack|malware|virus)/i.test(dep); // Suspicious names
   });

   if (suspicious.length > 0) {
     console.warn('Suspicious dependencies:', suspicious);
   }
   ```

### Problem: CSP Violations

**Solutions:**

1. **Check CSP Headers**
   ```javascript
   // In browser console
   console.log(document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
   ```

2. **Update CSP for Sandpack**
   ```html
   <!-- Add to CSP policy -->
   frame-src 'self' https://sandpack-bundler.codesandbox.io;
   worker-src 'self' blob:;
   ```

## Browser Compatibility Issues

### Problem: Feature Not Supported

**Symptoms:**
- Browser compatibility warnings
- Missing functionality in certain browsers
- Rendering differences across browsers

**Diagnostic Steps:**

1. **Check Browser Support**
   ```typescript
   import { checkMinimumRequirements, getBrowserInfo } from '$lib/utils/browser-compatibility';

   const browserInfo = getBrowserInfo();
   const requirements = checkMinimumRequirements();

   console.log('Browser:', browserInfo);
   console.log('Requirements check:', requirements);
   ```

2. **Test Specific Features**
   ```typescript
   import { checkCompatibilityFeatures } from '$lib/utils/browser-compatibility';

   const features = checkCompatibilityFeatures();
   console.log('Compatibility features:', features);

   if (!features.sandpackSupport) {
     console.warn('Sandpack not supported in this browser');
   }
   ```

**Solutions:**

1. **Browser-Specific Fallbacks**
   ```typescript
   // Safari fallback
   if (browserInfo.name === 'Safari') {
     // Use longer timeouts
     const timeouts = getBrowserTimeouts(browserInfo);

     // Apply webkit-specific fixes
     document.documentElement.style.setProperty('--webkit-fix', 'translateZ(0)');
   }

   // Firefox fallback
   if (browserInfo.name === 'Firefox') {
     // Handle CSP restrictions
     console.log('Applying Firefox compatibility mode');
   }
   ```

2. **Feature Detection**
   ```typescript
   // Check for required features
   if (!features.iframeSupport) {
     // Show warning to user
     console.warn('iframe support required for HTML artifacts');
   }

   if (!features.webComponentsSupport) {
     // Use polyfill or alternative rendering
     console.info('Using fallback rendering for web components');
   }
   ```

## Configuration Issues

### Problem: Environment Configuration

**Symptoms:**
- Services not initializing properly
- Missing environment variables
- Incorrect service configurations

**Solutions:**

1. **Check Environment Variables**
   ```bash
   # Required environment variables
   echo $PUBLIC_REACT_ARTIFACTS_ENABLED
   echo $PUBLIC_SVELTE_ARTIFACTS_ENABLED
   ```

2. **Verify Service Configuration**
   ```typescript
   // Check service configurations
   import { intentClassifier } from '$lib/services/intent-classifier';
   import { retryLoopMonitor } from '$lib/services/retry-loop-monitor';

   console.log('Intent classifier config:', intentClassifier.getConfig());
   console.log('Retry monitor config:', retryLoopMonitor.getConfig());
   ```

3. **Update Configuration**
   ```typescript
   // Update configurations as needed
   intentClassifier.updateConfig({
     confidenceThreshold: 0.75,
     maxKeywords: 50,
     performanceTarget: 100
   });

   retryLoopMonitor.updateConfig({
     maxConsecutiveFailures: 5,
     circuitOpenDuration: 60000,
     alertThreshold: 3
   });
   ```

## Advanced Troubleshooting

### Debug Mode Setup

1. **Enable All Debug Logging**
   ```typescript
   localStorage.setItem('artifact_debug', 'true');
   localStorage.setItem('intent_classifier_debug', 'true');
   localStorage.setItem('xml_parser_debug', 'true');
   localStorage.setItem('retry_monitor_debug', 'true');
   localStorage.setItem('workflow_debug', 'true');
   ```

2. **Capture Performance Metrics**
   ```typescript
   // Monitor all operations
   const debugSession = performanceMonitor.startMonitoring('debug-session');

   // ... perform operations ...

   const metrics = performanceMonitor.stopMonitoring(debugSession);
   console.log('Complete performance profile:', metrics);
   ```

### Network Debugging

1. **Check Network Tab**
   - Look for failed requests to Sandpack CDN
   - Verify CORS issues
   - Check for blocked resources

2. **Test Network Connectivity**
   ```javascript
   // Test Sandpack connectivity
   fetch('https://sandpack-bundler.codesandbox.io')
     .then(response => console.log('Sandpack reachable:', response.ok))
     .catch(error => console.error('Sandpack unreachable:', error));
   ```

### Memory Debugging

1. **Chrome DevTools Memory Tab**
   - Take heap snapshots before/after operations
   - Look for retained objects
   - Check for memory leaks

2. **Monitor Memory Usage**
   ```typescript
   // Monitor memory in production
   if ('memory' in performance) {
     setInterval(() => {
       const memory = (performance as any).memory;
       console.log('Memory usage:', {
         used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
         total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
         limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
       });
     }, 10000);
   }
   ```

## Getting Help

### Reporting Issues

When reporting issues, include:

1. **Browser Information**
   ```typescript
   import { getBrowserInfo } from '$lib/utils/browser-compatibility';
   console.log('Browser info:', getBrowserInfo());
   ```

2. **System State**
   ```typescript
   // Capture system state
   const systemState = {
     memory: artifactMemoryManager.getStats(),
     cache: getCacheStats(),
     activeWorkflows: artifactWorkflow.getActiveWorkflowCount(),
     alerts: retryLoopMonitor.getActiveAlerts()
   };
   console.log('System state:', systemState);
   ```

3. **Performance Metrics**
   ```typescript
   // Include performance data
   const perfData = {
     intentClassificationMs: /* last measurement */,
     xmlParsingMs: /* last measurement */,
     renderingMs: /* last measurement */
   };
   ```

### Support Resources

- **Documentation**: `/docs/ARTIFACT_SYSTEM_INTEGRATION.md`
- **Unit Tests**: Run `npm test` for examples and validation
- **Browser Tests**: `npx playwright test tests/e2e/browser-compatibility.spec.js`
- **Performance Tests**: Check `tests/unit/workflow.unit.test.ts` for performance benchmarks

### Common Fixes Summary

1. **Clear all caches**: Memory, parsing, and browser caches
2. **Reset circuit breakers**: Use retry monitor reset functions
3. **Update browser**: Ensure minimum version requirements
4. **Check network**: Verify Sandpack CDN accessibility
5. **Validate XML**: Ensure PAS 3.0 compliance and security
6. **Monitor performance**: Use built-in performance monitoring tools
7. **Enable debugging**: Use debug flags for detailed logging

This troubleshooting guide covers the most common issues encountered with the Enhanced Artifact Creation and Preview System. For additional support, refer to the comprehensive test suites and documentation.