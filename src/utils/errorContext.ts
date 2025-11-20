/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Enhanced Error Context System
 * Provides structured error handling with codes, suggestions, and retry capabilities
 */

export enum ErrorCode {
  // Browser errors
  BROWSER_CRASHED = 'BROWSER_CRASHED',
  BROWSER_DISCONNECTED = 'BROWSER_DISCONNECTED',
  BROWSER_LAUNCH_FAILED = 'BROWSER_LAUNCH_FAILED',

  // Page errors
  PAGE_CLOSED = 'PAGE_CLOSED',
  PAGE_CRASHED = 'PAGE_CRASHED',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',

  // Element errors
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  ELEMENT_NOT_VISIBLE = 'ELEMENT_NOT_VISIBLE',
  ELEMENT_NOT_INTERACTABLE = 'ELEMENT_NOT_INTERACTABLE',
  ELEMENT_DETACHED = 'ELEMENT_DETACHED',

  // Timeout errors
  TIMEOUT = 'TIMEOUT',
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  ACTION_TIMEOUT = 'ACTION_TIMEOUT',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  REQUEST_FAILED = 'REQUEST_FAILED',
  RESPONSE_ERROR = 'RESPONSE_ERROR',

  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_LIMIT_REACHED = 'SESSION_LIMIT_REACHED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Resource errors
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  CONCURRENT_LIMIT_REACHED = 'CONCURRENT_LIMIT_REACHED',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',

  // Configuration errors
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  ASSERTION_FAILED = 'ASSERTION_FAILED',
}

export interface ErrorContext {
  url?: string;
  selector?: string;
  sessionId?: string;
  browserType?: string;
  timeout?: number;
  elementState?: string;
  requestUrl?: string;
  filePath?: string;
  [key: string]: any;
}

export interface EnhancedError {
  code: ErrorCode;
  message: string;
  context: ErrorContext;
  suggestions: string[];
  retryable: boolean;
  originalError?: Error;
  timestamp: Date;
}

/**
 * Create an enhanced error with structured information
 */
export function createEnhancedError(
  code: ErrorCode,
  message: string,
  context: ErrorContext = {},
  retryable: boolean = false,
  originalError?: Error
): EnhancedError {
  const suggestions = generateSuggestions(code, context);

  return {
    code,
    message,
    context,
    suggestions,
    retryable,
    originalError,
    timestamp: new Date(),
  };
}

/**
 * Generate contextual suggestions based on error code and context
 */
function generateSuggestions(code: ErrorCode, context: ErrorContext): string[] {
  const suggestions: string[] = [];

  switch (code) {
    case ErrorCode.BROWSER_CRASHED:
    case ErrorCode.BROWSER_DISCONNECTED:
      suggestions.push('Retry the operation - the browser will automatically relaunch');
      suggestions.push('Check system resources (memory, CPU)');
      suggestions.push('Consider using a different browser type (chromium/firefox/webkit)');
      break;

    case ErrorCode.BROWSER_LAUNCH_FAILED:
      suggestions.push('Ensure Playwright browsers are installed: npx playwright install');
      suggestions.push('Check if another process is using the browser port');
      suggestions.push('Try launching in headless mode');
      break;

    case ErrorCode.SELECTOR_NOT_FOUND:
      suggestions.push(`Wait for the page to fully load before interacting`);
      suggestions.push('Verify the selector is correct: ${context.selector}');
      suggestions.push('Use more specific selectors (data-testid, role, text)');
      suggestions.push('Increase timeout value if the element loads slowly');
      if (context.url) {
        suggestions.push(`Check the page URL: ${context.url}`);
      }
      break;

    case ErrorCode.ELEMENT_NOT_VISIBLE:
      suggestions.push('Wait for the element to become visible');
      suggestions.push('Check if the element is hidden by CSS (display: none, visibility: hidden)');
      suggestions.push('Scroll the element into view before interacting');
      suggestions.push('Use playwright_wait_smart with visible: true condition');
      break;

    case ErrorCode.ELEMENT_NOT_INTERACTABLE:
      suggestions.push('Ensure the element is not disabled or readonly');
      suggestions.push('Check if another element is overlaying the target');
      suggestions.push('Wait for any animations or transitions to complete');
      suggestions.push('Use force: true option to bypass actionability checks (use with caution)');
      break;

    case ErrorCode.TIMEOUT:
    case ErrorCode.NAVIGATION_TIMEOUT:
    case ErrorCode.ACTION_TIMEOUT:
      suggestions.push(`Increase timeout (current: ${context.timeout || 'default'}ms)`);
      suggestions.push('Check network connectivity');
      suggestions.push('Verify the page/element loads correctly in a manual test');
      suggestions.push('Use smart waiting strategies with appropriate conditions');
      break;

    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.REQUEST_FAILED:
      suggestions.push('Check network connectivity');
      suggestions.push('Verify the URL is correct and accessible');
      if (context.requestUrl) {
        suggestions.push(`Failing URL: ${context.requestUrl}`);
      }
      suggestions.push('Check for CORS issues if making cross-origin requests');
      break;

    case ErrorCode.SESSION_NOT_FOUND:
      suggestions.push(`Session '${context.sessionId}' may have expired or been closed`);
      suggestions.push('Create a new session with create_browser_session');
      suggestions.push('List active sessions with list_browser_sessions');
      break;

    case ErrorCode.SESSION_LIMIT_REACHED:
      suggestions.push('Close unused sessions with close_browser_session');
      suggestions.push('Use cleanup_idle_sessions to remove idle sessions');
      suggestions.push('Increase the maximum session limit in configuration');
      break;

    case ErrorCode.RESOURCE_LIMIT_EXCEEDED:
    case ErrorCode.MEMORY_LIMIT_EXCEEDED:
      suggestions.push('Close unused browser sessions');
      suggestions.push('Run cleanup_idle_sessions to free resources');
      suggestions.push('Consider running tests in smaller batches');
      suggestions.push('Increase resource limits in configuration');
      break;

    case ErrorCode.CONCURRENT_LIMIT_REACHED:
      suggestions.push('Wait for other operations to complete');
      suggestions.push('Reduce parallel execution concurrency');
      suggestions.push('Increase the concurrent operation limit in configuration');
      break;

    case ErrorCode.FILE_NOT_FOUND:
      suggestions.push(`Verify the file exists: ${context.filePath}`);
      suggestions.push('Check the file path is absolute and correct');
      suggestions.push('Ensure the file has not been moved or deleted');
      break;

    default:
      suggestions.push('Check the error message for more details');
      suggestions.push('Review the operation parameters');
      suggestions.push('Consult the documentation for this tool');
  }

  return suggestions;
}

/**
 * Classify an error from Playwright and create enhanced error
 */
export function classifyPlaywrightError(error: Error, context: ErrorContext = {}): EnhancedError {
  const message = error.message.toLowerCase();

  // Browser connection errors
  if (message.includes('browser has been closed') || message.includes('browser disconnected')) {
    return createEnhancedError(
      ErrorCode.BROWSER_DISCONNECTED,
      error.message,
      context,
      true, // retryable
      error
    );
  }

  if (message.includes('browser crashed')) {
    return createEnhancedError(
      ErrorCode.BROWSER_CRASHED,
      error.message,
      context,
      true,
      error
    );
  }

  // Page errors
  if (message.includes('target page') || message.includes('page has been closed')) {
    return createEnhancedError(
      ErrorCode.PAGE_CLOSED,
      error.message,
      context,
      true,
      error
    );
  }

  // Element errors
  if (message.includes('waiting for selector') || message.includes('element not found')) {
    return createEnhancedError(
      ErrorCode.SELECTOR_NOT_FOUND,
      error.message,
      context,
      false,
      error
    );
  }

  if (message.includes('not visible') || message.includes('hidden')) {
    return createEnhancedError(
      ErrorCode.ELEMENT_NOT_VISIBLE,
      error.message,
      context,
      false,
      error
    );
  }

  if (message.includes('not enabled') || message.includes('not editable') || message.includes('intercepts pointer events')) {
    return createEnhancedError(
      ErrorCode.ELEMENT_NOT_INTERACTABLE,
      error.message,
      context,
      false,
      error
    );
  }

  if (message.includes('detached')) {
    return createEnhancedError(
      ErrorCode.ELEMENT_DETACHED,
      error.message,
      context,
      true,
      error
    );
  }

  // Timeout errors
  if (message.includes('timeout') && message.includes('navigation')) {
    return createEnhancedError(
      ErrorCode.NAVIGATION_TIMEOUT,
      error.message,
      context,
      false,
      error
    );
  }

  if (message.includes('timeout')) {
    return createEnhancedError(
      ErrorCode.TIMEOUT,
      error.message,
      context,
      false,
      error
    );
  }

  // Network errors
  if (message.includes('net::') || message.includes('network')) {
    return createEnhancedError(
      ErrorCode.NETWORK_ERROR,
      error.message,
      context,
      true,
      error
    );
  }

  // Default to unknown error
  return createEnhancedError(
    ErrorCode.UNKNOWN_ERROR,
    error.message,
    context,
    false,
    error
  );
}

/**
 * Format an enhanced error for display
 */
export function formatEnhancedError(error: EnhancedError): string {
  const lines: string[] = [];

  lines.push(`❌ Error [${error.code}]: ${error.message}`);
  lines.push('');

  // Context information
  if (Object.keys(error.context).length > 0) {
    lines.push('📋 Context:');
    for (const [key, value] of Object.entries(error.context)) {
      if (value !== undefined && value !== null) {
        lines.push(`  • ${key}: ${value}`);
      }
    }
    lines.push('');
  }

  // Suggestions
  if (error.suggestions.length > 0) {
    lines.push('💡 Suggestions:');
    error.suggestions.forEach((suggestion, index) => {
      lines.push(`  ${index + 1}. ${suggestion}`);
    });
    lines.push('');
  }

  // Retry information
  if (error.retryable) {
    lines.push('🔄 This error is retryable. The operation can be attempted again.');
  } else {
    lines.push('⚠️  This error requires investigation before retrying.');
  }

  return lines.join('\n');
}

/**
 * Helper to wrap async operations with enhanced error handling
 */
export async function withEnhancedError<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error) {
      const enhancedError = classifyPlaywrightError(error, context);
      const formattedError = formatEnhancedError(enhancedError);
      throw new Error(formattedError);
    }
    throw error;
  }
}
