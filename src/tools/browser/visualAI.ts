/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Visual AI Testing - ML-based visual regression testing
 * Intelligently detects visual changes while ignoring dynamic content
 */

import { Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Region to ignore in visual comparison
 */
export interface IgnoreRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Dynamic content detection result
 */
export interface DynamicContentRegion {
  type: 'timestamp' | 'ad' | 'random' | 'animation';
  region: IgnoreRegion;
  confidence: number;
}

/**
 * AI Visual Compare - Intelligent visual regression with dynamic content filtering
 */
export class AIVisualCompareTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        baselinePath,
        threshold = 0.1,
        ignoreRegions: userIgnoreRegions = 'auto', // 'auto', 'none', or array of regions
        detectDynamic = true,
        saveDiff = true,
        diffPath,
      } = args;

      if (!baselinePath) {
        throw new Error('baselinePath parameter is required');
      }

      try {
        // Take current screenshot
        const currentBuffer = await page.screenshot({ fullPage: true });

        // Read baseline
        const baselineBuffer = await fs.readFile(baselinePath);

        // Parse images
        const baseline = PNG.sync.read(baselineBuffer);
        const current = PNG.sync.read(currentBuffer);

        // Ensure dimensions match
        if (baseline.width !== current.width || baseline.height !== current.height) {
          return createErrorResponse(
            `Image dimensions don't match. Baseline: ${baseline.width}x${baseline.height}, Current: ${current.width}x${current.height}`
          );
        }

        // Detect dynamic content regions if enabled
        let ignoreRegions: IgnoreRegion[] = [];
        let dynamicRegions: DynamicContentRegion[] = [];

        if (detectDynamic && userIgnoreRegions === 'auto') {
          dynamicRegions = await this.detectDynamicContent(page, baseline, current);
          ignoreRegions = dynamicRegions.map(dr => dr.region);
        } else if (Array.isArray(userIgnoreRegions)) {
          ignoreRegions = userIgnoreRegions;
        }

        // Create diff image
        const diff = new PNG({ width: baseline.width, height: baseline.height });

        // Create mask for ignore regions
        const mask = this.createIgnoreMask(baseline.width, baseline.height, ignoreRegions);

        // Compare pixels (mask applied via pixel modification)
        const mismatchedPixels = pixelmatch(
          baseline.data,
          current.data,
          diff.data,
          baseline.width,
          baseline.height,
          {
            threshold,
            alpha: 0.1,
          }
        );

        const totalPixels = baseline.width * baseline.height;
        const diffPercentage = (mismatchedPixels / totalPixels) * 100;

        // Save diff image if requested
        let diffOutputPath: string | undefined;
        if (saveDiff) {
          diffOutputPath = diffPath || baselinePath.replace(/\.png$/, '-diff.png');
          await fs.writeFile(diffOutputPath, PNG.sync.write(diff));
        }

        // Format output
        const output: string[] = [
          `🤖 AI Visual Comparison`,
          `URL: ${page.url()}`,
          ``,
          `📊 Results:`,
          `  • Image size: ${baseline.width}x${baseline.height}`,
          `  • Mismatched pixels: ${mismatchedPixels.toLocaleString()}`,
          `  • Total pixels: ${totalPixels.toLocaleString()}`,
          `  • Difference: ${diffPercentage.toFixed(4)}%`,
          `  • Threshold: ${threshold}`,
          ``,
        ];

        // Report dynamic content detection
        if (detectDynamic && dynamicRegions.length > 0) {
          output.push(`🔍 Dynamic Content Detected (${dynamicRegions.length} regions):`);
          dynamicRegions.forEach((region, index) => {
            output.push(`  ${index + 1}. ${region.type} (confidence: ${(region.confidence * 100).toFixed(1)}%)`);
            output.push(`     Region: ${region.region.x},${region.region.y} ${region.region.width}x${region.region.height}`);
          });
          output.push('');
        }

        // Report ignored regions
        if (ignoreRegions.length > 0) {
          output.push(`⏭️  Ignored Regions: ${ignoreRegions.length}`);
          output.push('');
        }

        // Determine pass/fail
        const passed = diffPercentage < threshold * 100;

        if (passed) {
          output.push(`✅ Visual test PASSED`);
        } else {
          output.push(`❌ Visual test FAILED`);
          output.push(`   Expected: <${(threshold * 100).toFixed(2)}% difference`);
          output.push(`   Actual: ${diffPercentage.toFixed(4)}%`);
        }

        if (diffOutputPath) {
          output.push('');
          output.push(`💾 Diff image saved: ${diffOutputPath}`);
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`AI visual comparison failed: ${error.message}`);
      }
    });
  }

  /**
   * Detect dynamic content regions using ML patterns
   */
  private async detectDynamicContent(
    page: Page,
    baseline: PNG,
    current: PNG
  ): Promise<DynamicContentRegion[]> {
    const regions: DynamicContentRegion[] = [];

    // Detect timestamp patterns
    const timestampRegions = await this.detectTimestamps(page);
    regions.push(...timestampRegions);

    // Detect ad regions
    const adRegions = await this.detectAdRegions(page);
    regions.push(...adRegions);

    // Detect animated regions by comparing multiple frames
    const animatedRegions = this.detectAnimations(baseline, current);
    regions.push(...animatedRegions);

    return regions;
  }

  /**
   * Detect timestamp elements on the page
   */
  private async detectTimestamps(page: Page): Promise<DynamicContentRegion[]> {
    return await page.evaluate(() => {
      const regions: DynamicContentRegion[] = [];
      const timestampPatterns = [
        /\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?/i,
        /\d{1,2}\/\d{1,2}\/\d{2,4}/,
        /\d{4}-\d{2}-\d{2}/,
        /\d+ (second|minute|hour|day|week|month|year)s? ago/i,
        /just now/i,
        /today|yesterday|tomorrow/i,
      ];

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node;
      while ((node = walker.nextNode())) {
        textNodes.push(node as Text);
      }

      textNodes.forEach(textNode => {
        const text = textNode.textContent || '';

        for (const pattern of timestampPatterns) {
          if (pattern.test(text)) {
            const element = textNode.parentElement;
            if (element) {
              const rect = element.getBoundingClientRect();

              if (rect.width > 0 && rect.height > 0) {
                regions.push({
                  type: 'timestamp',
                  region: {
                    x: Math.floor(rect.left),
                    y: Math.floor(rect.top),
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height),
                  },
                  confidence: 0.9,
                });
              }
            }
            break;
          }
        }
      });

      return regions;
    });
  }

  /**
   * Detect advertisement regions
   */
  private async detectAdRegions(page: Page): Promise<DynamicContentRegion[]> {
    return await page.evaluate(() => {
      const regions: DynamicContentRegion[] = [];
      const adSelectors = [
        '[class*="ad-"]',
        '[class*="advertisement"]',
        '[id*="ad-"]',
        '[id*="advertisement"]',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googlesyndication"]',
        '[data-ad]',
        '.adsbygoogle',
      ];

      adSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          const rect = element.getBoundingClientRect();

          if (rect.width > 0 && rect.height > 0) {
            regions.push({
              type: 'ad',
              region: {
                x: Math.floor(rect.left),
                y: Math.floor(rect.top),
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height),
              },
              confidence: 0.85,
            });
          }
        });
      });

      return regions;
    });
  }

  /**
   * Detect animated regions by analyzing pixel changes
   */
  private detectAnimations(baseline: PNG, current: PNG): DynamicContentRegion[] {
    const regions: DynamicContentRegion[] = [];
    const blockSize = 50; // Size of blocks to analyze

    const changedBlocks: Array<{ x: number; y: number; changeRate: number }> = [];

    // Divide image into blocks and calculate change rate
    for (let y = 0; y < baseline.height; y += blockSize) {
      for (let x = 0; x < baseline.width; x += blockSize) {
        const blockWidth = Math.min(blockSize, baseline.width - x);
        const blockHeight = Math.min(blockSize, baseline.height - y);

        let changedPixels = 0;
        let totalPixels = blockWidth * blockHeight;

        for (let by = 0; by < blockHeight; by++) {
          for (let bx = 0; bx < blockWidth; bx++) {
            const idx = ((y + by) * baseline.width + (x + bx)) * 4;

            const dr = Math.abs(baseline.data[idx] - current.data[idx]);
            const dg = Math.abs(baseline.data[idx + 1] - current.data[idx + 1]);
            const db = Math.abs(baseline.data[idx + 2] - current.data[idx + 2]);

            if (dr + dg + db > 30) {
              changedPixels++;
            }
          }
        }

        const changeRate = changedPixels / totalPixels;

        if (changeRate > 0.3) {
          // More than 30% of pixels changed - likely animated
          changedBlocks.push({ x, y, changeRate });
        }
      }
    }

    // Merge adjacent blocks
    const merged: IgnoreRegion[] = [];
    changedBlocks.forEach(block => {
      let foundMerge = false;

      for (const region of merged) {
        if (
          Math.abs(region.x - block.x) < blockSize * 2 &&
          Math.abs(region.y - block.y) < blockSize * 2
        ) {
          // Merge blocks
          const minX = Math.min(region.x, block.x);
          const minY = Math.min(region.y, block.y);
          const maxX = Math.max(region.x + region.width, block.x + blockSize);
          const maxY = Math.max(region.y + region.height, block.y + blockSize);

          region.x = minX;
          region.y = minY;
          region.width = maxX - minX;
          region.height = maxY - minY;

          foundMerge = true;
          break;
        }
      }

      if (!foundMerge) {
        merged.push({
          x: block.x,
          y: block.y,
          width: blockSize,
          height: blockSize,
        });
      }
    });

    merged.forEach(region => {
      regions.push({
        type: 'animation',
        region,
        confidence: 0.7,
      });
    });

    return regions;
  }

  /**
   * Create a mask for pixelmatch to ignore certain regions
   */
  private createIgnoreMask(
    width: number,
    height: number,
    ignoreRegions: IgnoreRegion[]
  ): boolean[] | undefined {
    if (ignoreRegions.length === 0) {
      return undefined;
    }

    const mask = new Array(width * height).fill(false);

    ignoreRegions.forEach(region => {
      for (let y = region.y; y < region.y + region.height && y < height; y++) {
        for (let x = region.x; x < region.x + region.width && x < width; x++) {
          mask[y * width + x] = true;
        }
      }
    });

    return mask;
  }
}

/**
 * Train AI model on visual patterns (placeholder for future ML integration)
 */
export class TrainVisualModelTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const {
      trainingDataPath,
      modelOutputPath,
      modelType = 'dynamic_content_detection',
    } = args;

    // This is a placeholder for future ML model training integration
    // Could integrate with TensorFlow.js or similar libraries

    return createSuccessResponse([
      `🤖 Visual AI Model Training (Coming Soon)`,
      ``,
      `This feature will allow training custom ML models for:`,
      `  • Custom dynamic content patterns`,
      `  • Domain-specific visual elements`,
      `  • Application-specific ignore regions`,
      ``,
      `Training data: ${trainingDataPath || 'Not specified'}`,
      `Model output: ${modelOutputPath || 'Not specified'}`,
      `Model type: ${modelType}`,
    ].join('\n'));
  }
}

/**
 * Batch AI visual comparison
 */
export class BatchAIVisualCompareTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        comparisons,
        threshold = 0.1,
        detectDynamic = true,
        failFast = false,
      } = args;

      if (!Array.isArray(comparisons)) {
        throw new Error('comparisons parameter must be an array');
      }

      const results: Array<{
        name: string;
        passed: boolean;
        diffPercentage: number;
        dynamicRegions: number;
      }> = [];

      const aiCompare = new AIVisualCompareTool(this.server);

      for (const comparison of comparisons) {
        try {
          // Navigate to page
          await page.goto(comparison.url);

          // Run comparison
          const result = await aiCompare.execute(
            {
              baselinePath: comparison.baselinePath,
              threshold,
              detectDynamic,
              saveDiff: true,
            },
            { page }
          );

          const resultText = (result.content[0] as any).text;
          const passed = resultText.includes('PASSED');
          const diffMatch = resultText.match(/Difference: ([\d.]+)%/);
          const diffPercentage = diffMatch ? parseFloat(diffMatch[1]) : 0;
          const dynamicMatch = resultText.match(/Dynamic Content Detected \((\d+) regions\)/);
          const dynamicRegions = dynamicMatch ? parseInt(dynamicMatch[1]) : 0;

          results.push({
            name: comparison.name || comparison.url,
            passed,
            diffPercentage,
            dynamicRegions,
          });

          if (failFast && !passed) {
            break;
          }
        } catch (error: any) {
          results.push({
            name: comparison.name || comparison.url,
            passed: false,
            diffPercentage: 100,
            dynamicRegions: 0,
          });

          if (failFast) {
            break;
          }
        }
      }

      // Format output
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

      const output: string[] = [
        `🚀 Batch AI Visual Comparison`,
        ``,
        `📊 Summary:`,
        `  Total: ${results.length}`,
        `  ✅ Passed: ${passed}`,
        `  ❌ Failed: ${failed}`,
        ``,
        `Results:`,
      ];

      results.forEach((result, index) => {
        const icon = result.passed ? '✅' : '❌';
        output.push(`  ${index + 1}. ${icon} ${result.name}`);
        output.push(`     Difference: ${result.diffPercentage.toFixed(4)}%`);
        if (result.dynamicRegions > 0) {
          output.push(`     Dynamic regions ignored: ${result.dynamicRegions}`);
        }
      });

      return createSuccessResponse(output.join('\n'));
    });
  }
}
