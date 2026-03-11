import { Type } from "@sinclair/typebox";
import type { WorkflowStore } from "./workflow-store.js";

const schema = Type.Object({});

export function createListWorkflowsTool(store: WorkflowStore) {
  return {
    name: "sap_list_workflows",
    label: "List SAP Workflows",
    description: "List all available SAP workflows with their parameters. Call this when the user asks what you can do or what workflows are available.",
    parameters: schema,
    async execute() {
      const workflows = store.list();
      if (workflows.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No workflows saved yet. Upload a VBS recording to create one." }],
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
        content: [{ type: "text" as const, text: summary }],
        details: { workflows },
      };
    },
  };
}
