/**
 * End-to-End Tests for Complete Artifact Workflows
 *
 * These tests verify the entire user journey from prompt input to artifact display,
 * covering both explicit and implicit artifact creation scenarios.
 */

import { test, expect, type Page } from '@playwright/test';

// Test data for various artifact scenarios
const TEST_SCENARIOS = {
  explicit: {
    react: {
      prompt: 'Create a React counter component with increment and decrement buttons',
      expectedArtifactType: 'application/vnd.react+tsx',
      expectedCode: ['useState', 'function', 'button', 'onClick']
    },
    html: {
      prompt: 'Build a simple HTML page with a header and footer',
      expectedArtifactType: 'text/html',
      expectedCode: ['<!DOCTYPE html>', '<header>', '<footer>']
    },
    svelte: {
      prompt: 'Make a Svelte todo list component',
      expectedArtifactType: 'application/vnd.svelte+ts',
      expectedCode: ['<script>', 'let todos', 'function']
    }
  },
  implicit: {
    react: {
      prompt: 'How do I fix this React code to make the counter work properly?',
      followup: 'function BrokenCounter() { return <div>Count: 0</div>; }',
      expectedCode: ['useState', 'setCount', 'onClick']
    },
    javascript: {
      prompt: 'Improve this JavaScript function to handle edge cases',
      followup: 'function add(a, b) { return a + b; }',
      expectedCode: ['function', 'typeof', 'isNaN']
    }
  }
};

// Helper functions
async function navigateToChat(page: Page) {
  await page.goto('/');

  // Wait for the chat interface to load
  await page.waitForSelector('[data-testid="chat-input"], textarea[placeholder*="Send a message"], .chat-input', {
    timeout: 10000
  });
}

async function sendMessage(page: Page, message: string) {
  // Find the chat input (try multiple selectors for robustness)
  const chatInput = await page.locator([
    '[data-testid="chat-input"]',
    'textarea[placeholder*="Send a message"]',
    '.chat-input textarea',
    'textarea'
  ].join(', ')).first();

  await chatInput.fill(message);

  // Send the message (try multiple send button selectors)
  const sendButton = await page.locator([
    '[data-testid="send-button"]',
    'button[type="submit"]',
    '.send-button',
    'button[aria-label*="Send"]'
  ].join(', ')).first();

  await sendButton.click();
}

async function waitForArtifactDetection(page: Page, timeout = 30000) {
  // Wait for artifact to be detected and processed
  await page.waitForFunction(() => {
    // Check for artifact indicators
    return document.querySelector('.artifact-button') ||
           document.querySelector('[data-testid="artifact-preview"]') ||
           document.querySelector('.preview-panel') ||
           document.querySelector('[class*="artifact"]');
  }, { timeout });
}

async function waitForPreviewPanel(page: Page, timeout = 10000) {
  // Wait for preview panel to open
  await page.waitForSelector([
    '.preview-panel',
    '[data-testid="preview-panel"]',
    '.artifact-preview'
  ].join(', '), { timeout });
}

// Mock AI response for testing
async function mockAIResponse(page: Page, response: string) {
  // Intercept API calls and return mock response
  await page.route('**/api/chat/completions', async route => {
    const chunks = response.split('');
    let responseBody = '';

    // Simulate streaming response
    for (const chunk of chunks) {
      responseBody += chunk;
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate streaming delay
    }

    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: response
    });
  });
}

test.describe('Artifact Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');

    // Mock any required authentication or setup
    await page.evaluate(() => {
      localStorage.setItem('test-mode', 'true');
    });
  });

  test.describe('Explicit Artifact Creation', () => {
    test('should create React component when explicitly requested', async ({ page }) => {
      await navigateToChat(page);

      // Mock AI response with React artifact
      const mockResponse = `I'll create a React counter component for you:

<artifact identifier="react-counter-123" type="application/vnd.react+tsx" title="Counter Component">
import React, { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  );
}
</artifact>

This component uses React hooks for state management.`;

      await mockAIResponse(page, mockResponse);

      // Send request for React component
      await sendMessage(page, TEST_SCENARIOS.explicit.react.prompt);

      // Wait for artifact detection
      await waitForArtifactDetection(page);

      // Verify preview panel opens automatically
      await waitForPreviewPanel(page);

      // Verify artifact content
      const previewContent = await page.locator('.preview-panel, [data-testid="preview-panel"]').textContent();

      for (const expectedCode of TEST_SCENARIOS.explicit.react.expectedCode) {
        expect(previewContent).toContain(expectedCode);
      }

      // Verify artifact button is present for manual access
      await expect(page.locator('.artifact-button, [data-testid="artifact-button"]')).toBeVisible();
    });

    test('should create HTML page when explicitly requested', async ({ page }) => {
      await navigateToChat(page);

      const mockResponse = `I'll create an HTML page for you:

<artifact identifier="html-page-456" type="text/html" title="Simple HTML Page">
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Simple Page</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        header { background: #333; color: white; padding: 20px; }
        footer { background: #f0f0f0; padding: 10px; text-align: center; }
    </style>
</head>
<body>
    <header>
        <h1>Welcome</h1>
    </header>
    <main>
        <p>This is the main content area.</p>
    </main>
    <footer>
        <p>&copy; 2024 Simple Page</p>
    </footer>
</body>
</html>
</artifact>

This HTML page includes a header, main content, and footer with some basic styling.`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, TEST_SCENARIOS.explicit.html.prompt);
      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Verify HTML content is rendered
      const previewFrame = page.frameLocator('.preview-panel iframe, [data-testid="preview-frame"]');
      await expect(previewFrame.locator('header')).toBeVisible();
      await expect(previewFrame.locator('footer')).toBeVisible();
    });

    test('should create Svelte component when explicitly requested', async ({ page }) => {
      await navigateToChat(page);

      const mockResponse = `I'll create a Svelte todo list component:

<artifact identifier="svelte-todo-789" type="application/vnd.svelte+ts" title="Todo List Component">
<script lang="ts">
  let todos: string[] = [];
  let newTodo = '';

  function addTodo() {
    if (newTodo.trim()) {
      todos = [...todos, newTodo.trim()];
      newTodo = '';
    }
  }

  function removeTodo(index: number) {
    todos = todos.filter((_, i) => i !== index);
  }
</script>

<div class="todo-list">
  <h2>Todo List</h2>

  <form on:submit|preventDefault={addTodo}>
    <input bind:value={newTodo} placeholder="Add new todo" />
    <button type="submit">Add</button>
  </form>

  <ul>
    {#each todos as todo, index}
      <li>
        {todo}
        <button on:click={() => removeTodo(index)}>Remove</button>
      </li>
    {/each}
  </ul>
</div>

<style>
  .todo-list { max-width: 400px; margin: 0 auto; }
  input { padding: 8px; margin-right: 8px; }
  button { padding: 8px 12px; }
  li { display: flex; justify-content: space-between; padding: 4px 0; }
</style>
</artifact>

This Svelte component manages a list of todos with add and remove functionality.`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, TEST_SCENARIOS.explicit.svelte.prompt);
      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Verify Svelte component is rendered
      const previewContent = await page.locator('.preview-panel').textContent();
      for (const expectedCode of TEST_SCENARIOS.explicit.svelte.expectedCode) {
        expect(previewContent).toContain(expectedCode);
      }
    });
  });

  test.describe('Implicit Artifact Creation', () => {
    test('should detect and create artifact for code improvement requests', async ({ page }) => {
      await navigateToChat(page);

      // First, send the broken code
      await sendMessage(page, TEST_SCENARIOS.implicit.react.prompt);
      await sendMessage(page, TEST_SCENARIOS.implicit.react.followup);

      // Mock AI response that improves the code with an artifact
      const mockResponse = `I can see the issue with your counter. Here's the corrected version:

<artifact identifier="fixed-counter-321" type="application/vnd.react+tsx" title="Fixed Counter Component">
import React, { useState } from 'react';

function FixedCounter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}

export default FixedCounter;
</artifact>

The key changes are:
1. Added useState hook for state management
2. Added click handlers for the buttons
3. Proper state updating with setCount`;

      await mockAIResponse(page, mockResponse);

      // This should trigger the AI response with artifact
      await page.keyboard.press('Enter');

      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Verify the improved code contains expected elements
      const previewContent = await page.locator('.preview-panel').textContent();
      for (const expectedCode of TEST_SCENARIOS.implicit.react.expectedCode) {
        expect(previewContent).toContain(expectedCode);
      }
    });

    test('should detect artifact when AI generates code without explicit request', async ({ page }) => {
      await navigateToChat(page);

      // Send a general question that might result in code
      await sendMessage(page, 'What\'s the best way to validate user input in a form?');

      // Mock AI response that includes code artifact
      const mockResponse = `Here are some best practices for form validation. Let me show you a complete example:

<artifact identifier="form-validation-example" type="application/vnd.react+tsx" title="Form Validation Example">
import React, { useState } from 'react';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function ValidatedForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      console.log('Form is valid:', formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <label>Confirm Password:</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
</artifact>

This example demonstrates:
1. Real-time validation
2. Error message display
3. Form state management
4. TypeScript type safety`;

      await mockAIResponse(page, mockResponse);
      await page.keyboard.press('Enter');

      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Verify artifact was created implicitly
      await expect(page.locator('.artifact-button')).toBeVisible();

      // Verify the form validation code is present
      const previewContent = await page.locator('.preview-panel').textContent();
      expect(previewContent).toContain('validateForm');
      expect(previewContent).toContain('FormErrors');
      expect(previewContent).toContain('handleSubmit');
    });
  });

  test.describe('Multiple Artifacts', () => {
    test('should handle multiple artifacts in single response', async ({ page }) => {
      await navigateToChat(page);

      const mockResponse = `I'll show you both HTML and CSS approaches:

<artifact identifier="html-example" type="text/html" title="HTML Structure">
<!DOCTYPE html>
<html>
<head>
    <title>Multi-Artifact Example</title>
</head>
<body>
    <div class="container">
        <h1>Hello World</h1>
        <p>This is the HTML structure.</p>
    </div>
</body>
</html>
</artifact>

And here's the accompanying CSS:

<artifact identifier="css-example" type="text/css" title="CSS Styles">
.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

h1 {
    color: #333;
    text-align: center;
    margin-bottom: 20px;
}

p {
    line-height: 1.6;
    color: #666;
}
</artifact>

You can use these together to create a styled webpage.`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, 'Show me HTML and CSS for a simple webpage');

      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Verify multiple artifacts are detected
      const artifactButtons = await page.locator('.artifact-button').count();
      expect(artifactButtons).toBeGreaterThan(0);

      // Verify preview panel shows artifact switcher or indication of multiple artifacts
      const previewPanel = page.locator('.preview-panel');
      await expect(previewPanel).toBeVisible();
    });
  });

  test.describe('Preview Panel Interactions', () => {
    test('should allow switching between multiple artifacts', async ({ page }) => {
      await navigateToChat(page);

      // Similar setup to multiple artifacts test
      const mockResponse = `Here are two different approaches:

<artifact identifier="approach-1" type="application/javascript" title="Approach 1">
function solution1() {
    return "First approach";
}
</artifact>

<artifact identifier="approach-2" type="application/javascript" title="Approach 2">
function solution2() {
    return "Second approach";
}
</artifact>`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, 'Show me different approaches to solve this problem');

      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Look for artifact switcher controls
      const switcher = page.locator('.artifact-switcher, [data-testid="artifact-switcher"]');
      if (await switcher.count() > 0) {
        // Test switching between artifacts
        await switcher.first().click();

        // Verify content changes
        const previewContent = await page.locator('.preview-panel').textContent();
        expect(previewContent).toContain('solution');
      }
    });

    test('should allow manual opening of artifact via button', async ({ page }) => {
      await navigateToChat(page);

      // Mock a response with artifact but auto-open disabled
      await page.evaluate(() => {
        localStorage.setItem('autoOpenArtifact', 'false');
      });

      const mockResponse = `<artifact identifier="manual-open" type="text/html">
<div>Manual open test</div>
</artifact>`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, 'Create a simple div');

      await waitForArtifactDetection(page);

      // Verify artifact button is visible
      const artifactButton = page.locator('.artifact-button');
      await expect(artifactButton).toBeVisible();

      // Click the button to open preview
      await artifactButton.click();

      // Verify preview panel opens
      await waitForPreviewPanel(page);

      const previewContent = await page.locator('.preview-panel').textContent();
      expect(previewContent).toContain('Manual open test');
    });

    test('should allow closing and reopening preview panel', async ({ page }) => {
      await navigateToChat(page);

      const mockResponse = `<artifact identifier="close-reopen" type="text/html">
<div>Close and reopen test</div>
</artifact>`;

      await mockAIResponse(page, mockResponse);
      await sendMessage(page, 'Create a test div');

      await waitForArtifactDetection(page);
      await waitForPreviewPanel(page);

      // Close the preview panel
      const closeButton = page.locator('.preview-panel .close-button, [data-testid="close-preview"]');
      if (await closeButton.count() > 0) {
        await closeButton.click();

        // Verify panel is closed
        await expect(page.locator('.preview-panel')).not.toBeVisible();

        // Reopen via artifact button
        await page.locator('.artifact-button').click();

        // Verify panel reopens
        await waitForPreviewPanel(page);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed artifact responses gracefully', async ({ page }) => {
      await navigateToChat(page);

      const malformedResponse = `Here's your component:

<artifact identifier="broken" type="text/html">
<div>Unclosed artifact content...
<!-- Missing closing tag -->`;

      await mockAIResponse(page, malformedResponse);
      await sendMessage(page, 'Create a broken component');

      // Should not crash the interface
      await page.waitForTimeout(2000);

      // Verify the chat interface is still functional
      const chatInput = page.locator('textarea');
      await expect(chatInput).toBeVisible();
      await expect(chatInput).toBeEnabled();
    });

    test('should handle network interruptions during streaming', async ({ page }) => {
      await navigateToChat(page);

      // Mock network failure during streaming
      await page.route('**/api/chat/completions', async route => {
        // Simulate partial response then network failure
        await route.abort('failed');
      });

      await sendMessage(page, 'Create a component');

      // Should handle the failure gracefully
      await page.waitForTimeout(3000);

      // Interface should remain functional
      const chatInput = page.locator('textarea');
      await expect(chatInput).toBeEnabled();
    });
  });

  test.describe('Performance', () => {
    test('should handle rapid artifact creation without issues', async ({ page }) => {
      await navigateToChat(page);

      // Send multiple requests rapidly
      const requests = [
        'Create a button component',
        'Make a header component',
        'Build a footer component'
      ];

      for (const request of requests) {
        const mockResponse = `<artifact identifier="rapid-${Date.now()}" type="application/vnd.react+tsx">
function Component() { return <div>${request}</div>; }
</artifact>`;

        await mockAIResponse(page, mockResponse);
        await sendMessage(page, request);
        await page.waitForTimeout(100); // Brief pause between requests
      }

      // Should handle all requests without crashing
      await page.waitForTimeout(2000);

      const chatMessages = await page.locator('.chat-message, .message').count();
      expect(chatMessages).toBeGreaterThan(0);
    });
  });
});