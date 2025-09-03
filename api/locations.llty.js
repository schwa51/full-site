exports.data = { permalink: "/api/locations.llty.js", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const rows = (collections.all || [])
    .filter((d) => (d.data.type === "location" || d.filePathStem.toLowerCase().includes("/locations/")) && d.data.publish !== false)
    .map((d) => ({
      uid: d.data.uid || `location_${d.fileSlug}`,
      type: "location",
      title: d.data.title,
      slug: d.fileSlug,
      tags: d.data.tags || [],
      campaign: d.data.campaign || null,
      updatedAt: new Date(d.data.updatedAt || d.date).toISOString(),
      bodyHtml: d.templateContent,
    }));
  return JSON.stringify(rows, null, 2);
};
