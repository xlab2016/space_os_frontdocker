import React, { useState } from 'react';
import { useLiveSDK } from '../context/LiveSDKContext';
import styles from './ModuleRegistry.module.css';

/**
 * Module Registry Panel - shows available modules and their status
 */
export function ModuleRegistry() {
  const { registry, loadModule, unloadModule, isLoading, error, clearError } = useLiveSDK();
  const [loadingModule, setLoadingModule] = useState<string | null>(null);

  const handleLoad = async (moduleName: string) => {
    setLoadingModule(moduleName);
    try {
      await loadModule(moduleName);
    } catch {
      // Error is handled by context
    } finally {
      setLoadingModule(null);
    }
  };

  const handleUnload = async (moduleName: string) => {
    await unloadModule(moduleName);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'loaded': return styles.statusLoaded;
      case 'loading': return styles.statusLoading;
      case 'error': return styles.statusError;
      default: return styles.statusPending;
    }
  };

  return (
    <div className={styles.registry}>
      <div className={styles.header}>
        <h2 className={styles.title}>Module Registry</h2>
        <span className={styles.count}>{registry.manifests.length} modules</span>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={clearError} className={styles.dismissButton}>Dismiss</button>
        </div>
      )}

      <div className={styles.moduleList}>
        {registry.manifests.map((manifest) => {
          const entry = registry.entries.get(manifest.name);
          const status = entry?.status || 'pending';
          const isThisLoading = loadingModule === manifest.name || (isLoading && status === 'loading');

          return (
            <div key={manifest.name} className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <span className={styles.moduleName}>{manifest.name}</span>
                <span className={`${styles.status} ${getStatusClass(status)}`}>
                  {status}
                </span>
              </div>

              <div className={styles.moduleInfo}>
                <span className={styles.version}>v{manifest.version}</span>
                <span className={styles.components}>
                  {manifest.components.length} components
                </span>
                <span className={styles.api}>
                  {Object.keys(manifest.api).length} API methods
                </span>
              </div>

              {manifest.dependencies && manifest.dependencies.length > 0 && (
                <div className={styles.dependencies}>
                  <span className={styles.depsLabel}>Deps:</span>
                  {manifest.dependencies.map((dep) => (
                    <span key={dep} className={styles.depTag}>{dep}</span>
                  ))}
                </div>
              )}

              <div className={styles.moduleActions}>
                {status !== 'loaded' ? (
                  <button
                    className={styles.loadButton}
                    onClick={() => handleLoad(manifest.name)}
                    disabled={isThisLoading}
                  >
                    {isThisLoading ? 'Loading...' : 'Load'}
                  </button>
                ) : (
                  <button
                    className={styles.unloadButton}
                    onClick={() => handleUnload(manifest.name)}
                  >
                    Unload
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {registry.manifests.length === 0 && (
          <div className={styles.emptyState}>
            No modules registered. Add module manifests to get started.
          </div>
        )}
      </div>
    </div>
  );
}
