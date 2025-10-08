// /api/items.js
export const data = {
  permalink: "/api/items.json",
  eleventyExcludeFromCollections: true,
};

const GM_MODE = !!process.env.GM_MODE;

export function render({ collections }) {
  const rows = (collections.all || [])
    .filter((d) => {
      const stem = String(d.filePathStem || "").toLowerCase();
      const isNpc = d?.data?.type === "items" || stem.includes("/items/");
      const published = d?.data?.publish !== false;
      const allowInPublic = GM_MODE || d?.data?.gm !== true; // hide GM in public build
      return isNpc && published && allowInPublic;
    })
    .map((d) => ({
      uid: d?.data?.uid || `items_${d.fileSlug}`,
      type: "items",
      title: d?.data?.title,
      slug: d.fileSlug,
      tags: d?.data?.tags || [],
      campaign: d?.data?.campaign || null,
      system: d?.data?.system || null,
      updatedAt: new Date(d?.data?.updatedAt || d.date).toISOString(),
      image: d?.data?.image || null,
      bodyHtml: d.templateContent,
    }));

  return JSON.stringify(rows, null, 2);
}
