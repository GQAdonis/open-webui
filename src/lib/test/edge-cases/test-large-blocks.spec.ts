/**
 * Large Code Block Performance Edge Case Validation Tests
 *
 * These tests validate that the dependency resolution system maintains
 * acceptable performance and accuracy when processing large code blocks,
 * extensive CSS files, or complex JSON structures without degradation
 * in response time or transformation quality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defaultStrategyExecutor, type RecoveryRequest } from '../../services/artifact-dependency-resolver/strategy-executor';

describe('Large Code Block Performance Edge Case Validation', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('Large CSS Module Processing', () => {
    it('should handle extremely large CSS modules efficiently', async () => {
      // Generate large CSS with comprehensive rules
      const largeCSSContent = `
        /* Base reset and typography - 100+ rules */
        ${Array.from({ length: 100 }, (_, i) => `
          .reset-${i}, .reset-${i}:before, .reset-${i}:after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            line-height: 1.${4 + (i % 6)};
          }
        `).join('\n')}

        /* Component library - 200+ component styles */
        ${Array.from({ length: 200 }, (_, i) => `
          .component-${i} {
            display: ${['block', 'flex', 'grid', 'inline-block'][i % 4]};
            position: ${['static', 'relative', 'absolute', 'fixed'][i % 4]};
            background: linear-gradient(${i * 2}deg,
              hsl(${i * 3 % 360}, ${50 + (i % 50)}%, ${30 + (i % 40)}%),
              hsl(${(i * 5) % 360}, ${60 + (i % 40)}%, ${40 + (i % 30)}%));
            color: hsl(${(i * 7) % 360}, ${70 + (i % 30)}%, ${i % 2 === 0 ? '20%' : '80%'});
            padding: ${i % 50}px ${(i * 2) % 40}px;
            margin: ${i % 30}px ${(i * 3) % 25}px;
            border: ${1 + (i % 5)}px solid hsl(${(i * 11) % 360}, 50%, 50%);
            border-radius: ${i % 25}px;
            font-size: ${12 + (i % 20)}px;
            font-weight: ${[300, 400, 500, 600, 700][i % 5]};
            transform: rotate(${(i % 10) - 5}deg) scale(${0.8 + (i % 5) * 0.1});
            transition: all ${200 + (i % 300)}ms ${['ease', 'ease-in', 'ease-out', 'ease-in-out'][i % 4]};
            z-index: ${i};
          }

          .component-${i}:hover {
            transform: rotate(${((i % 10) - 5) * 1.2}deg) scale(${0.9 + (i % 5) * 0.1});
            box-shadow: 0 ${2 + (i % 10)}px ${5 + (i % 15)}px hsla(${(i * 13) % 360}, 50%, 20%, 0.${20 + (i % 30)});
          }

          .component-${i}:active {
            transform: rotate(${((i % 10) - 5) * 0.8}deg) scale(${0.7 + (i % 5) * 0.1});
          }

          .component-${i}.variant-primary {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
          }

          .component-${i}.variant-secondary {
            background: linear-gradient(135deg, #6c757d, #545b62);
            color: white;
          }

          .component-${i}.size-small {
            padding: ${Math.max(2, (i % 20))}px ${Math.max(4, (i % 30))}px;
            font-size: ${10 + (i % 6)}px;
          }

          .component-${i}.size-large {
            padding: ${20 + (i % 30)}px ${30 + (i % 40)}px;
            font-size: ${18 + (i % 12)}px;
          }
        `).join('\n')}

        /* Responsive design - 50+ media queries */
        ${Array.from({ length: 50 }, (_, i) => `
          @media (max-width: ${300 + i * 20}px) {
            .component-${i * 4} { font-size: ${8 + (i % 8)}px; }
            .component-${i * 4 + 1} { padding: ${2 + (i % 10)}px; }
            .component-${i * 4 + 2} { margin: ${1 + (i % 8)}px; }
            .component-${i * 4 + 3} { display: ${i % 2 === 0 ? 'block' : 'none'}; }
          }

          @media (min-width: ${800 + i * 50}px) {
            .component-${i * 4} {
              grid-template-columns: repeat(${2 + (i % 6)}, 1fr);
              gap: ${10 + (i % 20)}px;
            }
          }
        `).join('\n')}

        /* Animation keyframes - 30+ animations */
        ${Array.from({ length: 30 }, (_, i) => `
          @keyframes animation-${i} {
            0% {
              transform: translateX(${-100 + (i % 50)}px) rotate(0deg);
              opacity: 0;
            }
            ${25 + (i % 50)}% {
              transform: translateX(${-50 + (i % 30)}px) rotate(${90 + (i % 180)}deg);
              opacity: 0.${3 + (i % 7)};
            }
            ${50 + (i % 25)}% {
              transform: translateX(0) rotate(${180 + (i % 180)}deg);
              opacity: 1;
            }
            ${75 + (i % 20)}% {
              transform: translateX(${20 + (i % 40)}px) rotate(${270 + (i % 90)}deg);
              opacity: 0.${5 + (i % 5)};
            }
            100% {
              transform: translateX(${50 + (i % 100)}px) rotate(360deg);
              opacity: ${i % 2 === 0 ? '1' : '0'};
            }
          }

          .component-${i}.animated {
            animation: animation-${i} ${1 + (i % 5)}s ${['linear', 'ease', 'ease-in', 'ease-out'][i % 4]} ${i % 3 === 0 ? 'infinite' : '1'};
          }
        `).join('\n')}

        /* Utility classes - 100+ utilities */
        ${Array.from({ length: 100 }, (_, i) => `
          .utility-${i} { ${['margin', 'padding'][i % 2]}: ${i}px; }
          .utility-${i}-x { ${['margin', 'padding'][i % 2]}-left: ${i}px; ${['margin', 'padding'][i % 2]}-right: ${i}px; }
          .utility-${i}-y { ${['margin', 'padding'][i % 2]}-top: ${i}px; ${['margin', 'padding'][i % 2]}-bottom: ${i}px; }
          .text-${i} { font-size: ${8 + i}px; }
          .color-${i} { color: hsl(${i * 3.6 % 360}, 70%, 50%); }
          .bg-${i} { background-color: hsl(${i * 3.6 % 360}, 70%, ${i % 2 === 0 ? '95%' : '10%'}); }
        `).join('\n')}
      `;

      const largeComponentCode = `
        import styles from "./massive-components.module.css";
        import React, { useState, useEffect, useMemo, useCallback } from 'react';

        const MassiveComponentLibrary = ({
          theme = 'default',
          size = 'medium',
          animated = false,
          responsive = true,
          variant = 'primary',
          ...props
        }) => {
          const [activeComponents, setActiveComponents] = useState(new Set());
          const [loadedComponents, setLoadedComponents] = useState(0);

          const componentClasses = useMemo(() => {
            const classes = {};
            for (let i = 0; i < 200; i++) {
              classes[\`component-\${i}\`] = [
                styles[\`component-\${i}\`],
                variant && styles[\`component-\${i}\`]?.[\`variant-\${variant}\`],
                size && styles[\`component-\${i}\`]?.[\`size-\${size}\`],
                animated && styles[\`component-\${i}\`]?.animated,
                responsive && 'responsive'
              ].filter(Boolean).join(' ');
            }
            return classes;
          }, [variant, size, animated, responsive]);

          const handleComponentClick = useCallback((componentId) => {
            setActiveComponents(prev => {
              const newSet = new Set(prev);
              if (newSet.has(componentId)) {
                newSet.delete(componentId);
              } else {
                newSet.add(componentId);
              }
              return newSet;
            });
          }, []);

          useEffect(() => {
            const loadComponents = async () => {
              for (let i = 0; i < 200; i++) {
                await new Promise(resolve => setTimeout(resolve, 10));
                setLoadedComponents(i + 1);
              }
            };
            loadComponents();
          }, []);

          return (
            <div className={styles['reset-0']}>
              <header className={styles['component-header']}>
                <h1 className={styles['component-title']}>
                  Massive Component Library ({loadedComponents}/200 loaded)
                </h1>
              </header>

              <main className={styles['component-grid']}>
                {Array.from({ length: 200 }, (_, i) => (
                  <div
                    key={i}
                    className={componentClasses[\`component-\${i}\`]}
                    onClick={() => handleComponentClick(i)}
                    data-active={activeComponents.has(i)}
                    style={{
                      opacity: i < loadedComponents ? 1 : 0.3,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    <span className={styles[\`utility-\${i % 100}\`]}>
                      Component {i}
                    </span>
                    <div className={styles[\`text-\${i % 100}\`]}>
                      Status: {activeComponents.has(i) ? 'Active' : 'Inactive'}
                    </div>
                    <div className={styles[\`color-\${i % 100}\`]}>
                      Type: {['Button', 'Card', 'Modal', 'Input', 'List'][i % 5]}
                    </div>
                  </div>
                ))}
              </main>

              <footer className={styles['component-utilities']}>
                {Array.from({ length: 50 }, (_, i) => (
                  <span key={i} className={styles[\`bg-\${i}\`]}>
                    Utility {i}
                  </span>
                ))}
              </footer>
            </div>
          );
        };

        export default MassiveComponentLibrary;
      `;

      const request: RecoveryRequest = {
        artifactId: 'large-css-performance-test',
        artifactCode: largeComponentCode,
        errorMessage: 'Massive CSS module not found',
        messageContent: largeCSSContent,
        language: 'javascript',
        attemptId: 'large-css-performance-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('CSS_MODULE_CONVERSION');

      // Performance requirements
      expect(processingTime).toBeLessThan(8000); // Should complete within 8 seconds
      expect(result.processingTimeMs).toBeLessThan(8000);

      const transformedCode = result.finalCode!;

      // Should handle the large CSS conversion
      expect(transformedCode).toContain('const styles = {');
      expect(transformedCode.length).toBeGreaterThan(10000); // Should be substantial

      // Should preserve component class references
      expect(transformedCode).toMatch(/component-\d+/);
      expect(transformedCode).toMatch(/utility-\d+/);
      expect(transformedCode).toMatch(/text-\d+/);

      // Should preserve React component structure
      expect(transformedCode).toContain('MassiveComponentLibrary');
      expect(transformedCode).toContain('useState');
      expect(transformedCode).toContain('useEffect');
      expect(transformedCode).toContain('useMemo');

      // Should handle large numbers of style references
      expect(transformedCode).toContain('styles[`component-${i}`]');
    });

    it('should maintain accuracy with large CSS containing complex selectors', async () => {
      const complexLargeCSS = `
        /* Complex cascade and specificity testing */
        ${Array.from({ length: 100 }, (_, i) => `
          /* Base styles */
          .complex-component-${i} {
            display: grid;
            grid-template-areas:
              "header header header"
              "sidebar content aside"
              "footer footer footer";
            grid-template-columns: 200px 1fr 150px;
            grid-template-rows: auto 1fr auto;
            gap: ${i % 20}px;
            min-height: 100vh;
          }

          /* Nested selectors */
          .complex-component-${i} .header {
            grid-area: header;
            background: linear-gradient(90deg,
              hsl(${i * 3.6}, 70%, 60%) 0%,
              hsl(${(i * 3.6 + 60) % 360}, 70%, 60%) 50%,
              hsl(${(i * 3.6 + 120) % 360}, 70%, 60%) 100%);
            padding: ${10 + (i % 20)}px;
            border-bottom: ${2 + (i % 3)}px solid hsl(${i * 3.6}, 70%, 40%);
          }

          .complex-component-${i} .header .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .complex-component-${i} .header .navigation .nav-item {
            position: relative;
            padding: ${5 + (i % 10)}px ${10 + (i % 15)}px;
            color: hsl(${i * 3.6}, 70%, ${i % 2 === 0 ? '20%' : '90%'});
            text-decoration: none;
            border-radius: ${i % 8}px;
            transition: all ${200 + (i % 200)}ms ease;
          }

          .complex-component-${i} .header .navigation .nav-item:hover {
            background-color: hsla(${i * 3.6}, 70%, 50%, 0.${10 + (i % 30)});
            transform: translateY(-${1 + (i % 3)}px);
          }

          .complex-component-${i} .header .navigation .nav-item:active {
            transform: translateY(0);
          }

          .complex-component-${i} .header .navigation .nav-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, hsla(${i * 3.6}, 70%, 80%, 0.1));
            border-radius: inherit;
            opacity: 0;
            transition: opacity ${150 + (i % 100)}ms ease;
          }

          .complex-component-${i} .header .navigation .nav-item:hover::before {
            opacity: 1;
          }

          /* Pseudo-class combinations */
          .complex-component-${i} .content .item:nth-child(${i % 10 + 1}n):not(.disabled):hover {
            background: hsla(${(i * 5) % 360}, 60%, 90%, 0.8);
            border-left: ${3 + (i % 5)}px solid hsl(${(i * 5) % 360}, 60%, 50%);
          }

          .complex-component-${i} .content .item:first-child:last-child {
            border-radius: ${i % 15}px;
            padding: ${20 + (i % 30)}px;
          }

          /* Attribute selectors */
          .complex-component-${i} input[type="text"][data-valid="true"]:focus {
            border-color: hsl(${(i * 7) % 360}, 70%, 50%);
            box-shadow: 0 0 0 ${2 + (i % 3)}px hsla(${(i * 7) % 360}, 70%, 50%, 0.25);
          }

          .complex-component-${i} button[data-size="large"][data-variant="primary"]:not([disabled]) {
            background: linear-gradient(135deg,
              hsl(${(i * 9) % 360}, 80%, 60%),
              hsl(${(i * 9 + 30) % 360}, 80%, 40%));
            font-size: ${14 + (i % 8)}px;
            padding: ${12 + (i % 8)}px ${20 + (i % 12)}px;
          }

          /* Advanced pseudo-selectors */
          .complex-component-${i} .list-item:nth-of-type(even):not(:last-child)::after {
            content: '→';
            position: absolute;
            right: ${-10 - (i % 10)}px;
            color: hsl(${(i * 11) % 360}, 50%, 60%);
            font-weight: bold;
          }
        `).join('\n')}

        /* Media queries with complex conditions */
        ${Array.from({ length: 20 }, (_, i) => `
          @media screen and (min-width: ${400 + i * 100}px) and (max-width: ${800 + i * 100}px) {
            .complex-component-${i * 5} {
              grid-template-columns: 1fr;
              grid-template-areas:
                "header"
                "content"
                "sidebar"
                "aside"
                "footer";
            }

            .complex-component-${i * 5} .header .navigation {
              flex-direction: column;
              gap: ${5 + (i % 10)}px;
            }
          }

          @media (hover: hover) and (pointer: fine) {
            .complex-component-${i * 5} .interactive-element:hover {
              transform: scale(${1.05 + (i % 10) * 0.01});
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .complex-component-${i * 5} * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `).join('\n')}
      `;

      const request: RecoveryRequest = {
        artifactId: 'complex-large-css-test',
        artifactCode: `
          import complexStyles from "./complex-large.module.css";

          const ComplexLargeComponent = ({ itemCount = 50 }) => (
            <div className={complexStyles['complex-component-0']}>
              <header className={complexStyles.header}>
                <nav className={complexStyles.navigation}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <a key={i} href="#" className={complexStyles['nav-item']}>
                      Nav Item {i}
                    </a>
                  ))}
                </nav>
              </header>
              <main className={complexStyles.content}>
                {Array.from({ length: itemCount }, (_, i) => (
                  <div key={i} className={complexStyles['item']}>
                    Item {i}
                  </div>
                ))}
              </main>
            </div>
          );
        `,
        errorMessage: 'Complex large CSS module not found',
        messageContent: complexLargeCSS,
        language: 'javascript',
        attemptId: 'complex-large-css-test-1'
      };

      const result = await defaultStrategyExecutor.executeRecovery(request);

      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeLessThan(6000);

      const transformedCode = result.finalCode!;

      // Should preserve complex selector structures
      expect(transformedCode).toContain('complexComponent0:');
      expect(transformedCode).toContain('navItem:');

      // Should handle grid properties
      expect(transformedCode).toMatch(/grid.*template|display.*grid/);

      // Should preserve color values from gradients
      expect(transformedCode).toMatch(/hsl\(\d+,\s*\d+%,\s*\d+%\)/);

      // Should handle media queries
      expect(transformedCode).toContain('@media');

      // Should preserve pseudo-selectors
      expect(transformedCode).toMatch(/:hover|:active|:before|:after|:nth-child/);
    });
  });

  describe('Large JSON Data Processing', () => {
    it('should handle extremely large JSON datasets efficiently', async () => {
      // Generate large JSON with realistic data structures
      const largeJSONData = {
        metadata: {
          version: "2.0.0",
          generated: new Date().toISOString(),
          totalRecords: 10000,
          categories: Array.from({ length: 50 }, (_, i) => ({
            id: `cat-${i}`,
            name: `Category ${i}`,
            description: `Description for category ${i} with detailed information about its purpose and usage in the system.`,
            createdAt: new Date(Date.now() - i * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - i * 43200000).toISOString(),
            isActive: i % 3 !== 0,
            settings: {
              displayOrder: i,
              color: `hsl(${i * 7.2}, 70%, 50%)`,
              icon: ['star', 'heart', 'circle', 'square', 'triangle'][i % 5],
              permissions: {
                read: true,
                write: i % 2 === 0,
                delete: i % 4 === 0,
                admin: i % 10 === 0
              }
            }
          }))
        },
        users: Array.from({ length: 1000 }, (_, i) => ({
          id: `user-${i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          profile: {
            firstName: `FirstName${i}`,
            lastName: `LastName${i}`,
            avatar: `https://api.example.com/avatars/${i}.jpg`,
            bio: `This is a detailed biography for user ${i}. They joined our platform because they were looking for a comprehensive solution to their needs. Over the years, they have contributed significantly to the community.`,
            location: {
              country: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia'][i % 7],
              city: `City${i % 100}`,
              timezone: `UTC${i % 24 > 12 ? '+' : '-'}${Math.abs((i % 24) - 12)}`
            },
            preferences: {
              theme: ['light', 'dark', 'auto'][i % 3],
              language: ['en', 'es', 'fr', 'de', 'ja'][i % 5],
              notifications: {
                email: i % 2 === 0,
                push: i % 3 === 0,
                sms: i % 5 === 0,
                frequency: ['immediate', 'daily', 'weekly'][i % 3]
              },
              privacy: {
                profileVisibility: ['public', 'friends', 'private'][i % 3],
                showEmail: i % 4 === 0,
                showLocation: i % 6 === 0
              }
            }
          },
          activity: {
            joinDate: new Date(Date.now() - i * 86400000).toISOString(),
            lastLogin: new Date(Date.now() - (i % 30) * 86400000).toISOString(),
            loginCount: Math.floor(Math.random() * 1000) + i,
            postsCount: Math.floor(Math.random() * 500) + i % 100,
            commentsCount: Math.floor(Math.random() * 2000) + i % 200,
            likesReceived: Math.floor(Math.random() * 5000) + i % 300,
            followersCount: Math.floor(Math.random() * 1000) + i % 150,
            followingCount: Math.floor(Math.random() * 800) + i % 120
          },
          subscriptions: Array.from({ length: i % 10 }, (_, j) => ({
            planId: `plan-${j}`,
            startDate: new Date(Date.now() - j * 2592000000).toISOString(),
            endDate: new Date(Date.now() + j * 2592000000).toISOString(),
            isActive: j % 2 === 0,
            features: Array.from({ length: j % 5 + 1 }, (_, k) => `feature-${k}`)
          }))
        })),
        products: Array.from({ length: 2000 }, (_, i) => ({
          id: `product-${i}`,
          name: `Product ${i}`,
          description: `Comprehensive description for product ${i}. This product offers exceptional value and has been carefully designed to meet the highest standards of quality and user experience. It includes advanced features and seamless integration capabilities.`,
          category: `cat-${i % 50}`,
          price: {
            amount: parseFloat((Math.random() * 1000 + i).toFixed(2)),
            currency: ['USD', 'EUR', 'GBP', 'JPY', 'CAD'][i % 5],
            discountPercentage: i % 20 === 0 ? Math.floor(Math.random() * 30) + 10 : 0
          },
          inventory: {
            available: Math.floor(Math.random() * 1000),
            reserved: Math.floor(Math.random() * 100),
            total: Math.floor(Math.random() * 1100) + 1000,
            warehouse: `warehouse-${i % 10}`,
            restockDate: i % 5 === 0 ? new Date(Date.now() + Math.random() * 2592000000).toISOString() : null
          },
          specifications: {
            dimensions: {
              width: parseFloat((Math.random() * 100).toFixed(2)),
              height: parseFloat((Math.random() * 100).toFixed(2)),
              depth: parseFloat((Math.random() * 100).toFixed(2)),
              weight: parseFloat((Math.random() * 50).toFixed(2))
            },
            materials: Array.from({ length: (i % 5) + 1 }, (_, j) => ['plastic', 'metal', 'wood', 'glass', 'fabric'][j % 5]),
            colors: Array.from({ length: (i % 3) + 1 }, (_, j) => ['red', 'blue', 'green', 'yellow', 'black', 'white'][j % 6]),
            features: Array.from({ length: (i % 8) + 1 }, (_, j) => `feature-${j}-${i}`)
          },
          reviews: Array.from({ length: i % 50 }, (_, j) => ({
            id: `review-${i}-${j}`,
            userId: `user-${j % 1000}`,
            rating: Math.floor(Math.random() * 5) + 1,
            title: `Review ${j} for Product ${i}`,
            content: `This is a detailed review for product ${i}. The reviewer found it to be ${['excellent', 'good', 'average', 'poor'][Math.floor(Math.random() * 4)]} and would ${Math.random() > 0.5 ? '' : 'not '}recommend it to others.`,
            date: new Date(Date.now() - j * 86400000).toISOString(),
            verified: j % 3 === 0,
            helpful: Math.floor(Math.random() * 20)
          }))
        })),
        analytics: {
          dailyStats: Array.from({ length: 365 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
            pageViews: Math.floor(Math.random() * 10000) + 1000,
            uniqueVisitors: Math.floor(Math.random() * 5000) + 500,
            bounceRate: parseFloat((Math.random() * 0.5 + 0.2).toFixed(3)),
            avgSessionDuration: Math.floor(Math.random() * 600) + 60,
            conversions: Math.floor(Math.random() * 100),
            revenue: parseFloat((Math.random() * 5000).toFixed(2))
          })),
          topPages: Array.from({ length: 100 }, (_, i) => ({
            path: `/page-${i}`,
            views: Math.floor(Math.random() * 1000) + 100,
            avgTimeOnPage: Math.floor(Math.random() * 300) + 30,
            exitRate: parseFloat((Math.random() * 0.8).toFixed(3))
          }))
        }
      };

      const largeComponentCode = `
        import data from "./massive-dataset.json";
        import React, { useState, useMemo, useCallback } from 'react';

        const MassiveDataProcessor = () => {
          const [searchTerm, setSearchTerm] = useState('');
          const [selectedCategory, setSelectedCategory] = useState('all');
          const [sortBy, setSortBy] = useState('name');
          const [currentPage, setCurrentPage] = useState(1);
          const [itemsPerPage] = useState(50);

          const filteredData = useMemo(() => {
            let filtered = data.products;

            if (searchTerm) {
              filtered = filtered.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }

            if (selectedCategory !== 'all') {
              filtered = filtered.filter(product => product.category === selectedCategory);
            }

            filtered.sort((a, b) => {
              switch (sortBy) {
                case 'name':
                  return a.name.localeCompare(b.name);
                case 'price':
                  return a.price.amount - b.price.amount;
                case 'rating':
                  const avgRatingA = a.reviews.reduce((sum, review) => sum + review.rating, 0) / a.reviews.length || 0;
                  const avgRatingB = b.reviews.reduce((sum, review) => sum + review.rating, 0) / b.reviews.length || 0;
                  return avgRatingB - avgRatingA;
                default:
                  return 0;
              }
            });

            return filtered;
          }, [searchTerm, selectedCategory, sortBy]);

          const paginatedData = useMemo(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            return filteredData.slice(startIndex, startIndex + itemsPerPage);
          }, [filteredData, currentPage, itemsPerPage]);

          const totalPages = Math.ceil(filteredData.length / itemsPerPage);

          const handleSearch = useCallback((event) => {
            setSearchTerm(event.target.value);
            setCurrentPage(1);
          }, []);

          const handleCategoryChange = useCallback((event) => {
            setSelectedCategory(event.target.value);
            setCurrentPage(1);
          }, []);

          const analytics = useMemo(() => {
            const totalRevenue = data.analytics.dailyStats.reduce((sum, day) => sum + day.revenue, 0);
            const avgDailyViews = data.analytics.dailyStats.reduce((sum, day) => sum + day.pageViews, 0) / data.analytics.dailyStats.length;
            const totalUsers = data.users.length;
            const activeUsers = data.users.filter(user =>
              new Date(user.activity.lastLogin) > new Date(Date.now() - 30 * 86400000)
            ).length;

            return {
              totalRevenue: totalRevenue.toFixed(2),
              avgDailyViews: Math.round(avgDailyViews),
              totalUsers,
              activeUsers,
              activeUserPercentage: ((activeUsers / totalUsers) * 100).toFixed(1)
            };
          }, []);

          return (
            <div className="massive-data-processor">
              <header>
                <h1>Massive Dataset Processor</h1>
                <div className="analytics-summary">
                  <div>Total Revenue: ${analytics.totalRevenue}</div>
                  <div>Avg Daily Views: {analytics.avgDailyViews}</div>
                  <div>Total Users: {analytics.totalUsers}</div>
                  <div>Active Users: {analytics.activeUsers} ({analytics.activeUserPercentage}%)</div>
                </div>
              </header>

              <div className="controls">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <select value={selectedCategory} onChange={handleCategoryChange}>
                  <option value="all">All Categories</option>
                  {data.metadata.categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="rating">Sort by Rating</option>
                </select>
              </div>

              <div className="results-info">
                Showing {filteredData.length} products (Page {currentPage} of {totalPages})
              </div>

              <div className="product-grid">
                {paginatedData.map(product => {
                  const avgRating = product.reviews.length > 0
                    ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
                    : 0;

                  return (
                    <div key={product.id} className="product-card">
                      <h3>{product.name}</h3>
                      <p>{product.description.substring(0, 100)}...</p>
                      <div className="product-details">
                        <div>Price: {product.price.currency} {product.price.amount}</div>
                        <div>Rating: {avgRating.toFixed(1)} ({product.reviews.length} reviews)</div>
                        <div>Available: {product.inventory.available}</div>
                        <div>Category: {data.metadata.categories.find(cat => cat.id === product.category)?.name}</div>
                      </div>
                      <div className="product-features">
                        {product.specifications.features.slice(0, 3).map(feature => (
                          <span key={feature} className="feature-tag">{feature}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pagination">
                {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                  const page = i + Math.max(1, currentPage - 5);
                  return page <= totalPages ? (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? 'active' : ''}
                    >
                      {page}
                    </button>
                  ) : null;
                })}
              </div>
            </div>
          );
        };

        export default MassiveDataProcessor;
      `;

      const request: RecoveryRequest = {
        artifactId: 'large-json-performance-test',
        artifactCode: largeComponentCode,
        errorMessage: 'Massive JSON dataset not found',
        messageContent: JSON.stringify(largeJSONData, null, 2),
        language: 'javascript',
        attemptId: 'large-json-performance-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.strategy).toBe('JSON_DATA_INLINING');

      // Performance requirements
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.processingTimeMs).toBeLessThan(10000);

      const transformedCode = result.finalCode!;

      // Should handle the large JSON conversion
      expect(transformedCode).toContain('const data = {');
      expect(transformedCode.length).toBeGreaterThan(50000); // Should be very substantial

      // Should preserve nested data structures
      expect(transformedCode).toContain('metadata:');
      expect(transformedCode).toContain('users:');
      expect(transformedCode).toContain('products:');
      expect(transformedCode).toContain('analytics:');

      // Should preserve array structures
      expect(transformedCode).toContain('categories:');
      expect(transformedCode).toContain('dailyStats:');

      // Should preserve the React component structure
      expect(transformedCode).toContain('MassiveDataProcessor');
      expect(transformedCode).toContain('useMemo');
      expect(transformedCode).toContain('useCallback');

      // Should handle data access patterns
      expect(transformedCode).toContain('data.products');
      expect(transformedCode).toContain('data.metadata.categories');
      expect(transformedCode).toContain('data.analytics');
    });
  });

  describe('Memory and Performance Optimization', () => {
    it('should handle memory efficiently during large transformations', async () => {
      const request: RecoveryRequest = {
        artifactId: 'memory-optimization-test',
        artifactCode: `
          import styles from "./memory-test.module.css";

          const MemoryTestComponent = () => {
            const elements = [];

            for (let i = 0; i < 1000; i++) {
              elements.push(
                <div key={i} className={styles[\`element-\${i}\`]}>
                  {Array.from({ length: 10 }, (_, j) => (
                    <span key={j} className={styles[\`span-\${i}-\${j}\`]}>
                      Content {i}-{j}
                    </span>
                  ))}
                </div>
              );
            }

            return <div className={styles.container}>{elements}</div>;
          };
        `,
        errorMessage: 'Memory test CSS not found',
        messageContent: Array.from({ length: 1000 }, (_, i) =>
          Array.from({ length: 10 }, (_, j) => `
            .element-${i} {
              display: block;
              padding: ${i % 20}px;
              margin: ${i % 10}px;
              background: hsl(${i % 360}, 50%, 50%);
            }

            .span-${i}-${j} {
              color: hsl(${(i + j) % 360}, 70%, 30%);
              font-size: ${12 + (i % 8)}px;
            }
          `).join('\n')
        ).join('\n') + `
          .container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            padding: 20px;
          }
        `,
        language: 'javascript',
        attemptId: 'memory-optimization-test-1'
      };

      const startTime = Date.now();
      const result = await defaultStrategyExecutor.executeRecovery(request);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(7000); // Memory efficient processing

      const transformedCode = result.finalCode!;

      // Should successfully handle all elements without memory issues
      expect(transformedCode).toContain('const styles = {');
      expect(transformedCode).toMatch(/element-\d+:/);
      expect(transformedCode).toMatch(/span-\d+-\d+:/);
      expect(transformedCode).toContain('container:');
    });

    it('should maintain performance with concurrent large file processing', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        const request: RecoveryRequest = {
          artifactId: `concurrent-test-${i}`,
          artifactCode: `import styles from "./concurrent-${i}.module.css"; const Component${i} = () => <div className={styles.test}>Concurrent Test ${i}</div>;`,
          errorMessage: `Concurrent CSS ${i} not found`,
          messageContent: Array.from({ length: 200 }, (_, j) => `
            .test-${j} {
              background: hsl(${(i * 72 + j) % 360}, 60%, 50%);
              padding: ${j % 30}px;
              margin: ${j % 20}px;
            }
          `).join('\n') + `.test { background: #${i.toString(16).repeat(6).slice(0, 6)}; }`,
          language: 'javascript',
          attemptId: `concurrent-test-${i}-1`
        };

        return defaultStrategyExecutor.executeRecovery(request);
      });

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Concurrent processing should be efficient
      expect(totalTime).toBeLessThan(15000); // Should complete all within 15 seconds

      // Each result should be valid
      results.forEach((result, i) => {
        expect(result.finalCode).toContain('const styles = {');
        expect(result.finalCode).toContain(`Component${i}`);
      });
    });
  });
});