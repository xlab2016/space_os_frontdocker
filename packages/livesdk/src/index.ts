/**
 * @frontdocker/livesdk - LiveSDK Host Library
 * Core library for FrontDocker Shell to manage micro-frontends
 */

// Types
export type {
  ModuleManifest,
  LoadedModule,
  RegistryEntry,
  ActionStep,
  ActionPlan,
  ActionResult,
  LiveSDKEvent,
  LiveSDKEventType,
  AuditLogEntry,
  ILiveSDKHost,
  ILiveSDKClient,
  PermissionsConfig,
  ApiMethodDef,
  DependencyResolutionResult,
} from './types.js';

// LiveSDK Host
export {
  LiveSDKHost,
  getLiveSDKHost,
  resetLiveSDKHost,
  type LiveSDKHostOptions,
} from './livesdk-host.js';

// Dependency Resolver
export {
  resolveDependencies,
  areDependenciesSatisfied,
  parseVersion,
  parseDependency,
  satisfiesRange,
} from './dependency-resolver.js';

// Permissions
export {
  PermissionsManager,
  getPermissionsManager,
  resetPermissionsManager,
  type PermissionCheckResult,
} from './permissions.js';

// Audit Log
export {
  AuditLogger,
  getAuditLogger,
  resetAuditLogger,
} from './audit-log.js';
