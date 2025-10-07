export const data  = { permalink: "/api/npcs.json", eleventyExcludeFromCollections: true };
export function render ({ collections }) {
  const rows = (collections.all || [])
    .filter(d => (d.data.type === "npcs" || d.filePathStem.toLowerCase().includes("/npcs/")) 
                      && d.data.publish !== false
                      && (GM_MODE || d.data.gm !==)) //<- hide GM in public build 

    .map(d => ({
      uid: d.data.uid || `npcs_${d.fileSlug}`,
      type: "npcs",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      campaign: d.data.campaign || null,
      system: d.data.system || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      image: d.data.image || null,
      bodyHtml: d.templateContent
    }));
  return JSON.stringify(rows, null, 2);
};
