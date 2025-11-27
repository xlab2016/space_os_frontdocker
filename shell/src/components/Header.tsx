import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'FrontDocker Shell' }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>{'{ }'}</span>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>{title}</span>
          <span className={styles.logoSubtitle}>LiveUI by SpaceOS</span>
        </div>
      </div>
      <nav className={styles.nav}>
        <span className={styles.navItem}>Registry</span>
        <span className={styles.navItem}>Components</span>
        <span className={styles.navItem}>AI Console</span>
        <span className={styles.navItem}>Audit Log</span>
      </nav>
    </header>
  );
}
