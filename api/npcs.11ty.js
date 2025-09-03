exports.data = { permalink: "/api/npcs.11ty.js", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const rows = (collections.all || [])
    .filter((d) => (d.data.type === "npc" || d.filePathStem.toLowerCase().includes("/npcs/")) && d.data.publish !== false)
    .map((d) => ({
      uid: d.data.uid || `npc_${d.fileSlug}`,
      type: "npc",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      campaign: d.data.campaign || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      bodyHtml: d.templateContent,
    }));
  return JSON.stringify(rows, null, 2);
};
