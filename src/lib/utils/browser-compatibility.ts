/**
 * Browser Compatibility Utilities (T048)
 *
 * Provides utilities for detecting browser capabilities and handling
 * cross-browser compatibility issues in the artifact system.
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  isMobile: boolean;
  supportsModules: boolean;
  supportsWebGL: boolean;
  supportsWorkers: boolean;
  supportsLocalStorage: boolean;
  supportsSessionStorage: boolean;
}

export interface CompatibilityFeatures {
  sandpackSupport: boolean;
  iframeSupport: boolean;
  svgSupport: boolean;
  jsxSupport: boolean;
  cssGridSupport: boolean;
  customElementsSupport: boolean;
  webComponentsSupport: boolean;
  performanceApiSupport: boolean;
}

/**
 * Detect current browser information
 */
export function getBrowserInfo(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor || '';

  let name = 'Unknown';
  let version = 'Unknown';
  let engine = 'Unknown';

  // Chrome detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  }
  // Firefox detection
  else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Gecko';
  }
  // Safari detection
  else if (userAgent.includes('Safari') && vendor.includes('Apple')) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'WebKit';
  }
  // Edge detection
  else if (userAgent.includes('Edg')) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
    engine = 'Blink';
  }

  // Platform detection
  let platform = 'Unknown';
  if (userAgent.includes('Windows')) platform = 'Windows';
  else if (userAgent.includes('Mac')) platform = 'macOS';
  else if (userAgent.includes('Linux')) platform = 'Linux';
  else if (userAgent.includes('Android')) platform = 'Android';
  else if (userAgent.includes('iOS')) platform = 'iOS';

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return {
    name,
    version,
    engine,
    platform,
    isMobile,
    supportsModules: 'noModule' in HTMLScriptElement.prototype,
    supportsWebGL: !!window.WebGLRenderingContext,
    supportsWorkers: typeof Worker !== 'undefined',
    supportsLocalStorage: typeof Storage !== 'undefined' && !!window.localStorage,
    supportsSessionStorage: typeof Storage !== 'undefined' && !!window.sessionStorage
  };
}

/**
 * Check browser compatibility features for artifact system
 */
export function checkCompatibilityFeatures(): CompatibilityFeatures {
  const browserInfo = getBrowserInfo();

  return {
    sandpackSupport: checkSandpackSupport(browserInfo),
    iframeSupport: checkIframeSupport(),
    svgSupport: checkSVGSupport(),
    jsxSupport: checkJSXSupport(browserInfo),
    cssGridSupport: checkCSSGridSupport(),
    customElementsSupport: checkCustomElementsSupport(),
    webComponentsSupport: checkWebComponentsSupport(),
    performanceApiSupport: checkPerformanceApiSupport()
  };
}

/**
 * Check if browser supports Sandpack requirements
 */
function checkSandpackSupport(browserInfo: BrowserInfo): boolean {
  // Sandpack requires modern browser features
  const hasRequiredFeatures =
    browserInfo.supportsModules &&
    browserInfo.supportsWorkers &&
    typeof fetch !== 'undefined' &&
    typeof Promise !== 'undefined' &&
    typeof Map !== 'undefined' &&
    typeof Set !== 'undefined';

  // Version requirements
  const meetsVersionRequirements =
    (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) >= 70) ||
    (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) >= 65) ||
    (browserInfo.name === 'Safari' && parseInt(browserInfo.version) >= 12) ||
    (browserInfo.name === 'Edge' && parseInt(browserInfo.version) >= 79);

  return hasRequiredFeatures && meetsVersionRequirements;
}

/**
 * Check iframe support and security
 */
function checkIframeSupport(): boolean {
  try {
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-scripts allow-same-origin';
    return iframe.sandbox === 'allow-scripts allow-same-origin';
  } catch (error) {
    return false;
  }
}

/**
 * Check SVG support
 */
function checkSVGSupport(): boolean {
  return !!(
    document.createElementNS &&
    document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
  );
}

/**
 * Check JSX/React support capability
 */
function checkJSXSupport(browserInfo: BrowserInfo): boolean {
  // JSX is compiled, but we need modern JS features
  return (
    typeof Symbol !== 'undefined' &&
    typeof Object.assign !== 'undefined' &&
    typeof Array.from !== 'undefined' &&
    !browserInfo.isMobile // Mobile might have performance limitations
  );
}

/**
 * Check CSS Grid support
 */
function checkCSSGridSupport(): boolean {
  try {
    const div = document.createElement('div');
    div.style.display = 'grid';
    return div.style.display === 'grid';
  } catch (error) {
    return false;
  }
}

/**
 * Check Custom Elements support
 */
function checkCustomElementsSupport(): boolean {
  return typeof customElements !== 'undefined' && typeof customElements.define === 'function';
}

/**
 * Check Web Components support
 */
function checkWebComponentsSupport(): boolean {
  return (
    checkCustomElementsSupport() &&
    typeof ShadowRoot !== 'undefined' &&
    typeof HTMLTemplateElement !== 'undefined'
  );
}

/**
 * Check Performance API support
 */
function checkPerformanceApiSupport(): boolean {
  return (
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function' &&
    typeof performance.mark === 'function'
  );
}

/**
 * Apply browser-specific configurations
 */
export function applyBrowserSpecificConfig(): void {
  const browserInfo = getBrowserInfo();

  // Safari-specific configurations
  if (browserInfo.name === 'Safari') {
    // Fix webkit transform issues
    document.documentElement.style.setProperty('--webkit-transform', 'translateZ(0)');

    // Handle webkit animation issues
    if (typeof window !== 'undefined') {
      (window as any).requestAnimationFrame =
        (window as any).requestAnimationFrame ||
        (window as any).webkitRequestAnimationFrame;
    }
  }

  // Firefox-specific configurations
  if (browserInfo.name === 'Firefox') {
    // Handle Firefox scrollbar styling
    document.documentElement.style.setProperty('--firefox-scrollbar', 'thin');
  }

  // Chrome-specific configurations
  if (browserInfo.name === 'Chrome') {
    // Enable hardware acceleration
    document.documentElement.style.setProperty('--chrome-acceleration', 'translateZ(0)');
  }

  // Mobile-specific configurations
  if (browserInfo.isMobile) {
    // Disable hover effects on mobile
    document.documentElement.classList.add('mobile-device');

    // Optimize touch interactions
    document.documentElement.style.setProperty('touch-action', 'manipulation');
  }
}

/**
 * Get browser-specific timeout values
 */
export function getBrowserTimeouts(browserInfo?: BrowserInfo): {
  sandpackLoad: number;
  artifactRender: number;
  networkRequest: number;
  xmlParsing: number;
} {
  const browser = browserInfo || getBrowserInfo();

  // Base timeouts
  let sandpackLoad = 15000;
  let artifactRender = 10000;
  let networkRequest = 5000;
  let xmlParsing = 1000;

  // Safari tends to be slower
  if (browser.name === 'Safari') {
    sandpackLoad *= 1.5;
    artifactRender *= 1.3;
    networkRequest *= 1.2;
    xmlParsing *= 1.1;
  }

  // Mobile devices need more time
  if (browser.isMobile) {
    sandpackLoad *= 1.8;
    artifactRender *= 1.5;
    networkRequest *= 1.3;
    xmlParsing *= 1.2;
  }

  // Firefox sometimes needs extra time for complex renders
  if (browser.name === 'Firefox') {
    sandpackLoad *= 1.2;
    artifactRender *= 1.1;
  }

  return {
    sandpackLoad: Math.round(sandpackLoad),
    artifactRender: Math.round(artifactRender),
    networkRequest: Math.round(networkRequest),
    xmlParsing: Math.round(xmlParsing)
  };
}

/**
 * Handle browser-specific errors
 */
export function handleBrowserError(error: Error, browserInfo?: BrowserInfo): {
  message: string;
  recoverable: boolean;
  suggestion: string;
} {
  const browser = browserInfo || getBrowserInfo();
  const errorMessage = error.message.toLowerCase();

  // Safari-specific errors
  if (browser.name === 'Safari') {
    if (errorMessage.includes('unhandled promise rejection')) {
      return {
        message: 'Safari promise handling issue detected',
        recoverable: true,
        suggestion: 'Try refreshing the page or updating Safari to the latest version'
      };
    }

    if (errorMessage.includes('load') && errorMessage.includes('blocked')) {
      return {
        message: 'Safari blocked resource loading',
        recoverable: true,
        suggestion: 'Check Safari content blocking settings and disable ad blockers for this site'
      };
    }
  }

  // Firefox-specific errors
  if (browser.name === 'Firefox') {
    if (errorMessage.includes('content security policy')) {
      return {
        message: 'Firefox CSP restriction detected',
        recoverable: true,
        suggestion: 'Firefox has strict CSP policies. Try disabling extensions or using a private window'
      };
    }

    if (errorMessage.includes('sandbox')) {
      return {
        message: 'Firefox sandbox limitation',
        recoverable: false,
        suggestion: 'This artifact requires features not available in Firefox sandbox mode'
      };
    }
  }

  // Chrome-specific errors
  if (browser.name === 'Chrome') {
    if (errorMessage.includes('memory')) {
      return {
        message: 'Chrome memory limitation reached',
        recoverable: true,
        suggestion: 'Close other tabs or restart Chrome to free up memory'
      };
    }
  }

  // Mobile-specific errors
  if (browser.isMobile) {
    if (errorMessage.includes('timeout')) {
      return {
        message: 'Mobile device timeout',
        recoverable: true,
        suggestion: 'Mobile devices may need more time to load complex artifacts. Try a simpler version.'
      };
    }
  }

  // Generic fallback
  return {
    message: `Browser error in ${browser.name} ${browser.version}`,
    recoverable: true,
    suggestion: 'Try refreshing the page or using a different browser'
  };
}

/**
 * Check if current browser meets minimum requirements
 */
export function checkMinimumRequirements(): {
  supported: boolean;
  issues: string[];
  recommendations: string[];
} {
  const browserInfo = getBrowserInfo();
  const features = checkCompatibilityFeatures();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check minimum browser versions
  if (browserInfo.name === 'Chrome' && parseInt(browserInfo.version) < 70) {
    issues.push('Chrome version too old (minimum: 70)');
    recommendations.push('Update Chrome to the latest version');
  }

  if (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) < 65) {
    issues.push('Firefox version too old (minimum: 65)');
    recommendations.push('Update Firefox to the latest version');
  }

  if (browserInfo.name === 'Safari' && parseInt(browserInfo.version) < 12) {
    issues.push('Safari version too old (minimum: 12)');
    recommendations.push('Update Safari to the latest version');
  }

  // Check essential features
  if (!features.iframeSupport) {
    issues.push('Iframe support is required but not available');
    recommendations.push('Enable iframe support in browser settings');
  }

  if (!features.sandpackSupport) {
    issues.push('Browser does not support required Sandpack features');
    recommendations.push('Use a modern browser with ES6+ support');
  }

  if (!browserInfo.supportsLocalStorage) {
    issues.push('Local storage is required but not available');
    recommendations.push('Enable local storage in browser settings');
  }

  // Mobile warnings
  if (browserInfo.isMobile) {
    recommendations.push('For best experience, use a desktop browser');
    recommendations.push('Some complex artifacts may have limited functionality on mobile');
  }

  return {
    supported: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Initialize browser compatibility on page load
 */
export function initializeBrowserCompatibility(): void {
  // Apply browser-specific configurations
  applyBrowserSpecificConfig();

  // Check minimum requirements and warn if needed
  const requirements = checkMinimumRequirements();
  if (!requirements.supported) {
    console.warn('Browser compatibility issues detected:', requirements.issues);
    console.info('Recommendations:', recommendations);
  }

  // Log browser info for debugging
  const browserInfo = getBrowserInfo();
  const features = checkCompatibilityFeatures();

  console.log('🔍 Browser Info:', browserInfo);
  console.log('✅ Compatibility Features:', features);

  // Set global browser info for other modules
  if (typeof window !== 'undefined') {
    (window as any).browserInfo = browserInfo;
    (window as any).compatibilityFeatures = features;
  }
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeBrowserCompatibility);
  } else {
    initializeBrowserCompatibility();
  }
}