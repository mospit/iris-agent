import express from "express";
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BRIDGE_SCRIPT = process.env.BRIDGE_SCRIPT || join(__dirname, "../../../sap-bridge/mock_bridge.py");

const app = express();
app.use(express.static(join(__dirname, "../client")));

// Serve workflow JSON files
app.use("/api/workflows", express.static(join(__dirname, "../../../../workflows")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

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

app.listen(PORT, () => {
  console.log(`Iris agent running at http://localhost:${PORT}`);
});
