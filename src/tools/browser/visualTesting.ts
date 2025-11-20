/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Tool for visual regression testing - comparing screenshots against baselines
 */
export class VisualCompareTool extends BrowserToolBase {
  /**
   * Execute the visual compare tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const {
        baseline,
        current,
        threshold = 0.1,
        outputDiff = true,
        diffOutputPath,
        regions,
        captureScreenshot = true,
        fullPage = false
      } = args;

      try {
        // Step 1: Get or capture current screenshot
        let currentImagePath: string;

        if (captureScreenshot) {
          // Capture a new screenshot
          const timestamp = Date.now();
          const screenshotDir = path.dirname(baseline);
          currentImagePath = path.join(screenshotDir, `current-${timestamp}.png`);

          // Ensure directory exists
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }

          if (regions && regions.length > 0) {
            // Capture specific region
            const region = regions[0]; // Use first region
            const element = await page.locator(region.selector);
            await element.screenshot({ path: currentImagePath });
          } else {
            // Capture full page or viewport
            await page.screenshot({
              path: currentImagePath,
              fullPage: fullPage
            });
          }
        } else {
          // Use provided current screenshot path
          currentImagePath = current;
          if (!fs.existsSync(currentImagePath)) {
            return createErrorResponse(`Current screenshot not found: ${currentImagePath}`);
          }
        }

        // Step 2: Verify baseline exists
        if (!fs.existsSync(baseline)) {
          // If baseline doesn't exist, save current as baseline
          fs.copyFileSync(currentImagePath, baseline);
          return createSuccessResponse([
            `Baseline screenshot created: ${baseline}`,
            `No comparison performed (first run)`,
            `Future runs will compare against this baseline`
          ]);
        }

        // Step 3: Load images
        const baselineImage = PNG.sync.read(fs.readFileSync(baseline));
        const currentImage = PNG.sync.read(fs.readFileSync(currentImagePath));

        // Step 4: Validate image dimensions
        if (
          baselineImage.width !== currentImage.width ||
          baselineImage.height !== currentImage.height
        ) {
          return createErrorResponse(
            `Image dimensions don't match\n` +
            `Baseline: ${baselineImage.width}x${baselineImage.height}\n` +
            `Current: ${currentImage.width}x${currentImage.height}`
          );
        }

        // Step 5: Compare images
        const { width, height } = baselineImage;
        const diffImage = new PNG({ width, height });

        const numDiffPixels = pixelmatch(
          baselineImage.data,
          currentImage.data,
          diffImage.data,
          width,
          height,
          {
            threshold: threshold,
            includeAA: true,
            alpha: 0.1,
            aaColor: [255, 0, 0],
            diffColor: [255, 0, 0],
            diffColorAlt: [0, 255, 0]
          }
        );

        const totalPixels = width * height;
        const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);

        // Step 6: Generate diff image if requested
        let diffImagePath: string | undefined;
        if (outputDiff && numDiffPixels > 0) {
          diffImagePath = diffOutputPath || baseline.replace('.png', '-diff.png');
          fs.writeFileSync(diffImagePath, PNG.sync.write(diffImage));
        }

        // Step 7: Determine pass/fail
        const maxDiffPercentage = threshold * 100;
        const passed = parseFloat(diffPercentage) <= maxDiffPercentage;

        // Step 8: Return results
        const result = [
          `Visual comparison ${passed ? 'PASSED ✓' : 'FAILED ✗'}`,
          `Baseline: ${baseline}`,
          `Current: ${currentImagePath}`,
          `Different pixels: ${numDiffPixels} / ${totalPixels} (${diffPercentage}%)`,
          `Threshold: ${maxDiffPercentage}%`
        ];

        if (diffImagePath) {
          result.push(`Diff image saved: ${diffImagePath}`);
        }

        if (regions && regions.length > 0) {
          result.push(`Region comparison: ${regions[0].selector}`);
        }

        return passed
          ? createSuccessResponse(result)
          : createErrorResponse(result.join('\n'));

      } catch (error) {
        return createErrorResponse(`Visual comparison failed: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for creating baseline screenshots for visual testing
 */
export class CreateBaselineTool extends BrowserToolBase {
  /**
   * Execute the create baseline tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const {
        outputPath,
        selector,
        fullPage = false,
        overwrite = false
      } = args;

      try {
        // Check if baseline already exists
        if (fs.existsSync(outputPath) && !overwrite) {
          return createErrorResponse(
            `Baseline already exists: ${outputPath}\n` +
            `Set overwrite: true to replace it`
          );
        }

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Capture screenshot
        if (selector) {
          const element = await page.locator(selector);
          await element.screenshot({ path: outputPath });
        } else {
          await page.screenshot({
            path: outputPath,
            fullPage: fullPage
          });
        }

        return createSuccessResponse([
          `Baseline screenshot created`,
          `Path: ${outputPath}`,
          selector ? `Selector: ${selector}` : `Type: ${fullPage ? 'Full page' : 'Viewport'}`
        ]);

      } catch (error) {
        return createErrorResponse(`Failed to create baseline: ${(error as Error).message}`);
      }
    });
  }
}

/**
 * Tool for batch visual comparison of multiple screenshots
 */
export class BatchVisualCompareTool extends BrowserToolBase {
  /**
   * Execute the batch visual compare tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page) => {
      const {
        comparisons,
        threshold = 0.1,
        outputDiff = true,
        stopOnFailure = false
      } = args;

      const results: string[] = [];
      let totalPassed = 0;
      let totalFailed = 0;

      for (const comparison of comparisons) {
        const { baseline, current, name } = comparison;

        try {
          // Load images
          if (!fs.existsSync(baseline)) {
            results.push(`⚠️  ${name || baseline}: Baseline not found`);
            totalFailed++;
            continue;
          }

          if (!fs.existsSync(current)) {
            results.push(`⚠️  ${name || current}: Current screenshot not found`);
            totalFailed++;
            continue;
          }

          const baselineImage = PNG.sync.read(fs.readFileSync(baseline));
          const currentImage = PNG.sync.read(fs.readFileSync(current));

          // Validate dimensions
          if (
            baselineImage.width !== currentImage.width ||
            baselineImage.height !== currentImage.height
          ) {
            results.push(`⚠️  ${name || baseline}: Dimension mismatch`);
            totalFailed++;
            continue;
          }

          // Compare
          const { width, height } = baselineImage;
          const diffImage = new PNG({ width, height });

          const numDiffPixels = pixelmatch(
            baselineImage.data,
            currentImage.data,
            diffImage.data,
            width,
            height,
            { threshold }
          );

          const totalPixels = width * height;
          const diffPercentage = ((numDiffPixels / totalPixels) * 100).toFixed(2);
          const maxDiffPercentage = threshold * 100;
          const passed = parseFloat(diffPercentage) <= maxDiffPercentage;

          if (passed) {
            results.push(`✓ ${name || baseline}: PASSED (${diffPercentage}% diff)`);
            totalPassed++;
          } else {
            results.push(`✗ ${name || baseline}: FAILED (${diffPercentage}% diff, threshold: ${maxDiffPercentage}%)`);
            totalFailed++;

            // Save diff image
            if (outputDiff) {
              const diffPath = baseline.replace('.png', '-diff.png');
              fs.writeFileSync(diffPath, PNG.sync.write(diffImage));
            }

            if (stopOnFailure) {
              break;
            }
          }

        } catch (error) {
          results.push(`⚠️  ${name || baseline}: Error - ${(error as Error).message}`);
          totalFailed++;
        }
      }

      // Summary
      results.push('');
      results.push(`=== Summary ===`);
      results.push(`Total: ${totalPassed + totalFailed}`);
      results.push(`Passed: ${totalPassed}`);
      results.push(`Failed: ${totalFailed}`);

      const allPassed = totalFailed === 0;

      return allPassed
        ? createSuccessResponse(results)
        : createErrorResponse(results.join('\n'));
    });
  }
}
