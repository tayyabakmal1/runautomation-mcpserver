/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import * as path from 'path';
import { CodegenAction, CodegenOptions, CodegenResult, CodegenSession, PlaywrightTestCase } from './types.js';
import { optimizeLocator, deriveLocatorName, getSelectorPriority, OptimizedLocator } from '../../utils/locatorOptimizer.js';

export class PlaywrightGenerator {
  private static readonly DEFAULT_OPTIONS: Required<CodegenOptions> = {
    outputPath: 'tests',
    testNamePrefix: 'MCP',
    includeComments: true,
    language: 'typescript',
    template: 'pom',
  };

  private options: Required<CodegenOptions>;

  constructor(options: CodegenOptions = {}) {
    this.validateOptions(options);
    this.options = { ...PlaywrightGenerator.DEFAULT_OPTIONS, ...options };
  }

  private validateOptions(options: CodegenOptions): void {
    if (options.outputPath && typeof options.outputPath !== 'string') {
      throw new Error('outputPath must be a string');
    }
    if (options.testNamePrefix && typeof options.testNamePrefix !== 'string') {
      throw new Error('testNamePrefix must be a string');
    }
    if (options.includeComments !== undefined && typeof options.includeComments !== 'boolean') {
      throw new Error('includeComments must be a boolean');
    }
    if (options.language !== undefined && options.language !== 'typescript' && options.language !== 'javascript') {
      throw new Error("language must be 'typescript' or 'javascript'");
    }
    if (options.template !== undefined && options.template !== 'plain' && options.template !== 'pom') {
      throw new Error("template must be 'plain' or 'pom'");
    }
  }

  async generateTest(session: CodegenSession): Promise<CodegenResult> {
    if (!session || !Array.isArray(session.actions)) {
      throw new Error('Invalid session data');
    }

    const testCase = this.createTestCase(session);
    const isPom = this.options.template === 'pom';
    const files: { path: string; content: string }[] = [];

    if (isPom) {
      const pageObject = this.generatePageObject(session);
      files.push(pageObject);
    }

    const testCode = isPom
      ? this.generatePomTestCode(testCase)
      : this.generateTestCode(testCase);

    const filePath = this.getOutputFilePath(session);

    if (isPom) {
      const config = this.generatePlaywrightConfig();
      if (config) files.push(config);
    }

    return {
      testCode,
      filePath,
      sessionId: session.id,
      files: files.length ? files : undefined,
    };
  }

  private createTestCase(session: CodegenSession): PlaywrightTestCase {
    const testCase: PlaywrightTestCase = {
      name: `${this.options.testNamePrefix}_${new Date(session.startTime).toISOString().split('T')[0]}`,
      steps: [],
      imports: new Set(['test', 'expect']),
    };

    const isPom = this.options.template === 'pom';

    // Check if any API tools are used to determine fixtures needed
    const hasApiActions = session.actions.some(action =>
      ['playwright_get', 'playwright_post', 'playwright_put', 'playwright_patch', 'playwright_delete'].includes(action.toolName)
    );

    // Store whether API fixtures are needed for later use in test generation
    (testCase as any).hasApiActions = hasApiActions;

    for (const action of session.actions) {
      const step = this.convertActionToStep(action, isPom);
      if (step) {
        testCase.steps.push(step);
      }
    }

    return testCase;
  }

  private convertActionToStep(action: CodegenAction, isPom: boolean): string | null {
    const { toolName, parameters } = action;

    switch (toolName) {
      case 'playwright_navigate':
        return this.generateNavigateStep(parameters, isPom);
      case 'playwright_fill':
        return this.generateFillStep(parameters, isPom);
      case 'playwright_click':
        return this.generateClickStep(parameters, isPom);
      case 'playwright_screenshot':
        return this.generateScreenshotStep(parameters, isPom);
      case 'playwright_expect_response':
        return this.generateExpectResponseStep(parameters, isPom);
      case 'playwright_assert_response':
        return this.generateAssertResponseStep(parameters, isPom);
      case 'playwright_hover':
        return this.generateHoverStep(parameters, isPom);
      case 'playwright_select':
        return this.generateSelectStep(parameters, isPom);
      case 'playwright_custom_user_agent':
        return this.generateCustomUserAgentStep(parameters, isPom);
      case 'playwright_press_key':
        return this.generatePressKeyStep(parameters, isPom);
      case 'playwright_upload_file':
        return this.generateUploadFileStep(parameters, isPom);
      case 'playwright_drag':
        return this.generateDragStep(parameters, isPom);
      case 'playwright_evaluate':
        return this.generateEvaluateStep(parameters, isPom);
      case 'playwright_go_back':
        return this.generateGoBackStep(parameters, isPom);
      case 'playwright_go_forward':
        return this.generateGoForwardStep(parameters, isPom);
      case 'playwright_iframe_click':
        return this.generateIframeClickStep(parameters, isPom);
      case 'playwright_iframe_fill':
        return this.generateIframeFillStep(parameters, isPom);
      case 'playwright_get_visible_text':
        return this.generateGetVisibleTextStep(parameters, isPom);
      case 'playwright_get_visible_html':
        return this.generateGetVisibleHtmlStep(parameters, isPom);
      case 'playwright_click_and_switch_tab':
        return this.generateClickAndSwitchTabStep(parameters, isPom);
      case 'playwright_console_logs':
        return this.generateConsoleLogsStep(parameters, isPom);
      case 'playwright_save_as_pdf':
        return this.generateSaveAsPdfStep(parameters, isPom);
      case 'playwright_get':
        return this.generateApiGetStep(parameters, isPom);
      case 'playwright_post':
        return this.generateApiPostStep(parameters, isPom);
      case 'playwright_put':
        return this.generateApiPutStep(parameters, isPom);
      case 'playwright_patch':
        return this.generateApiPatchStep(parameters, isPom);
      case 'playwright_delete':
        return this.generateApiDeleteStep(parameters, isPom);
      case 'playwright_download_file':
        return this.generateDownloadFileStep(parameters, isPom);
      case 'playwright_copy_to_clipboard':
        return this.generateCopyToClipboardStep(parameters, isPom);
      case 'playwright_read_clipboard':
        return this.generateReadClipboardStep(parameters, isPom);
      case 'playwright_handle_dialog':
        return this.generateHandleDialogStep(parameters, isPom);
      case 'playwright_expect_dialog':
        return this.generateExpectDialogStep(parameters, isPom);
      case 'playwright_drag_to_position':
        return this.generateDragToPositionStep(parameters, isPom);
      case 'playwright_get_element_position':
        return this.generateGetElementPositionStep(parameters, isPom);
      case 'playwright_visual_compare':
        return this.generateVisualCompareStep(parameters, isPom);
      case 'playwright_create_baseline':
        return this.generateCreateBaselineStep(parameters, isPom);
      case 'playwright_batch_visual_compare':
        return this.generateBatchVisualCompareStep(parameters, isPom);
      case 'playwright_run_across_browsers':
        return this.generateRunAcrossBrowsersStep(parameters, isPom);
      case 'playwright_cross_browser_screenshot':
        return this.generateCrossBrowserScreenshotStep(parameters, isPom);
      case 'playwright_emulate_device':
        return this.generateEmulateDeviceStep(parameters, isPom);
      case 'playwright_list_devices':
        return this.generateListDevicesStep(parameters, isPom);
      default:
        console.warn(`Unsupported tool: ${toolName}`);
        return null;
    }
  }

  private generateNavigateStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, waitUntil } = parameters;
    if (isPom) {
      return `await app.goto('${url}');`;
    }
    const options = waitUntil ? `, { waitUntil: '${waitUntil}' }` : '';
    return `
    // Navigate to URL
    await page.goto('${url}'${options});`;
  }

  private generateFillStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector, value } = parameters;
    if (isPom && typeof selector === 'string') {
      const optimized = optimizeLocator(selector);
      const locatorName = deriveLocatorName(optimized);
      return `await app.fillElement(app.${locatorName}, '${value}');`;
    }
    return `
    // Fill input field
    await page.fill('${selector}', '${value}');`;
  }

  private generateClickStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector } = parameters;
    if (isPom && typeof selector === 'string') {
      const optimized = optimizeLocator(selector);
      const locatorName = deriveLocatorName(optimized);
      return `await app.clickElement(app.${locatorName});`;
    }
    return `
    // Click element
    await page.click('${selector}');`;
  }

  private generateScreenshotStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { name, fullPage = false, path } = parameters;
    const options = [];
    if (fullPage) options.push('fullPage: true');
    if (path) options.push(`path: '${path}'`);

    const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
    const pageRef = isPom ? 'app.page' : 'page';
    return `
    // Take screenshot
    await ${pageRef}.screenshot({ path: '${name}.png'${optionsStr} });`;
  }

  private generateExpectResponseStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, id } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';
    return `
    // Wait for response
    const ${id}Response = ${pageRef}.waitForResponse('${url}');`;
  }

  private generateAssertResponseStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { id, value } = parameters;
    const assertion = value
      ? `\n    const responseText = await ${id}Response.text();\n    expect(responseText).toContain('${value}');`
      : `\n    expect(${id}Response.ok()).toBeTruthy();`;
    return `
    // Assert response${assertion}`;
  }

  private generateHoverStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector } = parameters;
    if (isPom && typeof selector === 'string') {
      const optimized = optimizeLocator(selector);
      const locatorName = deriveLocatorName(optimized);
      return `await app.hoverElement(app.${locatorName});`;
    }
    return `
    // Hover over element
    await page.hover('${selector}');`;
  }

  private generateSelectStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector, value } = parameters;
    if (isPom && typeof selector === 'string') {
      const optimized = optimizeLocator(selector);
      const locatorName = deriveLocatorName(optimized);
      return `await app.selectOption(app.${locatorName}, '${value}');`;
    }
    return `
    // Select option
    await page.selectOption('${selector}', '${value}');`;
  }

  private generateCustomUserAgentStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { userAgent } = parameters;
    return `
    // Set custom user agent
    await context.setUserAgent('${userAgent}');`;
  }

  private generatePressKeyStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector, key } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    if (selector) {
      if (isPom && typeof selector === 'string') {
        const optimized = optimizeLocator(selector);
        const locatorName = deriveLocatorName(optimized);
        return `
    // Focus and press key
    await app.${locatorName}.focus();
    await ${pageRef}.keyboard.press('${key}');`;
      }
      return `
    // Focus and press key
    await ${pageRef}.focus('${selector}');
    await ${pageRef}.keyboard.press('${key}');`;
    }
    return `
    // Press key
    await ${pageRef}.keyboard.press('${key}');`;
  }

  private generateUploadFileStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector, filePath } = parameters;
    if (isPom && typeof selector === 'string') {
      const optimized = optimizeLocator(selector);
      const locatorName = deriveLocatorName(optimized);
      return `
    // Upload file
    await app.${locatorName}.setInputFiles('${filePath}');`;
    }
    const pageRef = isPom ? 'app.page' : 'page';
    return `
    // Upload file
    await ${pageRef}.setInputFiles('${selector}', '${filePath}');`;
  }

  private generateDragStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { sourceSelector, targetSelector } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Drag and drop
    await ${pageRef}.dragAndDrop('${sourceSelector}', '${targetSelector}');`;
  }

  private generateEvaluateStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { script } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    // Escape backticks and template literals in the script
    const escapedScript = String(script).replace(/`/g, '\\`').replace(/\$/g, '\\$');

    return `
    // Execute JavaScript
    const result = await ${pageRef}.evaluate(() => {
      ${script}
    });`;
  }

  private generateGoBackStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const pageRef = isPom ? 'app.page' : 'page';
    return `
    // Navigate back
    await ${pageRef}.goBack();`;
  }

  private generateGoForwardStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const pageRef = isPom ? 'app.page' : 'page';
    return `
    // Navigate forward
    await ${pageRef}.goForward();`;
  }

  private generateIframeClickStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { iframeSelector, selector } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Click inside iframe
    const frame = ${pageRef}.frameLocator('${iframeSelector}');
    await frame.locator('${selector}').click();`;
  }

  private generateIframeFillStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { iframeSelector, selector, value } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Fill inside iframe
    const frame = ${pageRef}.frameLocator('${iframeSelector}');
    await frame.locator('${selector}').fill('${value}');`;
  }

  private generateGetVisibleTextStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { maxLength } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Get visible text content
    const visibleText = await ${pageRef}.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const style = window.getComputedStyle(node.parentElement);
            return (style.display !== 'none' && style.visibility !== 'hidden')
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      let text = '';
      let node;
      while ((node = walker.nextNode())) {
        const trimmedText = node.textContent?.trim();
        if (trimmedText) text += trimmedText + '\\n';
      }
      return text.trim();
    });`;
  }

  private generateGetVisibleHtmlStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector, cleanHtml, removeScripts, removeComments, removeStyles, removeMeta } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    if (selector) {
      return `
    // Get HTML content of element
    const htmlContent = await ${pageRef}.locator('${selector}').innerHTML();`;
    }
    return `
    // Get page HTML content
    const htmlContent = await ${pageRef}.content();`;
  }

  private generateClickAndSwitchTabStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Click and switch to new tab
    const [newPage] = await Promise.all([
      ${pageRef}.context().waitForEvent('page'),
      ${pageRef}.click('${selector}')
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    // Note: You may need to update your page reference to newPage`;
  }

  private generateConsoleLogsStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Setup console log listener
    ${pageRef}.on('console', msg => console.log('Browser console:', msg.text()));`;
  }

  private generateSaveAsPdfStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { outputPath, format, printBackground } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    const options = [];
    if (outputPath) options.push(`path: '${outputPath}'`);
    if (format) options.push(`format: '${format}'`);
    if (printBackground) options.push(`printBackground: ${printBackground}`);

    const optionsStr = options.length > 0 ? `{ ${options.join(', ')} }` : '{}';

    return `
    // Save page as PDF
    await ${pageRef}.pdf(${optionsStr});`;
  }

  private generateApiGetStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url } = parameters;

    return `
    // API GET request
    const getResponse = await request.get('${url}');
    expect(getResponse.ok()).toBeTruthy();`;
  }

  private generateApiPostStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, value, token } = parameters;

    const headers = [];
    if (token) headers.push(`'Authorization': 'Bearer ${token}'`);

    const headersStr = headers.length > 0 ? `, headers: { ${headers.join(', ')} }` : '';
    const dataStr = typeof value === 'string' ? value : JSON.stringify(value);

    return `
    // API POST request
    const postResponse = await request.post('${url}', {
      data: ${dataStr}${headersStr}
    });
    expect(postResponse.ok()).toBeTruthy();`;
  }

  private generateApiPutStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, value } = parameters;
    const dataStr = typeof value === 'string' ? value : JSON.stringify(value);

    return `
    // API PUT request
    const putResponse = await request.put('${url}', {
      data: ${dataStr}
    });
    expect(putResponse.ok()).toBeTruthy();`;
  }

  private generateApiPatchStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, value } = parameters;
    const dataStr = typeof value === 'string' ? value : JSON.stringify(value);

    return `
    // API PATCH request
    const patchResponse = await request.patch('${url}', {
      data: ${dataStr}
    });
    expect(patchResponse.ok()).toBeTruthy();`;
  }

  private generateApiDeleteStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url } = parameters;

    return `
    // API DELETE request
    const deleteResponse = await request.delete('${url}');
    expect(deleteResponse.ok()).toBeTruthy();`;
  }

  private generateDownloadFileStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { triggerSelector, savePath, timeout } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Handle file download
    const downloadPromise = ${pageRef}.waitForEvent('download'${timeout ? `, { timeout: ${timeout} }` : ''});
    await ${pageRef}.click('${triggerSelector}');
    const download = await downloadPromise;
    await download.saveAs('${savePath || 'downloads/' + '${download.suggestedFilename()}'}');`;
  }

  private generateCopyToClipboardStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { text } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Copy text to clipboard
    await ${pageRef}.evaluate((textToCopy) => {
      return navigator.clipboard.writeText(textToCopy);
    }, '${text}');`;
  }

  private generateReadClipboardStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Read from clipboard
    const clipboardText = await ${pageRef}.evaluate(() => {
      return navigator.clipboard.readText();
    });`;
  }

  private generateHandleDialogStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { action, promptText } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Set up dialog handler
    ${pageRef}.once('dialog', async (dialog) => {
      await dialog.${action}(${promptText ? `'${promptText}'` : ''});
    });`;
  }

  private generateExpectDialogStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { expectedMessage, action = 'accept', promptText, timeout = 5000 } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Wait for and validate dialog
    const dialog = await ${pageRef}.waitForEvent('dialog', { timeout: ${timeout} });
    expect(dialog.message()).toContain('${expectedMessage}');
    await dialog.${action}(${promptText ? `'${promptText}'` : ''});`;
  }

  private generateDragToPositionStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { sourceSelector, targetX, targetY, steps = 10 } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Drag element to coordinates
    const sourceElement = await ${pageRef}.locator('${sourceSelector}');
    const box = await sourceElement.boundingBox();
    await ${pageRef}.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await ${pageRef}.mouse.down();
    await ${pageRef}.mouse.move(${targetX}, ${targetY}, { steps: ${steps} });
    await ${pageRef}.mouse.up();`;
  }

  private generateGetElementPositionStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { selector } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Get element position
    const elementBox = await ${pageRef}.locator('${selector}').boundingBox();
    const position = {
      x: elementBox.x,
      y: elementBox.y,
      width: elementBox.width,
      height: elementBox.height,
      centerX: elementBox.x + elementBox.width / 2,
      centerY: elementBox.y + elementBox.height / 2
    };`;
  }

  private generateTestCode(testCase: PlaywrightTestCase): string {
    const imports = Array.from(testCase.imports)
      .map(imp => `import { ${imp} } from '@playwright/test';`)
      .join('\n');

    const hasApiActions = (testCase as any).hasApiActions;
    const fixtures = hasApiActions ? '{ page, context, request }' : '{ page, context }';

    return `
${imports}

test('${testCase.name}', async (${fixtures}) => {
  ${testCase.steps.join('\n')}
});`;
  }

  private generatePomTestCode(testCase: PlaywrightTestCase): string {
    const ext = this.options.language === 'typescript' ? 'ts' : 'js';
    const hasApiActions = (testCase as any).hasApiActions;
    const fixtures = hasApiActions ? '{ page, request }' : '{ page }';

    return `
import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage.${ext}';

test('${testCase.name}', async (${fixtures}) => {
  const app = new AppPage(page);
  await app.goto();
${testCase.steps.map(s => '  ' + s.replace(/^\s+/g, '')).join('\n')}
});`;
  }

  private generatePageObject(session: CodegenSession): { path: string; content: string } {
    const ext = this.options.language === 'typescript' ? 'ts' : 'js';
    const pageClassHeader = this.options.language === 'typescript'
      ? `import type { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }
`
      : `export class AppPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }
`;

    // Build optimized locator map from recorded selectors
    const locatorMap = new Map<string, OptimizedLocator>();

    for (const action of session.actions) {
      const params = action.parameters as Record<string, unknown>;
      const selector = typeof params.selector === 'string' ? params.selector : undefined;
      if (selector) {
        const optimized = optimizeLocator(selector);
        const key = deriveLocatorName(optimized);

        // Only keep the highest priority selector for each key
        if (!locatorMap.has(key) ||
            getSelectorPriority(optimized) > getSelectorPriority(locatorMap.get(key)!)) {
          locatorMap.set(key, optimized);
        }
      }
    }

    // Generate getter methods for locators using best practices
    const locatorGetters = Array.from(locatorMap.entries())
      .map(([key, optimized]) => {
        const getterCode = optimized.method === 'locator'
          ? `this.page.locator('${optimized.value}')`
          : `this.page.${optimized.method}('${optimized.value}')`;

        const comment = optimized.original !== optimized.value
          ? `  // Optimized from: ${optimized.original}\n`
          : '';

        const returnType = this.options.language === 'typescript' ? ': Locator' : '';

        return `${comment}  get ${key}()${returnType} {
    return ${getterCode};
  }`;
      })
      .join('\n\n');

    const methods = `
  async goto(url${this.options.language === 'typescript' ? ': string' : ''}) {
    await this.page.goto(url);
  }

  async clickElement(locator${this.options.language === 'typescript' ? ': Locator' : ''}) {
    await locator.click({ timeout: 10000 });
  }

  async fillElement(locator${this.options.language === 'typescript' ? ': Locator' : ''}, value${this.options.language === 'typescript' ? ': string' : ''}) {
    await locator.fill(value);
  }

  async expectVisible(locator${this.options.language === 'typescript' ? ': Locator' : ''}) {
    await locator.waitFor({ state: 'visible', timeout: 10000 });
  }

  async hoverElement(locator${this.options.language === 'typescript' ? ': Locator' : ''}) {
    await locator.hover({ timeout: 10000 });
  }

  async selectOption(locator${this.options.language === 'typescript' ? ': Locator' : ''}, value${this.options.language === 'typescript' ? ': string' : ''}) {
    await locator.selectOption(value);
  }

  async uploadFile(locator${this.options.language === 'typescript' ? ': Locator' : ''}, filePath${this.options.language === 'typescript' ? ': string' : ''}) {
    await locator.setInputFiles(filePath);
  }

  async pressKey(key${this.options.language === 'typescript' ? ': string' : ''}) {
    await this.page.keyboard.press(key);
  }

  async dragAndDrop(sourceSelector${this.options.language === 'typescript' ? ': string' : ''}, targetSelector${this.options.language === 'typescript' ? ': string' : ''}) {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  async goBack() {
    await this.page.goBack();
  }

  async goForward() {
    await this.page.goForward();
  }

  async evaluate(script${this.options.language === 'typescript' ? ': string' : ''}) {
    return await this.page.evaluate(script);
  }
`;

    const content = `${pageClassHeader}
  // Locators using Playwright best practices
  // Priority: data-testid > role > label > placeholder > text > CSS > XPath
${locatorGetters}

  // Page interaction methods
${methods}
}
`;

    const filePath = path.resolve(this.options.outputPath, 'pages', `AppPage.${ext}`);
    return { path: filePath, content };
  }

  private generatePlaywrightConfig(): { path: string; content: string } | null {
    const isTs = this.options.language === 'typescript';
    const filename = isTs ? 'playwright.config.ts' : 'playwright.config.js';
    const base = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '${this.options.outputPath.replace(/\\/g, '/')}',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
});
`;
    return { path: path.resolve(filename), content: base };
  }

  private generateVisualCompareStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { baseline, threshold = 0.1, outputDiff = true, fullPage = false } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Visual comparison
    await ${pageRef}.screenshot({ path: 'current-screenshot.png', fullPage: ${fullPage} });
    // Compare with baseline: ${baseline} (threshold: ${threshold})`;
  }

  private generateCreateBaselineStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { outputPath, selector, fullPage = false } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    if (selector) {
      return `
    // Create baseline screenshot for element
    await ${pageRef}.locator('${selector}').screenshot({ path: '${outputPath}' });`;
    }

    return `
    // Create baseline screenshot
    await ${pageRef}.screenshot({ path: '${outputPath}', fullPage: ${fullPage} });`;
  }

  private generateBatchVisualCompareStep(parameters: Record<string, unknown>, isPom: boolean): string {
    return `
    // Batch visual comparison
    // Multiple screenshots will be compared against their baselines`;
  }

  private generateRunAcrossBrowsersStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, browsers = ['chromium', 'firefox', 'webkit'], action } = parameters;
    const browsersStr = JSON.stringify(browsers);

    return `
    // Cross-browser testing across: ${browsersStr}
    // Note: This requires separate browser instances
    // Current test will run in the configured browser`;
  }

  private generateCrossBrowserScreenshotStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { url, browsers = ['chromium', 'firefox', 'webkit'] } = parameters;

    return `
    // Cross-browser screenshot comparison
    // Screenshots will be captured from: ${JSON.stringify(browsers)}
    // Visual differences will be highlighted`;
  }

  private generateEmulateDeviceStep(parameters: Record<string, unknown>, isPom: boolean): string {
    const { device: deviceName, orientation = 'portrait' } = parameters;
    const pageRef = isPom ? 'app.page' : 'page';

    return `
    // Emulate device: ${deviceName}
    const device = devices['${deviceName}'];
    await ${pageRef}.setViewportSize(device.viewport);`;
  }

  private generateListDevicesStep(parameters: Record<string, unknown>, isPom: boolean): string {
    return `
    // List available devices
    // This is a utility tool - no code generation needed`;
  }

  private getOutputFilePath(session: CodegenSession): string {
    if (!session.id) {
      throw new Error('Session ID is required');
    }

    const ext = this.options.language === 'typescript' ? 'ts' : 'js';
    const sanitizedPrefix = this.options.testNamePrefix.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const fileName = `${sanitizedPrefix}_${session.id}.spec.${ext}`;
    return path.resolve(this.options.outputPath, fileName);
  }
} 