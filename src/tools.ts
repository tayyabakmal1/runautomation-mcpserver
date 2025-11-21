/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export function createToolDefinitions() {
  return [
    // Codegen tools
    {
      name: "start_codegen_session",
      description: "Start a new code generation session to record Playwright actions",
      inputSchema: {
        type: "object",
        properties: {
          options: {
            type: "object",
            description: "Code generation options",
            properties: {
              outputPath: { 
                type: "string", 
                description: "Directory path where generated tests will be saved (use absolute path)" 
              },
              testNamePrefix: { 
                type: "string", 
                description: "Prefix to use for generated test names (default: 'GeneratedTest')" 
              },
              includeComments: { 
                type: "boolean", 
                description: "Whether to include descriptive comments in generated tests" 
              },
              language: {
                type: "string",
                description: "Programming language for generated tests (default: 'typescript')",
                enum: ["typescript", "javascript"]
              },
              template: {
                type: "string",
                description: "Test generation template/style (e.g., 'plain' or 'pom' for Page Object Model)",
                enum: ["plain", "pom"]
              }
            },
            required: ["outputPath"]
          }
        },
        required: ["options"]
      }
    },
    {
      name: "end_codegen_session",
      description: "End a code generation session and generate the test file",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to end" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "get_codegen_session",
      description: "Get information about a code generation session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to retrieve" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "clear_codegen_session",
      description: "Clear a code generation session without generating a test",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { 
            type: "string", 
            description: "ID of the session to clear" 
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "playwright_navigate",
      description: "Navigate to a URL",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to navigate to the website specified" },
          browserType: { type: "string", description: "Browser type to use (chromium, firefox, webkit). Defaults to chromium", enum: ["chromium", "firefox", "webkit"] },
          width: { type: "number", description: "Viewport width in pixels (default: 1280)" },
          height: { type: "number", description: "Viewport height in pixels (default: 720)" },
          timeout: { type: "number", description: "Navigation timeout in milliseconds" },
          waitUntil: { type: "string", description: "Navigation wait condition" },
          headless: { type: "boolean", description: "Run browser in headless mode (default: false)" }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_screenshot",
      description: "Take a screenshot of the current page or a specific element",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the screenshot" },
          selector: { type: "string", description: "CSS selector for element to screenshot" },
          width: { type: "number", description: "Width in pixels (default: 800)" },
          height: { type: "number", description: "Height in pixels (default: 600)" },
          storeBase64: { type: "boolean", description: "Store screenshot in base64 format (default: true)" },
          fullPage: { type: "boolean", description: "Store screenshot of the entire page (default: false)" },
          savePng: { type: "boolean", description: "Save screenshot as PNG file (default: false)" },
          downloadsDir: { type: "string", description: "Custom downloads directory path (default: user's Downloads folder)" },
        },
        required: ["name"],
      },
    },
    {
      name: "playwright_click",
      description: "Click an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the element to click" },
        },
        required: ["selector"],
      },
    },
    {
      name: "playwright_iframe_click",
      description: "Click an element in an iframe on the page",
      inputSchema: {
        type: "object",
        properties: {
          iframeSelector: { type: "string", description: "CSS selector for the iframe containing the element to click" },
          selector: { type: "string", description: "CSS selector for the element to click" },
        },
        required: ["iframeSelector", "selector"],
      },
    },
    {
      name: "playwright_iframe_fill",
      description: "Fill an element in an iframe on the page",
      inputSchema: {
        type: "object",
        properties: {
          iframeSelector: { type: "string", description: "CSS selector for the iframe containing the element to fill" },
          selector: { type: "string", description: "CSS selector for the element to fill" },
          value: { type: "string", description: "Value to fill" },
        },
        required: ["iframeSelector", "selector", "value"],
      },
    },
    {
      name: "playwright_fill",
      description: "fill out an input field",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for input field" },
          value: { type: "string", description: "Value to fill" },
        },
        required: ["selector", "value"],
      },
    },
    {
      name: "playwright_select",
      description: "Select an element on the page with Select tag",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to select" },
          value: { type: "string", description: "Value to select" },
        },
        required: ["selector", "value"],
      },
    },
    {
      name: "playwright_hover",
      description: "Hover an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for element to hover" },
        },
        required: ["selector"],
      },
    },
    {
      name: "playwright_upload_file",
      description: "Upload a file to an input[type='file'] element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the file input element" },
          filePath: { type: "string", description: "Absolute path to the file to upload" }
        },
        required: ["selector", "filePath"],
      },
    },
    {
      name: "playwright_evaluate",
      description: "Execute JavaScript in the browser console",
      inputSchema: {
        type: "object",
        properties: {
          script: { type: "string", description: "JavaScript code to execute" },
        },
        required: ["script"],
      },
    },
    {
      name: "playwright_console_logs",
      description: "Retrieve console logs from the browser with filtering options",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of logs to retrieve (all, error, warning, log, info, debug, exception)",
            enum: ["all", "error", "warning", "log", "info", "debug", "exception"]
          },
          search: {
            type: "string",
            description: "Text to search for in logs (handles text with square brackets)"
          },
          limit: {
            type: "number",
            description: "Maximum number of logs to return"
          },
          clear: {
            type: "boolean",
            description: "Whether to clear logs after retrieval (default: false)"
          }
        },
        required: [],
      },
    },
    {
      name: "playwright_close",
      description: "Close the browser and release all resources",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_get",
      description: "Perform an HTTP GET request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform GET operation" }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_post",
      description: "Perform an HTTP POST request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform POST operation" },
          value: { type: "string", description: "Data to post in the body" },
          token: { type: "string", description: "Bearer token for authorization" },
          headers: { 
            type: "object", 
            description: "Additional headers to include in the request",
            additionalProperties: { type: "string" }
          }
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_put",
      description: "Perform an HTTP PUT request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform PUT operation" },
          value: { type: "string", description: "Data to PUT in the body" },
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_patch",
      description: "Perform an HTTP PATCH request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform PUT operation" },
          value: { type: "string", description: "Data to PATCH in the body" },
        },
        required: ["url", "value"],
      },
    },
    {
      name: "playwright_delete",
      description: "Perform an HTTP DELETE request",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to perform DELETE operation" }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_expect_response",
      description: "Ask Playwright to start waiting for a HTTP response. This tool initiates the wait operation but does not wait for its completion.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique & arbitrary identifier to be used for retrieving this response later with `Playwright_assert_response`." },
          url: { type: "string", description: "URL pattern to match in the response." }
        },
        required: ["id", "url"],
      },
    },
    {
      name: "playwright_assert_response",
      description: "Wait for and validate a previously initiated HTTP response wait operation.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string", description: "Identifier of the HTTP response initially expected using `Playwright_expect_response`." },
          value: { type: "string", description: "Data to expect in the body of the HTTP response. If provided, the assertion will fail if this value is not found in the response body." }
        },
        required: ["id"],
      },
    },
    {
      name: "playwright_custom_user_agent",
      description: "Set a custom User Agent for the browser",
      inputSchema: {
        type: "object",
        properties: {
          userAgent: { type: "string", description: "Custom User Agent for the Playwright browser instance" }
        },
        required: ["userAgent"],
      },
    },
    {
      name: "playwright_get_visible_text",
      description: "Get the visible text content of the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_get_visible_html",
      description: "Get the HTML content of the current page. By default, all <script> tags are removed from the output unless removeScripts is explicitly set to false.",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector to limit the HTML to a specific container" },
          removeScripts: { type: "boolean", description: "Remove all script tags from the HTML (default: true)" },
          removeComments: { type: "boolean", description: "Remove all HTML comments (default: false)" },
          removeStyles: { type: "boolean", description: "Remove all style tags from the HTML (default: false)" },
          removeMeta: { type: "boolean", description: "Remove all meta tags from the HTML (default: false)" },
          cleanHtml: { type: "boolean", description: "Perform comprehensive HTML cleaning (default: false)" },
          minify: { type: "boolean", description: "Minify the HTML output (default: false)" },
          maxLength: { type: "number", description: "Maximum number of characters to return (default: 20000)" }
        },
        required: [],
      },
    },
    {
      name: "playwright_go_back",
      description: "Navigate back in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_go_forward",
      description: "Navigate forward in browser history",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_drag",
      description: "Drag an element to a target location",
      inputSchema: {
        type: "object",
        properties: {
          sourceSelector: { type: "string", description: "CSS selector for the element to drag" },
          targetSelector: { type: "string", description: "CSS selector for the target location" }
        },
        required: ["sourceSelector", "targetSelector"],
      },
    },
    {
      name: "playwright_press_key",
      description: "Press a keyboard key",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Key to press (e.g. 'Enter', 'ArrowDown', 'a')" },
          selector: { type: "string", description: "Optional CSS selector to focus before pressing key" }
        },
        required: ["key"],
      },
    },
    {
      name: "playwright_save_as_pdf",
      description: "Save the current page as a PDF file",
      inputSchema: {
        type: "object",
        properties: {
          outputPath: { type: "string", description: "Directory path where PDF will be saved" },
          filename: { type: "string", description: "Name of the PDF file (default: page.pdf)" },
          format: { type: "string", description: "Page format (e.g. 'A4', 'Letter')" },
          printBackground: { type: "boolean", description: "Whether to print background graphics" },
          margin: {
            type: "object",
            description: "Page margins",
            properties: {
              top: { type: "string" },
              right: { type: "string" },
              bottom: { type: "string" },
              left: { type: "string" }
            }
          }
        },
        required: ["outputPath"],
      },
    },
    {
      name: "playwright_click_and_switch_tab",
      description: "Click a link and switch to the newly opened tab",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "CSS selector for the link to click" },
        },
        required: ["selector"],
      },
    },
    {
      name: "playwright_download_file",
      description: "Handle file downloads triggered by clicking an element. Waits for download to complete and saves the file.",
      inputSchema: {
        type: "object",
        properties: {
          triggerSelector: {
            type: "string",
            description: "CSS selector for the element that triggers the download (e.g., download button)"
          },
          expectedFileName: {
            type: "string",
            description: "Expected filename for validation (optional)"
          },
          savePath: {
            type: "string",
            description: "Path where file should be saved (default: downloads/<filename>)"
          },
          timeout: {
            type: "number",
            description: "Maximum time to wait for download in milliseconds (default: 30000)"
          }
        },
        required: ["triggerSelector"],
      },
    },
    {
      name: "playwright_copy_to_clipboard",
      description: "Copy text to the browser clipboard using the Clipboard API",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to copy to clipboard"
          }
        },
        required: ["text"],
      },
    },
    {
      name: "playwright_read_clipboard",
      description: "Read text from the browser clipboard using the Clipboard API",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "playwright_handle_dialog",
      description: "Set up a handler for the next browser dialog (alert, confirm, or prompt). The handler will be called when a dialog appears.",
      inputSchema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            description: "Action to take on dialog: 'accept' or 'dismiss'",
            enum: ["accept", "dismiss"]
          },
          promptText: {
            type: "string",
            description: "Text to enter for prompt dialogs (only used with action: 'accept')"
          }
        },
        required: ["action"],
      },
    },
    {
      name: "playwright_expect_dialog",
      description: "Wait for a dialog to appear, validate its message, and handle it. Useful for testing alert/confirm/prompt dialogs.",
      inputSchema: {
        type: "object",
        properties: {
          expectedMessage: {
            type: "string",
            description: "Expected dialog message text"
          },
          action: {
            type: "string",
            description: "Action to take: 'accept' or 'dismiss' (default: 'accept')",
            enum: ["accept", "dismiss"]
          },
          promptText: {
            type: "string",
            description: "Text to enter for prompt dialogs"
          },
          exactMatch: {
            type: "boolean",
            description: "Whether to match the message exactly or just check if it contains the expected text (default: true)"
          },
          timeout: {
            type: "number",
            description: "Maximum time to wait for dialog in milliseconds (default: 5000)"
          }
        },
        required: ["expectedMessage"],
      },
    },
    {
      name: "playwright_drag_to_position",
      description: "Drag an element to specific coordinates on the page with smooth animation",
      inputSchema: {
        type: "object",
        properties: {
          sourceSelector: {
            type: "string",
            description: "CSS selector for the element to drag"
          },
          targetX: {
            type: "number",
            description: "Target X coordinate (pixels from left edge)"
          },
          targetY: {
            type: "number",
            description: "Target Y coordinate (pixels from top edge)"
          },
          steps: {
            type: "number",
            description: "Number of intermediate steps for smooth animation (default: 10)"
          }
        },
        required: ["sourceSelector", "targetX", "targetY"],
      },
    },
    {
      name: "playwright_get_element_position",
      description: "Get the position and dimensions of an element on the page",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element"
          }
        },
        required: ["selector"],
      },
    },
    {
      name: "playwright_visual_compare",
      description: "Compare a screenshot against a baseline image for visual regression testing. Detects pixel differences and generates diff images.",
      inputSchema: {
        type: "object",
        properties: {
          baseline: {
            type: "string",
            description: "Path to baseline screenshot (PNG). If doesn't exist, current screenshot will be saved as baseline."
          },
          current: {
            type: "string",
            description: "Path to current screenshot to compare (optional if captureScreenshot is true)"
          },
          threshold: {
            type: "number",
            description: "Pixel difference tolerance (0-1). Default: 0.1 (10% difference allowed)"
          },
          outputDiff: {
            type: "boolean",
            description: "Generate a diff image showing differences (default: true)"
          },
          diffOutputPath: {
            type: "string",
            description: "Custom path for diff image (default: baseline path with '-diff' suffix)"
          },
          regions: {
            type: "array",
            description: "Array of regions to compare (optional). Compare specific elements instead of full page.",
            items: {
              type: "object",
              properties: {
                selector: {
                  type: "string",
                  description: "CSS selector for the region to compare"
                }
              }
            }
          },
          captureScreenshot: {
            type: "boolean",
            description: "Capture a new screenshot for comparison (default: true)"
          },
          fullPage: {
            type: "boolean",
            description: "Capture full page screenshot if captureScreenshot is true (default: false)"
          }
        },
        required: ["baseline"],
      },
    },
    {
      name: "playwright_create_baseline",
      description: "Create a baseline screenshot for visual regression testing",
      inputSchema: {
        type: "object",
        properties: {
          outputPath: {
            type: "string",
            description: "Path where baseline screenshot will be saved (must be PNG)"
          },
          selector: {
            type: "string",
            description: "CSS selector to capture specific element (optional)"
          },
          fullPage: {
            type: "boolean",
            description: "Capture full page (default: false, captures viewport only)"
          },
          overwrite: {
            type: "boolean",
            description: "Overwrite existing baseline if it exists (default: false)"
          }
        },
        required: ["outputPath"],
      },
    },
    {
      name: "playwright_batch_visual_compare",
      description: "Compare multiple screenshots against their baselines in a single operation. Useful for comprehensive visual regression testing.",
      inputSchema: {
        type: "object",
        properties: {
          comparisons: {
            type: "array",
            description: "Array of comparisons to perform",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name for this comparison (for reporting)"
                },
                baseline: {
                  type: "string",
                  description: "Path to baseline screenshot"
                },
                current: {
                  type: "string",
                  description: "Path to current screenshot"
                }
              },
              required: ["baseline", "current"]
            }
          },
          threshold: {
            type: "number",
            description: "Pixel difference tolerance for all comparisons (default: 0.1)"
          },
          outputDiff: {
            type: "boolean",
            description: "Generate diff images for failures (default: true)"
          },
          stopOnFailure: {
            type: "boolean",
            description: "Stop batch processing on first failure (default: false)"
          }
        },
        required: ["comparisons"],
      },
    },
    {
      name: "playwright_run_across_browsers",
      description: "Execute actions across multiple browsers in parallel. Tests cross-browser compatibility by running the same action in Chromium, Firefox, and WebKit simultaneously.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to navigate to in all browsers"
          },
          browsers: {
            type: "array",
            description: "Array of browsers to test (default: ['chromium', 'firefox', 'webkit'])",
            items: {
              type: "string",
              enum: ["chromium", "firefox", "webkit"]
            }
          },
          action: {
            type: "string",
            description: "Action to perform: 'screenshot', 'title', 'content' (optional)",
            enum: ["screenshot", "title", "content"]
          },
          viewport: {
            type: "object",
            description: "Viewport size for all browsers (default: 1280x720)",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          headless: {
            type: "boolean",
            description: "Run browsers in headless mode (default: true)"
          }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_cross_browser_screenshot",
      description: "Capture and compare screenshots across multiple browsers. Automatically detects visual differences between browsers.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to capture across all browsers"
          },
          browsers: {
            type: "array",
            description: "Browsers to capture (default: ['chromium', 'firefox', 'webkit'])",
            items: {
              type: "string",
              enum: ["chromium", "firefox", "webkit"]
            }
          },
          outputDir: {
            type: "string",
            description: "Directory to save screenshots (default: screenshots/cross-browser)"
          },
          viewport: {
            type: "object",
            description: "Viewport size (default: 1280x720)",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          fullPage: {
            type: "boolean",
            description: "Capture full page (default: false)"
          },
          compareResults: {
            type: "boolean",
            description: "Compare screenshots between browsers (default: true)"
          },
          threshold: {
            type: "number",
            description: "Visual comparison tolerance 0-1 (default: 0.1)"
          },
          headless: {
            type: "boolean",
            description: "Run in headless mode (default: true)"
          }
        },
        required: ["url"],
      },
    },
    {
      name: "playwright_emulate_device",
      description: "Emulate a mobile device with specific viewport, user agent, and capabilities. Supports all Playwright device presets including iPhone, iPad, Android devices, etc.",
      inputSchema: {
        type: "object",
        properties: {
          device: {
            type: "string",
            description: "Device name (e.g., 'iPhone 13', 'Pixel 5', 'iPad Pro'). Use playwright_list_devices to see all available devices."
          },
          orientation: {
            type: "string",
            description: "Device orientation (default: 'portrait')",
            enum: ["portrait", "landscape"]
          },
          geolocation: {
            type: "object",
            description: "GPS coordinates for location testing",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
              accuracy: { type: "number" }
            }
          },
          permissions: {
            type: "array",
            description: "Permissions to grant (e.g., ['geolocation', 'notifications'])",
            items: { type: "string" }
          },
          locale: {
            type: "string",
            description: "Locale for the device (e.g., 'en-US', 'fr-FR')"
          },
          timezoneId: {
            type: "string",
            description: "Timezone ID (e.g., 'America/New_York')"
          }
        },
        required: ["device"],
      },
    },
    {
      name: "playwright_list_devices",
      description: "List all available device emulations supported by Playwright. Returns device names with their viewport sizes.",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Filter devices by name (e.g., 'iPhone', 'Galaxy', 'iPad')"
          }
        },
        required: [],
      },
    },
    {
      name: "playwright_collect_locators",
      description: "Collect all visible, unique locators from the current page and generate a Page Object Model (POM) file. Automatically identifies the best locator strategy for each element (data-test attributes, role-based, ID, CSS). Use this when you need to create page objects or collect element selectors.",
      inputSchema: {
        type: "object",
        properties: {
          outputDir: {
            type: "string",
            description: "Directory path where the Page Object file will be saved (default: './pageObjects')"
          },
          language: {
            type: "string",
            description: "Programming language for the generated file (default: 'typescript')",
            enum: ["typescript", "javascript"]
          }
        },
        required: [],
      },
    },
    // Session Management Tools
    {
      name: "create_browser_session",
      description: "Create a new browser session with isolated context. Enables parallel browser execution and multi-user scenarios.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Optional custom session ID. If not provided, auto-generates one (e.g., 'session-1')"
          },
          browserType: {
            type: "string",
            description: "Browser type to launch (default: 'chromium')",
            enum: ["chromium", "firefox", "webkit"]
          },
          headless: {
            type: "boolean",
            description: "Run browser in headless mode (default: true)"
          },
          viewport: {
            type: "object",
            description: "Viewport dimensions (default: 1280x720)",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          userAgent: {
            type: "string",
            description: "Custom user agent string"
          },
          locale: {
            type: "string",
            description: "Browser locale (e.g., 'en-US')"
          },
          timezoneId: {
            type: "string",
            description: "Timezone ID (e.g., 'America/New_York')"
          },
          geolocation: {
            type: "object",
            description: "Geolocation coordinates",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
              accuracy: { type: "number" }
            }
          },
          permissions: {
            type: "array",
            description: "Permissions to grant (e.g., ['geolocation', 'notifications'])",
            items: { type: "string" }
          }
        },
        required: [],
      },
    },
    {
      name: "list_browser_sessions",
      description: "List all active browser sessions with their details including session ID, browser type, current URL, and activity status.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "close_browser_session",
      description: "Close a specific browser session and cleanup all resources including browser instance, pages, and context.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to close"
          }
        },
        required: ["sessionId"],
      },
    },
    {
      name: "switch_browser_session",
      description: "Switch the current active session to a different browser session. All subsequent browser operations will use the switched session.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to switch to"
          }
        },
        required: ["sessionId"],
      },
    },
    {
      name: "get_session_info",
      description: "Get detailed information about a specific browser session including uptime, current URL, console logs, and activity metrics.",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "Session ID to get information about"
          }
        },
        required: ["sessionId"],
      },
    },
    {
      name: "cleanup_idle_sessions",
      description: "Automatically close idle browser sessions that haven't been accessed for a specified time. Helps manage resources and prevent memory leaks.",
      inputSchema: {
        type: "object",
        properties: {
          maxIdleMinutes: {
            type: "number",
            description: "Maximum idle time in minutes before closing (default: 60)"
          }
        },
        required: [],
      },
    },
    // Smart Waiting Tools
    {
      name: "playwright_wait_smart",
      description: "Intelligent wait for element with multiple conditions (visibility, stability, interactive state)",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector to wait for" },
          visible: { type: "boolean", description: "Wait for element to be visible (default: true)" },
          stable: { type: "boolean", description: "Wait for element to be stable/not animating (default: false)" },
          interactive: { type: "boolean", description: "Wait for element to be interactive/not disabled (default: false)" },
          hasText: { type: "string", description: "Wait for element to contain specific text" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" }
        },
        required: ["selector"]
      }
    },
    {
      name: "playwright_wait_network_idle",
      description: "Wait for network activity to become idle",
      inputSchema: {
        type: "object",
        properties: {
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
          idleTime: { type: "number", description: "Idle time to wait in milliseconds (default: 500)" }
        },
        required: []
      }
    },
    {
      name: "playwright_wait_element_count",
      description: "Wait for specific number of elements matching a selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector" },
          count: { type: "number", description: "Expected element count" },
          comparison: { type: "string", enum: ["equal", "greaterThan", "lessThan", "atLeast", "atMost"], description: "Comparison type (default: equal)" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" }
        },
        required: ["selector", "count"]
      }
    },
    {
      name: "playwright_wait_attribute",
      description: "Wait for element attribute to have specific value",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector" },
          attribute: { type: "string", description: "Attribute name to check" },
          value: { type: "string", description: "Expected attribute value (optional - waits for any value if not specified)" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" }
        },
        required: ["selector", "attribute"]
      }
    },
    {
      name: "playwright_wait_element_hidden",
      description: "Wait for element to become hidden or disappear",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" }
        },
        required: ["selector"]
      }
    },
    {
      name: "playwright_wait_url",
      description: "Wait for URL to match a specific pattern",
      inputSchema: {
        type: "object",
        properties: {
          urlPattern: { type: "string", description: "URL pattern or regex to match" },
          timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" }
        },
        required: ["urlPattern"]
      }
    },
    // Accessibility Testing Tools
    {
      name: "playwright_check_accessibility",
      description: "Run comprehensive accessibility scan using axe-core for WCAG compliance",
      inputSchema: {
        type: "object",
        properties: {
          include: { type: "array", items: { type: "string" }, description: "Selectors to include in scan" },
          exclude: { type: "array", items: { type: "string" }, description: "Selectors to exclude from scan" },
          rules: { type: "object", description: "Specific accessibility rules to test" },
          level: { type: "string", enum: ["WCAG2A", "WCAG2AA", "WCAG2AAA", "Section508", "BEST-PRACTICE"], description: "WCAG compliance level (default: WCAG2AA)" },
          elementSelector: { type: "string", description: "Scan only specific element" }
        },
        required: []
      }
    },
    {
      name: "playwright_get_aria_snapshot",
      description: "Get ARIA accessibility tree snapshot of the page or element",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector (scans entire page if not specified)" }
        },
        required: []
      }
    },
    {
      name: "playwright_check_contrast",
      description: "Check color contrast ratio for WCAG compliance",
      inputSchema: {
        type: "object",
        properties: {
          selector: { type: "string", description: "Element selector to check" },
          level: { type: "string", enum: ["AA", "AAA"], description: "WCAG level (default: AA)" }
        },
        required: ["selector"]
      }
    },
    {
      name: "playwright_check_keyboard_navigation",
      description: "Check keyboard navigation and focusable elements on the page",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // Code Coverage Tools
    {
      name: "playwright_start_coverage",
      description: "Start collecting JavaScript and CSS code coverage",
      inputSchema: {
        type: "object",
        properties: {
          js: { type: "boolean", description: "Collect JavaScript coverage (default: true)" },
          css: { type: "boolean", description: "Collect CSS coverage (default: true)" },
          resetOnNavigation: { type: "boolean", description: "Reset coverage on navigation (default: false)" }
        },
        required: []
      }
    },
    {
      name: "playwright_get_coverage",
      description: "Stop coverage collection and get results with detailed statistics",
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["js", "css", "both"], description: "Coverage type to retrieve (default: both)" },
          saveToFile: { type: "string", description: "Path to save coverage data JSON file" },
          includeRawData: { type: "boolean", description: "Include raw coverage data (default: false)" }
        },
        required: []
      }
    },
    {
      name: "playwright_generate_coverage_report",
      description: "Generate coverage report in various formats from coverage data file",
      inputSchema: {
        type: "object",
        properties: {
          coverageFile: { type: "string", description: "Path to coverage data JSON file" },
          outputFile: { type: "string", description: "Path for output report file" },
          format: { type: "string", enum: ["html", "json", "lcov", "text"], description: "Report format (default: html)" }
        },
        required: ["coverageFile", "outputFile"]
      }
    },
    {
      name: "playwright_compare_coverage",
      description: "Compare coverage between baseline and current test runs",
      inputSchema: {
        type: "object",
        properties: {
          baselinePath: { type: "string", description: "Path to baseline coverage JSON file" },
          currentPath: { type: "string", description: "Path to current coverage JSON file" }
        },
        required: ["baselinePath", "currentPath"]
      }
    },
    // Parallel Test Execution Tools
    {
      name: "playwright_run_tests_parallel",
      description: "Execute multiple test scenarios in parallel with configurable concurrency",
      inputSchema: {
        type: "object",
        properties: {
          tests: { type: "array", description: "Array of test scenarios with actions", items: { type: "object" } },
          maxConcurrency: { type: "number", description: "Maximum concurrent tests (default: 3)" },
          failFast: { type: "boolean", description: "Stop on first failure (default: false)" },
          shardIndex: { type: "number", description: "Shard index for distributed execution" },
          shardTotal: { type: "number", description: "Total number of shards" },
          timeout: { type: "number", description: "Timeout per test in milliseconds (default: 60000)" }
        },
        required: ["tests"]
      }
    },
    {
      name: "playwright_run_cross_browser",
      description: "Run a test across multiple browsers (chromium, firefox, webkit) in parallel",
      inputSchema: {
        type: "object",
        properties: {
          test: { type: "object", description: "Test scenario with actions" },
          browsers: { type: "array", items: { type: "string", enum: ["chromium", "firefox", "webkit"] }, description: "Browsers to test (default: all)" },
          timeout: { type: "number", description: "Timeout per test in milliseconds (default: 60000)" }
        },
        required: ["test"]
      }
    },
    // Visual AI Testing Tools
    {
      name: "playwright_ai_visual_compare",
      description: "AI-powered visual regression testing that intelligently ignores dynamic content like ads and timestamps",
      inputSchema: {
        type: "object",
        properties: {
          baselinePath: { type: "string", description: "Path to baseline image PNG file" },
          threshold: { type: "number", description: "Difference threshold 0-1 (default: 0.1)" },
          ignoreRegions: { type: "string", description: "'auto' for AI detection, 'none', or array of regions" },
          detectDynamic: { type: "boolean", description: "Detect and ignore dynamic content (default: true)" },
          saveDiff: { type: "boolean", description: "Save diff image (default: true)" },
          diffPath: { type: "string", description: "Path to save diff image" }
        },
        required: ["baselinePath"]
      }
    },
    {
      name: "playwright_batch_ai_visual_compare",
      description: "Run batch AI visual comparisons across multiple pages",
      inputSchema: {
        type: "object",
        properties: {
          comparisons: { type: "array", description: "Array of comparison configs with url and baselinePath", items: { type: "object" } },
          threshold: { type: "number", description: "Difference threshold (default: 0.1)" },
          detectDynamic: { type: "boolean", description: "Detect dynamic content (default: true)" },
          failFast: { type: "boolean", description: "Stop on first failure (default: false)" }
        },
        required: ["comparisons"]
      }
    },
    // Resource Management Tools
    {
      name: "playwright_get_resource_usage",
      description: "Get current resource usage statistics (browsers, sessions, memory, queue)",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "playwright_update_resource_limits",
      description: "Update resource limits and throttling configuration",
      inputSchema: {
        type: "object",
        properties: {
          maxConcurrentBrowsers: { type: "number", description: "Maximum concurrent browsers" },
          maxSessionsPerUser: { type: "number", description: "Maximum sessions per user" },
          maxTotalSessions: { type: "number", description: "Maximum total sessions" },
          sessionIdleTimeout: { type: "number", description: "Session idle timeout in milliseconds" },
          queueTimeout: { type: "number", description: "Queue timeout in milliseconds" },
          maxQueueSize: { type: "number", description: "Maximum queue size" }
        },
        required: []
      }
    },
    // Session Persistence Tools
    {
      name: "playwright_recover_session",
      description: "Recover a persisted session from disk after crash or restart",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID to recover" }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "playwright_recover_all_sessions",
      description: "Recover all persisted sessions from disk",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "playwright_get_persistence_stats",
      description: "Get statistics about persisted sessions on disk",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // PDF Testing Tools
    {
      name: "playwright_extract_pdf_text",
      description: "Extract text content from a PDF file. Useful for verifying PDF generation and content validation.",
      inputSchema: {
        type: "object",
        properties: {
          pdfPath: {
            type: "string",
            description: "Absolute path to the PDF file to extract text from"
          },
          saveToFile: {
            type: "string",
            description: "Optional path to save extracted text to a file"
          }
        },
        required: ["pdfPath"]
      }
    },
    {
      name: "playwright_validate_pdf_content",
      description: "Validate that a PDF contains specific text content. Returns success if text is found, error if not.",
      inputSchema: {
        type: "object",
        properties: {
          pdfPath: {
            type: "string",
            description: "Absolute path to the PDF file to validate"
          },
          expectedText: {
            type: "string",
            description: "Text content expected to be in the PDF"
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether to perform case-sensitive search (default: true)"
          },
          exactMatch: {
            type: "boolean",
            description: "Whether to require exact match of entire PDF content (default: false, uses contains)"
          }
        },
        required: ["pdfPath", "expectedText"]
      }
    },
    {
      name: "playwright_count_pdf_pages",
      description: "Count the number of pages in a PDF file and get PDF metadata information.",
      inputSchema: {
        type: "object",
        properties: {
          pdfPath: {
            type: "string",
            description: "Absolute path to the PDF file"
          }
        },
        required: ["pdfPath"]
      }
    },
    {
      name: "playwright_download_and_extract_pdf",
      description: "Download a PDF file by clicking a trigger element and optionally extract its text content. Useful for testing PDF download functionality.",
      inputSchema: {
        type: "object",
        properties: {
          triggerSelector: {
            type: "string",
            description: "CSS selector for the element that triggers the PDF download"
          },
          expectedFileName: {
            type: "string",
            description: "Expected filename for validation (optional)"
          },
          savePath: {
            type: "string",
            description: "Path where PDF should be saved (default: downloads/<filename>)"
          },
          extractText: {
            type: "boolean",
            description: "Whether to extract text from downloaded PDF (default: true)"
          },
          timeout: {
            type: "number",
            description: "Maximum time to wait for download in milliseconds (default: 30000)"
          }
        },
        required: ["triggerSelector"]
      }
    },
    // Advanced Assertions Tools
    {
      name: "playwright_assert_element_state",
      description: "Assert element state (visible, hidden, enabled, disabled, editable, readonly, checked, unchecked)",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element to check"
          },
          state: {
            type: "string",
            description: "Expected state: visible, hidden, enabled, disabled, editable, readonly, checked, unchecked",
            enum: ["visible", "hidden", "enabled", "disabled", "editable", "readonly", "checked", "unchecked"]
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "state"]
      }
    },
    {
      name: "playwright_assert_element_count",
      description: "Assert exact count of elements matching a selector with flexible comparison",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for elements to count"
          },
          count: {
            type: "number",
            description: "Expected element count"
          },
          comparison: {
            type: "string",
            description: "Comparison type (default: equal)",
            enum: ["equal", "greaterThan", "lessThan", "atLeast", "atMost"]
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "count"]
      }
    },
    {
      name: "playwright_assert_text_content",
      description: "Assert element text content with fuzzy search support (exact, contains, startsWith, endsWith, regex)",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element"
          },
          expectedText: {
            type: "string",
            description: "Expected text content"
          },
          matchType: {
            type: "string",
            description: "Match type (default: contains)",
            enum: ["exact", "contains", "startsWith", "endsWith", "regex"]
          },
          caseSensitive: {
            type: "boolean",
            description: "Case sensitive matching (default: true)"
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "expectedText"]
      }
    },
    {
      name: "playwright_assert_attribute",
      description: "Assert element attribute value with flexible matching",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element"
          },
          attribute: {
            type: "string",
            description: "Attribute name to check (e.g., 'href', 'class', 'data-testid')"
          },
          expectedValue: {
            type: "string",
            description: "Expected attribute value (not required for exists/notExists)"
          },
          matchType: {
            type: "string",
            description: "Match type (default: exact)",
            enum: ["exact", "contains", "exists", "notExists"]
          },
          caseSensitive: {
            type: "boolean",
            description: "Case sensitive matching (default: true)"
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "attribute"]
      }
    },
    {
      name: "playwright_assert_css_property",
      description: "Assert CSS property value using computed styles",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector for the element"
          },
          property: {
            type: "string",
            description: "CSS property name (e.g., 'color', 'font-size', 'display')"
          },
          expectedValue: {
            type: "string",
            description: "Expected CSS property value (normalized for comparison)"
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 5000)"
          }
        },
        required: ["selector", "property", "expectedValue"]
      }
    },
    {
      name: "playwright_assert_request_made",
      description: "Assert that a network request was made matching URL pattern and optional method",
      inputSchema: {
        type: "object",
        properties: {
          urlPattern: {
            type: "string",
            description: "URL pattern to match (string or regex like '/api/.*/')"
          },
          method: {
            type: "string",
            description: "HTTP method to match (optional)",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
          },
          timeout: {
            type: "number",
            description: "Timeout in milliseconds (default: 10000)"
          },
          waitForRequest: {
            type: "boolean",
            description: "Wait for request to be made (default: true)"
          }
        },
        required: ["urlPattern"]
      }
    },
    // Video Recording Tools
    {
      name: "playwright_start_video_recording",
      description: "Start recording video of browser session. Useful for test debugging and documentation.",
      inputSchema: {
        type: "object",
        properties: {
          outputPath: {
            type: "string",
            description: "Custom output path for video file (optional, auto-generated if not provided)"
          },
          size: {
            type: "object",
            description: "Video dimensions (default: 1280x720)",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          recordOnFailure: {
            type: "boolean",
            description: "Only save video if test fails (default: false)"
          }
        },
        required: []
      }
    },
    {
      name: "playwright_stop_video_recording",
      description: "Stop video recording and save the file with optional annotations",
      inputSchema: {
        type: "object",
        properties: {
          saveVideo: {
            type: "boolean",
            description: "Whether to save the video (default: true, false will discard)"
          },
          customPath: {
            type: "string",
            description: "Custom path to save the video (optional)"
          }
        },
        required: []
      }
    },
    {
      name: "playwright_add_video_annotation",
      description: "Add a timestamped annotation/marker to the current video recording",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Annotation message to mark this point in the recording"
          },
          timestamp: {
            type: "number",
            description: "Custom timestamp in milliseconds (optional, auto-calculated if not provided)"
          }
        },
        required: ["message"]
      }
    },
    {
      name: "playwright_configure_video_settings",
      description: "Configure default video recording settings (output directory, quality, FPS)",
      inputSchema: {
        type: "object",
        properties: {
          outputDir: {
            type: "string",
            description: "Default output directory for video files (default: './videos')"
          },
          size: {
            type: "object",
            description: "Default video dimensions",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          recordOnFailure: {
            type: "boolean",
            description: "Only save videos when tests fail (default: false)"
          },
          quality: {
            type: "number",
            description: "Video quality 0-100 (default: 100)"
          },
          fps: {
            type: "number",
            description: "Frames per second 1-60 (default: 30)"
          }
        },
        required: []
      }
    },
    {
      name: "playwright_get_video_status",
      description: "Get current video recording status including duration and annotation count",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
  ] as const satisfies Tool[];
}

// Browser-requiring tools for conditional browser launch
export const BROWSER_TOOLS = [
  "playwright_navigate",
  "playwright_screenshot",
  "playwright_click",
  "playwright_iframe_click",
  "playwright_iframe_fill",
  "playwright_fill",
  "playwright_select",
  "playwright_hover",
  "playwright_upload_file",
  "playwright_evaluate",
  "playwright_close",
  "playwright_expect_response",
  "playwright_assert_response",
  "playwright_custom_user_agent",
  "playwright_get_visible_text",
  "playwright_get_visible_html",
  "playwright_go_back",
  "playwright_go_forward",
  "playwright_drag",
  "playwright_press_key",
  "playwright_save_as_pdf",
  "playwright_click_and_switch_tab",
  "playwright_download_file",
  "playwright_copy_to_clipboard",
  "playwright_read_clipboard",
  "playwright_handle_dialog",
  "playwright_expect_dialog",
  "playwright_drag_to_position",
  "playwright_get_element_position",
  "playwright_visual_compare",
  "playwright_create_baseline",
  "playwright_batch_visual_compare",
  "playwright_run_across_browsers",
  "playwright_cross_browser_screenshot",
  "playwright_emulate_device",
  "playwright_list_devices",
  "playwright_collect_locators",
  // Smart waiting tools
  "playwright_wait_smart",
  "playwright_wait_network_idle",
  "playwright_wait_element_count",
  "playwright_wait_attribute",
  "playwright_wait_element_hidden",
  "playwright_wait_url",
  // Accessibility tools
  "playwright_check_accessibility",
  "playwright_get_aria_snapshot",
  "playwright_check_contrast",
  "playwright_check_keyboard_navigation",
  // Coverage tools
  "playwright_start_coverage",
  "playwright_get_coverage",
  // Visual AI tools
  "playwright_ai_visual_compare",
  "playwright_batch_ai_visual_compare",
  // PDF testing tools
  "playwright_extract_pdf_text",
  "playwright_validate_pdf_content",
  "playwright_count_pdf_pages",
  "playwright_download_and_extract_pdf",
  // Assertion tools
  "playwright_assert_element_state",
  "playwright_assert_element_count",
  "playwright_assert_text_content",
  "playwright_assert_attribute",
  "playwright_assert_css_property",
  "playwright_assert_request_made",
  // Video recording tools
  "playwright_start_video_recording",
  "playwright_stop_video_recording",
  "playwright_add_video_annotation",
  "playwright_configure_video_settings",
  "playwright_get_video_status"
];

// API Request tools for conditional launch
export const API_TOOLS = [
  "playwright_get",
  "playwright_post",
  "playwright_put",
  "playwright_delete",
  "playwright_patch"
];

// Codegen tools
export const CODEGEN_TOOLS = [
  'start_codegen_session',
  'end_codegen_session',
  'get_codegen_session',
  'clear_codegen_session'
];

// Session management tools
export const SESSION_TOOLS = [
  'create_browser_session',
  'list_browser_session',
  'close_browser_session',
  'switch_browser_session',
  'get_session_info',
  'cleanup_idle_sessions',
  'playwright_recover_session',
  'playwright_recover_all_sessions',
  'playwright_get_persistence_stats'
];

// Smart waiting tools
export const SMART_WAIT_TOOLS = [
  'playwright_wait_smart',
  'playwright_wait_network_idle',
  'playwright_wait_element_count',
  'playwright_wait_attribute',
  'playwright_wait_element_hidden',
  'playwright_wait_url'
];

// Accessibility testing tools
export const ACCESSIBILITY_TOOLS = [
  'playwright_check_accessibility',
  'playwright_get_aria_snapshot',
  'playwright_check_contrast',
  'playwright_check_keyboard_navigation'
];

// Code coverage tools
export const COVERAGE_TOOLS = [
  'playwright_start_coverage',
  'playwright_get_coverage',
  'playwright_generate_coverage_report',
  'playwright_compare_coverage'
];

// Parallel execution tools
export const PARALLEL_EXECUTION_TOOLS = [
  'playwright_run_tests_parallel',
  'playwright_run_cross_browser'
];

// Visual AI testing tools
export const VISUAL_AI_TOOLS = [
  'playwright_ai_visual_compare',
  'playwright_batch_ai_visual_compare'
];

// Resource management tools
export const RESOURCE_MANAGEMENT_TOOLS = [
  'playwright_get_resource_usage',
  'playwright_update_resource_limits'
];

// PDF testing tools
export const PDF_TESTING_TOOLS = [
  'playwright_extract_pdf_text',
  'playwright_validate_pdf_content',
  'playwright_count_pdf_pages',
  'playwright_download_and_extract_pdf'
];

// Advanced assertion tools
export const ASSERTION_TOOLS = [
  'playwright_assert_element_state',
  'playwright_assert_element_count',
  'playwright_assert_text_content',
  'playwright_assert_attribute',
  'playwright_assert_css_property',
  'playwright_assert_request_made'
];

// Video recording tools
export const VIDEO_RECORDING_TOOLS = [
  'playwright_start_video_recording',
  'playwright_stop_video_recording',
  'playwright_add_video_annotation',
  'playwright_configure_video_settings',
  'playwright_get_video_status'
];

// All available tools
export const tools = [
  ...BROWSER_TOOLS,
  ...API_TOOLS,
  ...CODEGEN_TOOLS,
  ...SESSION_TOOLS,
  ...SMART_WAIT_TOOLS,
  ...ACCESSIBILITY_TOOLS,
  ...COVERAGE_TOOLS,
  ...PARALLEL_EXECUTION_TOOLS,
  ...VISUAL_AI_TOOLS,
  ...RESOURCE_MANAGEMENT_TOOLS,
  ...PDF_TESTING_TOOLS,
  ...ASSERTION_TOOLS,
  ...VIDEO_RECORDING_TOOLS
];
