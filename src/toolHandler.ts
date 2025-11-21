/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import type { Browser, Page } from 'playwright';
import { chromium, firefox, webkit, request } from 'playwright';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BROWSER_TOOLS, API_TOOLS } from './tools.js';
import type { ToolContext } from './tools/common/types.js';
import { ActionRecorder } from './tools/codegen/recorder.js';
import { 
  startCodegenSession,
  endCodegenSession,
  getCodegenSession,
  clearCodegenSession
} from './tools/codegen/index.js';
import {
  ScreenshotTool,
  NavigationTool,
  CloseBrowserTool,
  ConsoleLogsTool,
  ExpectResponseTool,
  AssertResponseTool,
  CustomUserAgentTool
} from './tools/browser/index.js';
import {
  ClickTool,
  IframeClickTool,
  FillTool,
  SelectTool,
  HoverTool,
  EvaluateTool,
  IframeFillTool,
  UploadFileTool
} from './tools/browser/interaction.js';
import { 
  VisibleTextTool, 
  VisibleHtmlTool 
} from './tools/browser/visiblePage.js';
import {
  GetRequestTool,
  PostRequestTool,
  PutRequestTool,
  PatchRequestTool,
  DeleteRequestTool
} from './tools/api/requests.js';
import { GoBackTool, GoForwardTool } from './tools/browser/navigation.js';
import { DragTool, PressKeyTool } from './tools/browser/interaction.js';
import { SaveAsPdfTool } from './tools/browser/output.js';
import { ClickAndSwitchTabTool } from './tools/browser/interaction.js';
import {
  DownloadFileTool,
  CopyToClipboardTool,
  ReadClipboardTool,
  HandleDialogTool,
  ExpectDialogTool,
  DragToPositionTool,
  GetElementPositionTool
} from './tools/browser/advancedInteraction.js';
import {
  VisualCompareTool,
  CreateBaselineTool,
  BatchVisualCompareTool
} from './tools/browser/visualTesting.js';
import {
  RunAcrossBrowsersTool,
  CrossBrowserScreenshotTool,
  EmulateDeviceTool,
  ListDevicesTool
} from './tools/browser/crossBrowser.js';
import { CollectLocatorsTool } from './tools/browser/locatorCollector.js';
import {
  CreateSessionTool,
  ListSessionsTool,
  CloseSessionTool,
  SwitchSessionTool,
  GetSessionInfoTool,
  CleanupIdleSessionsTool
} from './tools/session/index.js';
import { sessionManager } from './sessionManager.js';
import {
  ExtractPdfTextTool,
  ValidatePdfContentTool,
  CountPdfPagesTool,
  DownloadAndExtractPdfTool
} from './tools/browser/pdf.js';
import {
  AssertElementStateTool,
  AssertElementCountTool,
  AssertTextContentTool,
  AssertAttributeTool,
  AssertCssPropertyTool,
  AssertRequestMadeTool
} from './tools/browser/assertions.js';
import {
  StartVideoRecordingTool,
  StopVideoRecordingTool,
  AddVideoAnnotationTool,
  ConfigureVideoSettingsTool,
  GetVideoStatusTool
} from './tools/browser/videoRecording.js';

// Global state (maintained for backward compatibility with default session)
let browser: Browser | undefined;
let page: Page | undefined;
let currentBrowserType: 'chromium' | 'firefox' | 'webkit' = 'chromium';

/**
 * Resets browser and page variables
 * Used when browser is closed
 */
export function resetBrowserState() {
  browser = undefined;
  page = undefined;
  currentBrowserType = 'chromium';
}
/**
 * Sets the provided page to the global page variable
 * @param newPage The Page object to set as the global page
 */
export function setGlobalPage(newPage: Page): void {
  page = newPage;
  page.bringToFront();// Bring the new tab to the front
  console.log("Global page has been updated.");
}
// Tool instances
let screenshotTool: ScreenshotTool;
let navigationTool: NavigationTool;
let closeBrowserTool: CloseBrowserTool;
let consoleLogsTool: ConsoleLogsTool;
let clickTool: ClickTool;
let iframeClickTool: IframeClickTool;
let iframeFillTool: IframeFillTool;
let fillTool: FillTool;
let selectTool: SelectTool;
let hoverTool: HoverTool;
let uploadFileTool: UploadFileTool;
let evaluateTool: EvaluateTool;
let expectResponseTool: ExpectResponseTool;
let assertResponseTool: AssertResponseTool;
let customUserAgentTool: CustomUserAgentTool;
let visibleTextTool: VisibleTextTool;
let visibleHtmlTool: VisibleHtmlTool;

let getRequestTool: GetRequestTool;
let postRequestTool: PostRequestTool;
let putRequestTool: PutRequestTool;
let patchRequestTool: PatchRequestTool;
let deleteRequestTool: DeleteRequestTool;

// Add these variables at the top with other tool declarations
let goBackTool: GoBackTool;
let goForwardTool: GoForwardTool;
let dragTool: DragTool;
let pressKeyTool: PressKeyTool;
let saveAsPdfTool: SaveAsPdfTool;
let clickAndSwitchTabTool: ClickAndSwitchTabTool;

// Advanced interaction tools
let downloadFileTool: DownloadFileTool;
let copyToClipboardTool: CopyToClipboardTool;
let readClipboardTool: ReadClipboardTool;
let handleDialogTool: HandleDialogTool;
let expectDialogTool: ExpectDialogTool;
let dragToPositionTool: DragToPositionTool;
let getElementPositionTool: GetElementPositionTool;

// Visual testing tools
let visualCompareTool: VisualCompareTool;
let createBaselineTool: CreateBaselineTool;
let batchVisualCompareTool: BatchVisualCompareTool;

// Cross-browser tools
let runAcrossBrowsersTool: RunAcrossBrowsersTool;
let crossBrowserScreenshotTool: CrossBrowserScreenshotTool;
let emulateDeviceTool: EmulateDeviceTool;
let listDevicesTool: ListDevicesTool;

// Locator collector tool
let collectLocatorsTool: CollectLocatorsTool;

// Session management tools
let createSessionTool: CreateSessionTool;
let listSessionsTool: ListSessionsTool;
let closeSessionTool: CloseSessionTool;
let switchSessionTool: SwitchSessionTool;
let getSessionInfoTool: GetSessionInfoTool;
let cleanupIdleSessionsTool: CleanupIdleSessionsTool;

// PDF testing tools
let extractPdfTextTool: ExtractPdfTextTool;
let validatePdfContentTool: ValidatePdfContentTool;
let countPdfPagesTool: CountPdfPagesTool;
let downloadAndExtractPdfTool: DownloadAndExtractPdfTool;

// Assertion tools
let assertElementStateTool: AssertElementStateTool;
let assertElementCountTool: AssertElementCountTool;
let assertTextContentTool: AssertTextContentTool;
let assertAttributeTool: AssertAttributeTool;
let assertCssPropertyTool: AssertCssPropertyTool;
let assertRequestMadeTool: AssertRequestMadeTool;

// Video recording tools
let startVideoRecordingTool: StartVideoRecordingTool;
let stopVideoRecordingTool: StopVideoRecordingTool;
let addVideoAnnotationTool: AddVideoAnnotationTool;
let configureVideoSettingsTool: ConfigureVideoSettingsTool;
let getVideoStatusTool: GetVideoStatusTool;

interface BrowserSettings {
  viewport?: {
    width?: number;
    height?: number;
  };
  userAgent?: string;
  headless?: boolean;
  browserType?: 'chromium' | 'firefox' | 'webkit';
}

async function registerConsoleMessage(page) {
  page.on("console", (msg) => {
    if (consoleLogsTool) {
      const type = msg.type();
      const text = msg.text();

      // "Unhandled Rejection In Promise" we injected
      if (text.startsWith("[Playwright]")) {
        const payload = text.replace("[Playwright]", "");
        consoleLogsTool.registerConsoleMessage("exception", payload);
      } else {
        consoleLogsTool.registerConsoleMessage(type, text);
      }
    }
  });

  // Uncaught exception
  page.on("pageerror", (error) => {
    if (consoleLogsTool) {
      const message = error.message;
      const stack = error.stack || "";
      consoleLogsTool.registerConsoleMessage("exception", `${message}\n${stack}`);
    }
  });

  // Unhandled rejection in promise
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      const message = typeof reason === "object" && reason !== null
          ? reason.message || JSON.stringify(reason)
          : String(reason);

      const stack = reason?.stack || "";
      // Use console.error get "Unhandled Rejection In Promise"
      console.error(`[Playwright][Unhandled Rejection In Promise] ${message}\n${stack}`);
    });
  });
}

/**
 * Ensures a browser is launched and returns the page
 */
export async function ensureBrowser(browserSettings?: BrowserSettings) {
  try {
    // Check if browser exists but is disconnected
    if (browser && !browser.isConnected()) {
      console.error("Browser exists but is disconnected. Cleaning up...");
      try {
        await browser.close().catch(err => console.error("Error closing disconnected browser:", err));
      } catch (e) {
        // Ignore errors when closing disconnected browser
      }
      // Reset browser and page references
      resetBrowserState();
    }

    // Launch new browser if needed
    if (!browser) {
      const { viewport, userAgent, headless = false, browserType = 'chromium' } = browserSettings ?? {};
      
      // If browser type is changing, force a new browser instance
      if (browser && currentBrowserType !== browserType) {
        try {
          await browser.close().catch(err => console.error("Error closing browser on type change:", err));
        } catch (e) {
          // Ignore errors
        }
        resetBrowserState();
      }
      
      console.error(`Launching new ${browserType} browser instance...`);
      
      // Use the appropriate browser engine
      let browserInstance;
      switch (browserType) {
        case 'firefox':
          browserInstance = firefox;
          break;
        case 'webkit':
          browserInstance = webkit;
          break;
        case 'chromium':
        default:
          browserInstance = chromium;
          break;
      }
      
      const executablePath = process.env.CHROME_EXECUTABLE_PATH;

      browser = await browserInstance.launch({
        headless,
        executablePath: executablePath
      });
      
      currentBrowserType = browserType;

      // Add cleanup logic when browser is disconnected
      browser.on('disconnected', () => {
        console.error("Browser disconnected event triggered");
        browser = undefined;
        page = undefined;
      });

      const context = await browser.newContext({
        ...userAgent && { userAgent },
        viewport: {
          width: viewport?.width ?? 1280,
          height: viewport?.height ?? 720,
        },
        deviceScaleFactor: 1,
      });

      page = await context.newPage();

      // Register console message handler
      await registerConsoleMessage(page);
    }
    
    // Verify page is still valid
    if (!page || page.isClosed()) {
      console.error("Page is closed or invalid. Creating new page...");
      // Create a new page if the current one is invalid
      const context = browser.contexts()[0] || await browser.newContext();
      page = await context.newPage();
      
      // Re-register console message handler
      await registerConsoleMessage(page);
    }
    
    return page!;
  } catch (error) {
    console.error("Error ensuring browser:", error);
    // If something went wrong, clean up completely and retry once
    try {
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    resetBrowserState();
    
    // Try one more time from scratch
    const { viewport, userAgent, headless = false, browserType = 'chromium' } = browserSettings ?? {};
    
    // Use the appropriate browser engine
    let browserInstance;
    switch (browserType) {
      case 'firefox':
        browserInstance = firefox;
        break;
      case 'webkit':
        browserInstance = webkit;
        break;
      case 'chromium':
      default:
        browserInstance = chromium;
        break;
    }
    
    browser = await browserInstance.launch({ headless });
    currentBrowserType = browserType;
    
    browser.on('disconnected', () => {
      console.error("Browser disconnected event triggered (retry)");
      browser = undefined;
      page = undefined;
    });

    const context = await browser.newContext({
      ...userAgent && { userAgent },
      viewport: {
        width: viewport?.width ?? 1280,
        height: viewport?.height ?? 720,
      },
      deviceScaleFactor: 1,
    });

    page = await context.newPage();
    
    await registerConsoleMessage(page);
    
    return page!;
  }
}

/**
 * Creates a new API request context
 */
async function ensureApiContext(url: string) {
  return await request.newContext({
    baseURL: url,
  });
}

/**
 * Initialize all tool instances
 */
function initializeTools(server: any) {
  // Browser tools
  if (!screenshotTool) screenshotTool = new ScreenshotTool(server);
  if (!navigationTool) navigationTool = new NavigationTool(server);
  if (!closeBrowserTool) closeBrowserTool = new CloseBrowserTool(server);
  if (!consoleLogsTool) consoleLogsTool = new ConsoleLogsTool(server);
  if (!clickTool) clickTool = new ClickTool(server);
  if (!iframeClickTool) iframeClickTool = new IframeClickTool(server);
  if (!iframeFillTool) iframeFillTool = new IframeFillTool(server);
  if (!fillTool) fillTool = new FillTool(server);
  if (!selectTool) selectTool = new SelectTool(server);
  if (!hoverTool) hoverTool = new HoverTool(server);
  if (!uploadFileTool) uploadFileTool = new UploadFileTool(server);
  if (!evaluateTool) evaluateTool = new EvaluateTool(server);
  if (!expectResponseTool) expectResponseTool = new ExpectResponseTool(server);
  if (!assertResponseTool) assertResponseTool = new AssertResponseTool(server);
  if (!customUserAgentTool) customUserAgentTool = new CustomUserAgentTool(server);
  if (!visibleTextTool) visibleTextTool = new VisibleTextTool(server);
  if (!visibleHtmlTool) visibleHtmlTool = new VisibleHtmlTool(server);
  
  // API tools
  if (!getRequestTool) getRequestTool = new GetRequestTool(server);
  if (!postRequestTool) postRequestTool = new PostRequestTool(server);
  if (!putRequestTool) putRequestTool = new PutRequestTool(server);
  if (!patchRequestTool) patchRequestTool = new PatchRequestTool(server);
  if (!deleteRequestTool) deleteRequestTool = new DeleteRequestTool(server);

  // Initialize new tools
  if (!goBackTool) goBackTool = new GoBackTool(server);
  if (!goForwardTool) goForwardTool = new GoForwardTool(server);
  if (!dragTool) dragTool = new DragTool(server);
  if (!pressKeyTool) pressKeyTool = new PressKeyTool(server);
  if (!saveAsPdfTool) saveAsPdfTool = new SaveAsPdfTool(server);
  if (!clickAndSwitchTabTool) clickAndSwitchTabTool = new ClickAndSwitchTabTool(server);

  // Initialize advanced interaction tools
  if (!downloadFileTool) downloadFileTool = new DownloadFileTool(server);
  if (!copyToClipboardTool) copyToClipboardTool = new CopyToClipboardTool(server);
  if (!readClipboardTool) readClipboardTool = new ReadClipboardTool(server);
  if (!handleDialogTool) handleDialogTool = new HandleDialogTool(server);
  if (!expectDialogTool) expectDialogTool = new ExpectDialogTool(server);
  if (!dragToPositionTool) dragToPositionTool = new DragToPositionTool(server);
  if (!getElementPositionTool) getElementPositionTool = new GetElementPositionTool(server);

  // Initialize visual testing tools
  if (!visualCompareTool) visualCompareTool = new VisualCompareTool(server);
  if (!createBaselineTool) createBaselineTool = new CreateBaselineTool(server);
  if (!batchVisualCompareTool) batchVisualCompareTool = new BatchVisualCompareTool(server);

  // Initialize cross-browser tools
  if (!runAcrossBrowsersTool) runAcrossBrowsersTool = new RunAcrossBrowsersTool(server);
  if (!crossBrowserScreenshotTool) crossBrowserScreenshotTool = new CrossBrowserScreenshotTool(server);
  if (!emulateDeviceTool) emulateDeviceTool = new EmulateDeviceTool(server);
  if (!listDevicesTool) listDevicesTool = new ListDevicesTool(server);

  // Initialize locator collector tool
  if (!collectLocatorsTool) collectLocatorsTool = new CollectLocatorsTool(server);

  // Initialize session management tools
  if (!createSessionTool) createSessionTool = new CreateSessionTool();
  if (!listSessionsTool) listSessionsTool = new ListSessionsTool();
  if (!closeSessionTool) closeSessionTool = new CloseSessionTool();
  if (!switchSessionTool) switchSessionTool = new SwitchSessionTool();
  if (!getSessionInfoTool) getSessionInfoTool = new GetSessionInfoTool();
  if (!cleanupIdleSessionsTool) cleanupIdleSessionsTool = new CleanupIdleSessionsTool();

  // Initialize PDF testing tools
  if (!extractPdfTextTool) extractPdfTextTool = new ExtractPdfTextTool(server);
  if (!validatePdfContentTool) validatePdfContentTool = new ValidatePdfContentTool(server);
  if (!countPdfPagesTool) countPdfPagesTool = new CountPdfPagesTool(server);
  if (!downloadAndExtractPdfTool) downloadAndExtractPdfTool = new DownloadAndExtractPdfTool(server);

  // Initialize assertion tools
  if (!assertElementStateTool) assertElementStateTool = new AssertElementStateTool(server);
  if (!assertElementCountTool) assertElementCountTool = new AssertElementCountTool(server);
  if (!assertTextContentTool) assertTextContentTool = new AssertTextContentTool(server);
  if (!assertAttributeTool) assertAttributeTool = new AssertAttributeTool(server);
  if (!assertCssPropertyTool) assertCssPropertyTool = new AssertCssPropertyTool(server);
  if (!assertRequestMadeTool) assertRequestMadeTool = new AssertRequestMadeTool(server);

  // Initialize video recording tools
  if (!startVideoRecordingTool) startVideoRecordingTool = new StartVideoRecordingTool(server);
  if (!stopVideoRecordingTool) stopVideoRecordingTool = new StopVideoRecordingTool(server);
  if (!addVideoAnnotationTool) addVideoAnnotationTool = new AddVideoAnnotationTool(server);
  if (!configureVideoSettingsTool) configureVideoSettingsTool = new ConfigureVideoSettingsTool(server);
  if (!getVideoStatusTool) getVideoStatusTool = new GetVideoStatusTool(server);
}

/**
 * Main handler for tool calls
 */
export async function handleToolCall(
  name: string,
  args: any,
  server: any
): Promise<CallToolResult> {
  // Initialize tools
  initializeTools(server);

  try {
    // Handle codegen tools
    switch (name) {
      case 'start_codegen_session':
        return await handleCodegenResult(startCodegenSession.handler(args));
      case 'end_codegen_session':
        return await handleCodegenResult(endCodegenSession.handler(args));
      case 'get_codegen_session':
        return await handleCodegenResult(getCodegenSession.handler(args));
      case 'clear_codegen_session':
        return await handleCodegenResult(clearCodegenSession.handler(args));
    }

    // Handle session management tools (don't require browser or API context)
    const sessionContext: ToolContext = { page, browser, apiContext: undefined, server };
    switch (name) {
      case 'create_browser_session':
        return await createSessionTool.execute(args, sessionContext);
      case 'list_browser_sessions':
        return await listSessionsTool.execute(args, sessionContext);
      case 'close_browser_session':
        return await closeSessionTool.execute(args, sessionContext);
      case 'switch_browser_session':
        return await switchSessionTool.execute(args, sessionContext);
      case 'get_session_info':
        return await getSessionInfoTool.execute(args, sessionContext);
      case 'cleanup_idle_sessions':
        return await cleanupIdleSessionsTool.execute(args, sessionContext);
    }

    // Record tool action if there's an active session
    const recorder = ActionRecorder.getInstance();
    const activeSession = recorder.getActiveSession();
    if (activeSession && name !== 'playwright_close') {
      recorder.recordAction(name, args);
    }

    // Special case for browser close to ensure it always works
    if (name === "playwright_close") {
      if (browser) {
        try {
          if (browser.isConnected()) {
            await browser.close().catch(e => console.error("Error closing browser:", e));
          }
        } catch (error) {
          console.error("Error during browser close in handler:", error);
        } finally {
          resetBrowserState();
        }
        return {
          content: [{
            type: "text",
            text: "Browser closed successfully",
          }],
          isError: false,
        };
      }
      return {
        content: [{
          type: "text",
          text: "No browser instance to close",
        }],
        isError: false,
      };
    }

    // Check if we have a disconnected browser that needs cleanup
    if (browser && !browser.isConnected() && BROWSER_TOOLS.includes(name)) {
      console.error("Detected disconnected browser before tool execution, cleaning up...");
      try {
        await browser.close().catch(() => {}); // Ignore errors
      } catch (e) {
        // Ignore any errors during cleanup
      }
      resetBrowserState();
    }

  // Prepare context based on tool requirements
  const context: ToolContext = {
    server
  };
  
  // Set up browser if needed
  if (BROWSER_TOOLS.includes(name)) {
    const browserSettings = {
      viewport: {
        width: args.width,
        height: args.height
      },
      userAgent: name === "playwright_custom_user_agent" ? args.userAgent : undefined,
      headless: args.headless,
      browserType: args.browserType || 'chromium'
    };
    
    try {
      context.page = await ensureBrowser(browserSettings);
      context.browser = browser;
    } catch (error) {
      console.error("Failed to ensure browser:", error);
      return {
        content: [{
          type: "text",
          text: `Failed to initialize browser: ${(error as Error).message}. Please try again.`,
        }],
        isError: true,
      };
    }
  }

    // Set up API context if needed
    if (API_TOOLS.includes(name)) {
      try {
        context.apiContext = await ensureApiContext(args.url);
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to initialize API context: ${(error as Error).message}`,
          }],
          isError: true,
        };
      }
    }

    // Route to appropriate tool
    switch (name) {
      // Browser tools
      case "playwright_navigate":
        return await navigationTool.execute(args, context);

      case "playwright_screenshot":
        return await screenshotTool.execute(args, context);
        
      case "playwright_close":
        return await closeBrowserTool.execute(args, context);
        
      case "playwright_console_logs":
        return await consoleLogsTool.execute(args, context);
        
      case "playwright_click":
        return await clickTool.execute(args, context);
        
      case "playwright_iframe_click":
        return await iframeClickTool.execute(args, context);

      case "playwright_iframe_fill":
        return await iframeFillTool.execute(args, context);
        
      case "playwright_fill":
        return await fillTool.execute(args, context);
        
      case "playwright_select":
        return await selectTool.execute(args, context);
        
      case "playwright_hover":
        return await hoverTool.execute(args, context);

      case "playwright_upload_file":
        return await uploadFileTool.execute(args, context);
        
      case "playwright_evaluate":
        return await evaluateTool.execute(args, context);

      case "playwright_expect_response":
        return await expectResponseTool.execute(args, context);

      case "playwright_assert_response":
        return await assertResponseTool.execute(args, context);

      case "playwright_custom_user_agent":
        return await customUserAgentTool.execute(args, context);
        
      case "playwright_get_visible_text":
        return await visibleTextTool.execute(args, context);
      
      case "playwright_get_visible_html":
        return await visibleHtmlTool.execute(args, context);
        
      // API tools
      case "playwright_get":
        return await getRequestTool.execute(args, context);
        
      case "playwright_post":
        return await postRequestTool.execute(args, context);
        
      case "playwright_put":
        return await putRequestTool.execute(args, context);
        
      case "playwright_patch":
        return await patchRequestTool.execute(args, context);
        
      case "playwright_delete":
        return await deleteRequestTool.execute(args, context);
      
      // New tools
      case "playwright_go_back":
        return await goBackTool.execute(args, context);
      case "playwright_go_forward":
        return await goForwardTool.execute(args, context);
      case "playwright_drag":
        return await dragTool.execute(args, context);
      case "playwright_press_key":
        return await pressKeyTool.execute(args, context);
      case "playwright_save_as_pdf":
        return await saveAsPdfTool.execute(args, context);
      case "playwright_click_and_switch_tab":
        return await clickAndSwitchTabTool.execute(args, context);

      // Advanced interaction tools
      case "playwright_download_file":
        return await downloadFileTool.execute(args, context);
      case "playwright_copy_to_clipboard":
        return await copyToClipboardTool.execute(args, context);
      case "playwright_read_clipboard":
        return await readClipboardTool.execute(args, context);
      case "playwright_handle_dialog":
        return await handleDialogTool.execute(args, context);
      case "playwright_expect_dialog":
        return await expectDialogTool.execute(args, context);
      case "playwright_drag_to_position":
        return await dragToPositionTool.execute(args, context);
      case "playwright_get_element_position":
        return await getElementPositionTool.execute(args, context);

      // Visual testing tools
      case "playwright_visual_compare":
        return await visualCompareTool.execute(args, context);
      case "playwright_create_baseline":
        return await createBaselineTool.execute(args, context);
      case "playwright_batch_visual_compare":
        return await batchVisualCompareTool.execute(args, context);

      // Cross-browser tools
      case "playwright_run_across_browsers":
        return await runAcrossBrowsersTool.execute(args, context);
      case "playwright_cross_browser_screenshot":
        return await crossBrowserScreenshotTool.execute(args, context);
      case "playwright_emulate_device":
        return await emulateDeviceTool.execute(args, context);
      case "playwright_list_devices":
        return await listDevicesTool.execute(args, context);

      // Locator collector tool
      case "playwright_collect_locators":
        return await collectLocatorsTool.execute(args, context);

      // PDF testing tools
      case "playwright_extract_pdf_text":
        return await extractPdfTextTool.execute(args, context);
      case "playwright_validate_pdf_content":
        return await validatePdfContentTool.execute(args, context);
      case "playwright_count_pdf_pages":
        return await countPdfPagesTool.execute(args, context);
      case "playwright_download_and_extract_pdf":
        return await downloadAndExtractPdfTool.execute(args, context);

      // Assertion tools
      case "playwright_assert_element_state":
        return await assertElementStateTool.execute(args, context);
      case "playwright_assert_element_count":
        return await assertElementCountTool.execute(args, context);
      case "playwright_assert_text_content":
        return await assertTextContentTool.execute(args, context);
      case "playwright_assert_attribute":
        return await assertAttributeTool.execute(args, context);
      case "playwright_assert_css_property":
        return await assertCssPropertyTool.execute(args, context);
      case "playwright_assert_request_made":
        return await assertRequestMadeTool.execute(args, context);

      // Video recording tools
      case "playwright_start_video_recording":
        return await startVideoRecordingTool.execute(args, context);
      case "playwright_stop_video_recording":
        return await stopVideoRecordingTool.execute(args, context);
      case "playwright_add_video_annotation":
        return await addVideoAnnotationTool.execute(args, context);
      case "playwright_configure_video_settings":
        return await configureVideoSettingsTool.execute(args, context);
      case "playwright_get_video_status":
        return await getVideoStatusTool.execute(args, context);

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    console.error(`Error handling tool ${name}:`, error);
    
    // Handle browser-specific errors at the top level
    if (BROWSER_TOOLS.includes(name)) {
      const errorMessage = (error as Error).message;
      if (
        errorMessage.includes("Target page, context or browser has been closed") || 
        errorMessage.includes("Browser has been disconnected") ||
        errorMessage.includes("Target closed") ||
        errorMessage.includes("Protocol error") ||
        errorMessage.includes("Connection closed")
      ) {
        // Reset browser state if it's a connection issue
        resetBrowserState();
        return {
          content: [{
            type: "text",
            text: `Browser connection error: ${errorMessage}. Browser state has been reset, please try again.`,
          }],
          isError: true,
        };
      }
    }

    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
      isError: true,
    };
  }
}

/**
 * Helper function to handle codegen tool results
 */
async function handleCodegenResult(resultPromise: Promise<any>): Promise<CallToolResult> {
  try {
    const result = await resultPromise;
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result),
      }],
      isError: false,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: error instanceof Error ? error.message : String(error),
      }],
      isError: true,
    };
  }
}

/**
 * Get console logs
 */
export function getConsoleLogs(): string[] {
  return consoleLogsTool?.getConsoleLogs() ?? [];
}

/**
 * Get screenshots
 */
export function getScreenshots(): Map<string, string> {
  return screenshotTool?.getScreenshots() ?? new Map();
}

export { registerConsoleMessage };
