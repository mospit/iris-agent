import { Type } from "@sinclair/typebox";
import type { WorkflowStore } from "./workflow-store.js";
import type { Step } from "./types.js";

type ParseVbsFn = (vbsContent: string) => { transaction: string; steps: Step[] };
type DetectParameterCandidatesFn = (steps: Step[]) => { stepIndex: number; value: string; fieldId: string }[];
type ApplyParametersFn = (
  steps: Step[],
  paramMap: { stepIndex: number; paramName: string }[],
) => { steps: Step[]; parameters: { name: string; label: string; type: "string" | "number"; required: boolean; default: string }[] };

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

export function createUploadVbsTool(
  store: WorkflowStore,
  parserFns: { parseVbs: ParseVbsFn; detectParameterCandidates: DetectParameterCandidatesFn; applyParameters: ApplyParametersFn },
) {
  return {
    name: "sap_upload_vbs",
    label: "Upload VBS Recording",
    description: `Parse a SAP GUI VBS recording and convert it to a reusable workflow.

When the user uploads a .vbs file, call this tool in two phases:
1. First call WITHOUT parameter_assignments — you'll get the parsed steps and parameter candidates. Present these to the user and suggest parameter names.
2. Second call WITH parameter_assignments — after the user confirms, provide the mapping to save the workflow.`,
    parameters: schema,
    async execute(toolCallId: string, params: { vbs_content: string; workflow_name: string; workflow_description: string; parameter_assignments?: { step_index: number; param_name: string }[] }) {
      const { transaction, steps } = parserFns.parseVbs(params.vbs_content);

      if (!transaction) {
        return {
          content: [{ type: "text" as const, text: "Could not detect a transaction code in the VBS recording. Make sure the recording includes the initial /n command." }],
          details: { success: false },
        };
      }

      // Phase 1: Parse only, show candidates
      if (!params.parameter_assignments) {
        const candidates = parserFns.detectParameterCandidates(steps);
        const stepsText = steps.map((s: Step, i: number) => `  ${i}. ${s.description}`).join("\n");
        const candidatesText = candidates
          .map((c: { stepIndex: number; value: string; fieldId: string }) => `  Step ${c.stepIndex}: "${c.value}" (field: ${c.fieldId})`)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Parsed VBS recording for transaction **${transaction}** with ${steps.length} steps:\n\n${stepsText}\n\n**Parameter candidates** (values that could be parameterized):\n${candidatesText}\n\nSuggest parameter names for each candidate, then call this tool again with parameter_assignments to save the workflow.`,
            },
          ],
          details: { transaction, steps, candidates, phase: "parse" },
        };
      }

      // Phase 2: Apply parameters and save
      const { steps: paramSteps, parameters } = parserFns.applyParameters(
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
            type: "text" as const,
            text: `Workflow **${workflow.name}** saved with ${parameters.length} parameters. It's now available for execution via "${workflow.id}".`,
          },
        ],
        details: { success: true, workflow },
      };
    },
  };
}
