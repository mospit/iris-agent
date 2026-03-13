import type { Request, Response } from "express";
import { BridgeClient, WorkflowStore } from "@iris/tools";
import {
  createListWorkflowsTool,
  createExecuteWorkflowTool,
  createUploadVbsTool,
  createRecoverTool,
} from "@iris/tools";
import { executeWorkflow } from "@iris/workflow-executor";
import {
  parseVbs,
  detectParameterCandidates,
  applyParameters,
} from "@iris/vbs-parser";
import {
  Agent,
  ProviderTransport,
} from "@mariozechner/pi-agent";
import {
  getModel,
  getModels,
  getProviders,
  type Model,
  type KnownProvider,
} from "@mariozechner/pi-ai";
import type { AgentEvent } from "@mariozechner/pi-agent";

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

// Auto-detect provider from environment, fallback to github-copilot
function detectDefaults(): { provider: KnownProvider; model: string } {
  if (process.env.ZAI_API_KEY) return { provider: "zai" as KnownProvider, model: "glm-4.7" };
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_OAUTH_TOKEN)
    return { provider: "anthropic" as KnownProvider, model: "claude-sonnet-4" };
  if (process.env.OPENAI_API_KEY) return { provider: "openai" as KnownProvider, model: "gpt-4o" };
  return { provider: "github-copilot" as KnownProvider, model: "gpt-4o" };
}

const { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL_ID } = detectDefaults();
console.log(`AI provider: ${DEFAULT_PROVIDER} / ${DEFAULT_MODEL_ID}`);

interface ChatDeps {
  bridge: BridgeClient;
  store: WorkflowStore;
}

export function createChatHandler(deps: ChatDeps) {
  // Create tools with server-side bridge and store
  const requestGateApproval = async (
    _stepIndex: number,
    description: string,
  ): Promise<boolean> => {
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

  // Current model (mutable via /api/model)
  let currentModel: Model<any> = getModel(DEFAULT_PROVIDER as any, DEFAULT_MODEL_ID);

  // Create agent with ProviderTransport (calls LLM providers directly)
  const transport = new ProviderTransport();

  const agent = new Agent({
    transport,
    initialState: {
      systemPrompt: SAP_SYSTEM_PROMPT,
      model: currentModel,
      tools: tools as any,
      thinkingLevel: "off",
    },
  });

  // Chat endpoint: POST /api/chat
  const chatHandler = async (req: Request, res: Response) => {
    const { message } = req.body as { message: string };

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message string required" });
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

    // Subscribe to agent events and relay to SSE
    const unsub = agent.subscribe((e: AgentEvent) => {
      switch (e.type) {
        case "message_update": {
          const evt = e.assistantMessageEvent;
          if (evt.type === "text_delta") {
            send("text", { text: evt.delta });
          }
          break;
        }
        case "tool_execution_start":
          send("tool_call", { name: e.toolName, input: e.args });
          break;
        case "tool_execution_end": {
          const text =
            typeof e.result === "string"
              ? e.result
              : e.result?.content
                  ?.map((c: any) => c.text)
                  .filter(Boolean)
                  .join("\n") || "Done";
          send("tool_result", {
            name: e.toolName,
            text,
            is_error: e.isError,
          });
          break;
        }
        case "agent_end":
          // Will be handled after prompt() resolves
          break;
      }
    });

    try {
      await agent.prompt(message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send("error", { error: msg });
    }

    unsub();
    send("done", {});
    res.end();
  };

  // Model management endpoints
  const setModelHandler = (req: Request, res: Response) => {
    const { provider, modelId } = req.body as {
      provider: string;
      modelId: string;
    };

    try {
      currentModel = getModel(provider as any, modelId);
      agent.setModel(currentModel);
      res.json({
        ok: true,
        model: { id: currentModel.id, name: currentModel.name, provider },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: msg });
    }
  };

  const getModelsHandler = (_req: Request, res: Response) => {
    const providers = getProviders();
    const result: Record<string, { id: string; name: string }[]> = {};
    for (const p of providers) {
      result[p] = getModels(p).map((m) => ({ id: m.id, name: m.name }));
    }
    res.json({
      current: {
        provider: currentModel.provider,
        modelId: currentModel.id,
        name: currentModel.name,
      },
      providers: result,
    });
  };

  return { chatHandler, setModelHandler, getModelsHandler };
}
