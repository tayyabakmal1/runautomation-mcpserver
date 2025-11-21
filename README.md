# RunAutomation MCP Server

A comprehensive Model Context Protocol (MCP) server for Playwright automation, providing 100+ tools for web testing, browser automation, and quality assurance tasks.

## Table of Contents

- [Why Use This MCP Server?](#why-use-this-mcp-server)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Features](#features)
- [Usage Examples](#usage-examples)
- [Author](#author)
- [Contributing](#contributing)
- [Issues and Support](#issues-and-support)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Why Use This MCP Server?

### Model Context Protocol (MCP)
The Model Context Protocol is an open standard that enables seamless integration between AI assistants and external tools. This MCP server allows AI models (like Claude, GPT, etc.) to:

- **Execute browser automation** directly through natural language commands
- **Perform quality assurance tasks** without manual scripting
- **Generate test code** by observing user interactions
- **Run comprehensive test suites** with visual regression, accessibility, and cross-browser testing
- **Integrate testing into AI workflows** for autonomous test creation and execution

### Key Benefits
- **AI-Driven Testing**: Let AI assistants write and execute tests based on requirements
- **Natural Language Control**: Control Playwright through conversational commands
- **Comprehensive Coverage**: 100+ tools covering every aspect of web testing
- **Production-Ready**: Built on Playwright's reliable automation framework
- **Extensible**: Easy to integrate into existing testing workflows
- **Open Source**: MIT licensed for commercial and personal use

### Use Cases
- **Automated Testing**: Create and run browser automation tests
- **Visual QA**: Perform visual regression testing and cross-browser validation
- **Accessibility Audits**: Run WCAG compliance checks
- **PDF Testing**: Validate PDF generation and content
- **API Testing**: Test backend APIs alongside UI tests
- **Test Generation**: Record user actions and generate test code
- **CI/CD Integration**: Run tests in continuous integration pipelines

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

```

### Local Development Installation

1. Clone the repository:
```bash
git clone https://github.com/tayyabakmal1/runautomation-mcpserver.git
cd runautomation-mcpserver
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests (optional):
```bash
npm test
```

## Configuration

### Claude Desktop Integration

To use this MCP server with Claude Desktop, add the following configuration to your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "--directory",
        "/your-playwright-mcp-server-clone-directory",
        "run",
        "runautomation-mcpserver"
      ]
    }
  }
}
```



### Environment Variables

You can configure the server using environment variables:

```bash
# Browser configuration
PLAYWRIGHT_BROWSER=chromium  # chromium, firefox, webkit
PLAYWRIGHT_HEADLESS=true     # true or false

# Video recording
PLAYWRIGHT_VIDEO_DIR=./videos
PLAYWRIGHT_VIDEO_QUALITY=100

# Session management
MAX_SESSIONS=10
SESSION_TIMEOUT=3600000      # milliseconds
```

## Available Tools

### Browser Automation (50+ tools)
- `playwright_navigate` - Navigate to URL
- `playwright_click` - Click element
- `playwright_fill` - Fill input field
- `playwright_select` - Select dropdown option
- `playwright_hover` - Hover over element
- `playwright_screenshot` - Take screenshot
- `playwright_evaluate` - Execute JavaScript
- `playwright_upload_file` - Upload file
- `playwright_download_file` - Download file
- `playwright_drag` - Drag and drop elements
- `playwright_press_key` - Press keyboard keys
- `playwright_go_back` - Navigate back
- `playwright_go_forward` - Navigate forward
- `playwright_iframe_click` - Click in iframe
- `playwright_iframe_fill` - Fill in iframe
- `playwright_click_and_switch_tab` - Open new tab
- `playwright_copy_to_clipboard` - Copy to clipboard
- `playwright_read_clipboard` - Read clipboard
- `playwright_handle_dialog` - Handle dialogs
- `playwright_expect_dialog` - Expect dialog
- `playwright_drag_to_position` - Drag to coordinates
- `playwright_get_element_position` - Get element position
- `playwright_console_logs` - Get console logs
- `playwright_get_visible_text` - Get page text
- `playwright_get_visible_html` - Get page HTML
- `playwright_custom_user_agent` - Set user agent
- `playwright_close` - Close browser

### Code Generation (4 tools)
- `start_codegen_session` - Start recording test
- `end_codegen_session` - Stop and generate code
- `get_codegen_session` - Get session info
- `clear_codegen_session` - Clear session
- `playwright_collect_locators` - Collect page locators

### Video Recording (5 tools)
- `playwright_start_video_recording` - Start recording
- `playwright_stop_video_recording` - Stop recording
- `playwright_add_video_annotation` - Add annotation
- `playwright_configure_video_settings` - Configure settings
- `playwright_get_video_status` - Get recording status

### Visual Testing (7 tools)
- `playwright_visual_compare` - Compare screenshots
- `playwright_create_baseline` - Create baseline
- `playwright_batch_visual_compare` - Batch comparison
- `playwright_ai_visual_compare` - AI visual testing
- `playwright_batch_ai_visual_compare` - Batch AI testing
- `playwright_cross_browser_screenshot` - Cross-browser capture

### Session Management (9 tools)
- `create_browser_session` - Create new session
- `list_browser_sessions` - List all sessions
- `close_browser_session` - Close session
- `switch_browser_session` - Switch session
- `get_session_info` - Get session details
- `cleanup_idle_sessions` - Clean idle sessions
- `playwright_recover_session` - Recover session
- `playwright_recover_all_sessions` - Recover all sessions
- `playwright_get_persistence_stats` - Get persistence stats

### Smart Waiting (6 tools)
- `playwright_wait_smart` - Intelligent wait
- `playwright_wait_network_idle` - Wait for network
- `playwright_wait_element_count` - Wait for count
- `playwright_wait_attribute` - Wait for attribute
- `playwright_wait_element_hidden` - Wait for hidden
- `playwright_wait_url` - Wait for URL change

### Accessibility (4 tools)
- `playwright_check_accessibility` - Run axe scan
- `playwright_get_aria_snapshot` - Get ARIA tree
- `playwright_check_contrast` - Check contrast
- `playwright_check_keyboard_navigation` - Test keyboard nav

### Code Coverage (4 tools)
- `playwright_start_coverage` - Start coverage
- `playwright_get_coverage` - Get coverage results
- `playwright_generate_coverage_report` - Generate report
- `playwright_compare_coverage` - Compare coverage

### Cross-Browser Testing (4 tools)
- `playwright_run_across_browsers` - Run in all browsers
- `playwright_emulate_device` - Emulate mobile device
- `playwright_list_devices` - List available devices

### PDF Testing (4 tools)
- `playwright_save_as_pdf` - Save page as PDF
- `playwright_extract_pdf_text` - Extract PDF text
- `playwright_validate_pdf_content` - Validate PDF content
- `playwright_count_pdf_pages` - Count PDF pages
- `playwright_download_and_extract_pdf` - Download and extract PDF

### Advanced Assertions (6 tools)
- `playwright_assert_element_state` - Assert element state
- `playwright_assert_element_count` - Assert count
- `playwright_assert_text_content` - Assert text
- `playwright_assert_attribute` - Assert attribute
- `playwright_assert_css_property` - Assert CSS
- `playwright_assert_request_made` - Assert network request

### API Testing (7 tools)
- `playwright_get` - HTTP GET request
- `playwright_post` - HTTP POST request
- `playwright_put` - HTTP PUT request
- `playwright_patch` - HTTP PATCH request
- `playwright_delete` - HTTP DELETE request
- `playwright_expect_response` - Expect response
- `playwright_assert_response` - Assert response

### Parallel Execution (2 tools)
- `playwright_run_tests_parallel` - Run tests in parallel
- `playwright_run_cross_browser` - Cross-browser parallel tests

### Resource Management (2 tools)
- `playwright_get_resource_usage` - Get resource stats
- `playwright_update_resource_limits` - Update limits

## Features

### Core Browser Automation
- **Navigation & Interaction**: Navigate URLs, click elements, fill forms, select dropdowns, hover, drag & drop
- **File Operations**: Upload files, download files, handle file inputs
- **Clipboard Operations**: Copy to and read from clipboard
- **Dialog Handling**: Handle alerts, confirms, and prompt dialogs
- **iframe Support**: Interact with elements inside iframes
- **Tab Management**: Open new tabs and switch between them
- **Advanced Interactions**: Keyboard press, drag to position, scroll, go back/forward

### Screenshot & Visual Testing
- **Screenshot Capture**: Full page or element-specific screenshots with customizable dimensions
- **Visual Regression Testing**: Compare screenshots with baselines using pixel-perfect diff detection
- **AI-Powered Visual Testing**: Intelligent visual comparison that ignores dynamic content
- **Batch Visual Testing**: Run multiple visual comparisons in parallel
- **Cross-Browser Screenshots**: Capture and compare screenshots across Chromium, Firefox, and WebKit

### Code Generation & Recording
- **Test Code Generation**: Record browser actions and generate Playwright test code
- **Multiple Languages**: Generate tests in TypeScript or JavaScript
- **Page Object Model**: Generate POM-based test structures
- **Locator Collection**: Automatically collect and organize element locators
- **Session Recording**: Record complete test sessions with annotations

### Video Recording
- **Session Recording**: Record browser sessions as video
- **Annotation Support**: Add timestamped annotations during recording
- **Configurable Settings**: Customize video quality, FPS, and output directory
- **Conditional Recording**: Record only on test failures
- **Duration Tracking**: Track recording duration and status

### Session Management
- **Multi-Session Support**: Create and manage multiple isolated browser sessions
- **Session Persistence**: Save and recover sessions across restarts
- **Session Switching**: Switch between active sessions seamlessly
- **Idle Cleanup**: Automatically clean up inactive sessions
- **Resource Monitoring**: Track resource usage and session statistics

### API Testing
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE requests
- **Request/Response Validation**: Expect and assert HTTP responses
- **Header Customization**: Add custom headers and authorization tokens
- **Response Waiting**: Wait for specific API responses

### Smart Waiting & Synchronization
- **Intelligent Waiting**: Wait for elements with multiple conditions (visible, stable, interactive)
- **Network Idle**: Wait for network activity to complete
- **Element Count**: Wait for specific number of elements
- **Attribute Waiting**: Wait for element attributes to reach expected values
- **URL Waiting**: Wait for URL pattern changes
- **Element Hidden**: Wait for elements to disappear

### Accessibility Testing
- **WCAG Compliance**: Run axe-core accessibility scans
- **ARIA Snapshot**: Get accessibility tree structure
- **Contrast Checking**: Validate color contrast ratios
- **Keyboard Navigation**: Test keyboard accessibility
- **Multiple WCAG Levels**: Support for WCAG 2.0 A, AA, AAA, and Section 508

### Code Coverage
- **JavaScript Coverage**: Track JS code coverage during tests
- **CSS Coverage**: Monitor CSS usage and unused styles
- **Coverage Reports**: Generate reports in HTML, JSON, LCOV, and text formats
- **Baseline Comparison**: Compare coverage between test runs
- **Detailed Statistics**: Line-by-line coverage analysis

### Cross-Browser Testing
- **Multi-Browser Execution**: Run tests across Chromium, Firefox, and WebKit in parallel
- **Device Emulation**: Emulate mobile devices (iPhone, iPad, Android)
- **Custom Viewports**: Test with different screen sizes
- **Geolocation Testing**: Test location-based features
- **Timezone & Locale**: Test internationalization features

### PDF Testing
- **Text Extraction**: Extract and validate text content from PDFs
- **Page Counting**: Count PDF pages and get metadata
- **Content Validation**: Assert expected text in generated PDFs
- **PDF Download Testing**: Test PDF download functionality
- **Save as PDF**: Convert web pages to PDF format

### Advanced Assertions
- **Element State**: Assert visibility, enabled/disabled, checked/unchecked states
- **Element Count**: Validate number of matching elements with flexible comparisons
- **Text Content**: Assert text with fuzzy matching (contains, starts with, ends with, regex)
- **Attribute Validation**: Check element attributes with multiple match types
- **CSS Properties**: Assert computed CSS property values
- **Network Assertions**: Validate that specific network requests were made

### Parallel Execution
- **Test Parallelization**: Run multiple test scenarios simultaneously
- **Configurable Concurrency**: Control maximum parallel executions
- **Fail-Fast Mode**: Stop on first failure or continue through all tests
- **Shard Support**: Distribute tests across multiple machines
- **Cross-Browser Parallel**: Execute same test across browsers in parallel

### Console & Debugging
- **Console Logs**: Capture and filter browser console logs
- **Log Types**: Filter by error, warning, info, debug levels
- **Log Search**: Search console logs by text pattern
- **JavaScript Execution**: Execute custom JavaScript in browser context

### Resource Management
- **Browser Limits**: Configure maximum concurrent browsers
- **Session Limits**: Set per-user and total session limits
- **Queue Management**: Handle request queuing and timeouts
- **Resource Monitoring**: Track memory and browser resource usage
- **Automatic Cleanup**: Clean up idle sessions and resources

## Usage Examples

### Example 1: Basic Navigation and Screenshot

```typescript
// Using the MCP server through an AI assistant
"Navigate to https://example.com and take a screenshot"

// This translates to:
// 1. playwright_navigate with url: "https://example.com"
// 2. playwright_screenshot with name: "example-homepage"
```

### Example 2: Form Automation

```typescript
// Natural language command
"Fill the login form with username 'test@example.com' and password 'secret123', then click the submit button"

// Executes:
// 1. playwright_fill with selector: "#username", value: "test@example.com"
// 2. playwright_fill with selector: "#password", value: "secret123"
// 3. playwright_click with selector: "button[type='submit']"
```

### Example 3: Visual Regression Testing

```typescript
// Command
"Create a baseline screenshot of the homepage and compare it with the current page"

// Executes:
// 1. playwright_create_baseline with outputPath: "./baselines/homepage.png"
// 2. playwright_visual_compare with baseline: "./baselines/homepage.png"
```

### Example 4: Accessibility Testing

```typescript
// Command
"Run an accessibility audit on the current page for WCAG AA compliance"

// Executes:
// 1. playwright_check_accessibility with level: "WCAG2AA"
```

### Example 5: Cross-Browser Testing

```typescript
// Command
"Test the login page across all browsers"

// Executes:
// 1. playwright_run_across_browsers with url: "https://app.com/login"
//    browsers: ["chromium", "firefox", "webkit"]
```

### Example 6: Video Recording

```typescript
// Command
"Start recording the browser session, navigate to the dashboard, and stop recording"

// Executes:
// 1. playwright_start_video_recording
// 2. playwright_navigate with url: "https://app.com/dashboard"
// 3. playwright_add_video_annotation with message: "Dashboard loaded"
// 4. playwright_stop_video_recording with saveVideo: true
```

### Example 7: Code Generation

```typescript
// Command
"Start a code generation session, perform some actions, then generate the test code"

// Executes:
// 1. start_codegen_session with outputPath: "./tests", language: "typescript"
// 2. [Perform various browser actions]
// 3. end_codegen_session with sessionId: "session-id"
```

## Author

**Tayyab Akmal**
- LinkedIn: [https://www.linkedin.com/in/tayyab-sqa-engineer/](https://www.linkedin.com/in/tayyab-sqa-engineer/)
- GitHub: [https://github.com/tayyabakmal1](https://github.com/tayyabakmal1)
- Email: [Contact via GitHub](https://github.com/tayyabakmal1)

Tayyab is a Senior QA Engineer specializing in test automation, quality assurance, and building developer tools. With extensive experience in Playwright, Selenium, and modern testing frameworks, he created this MCP server to bridge the gap between AI assistants and browser automation.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Issues and Support

If you encounter any issues or have questions:

- **GitHub Issues**: [https://github.com/tayyabakmal1/runautomation-mcpserver/issues](https://github.com/tayyabakmal1/runautomation-mcpserver/issues)
- **Discussions**: [https://github.com/tayyabakmal1/runautomation-mcpserver/discussions](https://github.com/tayyabakmal1/runautomation-mcpserver/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on [Playwright](https://playwright.dev/) - Microsoft's powerful browser automation framework
- Implements [Model Context Protocol](https://modelcontextprotocol.io/) - Anthropic's open standard for AI-tool integration
- Uses [axe-core](https://github.com/dequelabs/axe-core) for accessibility testing
- Powered by [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)

## Keywords

playwright, automation, AI, MCP, browser automation, web testing, visual regression, accessibility testing, cross-browser testing, test generation, quality assurance, e2e testing, integration testing, claude, model context protocol

---

Made with ❤️ by [Tayyab Akmal](https://www.linkedin.com/in/tayyab-sqa-engineer/)
