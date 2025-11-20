/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Parallel Test Execution Framework
 * Execute multiple test scenarios concurrently across browser sessions
 */

import { Browser, chromium, firefox, webkit } from 'playwright';
import { ToolHandler, ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import { resourceManager } from '../../utils/resourceManager.js';
import { sessionManager } from '../../sessionManager.js';

/**
 * Test action definition
 */
export interface TestAction {
  tool: string;
  args: any;
}

/**
 * Test scenario definition
 */
export interface TestScenario {
  name: string;
  browserType?: 'chromium' | 'firefox' | 'webkit';
  actions: TestAction[];
  timeout?: number;
}

/**
 * Test result
 */
export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout';
  duration: number;
  error?: string;
  sessionId?: string;
  screenshot?: string;
}

/**
 * Parallel test execution results
 */
export interface ParallelTestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  timeout: number;
  duration: number;
  results: TestResult[];
}

/**
 * Run tests in parallel across multiple sessions
 */
export class ParallelTestExecutor implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const {
      tests,
      maxConcurrency = 3,
      failFast = false,
      shardIndex,
      shardTotal,
      timeout = 60000,
    } = args;

    if (!tests || !Array.isArray(tests)) {
      return createErrorResponse('tests parameter must be an array of test scenarios');
    }

    try {
      const startTime = Date.now();

      // Apply sharding if specified
      let testsToRun = tests;
      if (shardIndex !== undefined && shardTotal !== undefined) {
        testsToRun = this.shardTests(tests, shardIndex, shardTotal);
      }

      const results: TestResult[] = [];
      const testQueue = [...testsToRun];
      const activeTests = new Map<string, Promise<TestResult>>();

      let shouldStop = false;

      // Process tests with concurrency limit
      while (testQueue.length > 0 || activeTests.size > 0) {
        // Stop if fail-fast is enabled and we have failures
        if (failFast && shouldStop) {
          // Cancel remaining tests
          testQueue.forEach(test => {
            results.push({
              name: test.name,
              status: 'skipped',
              duration: 0,
            });
          });
          break;
        }

        // Start new tests up to concurrency limit
        while (testQueue.length > 0 && activeTests.size < maxConcurrency && !shouldStop) {
          const test = testQueue.shift()!;
          const testPromise = this.executeTest(test, timeout);

          activeTests.set(test.name, testPromise);

          // Handle completion
          testPromise.then(result => {
            activeTests.delete(test.name);
            results.push(result);

            if (failFast && result.status === 'failed') {
              shouldStop = true;
            }
          });
        }

        // Wait for at least one test to complete
        if (activeTests.size > 0) {
          await Promise.race(Array.from(activeTests.values()));
        }
      }

      // Wait for all remaining tests
      await Promise.all(Array.from(activeTests.values()));

      const totalDuration = Date.now() - startTime;

      // Calculate statistics
      const stats: ParallelTestResults = {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        timeout: results.filter(r => r.status === 'timeout').length,
        duration: totalDuration,
        results,
      };

      return this.formatResults(stats, shardIndex, shardTotal);
    } catch (error: any) {
      return createErrorResponse(`Parallel execution failed: ${error.message}`);
    }
  }

  /**
   * Execute a single test scenario
   */
  private async executeTest(test: TestScenario, defaultTimeout: number): Promise<TestResult> {
    const startTime = Date.now();
    const timeout = test.timeout || defaultTimeout;
    let sessionId: string | undefined;

    try {
      // Create a new session for this test
      sessionId = await sessionManager.createSession(undefined, {
        browserType: test.browserType || 'chromium',
      });

      const session = sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Failed to create session');
      }

      // Execute test with timeout
      await Promise.race([
        this.executeActions(test.actions, session.page),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        ),
      ]);

      const duration = Date.now() - startTime;

      // Close session
      await sessionManager.closeSession(sessionId);

      return {
        name: test.name,
        status: 'passed',
        duration,
        sessionId,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Capture screenshot on failure
      let screenshot: string | undefined;
      if (sessionId) {
        try {
          const session = sessionManager.getSession(sessionId);
          if (session && session.page) {
            const buffer = await session.page.screenshot();
            screenshot = buffer.toString('base64');
          }
          await sessionManager.closeSession(sessionId);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      const isTimeout = error.message.includes('timeout');

      return {
        name: test.name,
        status: isTimeout ? 'timeout' : 'failed',
        duration,
        error: error.message,
        sessionId,
        screenshot,
      };
    }
  }

  /**
   * Execute test actions sequentially
   */
  private async executeActions(actions: TestAction[], page: any): Promise<void> {
    for (const action of actions) {
      // This is a simplified execution - in a real implementation,
      // you would map tool names to actual tool handlers
      await this.executeAction(action, page);
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: TestAction, page: any): Promise<void> {
    const { tool, args } = action;

    // Map common tools to page methods
    switch (tool) {
      case 'navigate':
        await page.goto(args.url);
        break;
      case 'click':
        await page.click(args.selector);
        break;
      case 'fill':
        await page.fill(args.selector, args.value);
        break;
      case 'waitForSelector':
        await page.waitForSelector(args.selector);
        break;
      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  /**
   * Shard tests for distributed execution
   */
  private shardTests(tests: TestScenario[], shardIndex: number, shardTotal: number): TestScenario[] {
    if (shardIndex < 0 || shardIndex >= shardTotal) {
      throw new Error(`Invalid shard index: ${shardIndex} (total: ${shardTotal})`);
    }

    const sharded: TestScenario[] = [];
    for (let i = 0; i < tests.length; i++) {
      if (i % shardTotal === shardIndex) {
        sharded.push(tests[i]);
      }
    }

    return sharded;
  }

  /**
   * Format test results for output
   */
  private formatResults(
    stats: ParallelTestResults,
    shardIndex?: number,
    shardTotal?: number
  ): ToolResponse {
    const output: string[] = [
      `🚀 Parallel Test Execution Results`,
      ``,
    ];

    if (shardIndex !== undefined && shardTotal !== undefined) {
      output.push(`Shard: ${shardIndex + 1}/${shardTotal}`);
      output.push('');
    }

    output.push(`📊 Summary:`);
    output.push(`  Total: ${stats.total}`);
    output.push(`  ✅ Passed: ${stats.passed}`);
    output.push(`  ❌ Failed: ${stats.failed}`);
    output.push(`  ⏭️  Skipped: ${stats.skipped}`);
    output.push(`  ⏱️  Timeout: ${stats.timeout}`);
    output.push(`  Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    output.push('');

    // Show individual results
    output.push('📋 Test Results:');
    stats.results.forEach((result, index) => {
      const icon = result.status === 'passed' ? '✅' :
                   result.status === 'failed' ? '❌' :
                   result.status === 'timeout' ? '⏱️' : '⏭️';

      output.push(`  ${index + 1}. ${icon} ${result.name} (${(result.duration / 1000).toFixed(2)}s)`);

      if (result.error) {
        output.push(`     Error: ${result.error}`);
      }
    });

    return createSuccessResponse(output.join('\n'));
  }
}

/**
 * Run tests across multiple browsers
 */
export class CrossBrowserTestExecutor implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    const {
      test,
      browsers = ['chromium', 'firefox', 'webkit'],
      timeout = 60000,
    } = args;

    if (!test) {
      return createErrorResponse('test parameter is required');
    }

    try {
      const startTime = Date.now();
      const results: Array<{ browser: string; result: TestResult }> = [];

      // Run test in each browser
      const executor = new ParallelTestExecutor();

      const browserTests: TestScenario[] = browsers.map((browser: string) => ({
        name: `${test.name} (${browser})`,
        browserType: browser as any,
        actions: test.actions,
        timeout,
      }));

      const parallelResult = await executor.execute(
        { tests: browserTests, maxConcurrency: browsers.length },
        context
      );

      const output: string[] = [
        `🌐 Cross-Browser Test Results`,
        `Test: ${test.name}`,
        `Browsers: ${browsers.join(', ')}`,
        ``,
      ];

      // Parse results from parallel execution output
      output.push((parallelResult.content[0] as any).text);

      return createSuccessResponse(output.join('\n'));
    } catch (error: any) {
      return createErrorResponse(`Cross-browser execution failed: ${error.message}`);
    }
  }
}
