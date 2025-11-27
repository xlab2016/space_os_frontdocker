# FrontDocker / LiveUI - Design Document

## Overview

FrontDocker is a micro-frontend infrastructure for SpaceOS that enables dynamic loading, composition, and orchestration of independent UI modules. The system includes:

- **FrontDocker Shell**: The main host application that manages micro-frontends
- **LiveSDK**: Core libraries for host-MFE communication
- **AI Bridge**: Natural language interface for UI orchestration
- **CMS Features**: Drag-and-drop component composition

## Architecture

```
                       ┌────────────────────┐
                       │        AI          │
                       │ Orchestrates UI &  │
                       │ calls MFE APIs     │
                       └─────────┬──────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           │                     │                     │
           ▼                     ▼                     ▼
   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
   │ FrontDocker │       │   Shell/CMS │       │  LiveSDK    │
   │   Engine    │       │  UI Panel   │       │  Host &     │
   │  Dynamic    │       │ Drag & Drop │       │  Client     │
   │  Loader     │       │ Configs     │       │  Libraries  │
   └─────┬───────┘       └─────┬───────┘       └─────┬───────┘
         │                     │                     │
         ▼                     ▼                     ▼
  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
  │  Auth MFE   │       │ Orders MFE  │  ...  │Analytics MFE│
  │ Components  │       │ Components  │       │ Components  │
  │ + API       │       │ + API       │       │ + API       │
  └─────────────┘       └─────────────┘       └─────────────┘
```

## Key Components

### 1. LiveSDK Host (@frontdocker/livesdk)

The core library running in the Shell that manages:

- **Module Registry**: Tracks all registered and loaded MFEs
- **Dynamic Import**: Loads MFE bundles as ES modules
- **API Registration**: Stores and routes API calls to MFEs
- **Dependency Resolution**: Ensures dependencies load in correct order
- **Permissions**: Controls cross-module API access
- **Audit Logging**: Records all API calls for debugging/security

### 2. LiveSDK Client (@frontdocker/livesdk-client)

Library included in each MFE for Shell communication:

- **Initialization**: Registers module with Shell
- **API Registration**: Exposes module's API to Shell
- **Event System**: Subscribes to and emits events
- **Cross-module Calls**: Calls other modules via Shell

### 3. AI Bridge

Natural language interface for UI orchestration:

- **Rule-based Planner**: Pattern matching for common intents
- **LLM Integration**: Optional external AI for complex intents
- **Action Plans**: Sequences of API calls to execute
- **Multilingual**: Supports English and Russian commands

### 4. Module Manifest

JSON structure describing each MFE:

```json
{
  "name": "orders",
  "version": "1.0.0",
  "url": "http://localhost:5002/orders-mfe.js",
  "components": ["FrontContainer", "OrdersList", "OrderCard"],
  "api": {
    "openOrder": { "args": ["orderId"], "returns": "Order" },
    "setStatus": { "args": ["status"], "returns": "boolean" }
  },
  "dependencies": ["auth@^1.0.0"],
  "permissions": {
    "allowedModules": ["auth"],
    "requiresAuth": true
  }
}
```

## Data Flow

### Module Loading

1. Shell registers manifest via `registerModuleManifest()`
2. User clicks "Load" or dependency resolution triggers load
3. Shell resolves dependencies (topological sort)
4. Dependencies loaded first via `loadMFE(url)`
5. Target MFE loaded via dynamic import
6. MFE's API extracted and registered
7. Registry status updated to "loaded"
8. Event `module:loaded` emitted

### API Calls

1. Caller invokes `host.call(module, method, args)`
2. Permissions checked via PermissionsManager
3. Method looked up in registered APIs
4. Method executed with args
5. Result/error logged to AuditLogger
6. Result returned to caller

### AI Intent Processing

1. User enters natural language command
2. AIBridge receives intent string
3. Rule-based patterns checked first
4. If match found, action plan generated
5. If no match and LLM configured, LLM called
6. Action plan returned to Shell
7. Shell executes plan steps sequentially
8. Results displayed to user

## Security Model

### Permissions

- **Shell**: Full access to all modules
- **MFEs**: Access controlled by manifest permissions
- **Wildcards**: Support `*` for broad access (with warnings)
- **Prefix Patterns**: Support `prefix*` for namespaced access

### Audit Logging

All API calls logged with:
- Timestamp
- Caller module
- Target module and method
- Arguments
- Result or error
- Execution duration

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Build**: Vite 5
- **Module Format**: ES Modules
- **Testing**: Vitest
- **Styling**: CSS Modules

## Development Workflow

### Creating a New MFE

1. Create new directory in `mfes/`
2. Set up Vite with lib mode
3. Export components and API
4. Create manifest
5. Register in Shell's default manifests

### Testing

```bash
# Run livesdk unit tests
cd packages/livesdk && npm test

# Run Shell
cd shell && npm run dev

# Run MFE (in separate terminal)
cd mfes/orders-mfe && npm run dev
```

## Future Enhancements

- **Iframe Sandbox**: For untrusted third-party MFEs
- **Version Management**: Side-by-side MFE versions
- **Hot Reload**: Update MFEs without full page refresh
- **Server-side Integration**: SSR support for Shell
- **Federation**: Webpack Module Federation integration
