/**
 * Author: Tayyab Akmal
 * Linkedin: https://www.linkedin.com/in/tayyab-sqa-engineer/
 */

/**
 * Resource Manager - Handles resource limits, throttling, and queue management
 */

import { ErrorCode, createEnhancedError } from './errorContext.js';

export interface ResourceConfig {
  maxConcurrentBrowsers: number;
  maxSessionsPerUser: number;
  maxTotalSessions: number;
  sessionIdleTimeout: number; // milliseconds
  queueTimeout: number; // milliseconds
  maxQueueSize: number;
  memoryLimitMB?: number;
  enableAutoCleanup: boolean;
  cleanupInterval: number; // milliseconds
}

export interface ResourceUsage {
  activeBrowsers: number;
  activeSessions: number;
  queuedRequests: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
}

export interface QueuedOperation {
  id: string;
  type: 'browser_launch' | 'session_create';
  userId?: string;
  priority: number;
  createdAt: Date;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

/**
 * Resource Manager - Enforces resource limits and manages operation queue
 */
export class ResourceManager {
  private config: ResourceConfig;
  private activeBrowsers = 0;
  private activeSessions = 0;
  private sessionsByUser = new Map<string, number>();
  private queue: QueuedOperation[] = [];
  private nextOperationId = 1;
  private cleanupInterval?: NodeJS.Timeout;
  private processing = false;

  constructor(config?: Partial<ResourceConfig>) {
    this.config = {
      maxConcurrentBrowsers: config?.maxConcurrentBrowsers ?? 5,
      maxSessionsPerUser: config?.maxSessionsPerUser ?? 3,
      maxTotalSessions: config?.maxTotalSessions ?? 10,
      sessionIdleTimeout: config?.sessionIdleTimeout ?? 3600000, // 1 hour
      queueTimeout: config?.queueTimeout ?? 300000, // 5 minutes
      maxQueueSize: config?.maxQueueSize ?? 50,
      memoryLimitMB: config?.memoryLimitMB,
      enableAutoCleanup: config?.enableAutoCleanup ?? true,
      cleanupInterval: config?.cleanupInterval ?? 300000, // 5 minutes
    };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Request a browser launch with resource limits enforcement
   */
  async requestBrowserLaunch(userId?: string, priority: number = 0): Promise<void> {
    // Check if we've reached the limit
    if (this.activeBrowsers >= this.config.maxConcurrentBrowsers) {
      // Check queue size
      if (this.queue.length >= this.config.maxQueueSize) {
        const error = createEnhancedError(
          ErrorCode.CONCURRENT_LIMIT_REACHED,
          `Queue is full (${this.queue.length}/${this.config.maxQueueSize}). Please try again later.`,
          { queueSize: this.queue.length, maxQueueSize: this.config.maxQueueSize },
          true
        );
        throw new Error(error.message);
      }

      // Add to queue
      return this.enqueue('browser_launch', userId, priority);
    }

    // Check user-specific limit
    if (userId && this.sessionsByUser.get(userId)! >= this.config.maxSessionsPerUser) {
      const error = createEnhancedError(
        ErrorCode.SESSION_LIMIT_REACHED,
        `User '${userId}' has reached the session limit (${this.config.maxSessionsPerUser})`,
        { userId, currentSessions: this.sessionsByUser.get(userId), limit: this.config.maxSessionsPerUser },
        false
      );
      throw new Error(error.message);
    }

    // Grant immediately
    this.activeBrowsers++;
    if (userId) {
      this.sessionsByUser.set(userId, (this.sessionsByUser.get(userId) || 0) + 1);
    }
  }

  /**
   * Release a browser resource
   */
  async releaseBrowser(userId?: string): Promise<void> {
    this.activeBrowsers = Math.max(0, this.activeBrowsers - 1);

    if (userId) {
      const count = this.sessionsByUser.get(userId) || 0;
      if (count > 1) {
        this.sessionsByUser.set(userId, count - 1);
      } else {
        this.sessionsByUser.delete(userId);
      }
    }

    // Process next in queue
    await this.processQueue();
  }

  /**
   * Add operation to queue
   */
  private async enqueue(
    type: 'browser_launch' | 'session_create',
    userId?: string,
    priority: number = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = `op-${this.nextOperationId++}`;
      const createdAt = new Date();

      // Set timeout
      const timeout = setTimeout(() => {
        this.removeFromQueue(id);
        const error = createEnhancedError(
          ErrorCode.TIMEOUT,
          `Operation ${id} timed out after ${this.config.queueTimeout}ms in queue`,
          { operationId: id, type, queueTimeout: this.config.queueTimeout },
          true
        );
        reject(new Error(error.message));
      }, this.config.queueTimeout);

      const operation: QueuedOperation = {
        id,
        type,
        userId,
        priority,
        createdAt,
        resolve,
        reject,
        timeout,
      };

      this.queue.push(operation);

      // Sort by priority (higher first) and creation time
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      console.log(`Operation ${id} queued (position: ${this.queue.findIndex(op => op.id === id) + 1}/${this.queue.length})`);
    });
  }

  /**
   * Process next operation in queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeBrowsers < this.config.maxConcurrentBrowsers) {
        const operation = this.queue.shift();
        if (!operation) break;

        // Clear timeout
        if (operation.timeout) {
          clearTimeout(operation.timeout);
        }

        // Check user-specific limit
        if (operation.userId) {
          const userSessions = this.sessionsByUser.get(operation.userId) || 0;
          if (userSessions >= this.config.maxSessionsPerUser) {
            const error = createEnhancedError(
              ErrorCode.SESSION_LIMIT_REACHED,
              `User '${operation.userId}' has reached the session limit`,
              { userId: operation.userId },
              false
            );
            operation.reject(new Error(error.message));
            continue;
          }
        }

        // Grant resource
        this.activeBrowsers++;
        if (operation.userId) {
          this.sessionsByUser.set(operation.userId, (this.sessionsByUser.get(operation.userId) || 0) + 1);
        }

        console.log(`Operation ${operation.id} granted (waited ${Date.now() - operation.createdAt.getTime()}ms)`);
        operation.resolve(undefined);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Remove an operation from the queue
   */
  private removeFromQueue(operationId: string): void {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index !== -1) {
      const operation = this.queue.splice(index, 1)[0];
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
    }
  }

  /**
   * Increment active sessions counter
   */
  incrementSessions(): void {
    this.activeSessions++;
  }

  /**
   * Decrement active sessions counter
   */
  decrementSessions(): void {
    this.activeSessions = Math.max(0, this.activeSessions - 1);
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ResourceUsage {
    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    return {
      activeBrowsers: this.activeBrowsers,
      activeSessions: this.activeSessions,
      queuedRequests: this.queue.length,
      memoryUsageMB,
      cpuUsagePercent: 0, // Would need external library for accurate CPU usage
    };
  }

  /**
   * Check if memory limit is exceeded
   */
  isMemoryLimitExceeded(): boolean {
    if (!this.config.memoryLimitMB) {
      return false;
    }

    const usage = this.getResourceUsage();
    return usage.memoryUsageMB > this.config.memoryLimitMB;
  }

  /**
   * Get configuration
   */
  getConfig(): ResourceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ResourceConfig>): void {
    this.config = { ...this.config, ...updates };

    // Restart auto-cleanup if setting changed
    if (updates.enableAutoCleanup !== undefined || updates.cleanupInterval !== undefined) {
      this.stopAutoCleanup();
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      }
    }
  }

  /**
   * Start auto-cleanup interval
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const usage = this.getResourceUsage();
      console.log(`[ResourceManager] Periodic check - Active: ${usage.activeBrowsers} browsers, ${usage.activeSessions} sessions, Queue: ${usage.queuedRequests}, Memory: ${usage.memoryUsageMB}MB`);

      if (this.isMemoryLimitExceeded()) {
        console.warn(`[ResourceManager] Memory limit exceeded: ${usage.memoryUsageMB}MB / ${this.config.memoryLimitMB}MB`);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop auto-cleanup interval
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): Array<{
    id: string;
    type: string;
    userId?: string;
    priority: number;
    waitTimeMs: number;
  }> {
    const now = Date.now();
    return this.queue.map(op => ({
      id: op.id,
      type: op.type,
      userId: op.userId,
      priority: op.priority,
      waitTimeMs: now - op.createdAt.getTime(),
    }));
  }

  /**
   * Clear the queue
   */
  clearQueue(): number {
    const count = this.queue.length;
    this.queue.forEach(op => {
      if (op.timeout) {
        clearTimeout(op.timeout);
      }
      op.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    return count;
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    this.stopAutoCleanup();
    this.clearQueue();
  }
}

// Export singleton instance with default configuration
export const resourceManager = new ResourceManager();
