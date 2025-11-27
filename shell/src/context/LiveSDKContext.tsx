import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  LiveSDKHost,
  ModuleManifest,
  RegistryEntry,
  AuditLogEntry,
  ActionPlan,
  ActionResult,
} from '@frontdocker/livesdk';
import { AIBridge, IntentResult } from '../utils/ai-bridge';

/**
 * Registry state type
 */
interface RegistryState {
  entries: Map<string, RegistryEntry>;
  manifests: ModuleManifest[];
}

/**
 * LiveSDK Context value type
 */
interface LiveSDKContextValue {
  // State
  registry: RegistryState;
  auditLog: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;

  // Module operations
  registerManifest: (manifest: ModuleManifest) => void;
  loadModule: (moduleName: string) => Promise<void>;
  unloadModule: (moduleName: string) => Promise<void>;
  callMethod: (moduleName: string, method: string, args: unknown[]) => Promise<unknown>;

  // AI operations
  processIntent: (intent: string) => Promise<IntentResult>;
  executeActionPlan: (plan: ActionPlan) => Promise<ActionResult[]>;

  // Utility
  refreshRegistry: () => void;
  clearError: () => void;

  // Direct access to host
  host: LiveSDKHost;
  aiBridge: AIBridge;
}

const LiveSDKContext = createContext<LiveSDKContextValue | null>(null);

/**
 * LiveSDK Provider component
 */
export function LiveSDKProvider({ children }: { children: ReactNode }) {
  const [host] = useState(() => new LiveSDKHost({ debug: true, auditEnabled: true }));
  const [aiBridge] = useState(() => new AIBridge(host));

  const [registry, setRegistry] = useState<RegistryState>({
    entries: new Map(),
    manifests: [],
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expose host to window for MFE communication
  useEffect(() => {
    (window as unknown as { __LIVESDK_HOST__: LiveSDKHost }).__LIVESDK_HOST__ = host;

    // Also expose a simplified bridge for MFEs
    (window as unknown as { __LIVESDK_HOST__: unknown }).__LIVESDK_HOST__ = {
      registerAPI: (moduleName: string, api: Record<string, (...args: unknown[]) => Promise<unknown>>) => {
        host.registerAPI(moduleName, api);
      },
      notifyReady: (moduleName: string) => {
        host.markReady(moduleName);
      },
      call: async (moduleName: string, method: string, args: unknown[]) => {
        return host.call(moduleName, method, args);
      },
      emit: () => { /* Not implemented yet */ },
      on: () => () => { /* Not implemented yet */ },
    };

    return () => {
      delete (window as unknown as { __LIVESDK_HOST__?: unknown }).__LIVESDK_HOST__;
    };
  }, [host]);

  // Update audit log periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAuditLog(host.getAuditLog());
    }, 1000);

    return () => clearInterval(interval);
  }, [host]);

  const refreshRegistry = useCallback(() => {
    setRegistry({
      entries: host.getRegistry(),
      manifests: host.getManifests(),
    });
  }, [host]);

  const registerManifest = useCallback((manifest: ModuleManifest) => {
    host.registerModuleManifest(manifest);
    refreshRegistry();
  }, [host, refreshRegistry]);

  const loadModule = useCallback(async (moduleName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const manifest = host.getManifests().find((m) => m.name === moduleName);
      if (!manifest) {
        throw new Error(`Manifest not found for module: ${moduleName}`);
      }

      await host.loadMFE(manifest.url);
      refreshRegistry();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [host, refreshRegistry]);

  const unloadModule = useCallback(async (moduleName: string) => {
    await host.unloadMFE(moduleName);
    refreshRegistry();
  }, [host, refreshRegistry]);

  const callMethod = useCallback(async (moduleName: string, method: string, args: unknown[]) => {
    return host.call(moduleName, method, args);
  }, [host]);

  const processIntent = useCallback(async (intent: string) => {
    return aiBridge.processIntent(intent);
  }, [aiBridge]);

  const executeActionPlan = useCallback(async (plan: ActionPlan) => {
    return aiBridge.executePlan(plan);
  }, [aiBridge]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: LiveSDKContextValue = {
    registry,
    auditLog,
    isLoading,
    error,
    registerManifest,
    loadModule,
    unloadModule,
    callMethod,
    processIntent,
    executeActionPlan,
    refreshRegistry,
    clearError,
    host,
    aiBridge,
  };

  return (
    <LiveSDKContext.Provider value={value}>
      {children}
    </LiveSDKContext.Provider>
  );
}

/**
 * Hook to access LiveSDK context
 */
export function useLiveSDK(): LiveSDKContextValue {
  const context = useContext(LiveSDKContext);
  if (!context) {
    throw new Error('useLiveSDK must be used within a LiveSDKProvider');
  }
  return context;
}
