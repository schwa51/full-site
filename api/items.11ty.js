export const data  = { permalink: "/api/items.json", eleventyExcludeFromCollections: true };
export function render ({ collections }) {
  const rows = (collections.all || [])
    .filter(d => (d.data.type === "item" || d.filePathStem.toLowerCase().includes("/items/")) && d.data.publish !== false)
    .map(d => ({
      uid: d.data.uid || `item_${d.fileSlug}`,
      type: "item",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      system: d.data.system || null,
      campaign: d.data.campaign || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      image: d.data.image || null,
      bodyHtml: d.templateContent
    }));
  return JSON.stringify(rows, null, 2);
};
