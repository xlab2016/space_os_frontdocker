/**
 * Unit tests for LiveSDK Host
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LiveSDKHost, resetLiveSDKHost } from '../livesdk-host.js';
import { resetPermissionsManager } from '../permissions.js';
import { resetAuditLogger } from '../audit-log.js';
import type { ModuleManifest } from '../types.js';

describe('LiveSDKHost', () => {
  let host: LiveSDKHost;

  // Mock module with API
  const mockModule = {
    FrontContainer: () => null,
    api: {
      testMethod: vi.fn().mockResolvedValue('test result'),
      failingMethod: vi.fn().mockRejectedValue(new Error('Test error')),
    },
    manifest: {
      name: 'test-module',
      version: '1.0.0',
    },
  };

  // Mock import function
  const mockImportFn = vi.fn().mockResolvedValue(mockModule);

  beforeEach(() => {
    resetLiveSDKHost();
    resetPermissionsManager();
    resetAuditLogger();
    vi.clearAllMocks();

    host = new LiveSDKHost({
      debug: false,
      auditEnabled: true,
      importFn: mockImportFn,
    });
  });

  describe('registerModuleManifest', () => {
    it('should register a module manifest', () => {
      const manifest: ModuleManifest = {
        name: 'test',
        version: '1.0.0',
        url: 'http://localhost/test.js',
        components: ['TestComponent'],
        api: {
          testMethod: { args: [], returns: 'string' },
        },
      };

      host.registerModuleManifest(manifest);

      const manifests = host.getManifests();
      expect(manifests).toHaveLength(1);
      expect(manifests[0].name).toBe('test');
    });

    it('should update registry status to pending', () => {
      const manifest: ModuleManifest = {
        name: 'test',
        version: '1.0.0',
        url: 'http://localhost/test.js',
        components: [],
        api: {},
      };

      host.registerModuleManifest(manifest);

      const registry = host.getRegistry();
      expect(registry.get('test')?.status).toBe('pending');
    });
  });

  describe('loadMFE', () => {
    it('should load a module and register its API', async () => {
      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: ['FrontContainer'],
        api: {
          testMethod: { args: [], returns: 'string' },
        },
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);

      expect(mockImportFn).toHaveBeenCalledWith(manifest.url);
      expect(host.isLoaded('test-module')).toBe(true);
    });

    it('should update registry status to loaded', async () => {
      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: [],
        api: {},
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);

      expect(host.getStatus('test-module')).toBe('loaded');
    });

    it('should handle load errors gracefully', async () => {
      const errorImportFn = vi.fn().mockRejectedValue(new Error('Load failed'));
      const errorHost = new LiveSDKHost({ importFn: errorImportFn });

      const manifest: ModuleManifest = {
        name: 'failing-module',
        version: '1.0.0',
        url: 'http://localhost/fail.js',
        components: [],
        api: {},
      };

      errorHost.registerModuleManifest(manifest);

      await expect(errorHost.loadMFE(manifest.url)).rejects.toThrow('Load failed');
      expect(errorHost.getStatus('failing-module')).toBe('error');
    });
  });

  describe('call', () => {
    beforeEach(async () => {
      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: [],
        api: {
          testMethod: { args: [], returns: 'string' },
        },
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);
    });

    it('should call API methods successfully', async () => {
      const result = await host.call('test-module', 'testMethod', []);
      expect(result).toBe('test result');
      expect(mockModule.api.testMethod).toHaveBeenCalled();
    });

    it('should log API calls to audit log', async () => {
      await host.call('test-module', 'testMethod', ['arg1', 'arg2']);

      const auditLog = host.getAuditLog();
      expect(auditLog.length).toBeGreaterThan(0);

      const lastEntry = auditLog[auditLog.length - 1];
      expect(lastEntry.module).toBe('test-module');
      expect(lastEntry.method).toBe('testMethod');
    });

    it('should throw error for non-existent module', async () => {
      await expect(host.call('non-existent', 'method', [])).rejects.toThrow(
        "Module 'non-existent' not found"
      );
    });

    it('should throw error for non-existent method', async () => {
      await expect(host.call('test-module', 'nonExistent', [])).rejects.toThrow(
        "Method 'nonExistent' not found"
      );
    });
  });

  describe('unloadMFE', () => {
    it('should unload a module', async () => {
      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: [],
        api: {},
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);

      expect(host.isLoaded('test-module')).toBe(true);

      await host.unloadMFE('test-module');

      expect(host.isLoaded('test-module')).toBe(false);
      expect(host.getStatus('test-module')).toBe('pending');
    });
  });

  describe('event handling', () => {
    it('should emit events when modules are loaded', async () => {
      const handler = vi.fn();
      host.on('module:loaded', handler);

      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: [],
        api: {},
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].payload.name).toBe('test-module');
    });

    it('should allow unsubscribing from events', async () => {
      const handler = vi.fn();
      const unsubscribe = host.on('module:loaded', handler);

      unsubscribe();

      const manifest: ModuleManifest = {
        name: 'test-module',
        version: '1.0.0',
        url: 'http://localhost/test-module.js',
        components: [],
        api: {},
      };

      host.registerModuleManifest(manifest);
      await host.loadMFE(manifest.url);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
