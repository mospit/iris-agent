import type { Step } from "@iris/tools";

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
  // Remove type prefixes (ctxt, txt, btn, lbl, chk, cmb, tab, shell)
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
 * Returns a list of { stepIndex, value, fieldId } for the LLM to review.
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
