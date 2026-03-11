import WebSocket from "ws";
import type { BridgeCommand, BridgeResponse, ScreenState } from "./types.js";

export class BridgeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private requestId = 0;
  private pending = new Map<number, { resolve: (r: BridgeResponse) => void; reject: (e: Error) => void }>();

  constructor(url = "ws://localhost:8765") {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.on("open", () => resolve());
      this.ws.on("error", (err) => reject(err));
      this.ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        const pending = this.pending.get(msg.id);
        if (pending) {
          this.pending.delete(msg.id);
          pending.resolve(msg);
        }
      });
      this.ws.on("close", () => {
        for (const p of this.pending.values()) {
          p.reject(new Error("Bridge connection closed"));
        }
        this.pending.clear();
        this.ws = null;
      });
    });
  }

  async send(command: BridgeCommand): Promise<BridgeResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
    this.ws?.close();
    this.ws = null;
  }
}
