export const data  = { permalink: "/api/sessions.json", eleventyExcludeFromCollections: true };
export function render ({ collections }) {
  const rows = (collections.all || [])
    .filter(d => (d.data.type === "sessions" || d.filePathStem.toLowerCase().includes("/sessions/"))
                  && d.data.publish !== false
                  && (GM_MODE || d.data.gm !==)) //<- hide GM in public build 
    .map(d => ({
      uid: d.data.uid || `sessions_${d.fileSlug}`,
      type: "sessions",
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
