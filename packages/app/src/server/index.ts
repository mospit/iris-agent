import express from "express";
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BridgeClient, WorkflowStore } from "@iris/tools";
import { createChatHandler } from "./chat.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BRIDGE_SCRIPT = process.env.BRIDGE_SCRIPT || join(__dirname, "../../../sap-bridge/mock_bridge.py");
const WORKFLOWS_DIR = join(__dirname, "../../../../workflows");

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "../client")));

// Serve workflow JSON files
app.use("/api/workflows", express.static(WORKFLOWS_DIR));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// SAP bridge + workflow store (server-side)
const bridge = new BridgeClient("ws://localhost:8765");
const store = new WorkflowStore(WORKFLOWS_DIR);

// Chat + model endpoints
const { chatHandler, setModelHandler, getModelsHandler } = createChatHandler({ bridge, store });
app.post("/api/chat", chatHandler);
app.post("/api/model", setModelHandler);
app.get("/api/models", getModelsHandler);

// Start mock bridge as child process
let bridgeProcess: ReturnType<typeof spawn> | null = null;

function startBridge() {
  console.log(`Starting SAP bridge: python ${BRIDGE_SCRIPT}`);
  bridgeProcess = spawn("python", [BRIDGE_SCRIPT], { stdio: "inherit" });
  bridgeProcess.on("exit", (code) => {
    console.log(`SAP bridge exited with code ${code}`);
    bridgeProcess = null;
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  bridgeProcess?.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bridgeProcess?.kill();
  process.exit(0);
});

startBridge();

// Connect to bridge after a short delay to let it start
setTimeout(async () => {
  try {
    await bridge.connect();
    console.log("Connected to SAP bridge");
  } catch (err) {
    console.warn("SAP bridge not available, tools will fail gracefully:", err);
  }
}, 1500);

app.listen(PORT, () => {
  console.log(`Iris agent running at http://localhost:${PORT}`);
});
