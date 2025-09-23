import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from 'styled-components'; // If you're using styled-components
// import { BrowserRouter } from 'react-router-dom'; // If you're using React Router
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // If you're using React Query

// Mock theme object (adjust according to your theme structure)
const mockTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  breakpoints: {
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
  },
};

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here
  withTheme?: boolean;
  withRouter?: boolean;
  initialEntries?: string[];
}

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Uncomment and adjust based on your app's providers
  // const queryClient = new QueryClient({
  //   defaultOptions: {
  //     queries: {
  //       retry: false,
  //     },
  //   },
  // });

  return (
    <ThemeProvider theme={mockTheme}>
      {/* Uncomment if you're using React Router */}
      {/* <BrowserRouter> */}
        {/* Uncomment if you're using React Query */}
        {/* <QueryClientProvider client={queryClient}> */}
          {children}
        {/* </QueryClientProvider> */}
      {/* </BrowserRouter> */}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const { withTheme = true, withRouter = false, ...renderOptions } = options;

  let Wrapper: React.ComponentType<{ children: React.ReactNode }> | undefined;

  if (withTheme || withRouter) {
    Wrapper = AllTheProviders;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper functions for common test patterns
export const createMockFunction = () => jest.fn();

export const createMockProps = (overrides = {}) => ({
  isOpen: true,
  onClose: createMockFunction(),
  title: 'Test Modal',
  children: <div data-testid="modal-content">Test Content</div>,
  ...overrides,
});

export const waitForModalToOpen = (container: HTMLElement) => {
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const modal = container.querySelector('[role="dialog"]');
          if (modal) {
            observer.disconnect();
            resolve();
          }
        }
      });
    });
    
    observer.observe(container, { childList: true, subtree: true });
  });
};

export const simulateEscapeKey = (element: HTMLElement) => {
  const escapeEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    keyCode: 27,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(escapeEvent);
};

export const simulateTabKey = (element: HTMLElement, shiftKey = false) => {
  const tabEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    code: 'Tab',
    keyCode: 9,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(tabEvent);
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
