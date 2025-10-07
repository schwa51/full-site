// scripts/copy-gm.mjs
import { rmSync, mkdirSync, cpSync } from "node:fs";

rmSync("_site/gm", { recursive: true, force: true });
mkdirSync("_site/gm", { recursive: true });
cpSync("_site_gm", "_site/gm", { recursive: true });
