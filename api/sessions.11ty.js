exports.data = { permalink: "/api/sessions.11ty.js", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const rows = (collections.all || [])
    .filter((d) => (d.data.type === "session" || d.filePathStem.toLowerCase().includes("/sessions/")) && d.data.publish !== false)
    .map((d) => ({
      uid: d.data.uid || `session_${d.fileSlug}`,
      type: "session",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      campaign: d.data.campaign || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      bodyHtml: d.templateContent,
    }));
  return JSON.stringify(rows, null, 2);
};
