
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const campaignsDir = path.join(__dirname, "vault", "campaigns");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const res = path.resolve(dir, entry.name);
    return entry.isDirectory() ? walk(res) : res;
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function generateIndexFile(folderPath, campaign, type, order, entries) {
  const title = capitalize(type);
  const campaignSlug = slugify(campaign);
  const sectionKey = `${campaignSlug}-${type}`;

  const indexContent = `---
title: ${title}
layout: layout.njk
type: ${type}
theme: tor
publish: true
draft: false
campaign: ${campaign}
eleventyNavigation:
  key: ${sectionKey}
  parent: ${campaignSlug}
  order: ${order}
---

<section>
  <h1>{{ title }}</h1>
  <p>Welcome to the {{ title.toLowerCase() }} section of the {{ campaign }} campaign.</p>
  <ul>
    ${entries.map(e => `<li><a href="\${e.url}">\${e.title}</a></li>`).join("\n    ")}
  </ul>
</section>`;
  fs.writeFileSync(path.join(folderPath, "index.njk"), indexContent, "utf8");
}

// Ensure each campaign gets a base index
function generateCampaignIndex(campaignPath, campaign) {
  const campaignSlug = slugify(campaign);
  const indexContent = `---
title: ${campaign}
layout: layout.njk
theme: tor
publish: true
draft: false
eleventyNavigation:
  key: ${campaignSlug}
  parent: Campaigns
  order: 1
---

<section>
  <h1>{{ title }}</h1>
  <p>This is the campaign overview for <strong>{{ title }}</strong>.</p>
</section>`;
  fs.writeFileSync(path.join(campaignPath, "index.njk"), indexContent, "utf8");
}

const campaigns = fs.readdirSync(campaignsDir).filter(name =>
  fs.statSync(path.join(campaignsDir, name)).isDirectory()
);

campaigns.forEach(campaign => {
  const campaignPath = path.join(campaignsDir, campaign);
  generateCampaignIndex(campaignPath, campaign);

  const subfolders = fs.readdirSync(campaignPath).filter(sub =>
    fs.statSync(path.join(campaignPath, sub)).isDirectory()
  );

  subfolders.forEach((type, i) => {
    const typePath = path.join(campaignPath, type);
    const files = walk(typePath).filter(f => f.endsWith(".md"));

    const entries = files.map(file => {
      const content = fs.readFileSync(file, "utf8");
      const data = matter(content).data;
      return {
        title: data.title || path.basename(file, ".md"),
        url: data.permalink || "/" + path.relative("vault", file).replace(/\\/g, "/").replace(/\.md$/, "/")
      };
    });

    generateIndexFile(typePath, campaign, type, i + 2, entries); // +2 so campaign root stays first
  });
});
