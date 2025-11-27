/**
 * Unit tests for Permissions Manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PermissionsManager,
  getPermissionsManager,
  resetPermissionsManager,
} from '../permissions.js';

describe('PermissionsManager', () => {
  let pm: PermissionsManager;

  beforeEach(() => {
    resetPermissionsManager();
    pm = new PermissionsManager();
  });

  describe('canCallModule', () => {
    it('should allow shell to access any module', () => {
      const result = pm.canCallModule('shell', 'orders', 'openOrder');
      expect(result.allowed).toBe(true);
    });

    it('should allow empty caller (shell) to access any module', () => {
      const result = pm.canCallModule('', 'orders', 'openOrder');
      expect(result.allowed).toBe(true);
    });

    it('should deny access when no permissions are configured', () => {
      const result = pm.canCallModule('orders', 'analytics', 'getSummary');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no permissions configured');
    });

    it('should allow access to globally allowed modules', () => {
      pm.setGlobalAllowedModules(['shared-utils']);

      const result = pm.canCallModule('orders', 'shared-utils', 'formatDate');
      expect(result.allowed).toBe(true);
    });

    it('should allow access when module is in allowedModules', () => {
      pm.registerModulePermissions('orders', {
        allowedModules: ['auth', 'analytics'],
      });

      const result1 = pm.canCallModule('orders', 'auth', 'login');
      expect(result1.allowed).toBe(true);

      const result2 = pm.canCallModule('orders', 'analytics', 'getSummary');
      expect(result2.allowed).toBe(true);
    });

    it('should deny access when module is not in allowedModules', () => {
      pm.registerModulePermissions('orders', {
        allowedModules: ['auth'],
      });

      const result = pm.canCallModule('orders', 'analytics', 'getSummary');
      expect(result.allowed).toBe(false);
    });

    it('should support wildcard in allowedModules', () => {
      pm.registerModulePermissions('admin', {
        allowedModules: ['*'],
      });

      const result = pm.canCallModule('admin', 'any-module', 'anyMethod');
      expect(result.allowed).toBe(true);
    });

    it('should support prefix wildcards in allowedModules', () => {
      pm.registerModulePermissions('reporting', {
        allowedModules: ['analytics*'],
      });

      const result1 = pm.canCallModule('reporting', 'analytics', 'getSummary');
      expect(result1.allowed).toBe(true);

      const result2 = pm.canCallModule('reporting', 'analytics-v2', 'getStats');
      expect(result2.allowed).toBe(true);

      const result3 = pm.canCallModule('reporting', 'orders', 'getOrders');
      expect(result3.allowed).toBe(false);
    });
  });

  describe('requiresAuth', () => {
    it('should return false by default', () => {
      expect(pm.requiresAuth('orders')).toBe(false);
    });

    it('should return true when configured', () => {
      pm.registerModulePermissions('admin', {
        requiresAuth: true,
      });

      expect(pm.requiresAuth('admin')).toBe(true);
    });
  });

  describe('validateManifestPermissions', () => {
    it('should warn about wildcard module access', () => {
      const manifest = {
        name: 'dangerous',
        version: '1.0.0',
        url: 'http://localhost/dangerous.js',
        components: [],
        api: {},
        permissions: {
          allowedModules: ['*'],
        },
      };

      const warnings = pm.validateManifestPermissions(manifest);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('access to all modules');
    });

    it('should warn about wildcard action access', () => {
      const manifest = {
        name: 'dangerous',
        version: '1.0.0',
        url: 'http://localhost/dangerous.js',
        components: [],
        api: {},
        permissions: {
          allowedActions: ['*'],
        },
      };

      const warnings = pm.validateManifestPermissions(manifest);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('all actions');
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const pm1 = getPermissionsManager();
      const pm2 = getPermissionsManager();
      expect(pm1).toBe(pm2);
    });

    it('should reset correctly', () => {
      const pm1 = getPermissionsManager();
      pm1.registerModulePermissions('test', { allowedModules: ['auth'] });

      resetPermissionsManager();

      const pm2 = getPermissionsManager();
      expect(pm2.getModulePermissions('test')).toBeUndefined();
    });
  });
});
