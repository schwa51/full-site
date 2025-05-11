
const fs = require("fs");
const path = require("path");

const campaignsDir = path.join(__dirname, "vault", "campaigns");

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateIndexFile(folderPath, campaign, type, order) {
  const title = capitalize(type);

  const indexContent = `---
title: ${title}
layout: layout.njk
type: ${type}
theme: tor
publish: true
draft: false
campaign: ${campaign}
eleventyNavigation:
  key: ${type}
  parent: ${campaign}
  order: ${order}
---

<section>
  <h1>{{ title }}</h1>
  <p>Welcome to the {{ title | lower }} section of the {{ campaign }} campaign.</p>

  <ul>
    {% set entries = collections.${type} | filterByMultiple({ campaign: "${campaign}", publish: true, draft: false }) %}
    {% for entry in entries %}
      <li><a href="{{ entry.url }}">{{ entry.data.title }}</a></li>
    {% endfor %}
  </ul>
</section>`;
  fs.writeFileSync(path.join(folderPath, "index.njk"), indexContent, "utf8");
}

function generateCampaignIndex(campaignPath, campaign) {
  const indexContent = `---
title: ${campaign}
layout: layout.njk
theme: tor
publish: true
draft: false
eleventyNavigation:
  key: ${campaign}
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
    generateIndexFile(typePath, campaign, type, i + 2);
  });
});
