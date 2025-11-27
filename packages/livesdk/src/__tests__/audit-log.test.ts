/**
 * Unit tests for Audit Logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger, getAuditLogger, resetAuditLogger } from '../audit-log.js';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    resetAuditLogger();
    logger = new AuditLogger();
  });

  describe('log', () => {
    it('should create audit log entries', () => {
      logger.log('shell', 'orders', 'openOrder', [123], { id: 123 }, undefined, 50);

      const entries = logger.getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].caller).toBe('shell');
      expect(entries[0].module).toBe('orders');
      expect(entries[0].method).toBe('openOrder');
      expect(entries[0].args).toEqual([123]);
      expect(entries[0].result).toEqual({ id: 123 });
      expect(entries[0].duration).toBe(50);
    });

    it('should log errors', () => {
      logger.log('shell', 'orders', 'openOrder', [123], undefined, 'Not found', 10);

      const entries = logger.getEntries();
      expect(entries[0].error).toBe('Not found');
    });

    it('should not log when disabled', () => {
      logger.setEnabled(false);
      logger.log('shell', 'orders', 'openOrder', [123]);

      expect(logger.getEntries()).toHaveLength(0);
    });

    it('should trim old entries when maxEntries is exceeded', () => {
      const smallLogger = new AuditLogger({ maxEntries: 3 });

      smallLogger.log('shell', 'module1', 'method', []);
      smallLogger.log('shell', 'module2', 'method', []);
      smallLogger.log('shell', 'module3', 'method', []);
      smallLogger.log('shell', 'module4', 'method', []);
      smallLogger.log('shell', 'module5', 'method', []);

      const entries = smallLogger.getEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].module).toBe('module3');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      logger.log('shell', 'orders', 'openOrder', [1], { id: 1 }, undefined, 10);
      logger.log('shell', 'orders', 'setStatus', ['shipped'], true, undefined, 5);
      logger.log('admin', 'analytics', 'getSummary', [], {}, undefined, 20);
      logger.log('shell', 'auth', 'login', ['user'], null, 'Failed', 15);
    });

    it('should filter by caller', () => {
      const results = logger.query({ caller: 'shell' });
      expect(results).toHaveLength(3);
    });

    it('should filter by module', () => {
      const results = logger.query({ module: 'orders' });
      expect(results).toHaveLength(2);
    });

    it('should filter by method', () => {
      const results = logger.query({ method: 'openOrder' });
      expect(results).toHaveLength(1);
    });

    it('should filter by errors', () => {
      const results = logger.query({ hasError: true });
      expect(results).toHaveLength(1);
      expect(results[0].method).toBe('login');
    });

    it('should limit results', () => {
      const results = logger.query({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should combine filters', () => {
      const results = logger.query({ caller: 'shell', module: 'orders' });
      expect(results).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      logger.log('shell', 'orders', 'openOrder', [], {}, undefined, 10);
      logger.log('shell', 'orders', 'setStatus', [], {}, undefined, 20);
      logger.log('shell', 'analytics', 'getSummary', [], {}, undefined, 30);
      logger.log('shell', 'orders', 'openOrder', [], null, 'Error', 5);
    });

    it('should calculate total calls', () => {
      const stats = logger.getStats();
      expect(stats.totalCalls).toBe(4);
    });

    it('should calculate error count', () => {
      const stats = logger.getStats();
      expect(stats.errorCount).toBe(1);
    });

    it('should calculate module stats', () => {
      const stats = logger.getStats();
      expect(stats.moduleStats.orders.calls).toBe(3);
      expect(stats.moduleStats.orders.errors).toBe(1);
      expect(stats.moduleStats.analytics.calls).toBe(1);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on new entries', () => {
      const listener = vi.fn();
      logger.addListener(listener);

      logger.log('shell', 'orders', 'openOrder', []);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].module).toBe('orders');
    });

    it('should allow removing listeners', () => {
      const listener = vi.fn();
      logger.addListener(listener);
      logger.removeListener(listener);

      logger.log('shell', 'orders', 'openOrder', []);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('export', () => {
    it('should export entries as JSON', () => {
      logger.log('shell', 'orders', 'openOrder', [123]);

      const exported = logger.export();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].module).toBe('orders');
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const logger1 = getAuditLogger();
      const logger2 = getAuditLogger();
      expect(logger1).toBe(logger2);
    });
  });
});
