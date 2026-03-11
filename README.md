# Iris Agent

SAP GUI automation agent that lets you run SAP transactions through natural language chat. Built as a TypeScript monorepo with a Python WebSocket bridge to SAP GUI's COM API.

## Quick Start

```bash
npm install
npm run build
npm start
# Web UI at http://localhost:3000, mock SAP bridge on ws://localhost:8765
```

For real SAP GUI automation (Windows only):

```bash
pip install pywin32 websockets
BRIDGE_SCRIPT=packages/sap-bridge/bridge.py npm start
```

## Architecture

```
iris-agent/
├── packages/
│   ├── app/                  Express server + esbuild client bundler + web UI
│   ├── tools/                SAP agent tools, bridge client, shared types
│   ├── vbs-parser/           VBS recording → workflow JSON converter
│   ├── workflow-executor/    Deterministic step executor with gates & assertions
│   └── sap-bridge/           Python WebSocket bridge (mock + real SAP COM)
├── workflows/                Pre-built workflow JSON files (COOIS_PI, HUMO, MMBE)
└── pi-mono/                  Git-ignored cloned dependency
```

### Agent Tools

| Tool | Description |
|------|-------------|
| `sap_list_workflows` | List available workflows and their parameters |
| `sap_execute_workflow` | Run a saved workflow with step-by-step progress |
| `sap_upload_vbs` | Convert a VBS recording into a reusable workflow |
| `sap_recover` | Read screen state and recover from errors |

### Bridge Protocol

The TypeScript client communicates with the Python bridge over WebSocket (JSON messages on `ws://localhost:8765`). Supported actions: `connect`, `readScreen`, `setField`, `press`, `sendVKey`, `getStatusBar`, `screenshot`.

### Workflows

JSON files with parameterized steps. Parameters use `{{name}}` syntax and are resolved at execution time. Steps can include assertions (screen title, field value, status bar) and confirmation gates.

## Build Order

```
tools → vbs-parser → workflow-executor → app
```

## Development

```bash
npm run dev          # Watch mode for the app
npm run build        # Full production build
```

### Mock Bridge

The mock bridge (`packages/sap-bridge/mock_bridge.py`) provides canned responses for three SAP transactions:

- **COOIS_PI** — Production Order Information System
- **HUMO** — Organizational Structure Display
- **MMBE** — Stock Overview

```bash
cd packages/sap-bridge
pip install websockets
python mock_bridge.py
```

## Tech Stack

- **TypeScript** — All packages (NodeNext modules, ES2022 target)
- **Express 5** — Web server
- **esbuild** — Client bundling
- **TypeBox** — Tool parameter schemas
- **Python** — SAP bridge (websockets + pywin32)
- **WebSocket (ws)** — Bridge communication
