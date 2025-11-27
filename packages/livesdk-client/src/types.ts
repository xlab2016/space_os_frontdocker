/**
 * LiveSDK Client Types
 */

/**
 * Client configuration for initializing the SDK
 */
export interface ClientConfig {
  name: string;
  version: string;
  permissions?: {
    allowedModules?: string[];
    allowedActions?: string[];
    requiresAuth?: boolean;
  };
}

/**
 * Event handler function type
 */
export type EventHandler = (payload: unknown) => void;

/**
 * API object that can be registered
 */
export type ApiObject = Record<string, (...args: unknown[]) => Promise<unknown> | unknown>;

/**
 * Client state
 */
export interface ClientState {
  initialized: boolean;
  ready: boolean;
  name: string;
  version: string;
}

/**
 * Host communication interface
 * This is what the client uses to communicate with the Shell
 */
export interface HostBridge {
  registerAPI(moduleName: string, api: ApiObject): void;
  notifyReady(moduleName: string): void;
  call(moduleName: string, method: string, args: unknown[]): Promise<unknown>;
  emit(eventName: string, payload: unknown): void;
  on(eventName: string, handler: EventHandler): () => void;
}

/**
 * LiveSDK Client interface
 */
export interface ILiveSDKClient {
  init(config: ClientConfig): Promise<void>;
  registerAPI(apiObj: ApiObject): void;
  ready(): void;
  on(event: string, handler: EventHandler): () => void;
  emit(event: string, payload: unknown): void;
  call(moduleName: string, method: string, args: unknown[]): Promise<unknown>;
  getState(): ClientState;
}
