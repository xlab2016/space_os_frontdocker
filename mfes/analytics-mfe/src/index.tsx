/**
 * Analytics MFE - Analytics dashboard micro-frontend
 * Provides data visualization and metrics display
 */

import React, { useState, useEffect } from 'react';

// Types
interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  activeUsers: number;
  topProducts: string[];
}

interface Metric {
  name: string;
  value: number;
  change: number;
  unit: string;
}

// Mock data
const mockSummary: AnalyticsSummary = {
  totalOrders: 1247,
  totalRevenue: 89432.50,
  averageOrderValue: 71.72,
  conversionRate: 3.8,
  activeUsers: 542,
  topProducts: ['Widget Pro', 'Gadget Plus', 'Premium Package'],
};

const mockMetrics: Record<string, Metric[]> = {
  sales: [
    { name: 'Today', value: 4521, change: 12.5, unit: '$' },
    { name: 'This Week', value: 28934, change: 8.2, unit: '$' },
    { name: 'This Month', value: 89432, change: -2.1, unit: '$' },
  ],
  users: [
    { name: 'Active Now', value: 127, change: 5.3, unit: '' },
    { name: 'New Today', value: 34, change: 15.2, unit: '' },
    { name: 'Returning', value: 412, change: 3.8, unit: '' },
  ],
  orders: [
    { name: 'Pending', value: 23, change: -8.5, unit: '' },
    { name: 'Processing', value: 45, change: 12.1, unit: '' },
    { name: 'Completed', value: 892, change: 4.7, unit: '' },
  ],
};

// ============ Components ============

/**
 * Main container component for analytics MFE
 */
export function FrontContainer() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSummary().then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading analytics...</div>;
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Analytics Dashboard</h3>
      <Dashboard summary={summary} />
    </div>
  );
}

/**
 * Main dashboard component
 */
export function Dashboard({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary) {
    return <div style={styles.noData}>No analytics data available</div>;
  }

  return (
    <div style={styles.dashboard}>
      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        <MetricCard
          label="Total Orders"
          value={summary.totalOrders.toLocaleString()}
          icon="{'#'}"
        />
        <MetricCard
          label="Revenue"
          value={`$${summary.totalRevenue.toLocaleString()}`}
          icon="$"
        />
        <MetricCard
          label="Avg Order"
          value={`$${summary.averageOrderValue.toFixed(2)}`}
          icon="~"
        />
        <MetricCard
          label="Conversion"
          value={`${summary.conversionRate}%`}
          icon="%"
        />
      </div>

      {/* Charts Section */}
      <div style={styles.chartsSection}>
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Sales Trend</h4>
          <Chart type="line" data={[35, 42, 38, 55, 48, 62, 58]} />
        </div>
        <div style={styles.chartContainer}>
          <h4 style={styles.chartTitle}>Order Distribution</h4>
          <Chart type="bar" data={[23, 45, 892]} />
        </div>
      </div>

      {/* Top Products */}
      <div style={styles.topProducts}>
        <h4 style={styles.sectionTitle}>Top Products</h4>
        <div style={styles.productsList}>
          {summary.topProducts.map((product, index) => (
            <div key={product} style={styles.productItem}>
              <span style={styles.productRank}>#{index + 1}</span>
              <span style={styles.productName}>{product}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Single metric card
 */
function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricIcon}>{icon}</div>
      <div style={styles.metricInfo}>
        <div style={styles.metricValue}>{value}</div>
        <div style={styles.metricLabel}>{label}</div>
      </div>
    </div>
  );
}

/**
 * Simple chart component
 */
export function Chart({ type, data }: { type: 'line' | 'bar'; data: number[] }) {
  const maxValue = Math.max(...data);

  if (type === 'bar') {
    return (
      <div style={styles.barChart}>
        {data.map((value, index) => (
          <div key={index} style={styles.barContainer}>
            <div
              style={{
                ...styles.bar,
                height: `${(value / maxValue) * 100}%`,
              }}
            />
            <span style={styles.barLabel}>{value}</span>
          </div>
        ))}
      </div>
    );
  }

  // Line chart (simplified)
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / maxValue) * 80;
    return `${x}%,${y}%`;
  });

  return (
    <div style={styles.lineChart}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          points={points.map((p, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (data[i] / maxValue) * 80;
            return `${x},${y}`;
          }).join(' ')}
        />
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - (value / maxValue) * 80;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="#6366f1"
            />
          );
        })}
      </svg>
    </div>
  );
}

// ============ API ============

export const api = {
  /**
   * Get analytics summary
   */
  async getSummary(): Promise<AnalyticsSummary> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log('[Analytics MFE] Fetching summary...');
    return { ...mockSummary };
  },

  /**
   * Get metrics by type
   */
  async getMetrics(metricType: string): Promise<Metric[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    console.log('[Analytics MFE] Fetching metrics:', metricType);
    return mockMetrics[metricType] || [];
  },

  /**
   * Get real-time stats
   */
  async getRealTimeStats(): Promise<{ activeUsers: number; ordersPerMinute: number }> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      activeUsers: mockSummary.activeUsers + Math.floor(Math.random() * 20) - 10,
      ordersPerMinute: Math.floor(Math.random() * 5) + 1,
    };
  },

  /**
   * Export report
   */
  async exportReport(format: 'json' | 'csv'): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (format === 'json') {
      return JSON.stringify(mockSummary, null, 2);
    }

    // CSV format
    return `metric,value
totalOrders,${mockSummary.totalOrders}
totalRevenue,${mockSummary.totalRevenue}
averageOrderValue,${mockSummary.averageOrderValue}
conversionRate,${mockSummary.conversionRate}
activeUsers,${mockSummary.activeUsers}`;
  },
};

// ============ Styles ============

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#e0e0e0',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    color: '#6366f1',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: '#a0a0b0',
  },
  noData: {
    padding: '2rem',
    textAlign: 'center',
    color: '#a0a0b0',
  },
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '6px',
  },
  metricIcon: {
    width: '36px',
    height: '36px',
    background: 'rgba(99, 102, 241, 0.2)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366f1',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  metricInfo: {
    flex: 1,
  },
  metricValue: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  metricLabel: {
    fontSize: '0.7rem',
    color: '#a0a0b0',
  },
  chartsSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  chartContainer: {
    padding: '0.75rem',
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '6px',
  },
  chartTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.8rem',
    color: '#a0a0b0',
  },
  lineChart: {
    height: '80px',
    padding: '0.5rem 0',
  },
  barChart: {
    height: '80px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: '0.5rem',
    paddingBottom: '1rem',
  },
  barContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    maxWidth: '40px',
    background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)',
    borderRadius: '4px 4px 0 0',
    transition: 'height 0.3s ease',
  },
  barLabel: {
    fontSize: '0.65rem',
    color: '#a0a0b0',
    marginTop: '0.25rem',
  },
  topProducts: {
    padding: '0.75rem',
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '6px',
  },
  sectionTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.8rem',
    color: '#a0a0b0',
  },
  productsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.5rem',
    background: '#1a1a2e',
    borderRadius: '4px',
  },
  productRank: {
    fontSize: '0.7rem',
    color: '#6366f1',
    fontWeight: 500,
  },
  productName: {
    fontSize: '0.8rem',
  },
};

// ============ Module Manifest ============

export const manifest = {
  name: 'analytics',
  version: '1.0.0',
  components: ['FrontContainer', 'Dashboard', 'Chart'],
  api: {
    getSummary: { args: [], returns: 'AnalyticsSummary' },
    getMetrics: { args: ['metricType'], returns: 'Metric[]' },
    getRealTimeStats: { args: [], returns: 'object' },
    exportReport: { args: ['format'], returns: 'string' },
  },
  dependencies: ['auth@^1.0.0'],
};

// Default export for module loading
export default { FrontContainer, Dashboard, Chart, api, manifest };
