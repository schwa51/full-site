export const data  = { permalink: "/api/general.json", eleventyExcludeFromCollections: true };
export function render ({ collections }) {
  const rows = (collections.all || [])
    .filter(d =>
      (d.data.type === "general" || (d.data.tags || []).includes("general")) &&
      d.data.publish !== false
    )
    .map(d => ({
      uid: d.data.uid || `general_${d.fileSlug}`,
      type: "general",
      system: d.data.system || null,
      campaign: d.data.campaign || null,
      title: d.data.title,
      tags: d.data.tags || [],
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      bodyHtml: d.templateContent,
      url: d.url,
    }));
  return JSON.stringify(rows, null, 2);
};
