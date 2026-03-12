// Empty shim for Node.js built-in modules that get pulled into the browser bundle.
// These modules are only used by server-side code paths (e.g. workflow-store)
// that are tree-shaken at runtime but not at bundle time.
export default {};
export const readFileSync = () => { throw new Error("fs not available in browser"); };
export const writeFileSync = () => { throw new Error("fs not available in browser"); };
export const readdirSync = () => [];
export const existsSync = () => false;
export const mkdirSync = () => {};
export const join = (...args: string[]) => args.join("/");
