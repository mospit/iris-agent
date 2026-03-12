import WebSocket from "ws";
import type { BridgeCommand, BridgeResponse, ScreenState } from "./types.js";

export class BridgeClient {
  private ws: WebSocket | globalThis.WebSocket | null = null;
  private url: string;
  private requestId = 0;
  private pending = new Map<number, { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void }>();

  constructor(url = "ws://localhost:8765") {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url) as any;
      this.ws = socket;

      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = (err: any) => {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };
      const onMessage = (data: any) => {
        const raw = typeof data === "string" ? data : (data.data ?? data.toString());
        const msg = JSON.parse(raw);
        const pending = this.pending.get(msg.id);
        if (pending) {
          this.pending.delete(msg.id);
          pending.resolve(msg);
        }
      };
      const onClose = () => {
        for (const p of this.pending.values()) {
          p.reject(new Error("Bridge connection closed"));
        }
        this.pending.clear();
        this.ws = null;
      };

      const cleanup = () => {
        // Remove the one-time open/error listeners after connect resolves/rejects
      };

      // Use addEventListener for browser compat, fall back to .on for Node ws
      if (typeof socket.addEventListener === "function") {
        socket.addEventListener("open", onOpen);
        socket.addEventListener("error", (e: any) => onError(e));
        socket.addEventListener("message", (e: any) => onMessage(e));
        socket.addEventListener("close", onClose);
      } else {
        socket.on("open", onOpen);
        socket.on("error", onError);
        socket.on("message", onMessage);
        socket.on("close", onClose);
      }
    });
  }

  async send(command: BridgeCommand): Promise<BridgeResponse> {
    if (!this.ws || (this.ws as any).readyState !== WebSocket.OPEN) {
      throw new Error("Bridge not connected");
    }
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, ...command }));
    });
  }

  async readScreen(): Promise<ScreenState> {
    const res = await this.send({ action: "readScreen" });
    if (!res.ok) throw new Error(res.error);
    return res.data as ScreenState;
  }

  async setField(id: string, value: string): Promise<void> {
    const res = await this.send({ action: "setField", id, value });
    if (!res.ok) throw new Error(res.error);
  }

  async press(id: string): Promise<void> {
    const res = await this.send({ action: "press", id });
    if (!res.ok) throw new Error(res.error);
  }

  async sendVKey(code: number): Promise<void> {
    const res = await this.send({ action: "sendVKey", code });
    if (!res.ok) throw new Error(res.error);
  }

  async screenshot(): Promise<string> {
    const res = await this.send({ action: "screenshot" });
    if (!res.ok) throw new Error(res.error);
    return res.data as string;
  }

  async getStatusBar(): Promise<{ type: string; text: string }> {
    const res = await this.send({ action: "getStatusBar" });
    if (!res.ok) throw new Error(res.error);
    return res.data;
  }

  close(): void {
    (this.ws as any)?.close();
    this.ws = null;
  }
}
