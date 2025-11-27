/**
 * LiveSDK Host - Core implementation for FrontDocker Shell
 * Manages loading, registration, and orchestration of micro-frontends
 */

import type {
  ModuleManifest,
  LoadedModule,
  RegistryEntry,
  ILiveSDKHost,
  AuditLogEntry,
  LiveSDKEvent,
  LiveSDKEventType,
} from './types.js';
import { resolveDependencies, areDependenciesSatisfied } from './dependency-resolver.js';
import { getPermissionsManager, PermissionsManager } from './permissions.js';
import { getAuditLogger, AuditLogger } from './audit-log.js';

/**
 * Configuration options for LiveSDK Host
 */
export interface LiveSDKHostOptions {
  /** Enable verbose logging */
  debug?: boolean;
  /** Enable audit logging */
  auditEnabled?: boolean;
  /** Custom permissions manager */
  permissionsManager?: PermissionsManager;
  /** Custom audit logger */
  auditLogger?: AuditLogger;
  /** Callback for dynamic import (for testing/mocking) */
  importFn?: (url: string) => Promise<Record<string, unknown>>;
}

/**
 * Event handler type
 */
type EventHandler = (event: LiveSDKEvent) => void;

/**
 * LiveSDK Host class - the main orchestration engine for FrontDocker
 */
export class LiveSDKHost implements ILiveSDKHost {
  private registry: Map<string, RegistryEntry> = new Map();
  private manifests: Map<string, ModuleManifest> = new Map();
  private apis: Map<string, Record<string, (...args: unknown[]) => Promise<unknown>>> = new Map();
  private eventHandlers: Map<LiveSDKEventType, EventHandler[]> = new Map();
  private permissionsManager: PermissionsManager;
  private auditLogger: AuditLogger;
  private debug: boolean;
  private importFn: (url: string) => Promise<Record<string, unknown>>;

  constructor(options: LiveSDKHostOptions = {}) {
    this.debug = options.debug ?? false;
    this.permissionsManager = options.permissionsManager ?? getPermissionsManager();
    this.auditLogger = options.auditLogger ?? getAuditLogger();

    if (options.auditEnabled !== undefined) {
      this.auditLogger.setEnabled(options.auditEnabled);
    }

    // Default import function uses dynamic import
    this.importFn = options.importFn ?? ((url: string) => import(/* @vite-ignore */ url));
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log('[LiveSDK Host]', ...args);
    }
  }

  /**
   * Emit an event to listeners
   */
  private emit(type: LiveSDKEventType, payload: unknown): void {
    const event: LiveSDKEvent = {
      type,
      timestamp: new Date(),
      source: 'host',
      payload,
    };

    const handlers = this.eventHandlers.get(type) || [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[LiveSDK Host] Event handler error:', error);
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(type: LiveSDKEventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, []);
    }
    this.eventHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Register a module manifest (without loading)
   */
  registerModuleManifest(manifest: ModuleManifest): void {
    this.log('Registering manifest:', manifest.name, 'v' + manifest.version);

    this.manifests.set(manifest.name, manifest);

    // Register permissions if specified
    if (manifest.permissions) {
      this.permissionsManager.registerModulePermissions(manifest.name, manifest.permissions);
    }

    // Create registry entry if not exists
    if (!this.registry.has(manifest.name)) {
      this.registry.set(manifest.name, {
        manifest,
        module: null,
        status: 'pending',
      });
    } else {
      // Update manifest in existing entry
      const entry = this.registry.get(manifest.name)!;
      entry.manifest = manifest;
    }
  }

  /**
   * Load a micro-frontend by URL
   */
  async loadMFE(url: string): Promise<LoadedModule> {
    this.log('Loading MFE from:', url);

    // Try to find manifest by URL
    let manifest: ModuleManifest | undefined;
    for (const m of this.manifests.values()) {
      if (m.url === url) {
        manifest = m;
        break;
      }
    }

    // Create a temporary manifest if not found
    if (!manifest) {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      const name = filename.replace(/\.js$/, '').replace(/-mfe$/, '');

      manifest = {
        name,
        version: '0.0.0',
        url,
        components: [],
        api: {},
      };
    }

    // Update registry status
    const registryEntry = this.registry.get(manifest.name) || {
      manifest,
      module: null,
      status: 'pending' as const,
    };

    registryEntry.status = 'loading';
    this.registry.set(manifest.name, registryEntry);

    try {
      // Resolve and load dependencies first
      await this.resolveDependencies(manifest);

      // Perform dynamic import
      const exports = await this.importFn(url);

      this.log('Module loaded:', manifest.name, Object.keys(exports));

      // Extract API if present
      const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
      if (exports.api && typeof exports.api === 'object') {
        for (const [key, value] of Object.entries(exports.api as Record<string, unknown>)) {
          if (typeof value === 'function') {
            api[key] = value as (...args: unknown[]) => Promise<unknown>;
          }
        }
      }

      // Create loaded module object
      const loadedModule: LoadedModule = {
        manifest,
        exports,
        api,
        ready: false,
      };

      // Register the API
      if (Object.keys(api).length > 0) {
        this.registerAPI(manifest.name, api);
      }

      // Update registry
      registryEntry.module = loadedModule;
      registryEntry.status = 'loaded';
      registryEntry.loadedAt = new Date();

      // Emit event
      this.emit('module:loaded', { name: manifest.name, url });

      this.log('MFE loaded successfully:', manifest.name);
      return loadedModule;
    } catch (error) {
      this.log('Failed to load MFE:', manifest.name, error);

      registryEntry.status = 'error';
      registryEntry.error = error instanceof Error ? error : new Error(String(error));

      this.emit('module:error', {
        name: manifest.name,
        url,
        error: registryEntry.error.message,
      });

      throw error;
    }
  }

  /**
   * Unload a micro-frontend
   */
  async unloadMFE(moduleName: string): Promise<void> {
    this.log('Unloading MFE:', moduleName);

    const entry = this.registry.get(moduleName);
    if (entry) {
      entry.module = null;
      entry.status = 'pending';
      entry.loadedAt = undefined;
    }

    // Remove API registration
    this.apis.delete(moduleName);

    this.emit('module:unloaded', { name: moduleName });
  }

  /**
   * Register an API for a module
   */
  registerAPI(
    moduleName: string,
    apiObj: Record<string, (...args: unknown[]) => Promise<unknown>>
  ): void {
    this.log('Registering API for:', moduleName, Object.keys(apiObj));
    this.apis.set(moduleName, apiObj);
  }

  /**
   * Call an API method on a module
   */
  async call(
    moduleName: string,
    method: string,
    args: unknown[],
    caller: string = 'shell'
  ): Promise<unknown> {
    this.log('Calling:', moduleName + '.' + method, args);

    // Check permissions
    const permissionCheck = this.permissionsManager.canCallModule(caller, moduleName, method);
    if (!permissionCheck.allowed) {
      const error = new Error(permissionCheck.reason || 'Permission denied');
      this.auditLogger.log(caller, moduleName, method, args, undefined, error.message, 0);
      throw error;
    }

    // Get the API
    const api = this.apis.get(moduleName);
    if (!api) {
      const error = new Error(`Module '${moduleName}' not found or has no API registered`);
      this.auditLogger.log(caller, moduleName, method, args, undefined, error.message, 0);
      throw error;
    }

    const fn = api[method];
    if (!fn || typeof fn !== 'function') {
      const error = new Error(`Method '${method}' not found in module '${moduleName}'`);
      this.auditLogger.log(caller, moduleName, method, args, undefined, error.message, 0);
      throw error;
    }

    // Execute with timing and audit logging
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      this.auditLogger.log(caller, moduleName, method, args, result, undefined, duration);
      this.emit('api:result', { module: moduleName, method, result, duration });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.auditLogger.log(caller, moduleName, method, args, undefined, errorMessage, duration);
      this.emit('api:result', { module: moduleName, method, error: errorMessage, duration });

      throw error;
    }
  }

  /**
   * Resolve and load dependencies for a module
   */
  async resolveDependencies(manifest: ModuleManifest): Promise<void> {
    if (!manifest.dependencies || manifest.dependencies.length === 0) {
      return;
    }

    this.log('Resolving dependencies for:', manifest.name, manifest.dependencies);

    // Get current loaded manifests
    const loadedManifests = new Map<string, ModuleManifest>();
    for (const [name, entry] of this.registry) {
      if (entry.status === 'loaded') {
        loadedManifests.set(name, entry.manifest);
      }
    }

    // Check if dependencies are already satisfied
    if (areDependenciesSatisfied(manifest, loadedManifests)) {
      this.log('Dependencies already satisfied for:', manifest.name);
      return;
    }

    // Resolve dependencies
    const resolution = resolveDependencies([manifest], this.manifests);

    // Check for conflicts
    if (resolution.conflicts.length > 0) {
      const conflictMessages = resolution.conflicts.map(
        (c) => `${c.module} requires ${c.required} but ${c.available} is available`
      );
      throw new Error(`Dependency conflicts: ${conflictMessages.join('; ')}`);
    }

    // Load dependencies in order (excluding the current module)
    for (const depName of resolution.loadOrder) {
      if (depName === manifest.name) continue;

      const entry = this.registry.get(depName);
      if (entry && entry.status !== 'loaded') {
        const depManifest = this.manifests.get(depName);
        if (depManifest) {
          this.log('Loading dependency:', depName);
          await this.loadMFE(depManifest.url);
        }
      }
    }
  }

  /**
   * Get the full registry
   */
  getRegistry(): Map<string, RegistryEntry> {
    return new Map(this.registry);
  }

  /**
   * Get all registered manifests
   */
  getManifests(): ModuleManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): AuditLogEntry[] {
    return this.auditLogger.getEntries();
  }

  /**
   * Get a specific module's loaded state
   */
  getModule(moduleName: string): LoadedModule | null {
    const entry = this.registry.get(moduleName);
    return entry?.module ?? null;
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(moduleName: string): boolean {
    const entry = this.registry.get(moduleName);
    return entry?.status === 'loaded';
  }

  /**
   * Get module status
   */
  getStatus(moduleName: string): RegistryEntry['status'] | 'unknown' {
    const entry = this.registry.get(moduleName);
    return entry?.status ?? 'unknown';
  }

  /**
   * Mark a module as ready (called by the module itself)
   */
  markReady(moduleName: string): void {
    const entry = this.registry.get(moduleName);
    if (entry?.module) {
      entry.module.ready = true;
      this.log('Module marked ready:', moduleName);
    }
  }

  /**
   * Clear all state (useful for testing)
   */
  clear(): void {
    this.registry.clear();
    this.manifests.clear();
    this.apis.clear();
    this.eventHandlers.clear();
  }

  /**
   * Get the permissions manager
   */
  getPermissionsManager(): PermissionsManager {
    return this.permissionsManager;
  }

  /**
   * Get the audit logger
   */
  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }
}

// Singleton instance
let livesdkHostInstance: LiveSDKHost | null = null;

/**
 * Get the global LiveSDK Host instance
 */
export function getLiveSDKHost(options?: LiveSDKHostOptions): LiveSDKHost {
  if (!livesdkHostInstance) {
    livesdkHostInstance = new LiveSDKHost(options);
  }
  return livesdkHostInstance;
}

/**
 * Reset the LiveSDK Host (useful for testing)
 */
export function resetLiveSDKHost(): void {
  if (livesdkHostInstance) {
    livesdkHostInstance.clear();
  }
  livesdkHostInstance = null;
}
