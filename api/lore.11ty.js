exports.data = { permalink: "/api/lore.11ty.js", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const rows = (collections.all || [])
    .filter((d) => (d.data.type === "lore" || d.filePathStem.toLowerCase().includes("/lore/")) && d.data.publish !== false)
    .map((d) => ({
      uid: d.data.uid || `lore_${d.fileSlug}`,
      type: "lore",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      campaign: d.data.campaign || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      bodyHtml: d.templateContent,
    }));
  return JSON.stringify(rows, null, 2);
};
