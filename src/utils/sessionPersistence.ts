/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Session Persistence System
 * Allows sessions to be saved to disk and recovered after crashes or restarts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserSettings } from '../sessionManager.js';

export interface PersistedSessionData {
  id: string;
  browserType: 'chromium' | 'firefox' | 'webkit';
  settings: BrowserSettings;
  pageUrl: string;
  cookies: any[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  viewport: { width: number; height: number };
  createdAt: string;
  lastAccessedAt: string;
  metadata?: Record<string, any>;
}

export interface SessionRecoveryResult {
  recovered: string[];
  failed: Array<{ id: string; error: string }>;
}

export class SessionPersistence {
  private persistenceDir: string;
  private autoSaveEnabled: boolean = true;
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor(persistenceDir: string = './.playwright-sessions') {
    this.persistenceDir = persistenceDir;
  }

  /**
   * Initialize persistence directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.persistenceDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create persistence directory:', error);
      throw error;
    }
  }

  /**
   * Save a session to disk
   */
  async saveSession(sessionData: PersistedSessionData): Promise<void> {
    await this.initialize();

    const filePath = this.getSessionFilePath(sessionData.id);
    const data = JSON.stringify(sessionData, null, 2);

    try {
      await fs.writeFile(filePath, data, 'utf-8');
      console.log(`Session ${sessionData.id} persisted to disk`);
    } catch (error) {
      console.error(`Failed to persist session ${sessionData.id}:`, error);
      throw error;
    }
  }

  /**
   * Load a session from disk
   */
  async loadSession(sessionId: string): Promise<PersistedSessionData | null> {
    const filePath = this.getSessionFilePath(sessionId);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(data) as PersistedSessionData;
      return sessionData;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      console.error(`Failed to load session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a persisted session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const filePath = this.getSessionFilePath(sessionId);

    try {
      await fs.unlink(filePath);
      console.log(`Persisted session ${sessionId} deleted`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete session ${sessionId}:`, error);
      }
    }
  }

  /**
   * List all persisted sessions
   */
  async listPersistedSessions(): Promise<string[]> {
    try {
      await this.initialize();
      const files = await fs.readdir(this.persistenceDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Failed to list persisted sessions:', error);
      return [];
    }
  }

  /**
   * Load all persisted sessions
   */
  async loadAllSessions(): Promise<PersistedSessionData[]> {
    const sessionIds = await this.listPersistedSessions();
    const sessions: PersistedSessionData[] = [];

    for (const id of sessionIds) {
      try {
        const session = await this.loadSession(id);
        if (session) {
          sessions.push(session);
        }
      } catch (error) {
        console.error(`Failed to load session ${id}:`, error);
      }
    }

    return sessions;
  }

  /**
   * Clean up old persisted sessions
   */
  async cleanupOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const sessions = await this.loadAllSessions();
    const now = Date.now();
    let cleanedCount = 0;

    for (const session of sessions) {
      const lastAccessed = new Date(session.lastAccessedAt).getTime();
      const age = now - lastAccessed;

      if (age > maxAgeMs) {
        await this.deleteSession(session.id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old persisted sessions`);
    }

    return cleanedCount;
  }

  /**
   * Enable auto-save with interval
   */
  startAutoSave(intervalMs: number = 60000): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveEnabled = true;
    console.log(`Auto-save enabled with interval: ${intervalMs}ms`);
  }

  /**
   * Disable auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.autoSaveEnabled = false;
    console.log('Auto-save disabled');
  }

  /**
   * Check if auto-save is enabled
   */
  isAutoSaveEnabled(): boolean {
    return this.autoSaveEnabled;
  }

  /**
   * Get the file path for a session
   */
  private getSessionFilePath(sessionId: string): string {
    return path.join(this.persistenceDir, `${sessionId}.json`);
  }

  /**
   * Export sessions to a backup file
   */
  async exportSessions(exportPath: string): Promise<void> {
    const sessions = await this.loadAllSessions();
    const data = JSON.stringify(sessions, null, 2);

    try {
      await fs.writeFile(exportPath, data, 'utf-8');
      console.log(`Exported ${sessions.length} sessions to ${exportPath}`);
    } catch (error) {
      console.error('Failed to export sessions:', error);
      throw error;
    }
  }

  /**
   * Import sessions from a backup file
   */
  async importSessions(importPath: string): Promise<number> {
    try {
      const data = await fs.readFile(importPath, 'utf-8');
      const sessions = JSON.parse(data) as PersistedSessionData[];

      await this.initialize();

      let importedCount = 0;
      for (const session of sessions) {
        try {
          await this.saveSession(session);
          importedCount++;
        } catch (error) {
          console.error(`Failed to import session ${session.id}:`, error);
        }
      }

      console.log(`Imported ${importedCount} sessions from ${importPath}`);
      return importedCount;
    } catch (error) {
      console.error('Failed to import sessions:', error);
      throw error;
    }
  }

  /**
   * Get statistics about persisted sessions
   */
  async getStatistics(): Promise<{
    total: number;
    byBrowserType: Record<string, number>;
    oldestSession: string | null;
    newestSession: string | null;
    totalSizeBytes: number;
  }> {
    const sessions = await this.loadAllSessions();
    const byBrowserType: Record<string, number> = {};
    let oldestDate = Infinity;
    let newestDate = 0;
    let oldestSession: string | null = null;
    let newestSession: string | null = null;

    for (const session of sessions) {
      // Count by browser type
      byBrowserType[session.browserType] = (byBrowserType[session.browserType] || 0) + 1;

      // Track oldest and newest
      const created = new Date(session.createdAt).getTime();
      if (created < oldestDate) {
        oldestDate = created;
        oldestSession = session.id;
      }
      if (created > newestDate) {
        newestDate = created;
        newestSession = session.id;
      }
    }

    // Calculate total size
    let totalSizeBytes = 0;
    try {
      const files = await fs.readdir(this.persistenceDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.persistenceDir, file);
          const stats = await fs.stat(filePath);
          totalSizeBytes += stats.size;
        }
      }
    } catch (error) {
      console.error('Failed to calculate total size:', error);
    }

    return {
      total: sessions.length,
      byBrowserType,
      oldestSession,
      newestSession,
      totalSizeBytes,
    };
  }
}

// Export singleton instance
export const sessionPersistence = new SessionPersistence();
