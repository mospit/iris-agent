# Iris Agent

SAP GUI automation agent using pi-mono.

## Quick Start

```bash
npm install
npm run build
npm start
# Opens at http://localhost:3000, mock SAP bridge on ws://localhost:8765
```

## Architecture

- `packages/app` — Express server + web UI (pi-web-ui ChatPanel)
- `packages/tools` — SAP agent tools, bridge client, shared types
- `packages/vbs-parser` — VBS recording -> workflow JSON converter
- `packages/workflow-executor` — Deterministic step executor
- `packages/sap-bridge` — Python WebSocket bridge (mock + real)
- `workflows/` — Saved workflow JSON files
- `pi-mono/` — Git-ignored, cloned dependency

## Key Patterns

- Tools use TypeBox schemas, registered via pi-agent-core's AgentTool interface
- Bridge protocol: JSON over WebSocket on localhost:8765
- Workflows: JSON files with parameterized steps
- Frontend: pi-web-ui's ChatPanel web component, zero custom UI framework

## Build Order

tools -> vbs-parser -> workflow-executor -> app
