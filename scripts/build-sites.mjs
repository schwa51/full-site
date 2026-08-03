import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "_site");
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");

await rm(dist, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(source, client, { recursive: true });
await writeFile(
  resolve(server, "index.js"),
  [
    "const worker = {",
    "  async fetch(request, env) {",
    "    return env.ASSETS.fetch(request);",
    "  },",
    "};",
    "",
    "export default worker;",
    "",
  ].join("\n"),
  "utf8",
);

console.log("Prepared the static Eleventy build for Sites.");
