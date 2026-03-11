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
