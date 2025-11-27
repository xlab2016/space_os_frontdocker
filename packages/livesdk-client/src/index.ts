/**
 * @frontdocker/livesdk-client - LiveSDK Client Library
 * Library for micro-frontends to integrate with FrontDocker Shell
 */

// Types
export type {
  ClientConfig,
  ClientState,
  EventHandler,
  ApiObject,
  HostBridge,
  ILiveSDKClient,
} from './types.js';

// Client
export {
  LiveSDKClient,
  createClient,
  getClient,
  resetClient,
} from './livesdk-client.js';
