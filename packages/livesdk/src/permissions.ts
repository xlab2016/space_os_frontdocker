/**
 * Permissions Manager - handles security and access control for MFEs
 */

import type { ModuleManifest, PermissionsConfig } from './types.js';

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Permissions Manager for controlling MFE access
 */
export class PermissionsManager {
  private modulePermissions: Map<string, PermissionsConfig> = new Map();
  private globalAllowedModules: Set<string> = new Set();
  private globalAllowedActions: Set<string> = new Set();
  private auditEnabled: boolean = true;

  constructor() {
    // Default global permissions
    this.globalAllowedActions.add('read');
    this.globalAllowedActions.add('emit');
    this.globalAllowedActions.add('on');
  }

  /**
   * Register permissions for a module
   */
  registerModulePermissions(moduleName: string, permissions: PermissionsConfig): void {
    this.modulePermissions.set(moduleName, permissions);
  }

  /**
   * Get permissions for a module
   */
  getModulePermissions(moduleName: string): PermissionsConfig | undefined {
    return this.modulePermissions.get(moduleName);
  }

  /**
   * Set global allowed modules (modules accessible by all)
   */
  setGlobalAllowedModules(modules: string[]): void {
    this.globalAllowedModules = new Set(modules);
  }

  /**
   * Set global allowed actions
   */
  setGlobalAllowedActions(actions: string[]): void {
    this.globalAllowedActions = new Set(actions);
  }

  /**
   * Check if a module can call another module's method
   */
  canCallModule(
    callerModule: string,
    targetModule: string,
    method: string
  ): PermissionCheckResult {
    // Shell (null caller) can access anything
    if (!callerModule || callerModule === 'shell') {
      return { allowed: true };
    }

    // Check if target module is globally accessible
    if (this.globalAllowedModules.has(targetModule)) {
      return { allowed: true };
    }

    // Get caller's permissions
    const callerPermissions = this.modulePermissions.get(callerModule);

    if (!callerPermissions) {
      // No explicit permissions = default deny for cross-module calls
      return {
        allowed: false,
        reason: `Module '${callerModule}' has no permissions configured`,
      };
    }

    // Check if caller can access target module
    if (callerPermissions.allowedModules) {
      const canAccess = callerPermissions.allowedModules.some((pattern) => {
        if (pattern === '*') return true;
        if (pattern === targetModule) return true;
        // Support wildcard patterns like "orders.*"
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          return targetModule.startsWith(prefix);
        }
        return false;
      });

      if (!canAccess) {
        return {
          allowed: false,
          reason: `Module '${callerModule}' is not allowed to access module '${targetModule}'`,
        };
      }
    }

    // Check if action is allowed
    if (callerPermissions.allowedActions) {
      const actionAllowed =
        callerPermissions.allowedActions.includes('*') ||
        callerPermissions.allowedActions.includes(method) ||
        callerPermissions.allowedActions.includes(`${targetModule}.${method}`);

      if (!actionAllowed) {
        return {
          allowed: false,
          reason: `Module '${callerModule}' is not allowed to call '${targetModule}.${method}'`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if a module requires authentication
   */
  requiresAuth(moduleName: string): boolean {
    const permissions = this.modulePermissions.get(moduleName);
    return permissions?.requiresAuth ?? false;
  }

  /**
   * Validate a manifest's permissions configuration
   */
  validateManifestPermissions(manifest: ModuleManifest): string[] {
    const errors: string[] = [];

    if (manifest.permissions) {
      // Check for potentially dangerous permission requests
      if (manifest.permissions.allowedModules?.includes('*')) {
        errors.push(
          `Warning: Module '${manifest.name}' requests access to all modules`
        );
      }

      if (manifest.permissions.allowedActions?.includes('*')) {
        errors.push(
          `Warning: Module '${manifest.name}' requests all actions`
        );
      }
    }

    return errors;
  }

  /**
   * Enable/disable audit logging
   */
  setAuditEnabled(enabled: boolean): void {
    this.auditEnabled = enabled;
  }

  /**
   * Check if audit logging is enabled
   */
  isAuditEnabled(): boolean {
    return this.auditEnabled;
  }

  /**
   * Clear all permissions (useful for testing)
   */
  clear(): void {
    this.modulePermissions.clear();
    this.globalAllowedModules.clear();
    this.globalAllowedActions.clear();
    this.globalAllowedActions.add('read');
    this.globalAllowedActions.add('emit');
    this.globalAllowedActions.add('on');
  }
}

// Singleton instance
let permissionsManagerInstance: PermissionsManager | null = null;

/**
 * Get the global permissions manager instance
 */
export function getPermissionsManager(): PermissionsManager {
  if (!permissionsManagerInstance) {
    permissionsManagerInstance = new PermissionsManager();
  }
  return permissionsManagerInstance;
}

/**
 * Reset the permissions manager (useful for testing)
 */
export function resetPermissionsManager(): void {
  if (permissionsManagerInstance) {
    permissionsManagerInstance.clear();
  }
  permissionsManagerInstance = null;
}
