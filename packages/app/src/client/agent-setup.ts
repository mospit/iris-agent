import type { Workflow } from "@iris/tools";
import { BridgeClient } from "@iris/tools";
import { createListWorkflowsTool, createExecuteWorkflowTool, createUploadVbsTool, createRecoverTool } from "@iris/tools";
import { executeWorkflow } from "@iris/workflow-executor";
import { parseVbs, detectParameterCandidates, applyParameters } from "@iris/vbs-parser";

// Browser-compatible workflow store using localStorage
class BrowserWorkflowStore {
  private key = "iris-workflows";

  list(): Workflow[] {
    const data = localStorage.getItem(this.key);
    return data ? JSON.parse(data) : [];
  }

  get(id: string): Workflow | null {
    return this.list().find((w) => w.id === id) || null;
  }

  save(workflow: Workflow): void {
    const workflows = this.list().filter((w) => w.id !== workflow.id);
    workflows.push(workflow);
    localStorage.setItem(this.key, JSON.stringify(workflows));
  }

  async loadFromServer(): Promise<void> {
    // Load pre-built workflows from server if not already in localStorage
    if (this.list().length > 0) return;

    const workflowIds = ["coois_pi_order_status", "humo_org_structure", "mmbe_stock_overview"];
    for (const id of workflowIds) {
      try {
        const res = await fetch(`/api/workflows/${id}.json`);
        if (res.ok) {
          const workflow = await res.json();
          this.save(workflow);
        }
      } catch {
        // Workflow not available yet, skip
      }
    }
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
  await workflowStore.loadFromServer();

  // Gate approval via confirm dialog (prototype — upgrade to chat-based later)
  const requestGateApproval = async (_stepIndex: number, description: string): Promise<boolean> => {
    return window.confirm(`SAP is about to: ${description}\n\nProceed?`);
  };

  // Create tools
  const tools = [
    createListWorkflowsTool(workflowStore as any),
    createExecuteWorkflowTool(workflowStore as any, bridge, requestGateApproval, executeWorkflow),
    createUploadVbsTool(workflowStore as any, { parseVbs, detectParameterCandidates, applyParameters }),
    createRecoverTool(bridge),
  ];

  // Render a simple standalone UI (pi-web-ui would be integrated here in production)
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100vh;background:#1a1a1a;color:#e0e0e0;">
      <header style="padding:1rem 1.5rem;background:#0d6e4f;color:white;font-size:1.2rem;font-weight:600;">
        Iris — SAP Automation Agent
      </header>
      <div style="flex:1;overflow-y:auto;padding:1.5rem;" id="chat-messages">
        <div style="color:#8a8479;text-align:center;margin-top:2rem;">
          <p style="font-size:1.1rem;">Welcome to Iris</p>
          <p style="margin-top:0.5rem;font-size:0.9rem;">SAP GUI automation through natural language chat</p>
          <p style="margin-top:1rem;font-size:0.85rem;color:#666;">
            ${tools.length} tools loaded: ${tools.map(t => t.name).join(", ")}
          </p>
          <p style="margin-top:0.5rem;font-size:0.85rem;color:#666;">
            ${workflowStore.list().length} workflows available
          </p>
          <p style="margin-top:1.5rem;font-size:0.85rem;color:#555;">
            Connect a pi-web-ui ChatPanel or LLM provider to start chatting.
          </p>
        </div>
      </div>
      <div style="padding:1rem 1.5rem;border-top:1px solid #333;">
        <div style="display:flex;gap:0.5rem;">
          <input type="text" placeholder="Type a message... (requires pi-web-ui ChatPanel integration)"
                 style="flex:1;padding:0.75rem;border-radius:8px;border:1px solid #333;background:#2a2a2a;color:#e0e0e0;font-size:0.95rem;"
                 disabled>
        </div>
      </div>
    </div>
  `;

  console.log("Iris app initialized with tools:", tools.map(t => t.name));
  console.log("System prompt:", SAP_SYSTEM_PROMPT.substring(0, 100) + "...");
}
