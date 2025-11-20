/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Accessibility Testing Tools - WCAG compliance and a11y testing
 */

import { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Accessibility scan results interface
 */
export interface A11yScanResult {
  violations: Array<{
    id: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{
      html: string;
      target: string[];
      failureSummary: string;
    }>;
  }>;
  passes: Array<{
    id: string;
    description: string;
  }>;
  incomplete: Array<{
    id: string;
    description: string;
  }>;
  summary: {
    total: number;
    passed: number;
    violations: number;
    incomplete: number;
  };
}

/**
 * Check accessibility using axe-core
 */
export class CheckAccessibilityTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        include,
        exclude,
        rules,
        level = 'WCAG2AA', // WCAG2A, WCAG2AA, WCAG2AAA, or Section508
        elementSelector,
      } = args;

      try {
        // Inject axe-core
        await this.injectAxeCore(page);

        // Configure axe options
        const axeOptions: any = {
          runOnly: {
            type: 'tag',
            values: this.getLevelTags(level),
          },
        };

        if (include || exclude) {
          axeOptions.context = {};
          if (include) axeOptions.context.include = Array.isArray(include) ? include : [include];
          if (exclude) axeOptions.context.exclude = Array.isArray(exclude) ? exclude : [exclude];
        }

        if (rules) {
          axeOptions.rules = rules;
        }

        // Run axe accessibility check
        const results: any = await page.evaluate(
          async (options) => {
            // @ts-ignore - axe is injected
            return await axe.run(options);
          },
          axeOptions
        );

        const summary = {
          total: results.violations.length + results.passes.length + results.incomplete.length,
          passed: results.passes.length,
          violations: results.violations.length,
          incomplete: results.incomplete.length,
        };

        const scanResult: A11yScanResult = {
          violations: results.violations,
          passes: results.passes,
          incomplete: results.incomplete,
          summary,
        };

        // Format output
        const output: string[] = [
          `🔍 Accessibility Scan Results (${level})`,
          `URL: ${page.url()}`,
          '',
          `📊 Summary:`,
          `  • Total checks: ${summary.total}`,
          `  • Passed: ${summary.passed}`,
          `  • Violations: ${summary.violations}`,
          `  • Incomplete: ${summary.incomplete}`,
          '',
        ];

        // Report violations
        if (scanResult.violations.length > 0) {
          output.push(`❌ Violations Found (${scanResult.violations.length}):`);
          output.push('');

          scanResult.violations.forEach((violation, index) => {
            output.push(`${index + 1}. [${violation.impact.toUpperCase()}] ${violation.id}`);
            output.push(`   ${violation.description}`);
            output.push(`   Help: ${violation.help}`);
            output.push(`   URL: ${violation.helpUrl}`);
            output.push(`   Affected elements: ${violation.nodes.length}`);

            if (violation.nodes.length > 0 && violation.nodes.length <= 3) {
              violation.nodes.forEach((node, nodeIndex) => {
                output.push(`     ${nodeIndex + 1}. ${node.target.join(' ')}`);
                output.push(`        ${node.html.substring(0, 100)}...`);
              });
            }
            output.push('');
          });
        } else {
          output.push(`✅ No violations found!`);
          output.push('');
        }

        // Report incomplete checks
        if (scanResult.incomplete.length > 0) {
          output.push(`⚠️  Incomplete Checks (${scanResult.incomplete.length}):`);
          scanResult.incomplete.slice(0, 5).forEach((item, index) => {
            output.push(`  ${index + 1}. ${item.id}: ${item.description}`);
          });
          output.push('');
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Accessibility scan failed: ${error.message}`);
      }
    });
  }

  /**
   * Inject axe-core library into the page
   */
  private async injectAxeCore(page: Page): Promise<void> {
    // Check if axe is already loaded
    const axeLoaded = await page.evaluate(() => typeof (window as any).axe !== 'undefined');

    if (!axeLoaded) {
      // Inject axe-core from CDN
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js',
      });

      // Wait for axe to be available
      await page.waitForFunction(() => typeof (window as any).axe !== 'undefined', { timeout: 5000 });
    }
  }

  /**
   * Get axe tags for WCAG level
   */
  private getLevelTags(level: string): string[] {
    const tags: string[] = [];

    switch (level.toUpperCase()) {
      case 'WCAG2A':
        tags.push('wcag2a');
        break;
      case 'WCAG2AA':
        tags.push('wcag2a', 'wcag2aa');
        break;
      case 'WCAG2AAA':
        tags.push('wcag2a', 'wcag2aa', 'wcag2aaa');
        break;
      case 'SECTION508':
        tags.push('section508');
        break;
      case 'BEST-PRACTICE':
        tags.push('best-practice');
        break;
      default:
        tags.push('wcag2a', 'wcag2aa');
    }

    return tags;
  }
}

/**
 * Get ARIA snapshot of the page or element
 */
export class GetAriaSnapshotTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const { selector } = args;

      try {
        const ariaSnapshot = await page.evaluate((sel) => {
          const element = sel ? document.querySelector(sel) : document.body;
          if (!element) {
            throw new Error(`Element not found: ${sel}`);
          }

          function getAriaTree(el: Element, depth: number = 0): any {
            const role = el.getAttribute('role') || el.tagName.toLowerCase();
            const name = el.getAttribute('aria-label') ||
                         el.getAttribute('aria-labelledby') ||
                         (el as HTMLElement).innerText?.substring(0, 50) || '';

            const node: any = {
              role,
              name: name.trim(),
              level: depth,
            };

            // Add important ARIA attributes
            const ariaAttrs = ['aria-expanded', 'aria-selected', 'aria-checked', 'aria-disabled', 'aria-hidden'];
            ariaAttrs.forEach(attr => {
              const value = el.getAttribute(attr);
              if (value) {
                node[attr] = value;
              }
            });

            // Get children
            const children: any[] = [];
            Array.from(el.children).forEach(child => {
              const childNode = getAriaTree(child, depth + 1);
              if (childNode) {
                children.push(childNode);
              }
            });

            if (children.length > 0) {
              node.children = children;
            }

            return node;
          }

          return getAriaTree(element);
        }, selector);

        const output: string[] = [
          `🌳 ARIA Snapshot`,
          `URL: ${page.url()}`,
        ];

        if (selector) {
          output.push(`Selector: ${selector}`);
        }

        output.push('');
        output.push(this.formatAriaTree(ariaSnapshot));

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Failed to get ARIA snapshot: ${error.message}`);
      }
    });
  }

  /**
   * Format ARIA tree for display
   */
  private formatAriaTree(node: any, indent: string = ''): string {
    const lines: string[] = [];

    const roleIcon = this.getRoleIcon(node.role);
    const name = node.name ? ` "${node.name}"` : '';
    const attrs = Object.keys(node)
      .filter(key => key.startsWith('aria-'))
      .map(key => `${key}="${node[key]}"`)
      .join(' ');

    lines.push(`${indent}${roleIcon} ${node.role}${name}${attrs ? ` [${attrs}]` : ''}`);

    if (node.children) {
      node.children.forEach((child: any) => {
        lines.push(this.formatAriaTree(child, indent + '  '));
      });
    }

    return lines.join('\n');
  }

  /**
   * Get icon for ARIA role
   */
  private getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      button: '🔘',
      link: '🔗',
      heading: '📋',
      navigation: '🧭',
      main: '📄',
      form: '📝',
      img: '🖼️',
      list: '📋',
      listitem: '•',
      textbox: '📝',
      checkbox: '☑️',
      radio: '⭕',
      menu: '☰',
    };

    return icons[role] || '▫️';
  }
}

/**
 * Check color contrast ratios
 */
export class CheckContrastTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        selector,
        level = 'AA', // 'AA' or 'AAA'
      } = args;

      if (!selector) {
        throw new Error('selector parameter is required');
      }

      try {
        const contrastResults = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) {
            throw new Error(`Element not found: ${sel}`);
          }

          const styles = window.getComputedStyle(element);
          const foreground = styles.color;
          const background = styles.backgroundColor;

          // Convert RGB to relative luminance
          function getLuminance(rgb: string): number {
            const match = rgb.match(/\d+/g);
            if (!match) return 0;

            const [r, g, b] = match.map(n => {
              const val = parseInt(n) / 255;
              return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
            });

            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }

          const fgLuminance = getLuminance(foreground);
          const bgLuminance = getLuminance(background);

          const lighter = Math.max(fgLuminance, bgLuminance);
          const darker = Math.min(fgLuminance, bgLuminance);
          const ratio = (lighter + 0.05) / (darker + 0.05);

          return {
            foreground,
            background,
            ratio: ratio.toFixed(2),
            fgLuminance: fgLuminance.toFixed(3),
            bgLuminance: bgLuminance.toFixed(3),
          };
        }, selector);

        const ratio = parseFloat(contrastResults.ratio);

        // WCAG 2.0 requirements
        const normalTextAA = 4.5;
        const normalTextAAA = 7.0;
        const largeTextAA = 3.0;
        const largeTextAAA = 4.5;

        const passesNormalAA = ratio >= normalTextAA;
        const passesNormalAAA = ratio >= normalTextAAA;
        const passesLargeAA = ratio >= largeTextAA;
        const passesLargeAAA = ratio >= largeTextAAA;

        const output: string[] = [
          `🎨 Color Contrast Check`,
          `Selector: ${selector}`,
          ``,
          `Colors:`,
          `  Foreground: ${contrastResults.foreground} (luminance: ${contrastResults.fgLuminance})`,
          `  Background: ${contrastResults.background} (luminance: ${contrastResults.bgLuminance})`,
          ``,
          `Contrast Ratio: ${ratio}:1`,
          ``,
          `WCAG 2.0 Compliance:`,
          `  ${passesNormalAA ? '✅' : '❌'} Normal Text (AA): ${normalTextAA}:1 required`,
          `  ${passesNormalAAA ? '✅' : '❌'} Normal Text (AAA): ${normalTextAAA}:1 required`,
          `  ${passesLargeAA ? '✅' : '❌'} Large Text (AA): ${largeTextAA}:1 required`,
          `  ${passesLargeAAA ? '✅' : '❌'} Large Text (AAA): ${largeTextAAA}:1 required`,
        ];

        const targetLevel = level.toUpperCase();
        const passes = targetLevel === 'AA' ? passesNormalAA : passesNormalAAA;

        if (!passes) {
          output.push('');
          output.push(`⚠️  Does not meet ${targetLevel} compliance for normal text`);
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Contrast check failed: ${error.message}`);
      }
    });
  }
}

/**
 * Check keyboard navigation
 */
export class CheckKeyboardNavigationTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      try {
        const focusableElements = await page.evaluate(() => {
          const selectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
          ];

          const elements: Array<{
            tag: string;
            role: string;
            tabindex: string;
            text: string;
            hasVisibleFocus: boolean;
          }> = [];

          document.querySelectorAll(selectors.join(', ')).forEach(el => {
            const computed = window.getComputedStyle(el);
            const isVisible = computed.display !== 'none' && computed.visibility !== 'hidden';

            if (isVisible) {
              elements.push({
                tag: el.tagName.toLowerCase(),
                role: el.getAttribute('role') || '',
                tabindex: el.getAttribute('tabindex') || '0',
                text: (el as HTMLElement).innerText?.substring(0, 30) || el.getAttribute('aria-label') || '',
                hasVisibleFocus: computed.outline !== 'none' || computed.outlineWidth !== '0px',
              });
            }
          });

          return elements;
        });

        const output: string[] = [
          `⌨️  Keyboard Navigation Check`,
          `URL: ${page.url()}`,
          ``,
          `Focusable Elements: ${focusableElements.length}`,
          ``,
        ];

        const noVisibleFocus = focusableElements.filter(el => !el.hasVisibleFocus);

        if (noVisibleFocus.length > 0) {
          output.push(`⚠️  Elements without visible focus indicator: ${noVisibleFocus.length}`);
          output.push('');
        }

        // Show first 10 focusable elements
        output.push('Focusable Elements (first 10):');
        focusableElements.slice(0, 10).forEach((el, index) => {
          const focus = el.hasVisibleFocus ? '✓' : '✗';
          output.push(`  ${index + 1}. [${focus}] <${el.tag}> ${el.text ? `"${el.text}"` : ''} ${el.role ? `(${el.role})` : ''}`);
        });

        if (focusableElements.length > 10) {
          output.push(`  ... and ${focusableElements.length - 10} more`);
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Keyboard navigation check failed: ${error.message}`);
      }
    });
  }
}
