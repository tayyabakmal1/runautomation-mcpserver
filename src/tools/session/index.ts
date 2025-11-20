/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse, ToolHandler } from '../common/types.js';
import { sessionManager, BrowserSettings } from '../../sessionManager.js';

/**
 * Tool for creating a new browser session
 */
export class CreateSessionTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const { sessionId, browserType, headless, viewport, userAgent, locale, timezoneId, geolocation, permissions } = args;

      const settings: BrowserSettings = {
        browserType: browserType || 'chromium',
        headless: headless !== undefined ? headless : true,
      };

      if (viewport) {
        settings.viewport = viewport;
      }
      if (userAgent) {
        settings.userAgent = userAgent;
      }
      if (locale) {
        settings.locale = locale;
      }
      if (timezoneId) {
        settings.timezoneId = timezoneId;
      }
      if (geolocation) {
        settings.geolocation = geolocation;
      }
      if (permissions) {
        settings.permissions = permissions;
      }

      const id = await sessionManager.createSession(sessionId, settings);

      return createSuccessResponse([
        `Browser session created successfully`,
        `Session ID: ${id}`,
        `Browser: ${settings.browserType}`,
        `Headless: ${settings.headless}`,
        viewport ? `Viewport: ${viewport.width}x${viewport.height}` : '',
      ].filter(Boolean));

    } catch (error) {
      return createErrorResponse(`Failed to create session: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for listing all active browser sessions
 */
export class ListSessionsTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const sessions = sessionManager.listSessions();

      if (sessions.length === 0) {
        return createSuccessResponse('No active sessions');
      }

      const output = [
        `=== Active Browser Sessions (${sessions.length}) ===`,
        '',
        ...sessions.map(session => {
          const idle = new Date().getTime() - session.lastAccessedAt.getTime();
          const idleMinutes = Math.floor(idle / 60000);
          return [
            `Session ID: ${session.id}`,
            `  Browser: ${session.browserType}`,
            `  Current URL: ${session.pageUrl}`,
            `  Created: ${session.createdAt.toLocaleString()}`,
            `  Last accessed: ${idleMinutes}m ago`,
            '',
          ].join('\n');
        }),
      ];

      return createSuccessResponse(output);

    } catch (error) {
      return createErrorResponse(`Failed to list sessions: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for closing a browser session
 */
export class CloseSessionTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const { sessionId } = args;

      if (!sessionId) {
        return createErrorResponse('sessionId parameter is required');
      }

      if (!sessionManager.hasSession(sessionId)) {
        return createErrorResponse(`Session '${sessionId}' not found`);
      }

      await sessionManager.closeSession(sessionId);

      return createSuccessResponse(`Session '${sessionId}' closed successfully`);

    } catch (error) {
      return createErrorResponse(`Failed to close session: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for switching to a different browser session
 */
export class SwitchSessionTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const { sessionId } = args;

      if (!sessionId) {
        return createErrorResponse('sessionId parameter is required');
      }

      const session = sessionManager.getSession(sessionId);

      if (!session) {
        return createErrorResponse(`Session '${sessionId}' not found`);
      }

      // Update context to use this session
      context.page = session.page;
      context.browser = session.browser;

      return createSuccessResponse([
        `Switched to session: ${sessionId}`,
        `Browser: ${session.browserType}`,
        `Current URL: ${session.page.url()}`,
      ]);

    } catch (error) {
      return createErrorResponse(`Failed to switch session: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for getting information about a specific session
 */
export class GetSessionInfoTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const { sessionId } = args;

      if (!sessionId) {
        return createErrorResponse('sessionId parameter is required');
      }

      const session = sessionManager.getSession(sessionId);

      if (!session) {
        return createErrorResponse(`Session '${sessionId}' not found`);
      }

      const idle = new Date().getTime() - session.lastAccessedAt.getTime();
      const idleMinutes = Math.floor(idle / 60000);
      const uptime = new Date().getTime() - session.createdAt.getTime();
      const uptimeMinutes = Math.floor(uptime / 60000);

      return createSuccessResponse([
        `Session Information: ${sessionId}`,
        `Browser: ${session.browserType}`,
        `Current URL: ${session.page.url()}`,
        `Page Title: ${await session.page.title()}`,
        `Created: ${session.createdAt.toLocaleString()}`,
        `Uptime: ${uptimeMinutes} minutes`,
        `Last accessed: ${idleMinutes} minutes ago`,
        `Console logs: ${session.consoleLog.length} entries`,
        `Screenshots: ${session.screenshots.size}`,
        `Browser connected: ${session.browser.isConnected() ? 'Yes' : 'No'}`,
      ]);

    } catch (error) {
      return createErrorResponse(`Failed to get session info: ${(error as Error).message}`);
    }
  }
}

/**
 * Tool for cleaning up idle sessions
 */
export class CleanupIdleSessionsTool implements ToolHandler {
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    try {
      const { maxIdleMinutes = 60 } = args;
      const maxIdleTimeMs = maxIdleMinutes * 60000;

      const cleanedCount = await sessionManager.cleanupIdleSessions(maxIdleTimeMs);

      return createSuccessResponse([
        `Cleanup complete`,
        `Sessions closed: ${cleanedCount}`,
        `Active sessions remaining: ${sessionManager.getSessionCount()}`,
      ]);

    } catch (error) {
      return createErrorResponse(`Failed to cleanup sessions: ${(error as Error).message}`);
    }
  }
}
