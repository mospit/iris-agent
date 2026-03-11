# Iris Prototype Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

Iris is an AI-powered SAP GUI agent that lets users record SAP transactions (via VBS script recording), convert them to reusable parameterized workflows, and execute those workflows via natural language chat in a local web app. Built on top of pi-mono (`pi-ai`, `pi-agent-core`, `pi-web-ui`).

**Prototype scope:**
- Local web app (no Teams integration)
- Provider-agnostic LLM (Copilot, Azure OpenAI, Anthropic, etc. — configurable at runtime)
- Three target transactions: COOIS_PI, HUMO, MMBE
- Mock-first development, replace with real SAP bridge incrementally

**Target audience:** Corporate executives (demo-ready polish required)

## Project Structure

```
iris-agent/
├── package.json              # npm workspace root
├── packages/
│   ├── app/                  # Web app (main entry point)
│   │   ├── src/
│   │   │   ├── index.ts      # Express server + static files
│   │   │   ├── agent.ts      # Agent setup, tool registration, system prompt
│   │   │   └── index.html    # Shell page loading <agent-interface>
│   │   └── package.json
│   │
│   ├── sap-bridge/           # Python COM bridge (Windows-only)
│   │   ├── bridge.py         # WebSocket server + win32com SAP automation
│   │   ├── mock_bridge.py    # Fake SAP responses for dev
│   │   └── requirements.txt  # pywin32, websockets
│   │
│   ├── tools/                # SAP agent tools (TypeScript)
│   │   ├── src/
│   │   │   ├── sap-execute-workflow.ts
│   │   │   ├── sap-list-workflows.ts
│   │   │   ├── sap-upload-vbs.ts
│   │   │   ├── sap-recover.ts
│   │   │   └── types.ts
│   │   └── package.json
│   │
│   ├── vbs-parser/           # VBS → workflow JSON converter
│   │   ├── src/
│   │   │   ├── parser.ts     # Regex-based VBS extraction
│   │   │   └── parameterize.ts
│   │   └── package.json
│   │
│   └── workflow-executor/    # Deterministic step runner
│       ├── src/
│       │   ├── executor.ts
│       │   ├── assertions.ts
│       │   └── gates.ts
│       └── package.json
│
├── workflows/                # Saved workflow JSON files
└── docs/plans/
```

**Key decisions:**
- npm workspaces monorepo (same pattern as pi-mono)
- pi-mono consumed as git dependencies
- Python bridge is a separate process, WebSocket on localhost:8765
- Workflows stored as JSON files on disk (no database)

## SAP Bridge Protocol

Python WebSocket server wrapping SAP GUI's COM API.

### Commands (app → bridge)

```typescript
type BridgeCommand =
  | { action: "connect", connection: string, session: number }
  | { action: "readScreen" }
  | { action: "setField", id: string, value: string }
  | { action: "press", id: string }
  | { action: "sendVKey", code: number }
  | { action: "getStatusBar" }
  | { action: "screenshot" }
```

### Responses (bridge → app)

```typescript
type BridgeResponse =
  | { ok: true, data: any }
  | { ok: false, error: string }
```

### Screen State

```typescript
interface ScreenState {
  title: string
  transaction: string
  fields: { id: string, type: string, value: string, label?: string }[]
  statusBar: { type: "success" | "warning" | "error", text: string }
}
```

### Python COM Access

```python
SapGuiAuto = win32com.client.GetObject("SAPGUI")
application = SapGuiAuto.GetScriptingEngine
connection = application.Children(0)
session = connection.Children(0)
```

Mock bridge returns canned screen data for COOIS_PI, HUMO, MMBE. Same protocol — swap without changes.

## Workflow JSON Schema

```typescript
interface Workflow {
  id: string
  name: string
  description: string
  transaction: string
  parameters: ParameterDef[]
  steps: Step[]
}

interface ParameterDef {
  name: string
  label: string
  type: "string" | "number"
  required: boolean
  default?: string
}

interface Step {
  action: "setField" | "press" | "sendVKey" | "wait"
  target?: string
  value?: string              // Literal or "{{param_name}}" reference
  description: string
  assertion?: Assertion
  gate?: "confirm"
}

interface Assertion {
  field?: string
  title?: string
  statusBar?: string          // Regex pattern
  expect: string
}
```

### Executor Behavior

1. Opens transaction via sendVKey with `/nTCODE`
2. Walks steps sequentially, substituting `{{param}}` references
3. After each step, runs assertion if present — fails → error event
4. At `gate: "confirm"` steps, pauses and asks user via chat
5. Streams progress as tool execution updates (step-by-step checkmarks in chat)

### Error Recovery

If assertion fails (unexpected popup, wrong screen), the `sap_recover` tool is invoked. LLM sees current screen state, suggests corrective action. User confirms before it acts.

## VBS Parser

### Parsing (deterministic, no LLM)

Line-by-line regex matching:
- `.text = "value"` → `setField` step
- `.sendVKey N` → `sendVKey` step
- `.pressToolbarButton("...")` / `.press` → `press` step
- First `/n` command → transaction code extraction
- Consecutive field sets → grouped into logical steps
- `sendVKey 11` (Ctrl+S) → auto-add `gate: "confirm"`

### Parameterization (LLM-assisted)

After deterministic parsing, LLM reviews steps and suggests which literals should become parameters:
- `"000060004567"` → `{{order_number}}`
- `"1000"` → `{{plant}}`
- `/nCOOIS_PI` → never parameterized

User reviews and confirms in chat before workflow is saved.

### Upload Flow

1. User drops .vbs file in chat
2. `sap_upload_vbs` tool parses deterministically → shows steps
3. LLM suggests parameter names → shows to user
4. User confirms/adjusts
5. Workflow JSON saved to `workflows/` directory

## Agent Tools

| Tool | Purpose | Trigger |
|------|---------|---------|
| `sap_list_workflows` | Returns all saved workflows with parameters | "What can you do?" |
| `sap_execute_workflow` | Runs a workflow with provided parameters | "Check production order 60004567" |
| `sap_upload_vbs` | Parses VBS file into a workflow | User drops .vbs file |
| `sap_recover` | Handles unexpected screens during execution | Assertion fails mid-workflow |

**Key principle:** LLM never drives SAP directly. It matches intent to workflows, extracts parameters, and handles errors. The executor does the actual driving deterministically.

### System Prompt

```
You are Iris, a SAP automation assistant. You help users run SAP transactions
through saved workflows.

Your capabilities:
- List available workflows and their required parameters
- Execute workflows when the user provides enough information
- Convert VBS recordings into reusable workflows
- Help recover from errors during execution

Rules:
- Never guess parameter values. Ask the user if something is missing.
- Always confirm before executing a workflow.
- When a gate is reached, explain what will happen and ask for approval.
- If execution fails, describe the current screen state and suggest recovery options.
```

System prompt dynamically injected with current workflow list.

## Web App & UI

### Server

- Express serving static files + HTML shell
- Spawns Python SAP bridge as child process on startup
- No custom API routes — all intelligence runs through agent loop

### UI

```html
<agent-interface
  .session=${agent}
  .enableAttachments=${true}
  .enableModelSelector=${true}
></agent-interface>
```

**From pi-web-ui (free):**
- Chat with streaming responses
- File drag-and-drop (VBS uploads)
- Tool call visualization
- Model/provider selector + API key dialog
- Session persistence (IndexedDB)
- Dark/light theme

**Custom additions:**
- Workflow sidebar — list of saved workflows, click to pre-fill chat
- Execution progress — custom message renderer via `registerMessageRenderer()` showing step checkmarks
- Branding — Iris logo, corporate color scheme (#0d6e4f accent)

## Development & Deployment

### Development (dev machine)

- pi-mono linked locally
- Mock SAP bridge for all development
- `npm run dev` starts Express + mock bridge

### Deployment (company machine)

- Push to github.com/mospit/iris-agent.git
- Company machine: `git pull && npm install && npm start`
- Python bridge auto-starts, connects to real SAP GUI

### Milestones

| Milestone | Deliverable |
|-----------|-------------|
| M1 — App shell + mock bridge | Chat UI works, agent responds, fake SAP screens |
| M2 — Real SAP bridge | Agent drives actual SAP GUI on company machine |
| M3 — VBS parser + workflows | Upload recording, create workflow, execute it |
| M4 — Three transactions | COOIS_PI, HUMO, MMBE workflows polished |
| M5 — Exec demo ready | Branding, error handling, smooth end-to-end |

## Dependencies

### pi-mono packages
- `@mariozechner/pi-ai` — LLM provider abstraction (24+ providers including Copilot, Azure OpenAI)
- `@mariozechner/pi-agent-core` — Agent loop, tool calling, event streaming
- `@mariozechner/pi-web-ui` — Chat web components, file attachments, session storage

### Python (SAP bridge)
- `pywin32` — COM automation
- `websockets` — WebSocket server

### Node.js (app)
- `express` — HTTP server
- `ws` — WebSocket client (to bridge)
- `@sinclair/typebox` — Tool parameter schemas
