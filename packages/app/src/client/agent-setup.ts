export async function initApp(container: HTMLElement) {
  let isStreaming = false;
  let currentModel = { provider: "", modelId: "", name: "Loading..." };

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100vh;background:#1a1a1a;color:#e0e0e0;">
      <header style="padding:0.75rem 1.5rem;background:#0d6e4f;color:white;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:1.2rem;font-weight:600;">Iris — SAP Automation Agent</span>
        <select id="model-select" style="padding:0.4rem;border-radius:6px;border:1px solid rgba(255,255,255,0.3);background:rgba(0,0,0,0.2);color:white;font-size:0.8rem;max-width:220px;">
          <option>Loading models...</option>
        </select>
      </header>
      <div style="flex:1;overflow-y:auto;padding:1.5rem;" id="chat-messages">
        <div style="color:#8a8479;text-align:center;margin-top:2rem;" id="welcome">
          <p style="font-size:1.1rem;">Welcome to Iris</p>
          <p style="margin-top:0.5rem;font-size:0.9rem;">SAP GUI automation through natural language chat</p>
          <p style="margin-top:1.5rem;font-size:0.85rem;color:#555;">
            Try: "What workflows are available?" or "Run the COOIS order status check"
          </p>
        </div>
      </div>
      <div style="padding:1rem 1.5rem;border-top:1px solid #333;">
        <form id="chat-form" style="display:flex;gap:0.5rem;">
          <input type="text" id="chat-input"
                 placeholder="Type a message..."
                 style="flex:1;padding:0.75rem;border-radius:8px;border:1px solid #333;background:#2a2a2a;color:#e0e0e0;font-size:0.95rem;"
                 autocomplete="off">
          <button type="submit" id="send-btn"
                  style="padding:0.75rem 1.5rem;border-radius:8px;border:none;background:#0d6e4f;color:white;font-size:0.95rem;cursor:pointer;">
            Send
          </button>
        </form>
      </div>
    </div>
  `;

  const chatMessages = container.querySelector("#chat-messages") as HTMLElement;
  const chatForm = container.querySelector("#chat-form") as HTMLFormElement;
  const chatInput = container.querySelector("#chat-input") as HTMLInputElement;
  const sendBtn = container.querySelector("#send-btn") as HTMLButtonElement;
  const modelSelect = container.querySelector("#model-select") as HTMLSelectElement;

  // Load available models and populate selector
  try {
    const res = await fetch("/api/models");
    const data = await res.json();
    currentModel = data.current;

    modelSelect.innerHTML = "";
    for (const [provider, models] of Object.entries(data.providers) as [string, { id: string; name: string }[]][]) {
      if (models.length === 0) continue;
      const group = document.createElement("optgroup");
      group.label = provider;
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = `${provider}::${m.id}`;
        opt.textContent = m.name;
        if (provider === currentModel.provider && m.id === currentModel.modelId) {
          opt.selected = true;
        }
        group.appendChild(opt);
      }
      modelSelect.appendChild(group);
    }
  } catch {
    modelSelect.innerHTML = "<option>Failed to load models</option>";
  }

  modelSelect.addEventListener("change", async () => {
    const [provider, modelId] = modelSelect.value.split("::");
    try {
      const res = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, modelId }),
      });
      const data = await res.json();
      if (data.ok) {
        currentModel = { provider, modelId, name: data.model.name };
      }
    } catch (err) {
      console.error("Failed to set model:", err);
    }
  });

  function addMessageBubble(role: "user" | "assistant" | "tool", text: string): HTMLElement {
    const welcome = container.querySelector("#welcome");
    if (welcome) welcome.remove();

    const bubble = document.createElement("div");
    bubble.style.cssText = `
      margin-bottom:1rem;padding:0.75rem 1rem;border-radius:12px;max-width:80%;
      white-space:pre-wrap;word-wrap:break-word;line-height:1.5;font-size:0.95rem;
    `;

    if (role === "user") {
      bubble.style.cssText += "background:#0d6e4f;color:white;margin-left:auto;";
    } else if (role === "tool") {
      bubble.style.cssText += "background:#2a2a2a;color:#8a8479;border:1px solid #333;font-size:0.85rem;font-family:monospace;";
    } else {
      bubble.style.cssText += "background:#2a2a2a;color:#e0e0e0;margin-right:auto;";
    }

    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  function setLoading(loading: boolean) {
    isStreaming = loading;
    chatInput.disabled = loading;
    sendBtn.disabled = loading;
    sendBtn.textContent = loading ? "..." : "Send";
    sendBtn.style.opacity = loading ? "0.5" : "1";
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    addMessageBubble("user", text);
    chatInput.value = "";
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const err = await res.text();
        addMessageBubble("assistant", `Error: ${err}`);
        setLoading(false);
        return;
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantBubble: HTMLElement | null = null;
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (eventType === "text") {
              if (!assistantBubble) {
                assistantBubble = addMessageBubble("assistant", "");
              }
              assistantText += data.text;
              assistantBubble.textContent = assistantText;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            } else if (eventType === "tool_call") {
              addMessageBubble("tool", `Calling ${data.name}...`);
            } else if (eventType === "tool_result") {
              const prefix = data.is_error ? "Error: " : "";
              addMessageBubble("tool", `${data.name}: ${prefix}${data.text}`);
              assistantBubble = null;
              assistantText = "";
            } else if (eventType === "error") {
              addMessageBubble("assistant", `Error: ${data.error}`);
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addMessageBubble("assistant", `Connection error: ${msg}`);
    }

    setLoading(false);
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  chatInput.focus();
  console.log("Iris chat UI initialized");
}
