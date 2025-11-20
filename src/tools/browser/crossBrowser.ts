/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import { chromium, firefox, webkit, devices, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Tool for running actions across multiple browsers in parallel
 */
export class RunAcrossBrowsersTool extends BrowserToolBase {
  /**
   * Execute the run across browsers tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const {
      url,
      browsers = ['chromium', 'firefox', 'webkit'],
      action,
      viewport = { width: 1280, height: 720 },
      headless = true
    } = args;

    try {
      const results: Array<{ browser: string; success: boolean; result: string; duration: number }> = [];

      // Launch all browsers in parallel
      const browserPromises = browsers.map(async (browserType: 'chromium' | 'firefox' | 'webkit') => {
        const startTime = Date.now();
        let browserInstance: Browser | null = null;
        let pageInstance: Page | null = null;

        try {
          // Launch browser
          const launchOptions = { headless };
          if (browserType === 'chromium') {
            browserInstance = await chromium.launch(launchOptions);
          } else if (browserType === 'firefox') {
            browserInstance = await firefox.launch(launchOptions);
          } else if (browserType === 'webkit') {
            browserInstance = await webkit.launch(launchOptions);
          } else {
            throw new Error(`Unknown browser type: ${browserType}`);
          }

          // Create page with viewport
          pageInstance = await browserInstance.newPage({
            viewport: viewport
          });

          // Navigate to URL
          await pageInstance.goto(url, { waitUntil: 'load', timeout: 30000 });

          // Perform action if specified
          let actionResult = `Navigated to ${url}`;
          if (action === 'screenshot') {
            const screenshotPath = `screenshots/${browserType}-${Date.now()}.png`;
            const dir = path.dirname(screenshotPath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            await pageInstance.screenshot({ path: screenshotPath });
            actionResult = `Screenshot saved: ${screenshotPath}`;
          } else if (action === 'title') {
            const title = await pageInstance.title();
            actionResult = `Page title: ${title}`;
          } else if (action === 'content') {
            const content = await pageInstance.content();
            actionResult = `Content length: ${content.length} characters`;
          }

          const duration = Date.now() - startTime;

          results.push({
            browser: browserType,
            success: true,
            result: actionResult,
            duration
          });

        } catch (error) {
          const duration = Date.now() - startTime;
          results.push({
            browser: browserType,
            success: false,
            result: `Error: ${(error as Error).message}`,
            duration
          });
        } finally {
          // Cleanup
          if (pageInstance) await pageInstance.close().catch(() => {});
          if (browserInstance) await browserInstance.close().catch(() => {});
        }
      });

      // Wait for all browsers to complete
      await Promise.all(browserPromises);

      // Format results
      const output = results.map(r =>
        `${r.success ? '✓' : '✗'} ${r.browser.toUpperCase()}: ${r.result} (${r.duration}ms)`
      );

      const allSucceeded = results.every(r => r.success);
      const summary = [
        `=== Cross-Browser Execution Summary ===`,
        ...output,
        ``,
        `Total: ${results.length}`,
        `Passed: ${results.filter(r => r.success).length}`,
        `Failed: ${results.filter(r => !r.success).length}`
      ];

      return allSucceeded
        ? createSuccessResponse(summary)
        : createErrorResponse(summary.join('\n'));

    } catch (error) {
      return createErrorResponse(`Cross-browser execution failed: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for capturing and comparing screenshots across multiple browsers
 */
export class CrossBrowserScreenshotTool extends BrowserToolBase {
  /**
   * Execute the cross-browser screenshot tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const {
      url,
      browsers = ['chromium', 'firefox', 'webkit'],
      outputDir = 'screenshots/cross-browser',
      viewport = { width: 1280, height: 720 },
      fullPage = false,
      compareResults = true,
      threshold = 0.1,
      headless = true
    } = args;

    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const screenshots: Array<{ browser: string; path: string; success: boolean }> = [];

      // Capture screenshots from all browsers in parallel
      const capturePromises = browsers.map(async (browserType: 'chromium' | 'firefox' | 'webkit') => {
        let browserInstance: Browser | null = null;
        let pageInstance: Page | null = null;

        try {
          // Launch browser
          const launchOptions = { headless };
          if (browserType === 'chromium') {
            browserInstance = await chromium.launch(launchOptions);
          } else if (browserType === 'firefox') {
            browserInstance = await firefox.launch(launchOptions);
          } else if (browserType === 'webkit') {
            browserInstance = await webkit.launch(launchOptions);
          }

          if (!browserInstance) {
            throw new Error(`Failed to launch ${browserType}`);
          }

          // Create page
          pageInstance = await browserInstance.newPage({ viewport });

          // Navigate
          await pageInstance.goto(url, { waitUntil: 'load', timeout: 30000 });

          // Wait for any animations
          await pageInstance.waitForTimeout(500);

          // Capture screenshot
          const screenshotPath = path.join(outputDir, `${browserType}.png`);
          await pageInstance.screenshot({ path: screenshotPath, fullPage });

          screenshots.push({
            browser: browserType,
            path: screenshotPath,
            success: true
          });

        } catch (error) {
          screenshots.push({
            browser: browserType,
            path: '',
            success: false
          });
        } finally {
          if (pageInstance) await pageInstance.close().catch(() => {});
          if (browserInstance) await browserInstance.close().catch(() => {});
        }
      });

      await Promise.all(capturePromises);

      const successfulScreenshots = screenshots.filter(s => s.success);
      const output = screenshots.map(s =>
        `${s.success ? '✓' : '✗'} ${s.browser.toUpperCase()}: ${s.success ? s.path : 'Failed'}`
      );

      // Compare screenshots if requested and we have multiple successful captures
      if (compareResults && successfulScreenshots.length >= 2) {
        output.push('');
        output.push('=== Visual Comparison ===');

        // Compare each browser pair
        for (let i = 0; i < successfulScreenshots.length - 1; i++) {
          for (let j = i + 1; j < successfulScreenshots.length; j++) {
            const browser1 = successfulScreenshots[i];
            const browser2 = successfulScreenshots[j];

            try {
              const img1 = PNG.sync.read(fs.readFileSync(browser1.path));
              const img2 = PNG.sync.read(fs.readFileSync(browser2.path));

              // Check dimensions
              if (img1.width !== img2.width || img1.height !== img2.height) {
                output.push(`⚠️  ${browser1.browser} vs ${browser2.browser}: Different dimensions`);
                continue;
              }

              // Compare
              const { width, height } = img1;
              const diff = new PNG({ width, height });
              const numDiffPixels = pixelmatch(
                img1.data,
                img2.data,
                diff.data,
                width,
                height,
                { threshold }
              );

              const totalPixels = width * height;
              const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
              const maxDiffPercentage = threshold * 100;
              const passed = parseFloat(diffPercentage) <= maxDiffPercentage;

              if (passed) {
                output.push(`✓ ${browser1.browser} vs ${browser2.browser}: ${diffPercentage}% difference (PASSED)`);
              } else {
                output.push(`✗ ${browser1.browser} vs ${browser2.browser}: ${diffPercentage}% difference (FAILED)`);

                // Save diff image
                const diffPath = path.join(outputDir, `diff-${browser1.browser}-vs-${browser2.browser}.png`);
                fs.writeFileSync(diffPath, PNG.sync.write(diff));
                output.push(`  Diff saved: ${diffPath}`);
              }

            } catch (error) {
              output.push(`⚠️  ${browser1.browser} vs ${browser2.browser}: Comparison error`);
            }
          }
        }
      }

      output.push('');
      output.push(`=== Summary ===`);
      output.push(`Total browsers: ${browsers.length}`);
      output.push(`Successful captures: ${successfulScreenshots.length}`);
      output.push(`Failed captures: ${browsers.length - successfulScreenshots.length}`);

      const allSucceeded = screenshots.every(s => s.success);

      return allSucceeded
        ? createSuccessResponse(output)
        : createErrorResponse(output.join('\n'));

    } catch (error) {
      return createErrorResponse(`Cross-browser screenshot failed: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for emulating mobile devices
 */
export class EmulateDeviceTool extends BrowserToolBase {
  /**
   * Execute the emulate device tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const {
        device: deviceName,
        orientation = 'portrait',
        geolocation,
        permissions,
        locale,
        timezoneId
      } = args;

      try {
        // Get device descriptor
        const device = devices[deviceName];
        if (!device) {
          const availableDevices = Object.keys(devices).slice(0, 20).join(', ');
          return createErrorResponse(
            `Unknown device: ${deviceName}\n` +
            `Available devices include: ${availableDevices}...\n` +
            `See: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/deviceDescriptorsSource.json`
          );
        }

        // Get browser context
        const browserContext = page.context();

        // Set viewport and user agent
        let viewport = device.viewport;
        if (orientation === 'landscape' && viewport) {
          viewport = {
            width: viewport.height,
            height: viewport.width
          };
        }

        if (viewport) {
          await page.setViewportSize(viewport);
        }

        if (device.userAgent) {
          await browserContext.setExtraHTTPHeaders({
            'User-Agent': device.userAgent
          });
        }

        // Set geolocation if provided
        if (geolocation) {
          await browserContext.setGeolocation(geolocation);
        }

        // Grant permissions if provided
        if (permissions && Array.isArray(permissions)) {
          await browserContext.grantPermissions(permissions);
        }

        // Set locale if provided
        if (locale) {
          await browserContext.setExtraHTTPHeaders({
            'Accept-Language': locale
          });
        }

        // Set timezone if provided
        if (timezoneId) {
          // Note: Timezone setting requires browser restart, inform user
        }

        const result = [
          `Device emulation configured: ${deviceName}`,
          `Viewport: ${viewport?.width}x${viewport?.height}`,
          `Orientation: ${orientation}`,
          `User Agent: ${device.userAgent?.substring(0, 50)}...`,
          device.hasTouch ? `Touch: Enabled` : '',
          device.isMobile ? `Mobile: Yes` : ''
        ].filter(Boolean);

        if (geolocation) {
          result.push(`Geolocation: ${geolocation.latitude}, ${geolocation.longitude}`);
        }

        if (permissions) {
          result.push(`Permissions granted: ${permissions.join(', ')}`);
        }

        return createSuccessResponse(result);

      } catch (error) {
        return createErrorResponse(`Device emulation failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for listing available device emulations
 */
export class ListDevicesTool extends BrowserToolBase {
  /**
   * Execute the list devices tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const { filter } = args;

    try {
      const deviceList = Object.keys(devices);

      let filteredDevices = deviceList;
      if (filter) {
        const filterLower = filter.toLowerCase();
        filteredDevices = deviceList.filter(name =>
          name.toLowerCase().includes(filterLower)
        );
      }

      const output = [
        `=== Available Devices (${filteredDevices.length}/${deviceList.length}) ===`,
        '',
        ...filteredDevices.slice(0, 50).map(name => {
          const device = devices[name];
          const viewport = device.viewport;
          return `• ${name} (${viewport?.width}x${viewport?.height})`;
        })
      ];

      if (filteredDevices.length > 50) {
        output.push('');
        output.push(`... and ${filteredDevices.length - 50} more`);
        output.push(`Use filter parameter to narrow results`);
      }

      output.push('');
      output.push(`Popular devices:`);
      output.push(`  • iPhone 13`);
      output.push(`  • Pixel 5`);
      output.push(`  • iPad Pro`);
      output.push(`  • Galaxy S9+`);

      return createSuccessResponse(output);

    } catch (error) {
      return createErrorResponse(`Failed to list devices: ${(error as Error).message}`);
    }
  }
}
