/**
 * Audit Log - Central logging for all API calls and module operations
 */

import type { AuditLogEntry } from './types.js';

/**
 * Generate a unique ID for audit entries
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Audit Logger class for tracking all operations
 */
export class AuditLogger {
  private entries: AuditLogEntry[] = [];
  private maxEntries: number = 10000;
  private enabled: boolean = true;
  private listeners: Array<(entry: AuditLogEntry) => void> = [];

  constructor(options?: { maxEntries?: number; enabled?: boolean }) {
    if (options?.maxEntries) {
      this.maxEntries = options.maxEntries;
    }
    if (options?.enabled !== undefined) {
      this.enabled = options.enabled;
    }
  }

  /**
   * Log an API call
   */
  log(
    caller: string,
    module: string,
    method: string,
    args: unknown[],
    result?: unknown,
    error?: string,
    duration: number = 0
  ): AuditLogEntry | null {
    if (!this.enabled) return null;

    const entry: AuditLogEntry = {
      id: generateId(),
      timestamp: new Date(),
      caller,
      module,
      method,
      args,
      result,
      error,
      duration,
    };

    this.entries.push(entry);

    // Trim old entries if needed
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    }

    return entry;
  }

  /**
   * Log the start of an API call (for timing)
   */
  logStart(caller: string, module: string, method: string, args: unknown[]): string {
    const id = generateId();
    if (!this.enabled) return id;

    const entry: AuditLogEntry = {
      id,
      timestamp: new Date(),
      caller,
      module,
      method,
      args,
      duration: -1, // Indicates in-progress
    };

    this.entries.push(entry);
    return id;
  }

  /**
   * Complete a previously started log entry
   */
  logComplete(id: string, result?: unknown, error?: string): void {
    if (!this.enabled) return;

    const entry = this.entries.find((e) => e.id === id);
    if (entry) {
      entry.result = result;
      entry.error = error;
      entry.duration = Date.now() - entry.timestamp.getTime();

      // Notify listeners
      for (const listener of this.listeners) {
        try {
          listener(entry);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  /**
   * Get all audit entries
   */
  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries filtered by criteria
   */
  query(options: {
    caller?: string;
    module?: string;
    method?: string;
    startTime?: Date;
    endTime?: Date;
    hasError?: boolean;
    limit?: number;
  }): AuditLogEntry[] {
    let result = this.entries;

    if (options.caller) {
      result = result.filter((e) => e.caller === options.caller);
    }

    if (options.module) {
      result = result.filter((e) => e.module === options.module);
    }

    if (options.method) {
      result = result.filter((e) => e.method === options.method);
    }

    if (options.startTime) {
      result = result.filter((e) => e.timestamp >= options.startTime!);
    }

    if (options.endTime) {
      result = result.filter((e) => e.timestamp <= options.endTime!);
    }

    if (options.hasError !== undefined) {
      result = result.filter((e) =>
        options.hasError ? !!e.error : !e.error
      );
    }

    if (options.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * Get statistics about logged calls
   */
  getStats(): {
    totalCalls: number;
    errorCount: number;
    moduleStats: Record<string, { calls: number; errors: number; avgDuration: number }>;
  } {
    const stats = {
      totalCalls: this.entries.length,
      errorCount: this.entries.filter((e) => !!e.error).length,
      moduleStats: {} as Record<string, { calls: number; errors: number; avgDuration: number }>,
    };

    for (const entry of this.entries) {
      if (!stats.moduleStats[entry.module]) {
        stats.moduleStats[entry.module] = { calls: 0, errors: 0, avgDuration: 0 };
      }

      const moduleStats = stats.moduleStats[entry.module];
      moduleStats.calls++;
      if (entry.error) moduleStats.errors++;
      if (entry.duration > 0) {
        moduleStats.avgDuration =
          (moduleStats.avgDuration * (moduleStats.calls - 1) + entry.duration) /
          moduleStats.calls;
      }
    }

    return stats;
  }

  /**
   * Add a listener for new audit entries
   */
  addListener(listener: (entry: AuditLogEntry) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(listener: (entry: AuditLogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Export entries as JSON
   */
  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

// Singleton instance
let auditLoggerInstance: AuditLogger | null = null;

/**
 * Get the global audit logger instance
 */
export function getAuditLogger(): AuditLogger {
  if (!auditLoggerInstance) {
    auditLoggerInstance = new AuditLogger();
  }
  return auditLoggerInstance;
}

/**
 * Reset the audit logger (useful for testing)
 */
export function resetAuditLogger(): void {
  if (auditLoggerInstance) {
    auditLoggerInstance.clear();
  }
  auditLoggerInstance = null;
}
