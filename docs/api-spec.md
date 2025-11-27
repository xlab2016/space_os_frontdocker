# FrontDocker / LiveUI - API Specification

## LiveSDK Host API

### Interface: ILiveSDKHost

```typescript
interface ILiveSDKHost {
  loadMFE(url: string): Promise<LoadedModule>;
  unloadMFE(moduleName: string): Promise<void>;
  registerModuleManifest(manifest: ModuleManifest): void;
  call(moduleName: string, method: string, args: unknown[]): Promise<unknown>;
  resolveDependencies(manifest: ModuleManifest): Promise<void>;
  registerAPI(moduleName: string, apiObj: Record<string, Function>): void;
  getRegistry(): Map<string, RegistryEntry>;
  getManifests(): ModuleManifest[];
  getAuditLog(): AuditLogEntry[];
}
```

### Methods

#### `loadMFE(url: string): Promise<LoadedModule>`

Dynamically loads a micro-frontend from the specified URL.

**Parameters:**
- `url`: URL of the ES module bundle

**Returns:**
- `LoadedModule` object containing exports and API

**Example:**
```typescript
const module = await host.loadMFE('http://localhost:5001/auth-mfe.js');
console.log(module.manifest.name); // 'auth'
```

---

#### `registerModuleManifest(manifest: ModuleManifest): void`

Registers a module manifest without loading the module.

**Parameters:**
- `manifest`: Module manifest object

**Example:**
```typescript
host.registerModuleManifest({
  name: 'orders',
  version: '1.0.0',
  url: 'http://localhost:5002/orders-mfe.js',
  components: ['OrdersList'],
  api: { openOrder: { args: ['orderId'], returns: 'Order' } },
  dependencies: ['auth@^1.0.0']
});
```

---

#### `call(moduleName: string, method: string, args: unknown[]): Promise<unknown>`

Calls an API method on a loaded module.

**Parameters:**
- `moduleName`: Name of the target module
- `method`: Method name to call
- `args`: Array of arguments

**Returns:**
- Result of the API call

**Throws:**
- Error if module not found
- Error if method not found
- Error if permission denied

**Example:**
```typescript
const order = await host.call('orders', 'openOrder', [123]);
console.log(order.status);
```

---

#### `resolveDependencies(manifest: ModuleManifest): Promise<void>`

Loads all dependencies for a module in the correct order.

**Parameters:**
- `manifest`: Manifest of the module needing dependencies

**Throws:**
- Error if dependency conflicts exist

---

## LiveSDK Client API

### Interface: ILiveSDKClient

```typescript
interface ILiveSDKClient {
  init(config: ClientConfig): Promise<void>;
  registerAPI(apiObj: ApiObject): void;
  ready(): void;
  on(event: string, handler: EventHandler): () => void;
  emit(event: string, payload: unknown): void;
  call(moduleName: string, method: string, args: unknown[]): Promise<unknown>;
}
```

### Methods

#### `init(config: ClientConfig): Promise<void>`

Initializes the client with module configuration.

**Parameters:**
- `config.name`: Module name
- `config.version`: Module version

**Example:**
```typescript
await client.init({ name: 'orders', version: '1.0.0' });
```

---

#### `registerAPI(apiObj: ApiObject): void`

Registers the module's API with the Shell.

**Parameters:**
- `apiObj`: Object containing API methods

**Example:**
```typescript
client.registerAPI({
  openOrder: async (orderId) => { /* ... */ },
  setStatus: async (status) => { /* ... */ }
});
```

---

#### `ready(): void`

Signals that the module is fully initialized and ready.

**Example:**
```typescript
client.ready();
```

---

## Type Definitions

### ModuleManifest

```typescript
interface ModuleManifest {
  name: string;
  version: string;
  url: string;
  components: string[];
  api: Record<string, ApiMethodDef>;
  dependencies?: string[];
  permissions?: PermissionsConfig;
}
```

### ApiMethodDef

```typescript
interface ApiMethodDef {
  args: string[];
  returns: string;
  description?: string;
}
```

### LoadedModule

```typescript
interface LoadedModule {
  manifest: ModuleManifest;
  exports: Record<string, unknown>;
  api: Record<string, Function>;
  ready: boolean;
}
```

### RegistryEntry

```typescript
interface RegistryEntry {
  manifest: ModuleManifest;
  module: LoadedModule | null;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  error?: Error;
  loadedAt?: Date;
}
```

### ActionStep

```typescript
interface ActionStep {
  id: number;
  module: string;
  method: string;
  args: unknown[];
  waitFor?: boolean;
  description?: string;
}
```

### ActionPlan

```typescript
type ActionPlan = ActionStep[];
```

### AuditLogEntry

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  caller: string;
  module: string;
  method: string;
  args: unknown[];
  result?: unknown;
  error?: string;
  duration: number;
}
```

---

## AI Bridge API

### IntentResult

```typescript
interface IntentResult {
  success: boolean;
  plan: ActionPlan;
  explanation: string;
  suggestedResponse?: string;
}
```

### Methods

#### `processIntent(intent: string): Promise<IntentResult>`

Processes a natural language intent and generates an action plan.

**Parameters:**
- `intent`: Natural language command

**Returns:**
- `IntentResult` with success status and action plan

**Example:**
```typescript
const result = await aiBridge.processIntent('Open order 123 and mark as shipped');
// result.plan = [
//   { module: 'auth', method: 'ensureAuthenticated', args: [] },
//   { module: 'orders', method: 'openOrder', args: [123] },
//   { module: 'orders', method: 'setStatus', args: ['shipped'] }
// ]
```

---

#### `executePlan(plan: ActionPlan): Promise<ActionResult[]>`

Executes an action plan sequentially.

**Parameters:**
- `plan`: Array of action steps

**Returns:**
- Array of execution results

---

## MFE API Contracts

### Auth MFE

```typescript
const api = {
  login(username: string, password: string): Promise<AuthToken>;
  logout(): Promise<boolean>;
  getCurrentUser(): Promise<User | null>;
  ensureAuthenticated(): Promise<boolean>;
  hasRole(role: string): Promise<boolean>;
  getToken(): Promise<string | null>;
};
```

### Orders MFE

```typescript
const api = {
  openOrder(orderId: number): Promise<Order>;
  setStatus(status: OrderStatus): Promise<boolean>;
  getOrders(): Promise<Order[]>;
  getOrder(orderId: number): Promise<Order | null>;
  createOrder(customer: string, items: string[], total: number): Promise<Order>;
};
```

### Analytics MFE

```typescript
const api = {
  getSummary(): Promise<AnalyticsSummary>;
  getMetrics(metricType: string): Promise<Metric[]>;
  getRealTimeStats(): Promise<{ activeUsers: number; ordersPerMinute: number }>;
  exportReport(format: 'json' | 'csv'): Promise<string>;
};
```

---

## Event Types

```typescript
type LiveSDKEventType =
  | 'module:loaded'
  | 'module:unloaded'
  | 'module:error'
  | 'api:call'
  | 'api:result'
  | 'plan:start'
  | 'plan:step'
  | 'plan:complete'
  | 'plan:error';
```
