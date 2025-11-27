# FrontDocker / LiveUI - SpaceOS

> LiveUI: Interface of your dreams!
> LiveUI: UI that you dream!

FrontDocker is a micro-frontend infrastructure for SpaceOS that enables dynamic loading, composition, and AI-orchestrated management of independent UI modules.

## Features

- **Dynamic Module Loading**: Load micro-frontends as ES modules at runtime
- **Dependency Resolution**: Automatic loading of dependencies in correct order
- **AI Orchestration**: Natural language interface for UI control
- **Drag & Drop Composition**: Build interfaces by dragging components
- **Permissions System**: Secure cross-module API access control
- **Audit Logging**: Complete history of all API calls

## Project Structure

```
.
|-- packages/
|   |-- livesdk/           # Host library for Shell
|   |-- livesdk-client/    # Client library for MFEs
|-- shell/                 # FrontDocker Shell (React app)
|-- mfes/
|   |-- auth-mfe/          # Authentication module
|   |-- orders-mfe/        # Orders management module
|   |-- analytics-mfe/     # Analytics dashboard module
|-- docs/
    |-- design.md          # Architecture documentation
    |-- api-spec.md        # API specification
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies for all packages
npm install

# Or install individually
cd packages/livesdk && npm install
cd packages/livesdk-client && npm install
cd shell && npm install
cd mfes/auth-mfe && npm install
cd mfes/orders-mfe && npm install
cd mfes/analytics-mfe && npm install
```

### Development

Start the Shell and MFEs in separate terminals:

```bash
# Terminal 1: Start Shell (port 3000)
cd shell && npm run dev

# Terminal 2: Start Auth MFE (port 5001)
cd mfes/auth-mfe && npm run dev

# Terminal 3: Start Orders MFE (port 5002)
cd mfes/orders-mfe && npm run dev

# Terminal 4: Start Analytics MFE (port 5003)
cd mfes/analytics-mfe && npm run dev
```

Open http://localhost:3000 in your browser.

### Running Tests

```bash
cd packages/livesdk && npm test
```

## Usage

### Loading Modules

1. Open the Shell in your browser
2. Click "Load" on any module in the Registry panel
3. The module will be loaded and its components available

### Using AI Console

Enter natural language commands:

- "Login as admin"
- "Open order 123"
- "Open order 456 and mark as shipped"
- "Show analytics"

Russian commands also work:

- "Открой заказ 123"
- "Покажи аналитику"

### Drag & Drop

1. Load a module to see its components in the palette
2. Drag a component to the canvas area
3. Position and manage multiple components

## Creating a New MFE

1. Create a new directory in `mfes/`:

```bash
mkdir -p mfes/my-mfe/src
```

2. Set up `package.json` with Vite:

```json
{
  "name": "@frontdocker/my-mfe",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
```

3. Configure Vite for lib mode in `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MyMFE',
      fileName: 'my-mfe',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
    },
  },
});
```

4. Export components and API in `src/index.tsx`:

```typescript
export function FrontContainer() {
  return <div>My Component</div>;
}

export const api = {
  async myMethod(arg: string): Promise<string> {
    return `Result: ${arg}`;
  },
};

export const manifest = {
  name: 'my-mfe',
  version: '1.0.0',
  components: ['FrontContainer'],
  api: {
    myMethod: { args: ['arg'], returns: 'string' },
  },
};
```

5. Register the manifest in Shell's `App.tsx`.

## API Overview

### LiveSDK Host

```typescript
// Register a module manifest
host.registerModuleManifest(manifest);

// Load a module
const module = await host.loadMFE(url);

// Call module API
const result = await host.call('orders', 'openOrder', [123]);
```

### LiveSDK Client (in MFE)

```typescript
import { createClient } from '@frontdocker/livesdk-client';

const client = createClient();
await client.init({ name: 'my-mfe', version: '1.0.0' });

client.registerAPI({
  myMethod: async (arg) => `Result: ${arg}`,
});

client.ready();
```

### AI Bridge

```typescript
// Process natural language intent
const result = await aiBridge.processIntent('Open order 123');

// Execute the generated plan
const results = await aiBridge.executePlan(result.plan);
```

## Documentation

- [Design Document](docs/design.md) - Architecture and design decisions
- [API Specification](docs/api-spec.md) - Complete API reference

## Architecture

```
┌────────────────────┐
│        AI          │
│ Orchestrates UI &  │
│ calls MFE APIs     │
└─────────┬──────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌───────┐  ┌───────┐
│ Shell │  │LiveSDK│
│  UI   │  │ Host  │
└───┬───┘  └───┬───┘
    │          │
    ▼          ▼
┌──────────────────┐
│    MFE Registry  │
│  auth | orders | │
│     analytics    │
└──────────────────┘
```

## License

MIT
