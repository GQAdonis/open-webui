/**
 * Test setup for Vitest
 * Provides browser environment mocks for Node.js testing
 */

import { vi } from 'vitest';

// Mock DOMParser for XML parsing tests
global.DOMParser = class {
  parseFromString(xmlStr: string, mimeType: string) {
    // Enhanced XML parser mock for testing
    const createElementMock = (elementXml: string, tagName: string) => {
      return {
        getAttribute: (name: string) => {
          const regex = new RegExp(`${name}="([^"]*)"`, 'i');
          const result = elementXml.match(regex);
          return result ? result[1] : null;
        },
        get textContent() {
          // For CDATA sections, return the inner content
          const cdataMatch = elementXml.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
          if (cdataMatch) {
            return cdataMatch[1];
          }
          // For regular content, preserve it but strip outer tags
          const contentMatch = elementXml.match(/^<[^>]*>([\s\S]*?)<\/[^>]*>$/);
          if (contentMatch) {
            return contentMatch[1].replace(/^\s+|\s+$/g, '');
          }
          // For self-closing tags, return empty
          if (elementXml.match(/\/\s*>$/)) {
            return '';
          }
          // Fallback
          return elementXml.replace(/<[^>]*>/g, '').replace(/^\s+|\s+$/g, '');
        },
        innerHTML: elementXml,
        querySelector: (childSelector: string) => {
          // Match both self-closing and regular tags
          const childMatch = elementXml.match(new RegExp(`<${childSelector}[^>]*(?:/>|>(.*?)<\\/${childSelector}>)`, 'is'));
          if (childMatch) {
            return createElementMock(childMatch[0], childSelector);
          }
          return null;
        },
        querySelectorAll: (childSelector: string) => {
          // Match both self-closing and regular tags
          const selfClosingMatches = elementXml.match(new RegExp(`<${childSelector}[^>]*/>`, 'gis')) || [];
          const regularMatches = elementXml.match(new RegExp(`<${childSelector}[^>]*>.*?<\\/${childSelector}>`, 'gis')) || [];
          const allMatches = [...selfClosingMatches, ...regularMatches];
          return allMatches.map(childMatch => createElementMock(childMatch, childSelector));
        },
        getElementsByTagName: (childTag: string) => {
          // Match both self-closing and regular tags
          const selfClosingMatches = elementXml.match(new RegExp(`<${childTag}[^>]*/>`, 'gis')) || [];
          const regularMatches = elementXml.match(new RegExp(`<${childTag}[^>]*>.*?<\\/${childTag}>`, 'gis')) || [];
          const allMatches = [...selfClosingMatches, ...regularMatches];
          return allMatches.map(childMatch => createElementMock(childMatch, childTag));
        },
        get children() {
          // Extract all direct child elements (both self-closing and regular)
          const selfClosingMatches = elementXml.match(/<(\w+)[^>]*\/>/gis) || [];
          const regularMatches = elementXml.match(/<(\w+)[^>]*>.*?<\/\1>/gis) || [];
          const allMatches = [...selfClosingMatches, ...regularMatches];
          return allMatches.map(match => {
            const tagMatch = match.match(/<(\w+)/);
            const tagName = tagMatch ? tagMatch[1] : 'unknown';
            return createElementMock(match, tagName);
          });
        }
      };
    };

    const doc = {
      getElementsByTagName: (tagName: string) => {
        if (tagName === 'artifact') {
          const matches = xmlStr.match(/<artifact[^>]*>[\s\S]*?<\/artifact>/gi) || [];
          return matches.map(match => createElementMock(match, 'artifact'));
        }
        return [];
      },
      querySelector: (selector: string) => {
        if (selector === 'artifact') {
          const artifactMatch = xmlStr.match(/<artifact[^>]*>[\s\S]*?<\/artifact>/i);
          if (artifactMatch) {
            return createElementMock(artifactMatch[0], 'artifact');
          }
        }
        return null;
      },
      querySelectorAll: (selector: string) => {
        const matches = xmlStr.match(new RegExp(`<${selector}[^>]*>.*?<\\/${selector}>`, 'gis')) || [];
        return matches.map(match => createElementMock(match, selector));
      }
    };
    return doc;
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn((key: string, value: string) => {}),
  removeItem: vi.fn((key: string) => {}),
  clear: vi.fn(() => {}),
  length: 0,
  key: vi.fn((index: number) => null)
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', {
  value: localStorageMock,
  writable: true
});

// Mock browser environment checks
Object.defineProperty(global, 'window', {
  value: {
    matchMedia: vi.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })),
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000'
    }
  },
  writable: true
});

// Mock performance for timing measurements
Object.defineProperty(global, 'performance', {
  value: {
    now: () => Date.now()
  }
});

// Allow console output for debugging
// vi.spyOn(console, 'log').mockImplementation(() => {});
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});