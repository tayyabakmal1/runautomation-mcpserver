/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Smart Waiting Strategies - Intelligent element waiting with multiple conditions
 */

import { Page } from 'playwright';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse } from '../common/types.js';

/**
 * Smart wait for element with multiple conditions
 */
export class SmartWaitTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        selector,
        visible = true,
        stable = false,
        interactive = false,
        hasText,
        timeout = 30000,
      } = args;

      if (!selector) {
        throw new Error('selector parameter is required');
      }

      const conditions: string[] = [];
      let waitSuccess = false;

      try {
        // Wait for element to exist
        await page.waitForSelector(selector, { timeout });
        conditions.push('Element exists');

        const element = page.locator(selector);

        // Check visibility
        if (visible) {
          await element.waitFor({ state: 'visible', timeout });
          conditions.push('Element is visible');
        }

        // Check if stable (not animating/moving)
        if (stable) {
          await this.waitForStable(page, selector, timeout);
          conditions.push('Element is stable (not animating)');
        }

        // Check if interactive (not disabled/readonly)
        if (interactive) {
          await this.waitForInteractive(page, selector, timeout);
          conditions.push('Element is interactive');
        }

        // Check text content
        if (hasText) {
          await element.filter({ hasText }).waitFor({ timeout });
          conditions.push(`Element contains text: "${hasText}"`);
        }

        waitSuccess = true;

        return createSuccessResponse([
          `✓ Smart wait completed successfully`,
          `Selector: ${selector}`,
          `Conditions met:`,
          ...conditions.map(c => `  • ${c}`),
          `Total wait time: <timeout>ms`,
        ].join('\n'));
      } catch (error: any) {
        return createSuccessResponse([
          `✗ Smart wait failed`,
          `Selector: ${selector}`,
          `Conditions checked:`,
          ...conditions.map(c => `  ✓ ${c}`),
          `Failed condition: ${error.message}`,
        ].join('\n'));
      }
    });
  }

  /**
   * Wait for element to be stable (not moving/animating)
   */
  private async waitForStable(page: Page, selector: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    const element = page.locator(selector);

    while (Date.now() - startTime < timeout) {
      const box1 = await element.boundingBox();
      await page.waitForTimeout(100);
      const box2 = await element.boundingBox();

      if (!box1 || !box2) {
        continue;
      }

      // Check if position and size are stable
      const positionStable = box1.x === box2.x && box1.y === box2.y;
      const sizeStable = box1.width === box2.width && box1.height === box2.height;

      if (positionStable && sizeStable) {
        return;
      }
    }

    throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
  }

  /**
   * Wait for element to be interactive (not disabled/readonly)
   */
  private async waitForInteractive(page: Page, selector: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    const element = page.locator(selector);

    while (Date.now() - startTime < timeout) {
      const isDisabled = await element.isDisabled().catch(() => false);
      const isEditable = await element.isEditable().catch(() => true);

      if (!isDisabled && isEditable) {
        return;
      }

      await page.waitForTimeout(100);
    }

    throw new Error(`Element ${selector} is not interactive within ${timeout}ms`);
  }
}

/**
 * Wait for network to be idle
 */
export class WaitForNetworkIdleTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        timeout = 30000,
        idleTime = 500,
      } = args;

      const startTime = Date.now();

      try {
        // Wait for network idle
        await page.waitForLoadState('networkidle', { timeout });

        const elapsed = Date.now() - startTime;

        return createSuccessResponse([
          `✓ Network idle`,
          `Wait time: ${elapsed}ms`,
          `No network activity for ${idleTime}ms`,
        ].join('\n'));
      } catch (error: any) {
        throw new Error(`Network did not become idle within ${timeout}ms: ${error.message}`);
      }
    });
  }
}

/**
 * Wait for specific number of elements
 */
export class WaitForElementCountTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        selector,
        count,
        comparison = 'equal', // 'equal', 'greaterThan', 'lessThan', 'atLeast', 'atMost'
        timeout = 30000,
      } = args;

      if (!selector) {
        throw new Error('selector parameter is required');
      }

      if (count === undefined) {
        throw new Error('count parameter is required');
      }

      const startTime = Date.now();
      const element = page.locator(selector);

      try {
        await page.waitForFunction(
          ({ sel, cnt, comp }) => {
            const elements = document.querySelectorAll(sel);
            const actualCount = elements.length;

            switch (comp) {
              case 'equal':
                return actualCount === cnt;
              case 'greaterThan':
                return actualCount > cnt;
              case 'lessThan':
                return actualCount < cnt;
              case 'atLeast':
                return actualCount >= cnt;
              case 'atMost':
                return actualCount <= cnt;
              default:
                return false;
            }
          },
          { sel: selector, cnt: count, comp: comparison },
          { timeout }
        );

        const actualCount = await element.count();
        const elapsed = Date.now() - startTime;

        return createSuccessResponse([
          `✓ Element count condition met`,
          `Selector: ${selector}`,
          `Expected: ${comparison} ${count}`,
          `Actual: ${actualCount} elements`,
          `Wait time: ${elapsed}ms`,
        ].join('\n'));
      } catch (error: any) {
        const actualCount = await element.count();
        throw new Error(`Element count condition not met within ${timeout}ms. Expected: ${comparison} ${count}, Actual: ${actualCount}`);
      }
    });
  }
}

/**
 * Wait for element attribute to have specific value
 */
export class WaitForAttributeTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        selector,
        attribute,
        value,
        timeout = 30000,
      } = args;

      if (!selector || !attribute) {
        throw new Error('selector and attribute parameters are required');
      }

      const startTime = Date.now();
      const element = page.locator(selector);

      try {
        await element.waitFor({ timeout });

        await page.waitForFunction(
          ({ sel, attr, val }) => {
            const el = document.querySelector(sel);
            if (!el) return false;

            const actualValue = el.getAttribute(attr);
            if (val === undefined) {
              return actualValue !== null;
            }
            return actualValue === val;
          },
          { sel: selector, attr: attribute, val: value },
          { timeout }
        );

        const actualValue = await element.getAttribute(attribute);
        const elapsed = Date.now() - startTime;

        return createSuccessResponse([
          `✓ Attribute condition met`,
          `Selector: ${selector}`,
          `Attribute: ${attribute}`,
          `Expected value: ${value !== undefined ? value : '(any value)'}`,
          `Actual value: ${actualValue}`,
          `Wait time: ${elapsed}ms`,
        ].join('\n'));
      } catch (error: any) {
        throw new Error(`Attribute condition not met within ${timeout}ms: ${error.message}`);
      }
    });
  }
}

/**
 * Wait for element to disappear
 */
export class WaitForElementHiddenTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        selector,
        timeout = 30000,
      } = args;

      if (!selector) {
        throw new Error('selector parameter is required');
      }

      const startTime = Date.now();
      const element = page.locator(selector);

      try {
        await element.waitFor({ state: 'hidden', timeout });

        const elapsed = Date.now() - startTime;

        return createSuccessResponse([
          `✓ Element hidden`,
          `Selector: ${selector}`,
          `Wait time: ${elapsed}ms`,
        ].join('\n'));
      } catch (error: any) {
        throw new Error(`Element did not become hidden within ${timeout}ms: ${error.message}`);
      }
    });
  }
}

/**
 * Wait for URL to match pattern
 */
export class WaitForUrlTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        urlPattern,
        timeout = 30000,
      } = args;

      if (!urlPattern) {
        throw new Error('urlPattern parameter is required');
      }

      const startTime = Date.now();

      try {
        await page.waitForURL(urlPattern, { timeout });

        const elapsed = Date.now() - startTime;
        const currentUrl = page.url();

        return createSuccessResponse([
          `✓ URL matched pattern`,
          `Pattern: ${urlPattern}`,
          `Current URL: ${currentUrl}`,
          `Wait time: ${elapsed}ms`,
        ].join('\n'));
      } catch (error: any) {
        const currentUrl = page.url();
        throw new Error(`URL did not match pattern within ${timeout}ms. Pattern: ${urlPattern}, Current URL: ${currentUrl}`);
      }
    });
  }
}
