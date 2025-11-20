/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

import { Browser, Page, Response } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';
import { sessionPersistence, PersistedSessionData } from './utils/sessionPersistence.js';

/**
 * Represents a browser session with its own context and state
 */
export interface BrowserSession {
  id: string;
  browser: Browser;
  page: Page;
  browserType: 'chromium' | 'firefox' | 'webkit';
  consoleLog: string[];
  screenshots: Map<string, string>;
  responsePromises: Map<string, Promise<Response>>;
  createdAt: Date;
  lastAccessedAt: Date;
  settings?: BrowserSettings;
}

/**
 * Browser settings for launching a new session
 */
export interface BrowserSettings {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  permissions?: string[];
}

/**
 * Manages multiple browser sessions with isolated contexts
 */
export class SessionManager {
  private sessions = new Map<string, BrowserSession>();
  private defaultSessionId = 'default';
  private nextSessionId = 1;

  /**
   * Create a new browser session
   * @param sessionId Optional custom session ID. If not provided, auto-generates one
   * @param settings Browser launch settings
   * @returns Session ID
   */
  async createSession(sessionId?: string, settings?: BrowserSettings): Promise<string> {
    const id = sessionId || `session-${this.nextSessionId++}`;

    // Check if session already exists
    if (this.sessions.has(id)) {
      throw new Error(`Session with ID '${id}' already exists`);
    }

    // Default settings
    const browserType = settings?.browserType || 'chromium';
    const headless = settings?.headless !== undefined ? settings.headless : true;
    const viewport = settings?.viewport || { width: 1280, height: 720 };

    // Launch browser based on type
    let browser: Browser;
    if (browserType === 'chromium') {
      browser = await chromium.launch({ headless });
    } else if (browserType === 'firefox') {
      browser = await firefox.launch({ headless });
    } else if (browserType === 'webkit') {
      browser = await webkit.launch({ headless });
    } else {
      throw new Error(`Unknown browser type: ${browserType}`);
    }

    // Create browser context with settings
    const contextOptions: any = {
      viewport,
    };

    if (settings?.userAgent) {
      contextOptions.userAgent = settings.userAgent;
    }
    if (settings?.locale) {
      contextOptions.locale = settings.locale;
    }
    if (settings?.timezoneId) {
      contextOptions.timezoneId = settings.timezoneId;
    }
    if (settings?.geolocation) {
      contextOptions.geolocation = settings.geolocation;
    }
    if (settings?.permissions) {
      contextOptions.permissions = settings.permissions;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Setup console logging
    const consoleLog: string[] = [];
    page.on('console', (msg) => {
      const logEntry = `[${new Date().toISOString()}] ${msg.type()}: ${msg.text()}`;
      consoleLog.push(logEntry);
    });

    page.on('pageerror', (error) => {
      const logEntry = `[${new Date().toISOString()}] ERROR: ${error.message}`;
      consoleLog.push(logEntry);
    });

    // Setup browser disconnection handler
    browser.on('disconnected', () => {
      this.sessions.delete(id);
      console.log(`Session ${id} browser disconnected, session removed`);
    });

    // Create session object
    const session: BrowserSession = {
      id,
      browser,
      page,
      browserType,
      consoleLog,
      screenshots: new Map(),
      responsePromises: new Map(),
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      settings,
    };

    this.sessions.set(id, session);
    console.log(`Session ${id} created (browser: ${browserType})`);

    // Persist session to disk
    await this.persistSession(session);

    return id;
  }

  /**
   * Get a browser session by ID
   * @param sessionId Session ID. If not provided, uses default session
   * @returns Browser session
   */
  getSession(sessionId?: string): BrowserSession | null {
    const id = sessionId || this.defaultSessionId;
    const session = this.sessions.get(id);

    if (session) {
      session.lastAccessedAt = new Date();
    }

    return session || null;
  }

  /**
   * Ensure a session exists, creating it if necessary
   * @param sessionId Optional session ID
   * @param settings Browser settings for new session
   * @returns Browser session
   */
  async ensureSession(sessionId?: string, settings?: BrowserSettings): Promise<BrowserSession> {
    const id = sessionId || this.defaultSessionId;
    let session = this.getSession(id);

    if (!session) {
      // Create new session
      await this.createSession(id, settings);
      session = this.getSession(id);
    }

    if (!session) {
      throw new Error(`Failed to create session ${id}`);
    }

    // Verify browser is still connected
    if (!session.browser.isConnected()) {
      // Browser disconnected, remove and recreate
      this.sessions.delete(id);
      await this.createSession(id, settings);
      session = this.getSession(id);
    }

    if (!session) {
      throw new Error(`Failed to recreate session ${id}`);
    }

    return session;
  }

  /**
   * Close a browser session and cleanup resources
   * @param sessionId Session ID
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session '${sessionId}' not found`);
    }

    try {
      // Close all pages
      const pages = session.browser.contexts().flatMap(ctx => ctx.pages());
      await Promise.all(pages.map(page => page.close().catch(() => {})));

      // Close browser
      await session.browser.close();
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    } finally {
      this.sessions.delete(sessionId);
      console.log(`Session ${sessionId} closed`);
    }
  }

  /**
   * Close all browser sessions
   */
  async closeAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map(id => this.closeSession(id).catch(() => {})));
  }

  /**
   * List all active sessions
   * @returns Array of session information
   */
  listSessions(): Array<{
    id: string;
    browserType: string;
    createdAt: Date;
    lastAccessedAt: Date;
    pageUrl: string;
  }> {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      browserType: session.browserType,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      pageUrl: session.page.url(),
    }));
  }

  /**
   * Check if a session exists
   * @param sessionId Session ID
   * @returns True if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get the default session ID
   * @returns Default session ID
   */
  getDefaultSessionId(): string {
    return this.defaultSessionId;
  }

  /**
   * Get total number of active sessions
   * @returns Number of sessions
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clean up idle sessions older than the specified time
   * @param maxIdleTimeMs Maximum idle time in milliseconds
   */
  async cleanupIdleSessions(maxIdleTimeMs: number = 3600000): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      const idleTime = now.getTime() - session.lastAccessedAt.getTime();

      if (idleTime > maxIdleTimeMs && id !== this.defaultSessionId) {
        await this.closeSession(id).catch(() => {});
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} idle sessions`);
    }

    return cleanedCount;
  }

  /**
   * Persist a session to disk
   * @param session Browser session to persist
   */
  private async persistSession(session: BrowserSession): Promise<void> {
    try {
      const cookies = await session.page.context().cookies();

      // Get localStorage and sessionStorage
      const storageData = await session.page.evaluate(() => {
        const local: Record<string, string> = {};
        const sessionStore: Record<string, string> = {};

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            local[key] = localStorage.getItem(key) || '';
          }
        }

        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            sessionStore[key] = sessionStorage.getItem(key) || '';
          }
        }

        return { local, sessionStore };
      }).catch(() => ({ local: {}, sessionStore: {} }));

      const viewport = session.page.viewportSize() || { width: 1280, height: 720 };

      const persistedData: PersistedSessionData = {
        id: session.id,
        browserType: session.browserType,
        settings: session.settings || {},
        pageUrl: session.page.url(),
        cookies,
        localStorage: storageData.local,
        sessionStorage: storageData.sessionStore,
        viewport,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: session.lastAccessedAt.toISOString(),
      };

      await sessionPersistence.saveSession(persistedData);
    } catch (error) {
      console.error(`Failed to persist session ${session.id}:`, error);
      // Don't throw - persistence is optional
    }
  }

  /**
   * Recover a session from disk
   * @param sessionId Session ID to recover
   * @returns Session ID if successful
   */
  async recoverSession(sessionId: string): Promise<string | null> {
    try {
      const persistedData = await sessionPersistence.loadSession(sessionId);

      if (!persistedData) {
        console.log(`No persisted data found for session ${sessionId}`);
        return null;
      }

      // Create new session with persisted settings
      const newSessionId = await this.createSession(sessionId, persistedData.settings);
      const session = this.getSession(newSessionId);

      if (!session) {
        return null;
      }

      // Navigate to saved URL
      if (persistedData.pageUrl && persistedData.pageUrl !== 'about:blank') {
        await session.page.goto(persistedData.pageUrl);
      }

      // Restore cookies
      if (persistedData.cookies && persistedData.cookies.length > 0) {
        await session.page.context().addCookies(persistedData.cookies);
      }

      // Restore localStorage and sessionStorage
      if (persistedData.localStorage || persistedData.sessionStorage) {
        await session.page.evaluate((data) => {
          if (data.local) {
            for (const [key, value] of Object.entries(data.local)) {
              localStorage.setItem(key, value);
            }
          }
          if (data.session) {
            for (const [key, value] of Object.entries(data.session)) {
              sessionStorage.setItem(key, value);
            }
          }
        }, { local: persistedData.localStorage, session: persistedData.sessionStorage });
      }

      console.log(`Session ${sessionId} recovered successfully`);
      return sessionId;
    } catch (error) {
      console.error(`Failed to recover session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Recover all persisted sessions
   * @returns Array of recovered session IDs and failed sessions
   */
  async recoverAllSessions(): Promise<{ recovered: string[]; failed: Array<{ id: string; error: string }> }> {
    const persistedSessions = await sessionPersistence.loadAllSessions();
    const recovered: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const persistedData of persistedSessions) {
      try {
        const sessionId = await this.recoverSession(persistedData.id);
        if (sessionId) {
          recovered.push(sessionId);
        } else {
          failed.push({ id: persistedData.id, error: 'Recovery returned null' });
        }
      } catch (error: any) {
        failed.push({ id: persistedData.id, error: error.message });
      }
    }

    console.log(`Recovery complete: ${recovered.length} recovered, ${failed.length} failed`);
    return { recovered, failed };
  }

  /**
   * Delete persisted session data
   * @param sessionId Session ID
   */
  async deletePersistedSession(sessionId: string): Promise<void> {
    await sessionPersistence.deleteSession(sessionId);
  }

  /**
   * Get persistence statistics
   */
  async getPersistenceStatistics(): Promise<any> {
    return await sessionPersistence.getStatistics();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
