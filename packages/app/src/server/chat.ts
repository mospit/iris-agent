import Anthropic from "@anthropic-ai/sdk";
import type { Request, Response } from "express";
import type { Workflow } from "@iris/tools";
import { BridgeClient } from "@iris/tools";
import {
  createListWorkflowsTool,
  createExecuteWorkflowTool,
  createUploadVbsTool,
  createRecoverTool,
} from "@iris/tools";
import { WorkflowStore } from "@iris/tools";
import { executeWorkflow } from "@iris/workflow-executor";
import {
  parseVbs,
  detectParameterCandidates,
  applyParameters,
} from "@iris/vbs-parser";

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

// Convert our tool schemas to Claude API tool format
function toolsToClaude(tools: any[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));
}

interface ChatDeps {
  bridge: BridgeClient;
  store: WorkflowStore;
}

// Gate approvals pending from the client
const pendingGates = new Map<
  string,
  { resolve: (approved: boolean) => void }
>();

export function createChatHandler(deps: ChatDeps) {
  const client = new Anthropic();

  // Create tools with server-side bridge and store
  const requestGateApproval = async (
    _stepIndex: number,
    description: string,
  ): Promise<boolean> => {
    // For now, auto-approve gates (will be upgraded to chat-based later)
    console.log(`Gate auto-approved: ${description}`);
    return true;
  };

  const tools = [
    createListWorkflowsTool(deps.store),
    createExecuteWorkflowTool(
      deps.store,
      deps.bridge,
      requestGateApproval,
      executeWorkflow,
    ),
    createUploadVbsTool(deps.store, {
      parseVbs,
      detectParameterCandidates,
      applyParameters,
    }),
    createRecoverTool(deps.bridge),
  ];

  const claudeTools = toolsToClaude(tools);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  return async (req: Request, res: Response) => {
    const { messages } = req.body as {
      messages: Anthropic.MessageParam[];
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await agentLoop(client, claudeTools, toolMap, messages, send);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send("error", { error: msg });
    }

    send("done", {});
    res.end();
  };
}

async function agentLoop(
  client: Anthropic,
  claudeTools: Anthropic.Tool[],
  toolMap: Map<string, any>,
  messages: Anthropic.MessageParam[],
  send: (event: string, data: any) => void,
) {
  const MAX_TURNS = 10;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Stream response from Claude
    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SAP_SYSTEM_PROMPT,
      tools: claudeTools,
      messages,
    });

    // Collect text and tool_use blocks
    let fullText = "";
    const toolUseBlocks: Anthropic.ContentBlock[] = [];

    stream.on("text", (text) => {
      fullText += text;
      send("text", { text });
    });

    const response = await stream.finalMessage();

    // Collect tool_use blocks
    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      // Add assistant message to history for caller
      send("assistant_message", { content: response.content });
      return;
    }

    // Execute tool calls
    const assistantContent = response.content;
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      if (block.type !== "tool_use") continue;

      send("tool_call", { name: block.name, input: block.input });

      const tool = toolMap.get(block.name);
      if (!tool) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Tool "${block.name}" not found`,
          is_error: true,
        });
        continue;
      }

      try {
        const result = await tool.execute(block.id, block.input);
        const text =
          result.content
            ?.map((c: any) => c.text)
            .filter(Boolean)
            .join("\n") || "Done";

        send("tool_result", { name: block.name, text });

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: text,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        send("tool_result", {
          name: block.name,
          text: errMsg,
          is_error: true,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: errMsg,
          is_error: true,
        });
      }
    }

    // Add assistant + tool results to messages and loop
    messages.push({ role: "assistant", content: assistantContent });
    messages.push({ role: "user", content: toolResults });
  }

  send("text", {
    text: "\n\n[Agent loop reached maximum turns. Please continue the conversation.]",
  });
}
