import { build, context } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");

// Ensure dist directories exist
mkdirSync(join(__dirname, "dist/client"), { recursive: true });
mkdirSync(join(__dirname, "dist/server"), { recursive: true });

// Build server (TypeScript -> JS via tsc)
console.log("Building server...");
execSync("npx tsc", { cwd: __dirname, stdio: "inherit" });

// Copy index.html to dist/client
copyFileSync(
  join(__dirname, "src/client/index.html"),
  join(__dirname, "dist/client/index.html"),
);

// Bundle client with esbuild
const clientConfig = {
  entryPoints: [join(__dirname, "src/client/main.ts")],
  bundle: true,
  outfile: join(__dirname, "dist/client/main.js"),
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  define: {
    "process.env.NODE_ENV": isDev ? '"development"' : '"production"',
  },
  alias: {
    ws: join(__dirname, "src/client/ws-shim.ts"),
    fs: join(__dirname, "src/client/node-shim.ts"),
    path: join(__dirname, "src/client/node-shim.ts"),
    child_process: join(__dirname, "src/client/node-shim.ts"),
    url: join(__dirname, "src/client/node-shim.ts"),
    net: join(__dirname, "src/client/node-shim.ts"),
    tls: join(__dirname, "src/client/node-shim.ts"),
    http: join(__dirname, "src/client/node-shim.ts"),
    https: join(__dirname, "src/client/node-shim.ts"),
    crypto: join(__dirname, "src/client/node-shim.ts"),
    stream: join(__dirname, "src/client/node-shim.ts"),
    zlib: join(__dirname, "src/client/node-shim.ts"),
    events: join(__dirname, "src/client/node-shim.ts"),
    buffer: join(__dirname, "src/client/node-shim.ts"),
    util: join(__dirname, "src/client/node-shim.ts"),
  },
  loader: {
    ".css": "css",
  },
};

if (isDev) {
  console.log("Starting dev mode...");
  const ctx = await context(clientConfig);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  console.log("Building client bundle...");
  await build(clientConfig);
  console.log("Build complete.");
}
