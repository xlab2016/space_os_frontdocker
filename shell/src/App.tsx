import React, { useEffect } from 'react';
import { useLiveSDK } from './context/LiveSDKContext';
import { Header } from './components/Header';
import { ModuleRegistry } from './components/ModuleRegistry';
import { ComponentArea } from './components/ComponentArea';
import { AIConsole } from './components/AIConsole';
import { AuditLog } from './components/AuditLog';
import { ModuleManifest } from '@frontdocker/livesdk';
import styles from './App.module.css';

// Default dev manifests for demonstration
const defaultManifests: ModuleManifest[] = [
  {
    name: 'auth',
    version: '1.0.0',
    url: 'http://localhost:5001/auth-mfe.js',
    components: ['FrontContainer', 'LoginForm', 'UserProfile'],
    api: {
      login: { args: ['username', 'password'], returns: 'AuthToken' },
      logout: { args: [], returns: 'boolean' },
      getCurrentUser: { args: [], returns: 'User' },
      ensureAuthenticated: { args: [], returns: 'boolean' },
    },
  },
  {
    name: 'orders',
    version: '1.0.0',
    url: 'http://localhost:5002/orders-mfe.js',
    components: ['FrontContainer', 'OrdersList', 'OrderCard'],
    api: {
      openOrder: { args: ['orderId'], returns: 'Order' },
      setStatus: { args: ['status'], returns: 'boolean' },
      getOrders: { args: [], returns: 'Order[]' },
    },
    dependencies: ['auth@^1.0.0'],
  },
  {
    name: 'analytics',
    version: '1.0.0',
    url: 'http://localhost:5003/analytics-mfe.js',
    components: ['FrontContainer', 'Dashboard', 'Chart'],
    api: {
      getSummary: { args: [], returns: 'AnalyticsSummary' },
      getMetrics: { args: ['metricType'], returns: 'Metric[]' },
    },
    dependencies: ['auth@^1.0.0'],
  },
];

function App() {
  const { registerManifest, refreshRegistry } = useLiveSDK();

  // Register default manifests on mount
  useEffect(() => {
    defaultManifests.forEach((manifest) => {
      registerManifest(manifest);
    });
    refreshRegistry();
  }, [registerManifest, refreshRegistry]);

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <ModuleRegistry />
        </div>

        <div className={styles.centerPanel}>
          <ComponentArea />
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.aiSection}>
            <AIConsole />
          </div>
          <div className={styles.auditSection}>
            <AuditLog />
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>LiveUI by SpaceOS</span>
        <span className={styles.footerSeparator}>|</span>
        <span>FrontDocker Shell v1.0.0</span>
        <span className={styles.footerSeparator}>|</span>
        <span className={styles.footerTagline}>Interface of your dreams!</span>
      </footer>
    </div>
  );
}

export default App;
