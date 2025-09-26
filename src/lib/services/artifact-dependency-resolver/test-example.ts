/**
 * Test Example for Auto-Dependency Resolution System
 * 
 * This demonstrates how the system should work with your original example
 */

import { dependencyResolver } from './dependency-resolver';

export async function testCSSModuleResolution() {
  // Original problematic code
  const originalCode = `
import React from "react";
import styles from "./BlackGoldButton.module.css";

export interface BlackGoldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const BlackGoldButton: React.FC<BlackGoldButtonProps> = ({
  children,
  className = "",
  ...rest
}) => {
  return (
    <button
      type="button"
      className={\`\${styles.blackGoldButton} \${className}\`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default BlackGoldButton;
`;

  // Simulated message content with CSS block
  const messageContent = `
Here's a React button component:

\`\`\`tsx
import React from "react";
import styles from "./BlackGoldButton.module.css";

export interface BlackGoldButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const BlackGoldButton: React.FC<BlackGoldButtonProps> = ({
  children,
  className = "",
  ...rest
}) => {
  return (
    <button
      type="button"
      className={\`\${styles.blackGoldButton} \${className}\`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default BlackGoldButton;
\`\`\`

And here's the CSS for styling:

\`\`\`css
.blackGoldButton {
  --gold: #d4af37;
  --black: #0b0b0b;

  display: inline-block;
  padding: 0.6rem 1.1rem;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(180deg, var(--black) 0%, #000000 100%);
  border: 2px solid var(--gold);
  border-radius: 10px;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 160ms ease, opacity 120ms ease;
  position: relative;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55), inset 0 -6px 20px rgba(0,0,0,0.35);
  overflow: hidden;
}

.blackGoldButton::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(120deg, rgba(212,175,55,0.06), transparent 30%);
  mix-blend-mode: screen;
}

.blackGoldButton::after {
  content: "";
  position: absolute;
  left: 2px;
  right: 2px;
  top: 2px;
  height: 6px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(212,175,55,0.95), rgba(212,175,55,0.6));
  opacity: 0.12;
  pointer-events: none;
}

.blackGoldButton:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6), 0 0 18px rgba(212,175,55,0.06);
}

.blackGoldButton:active {
  transform: translateY(0);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.55);
}

.blackGoldButton:focus-visible {
  outline: none;
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.55),
    0 0 0 4px rgba(212,175,55,0.12);
}

.blackGoldButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
\`\`\`
`;

  try {
    console.log('🧪 [Test] Starting CSS module resolution test...');
    
    // Set the message content so the resolver can find related blocks
    dependencyResolver.setMessageContent(messageContent);
    
    // Attempt to resolve dependencies
    const result = await dependencyResolver.resolveDependencies(originalCode, 'tsx');
    
    console.log('📊 [Test] Resolution result:', {
      success: result.success,
      dependenciesFound: result.dependencies.length,
      dependenciesResolved: result.dependencies.filter(d => d.found).length,
      strategiesUsed: result.fallbacksUsed,
      errors: result.errors.length
    });
    
    if (result.success && result.resolvedCode !== originalCode) {
      console.log('✅ [Test] Successfully resolved CSS module!');
      console.log('🔧 [Test] Fixed code preview:');
      console.log(result.resolvedCode.substring(0, 500) + '...');
    } else {
      console.log('❌ [Test] Resolution failed or no changes made');
    }
    
    return result;
    
  } catch (error) {
    console.error('💥 [Test] Test failed with error:', error);
    throw error;
  }
}

// Export for use in browser console or testing
if (typeof window !== 'undefined') {
  (window as any).testAutoResolution = testCSSModuleResolution;
}
