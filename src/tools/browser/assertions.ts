/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import type { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Assert element state (visible, hidden, enabled, disabled, etc.)
 */
export class AssertElementStateTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector;
      const state = args.state; // visible, hidden, enabled, disabled, editable, readonly, checked
      const timeout = args.timeout || 5000;

      if (!selector) {
        return createErrorResponse('selector is required');
      }

      if (!state) {
        return createErrorResponse('state is required (visible, hidden, enabled, disabled, editable, readonly, checked, unchecked)');
      }

      try {
        const element = await page.waitForSelector(selector, { timeout, state: 'attached' });

        if (!element) {
          return createErrorResponse(`Element not found: ${selector}`);
        }

        let actualState: boolean;
        let stateDescription: string;

        switch (state.toLowerCase()) {
          case 'visible':
            actualState = await element.isVisible();
            stateDescription = 'visible';
            break;

          case 'hidden':
            actualState = await element.isHidden();
            stateDescription = 'hidden';
            break;

          case 'enabled':
            actualState = await element.isEnabled();
            stateDescription = 'enabled';
            break;

          case 'disabled':
            actualState = await element.isDisabled();
            stateDescription = 'disabled';
            break;

          case 'editable':
            actualState = await element.isEditable();
            stateDescription = 'editable';
            break;

          case 'readonly':
            const isEditable = await element.isEditable();
            actualState = !isEditable;
            stateDescription = 'readonly';
            break;

          case 'checked':
            actualState = await element.isChecked();
            stateDescription = 'checked';
            break;

          case 'unchecked':
            const isChecked = await element.isChecked();
            actualState = !isChecked;
            stateDescription = 'unchecked';
            break;

          default:
            return createErrorResponse(
              `Invalid state: ${state}. Valid states: visible, hidden, enabled, disabled, editable, readonly, checked, unchecked`
            );
        }

        if (actualState) {
          return createSuccessResponse([
            `\u{2705} Element State Assertion PASSED`,
            ``,
            `Selector: ${selector}`,
            `Expected State: ${stateDescription}`,
            ``,
            `\u{2705} Element is ${stateDescription}`
          ]);
        } else {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} Element State Assertion FAILED`,
                ``,
                `Selector: ${selector}`,
                `Expected State: ${stateDescription}`,
                ``,
                `\u{274C} Element is NOT ${stateDescription}`
              ].join('\n')
            }],
            isError: true
          };
        }
      } catch (error) {
        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Assert exact count of elements matching a selector
 */
export class AssertElementCountTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector;
      const expectedCount = args.count;
      const comparison = args.comparison || 'equal'; // equal, greaterThan, lessThan, atLeast, atMost
      const timeout = args.timeout || 5000;

      if (!selector) {
        return createErrorResponse('selector is required');
      }

      if (expectedCount === undefined || expectedCount === null) {
        return createErrorResponse('count is required');
      }

      try {
        // Wait a bit for elements to appear
        await page.waitForTimeout(timeout);

        const elements = await page.$$(selector);
        const actualCount = elements.length;

        let passed = false;
        let comparisonText = '';

        switch (comparison.toLowerCase()) {
          case 'equal':
            passed = actualCount === expectedCount;
            comparisonText = `equal to ${expectedCount}`;
            break;

          case 'greaterthan':
          case 'greater_than':
            passed = actualCount > expectedCount;
            comparisonText = `greater than ${expectedCount}`;
            break;

          case 'lessthan':
          case 'less_than':
            passed = actualCount < expectedCount;
            comparisonText = `less than ${expectedCount}`;
            break;

          case 'atleast':
          case 'at_least':
            passed = actualCount >= expectedCount;
            comparisonText = `at least ${expectedCount}`;
            break;

          case 'atmost':
          case 'at_most':
            passed = actualCount <= expectedCount;
            comparisonText = `at most ${expectedCount}`;
            break;

          default:
            return createErrorResponse(
              `Invalid comparison: ${comparison}. Valid comparisons: equal, greaterThan, lessThan, atLeast, atMost`
            );
        }

        if (passed) {
          return createSuccessResponse([
            `\u{2705} Element Count Assertion PASSED`,
            ``,
            `Selector: ${selector}`,
            `Expected: ${comparisonText}`,
            `Actual Count: ${actualCount}`,
            ``,
            `\u{2705} Count assertion passed`
          ]);
        } else {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} Element Count Assertion FAILED`,
                ``,
                `Selector: ${selector}`,
                `Expected: ${comparisonText}`,
                `Actual Count: ${actualCount}`,
                ``,
                `\u{274C} Count assertion failed`
              ].join('\n')
            }],
            isError: true
          };
        }
      } catch (error) {
        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Assert text content with fuzzy search support
 */
export class AssertTextContentTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector;
      const expectedText = args.expectedText;
      const matchType = args.matchType || 'contains'; // exact, contains, startsWith, endsWith, regex
      const caseSensitive = args.caseSensitive !== false; // default true
      const timeout = args.timeout || 5000;

      if (!selector) {
        return createErrorResponse('selector is required');
      }

      if (!expectedText) {
        return createErrorResponse('expectedText is required');
      }

      try {
        const element = await page.waitForSelector(selector, { timeout, state: 'attached' });

        if (!element) {
          return createErrorResponse(`Element not found: ${selector}`);
        }

        let actualText = await element.textContent() || '';
        let searchText = expectedText;

        // Apply case sensitivity
        if (!caseSensitive) {
          actualText = actualText.toLowerCase();
          searchText = searchText.toLowerCase();
        }

        let passed = false;
        let matchDescription = '';

        switch (matchType.toLowerCase()) {
          case 'exact':
            passed = actualText === searchText;
            matchDescription = 'exactly matches';
            break;

          case 'contains':
            passed = actualText.includes(searchText);
            matchDescription = 'contains';
            break;

          case 'startswith':
          case 'starts_with':
            passed = actualText.startsWith(searchText);
            matchDescription = 'starts with';
            break;

          case 'endswith':
          case 'ends_with':
            passed = actualText.endsWith(searchText);
            matchDescription = 'ends with';
            break;

          case 'regex':
            try {
              const regex = new RegExp(searchText, caseSensitive ? '' : 'i');
              passed = regex.test(actualText);
              matchDescription = 'matches regex';
            } catch (e) {
              return createErrorResponse(`Invalid regex pattern: ${searchText}`);
            }
            break;

          default:
            return createErrorResponse(
              `Invalid matchType: ${matchType}. Valid types: exact, contains, startsWith, endsWith, regex`
            );
        }

        if (passed) {
          return createSuccessResponse([
            `\u{2705} Text Content Assertion PASSED`,
            ``,
            `Selector: ${selector}`,
            `Expected: "${expectedText}"`,
            `Match Type: ${matchDescription}`,
            `Case Sensitive: ${caseSensitive}`,
            ``,
            `Actual Text: "${actualText.substring(0, 200)}${actualText.length > 200 ? '...' : ''}"`,
            ``,
            `\u{2705} Text assertion passed`
          ]);
        } else {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} Text Content Assertion FAILED`,
                ``,
                `Selector: ${selector}`,
                `Expected: "${expectedText}"`,
                `Match Type: ${matchDescription}`,
                `Case Sensitive: ${caseSensitive}`,
                ``,
                `Actual Text: "${actualText.substring(0, 200)}${actualText.length > 200 ? '...' : ''}"`,
                ``,
                `\u{274C} Text does not ${matchDescription} expected value`
              ].join('\n')
            }],
            isError: true
          };
        }
      } catch (error) {
        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Assert element attribute value
 */
export class AssertAttributeTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector;
      const attribute = args.attribute;
      const expectedValue = args.expectedValue;
      const matchType = args.matchType || 'exact'; // exact, contains, exists, notExists
      const caseSensitive = args.caseSensitive !== false; // default true
      const timeout = args.timeout || 5000;

      if (!selector) {
        return createErrorResponse('selector is required');
      }

      if (!attribute) {
        return createErrorResponse('attribute is required');
      }

      try {
        const element = await page.waitForSelector(selector, { timeout, state: 'attached' });

        if (!element) {
          return createErrorResponse(`Element not found: ${selector}`);
        }

        const actualValue = await element.getAttribute(attribute);

        let passed = false;
        let matchDescription = '';

        switch (matchType.toLowerCase()) {
          case 'exists':
            passed = actualValue !== null;
            matchDescription = 'exists';
            break;

          case 'notexists':
          case 'not_exists':
            passed = actualValue === null;
            matchDescription = 'does not exist';
            break;

          case 'exact':
            if (expectedValue === undefined) {
              return createErrorResponse('expectedValue is required for exact match');
            }
            let compareActual = actualValue || '';
            let compareExpected = expectedValue;
            if (!caseSensitive) {
              compareActual = compareActual.toLowerCase();
              compareExpected = compareExpected.toLowerCase();
            }
            passed = compareActual === compareExpected;
            matchDescription = 'exactly matches';
            break;

          case 'contains':
            if (expectedValue === undefined) {
              return createErrorResponse('expectedValue is required for contains match');
            }
            let containsActual = actualValue || '';
            let containsExpected = expectedValue;
            if (!caseSensitive) {
              containsActual = containsActual.toLowerCase();
              containsExpected = containsExpected.toLowerCase();
            }
            passed = containsActual.includes(containsExpected);
            matchDescription = 'contains';
            break;

          default:
            return createErrorResponse(
              `Invalid matchType: ${matchType}. Valid types: exact, contains, exists, notExists`
            );
        }

        if (passed) {
          return createSuccessResponse([
            `\u{2705} Attribute Assertion PASSED`,
            ``,
            `Selector: ${selector}`,
            `Attribute: ${attribute}`,
            `Expected: ${expectedValue !== undefined ? `"${expectedValue}"` : matchDescription}`,
            `Match Type: ${matchDescription}`,
            `Actual Value: ${actualValue !== null ? `"${actualValue}"` : 'null'}`,
            ``,
            `\u{2705} Attribute assertion passed`
          ]);
        } else {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} Attribute Assertion FAILED`,
                ``,
                `Selector: ${selector}`,
                `Attribute: ${attribute}`,
                `Expected: ${expectedValue !== undefined ? `"${expectedValue}"` : matchDescription}`,
                `Match Type: ${matchDescription}`,
                `Actual Value: ${actualValue !== null ? `"${actualValue}"` : 'null'}`,
                ``,
                `\u{274C} Attribute assertion failed`
              ].join('\n')
            }],
            isError: true
          };
        }
      } catch (error) {
        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Assert CSS property value
 */
export class AssertCssPropertyTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const selector = args.selector;
      const property = args.property;
      const expectedValue = args.expectedValue;
      const timeout = args.timeout || 5000;

      if (!selector) {
        return createErrorResponse('selector is required');
      }

      if (!property) {
        return createErrorResponse('property is required (e.g., "color", "font-size", "display")');
      }

      if (expectedValue === undefined) {
        return createErrorResponse('expectedValue is required');
      }

      try {
        const element = await page.waitForSelector(selector, { timeout, state: 'attached' });

        if (!element) {
          return createErrorResponse(`Element not found: ${selector}`);
        }

        // Get computed style
        const actualValue = await element.evaluate((el, prop) => {
          return window.getComputedStyle(el).getPropertyValue(prop);
        }, property);

        // Normalize values for comparison (trim, lowercase)
        const normalizedActual = actualValue?.trim().toLowerCase() || '';
        const normalizedExpected = expectedValue.trim().toLowerCase();

        const passed = normalizedActual === normalizedExpected;

        if (passed) {
          return createSuccessResponse([
            `\u{2705} CSS Property Assertion PASSED`,
            ``,
            `Selector: ${selector}`,
            `Property: ${property}`,
            `Expected: "${expectedValue}"`,
            `Actual: "${actualValue}"`,
            ``,
            `\u{2705} CSS property matches expected value`
          ]);
        } else {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} CSS Property Assertion FAILED`,
                ``,
                `Selector: ${selector}`,
                `Property: ${property}`,
                `Expected: "${expectedValue}"`,
                `Actual: "${actualValue}"`,
                ``,
                `\u{274C} CSS property does not match expected value`,
                ``,
                `\u{1F4A1} Tip: CSS values are normalized (trimmed, lowercase). If comparing colors, use rgb() or hex format.`
              ].join('\n')
            }],
            isError: true
          };
        }
      } catch (error) {
        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Assert that a network request was made
 * Monitors network activity and validates requests
 */
export class AssertRequestMadeTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const urlPattern = args.urlPattern;
      const method = args.method ? args.method.toUpperCase() : undefined; // GET, POST, etc.
      const timeout = args.timeout || 10000;
      const waitForRequest = args.waitForRequest !== false; // default true

      if (!urlPattern) {
        return createErrorResponse('urlPattern is required (string or regex pattern)');
      }

      try {
        let urlMatcher: string | RegExp;

        // Try to interpret as regex if it looks like one
        if (urlPattern.startsWith('/') && urlPattern.includes('/')) {
          try {
            const parts = urlPattern.split('/');
            const pattern = parts.slice(1, -1).join('/');
            const flags = parts[parts.length - 1];
            urlMatcher = new RegExp(pattern, flags);
          } catch (e) {
            urlMatcher = urlPattern;
          }
        } else {
          urlMatcher = urlPattern;
        }

        if (waitForRequest) {
          // Wait for the request to be made
          const request = await page.waitForRequest(
            (req) => {
              const urlMatches = typeof urlMatcher === 'string'
                ? req.url().includes(urlMatcher)
                : urlMatcher.test(req.url());

              const methodMatches = method ? req.method() === method : true;

              return urlMatches && methodMatches;
            },
            { timeout }
          );

          return createSuccessResponse([
            `\u{2705} Network Request Assertion PASSED`,
            ``,
            `URL Pattern: ${urlPattern}`,
            `Method: ${method || 'ANY'}`,
            ``,
            `\u{2705} Request was made:`,
            `  \u{2022} URL: ${request.url()}`,
            `  \u{2022} Method: ${request.method()}`,
            `  \u{2022} Resource Type: ${request.resourceType()}`,
            `  \u{2022} Status: Captured`
          ]);
        } else {
          // Check if request was already made (look at existing requests)
          // This is a simplified check - in real scenarios you'd need to track requests
          return createSuccessResponse([
            `\u{26A0}\uFE0F Network Request Check (Non-blocking)`,
            ``,
            `URL Pattern: ${urlPattern}`,
            `Method: ${method || 'ANY'}`,
            ``,
            `\u{1F4A1} Note: Non-blocking mode doesn't guarantee request detection.`,
            `Use waitForRequest: true for reliable assertions.`
          ]);
        }
      } catch (error) {
        if ((error as Error).message.includes('Timeout')) {
          return {
            content: [{
              type: "text",
              text: [
                `\u{274C} Network Request Assertion FAILED`,
                ``,
                `URL Pattern: ${urlPattern}`,
                `Method: ${method || 'ANY'}`,
                `Timeout: ${timeout}ms`,
                ``,
                `\u{274C} Request was NOT made within timeout period`,
                ``,
                `\u{1F4A1} Possible reasons:`,
                `  1. Request was not triggered`,
                `  2. URL pattern doesn't match`,
                `  3. Timeout too short`,
                `  4. Request completed before monitoring started`
              ].join('\n')
            }],
            isError: true
          };
        }

        return createErrorResponse(`Assertion failed: ${(error as Error).message}`);
      }
    });
  }
}
