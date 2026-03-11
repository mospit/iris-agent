import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Workflow } from "./types.js";

export class WorkflowStore {
  private dir: string;

  constructor(workflowsDir: string) {
    this.dir = workflowsDir;
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  list(): Workflow[] {
    const files = readdirSync(this.dir).filter((f) => f.endsWith(".json"));
    return files.map((f) => JSON.parse(readFileSync(join(this.dir, f), "utf-8")));
  }

  get(id: string): Workflow | null {
    const path = join(this.dir, `${id}.json`);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  save(workflow: Workflow): void {
    writeFileSync(join(this.dir, `${workflow.id}.json`), JSON.stringify(workflow, null, 2));
  }
}
