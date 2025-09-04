exports.data = { permalink: "/api/characters.json", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const rows = (collections.all || [])
    .filter(d =>
      (d.data.type === "character" || d.filePathStem.toLowerCase().includes("/characters/")) &&
      d.data.publish !== false
    )
    .map(d => ({
      uid: d.data.uid || `character_${d.fileSlug}`,
      type: "character",
      system: d.data.system || null,
      campaign: d.data.campaign || null,
      title: d.data.title,
      slug: d.fileSlug,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      portrait: d.data.portrait || null,
      bodyHtml: d.templateContent,
      url: d.url,
    }));
  return JSON.stringify(rows, null, 2);
};
