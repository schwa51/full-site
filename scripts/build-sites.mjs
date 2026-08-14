import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "_site");
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");
const worker = resolve(root, "sites", "worker.js");

await rm(dist, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(source, client, { recursive: true });
await cp(worker, resolve(server, "index.js"));

console.log("Prepared the Eleventy site and private Chronicle service for Sites.");
