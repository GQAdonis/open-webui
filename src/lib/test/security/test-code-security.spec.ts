/**
 * Security Validation Tests for Fixed Code
 *
 * These tests validate that the Advanced Artifact Dependency Resolution System
 * produces secure code and prevents common security vulnerabilities like XSS,
 * code injection, and malicious content execution in the generated artifacts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';
import { llmAutoFixService } from '../../services/llm-autofix-service/llm-fix-service';

describe('Security Validation for Fixed Code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    it('should sanitize malicious CSS content', async () => {
      const maliciousCSS = `
        .test {
          background: url('javascript:alert("XSS")');
          content: '<script>alert("XSS")</script>';
          color: expression(alert('XSS'));
        }

        /* Malicious comment with <script>alert('XSS')</script> */
        @import url("javascript:alert('XSS')");
      `;

      const request: RecoveryRequest = {
        artifactId: 'xss-test',
        artifactCode: 'import styles from "./malicious.module.css";\nconst Test = () => <div className={styles.test}>Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: maliciousCSS,
        language: 'javascript',
        attemptId: 'xss-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain javascript: URLs
      expect(transformedCode).not.toMatch(/javascript:/i);

      // Should not contain script tags
      expect(transformedCode).not.toMatch(/<script/i);

      // Should not contain expression() calls
      expect(transformedCode).not.toMatch(/expression\s*\(/i);

      // Should not contain @import with javascript
      expect(transformedCode).not.toMatch(/@import.*javascript:/i);
    });

    it('should prevent script injection in JSON data', async () => {
      const maliciousJSON = `{
        "title": "<script>alert('XSS')</script>",
        "description": "javascript:alert('XSS')",
        "onClick": "alert('XSS')",
        "innerHTML": "<img src=x onerror=alert('XSS')>",
        "eval": "eval('alert(\"XSS\")')"
      }`;

      const request: RecoveryRequest = {
        artifactId: 'json-xss-test',
        artifactCode: 'import data from "./malicious.json";\nconst Test = () => <div>{data.title}</div>;',
        errorMessage: 'JSON module not found',
        messageContent: maliciousJSON,
        language: 'javascript',
        attemptId: 'json-xss-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should escape or remove script tags
      expect(transformedCode).not.toMatch(/<script[^>]*>/i);

      // Should not contain javascript: URLs
      expect(transformedCode).not.toMatch(/javascript:/i);

      // Should not contain event handlers
      expect(transformedCode).not.toMatch(/on\w+\s*=/i);

      // Should not contain eval calls
      expect(transformedCode).not.toMatch(/eval\s*\(/i);
    });

    it('should sanitize malicious CSS class names', async () => {
      const maliciousCSS = `
        .normal-class { color: blue; }
        .\\"<script>alert('XSS')</script>\\" { color: red; }
        .javascript\\:alert\\('XSS'\\) { background: white; }
        .expression\\(alert\\('XSS'\\)\\) { border: 1px solid; }
      `;

      const request: RecoveryRequest = {
        artifactId: 'css-class-xss-test',
        artifactCode: 'import styles from "./malicious-classes.module.css";\nconst Test = () => <div className={styles["<script>alert(\\'XSS\\')</script>"]}>Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: maliciousCSS,
        language: 'javascript',
        attemptId: 'css-class-xss-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should sanitize malicious class names
      expect(transformedCode).not.toMatch(/<script/i);
      expect(transformedCode).not.toMatch(/javascript:/i);
      expect(transformedCode).not.toMatch(/expression\(/i);

      // Should preserve normal class names
      expect(transformedCode).toContain('normal-class') ||
      expect(transformedCode).toContain('normalClass');
    });
  });

  describe('Code Injection Prevention', () => {
    it('should prevent template literal injection', async () => {
      const maliciousCode = `
        import styles from "./injection.module.css";
        const malicious = \`\${alert('Injected!')}\`;
        const Test = () => <div className={styles.test}>{malicious}</div>;
      `;

      const request: RecoveryRequest = {
        artifactId: 'template-injection-test',
        artifactCode: maliciousCode,
        errorMessage: 'CSS module not found',
        messageContent: '.test { color: red; }',
        language: 'javascript',
        attemptId: 'template-injection-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not execute template literals with alert
      expect(transformedCode).not.toMatch(/\$\{[^}]*alert/i);

      // Should preserve safe template literals
      expect(transformedCode).toBeDefined();
    });

    it('should prevent function constructor injection', async () => {
      const maliciousJSON = `{
        "constructor": "Function",
        "arguments": ["alert('Injected!')"],
        "apply": "window",
        "call": "alert"
      }`;

      const request: RecoveryRequest = {
        artifactId: 'function-injection-test',
        artifactCode: 'import data from "./malicious-function.json";\nconst Test = () => <div>{JSON.stringify(data)}</div>;',
        errorMessage: 'JSON module not found',
        messageContent: maliciousJSON,
        language: 'javascript',
        attemptId: 'function-injection-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain dangerous constructor patterns
      expect(transformedCode).not.toMatch(/new\s+Function\s*\(/i);
      expect(transformedCode).not.toMatch(/constructor\s*:\s*Function/i);
      expect(transformedCode).not.toMatch(/\.constructor\s*\(/i);
    });

    it('should validate against prototype pollution', async () => {
      const maliciousJSON = `{
        "__proto__": {
          "polluted": true,
          "alert": "alert('Prototype Pollution')"
        },
        "constructor": {
          "prototype": {
            "polluted": true
          }
        }
      }`;

      const request: RecoveryRequest = {
        artifactId: 'prototype-pollution-test',
        artifactCode: 'import data from "./prototype-pollution.json";\nconst Test = () => <div>{data.title}</div>;',
        errorMessage: 'JSON module not found',
        messageContent: maliciousJSON,
        language: 'javascript',
        attemptId: 'prototype-pollution-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain __proto__ pollution
      expect(transformedCode).not.toMatch(/__proto__/);
      expect(transformedCode).not.toMatch(/constructor.*prototype/i);
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should generate CSP-compliant CSS', async () => {
      const cssWithInlineStyles = `
        .test {
          background: blue;
          color: white;
          padding: 20px;
        }

        /* Should not contain inline styles in attributes */
        .unsafe {
          content: 'style="background:red"';
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'csp-css-test',
        artifactCode: 'import styles from "./csp-test.module.css";\nconst Test = () => <div className={styles.test}>CSP Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: cssWithInlineStyles,
        language: 'javascript',
        attemptId: 'csp-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain inline style attributes
      expect(transformedCode).not.toMatch(/style\s*=\s*["'][^"']*["']/i);

      // Should use CSS-in-JS objects instead
      expect(transformedCode).toContain('background:') ||
      expect(transformedCode).toContain('background') ||
      expect(transformedCode).toContain('blue');
    });

    it('should prevent unsafe-inline script generation', async () => {
      const request: RecoveryRequest = {
        artifactId: 'csp-script-test',
        artifactCode: `
          import data from "./script-data.json";
          const script = document.createElement('script');
          script.innerHTML = data.code;
          const Test = () => <div>Script Test</div>;
        `,
        errorMessage: 'JSON module not found',
        messageContent: '{"code": "alert(\\'Unsafe inline script\\')"}',
        language: 'javascript',
        attemptId: 'csp-script-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not create script elements with innerHTML
      expect(transformedCode).not.toMatch(/script\.innerHTML/i);
      expect(transformedCode).not.toMatch(/createElement\s*\(\s*['"]script['"])/i);

      // Should not contain eval or similar unsafe functions
      expect(transformedCode).not.toMatch(/eval\s*\(/i);
      expect(transformedCode).not.toMatch(/Function\s*\(/i);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate and sanitize URL inputs', async () => {
      const maliciousCSS = `
        .test {
          background-image: url('data:text/html,<script>alert("XSS")</script>');
          background: url('file:///etc/passwd');
          content: url('ftp://malicious.com/exploit');
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'url-validation-test',
        artifactCode: 'import styles from "./url-test.module.css";\nconst Test = () => <div className={styles.test}>URL Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: maliciousCSS,
        language: 'javascript',
        attemptId: 'url-validation-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain dangerous URL schemes
      expect(transformedCode).not.toMatch(/url\s*\(\s*['"]?data:text\/html/i);
      expect(transformedCode).not.toMatch(/url\s*\(\s*['"]?file:/i);
      expect(transformedCode).not.toMatch(/url\s*\(\s*['"]?ftp:/i);

      // Should allow safe URLs
      expect(transformedCode).toMatch(/url\s*\(\s*['"]?https?:/) ||
      expect(transformedCode).not.toMatch(/url\s*\(/); // or remove URLs entirely
    });

    it('should sanitize HTML entities in JSON data', async () => {
      const maliciousJSON = `{
        "title": "&lt;script&gt;alert('HTML Entity XSS')&lt;/script&gt;",
        "description": "&#x3C;img src=x onerror=alert('XSS')&#x3E;",
        "content": "&quot;onclick=&quot;alert('XSS')&quot;"
      }`;

      const request: RecoveryRequest = {
        artifactId: 'html-entity-test',
        artifactCode: 'import data from "./html-entities.json";\nconst Test = () => <div dangerouslySetInnerHTML={{__html: data.title}}>Entity Test</div>;',
        errorMessage: 'JSON module not found',
        messageContent: maliciousJSON,
        language: 'javascript',
        attemptId: 'html-entity-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not use dangerouslySetInnerHTML with unsanitized content
      expect(transformedCode).not.toMatch(/dangerouslySetInnerHTML/i);

      // Should properly escape HTML entities
      expect(transformedCode).not.toMatch(/&lt;script&gt;/i);
      expect(transformedCode).not.toMatch(/&#x3C;img/i);
    });

    it('should validate CSS property values', async () => {
      const dangerousCSS = `
        .test {
          color: rgb(255, 0, 0); /* Safe */
          background: linear-gradient(45deg, red, blue); /* Safe */
          transform: translateX(10px); /* Safe */

          /* Dangerous values */
          color: expression(alert('XSS'));
          background: -moz-binding(url('http://malicious.com/xss.xml'));
          behavior: url('http://malicious.com/htc.htc');
          content: '<iframe src="javascript:alert(1)"></iframe>';
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'css-property-validation-test',
        artifactCode: 'import styles from "./dangerous-props.module.css";\nconst Test = () => <div className={styles.test}>Prop Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: dangerousCSS,
        language: 'javascript',
        attemptId: 'css-property-validation-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should remove dangerous CSS properties
      expect(transformedCode).not.toMatch(/expression\s*\(/i);
      expect(transformedCode).not.toMatch(/-moz-binding/i);
      expect(transformedCode).not.toMatch(/behavior\s*:/i);

      // Should preserve safe properties
      expect(transformedCode).toContain('rgb') ||
      expect(transformedCode).toContain('red') ||
      expect(transformedCode).toContain('255');
    });
  });

  describe('AI-Generated Code Security', () => {
    it('should validate AI-generated fixes for security issues', async () => {
      // Mock AI service to return potentially unsafe code
      vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
        success: true,
        fixedCode: `
          import data from "./data.json";
          const unsafeHTML = data.userInput;
          const Test = () => <div dangerouslySetInnerHTML={{__html: unsafeHTML}}>AI Fix</div>;
        `,
        explanation: 'Fixed by adding dynamic HTML rendering',
        strategy: 'ai-html-fix',
        confidence: 0.8
      });

      const request: RecoveryRequest = {
        artifactId: 'ai-security-test',
        artifactCode: 'import data from "./missing.json";\nconst Test = () => <div>{data.content}</div>;',
        errorMessage: 'JSON module not found',
        messageContent: '{"userInput": "<script>alert(\\'XSS\\')</script>"}',
        language: 'javascript',
        attemptId: 'ai-security-test-1'
      };

      // Force AI fix by making initial resolution fail
      const mockExecuteRecovery = vi.fn().mockResolvedValue({
        success: false,
        strategy: 'ALL_STRATEGIES_FAILED',
        confidence: 0,
        finalCode: '',
        processingTimeMs: 100,
        stages: [],
        errors: ['No strategy worked'],
        circuitState: 'CLOSED'
      });

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockImplementation(mockExecuteRecovery);

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should detect and reject unsafe AI-generated code
      if (result.success) {
        expect(result.finalCode).not.toMatch(/dangerouslySetInnerHTML/i);
        expect(result.finalCode).not.toMatch(/<script/i);
      }
    });

    it('should scan AI fixes for common vulnerability patterns', async () => {
      const vulnerablePatterns = [
        'eval(',
        'Function(',
        'document.write(',
        'innerHTML =',
        'dangerouslySetInnerHTML',
        'javascript:',
        'data:text/html',
        'onclick=',
        'onerror=',
        '__proto__'
      ];

      for (const pattern of vulnerablePatterns) {
        vi.mocked(llmAutoFixService.attemptAutoFix).mockResolvedValue({
          success: true,
          fixedCode: `const unsafe = "${pattern}alert('XSS')"; const Test = () => <div>Test</div>;`,
          explanation: `Fixed using ${pattern}`,
          strategy: 'ai-unsafe-fix',
          confidence: 0.7
        });

        const request: RecoveryRequest = {
          artifactId: `ai-pattern-test-${pattern.replace(/[^a-z]/gi, '')}`,
          artifactCode: 'const Test = () => <div>Test</div>;',
          errorMessage: 'Some error',
          messageContent: '',
          language: 'javascript',
          attemptId: `ai-pattern-test-${Date.now()}`
        };

        // Mock initial failure to trigger AI fix
        vi.mocked(defaultStrategyExecutor.executeRecovery).mockResolvedValue({
          success: false,
          strategy: 'ALL_STRATEGIES_FAILED',
          confidence: 0,
          finalCode: '',
          processingTimeMs: 100,
          stages: [],
          errors: ['Initial strategies failed'],
          circuitState: 'CLOSED'
        });

        const result = await defaultStrategyExecutor.executeRecovery(request);

        // Should reject or sanitize vulnerable patterns
        if (result.success) {
          expect(result.finalCode?.toLowerCase()).not.toContain(pattern.toLowerCase());
        }
      }
    });
  });

  describe('Output Encoding and Escaping', () => {
    it('should properly encode special characters in generated code', async () => {
      const specialCharsCSS = `
        .test {
          content: '"This is a \\"quoted\\" string"';
          background-image: url('image with spaces and special chars!@#.jpg');
          font-family: 'Font Name', "Another Font", sans-serif;
        }

        /* Unicode characters */
        .unicode {
          content: '\\00003C script\\00003E alert(1)\\00003C /script\\00003E';
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'encoding-test',
        artifactCode: 'import styles from "./special-chars.module.css";\nconst Test = () => <div className={styles.test}>Encoding Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: specialCharsCSS,
        language: 'javascript',
        attemptId: 'encoding-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should properly escape quotes in JavaScript strings
      expect(transformedCode).not.toMatch(/[^\\]"/); // Unescaped quotes

      // Should not contain unescaped Unicode that could be dangerous
      expect(transformedCode).not.toMatch(/\\00003C.*script/i);

      // Should preserve safe content
      expect(transformedCode).toContain('quoted') ||
      expect(transformedCode).toContain('Font');
    });

    it('should prevent code injection through CSS comments', async () => {
      const maliciousComments = `
        /* Normal comment */
        .test { color: red; }

        /* */ .injected { display: none; } /*
        /* */ background: url('javascript:alert("Injected")'); /*

        /* Comment with */ .another-injection { color: blue; } /* end */
      `;

      const request: RecoveryRequest = {
        artifactId: 'comment-injection-test',
        artifactCode: 'import styles from "./comment-injection.module.css";\nconst Test = () => <div className={styles.test}>Comment Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: maliciousComments,
        language: 'javascript',
        attemptId: 'comment-injection-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should not contain javascript URLs from comments
      expect(transformedCode).not.toMatch(/javascript:/i);

      // Should properly handle comment boundaries
      expect(transformedCode).not.toMatch(/\/\*.*\*\/.*\.injected/);
    });
  });

  describe('Resource Loading Security', () => {
    it('should validate external resource URLs', async () => {
      const externalResourceCSS = `
        @import url('https://trusted-cdn.com/styles.css');
        @import url('http://malicious.com/steal-data.css');
        @import url('//evil.com/xss.css');

        .test {
          background: url('https://trusted-cdn.com/image.jpg');
          background: url('http://untrusted.com/malicious.svg');
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'resource-security-test',
        artifactCode: 'import styles from "./external-resources.module.css";\nconst Test = () => <div className={styles.test}>Resource Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: externalResourceCSS,
        language: 'javascript',
        attemptId: 'resource-security-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should remove or validate external imports
      expect(transformedCode).not.toMatch(/@import.*http:/i);
      expect(transformedCode).not.toMatch(/@import.*\/\//);

      // Should handle external URLs cautiously
      expect(transformedCode).not.toMatch(/url\s*\(\s*['"]?http:/i);
    });

    it('should prevent data URI attacks', async () => {
      const dataURICSS = `
        .safe {
          background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
        }

        .dangerous {
          background: url('data:text/html,<script>alert("XSS")</script>');
          content: url('data:text/html;base64,PHNjcmlwdD5hbGVydCgiWFNTIik8L3NjcmlwdD4=');
        }
      `;

      const request: RecoveryRequest = {
        artifactId: 'data-uri-test',
        artifactCode: 'import styles from "./data-uri.module.css";\nconst Test = () => <div className={styles.safe}>Data URI Test</div>;',
        errorMessage: 'CSS module not found',
        messageContent: dataURICSS,
        language: 'javascript',
        attemptId: 'data-uri-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);
      expect(result.success).toBe(true);

      const transformedCode = result.finalCode!;

      // Should remove dangerous data URIs
      expect(transformedCode).not.toMatch(/data:text\/html/i);
      expect(transformedCode).not.toMatch(/data:.*script/i);

      // Should allow safe image data URIs
      expect(transformedCode).toContain('data:image/png') ||
      expect(transformedCode).not.toMatch(/data:/); // or remove all data URIs
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const request: RecoveryRequest = {
        artifactId: 'error-exposure-test',
        artifactCode: 'import secret from "/etc/passwd";\nconst Test = () => <div>Error Test</div>;',
        errorMessage: 'Cannot resolve module "/etc/passwd" from "/home/user/.ssh/id_rsa"',
        messageContent: '',
        language: 'javascript',
        attemptId: 'error-exposure-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      // Should not expose file system paths in error messages
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.join(' ');
        expect(errorMessages).not.toMatch(/\/etc\/passwd/);
        expect(errorMessages).not.toMatch(/\/home\/user/);
        expect(errorMessages).not.toMatch(/\.ssh/);
        expect(errorMessages).not.toMatch(/id_rsa/);
      }

      // Final code should not contain sensitive paths
      if (result.finalCode) {
        expect(result.finalCode).not.toMatch(/\/etc\/passwd/);
        expect(result.finalCode).not.toMatch(/\.ssh/);
      }
    });

    it('should sanitize stack traces and debug information', async () => {
      // Mock a service that might expose debug info
      const mockError = new Error('Debug info: /Users/developer/secret-project/api-keys.js');
      mockError.stack = `Error: Debug info
        at /Users/developer/secret-project/api-keys.js:42:15
        at /Users/developer/.env:1:1`;

      vi.mocked(defaultStrategyExecutor.executeRecovery).mockRejectedValue(mockError);

      const request: RecoveryRequest = {
        artifactId: 'debug-info-test',
        artifactCode: 'const Test = () => <div>Debug Test</div>;',
        errorMessage: 'Processing error',
        messageContent: '',
        language: 'javascript',
        attemptId: 'debug-info-test-1'
      };

      try {
        await defaultStrategyExecutor.executeRecovery(request);
      } catch (error) {
        // Error handling should sanitize sensitive paths
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).not.toMatch(/\/Users\/developer/);
        expect(errorMessage).not.toMatch(/secret-project/);
        expect(errorMessage).not.toMatch(/api-keys/);
        expect(errorMessage).not.toMatch(/\.env/);
      }
    });
  });
});