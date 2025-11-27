/**
 * LiveSDK Client - Client library for micro-frontends
 * Provides integration with the FrontDocker Shell
 */

import type {
  ClientConfig,
  ClientState,
  EventHandler,
  ApiObject,
  HostBridge,
  ILiveSDKClient,
} from './types.js';

/**
 * Default host bridge that uses window.__LIVESDK_HOST__
 * In production, this connects to the actual Shell
 */
function getDefaultHostBridge(): HostBridge | null {
  if (typeof window !== 'undefined' && (window as unknown as { __LIVESDK_HOST__?: HostBridge }).__LIVESDK_HOST__) {
    return (window as unknown as { __LIVESDK_HOST__: HostBridge }).__LIVESDK_HOST__;
  }
  return null;
}

/**
 * LiveSDK Client class
 */
export class LiveSDKClient implements ILiveSDKClient {
  private state: ClientState = {
    initialized: false,
    ready: false,
    name: '',
    version: '',
  };

  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private registeredApi: ApiObject | null = null;
  private hostBridge: HostBridge | null = null;
  private debug: boolean;

  constructor(options?: { debug?: boolean; hostBridge?: HostBridge }) {
    this.debug = options?.debug ?? false;
    this.hostBridge = options?.hostBridge ?? null;
  }

  /**
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log(`[LiveSDK Client:${this.state.name || 'unknown'}]`, ...args);
    }
  }

  /**
   * Get the host bridge (lazy initialization)
   */
  private getHost(): HostBridge | null {
    if (!this.hostBridge) {
      this.hostBridge = getDefaultHostBridge();
    }
    return this.hostBridge;
  }

  /**
   * Initialize the client with configuration
   */
  async init(config: ClientConfig): Promise<void> {
    this.log('Initializing with config:', config);

    if (this.state.initialized) {
      throw new Error('LiveSDK Client is already initialized');
    }

    this.state.name = config.name;
    this.state.version = config.version;
    this.state.initialized = true;

    // If we have a registered API and host bridge, register it
    const host = this.getHost();
    if (host && this.registeredApi) {
      host.registerAPI(this.state.name, this.registeredApi);
    }

    this.log('Initialized successfully');
  }

  /**
   * Register an API object
   */
  registerAPI(apiObj: ApiObject): void {
    this.log('Registering API:', Object.keys(apiObj));

    this.registeredApi = apiObj;

    // If already initialized and have host bridge, register immediately
    const host = this.getHost();
    if (this.state.initialized && host) {
      host.registerAPI(this.state.name, apiObj);
    }
  }

  /**
   * Signal that the module is ready
   */
  ready(): void {
    this.log('Marking as ready');

    if (!this.state.initialized) {
      throw new Error('Cannot mark as ready before initialization');
    }

    this.state.ready = true;

    const host = this.getHost();
    if (host) {
      host.notifyReady(this.state.name);
    }

    // Emit local ready event
    this.emitLocal('ready', { name: this.state.name, version: this.state.version });
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: EventHandler): () => void {
    this.log('Subscribing to event:', event);

    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);

    // Also subscribe to host events if available
    const host = this.getHost();
    let hostUnsubscribe: (() => void) | null = null;
    if (host) {
      hostUnsubscribe = host.on(event, handler);
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
      if (hostUnsubscribe) {
        hostUnsubscribe();
      }
    };
  }

  /**
   * Emit an event (to host and local handlers)
   */
  emit(event: string, payload: unknown): void {
    this.log('Emitting event:', event, payload);

    // Emit to host
    const host = this.getHost();
    if (host) {
      host.emit(event, payload);
    }

    // Also emit locally
    this.emitLocal(event, payload);
  }

  /**
   * Emit event only to local handlers
   */
  private emitLocal(event: string, payload: unknown): void {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[LiveSDK Client] Event handler error for '${event}':`, error);
      }
    }
  }

  /**
   * Call another module's API method
   */
  async call(moduleName: string, method: string, args: unknown[]): Promise<unknown> {
    this.log('Calling:', moduleName + '.' + method, args);

    const host = this.getHost();
    if (!host) {
      throw new Error('Host bridge not available. Make sure the module is running inside FrontDocker Shell.');
    }

    return host.call(moduleName, method, args);
  }

  /**
   * Get the current client state
   */
  getState(): ClientState {
    return { ...this.state };
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * Check if the client is ready
   */
  isReady(): boolean {
    return this.state.ready;
  }

  /**
   * Get module name
   */
  getName(): string {
    return this.state.name;
  }

  /**
   * Get module version
   */
  getVersion(): string {
    return this.state.version;
  }
}

/**
 * Create a new LiveSDK Client instance
 */
export function createClient(options?: {
  debug?: boolean;
  hostBridge?: HostBridge;
}): LiveSDKClient {
  return new LiveSDKClient(options);
}

// Module-level singleton for convenience
let defaultClientInstance: LiveSDKClient | null = null;

/**
 * Get the default client instance (creates one if not exists)
 */
export function getClient(options?: { debug?: boolean }): LiveSDKClient {
  if (!defaultClientInstance) {
    defaultClientInstance = new LiveSDKClient(options);
  }
  return defaultClientInstance;
}

/**
 * Reset the default client (useful for testing)
 */
export function resetClient(): void {
  defaultClientInstance = null;
}
