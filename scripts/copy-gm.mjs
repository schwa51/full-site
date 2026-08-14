// scripts/copy-gm.mjs
import { rmSync, mkdirSync, cpSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

rmSync("_site/gm", { recursive: true, force: true });
mkdirSync("_site/gm", { recursive: true });

// The GM build references shared assets from absolute root paths. Copying the
// complete build would duplicate every image, video, and PDF under /gm, which
// makes the deployment hundreds of megabytes larger for no functional gain.
function copyHtmlTree(sourceRoot, currentDirectory = sourceRoot) {
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    const sourcePath = join(currentDirectory, entry.name);
    if (entry.isDirectory()) {
      copyHtmlTree(sourceRoot, sourcePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const destinationPath = join("_site/gm", relative(sourceRoot, sourcePath));
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath);
  }
}

copyHtmlTree("_site_gm");
