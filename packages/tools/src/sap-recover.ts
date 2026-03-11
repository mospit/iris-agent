import { Type } from "@sinclair/typebox";
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

export function createRecoverTool(bridge: BridgeClient) {
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
    async execute(toolCallId: string, params: { action: string; target?: string; value?: string }) {
      switch (params.action) {
        case "read_screen": {
          const screen = await bridge.readScreen();
          const fieldsText = screen.fields
            .map((f) => `  ${f.id}: ${f.label || ""} = "${f.value}" (${f.type}${f.changeable ? ", editable" : ""})`)
            .join("\n");
          return {
            content: [
              {
                type: "text" as const,
                text: `**Current Screen:** ${screen.title}\n**Transaction:** ${screen.transaction}\n**Status:** ${screen.statusBar.text} (${screen.statusBar.type})\n\n**Fields:**\n${fieldsText}`,
              },
            ],
            details: { screen },
          };
        }
        case "dismiss_popup":
          await bridge.sendVKey(0);
          return {
            content: [{ type: "text" as const, text: "Popup dismissed (Enter pressed)" }],
            details: { action: "dismiss_popup" },
          };
        case "press_back":
          await bridge.sendVKey(3);
          return {
            content: [{ type: "text" as const, text: "Navigated back (F3 pressed)" }],
            details: { action: "press_back" },
          };
        case "set_field":
          if (!params.target || !params.value) {
            return {
              content: [{ type: "text" as const, text: "set_field requires target and value" }],
              details: { error: "missing_params" },
            };
          }
          await bridge.setField(params.target, params.value);
          return {
            content: [{ type: "text" as const, text: `Field ${params.target} set to "${params.value}"` }],
            details: { action: "set_field", target: params.target, value: params.value },
          };
        case "send_vkey":
          if (!params.value) {
            return {
              content: [{ type: "text" as const, text: "send_vkey requires value (key code)" }],
              details: { error: "missing_params" },
            };
          }
          await bridge.sendVKey(parseInt(params.value, 10));
          return {
            content: [{ type: "text" as const, text: `VKey ${params.value} sent` }],
            details: { action: "send_vkey", code: params.value },
          };
        default:
          return {
            content: [{ type: "text" as const, text: `Unknown action: ${params.action}` }],
            details: { error: "unknown_action" },
          };
      }
    },
  };
}
