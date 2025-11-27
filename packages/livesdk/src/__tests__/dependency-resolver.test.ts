/**
 * Unit tests for Dependency Resolver
 */

import { describe, it, expect } from 'vitest';
import {
  resolveDependencies,
  areDependenciesSatisfied,
  parseVersion,
  parseDependency,
  satisfiesRange,
} from '../dependency-resolver.js';
import type { ModuleManifest } from '../types.js';

describe('parseVersion', () => {
  it('should parse valid semver versions', () => {
    expect(parseVersion('1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseVersion('2.3.4')).toEqual({ major: 2, minor: 3, patch: 4 });
    expect(parseVersion('10.20.30')).toEqual({ major: 10, minor: 20, patch: 30 });
  });

  it('should return null for invalid versions', () => {
    expect(parseVersion('invalid')).toBeNull();
    expect(parseVersion('1.0')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('parseDependency', () => {
  it('should parse dependency with version range', () => {
    expect(parseDependency('auth@^1.0.0')).toEqual({ name: 'auth', range: '^1.0.0' });
    expect(parseDependency('orders@~2.3.0')).toEqual({ name: 'orders', range: '~2.3.0' });
  });

  it('should parse dependency without version range', () => {
    expect(parseDependency('auth')).toEqual({ name: 'auth', range: '*' });
  });
});

describe('satisfiesRange', () => {
  it('should accept wildcard ranges', () => {
    expect(satisfiesRange('1.0.0', '*')).toBe(true);
    expect(satisfiesRange('2.5.3', 'latest')).toBe(true);
  });

  it('should handle caret (^) ranges correctly', () => {
    // ^1.0.0 allows 1.x.x
    expect(satisfiesRange('1.0.0', '^1.0.0')).toBe(true);
    expect(satisfiesRange('1.5.0', '^1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.5', '^1.0.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
    expect(satisfiesRange('0.9.0', '^1.0.0')).toBe(false);
  });

  it('should handle tilde (~) ranges correctly', () => {
    // ~1.2.0 allows 1.2.x
    expect(satisfiesRange('1.2.0', '~1.2.0')).toBe(true);
    expect(satisfiesRange('1.2.5', '~1.2.0')).toBe(true);
    expect(satisfiesRange('1.3.0', '~1.2.0')).toBe(false);
  });

  it('should handle exact versions', () => {
    expect(satisfiesRange('1.0.0', '1.0.0')).toBe(true);
    expect(satisfiesRange('1.0.1', '1.0.0')).toBe(false);
  });
});

describe('resolveDependencies', () => {
  it('should resolve simple dependency chain', () => {
    const authManifest: ModuleManifest = {
      name: 'auth',
      version: '1.0.0',
      url: 'http://localhost/auth.js',
      components: [],
      api: {},
    };

    const ordersManifest: ModuleManifest = {
      name: 'orders',
      version: '1.0.0',
      url: 'http://localhost/orders.js',
      components: [],
      api: {},
      dependencies: ['auth@^1.0.0'],
    };

    const available = new Map<string, ModuleManifest>();
    available.set('auth', authManifest);

    const result = resolveDependencies([ordersManifest], available);

    expect(result.conflicts).toHaveLength(0);
    expect(result.loadOrder).toContain('auth');
    expect(result.loadOrder).toContain('orders');
    // Auth should come before orders
    expect(result.loadOrder.indexOf('auth')).toBeLessThan(result.loadOrder.indexOf('orders'));
  });

  it('should detect version conflicts', () => {
    const authManifest: ModuleManifest = {
      name: 'auth',
      version: '0.5.0', // Version too old
      url: 'http://localhost/auth.js',
      components: [],
      api: {},
    };

    const ordersManifest: ModuleManifest = {
      name: 'orders',
      version: '1.0.0',
      url: 'http://localhost/orders.js',
      components: [],
      api: {},
      dependencies: ['auth@^1.0.0'], // Requires 1.x.x
    };

    const available = new Map<string, ModuleManifest>();
    available.set('auth', authManifest);

    const result = resolveDependencies([ordersManifest], available);

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].module).toBe('orders');
  });

  it('should handle missing dependencies', () => {
    const ordersManifest: ModuleManifest = {
      name: 'orders',
      version: '1.0.0',
      url: 'http://localhost/orders.js',
      components: [],
      api: {},
      dependencies: ['auth@^1.0.0'],
    };

    const result = resolveDependencies([ordersManifest], new Map());

    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].available).toBe('not found');
  });
});

describe('areDependenciesSatisfied', () => {
  it('should return true for modules with no dependencies', () => {
    const manifest: ModuleManifest = {
      name: 'standalone',
      version: '1.0.0',
      url: 'http://localhost/standalone.js',
      components: [],
      api: {},
    };

    expect(areDependenciesSatisfied(manifest, new Map())).toBe(true);
  });

  it('should return true when all dependencies are loaded', () => {
    const authManifest: ModuleManifest = {
      name: 'auth',
      version: '1.0.0',
      url: 'http://localhost/auth.js',
      components: [],
      api: {},
    };

    const ordersManifest: ModuleManifest = {
      name: 'orders',
      version: '1.0.0',
      url: 'http://localhost/orders.js',
      components: [],
      api: {},
      dependencies: ['auth@^1.0.0'],
    };

    const loaded = new Map<string, ModuleManifest>();
    loaded.set('auth', authManifest);

    expect(areDependenciesSatisfied(ordersManifest, loaded)).toBe(true);
  });

  it('should return false when dependencies are not loaded', () => {
    const ordersManifest: ModuleManifest = {
      name: 'orders',
      version: '1.0.0',
      url: 'http://localhost/orders.js',
      components: [],
      api: {},
      dependencies: ['auth@^1.0.0'],
    };

    expect(areDependenciesSatisfied(ordersManifest, new Map())).toBe(false);
  });
});
