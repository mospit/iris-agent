import "./app.css";
import { initApp } from "./agent-setup.js";

async function main() {
  const container = document.getElementById("app");
  if (!container) throw new Error("App container not found");

  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#8a8479;">Loading Iris...</div>';

  try {
    await initApp(container);
  } catch (err) {
    console.error("Failed to initialize:", err);
    container.innerHTML = `<div style="padding:2rem;color:red;">Failed to start: ${err}</div>`;
  }
}

main();
