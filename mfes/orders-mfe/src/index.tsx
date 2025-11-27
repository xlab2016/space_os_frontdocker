/**
 * Orders MFE - Order management micro-frontend
 * Provides order listing, viewing, and status management
 */

import React, { useState, useEffect } from 'react';

// Simulated order data
interface Order {
  id: number;
  customer: string;
  items: string[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Mock orders database
const ordersDB: Order[] = [
  {
    id: 123,
    customer: 'John Doe',
    items: ['Widget A', 'Gadget B'],
    total: 150.00,
    status: 'pending',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 456,
    customer: 'Jane Smith',
    items: ['Product X', 'Product Y', 'Product Z'],
    total: 299.99,
    status: 'processing',
    createdAt: new Date('2024-01-16'),
  },
  {
    id: 789,
    customer: 'Bob Wilson',
    items: ['Premium Package'],
    total: 499.00,
    status: 'shipped',
    createdAt: new Date('2024-01-17'),
  },
];

let currentOrder: Order | null = null;

// ============ Components ============

/**
 * Main container component for the orders MFE
 */
export function FrontContainer() {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const handleOrderChange = () => {
      if (currentOrder) {
        setSelectedOrder(currentOrder);
        setView('detail');
      }
    };

    window.addEventListener('order-change', handleOrderChange);
    return () => window.removeEventListener('order-change', handleOrderChange);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Orders Management</h3>
        {view === 'detail' && (
          <button style={styles.backButton} onClick={() => setView('list')}>
            {'< Back to List'}
          </button>
        )}
      </div>

      {view === 'list' ? (
        <OrdersList onSelect={(order) => {
          setSelectedOrder(order);
          setView('detail');
        }} />
      ) : (
        <OrderCard order={selectedOrder} />
      )}
    </div>
  );
}

/**
 * Orders list component
 */
export function OrdersList({ onSelect }: { onSelect?: (order: Order) => void }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.getOrders().then(setOrders);
  }, []);

  return (
    <div style={styles.ordersList}>
      {orders.map((order) => (
        <div
          key={order.id}
          style={styles.orderItem}
          onClick={() => onSelect?.(order)}
        >
          <div style={styles.orderItemHeader}>
            <span style={styles.orderId}>#{order.id}</span>
            <span style={{
              ...styles.statusBadge,
              background: getStatusColor(order.status),
            }}>
              {order.status}
            </span>
          </div>
          <div style={styles.orderItemInfo}>
            <span>{order.customer}</span>
            <span style={styles.orderTotal}>${order.total.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Order card/detail component
 */
export function OrderCard({ order }: { order: Order | null }) {
  const [localOrder, setLocalOrder] = useState<Order | null>(order);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  if (!localOrder) {
    return <div style={styles.noOrder}>No order selected</div>;
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdating(true);
    try {
      await api.setStatus(newStatus);
      setLocalOrder((prev) => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setUpdating(false);
  };

  return (
    <div style={styles.orderCard}>
      <div style={styles.cardHeader}>
        <h4 style={styles.cardTitle}>Order #{localOrder.id}</h4>
        <span style={{
          ...styles.statusBadge,
          background: getStatusColor(localOrder.status),
        }}>
          {localOrder.status}
        </span>
      </div>

      <div style={styles.cardSection}>
        <div style={styles.cardLabel}>Customer</div>
        <div style={styles.cardValue}>{localOrder.customer}</div>
      </div>

      <div style={styles.cardSection}>
        <div style={styles.cardLabel}>Items</div>
        <ul style={styles.itemsList}>
          {localOrder.items.map((item, index) => (
            <li key={index} style={styles.itemsListItem}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={styles.cardSection}>
        <div style={styles.cardLabel}>Total</div>
        <div style={styles.totalValue}>${localOrder.total.toFixed(2)}</div>
      </div>

      <div style={styles.cardSection}>
        <div style={styles.cardLabel}>Update Status</div>
        <div style={styles.statusButtons}>
          {(['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => (
            <button
              key={status}
              style={{
                ...styles.statusButton,
                background: localOrder.status === status ? getStatusColor(status) : 'transparent',
                color: localOrder.status === status ? 'white' : '#a0a0b0',
              }}
              onClick={() => handleStatusChange(status)}
              disabled={updating || localOrder.status === status}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Helper Functions ============

function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#22c55e',
    cancelled: '#ef4444',
  };
  return colors[status];
}

// ============ API ============

export const api = {
  /**
   * Open/view a specific order
   */
  async openOrder(orderId: number): Promise<Order> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const order = ordersDB.find((o) => o.id === orderId);
    if (!order) {
      throw new Error(`Order #${orderId} not found`);
    }

    currentOrder = order;
    console.log('[Orders MFE] Opened order:', orderId);

    // Dispatch event for UI update
    window.dispatchEvent(new Event('order-change'));

    return order;
  },

  /**
   * Set status of current order
   */
  async setStatus(status: OrderStatus): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (!currentOrder) {
      throw new Error('No order is currently open');
    }

    // Update in mock DB
    const orderIndex = ordersDB.findIndex((o) => o.id === currentOrder!.id);
    if (orderIndex !== -1) {
      ordersDB[orderIndex].status = status;
      currentOrder.status = status;
    }

    console.log('[Orders MFE] Updated order status:', currentOrder.id, '->', status);
    return true;
  },

  /**
   * Get all orders
   */
  async getOrders(): Promise<Order[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return [...ordersDB];
  },

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<Order | null> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return ordersDB.find((o) => o.id === orderId) || null;
  },

  /**
   * Create a new order
   */
  async createOrder(customer: string, items: string[], total: number): Promise<Order> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newOrder: Order = {
      id: Date.now(),
      customer,
      items,
      total,
      status: 'pending',
      createdAt: new Date(),
    };

    ordersDB.push(newOrder);
    console.log('[Orders MFE] Created new order:', newOrder.id);

    return newOrder;
  },
};

// ============ Styles ============

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    color: '#e0e0e0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    color: '#6366f1',
  },
  backButton: {
    padding: '0.375rem 0.75rem',
    background: 'transparent',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
    color: '#a0a0b0',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  orderItem: {
    padding: '0.75rem',
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  orderItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.375rem',
  },
  orderId: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  statusBadge: {
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    fontWeight: 500,
    color: 'white',
  },
  orderItemInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#a0a0b0',
  },
  orderTotal: {
    fontWeight: 500,
    color: '#22c55e',
  },
  noOrder: {
    textAlign: 'center',
    color: '#a0a0b0',
    padding: '2rem',
  },
  orderCard: {
    background: '#252542',
    border: '1px solid #3a3a5c',
    borderRadius: '8px',
    padding: '1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #3a3a5c',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1rem',
  },
  cardSection: {
    marginBottom: '0.75rem',
  },
  cardLabel: {
    fontSize: '0.7rem',
    color: '#a0a0b0',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
  },
  cardValue: {
    fontSize: '0.875rem',
  },
  itemsList: {
    margin: 0,
    paddingLeft: '1.25rem',
  },
  itemsListItem: {
    fontSize: '0.8rem',
    marginBottom: '0.125rem',
  },
  totalValue: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#22c55e',
  },
  statusButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  statusButton: {
    padding: '0.25rem 0.5rem',
    border: '1px solid #3a3a5c',
    borderRadius: '4px',
    fontSize: '0.65rem',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// ============ Module Manifest ============

export const manifest = {
  name: 'orders',
  version: '1.0.0',
  components: ['FrontContainer', 'OrdersList', 'OrderCard'],
  api: {
    openOrder: { args: ['orderId'], returns: 'Order' },
    setStatus: { args: ['status'], returns: 'boolean' },
    getOrders: { args: [], returns: 'Order[]' },
    getOrder: { args: ['orderId'], returns: 'Order' },
    createOrder: { args: ['customer', 'items', 'total'], returns: 'Order' },
  },
  dependencies: ['auth@^1.0.0'],
};

// Default export for module loading
export default { FrontContainer, OrdersList, OrderCard, api, manifest };
