/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Code Coverage Integration - Track JS and CSS coverage during testing
 */

import { Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';

/**
 * Coverage data interfaces
 */
export interface CoverageEntry {
  url: string;
  text: string;
  ranges: Array<{
    start: number;
    end: number;
  }>;
}

export interface CoverageSummary {
  totalBytes: number;
  usedBytes: number;
  percentUsed: number;
}

/**
 * Start code coverage collection
 */
export class StartCoverageTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        js = true,
        css = true,
        resetOnNavigation = false,
      } = args;

      try {
        // Start coverage collection
        const promises: Promise<void>[] = [];

        if (js) {
          promises.push(page.coverage.startJSCoverage({ resetOnNavigation }));
        }

        if (css) {
          promises.push(page.coverage.startCSSCoverage({ resetOnNavigation }));
        }

        await Promise.all(promises);

        const output: string[] = [
          `📊 Coverage collection started`,
          `URL: ${page.url()}`,
          ``,
          `Settings:`,
          `  • JavaScript: ${js ? 'enabled' : 'disabled'}`,
          `  • CSS: ${css ? 'enabled' : 'disabled'}`,
          `  • Reset on navigation: ${resetOnNavigation}`,
        ];

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Failed to start coverage: ${error.message}`);
      }
    });
  }
}

/**
 * Stop coverage and get results
 */
export class GetCoverageTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        type = 'both', // 'js', 'css', 'both'
        saveToFile,
        includeRawData = false,
      } = args;

      try {
        let jsCoverage: any[] = [];
        let cssCoverage: any[] = [];

        // Stop coverage and collect data
        if (type === 'js' || type === 'both') {
          jsCoverage = await page.coverage.stopJSCoverage();
        }

        if (type === 'css' || type === 'both') {
          cssCoverage = await page.coverage.stopCSSCoverage();
        }

        // Calculate summaries
        const jsSummary = this.calculateSummary(jsCoverage);
        const cssSummary = this.calculateSummary(cssCoverage);

        const output: string[] = [
          `📊 Code Coverage Results`,
          `URL: ${page.url()}`,
          ``,
        ];

        // JavaScript coverage
        if (type === 'js' || type === 'both') {
          output.push(`JavaScript Coverage:`);
          output.push(`  • Files: ${jsCoverage.length}`);
          output.push(`  • Total bytes: ${this.formatBytes(jsSummary.totalBytes)}`);
          output.push(`  • Used bytes: ${this.formatBytes(jsSummary.usedBytes)}`);
          output.push(`  • Coverage: ${jsSummary.percentUsed.toFixed(2)}%`);
          output.push('');

          // Show per-file breakdown
          if (jsCoverage.length > 0) {
            output.push('  Top uncovered files:');
            const uncovered = jsCoverage
              .map(entry => ({
                url: entry.url,
                summary: this.calculateSummary([entry]),
              }))
              .filter(item => item.summary.percentUsed < 100)
              .sort((a, b) => a.summary.percentUsed - b.summary.percentUsed)
              .slice(0, 5);

            uncovered.forEach((item, index) => {
              const fileName = item.url.split('/').pop() || item.url;
              output.push(`    ${index + 1}. ${fileName}: ${item.summary.percentUsed.toFixed(1)}% (${this.formatBytes(item.summary.usedBytes)}/${this.formatBytes(item.summary.totalBytes)})`);
            });
            output.push('');
          }
        }

        // CSS coverage
        if (type === 'css' || type === 'both') {
          output.push(`CSS Coverage:`);
          output.push(`  • Files: ${cssCoverage.length}`);
          output.push(`  • Total bytes: ${this.formatBytes(cssSummary.totalBytes)}`);
          output.push(`  • Used bytes: ${this.formatBytes(cssSummary.usedBytes)}`);
          output.push(`  • Coverage: ${cssSummary.percentUsed.toFixed(2)}%`);
          output.push('');

          // Show per-file breakdown
          if (cssCoverage.length > 0) {
            output.push('  Top uncovered files:');
            const uncovered = cssCoverage
              .map(entry => ({
                url: entry.url,
                summary: this.calculateSummary([entry]),
              }))
              .filter(item => item.summary.percentUsed < 100)
              .sort((a, b) => a.summary.percentUsed - b.summary.percentUsed)
              .slice(0, 5);

            uncovered.forEach((item, index) => {
              const fileName = item.url.split('/').pop() || item.url;
              output.push(`    ${index + 1}. ${fileName}: ${item.summary.percentUsed.toFixed(1)}% (${this.formatBytes(item.summary.usedBytes)}/${this.formatBytes(item.summary.totalBytes)})`);
            });
            output.push('');
          }
        }

        // Save to file if requested
        if (saveToFile) {
          const coverageData = {
            url: page.url(),
            timestamp: new Date().toISOString(),
            js: type === 'js' || type === 'both' ? { summary: jsSummary, files: jsCoverage.length } : null,
            css: type === 'css' || type === 'both' ? { summary: cssSummary, files: cssCoverage.length } : null,
          };

          if (includeRawData) {
            (coverageData as any).rawData = {
              js: jsCoverage,
              css: cssCoverage,
            };
          }

          await fs.mkdir(path.dirname(saveToFile), { recursive: true });
          await fs.writeFile(saveToFile, JSON.stringify(coverageData, null, 2), 'utf-8');

          output.push(`💾 Coverage data saved to: ${saveToFile}`);
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Failed to get coverage: ${error.message}`);
      }
    });
  }

  /**
   * Calculate coverage summary from entries
   */
  private calculateSummary(entries: any[]): CoverageSummary {
    let totalBytes = 0;
    let usedBytes = 0;

    for (const entry of entries) {
      totalBytes += entry.text.length;

      for (const range of entry.ranges) {
        usedBytes += range.end - range.start;
      }
    }

    const percentUsed = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

    return {
      totalBytes,
      usedBytes,
      percentUsed,
    };
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

/**
 * Generate coverage report in various formats
 */
export class GenerateCoverageReportTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        coverageFile,
        outputFile,
        format = 'html', // 'html', 'json', 'lcov', 'text'
      } = args;

      if (!coverageFile) {
        throw new Error('coverageFile parameter is required');
      }

      if (!outputFile) {
        throw new Error('outputFile parameter is required');
      }

      try {
        // Read coverage data
        const data = await fs.readFile(coverageFile, 'utf-8');
        const coverageData = JSON.parse(data);

        let report: string;

        switch (format) {
          case 'html':
            report = this.generateHTMLReport(coverageData);
            break;
          case 'json':
            report = JSON.stringify(coverageData, null, 2);
            break;
          case 'text':
            report = this.generateTextReport(coverageData);
            break;
          case 'lcov':
            report = this.generateLCOVReport(coverageData);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }

        // Save report
        await fs.mkdir(path.dirname(outputFile), { recursive: true });
        await fs.writeFile(outputFile, report, 'utf-8');

        return createSuccessResponse([
          `✓ Coverage report generated`,
          `Format: ${format}`,
          `Output: ${outputFile}`,
        ].join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Failed to generate report: ${error.message}`);
      }
    });
  }

  /**
   * Generate HTML coverage report
   */
  private generateHTMLReport(data: any): string {
    const jsPercent = data.js?.summary?.percentUsed?.toFixed(2) || 0;
    const cssPercent = data.css?.summary?.percentUsed?.toFixed(2) || 0;

    return `<!DOCTYPE html>
<html>
<head>
  <title>Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
    .metric { display: inline-block; margin-right: 30px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .progress { width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
    .progress-bar { height: 100%; background: #4caf50; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Coverage Report</h1>
  <p>Generated: ${data.timestamp}</p>
  <p>URL: ${data.url}</p>

  <div class="summary">
    <h2>Summary</h2>
    ${data.js ? `
    <div class="metric">
      <div>JavaScript Coverage</div>
      <div class="metric-value">${jsPercent}%</div>
      <div class="progress">
        <div class="progress-bar" style="width: ${jsPercent}%"></div>
      </div>
    </div>
    ` : ''}
    ${data.css ? `
    <div class="metric">
      <div>CSS Coverage</div>
      <div class="metric-value">${cssPercent}%</div>
      <div class="progress">
        <div class="progress-bar" style="width: ${cssPercent}%"></div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Generate text coverage report
   */
  private generateTextReport(data: any): string {
    const lines: string[] = [
      'Coverage Report',
      '===============',
      '',
      `Generated: ${data.timestamp}`,
      `URL: ${data.url}`,
      '',
    ];

    if (data.js) {
      lines.push('JavaScript Coverage:');
      lines.push(`  Total bytes: ${data.js.summary.totalBytes}`);
      lines.push(`  Used bytes: ${data.js.summary.usedBytes}`);
      lines.push(`  Coverage: ${data.js.summary.percentUsed.toFixed(2)}%`);
      lines.push('');
    }

    if (data.css) {
      lines.push('CSS Coverage:');
      lines.push(`  Total bytes: ${data.css.summary.totalBytes}`);
      lines.push(`  Used bytes: ${data.css.summary.usedBytes}`);
      lines.push(`  Coverage: ${data.css.summary.percentUsed.toFixed(2)}%`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate LCOV format report
   */
  private generateLCOVReport(data: any): string {
    // Simplified LCOV format
    const lines: string[] = [];

    if (data.rawData?.js) {
      data.rawData.js.forEach((entry: any) => {
        lines.push(`SF:${entry.url}`);
        // LCOV format requires more detailed line-by-line coverage
        // This is a simplified version
        lines.push(`DA:1,1`);
        lines.push(`end_of_record`);
      });
    }

    return lines.join('\n');
  }
}

/**
 * Compare coverage between two runs
 */
export class CompareCoverageTool extends BrowserToolBase {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    return this.safeExecute(context, async (page: Page) => {
      const {
        baselinePath,
        currentPath,
      } = args;

      if (!baselinePath || !currentPath) {
        throw new Error('baselinePath and currentPath parameters are required');
      }

      try {
        const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf-8'));
        const current = JSON.parse(await fs.readFile(currentPath, 'utf-8'));

        const output: string[] = [
          `📊 Coverage Comparison`,
          ``,
          `Baseline: ${baseline.timestamp}`,
          `Current: ${current.timestamp}`,
          ``,
        ];

        // Compare JS coverage
        if (baseline.js && current.js) {
          const jsDiff = current.js.summary.percentUsed - baseline.js.summary.percentUsed;
          const jsDiffStr = jsDiff >= 0 ? `+${jsDiff.toFixed(2)}%` : `${jsDiff.toFixed(2)}%`;
          const jsDiffIcon = jsDiff >= 0 ? '📈' : '📉';

          output.push(`JavaScript Coverage:`);
          output.push(`  Baseline: ${baseline.js.summary.percentUsed.toFixed(2)}%`);
          output.push(`  Current: ${current.js.summary.percentUsed.toFixed(2)}%`);
          output.push(`  ${jsDiffIcon} Difference: ${jsDiffStr}`);
          output.push('');
        }

        // Compare CSS coverage
        if (baseline.css && current.css) {
          const cssDiff = current.css.summary.percentUsed - baseline.css.summary.percentUsed;
          const cssDiffStr = cssDiff >= 0 ? `+${cssDiff.toFixed(2)}%` : `${cssDiff.toFixed(2)}%`;
          const cssDiffIcon = cssDiff >= 0 ? '📈' : '📉';

          output.push(`CSS Coverage:`);
          output.push(`  Baseline: ${baseline.css.summary.percentUsed.toFixed(2)}%`);
          output.push(`  Current: ${current.css.summary.percentUsed.toFixed(2)}%`);
          output.push(`  ${cssDiffIcon} Difference: ${cssDiffStr}`);
          output.push('');
        }

        return createSuccessResponse(output.join('\n'));
      } catch (error: any) {
        return createErrorResponse(`Coverage comparison failed: ${error.message}`);
      }
    });
  }
}
