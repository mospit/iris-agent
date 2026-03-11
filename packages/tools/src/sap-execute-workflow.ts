import { Type } from "@sinclair/typebox";
import type { WorkflowStore } from "./workflow-store.js";
import type { BridgeClient } from "./bridge-client.js";
import type { Workflow, ExecutionEvent } from "./types.js";

type ExecuteWorkflowFn = (
  bridge: BridgeClient,
  workflow: Workflow,
  params: Record<string, string>,
  onEvent: (event: ExecutionEvent) => void,
  onGate: (stepIndex: number, description: string) => Promise<boolean>,
  signal?: AbortSignal,
) => Promise<void>;

const schema = Type.Object({
  workflow_id: Type.String({ description: "The ID of the workflow to execute" }),
  parameters: Type.Record(Type.String(), Type.String(), { description: "Key-value pairs of workflow parameters" }),
});

export function createExecuteWorkflowTool(
  store: WorkflowStore,
  bridge: BridgeClient,
  requestGateApproval: (stepIndex: number, description: string) => Promise<boolean>,
  executeWorkflowFn: ExecuteWorkflowFn,
) {
  return {
    name: "sap_execute_workflow",
    label: "Execute SAP Workflow",
    description: "Execute a saved SAP workflow with the provided parameters. The workflow runs deterministically against SAP GUI. Always confirm the workflow ID and parameters with the user before calling this.",
    parameters: schema,
    async execute(toolCallId: string, params: { workflow_id: string; parameters: Record<string, string> }, signal?: AbortSignal, onUpdate?: (update: any) => void) {
      const workflow = store.get(params.workflow_id);
      if (!workflow) {
        return {
          content: [{ type: "text" as const, text: `Workflow "${params.workflow_id}" not found. Use sap_list_workflows to see available workflows.` }],
          details: { success: false, error: "not_found" },
        };
      }

      // Validate required parameters
      const missing = workflow.parameters
        .filter((p) => p.required && !(p.name in params.parameters))
        .map((p) => p.name);

      if (missing.length > 0) {
        return {
          content: [{ type: "text" as const, text: `Missing required parameters: ${missing.join(", ")}` }],
          details: { success: false, error: "missing_params", missing },
        };
      }

      const events: ExecutionEvent[] = [];

      const onEvent = (event: ExecutionEvent) => {
        events.push(event);
        if (onUpdate) {
          const progress = events
            .map((e) => {
              if (e.type === "step_start") return `... Step ${e.stepIndex + 1}/${e.total}: ${e.description}`;
              if (e.type === "step_ok") return `OK Step ${e.stepIndex + 1}/${e.total}: ${e.description}`;
              if (e.type === "step_fail") return `FAIL Step ${e.stepIndex + 1}: ${e.description} -- ${e.error}`;
              if (e.type === "gate") return `WAIT Waiting for approval: ${e.description}`;
              if (e.type === "complete") return `DONE ${e.message}`;
              if (e.type === "error") return `ERR ${e.message}`;
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
        await executeWorkflowFn(bridge, workflow, params.parameters, onEvent, requestGateApproval, signal);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `Workflow execution failed: ${msg}` }],
          details: { success: false, error: msg, events },
        };
      }

      const lastEvent = events[events.length - 1];
      const resultText = lastEvent?.type === "complete" ? lastEvent.message : "Workflow completed";

      return {
        content: [{ type: "text" as const, text: resultText }],
        details: { success: true, events },
      };
    },
  };
}
