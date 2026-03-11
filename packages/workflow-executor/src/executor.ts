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

    case "wait": {
      const ms = resolvedValue ? parseInt(resolvedValue, 10) : 1000;
      await new Promise((r) => setTimeout(r, ms));
      break;
    }
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
