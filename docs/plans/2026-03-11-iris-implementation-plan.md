# Iris SAP Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local web app that automates SAP GUI transactions via natural language chat, using pi-mono for the agent loop and UI.

**Architecture:** Express server hosts static web app using pi-web-ui's ChatPanel. Agent has 4 SAP tools. Python WebSocket bridge wraps SAP GUI COM API. Mock bridge enables development without SAP. VBS parser converts recordings to reusable workflow JSON files.

**Tech Stack:** TypeScript, pi-mono (pi-ai, pi-agent-core, pi-web-ui), Python (pywin32, websockets), Express, WebSocket (ws), TypeBox, Lit, Tailwind CSS v4.

---

### Task 1: Initialize Repository & Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `packages/app/package.json`
- Create: `packages/tools/package.json`
- Create: `packages/vbs-parser/package.json`
- Create: `packages/workflow-executor/package.json`

**Step 1: Initialize git repo and push initial commit**

```bash
cd D:/projects/product/iris
git init
```

**Step 2: Create root package.json with npm workspaces**

Create `package.json`:
```json
{
  "name": "iris-agent",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build -w packages/tools && npm run build -w packages/vbs-parser && npm run build -w packages/workflow-executor && npm run build -w packages/app",
    "dev": "npm run dev -w packages/app",
    "start": "npm run start -w packages/app"
  }
}
```

**Step 3: Create root tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

**Step 4: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
*.js.map
.env
pi-mono/
```

**Step 5: Create packages/tools/package.json**

```json
{
  "name": "@iris/tools",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@mariozechner/pi-agent-core": "file:../../pi-mono/packages/agent",
    "@mariozechner/pi-ai": "file:../../pi-mono/packages/ai",
    "@sinclair/typebox": "^0.34.41",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.13",
    "typescript": "^5.7.0"
  }
}
```

**Step 6: Create packages/tools/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 7: Create packages/vbs-parser/package.json**

```json
{
  "name": "@iris/vbs-parser",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@iris/tools": "*"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 8: Create packages/vbs-parser/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 9: Create packages/workflow-executor/package.json**

```json
{
  "name": "@iris/workflow-executor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@iris/tools": "*",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/ws": "^8.5.13",
    "typescript": "^5.7.0"
  }
}
```

**Step 10: Create packages/workflow-executor/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

**Step 11: Create packages/app/package.json**

```json
{
  "name": "@iris/app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/server/index.js",
  "scripts": {
    "build": "node build.mjs",
    "dev": "node build.mjs --dev",
    "start": "node dist/server/index.js"
  },
  "dependencies": {
    "@iris/tools": "*",
    "@iris/vbs-parser": "*",
    "@iris/workflow-executor": "*",
    "@mariozechner/pi-agent-core": "file:../../pi-mono/packages/agent",
    "@mariozechner/pi-ai": "file:../../pi-mono/packages/ai",
    "@mariozechner/pi-web-ui": "file:../../pi-mono/packages/web-ui",
    "@mariozechner/mini-lit": "file:../../pi-mono/node_modules/@mariozechner/mini-lit",
    "express": "^5.1.0",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.13",
    "esbuild": "^0.25.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 12: Create packages/app/tsconfig.json for server code**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/server",
    "rootDir": "src/server"
  },
  "include": ["src/server"]
}
```

**Step 13: Create workflows/ directory**

```bash
mkdir -p workflows
echo "[]" > workflows/.gitkeep
```

**Step 14: Install dependencies**

```bash
cd D:/projects/product/iris
npm install
```

**Step 15: Commit**

```bash
git add package.json tsconfig.json .gitignore packages/*/package.json packages/*/tsconfig.json workflows/.gitkeep docs/
git commit -m "feat: initialize iris-agent workspace with package structure"
```

---

### Task 2: Shared Types & Bridge Client

**Files:**
- Create: `packages/tools/src/types.ts`
- Create: `packages/tools/src/bridge-client.ts`
- Create: `packages/tools/src/index.ts`

**Step 1: Create shared types**

Create `packages/tools/src/types.ts`:
```typescript
// ── Bridge Protocol ──

export type BridgeCommand =
  | { action: "connect"; connection: string; session: number }
  | { action: "readScreen" }
  | { action: "setField"; id: string; value: string }
  | { action: "press"; id: string }
  | { action: "sendVKey"; code: number }
  | { action: "getStatusBar" }
  | { action: "screenshot" };

export type BridgeResponse =
  | { ok: true; data: any }
  | { ok: false; error: string };

export interface ScreenState {
  title: string;
  transaction: string;
  fields: ScreenField[];
  statusBar: StatusBar;
}

export interface ScreenField {
  id: string;
  type: "text" | "button" | "checkbox" | "combobox" | "label";
  value: string;
  label?: string;
  changeable?: boolean;
}

export interface StatusBar {
  type: "success" | "warning" | "error" | "info";
  text: string;
}

// ── Workflow Schema ──

export interface Workflow {
  id: string;
  name: string;
  description: string;
  transaction: string;
  parameters: ParameterDef[];
  steps: Step[];
}

export interface ParameterDef {
  name: string;
  label: string;
  type: "string" | "number";
  required: boolean;
  default?: string;
}

export interface Step {
  action: "setField" | "press" | "sendVKey" | "wait";
  target?: string;
  value?: string;
  description: string;
  assertion?: Assertion;
  gate?: "confirm";
}

export interface Assertion {
  field?: string;
  title?: string;
  statusBar?: string;
  expect: string;
}

// ── Execution Events ──

export type ExecutionEvent =
  | { type: "step_start"; stepIndex: number; total: number; description: string }
  | { type: "step_ok"; stepIndex: number; total: number; description: string }
  | { type: "step_fail"; stepIndex: number; description: string; error: string }
  | { type: "gate"; stepIndex: number; description: string }
  | { type: "complete"; message: string }
  | { type: "error"; message: string };
```

**Step 2: Create bridge client**

Create `packages/tools/src/bridge-client.ts`:
```typescript
import WebSocket from "ws";
import type { BridgeCommand, BridgeResponse, ScreenState } from "./types.js";

export class BridgeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private requestId = 0;
  private pending = new Map<number, { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void }>();

  constructor(url = "ws://localhost:8765") {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", () => resolve());
      this.ws.on("error", (err) => reject(err));
      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        const pending = this.pending.get(msg.id);
        if (pending) {
          this.pending.delete(msg.id);
          pending.resolve(msg);
        }
      });
      this.ws.on("close", () => {
        for (const p of this.pending.values()) {
          p.reject(new Error("Bridge connection closed"));
        }
        this.pending.clear();
        this.ws = null;
      });
    });
  }

  async send(command: BridgeCommand): Promise<BridgeResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Bridge not connected");
    }
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, ...command }));
    });
  }

  async readScreen(): Promise<ScreenState> {
    const res = await this.send({ action: "readScreen" });
    if (!res.ok) throw new Error(res.error);
    return res.data as ScreenState;
  }

  async setField(id: string, value: string): Promise<void> {
    const res = await this.send({ action: "setField", id, value });
    if (!res.ok) throw new Error(res.error);
  }

  async press(id: string): Promise<void> {
    const res = await this.send({ action: "press", id });
    if (!res.ok) throw new Error(res.error);
  }

  async sendVKey(code: number): Promise<void> {
    const res = await this.send({ action: "sendVKey", code });
    if (!res.ok) throw new Error(res.error);
  }

  async screenshot(): Promise<string> {
    const res = await this.send({ action: "screenshot" });
    if (!res.ok) throw new Error(res.error);
    return res.data as string;
  }

  async getStatusBar(): Promise<{ type: string; text: string }> {
    const res = await this.send({ action: "getStatusBar" });
    if (!res.ok) throw new Error(res.error);
    return res.data;
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

**Step 3: Create index.ts export**

Create `packages/tools/src/index.ts`:
```typescript
export * from "./types.js";
export * from "./bridge-client.js";
```

**Step 4: Build and verify**

```bash
cd D:/projects/product/iris
npm run build -w packages/tools
```

Expected: Compiles without errors.

**Step 5: Commit**

```bash
git add packages/tools/src/
git commit -m "feat: add shared types and SAP bridge client"
```

---

### Task 3: Mock SAP Bridge (Python)

**Files:**
- Create: `packages/sap-bridge/mock_bridge.py`
- Create: `packages/sap-bridge/requirements.txt`

**Step 1: Create mock bridge with canned responses for COOIS_PI, HUMO, MMBE**

Create `packages/sap-bridge/mock_bridge.py`:
```python
import asyncio
import json
import logging

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("Install websockets: pip install websockets")
    raise

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("mock-sap-bridge")

# Simulated SAP state
current_screen = {
    "title": "SAP Easy Access",
    "transaction": "",
    "fields": [],
    "statusBar": {"type": "info", "text": "Ready"}
}

# Canned screen data per transaction
SCREENS = {
    "COOIS_PI": {
        "initial": {
            "title": "Production Order Information System",
            "transaction": "COOIS_PI",
            "fields": [
                {"id": "wnd[0]/usr/ctxtS_AUFNR-LOW", "type": "text", "value": "", "label": "Order Number From", "changeable": True},
                {"id": "wnd[0]/usr/ctxtS_AUFNR-HIGH", "type": "text", "value": "", "label": "Order Number To", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_WERKS", "type": "text", "value": "", "label": "Plant", "changeable": True},
                {"id": "wnd[0]/usr/ctxtS_MATNR-LOW", "type": "text", "value": "", "label": "Material", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter selection criteria"}
        },
        "result": {
            "title": "Production Orders: Header Data",
            "transaction": "COOIS_PI",
            "fields": [
                {"id": "wnd[0]/usr/lbl[0,0]", "type": "label", "value": "Order", "label": "Order"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "000060004567", "label": "Order Number"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Production", "label": "Order Type"},
                {"id": "wnd[0]/usr/txt[2,1]", "type": "text", "value": "REL", "label": "System Status"},
                {"id": "wnd[0]/usr/txt[3,1]", "type": "text", "value": "BOLT-M8", "label": "Material"},
                {"id": "wnd[0]/usr/txt[4,1]", "type": "text", "value": "500 EA", "label": "Target Quantity"},
                {"id": "wnd[0]/usr/txt[5,1]", "type": "text", "value": "350 EA", "label": "Confirmed Qty"},
            ],
            "statusBar": {"type": "success", "text": "7 entries found"}
        }
    },
    "HUMO": {
        "initial": {
            "title": "Display/Change HR Master Data",
            "transaction": "HUMO",
            "fields": [
                {"id": "wnd[0]/usr/ctxtP_PERNR", "type": "text", "value": "", "label": "Personnel Number", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_ORGEH", "type": "text", "value": "", "label": "Organizational Unit", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_BEGDA", "type": "text", "value": "", "label": "Start Date", "changeable": True},
                {"id": "wnd[0]/usr/ctxtP_ENDDA", "type": "text", "value": "", "label": "End Date", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter selection parameters"}
        },
        "result": {
            "title": "Organizational Structure: Display",
            "transaction": "HUMO",
            "fields": [
                {"id": "wnd[0]/usr/txt[0,0]", "type": "text", "value": "50000123", "label": "Org Unit"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "Production Dept A", "label": "Description"},
                {"id": "wnd[0]/usr/txt[1,0]", "type": "text", "value": "50000124", "label": "Position"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Plant Manager", "label": "Description"},
                {"id": "wnd[0]/usr/txt[2,0]", "type": "text", "value": "00001234", "label": "Employee"},
                {"id": "wnd[0]/usr/txt[2,1]", "type": "text", "value": "John Smith", "label": "Name"},
            ],
            "statusBar": {"type": "success", "text": "Organization structure displayed"}
        }
    },
    "MMBE": {
        "initial": {
            "title": "Stock Overview",
            "transaction": "MMBE",
            "fields": [
                {"id": "wnd[0]/usr/ctxtMATNR", "type": "text", "value": "", "label": "Material", "changeable": True},
                {"id": "wnd[0]/usr/ctxtWERKS", "type": "text", "value": "", "label": "Plant", "changeable": True},
                {"id": "wnd[0]/usr/ctxtLGORT", "type": "text", "value": "", "label": "Storage Location", "changeable": True},
            ],
            "statusBar": {"type": "info", "text": "Enter material for stock overview"}
        },
        "result": {
            "title": "Stock Overview: Material BOLT-M8",
            "transaction": "MMBE",
            "fields": [
                {"id": "wnd[0]/usr/txt[0,0]", "type": "text", "value": "BOLT-M8", "label": "Material"},
                {"id": "wnd[0]/usr/txt[0,1]", "type": "text", "value": "Hex Bolt M8x30", "label": "Description"},
                {"id": "wnd[0]/usr/txt[1,0]", "type": "text", "value": "1000", "label": "Plant"},
                {"id": "wnd[0]/usr/txt[1,1]", "type": "text", "value": "Main Plant", "label": "Plant Name"},
                {"id": "wnd[0]/usr/txt[2,0]", "type": "text", "value": "12,500 EA", "label": "Unrestricted Stock"},
                {"id": "wnd[0]/usr/txt[3,0]", "type": "text", "value": "1,200 EA", "label": "Quality Inspection"},
                {"id": "wnd[0]/usr/txt[4,0]", "type": "text", "value": "500 EA", "label": "Blocked Stock"},
                {"id": "wnd[0]/usr/txt[5,0]", "type": "text", "value": "3,000 EA", "label": "In Transit"},
            ],
            "statusBar": {"type": "success", "text": "Stock overview displayed"}
        }
    }
}

# Track state
state = {
    "transaction": None,
    "phase": "initial",  # "initial" or "result"
    "field_values": {}
}


def handle_command(cmd):
    action = cmd.get("action")
    request_id = cmd.get("id", 0)

    if action == "connect":
        return {"id": request_id, "ok": True, "data": {"connection": cmd.get("connection", "default"), "session": cmd.get("session", 0)}}

    if action == "readScreen":
        if state["transaction"] and state["transaction"] in SCREENS:
            screen = SCREENS[state["transaction"]][state["phase"]]
            return {"id": request_id, "ok": True, "data": screen}
        return {"id": request_id, "ok": True, "data": {
            "title": "SAP Easy Access",
            "transaction": "",
            "fields": [],
            "statusBar": {"type": "info", "text": "Ready"}
        }}

    if action == "setField":
        field_id = cmd.get("id", "")
        value = cmd.get("value", "")
        state["field_values"][field_id] = value

        # Detect transaction code entry
        if "okcd" in field_id:
            tcode = value.lstrip("/n").upper()
            if tcode in SCREENS:
                state["transaction"] = tcode
                state["phase"] = "initial"
                log.info(f"Transaction set: {tcode}")

        return {"id": request_id, "ok": True, "data": None}

    if action == "sendVKey":
        code = cmd.get("code", 0)
        # Enter (0) or F8 (8) = execute/advance
        if code in (0, 8) and state["transaction"]:
            if state["phase"] == "initial":
                state["phase"] = "result"
                log.info(f"Executing {state['transaction']} -> result screen")
        # F3 (3) = back
        elif code == 3:
            state["transaction"] = None
            state["phase"] = "initial"
            state["field_values"] = {}
        return {"id": request_id, "ok": True, "data": None}

    if action == "press":
        return {"id": request_id, "ok": True, "data": None}

    if action == "getStatusBar":
        if state["transaction"] and state["transaction"] in SCREENS:
            sb = SCREENS[state["transaction"]][state["phase"]]["statusBar"]
            return {"id": request_id, "ok": True, "data": sb}
        return {"id": request_id, "ok": True, "data": {"type": "info", "text": "Ready"}}

    if action == "screenshot":
        # Return a tiny 1x1 pixel PNG base64 as placeholder
        return {"id": request_id, "ok": True, "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}

    return {"id": request_id, "ok": False, "error": f"Unknown action: {action}"}


async def handler(websocket):
    log.info("Client connected")
    try:
        async for message in websocket:
            cmd = json.loads(message)
            log.info(f"<< {cmd['action']} {json.dumps({k: v for k, v in cmd.items() if k not in ('action', 'id')})}")
            response = handle_command(cmd)
            log.info(f">> ok={response.get('ok')}")
            await websocket.send(json.dumps(response))
    except websockets.ConnectionClosed:
        log.info("Client disconnected")


async def main():
    log.info("Mock SAP Bridge starting on ws://localhost:8765")
    async with serve(handler, "localhost", 8765):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
```

**Step 2: Create requirements.txt**

Create `packages/sap-bridge/requirements.txt`:
```
websockets>=14.0
pywin32>=306;sys_platform=='win32'
```

**Step 3: Test the mock bridge**

```bash
cd D:/projects/product/iris/packages/sap-bridge
pip install websockets
python mock_bridge.py
```

Expected: `Mock SAP Bridge starting on ws://localhost:8765`

Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add packages/sap-bridge/
git commit -m "feat: add mock SAP bridge with COOIS_PI, HUMO, MMBE screens"
```

---

### Task 4: Workflow Executor

**Files:**
- Create: `packages/workflow-executor/src/executor.ts`
- Create: `packages/workflow-executor/src/index.ts`

**Step 1: Implement the executor**

Create `packages/workflow-executor/src/executor.ts`:
```typescript
import { BridgeClient, type Workflow, type Step, type Assertion, type ExecutionEvent, type ScreenState } from "@iris/tools";

export type GateCallback = (stepIndex: number, description: string) => Promise<boolean>;
export type EventCallback = (event: ExecutionEvent) => void;

export async function executeWorkflow(
  bridge: BridgeClient,
  workflow: Workflow,
  params: Record<string, string>,
  onEvent: EventCallback,
  onGate: GateCallback,
  signal?: AbortSignal,
): Promise<void> {
  const total = workflow.steps.length;

  // Navigate to transaction
  await bridge.setField("wnd[0]/tbar[0]/okcd", `/n${workflow.transaction}`);
  await bridge.sendVKey(0);

  for (let i = 0; i < workflow.steps.length; i++) {
    if (signal?.aborted) {
      onEvent({ type: "error", message: "Execution aborted" });
      return;
    }

    const step = workflow.steps[i];
    const description = step.description;

    onEvent({ type: "step_start", stepIndex: i, total, description });

    // Handle confirmation gate
    if (step.gate === "confirm") {
      onEvent({ type: "gate", stepIndex: i, description });
      const approved = await onGate(i, description);
      if (!approved) {
        onEvent({ type: "error", message: `User rejected step: ${description}` });
        return;
      }
    }

    // Execute the step
    try {
      await executeStep(bridge, step, params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onEvent({ type: "step_fail", stepIndex: i, description, error: msg });
      return;
    }

    // Run assertion if present
    if (step.assertion) {
      try {
        await checkAssertion(bridge, step.assertion);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onEvent({ type: "step_fail", stepIndex: i, description, error: `Assertion failed: ${msg}` });
        return;
      }
    }

    onEvent({ type: "step_ok", stepIndex: i, total, description });
  }

  // Read final status bar for completion message
  const statusBar = await bridge.getStatusBar();
  onEvent({ type: "complete", message: statusBar.text || "Workflow completed successfully" });
}

async function executeStep(
  bridge: BridgeClient,
  step: Step,
  params: Record<string, string>,
): Promise<void> {
  const resolvedValue = step.value ? resolveParams(step.value, params) : undefined;

  switch (step.action) {
    case "setField":
      if (!step.target || resolvedValue === undefined) {
        throw new Error(`setField requires target and value`);
      }
      await bridge.setField(step.target, resolvedValue);
      break;

    case "press":
      if (!step.target) throw new Error("press requires target");
      await bridge.press(step.target);
      break;

    case "sendVKey":
      if (resolvedValue === undefined) throw new Error("sendVKey requires value (key code)");
      await bridge.sendVKey(parseInt(resolvedValue, 10));
      break;

    case "wait":
      const ms = resolvedValue ? parseInt(resolvedValue, 10) : 1000;
      await new Promise((r) => setTimeout(r, ms));
      break;
  }
}

function resolveParams(value: string, params: Record<string, string>): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in params)) throw new Error(`Missing required parameter: ${key}`);
    return params[key];
  });
}

async function checkAssertion(bridge: BridgeClient, assertion: Assertion): Promise<void> {
  const screen: ScreenState = await bridge.readScreen();

  if (assertion.title) {
    if (!screen.title.includes(assertion.title)) {
      throw new Error(`Expected title containing "${assertion.title}", got "${screen.title}"`);
    }
  }

  if (assertion.field) {
    const field = screen.fields.find((f) => f.id === assertion.field);
    if (!field) throw new Error(`Field ${assertion.field} not found on screen`);
    if (assertion.expect && field.value !== assertion.expect) {
      throw new Error(`Expected field ${assertion.field} = "${assertion.expect}", got "${field.value}"`);
    }
  }

  if (assertion.statusBar) {
    const regex = new RegExp(assertion.statusBar);
    if (!regex.test(screen.statusBar.text)) {
      throw new Error(`Status bar "${screen.statusBar.text}" does not match pattern "${assertion.statusBar}"`);
    }
  }
}
```

**Step 2: Create index export**

Create `packages/workflow-executor/src/index.ts`:
```typescript
export { executeWorkflow, type GateCallback, type EventCallback } from "./executor.js";
```

**Step 3: Build and verify**

```bash
npm run build -w packages/workflow-executor
```

Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add packages/workflow-executor/src/
git commit -m "feat: add deterministic workflow executor with gates and assertions"
```

---

### Task 5: VBS Parser

**Files:**
- Create: `packages/vbs-parser/src/parser.ts`
- Create: `packages/vbs-parser/src/index.ts`

**Step 1: Implement the VBS parser**

Create `packages/vbs-parser/src/parser.ts`:
```typescript
import type { Step, Workflow } from "@iris/tools";

interface ParsedLine {
  action: "setField" | "sendVKey" | "press";
  target?: string;
  value?: string;
}

/**
 * Parse a SAP GUI VBS recording into a workflow skeleton.
 * Deterministic regex-based extraction — no LLM involved.
 */
export function parseVbs(vbsContent: string): { transaction: string; steps: Step[] } {
  const lines = vbsContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let transaction = "";
  const steps: Step[] = [];

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    // Detect transaction code
    if (parsed.action === "setField" && parsed.target?.includes("okcd") && parsed.value) {
      const match = parsed.value.match(/^\/n?(\w+)/i);
      if (match) {
        transaction = match[1].toUpperCase();
      }
      // Don't add tcode entry as a step — executor handles navigation
      continue;
    }

    // Skip the Enter after tcode (first sendVKey 0 when we just set a tcode)
    if (parsed.action === "sendVKey" && parsed.value === "0" && steps.length === 0 && transaction) {
      continue;
    }

    // Detect save action (Ctrl+S = sendVKey 11)
    const isSave = parsed.action === "sendVKey" && parsed.value === "11";

    const step: Step = {
      action: parsed.action,
      target: parsed.target,
      value: parsed.value,
      description: describeStep(parsed),
    };

    if (isSave) {
      step.gate = "confirm";
      step.description = "Save document (requires confirmation)";
    }

    steps.push(step);
  }

  return { transaction, steps };
}

function parseLine(line: string): ParsedLine | null {
  // Pattern: session.findById("...").text = "..."
  const setText = line.match(/\.findById\("([^"]+)"\)\.text\s*=\s*"([^"]*)"/);
  if (setText) {
    return { action: "setField", target: setText[1], value: setText[2] };
  }

  // Pattern: session.findById("...").sendVKey N
  const vkey = line.match(/\.findById\("([^"]+)"\)\.sendVKey\s+(\d+)/);
  if (vkey) {
    return { action: "sendVKey", target: vkey[1], value: vkey[2] };
  }

  // Pattern: session.sendVKey N (without findById)
  const vkeyShort = line.match(/session\.sendVKey\s+(\d+)/);
  if (vkeyShort) {
    return { action: "sendVKey", value: vkeyShort[1] };
  }

  // Pattern: session.findById("...").press
  const press = line.match(/\.findById\("([^"]+)"\)\.press\b/);
  if (press) {
    return { action: "press", target: press[1] };
  }

  // Pattern: session.findById("...").pressToolbarButton("...")
  const toolbar = line.match(/\.findById\("([^"]+)"\)\.pressToolbarButton\("([^"]+)"\)/);
  if (toolbar) {
    return { action: "press", target: `${toolbar[1]}/${toolbar[2]}` };
  }

  // Pattern: session.findById("...").selected = true/false
  const selected = line.match(/\.findById\("([^"]+)"\)\.selected\s*=\s*(true|false)/i);
  if (selected) {
    return { action: "setField", target: selected[1], value: selected[2].toLowerCase() };
  }

  // Skip caretPosition, setFocus, and other non-actionable lines
  return null;
}

function describeStep(parsed: ParsedLine): string {
  if (parsed.action === "setField" && parsed.target) {
    const fieldName = extractFieldName(parsed.target);
    return `Set ${fieldName} to "${parsed.value}"`;
  }
  if (parsed.action === "sendVKey") {
    const keyName = vkeyName(parsed.value || "0");
    return `Press ${keyName}`;
  }
  if (parsed.action === "press" && parsed.target) {
    return `Press button ${extractFieldName(parsed.target)}`;
  }
  return `${parsed.action}: ${parsed.target || ""} ${parsed.value || ""}`.trim();
}

function extractFieldName(id: string): string {
  // Extract meaningful part from SAP field IDs like "wnd[0]/usr/ctxtMATNR"
  const parts = id.split("/");
  const last = parts[parts.length - 1];
  // Remove type prefixes (ctxt, txt, btn, etc.)
  return last.replace(/^(ctxt|txt|btn|lbl|chk|cmb|tab|shell)/, "") || last;
}

function vkeyName(code: string): string {
  const names: Record<string, string> = {
    "0": "Enter",
    "2": "F2",
    "3": "F3 (Back)",
    "5": "F5",
    "8": "F8 (Execute)",
    "11": "Ctrl+S (Save)",
    "12": "Ctrl+Shift+F1",
  };
  return names[code] || `VKey ${code}`;
}

/**
 * Detect which literal values in steps are good candidates for parameterization.
 * Returns a list of { stepIndex, value, suggestedName } for the LLM to review.
 */
export function detectParameterCandidates(steps: Step[]): { stepIndex: number; value: string; fieldId: string }[] {
  const candidates: { stepIndex: number; value: string; fieldId: string }[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.action !== "setField" || !step.value || !step.target) continue;

    // Skip boolean values, empty strings
    if (step.value === "true" || step.value === "false" || step.value === "") continue;

    candidates.push({
      stepIndex: i,
      value: step.value,
      fieldId: step.target,
    });
  }

  return candidates;
}

/**
 * Apply parameter names to steps, replacing literal values with {{paramName}} references.
 */
export function applyParameters(
  steps: Step[],
  paramMap: { stepIndex: number; paramName: string }[],
): { steps: Step[]; parameters: { name: string; label: string; type: "string" | "number"; required: boolean; default: string }[] } {
  const newSteps = steps.map((s) => ({ ...s }));
  const parameters: { name: string; label: string; type: "string" | "number"; required: boolean; default: string }[] = [];

  for (const mapping of paramMap) {
    const step = newSteps[mapping.stepIndex];
    if (!step || !step.value) continue;

    const defaultValue = step.value;
    const isNumber = /^\d+(\.\d+)?$/.test(defaultValue);

    parameters.push({
      name: mapping.paramName,
      label: mapping.paramName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      type: isNumber ? "number" : "string",
      required: true,
      default: defaultValue,
    });

    step.value = `{{${mapping.paramName}}}`;
    step.description = step.description.replace(`"${defaultValue}"`, `"{{${mapping.paramName}}}"`);
  }

  return { steps: newSteps, parameters };
}
```

**Step 2: Create index export**

Create `packages/vbs-parser/src/index.ts`:
```typescript
export { parseVbs, detectParameterCandidates, applyParameters } from "./parser.js";
```

**Step 3: Build and verify**

```bash
npm run build -w packages/vbs-parser
```

Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add packages/vbs-parser/src/
git commit -m "feat: add VBS parser with parameter detection"
```

---

### Task 6: SAP Agent Tools

**Files:**
- Create: `packages/tools/src/sap-list-workflows.ts`
- Create: `packages/tools/src/sap-execute-workflow.ts`
- Create: `packages/tools/src/sap-upload-vbs.ts`
- Create: `packages/tools/src/sap-recover.ts`
- Modify: `packages/tools/src/index.ts`

**Step 1: Create workflow storage helper**

Create `packages/tools/src/workflow-store.ts`:
```typescript
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Workflow } from "./types.js";

export class WorkflowStore {
  private dir: string;

  constructor(workflowsDir: string) {
    this.dir = workflowsDir;
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  list(): Workflow[] {
    const files = readdirSync(this.dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => JSON.parse(readFileSync(join(this.dir, f), "utf-8")));
  }

  get(id: string): Workflow | null {
    const path = join(this.dir, `${id}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  save(workflow: Workflow): void {
    writeFileSync(join(this.dir, `${workflow.id}.json`), JSON.stringify(workflow, null, 2));
  }
}
```

**Step 2: Create sap_list_workflows tool**

Create `packages/tools/src/sap-list-workflows.ts`:
```typescript
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { WorkflowStore } from "./workflow-store.js";

const schema = Type.Object({});

export function createListWorkflowsTool(store: WorkflowStore): AgentTool<typeof schema> {
  return {
    name: "sap_list_workflows",
    label: "List SAP Workflows",
    description: "List all available SAP workflows with their parameters. Call this when the user asks what you can do or what workflows are available.",
    parameters: schema,
    async execute() {
      const workflows = store.list();
      if (workflows.length === 0) {
        return {
          content: [{ type: "text", text: "No workflows saved yet. Upload a VBS recording to create one." }],
          details: { workflows: [] },
        };
      }

      const summary = workflows
        .map((w) => {
          const params = w.parameters.map((p) => `  - ${p.name} (${p.type}${p.required ? ", required" : ""}): ${p.label}`).join("\n");
          return `**${w.name}** (${w.transaction})\n${w.description}\nParameters:\n${params}`;
        })
        .join("\n\n");

      return {
        content: [{ type: "text", text: summary }],
        details: { workflows },
      };
    },
  };
}
```

**Step 3: Create sap_execute_workflow tool**

Create `packages/tools/src/sap-execute-workflow.ts`:
```typescript
import { Type } from "@sinclair/typebox";
import type { AgentTool, AgentToolUpdateCallback } from "@mariozechner/pi-agent-core";
import type { WorkflowStore } from "./workflow-store.js";
import type { BridgeClient } from "./bridge-client.js";
import { executeWorkflow } from "@iris/workflow-executor";
import type { ExecutionEvent } from "./types.js";

const schema = Type.Object({
  workflow_id: Type.String({ description: "The ID of the workflow to execute" }),
  parameters: Type.Record(Type.String(), Type.String(), { description: "Key-value pairs of workflow parameters" }),
});

export function createExecuteWorkflowTool(
  store: WorkflowStore,
  bridge: BridgeClient,
  requestGateApproval: (stepIndex: number, description: string) => Promise<boolean>,
): AgentTool<typeof schema> {
  return {
    name: "sap_execute_workflow",
    label: "Execute SAP Workflow",
    description: "Execute a saved SAP workflow with the provided parameters. The workflow runs deterministically against SAP GUI. Always confirm the workflow ID and parameters with the user before calling this.",
    parameters: schema,
    async execute(toolCallId, params, signal, onUpdate) {
      const workflow = store.get(params.workflow_id);
      if (!workflow) {
        return {
          content: [{ type: "text", text: `Workflow "${params.workflow_id}" not found. Use sap_list_workflows to see available workflows.` }],
          details: { success: false, error: "not_found" },
        };
      }

      // Validate required parameters
      const missing = workflow.parameters
        .filter((p) => p.required && !(p.name in params.parameters))
        .map((p) => p.name);

      if (missing.length > 0) {
        return {
          content: [{ type: "text", text: `Missing required parameters: ${missing.join(", ")}` }],
          details: { success: false, error: "missing_params", missing },
        };
      }

      const events: ExecutionEvent[] = [];

      const onEvent = (event: ExecutionEvent) => {
        events.push(event);
        if (onUpdate) {
          const progress = events
            .map((e) => {
              if (e.type === "step_start") return `⏳ Step ${e.stepIndex + 1}/${e.total}: ${e.description}`;
              if (e.type === "step_ok") return `✓ Step ${e.stepIndex + 1}/${e.total}: ${e.description}`;
              if (e.type === "step_fail") return `✗ Step ${e.stepIndex + 1}: ${e.description} — ${e.error}`;
              if (e.type === "gate") return `⏸ Waiting for approval: ${e.description}`;
              if (e.type === "complete") return `✓ ${e.message}`;
              if (e.type === "error") return `✗ ${e.message}`;
              return "";
            })
            .filter(Boolean)
            .join("\n");

          onUpdate({
            content: [{ type: "text", text: progress }],
            details: { events },
          });
        }
      };

      try {
        await executeWorkflow(bridge, workflow, params.parameters, onEvent, requestGateApproval, signal);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Workflow execution failed: ${msg}` }],
          details: { success: false, error: msg, events },
        };
      }

      const lastEvent = events[events.length - 1];
      const resultText = lastEvent?.type === "complete" ? lastEvent.message : "Workflow completed";

      return {
        content: [{ type: "text", text: resultText }],
        details: { success: true, events },
      };
    },
  };
}
```

**Step 4: Create sap_upload_vbs tool**

Create `packages/tools/src/sap-upload-vbs.ts`:
```typescript
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { WorkflowStore } from "./workflow-store.js";
import { parseVbs, detectParameterCandidates } from "@iris/vbs-parser";

const schema = Type.Object({
  vbs_content: Type.String({ description: "The content of the VBS file" }),
  workflow_name: Type.String({ description: "A human-readable name for this workflow" }),
  workflow_description: Type.String({ description: "A short description of what this workflow does" }),
  parameter_assignments: Type.Optional(
    Type.Array(
      Type.Object({
        step_index: Type.Number({ description: "The step index to parameterize" }),
        param_name: Type.String({ description: "The parameter name (snake_case)" }),
      }),
    ),
  ),
});

export function createUploadVbsTool(store: WorkflowStore): AgentTool<typeof schema> {
  return {
    name: "sap_upload_vbs",
    label: "Upload VBS Recording",
    description: `Parse a SAP GUI VBS recording and convert it to a reusable workflow.

When the user uploads a .vbs file, call this tool in two phases:
1. First call WITHOUT parameter_assignments — you'll get the parsed steps and parameter candidates. Present these to the user and suggest parameter names.
2. Second call WITH parameter_assignments — after the user confirms, provide the mapping to save the workflow.`,
    parameters: schema,
    async execute(toolCallId, params) {
      const { transaction, steps } = parseVbs(params.vbs_content);

      if (!transaction) {
        return {
          content: [{ type: "text", text: "Could not detect a transaction code in the VBS recording. Make sure the recording includes the initial /n command." }],
          details: { success: false },
        };
      }

      // Phase 1: Parse only, show candidates
      if (!params.parameter_assignments) {
        const candidates = detectParameterCandidates(steps);
        const stepsText = steps.map((s, i) => `  ${i}. ${s.description}`).join("\n");
        const candidatesText = candidates
          .map((c) => `  Step ${c.stepIndex}: "${c.value}" (field: ${c.fieldId})`)
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Parsed VBS recording for transaction **${transaction}** with ${steps.length} steps:\n\n${stepsText}\n\n**Parameter candidates** (values that could be parameterized):\n${candidatesText}\n\nSuggest parameter names for each candidate, then call this tool again with parameter_assignments to save the workflow.`,
            },
          ],
          details: { transaction, steps, candidates, phase: "parse" },
        };
      }

      // Phase 2: Apply parameters and save
      const { applyParameters } = await import("@iris/vbs-parser");
      const { steps: paramSteps, parameters } = applyParameters(
        steps,
        params.parameter_assignments.map((a) => ({ stepIndex: a.step_index, paramName: a.param_name })),
      );

      const id = params.workflow_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const workflow = {
        id,
        name: params.workflow_name,
        description: params.workflow_description,
        transaction,
        parameters,
        steps: paramSteps,
      };

      store.save(workflow);

      return {
        content: [
          {
            type: "text",
            text: `Workflow **${workflow.name}** saved with ${parameters.length} parameters. It's now available for execution via "${workflow.id}".`,
          },
        ],
        details: { success: true, workflow },
      };
    },
  };
}
```

**Step 5: Create sap_recover tool**

Create `packages/tools/src/sap-recover.ts`:
```typescript
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";
import type { BridgeClient } from "./bridge-client.js";

const schema = Type.Object({
  action: Type.Union(
    [
      Type.Literal("dismiss_popup"),
      Type.Literal("press_back"),
      Type.Literal("set_field"),
      Type.Literal("send_vkey"),
      Type.Literal("read_screen"),
    ],
    { description: "Recovery action to take" },
  ),
  target: Type.Optional(Type.String({ description: "Field ID for set_field action" })),
  value: Type.Optional(Type.String({ description: "Value for set_field or vkey code for send_vkey" })),
});

export function createRecoverTool(bridge: BridgeClient): AgentTool<typeof schema> {
  return {
    name: "sap_recover",
    label: "SAP Error Recovery",
    description: `Recover from unexpected SAP screens during workflow execution. Use this when an assertion fails or an unexpected popup appears.

Available actions:
- read_screen: Read the current screen state to understand what happened
- dismiss_popup: Press Enter to dismiss a popup/dialog
- press_back: Press F3 to go back one screen
- set_field: Set a specific field value
- send_vkey: Send a specific virtual key

Always read_screen first to understand the situation before taking action.`,
    parameters: schema,
    async execute(toolCallId, params) {
      switch (params.action) {
        case "read_screen": {
          const screen = await bridge.readScreen();
          const fieldsText = screen.fields
            .map((f) => `  ${f.id}: ${f.label || ""} = "${f.value}" (${f.type}${f.changeable ? ", editable" : ""})`)
            .join("\n");
          return {
            content: [
              {
                type: "text",
                text: `**Current Screen:** ${screen.title}\n**Transaction:** ${screen.transaction}\n**Status:** ${screen.statusBar.text} (${screen.statusBar.type})\n\n**Fields:**\n${fieldsText}`,
              },
            ],
            details: { screen },
          };
        }
        case "dismiss_popup":
          await bridge.sendVKey(0);
          return {
            content: [{ type: "text", text: "Popup dismissed (Enter pressed)" }],
            details: { action: "dismiss_popup" },
          };
        case "press_back":
          await bridge.sendVKey(3);
          return {
            content: [{ type: "text", text: "Navigated back (F3 pressed)" }],
            details: { action: "press_back" },
          };
        case "set_field":
          if (!params.target || !params.value) {
            return {
              content: [{ type: "text", text: "set_field requires target and value" }],
              details: { error: "missing_params" },
            };
          }
          await bridge.setField(params.target, params.value);
          return {
            content: [{ type: "text", text: `Field ${params.target} set to "${params.value}"` }],
            details: { action: "set_field", target: params.target, value: params.value },
          };
        case "send_vkey":
          if (!params.value) {
            return {
              content: [{ type: "text", text: "send_vkey requires value (key code)" }],
              details: { error: "missing_params" },
            };
          }
          await bridge.sendVKey(parseInt(params.value, 10));
          return {
            content: [{ type: "text", text: `VKey ${params.value} sent` }],
            details: { action: "send_vkey", code: params.value },
          };
      }
    },
  };
}
```

**Step 6: Update tools/src/index.ts to export everything**

Replace `packages/tools/src/index.ts`:
```typescript
export * from "./types.js";
export * from "./bridge-client.js";
export * from "./workflow-store.js";
export * from "./sap-list-workflows.js";
export * from "./sap-execute-workflow.js";
export * from "./sap-upload-vbs.js";
export * from "./sap-recover.js";
```

**Step 7: Build all packages**

```bash
npm run build -w packages/tools && npm run build -w packages/vbs-parser && npm run build -w packages/workflow-executor
```

Expected: All compile without errors. Note: packages/tools depends on @iris/workflow-executor and @iris/vbs-parser — if circular dependency is an issue, the tool implementations may need to accept executor/parser as injected functions instead. Verify at build time.

**Step 8: Commit**

```bash
git add packages/tools/src/
git commit -m "feat: add SAP agent tools (list, execute, upload, recover)"
```

---

### Task 7: Web App — Server & Frontend Shell

**Files:**
- Create: `packages/app/src/server/index.ts`
- Create: `packages/app/src/client/main.ts`
- Create: `packages/app/src/client/agent-setup.ts`
- Create: `packages/app/src/client/index.html`
- Create: `packages/app/src/client/app.css`
- Create: `packages/app/build.mjs`

**Step 1: Create the Express server**

Create `packages/app/src/server/index.ts`:
```typescript
import express from "express";
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BRIDGE_SCRIPT = process.env.BRIDGE_SCRIPT || join(__dirname, "../../../sap-bridge/mock_bridge.py");

const app = express();
app.use(express.static(join(__dirname, "../client")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Start mock bridge as child process
let bridgeProcess: ReturnType<typeof spawn> | null = null;

function startBridge() {
  console.log(`Starting SAP bridge: python ${BRIDGE_SCRIPT}`);
  bridgeProcess = spawn("python", [BRIDGE_SCRIPT], { stdio: "inherit" });
  bridgeProcess.on("exit", (code) => {
    console.log(`SAP bridge exited with code ${code}`);
    bridgeProcess = null;
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  bridgeProcess?.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bridgeProcess?.kill();
  process.exit(0);
});

startBridge();

app.listen(PORT, () => {
  console.log(`Iris agent running at http://localhost:${PORT}`);
});
```

**Step 2: Create the agent setup (client-side)**

Create `packages/app/src/client/agent-setup.ts`:
```typescript
import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import {
  AppStorage,
  ChatPanel,
  IndexedDBStorageBackend,
  ProviderKeysStore,
  SessionsStore,
  SettingsStore,
  CustomProvidersStore,
  setAppStorage,
  ApiKeyPromptDialog,
  defaultConvertToLlm,
} from "@mariozechner/pi-web-ui";
import { BridgeClient, WorkflowStore } from "@iris/tools";
import { createListWorkflowsTool, createExecuteWorkflowTool, createUploadVbsTool, createRecoverTool } from "@iris/tools";

// Note: WorkflowStore uses fs — for the browser client, we need a different approach.
// The tools will run server-side OR we use a browser-compatible store.
// For the prototype, tools run in the browser but workflow storage uses localStorage.

class BrowserWorkflowStore {
  private key = "iris-workflows";

  list() {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  get(id: string) {
    return this.list().find((w: any) => w.id === id) || null;
  }

  save(workflow: any) {
    const workflows = this.list().filter((w: any) => w.id !== workflow.id);
    workflows.push(workflow);
    localStorage.setItem(this.key, JSON.stringify(workflows));
  }
}

const SAP_SYSTEM_PROMPT = `You are Iris, a SAP automation assistant. You help users run SAP transactions through saved workflows.

Your capabilities:
- List available workflows and their required parameters
- Execute workflows when the user provides enough information
- Convert VBS recordings into reusable workflows
- Help recover from errors during execution

Rules:
- Never guess parameter values. Ask the user if something is missing.
- Always confirm the workflow and parameters with the user before executing.
- When a gate is reached during execution, explain what will happen and ask for approval.
- If execution fails, use sap_recover to read the screen state and suggest recovery options.
- When a user uploads a .vbs file, use sap_upload_vbs to parse it. Present the detected steps and suggest parameter names. Wait for user confirmation before saving.

Available workflows will be listed in tool results. If no workflows exist yet, guide the user to upload a VBS recording.`;

export async function initApp(container: HTMLElement) {
  // Storage setup
  const settings = new SettingsStore();
  const providerKeys = new ProviderKeysStore();
  const sessions = new SessionsStore();
  const customProviders = new CustomProvidersStore();

  const backend = new IndexedDBStorageBackend({
    dbName: "iris-agent",
    version: 1,
    stores: [
      settings.getConfig(),
      SessionsStore.getMetadataConfig(),
      providerKeys.getConfig(),
      customProviders.getConfig(),
      sessions.getConfig(),
    ],
  });

  settings.setBackend(backend);
  providerKeys.setBackend(backend);
  sessions.setBackend(backend);
  customProviders.setBackend(backend);

  const storage = new AppStorage(settings, providerKeys, sessions, customProviders, backend);
  setAppStorage(storage);

  // SAP bridge client (connects to WebSocket on localhost)
  const bridge = new BridgeClient("ws://localhost:8765");
  try {
    await bridge.connect();
    console.log("Connected to SAP bridge");
  } catch (err) {
    console.warn("SAP bridge not available, tools will fail gracefully:", err);
  }

  // Workflow store (browser-compatible)
  const workflowStore = new BrowserWorkflowStore();

  // Gate approval via confirm dialog (prototype — upgrade to chat-based later)
  const requestGateApproval = async (_stepIndex: number, description: string): Promise<boolean> => {
    return window.confirm(`SAP is about to: ${description}\n\nProceed?`);
  };

  // Create tools
  const tools = [
    createListWorkflowsTool(workflowStore as any),
    createExecuteWorkflowTool(workflowStore as any, bridge, requestGateApproval),
    createUploadVbsTool(workflowStore as any),
    createRecoverTool(bridge),
  ];

  // Create agent
  const agent = new Agent({
    initialState: {
      systemPrompt: SAP_SYSTEM_PROMPT,
      model: getModel("anthropic", "claude-sonnet-4-5-20250929"),
      thinkingLevel: "off",
      tools,
      messages: [],
    },
    convertToLlm: defaultConvertToLlm,
  });

  // Create ChatPanel
  const chatPanel = new ChatPanel();
  await chatPanel.setAgent(agent, {
    onApiKeyRequired: async (provider: string) => {
      return await ApiKeyPromptDialog.prompt(provider);
    },
    toolsFactory: () => tools,
  });

  container.appendChild(chatPanel);
}
```

**Step 3: Create main.ts entry point**

Create `packages/app/src/client/main.ts`:
```typescript
import "./app.css";
import { initApp } from "./agent-setup.js";

async function main() {
  const container = document.getElementById("app");
  if (!container) throw new Error("App container not found");

  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#8a8479;">Loading Iris...</div>';

  try {
    await initApp(container);
  } catch (err) {
    console.error("Failed to initialize:", err);
    container.innerHTML = `<div style="padding:2rem;color:red;">Failed to start: ${err}</div>`;
  }
}

main();
```

**Step 4: Create index.html**

Create `packages/app/src/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Iris — SAP Agent</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌿</text></svg>">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

**Step 5: Create app.css**

Create `packages/app/src/client/app.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
body { font-family: system-ui, -apple-system, sans-serif; }
```

**Step 6: Create build script**

Create `packages/app/build.mjs`:
```javascript
import { build, context } from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");

// Ensure dist directories exist
mkdirSync(join(__dirname, "dist/client"), { recursive: true });
mkdirSync(join(__dirname, "dist/server"), { recursive: true });

// Build server (TypeScript -> JS via tsc)
console.log("Building server...");
execSync("npx tsc", { cwd: __dirname, stdio: "inherit" });

// Copy index.html to dist/client
copyFileSync(
  join(__dirname, "src/client/index.html"),
  join(__dirname, "dist/client/index.html"),
);

// Bundle client with esbuild
const clientConfig = {
  entryPoints: [join(__dirname, "src/client/main.ts")],
  bundle: true,
  outfile: join(__dirname, "dist/client/main.js"),
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
  },
  external: [],
  loader: {
    ".css": "css",
  },
};

if (isDev) {
  console.log("Starting dev mode...");
  const ctx = await context(clientConfig);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  console.log("Building client bundle...");
  await build(clientConfig);
  console.log("Build complete.");
}
```

**Step 7: Build and verify**

```bash
npm run build -w packages/app
```

Expected: Server compiles, client bundles. May need adjustments for pi-web-ui imports in the browser bundle — resolve at build time.

**Step 8: Commit**

```bash
git add packages/app/
git commit -m "feat: add web app shell with Express server and agent UI"
```

---

### Task 8: End-to-End Integration Test

**Step 1: Start the full stack**

```bash
cd D:/projects/product/iris
npm run build
npm start
```

Expected: Express starts on port 3000, mock bridge starts on port 8765.

**Step 2: Open browser and verify**

Navigate to `http://localhost:3000`. Verify:
- Chat UI loads (pi-web-ui's ChatPanel)
- Model selector is visible
- Can enter API key for a provider
- Type "What workflows are available?" → agent responds with "No workflows saved yet"

**Step 3: Test VBS upload flow**

Create a test VBS file and paste its content in chat:
```
"Convert this VBS recording: session.findById("wnd[0]/tbar[0]/okcd").text = "/nMMBE"
session.findById("wnd[0]").sendVKey 0
session.findById("wnd[0]/usr/ctxtMATNR").text = "BOLT-M8"
session.findById("wnd[0]/usr/ctxtWERKS").text = "1000"
session.findById("wnd[0]").sendVKey 8"
```

Verify agent calls `sap_upload_vbs`, shows parsed steps, suggests parameters.

**Step 4: Test workflow execution**

After saving a workflow, type: "Check stock for material BOLT-M8 in plant 1000"

Verify agent calls `sap_execute_workflow` with correct parameters and shows step-by-step progress.

**Step 5: Fix any issues found during testing**

Address compilation errors, runtime errors, or UX issues.

**Step 6: Commit working state**

```bash
git add -A
git commit -m "feat: end-to-end integration working with mock bridge"
```

---

### Task 9: Push to GitHub & Document Setup

**Step 1: Add remote and push**

```bash
cd D:/projects/product/iris
git remote add origin https://github.com/mospit/iris-agent.git
git branch -M main
git push -u origin main
```

**Step 2: Create a CLAUDE.md for the project**

Create `CLAUDE.md`:
```markdown
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
- `packages/vbs-parser` — VBS recording → workflow JSON converter
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

tools → vbs-parser → workflow-executor → app
```

**Step 3: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: add project README and CLAUDE.md"
git push
```

---

### Task 10: Real SAP Bridge (Milestone M2)

**Files:**
- Create: `packages/sap-bridge/bridge.py`

**Step 1: Implement the real SAP COM bridge**

Create `packages/sap-bridge/bridge.py`:
```python
import asyncio
import json
import logging

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("Install websockets: pip install websockets")
    raise

try:
    import win32com.client
    HAS_SAP = True
except ImportError:
    HAS_SAP = False
    print("WARNING: pywin32 not installed. SAP COM automation unavailable.")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sap-bridge")

session = None


def connect_sap(connection_name=None, session_index=0):
    global session
    sap_gui = win32com.client.GetObject("SAPGUI")
    if not sap_gui:
        raise RuntimeError("SAP GUI not running")
    app = sap_gui.GetScriptingEngine
    if not app:
        raise RuntimeError("SAP scripting engine not available")
    conn = app.Children(0) if connection_name is None else None
    # If connection_name specified, find it
    if connection_name:
        for i in range(app.Children.Count):
            c = app.Children(i)
            if connection_name.lower() in c.Description.lower():
                conn = c
                break
    if not conn:
        conn = app.Children(0)
    session = conn.Children(session_index)
    if not session:
        raise RuntimeError(f"Session {session_index} not found")
    log.info(f"Connected to SAP session: {session.Info.SystemName}")


def read_screen():
    if not session:
        raise RuntimeError("Not connected to SAP")
    window = session.findById("wnd[0]")
    fields = []

    def walk(node, depth=0):
        if depth > 10:
            return
        try:
            node_type = node.Type
            node_id = node.Id

            field = {
                "id": node_id,
                "type": classify_type(node_type),
                "value": "",
                "label": getattr(node, "Text", "") or "",
            }

            if hasattr(node, "Text"):
                field["value"] = node.Text or ""
            if hasattr(node, "Changeable"):
                field["changeable"] = bool(node.Changeable)

            # Only add interactive fields
            if node_type in (30, 31, 32, 33, 34, 40, 41, 42, 46, 61, 62, 63):
                fields.append(field)

            # Recurse into children
            if hasattr(node, "Children"):
                for i in range(node.Children.Count):
                    walk(node.Children(i), depth + 1)
        except Exception:
            pass

    walk(window)

    title = ""
    transaction = ""
    try:
        title = window.Text or ""
        transaction = session.Info.Transaction or ""
    except Exception:
        pass

    status_bar = {"type": "info", "text": ""}
    try:
        sb = session.findById("wnd[0]/sbar")
        status_bar = {
            "type": classify_status(sb.MessageType),
            "text": sb.Text or "",
        }
    except Exception:
        pass

    return {
        "title": title,
        "transaction": transaction,
        "fields": fields,
        "statusBar": status_bar,
    }


def classify_type(sap_type):
    mapping = {
        30: "text", 31: "text", 32: "text", 33: "text", 34: "text",
        40: "button", 41: "button", 42: "button",
        46: "checkbox",
        61: "combobox", 62: "combobox", 63: "combobox",
    }
    return mapping.get(sap_type, "label")


def classify_status(msg_type):
    return {"S": "success", "W": "warning", "E": "error", "I": "info", "A": "error"}.get(msg_type or "", "info")


def handle_command(cmd):
    request_id = cmd.get("id", 0)
    action = cmd.get("action")

    try:
        if action == "connect":
            connect_sap(cmd.get("connection"), cmd.get("session", 0))
            return {"id": request_id, "ok": True, "data": {"connected": True}}

        if action == "readScreen":
            data = read_screen()
            return {"id": request_id, "ok": True, "data": data}

        if action == "setField":
            obj = session.findById(cmd["id"])
            obj.Text = cmd["value"]
            return {"id": request_id, "ok": True, "data": None}

        if action == "press":
            obj = session.findById(cmd["id"])
            obj.Press()
            return {"id": request_id, "ok": True, "data": None}

        if action == "sendVKey":
            session.findById("wnd[0]").sendVKey(cmd["code"])
            return {"id": request_id, "ok": True, "data": None}

        if action == "getStatusBar":
            sb = session.findById("wnd[0]/sbar")
            return {"id": request_id, "ok": True, "data": {
                "type": classify_status(sb.MessageType),
                "text": sb.Text or "",
            }}

        if action == "screenshot":
            import tempfile, base64, os
            path = os.path.join(tempfile.gettempdir(), "sap_screenshot.png")
            session.findById("wnd[0]").HardCopy(path, "PNG")
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            os.remove(path)
            return {"id": request_id, "ok": True, "data": b64}

        return {"id": request_id, "ok": False, "error": f"Unknown action: {action}"}

    except Exception as e:
        log.error(f"Error handling {action}: {e}")
        return {"id": request_id, "ok": False, "error": str(e)}


async def handler(websocket):
    log.info("Client connected")
    try:
        async for message in websocket:
            cmd = json.loads(message)
            log.info(f"<< {cmd.get('action')}")
            response = handle_command(cmd)
            log.info(f">> ok={response.get('ok')}")
            await websocket.send(json.dumps(response))
    except websockets.ConnectionClosed:
        log.info("Client disconnected")


async def main():
    if not HAS_SAP:
        log.warning("pywin32 not available — bridge will fail on SAP commands")
    log.info("SAP Bridge starting on ws://localhost:8765")
    async with serve(handler, "localhost", 8765):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
```

**Step 2: Test on company machine**

On the company machine with SAP GUI running:
```bash
pip install pywin32 websockets
python packages/sap-bridge/bridge.py
```

Switch server to use real bridge:
```bash
BRIDGE_SCRIPT=packages/sap-bridge/bridge.py npm start
```

**Step 3: Commit**

```bash
git add packages/sap-bridge/bridge.py
git commit -m "feat: add real SAP GUI COM bridge"
git push
```

---

### Task 11: Create Sample Workflows for Demo

**Files:**
- Create: `workflows/coois_pi_order_status.json`
- Create: `workflows/humo_org_structure.json`
- Create: `workflows/mmbe_stock_overview.json`

**Step 1: Create COOIS_PI workflow**

Create `workflows/coois_pi_order_status.json`:
```json
{
  "id": "coois_pi_order_status",
  "name": "Check Production Order Status",
  "description": "Look up production order details in COOIS_PI. Shows order status, material, quantities, and system status.",
  "transaction": "COOIS_PI",
  "parameters": [
    { "name": "order_number", "label": "Production Order Number", "type": "string", "required": true, "default": "" },
    { "name": "plant", "label": "Plant", "type": "string", "required": false, "default": "" }
  ],
  "steps": [
    { "action": "setField", "target": "wnd[0]/usr/ctxtS_AUFNR-LOW", "value": "{{order_number}}", "description": "Enter production order number" },
    { "action": "setField", "target": "wnd[0]/usr/ctxtP_WERKS", "value": "{{plant}}", "description": "Enter plant (optional)" },
    { "action": "sendVKey", "value": "8", "description": "Execute report (F8)", "assertion": { "title": "Production Orders", "expect": "Results screen displayed" } }
  ]
}
```

**Step 2: Create HUMO workflow**

Create `workflows/humo_org_structure.json`:
```json
{
  "id": "humo_org_structure",
  "name": "View Organizational Structure",
  "description": "Display organizational structure in HUMO. Shows org units, positions, and employees.",
  "transaction": "HUMO",
  "parameters": [
    { "name": "org_unit", "label": "Organizational Unit", "type": "string", "required": true, "default": "" },
    { "name": "start_date", "label": "Start Date (DD.MM.YYYY)", "type": "string", "required": false, "default": "" },
    { "name": "end_date", "label": "End Date (DD.MM.YYYY)", "type": "string", "required": false, "default": "" }
  ],
  "steps": [
    { "action": "setField", "target": "wnd[0]/usr/ctxtP_ORGEH", "value": "{{org_unit}}", "description": "Enter organizational unit" },
    { "action": "setField", "target": "wnd[0]/usr/ctxtP_BEGDA", "value": "{{start_date}}", "description": "Enter start date" },
    { "action": "setField", "target": "wnd[0]/usr/ctxtP_ENDDA", "value": "{{end_date}}", "description": "Enter end date" },
    { "action": "sendVKey", "value": "8", "description": "Execute (F8)", "assertion": { "title": "Organizational Structure", "expect": "Org structure displayed" } }
  ]
}
```

**Step 3: Create MMBE workflow**

Create `workflows/mmbe_stock_overview.json`:
```json
{
  "id": "mmbe_stock_overview",
  "name": "Check Stock Overview",
  "description": "View stock levels for a material across plants in MMBE. Shows unrestricted, quality inspection, blocked, and in-transit stock.",
  "transaction": "MMBE",
  "parameters": [
    { "name": "material", "label": "Material Number", "type": "string", "required": true, "default": "" },
    { "name": "plant", "label": "Plant", "type": "string", "required": false, "default": "" },
    { "name": "storage_location", "label": "Storage Location", "type": "string", "required": false, "default": "" }
  ],
  "steps": [
    { "action": "setField", "target": "wnd[0]/usr/ctxtMATNR", "value": "{{material}}", "description": "Enter material number" },
    { "action": "setField", "target": "wnd[0]/usr/ctxtWERKS", "value": "{{plant}}", "description": "Enter plant (optional)" },
    { "action": "setField", "target": "wnd[0]/usr/ctxtLGORT", "value": "{{storage_location}}", "description": "Enter storage location (optional)" },
    { "action": "sendVKey", "value": "0", "description": "Press Enter to execute", "assertion": { "title": "Stock Overview", "expect": "Stock data displayed" } }
  ]
}
```

**Step 4: Update agent-setup.ts to load pre-built workflows**

The BrowserWorkflowStore should be seeded with these JSON files on first load. Add a fetch to load them from the server, or bundle them. Simplest: serve the workflows/ directory from Express and fetch on init.

Add to `packages/app/src/server/index.ts`:
```typescript
app.use("/api/workflows", express.static(join(__dirname, "../../../workflows")));
```

Add to BrowserWorkflowStore in `agent-setup.ts` an init method that fetches from `/api/workflows/`.

**Step 5: Commit**

```bash
git add workflows/ packages/app/
git commit -m "feat: add pre-built workflows for COOIS_PI, HUMO, MMBE"
git push
```

---

### Task 12: Polish for Exec Demo (Milestone M5)

**Step 1: Add Iris branding**

Update `index.html` title and add a header bar with "Iris" name and accent color (#0d6e4f).

**Step 2: Add workflow sidebar**

Create a simple sidebar component that lists available workflows. Clicking a workflow pre-fills the chat input with a template message.

**Step 3: Add execution progress renderer**

Register a custom message renderer via `registerMessageRenderer()` that shows step-by-step progress with checkmarks during workflow execution, instead of raw tool output.

**Step 4: Error states**

Ensure graceful handling when:
- Bridge is not connected (show status indicator)
- LLM provider has no API key (pi-web-ui handles this)
- Workflow execution fails (agent uses sap_recover)

**Step 5: Final commit and push**

```bash
git add -A
git commit -m "feat: exec demo polish - branding, sidebar, progress renderer"
git push
```
