import React, { useState } from 'react';
import { useLiveSDK } from '../context/LiveSDKContext';
import styles from './AuditLog.module.css';

/**
 * Audit Log Panel - shows all API calls and their results
 */
export function AuditLog() {
  const { auditLog } = useLiveSDK();
  const [filter, setFilter] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const filteredLog = auditLog
    .filter((entry) => {
      if (showErrors && !entry.error) return false;
      if (filter) {
        const searchStr = `${entry.module}.${entry.method} ${entry.caller}`.toLowerCase();
        return searchStr.includes(filter.toLowerCase());
      }
      return true;
    })
    .slice(-50) // Show last 50 entries
    .reverse(); // Most recent first

  const formatDuration = (ms: number): string => {
    if (ms < 0) return 'in progress';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className={styles.auditLog}>
      <div className={styles.header}>
        <h3 className={styles.title}>Audit Log</h3>
        <div className={styles.controls}>
          <input
            type="text"
            className={styles.filterInput}
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <label className={styles.errorToggle}>
            <input
              type="checkbox"
              checked={showErrors}
              onChange={(e) => setShowErrors(e.target.checked)}
            />
            Errors only
          </label>
        </div>
      </div>

      <div className={styles.entries}>
        {filteredLog.map((entry) => (
          <div
            key={entry.id}
            className={`${styles.entry} ${entry.error ? styles.error : ''}`}
          >
            <div className={styles.entryHeader}>
              <span className={styles.timestamp}>
                {entry.timestamp.toLocaleTimeString()}
              </span>
              <span className={styles.caller}>{entry.caller}</span>
              <span className={styles.arrow}>{'->'}</span>
              <span className={styles.target}>
                {entry.module}.{entry.method}
              </span>
              <span className={styles.duration}>
                {formatDuration(entry.duration)}
              </span>
            </div>

            {entry.args && entry.args.length > 0 && (
              <div className={styles.args}>
                <span className={styles.argsLabel}>Args:</span>
                <code className={styles.argsValue}>
                  {JSON.stringify(entry.args)}
                </code>
              </div>
            )}

            {entry.result !== undefined && (
              <div className={styles.result}>
                <span className={styles.resultLabel}>Result:</span>
                <code className={styles.resultValue}>
                  {JSON.stringify(entry.result)}
                </code>
              </div>
            )}

            {entry.error && (
              <div className={styles.errorMessage}>
                <span className={styles.errorLabel}>Error:</span>
                <span className={styles.errorValue}>{entry.error}</span>
              </div>
            )}
          </div>
        ))}

        {filteredLog.length === 0 && (
          <div className={styles.emptyState}>
            {auditLog.length === 0
              ? 'No API calls logged yet.'
              : 'No entries match the current filter.'}
          </div>
        )}
      </div>
    </div>
  );
}
