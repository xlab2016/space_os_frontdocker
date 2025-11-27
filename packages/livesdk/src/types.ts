/**
 * LiveSDK Types - Core type definitions for FrontDocker/LiveUI infrastructure
 */

/**
 * API method definition in a module manifest
 */
export interface ApiMethodDef {
  args: string[];
  returns: string;
  description?: string;
}

/**
 * Module manifest - describes an MFE's capabilities, components, and API
 */
export interface ModuleManifest {
  name: string;
  version: string;
  url: string;
  components: string[];
  api: Record<string, ApiMethodDef>;
  dependencies?: string[];
  permissions?: PermissionsConfig;
}

/**
 * Permissions configuration for an MFE
 */
export interface PermissionsConfig {
  allowedModules?: string[];      // Modules this MFE can call
  allowedActions?: string[];      // Actions this MFE can perform
  requiresAuth?: boolean;         // Whether authentication is required
}

/**
 * Loaded module with its exports and manifest
 */
export interface LoadedModule {
  manifest: ModuleManifest;
  exports: Record<string, unknown>;
  api: Record<string, (...args: unknown[]) => Promise<unknown>>;
  ready: boolean;
}

/**
 * Registry entry for tracking loaded modules
 */
export interface RegistryEntry {
  manifest: ModuleManifest;
  module: LoadedModule | null;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  error?: Error;
  loadedAt?: Date;
}

/**
 * AI Action Plan step
 */
export interface ActionStep {
  id: number;
  module: string;
  method: string;
  args: unknown[];
  waitFor?: boolean;
  description?: string;
}

/**
 * AI Action Plan
 */
export type ActionPlan = ActionStep[];

/**
 * Action execution result
 */
export interface ActionResult {
  stepId: number;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

/**
 * Event types for livesdk communication
 */
export type LiveSDKEventType =
  | 'module:loaded'
  | 'module:unloaded'
  | 'module:error'
  | 'api:call'
  | 'api:result'
  | 'plan:start'
  | 'plan:step'
  | 'plan:complete'
  | 'plan:error';

/**
 * Event payload structure
 */
export interface LiveSDKEvent {
  type: LiveSDKEventType;
  timestamp: Date;
  source: string;
  payload: unknown;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  caller: string;
  module: string;
  method: string;
  args: unknown[];
  result?: unknown;
  error?: string;
  duration: number;
}

/**
 * LiveSDK Host interface - implemented by the Shell
 */
export interface ILiveSDKHost {
  loadMFE(url: string): Promise<LoadedModule>;
  unloadMFE(moduleName: string): Promise<void>;
  registerModuleManifest(manifest: ModuleManifest): void;
  call(moduleName: string, method: string, args: unknown[]): Promise<unknown>;
  resolveDependencies(manifest: ModuleManifest): Promise<void>;
  registerAPI(moduleName: string, apiObj: Record<string, (...args: unknown[]) => Promise<unknown>>): void;
  getRegistry(): Map<string, RegistryEntry>;
  getManifests(): ModuleManifest[];
  getAuditLog(): AuditLogEntry[];
}

/**
 * LiveSDK Client interface - implemented by MFEs
 */
export interface ILiveSDKClient {
  init(config: { name: string; version: string }): Promise<void>;
  registerAPI(apiObj: Record<string, (...args: unknown[]) => Promise<unknown>>): void;
  ready(): void;
  on(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
}

/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
  loadOrder: string[];
  resolved: Map<string, ModuleManifest>;
  conflicts: Array<{
    module: string;
    required: string;
    available: string;
  }>;
}
