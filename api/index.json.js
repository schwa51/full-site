exports.data = {
  permalink: "/api/index.json",
  eleventyExcludeFromCollections: true,
};

function guessType(d) {
  const p = d.filePathStem.toLowerCase();
  if (p.includes("/items/")) return "item";
  if (p.includes("/locations/")) return "location";
  if (p.includes("/npcs/")) return "npc";
  if (p.includes("/lore/")) return "lore";
  if (p.includes("/sessions/")) return "session";
  if (p.includes("/characters/")) return "character";
  return "general";
}

exports.render = ({ collections }) => {
  const docs = (collections.all || [])
    .filter((d) => d.data && d.data.title && d.data.publish !== false)
    .map((d) => ({
      uid: d.data.uid || `${(d.data.type || guessType(d))}_${d.fileSlug}`,
      type: d.data.type || guessType(d),
      title: d.data.title,
      slug: d.fileSlug,
      campaign: d.data.campaign || null,
      tags: d.data.tags || [],
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      gmOnly: d.data.publish === false || d.data.visibility === "gm",
      url: d.url,
    }));
  return JSON.stringify(docs, null, 2);
};
