const safeSlug = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

function inferSection(data) {
  if (data.type) return safeSlug(data.type); // e.g., 'items', 'locations', etc.
  const stem = String(data.page?.filePathStem || "");
  const m = stem.match(/\/vault\/campaigns\/[^/]+\/([^/]+)/i);
  return m ? safeSlug(m[1]) : "general";
}

// sections you treat as "indexable"
const SECTION_KEYS = new Set(["items","locations","npcs","lore","sessions","maps","general"]);

module.exports = {
  eleventyComputed: {
    // canonical pieces available to every page under vault/campaigns/**
    campaignSlug: d => safeSlug(d.campaign || ""),
    section:      d => inferSection(d),
    pageSlug:     d => safeSlug(d.slug || d.page?.fileSlug),
    basePath:     d => d.gm ? "/gm/vault/campaigns" : "/vault/campaigns",

    // THE permalink for all campaign content
    // For migration safety you can temporarily do: (d) => d.permalink || <computed>
    permalink: d => {
      const { basePath, campaignSlug, section, pageSlug } = d;
      if (!campaignSlug) return false; // skip emitting if campaign missing

      // Campaign root index (rare)
      if (!SECTION_KEYS.has(section) && !pageSlug) {
        return `${basePath}/${campaignSlug}/`;
      }
      // Section index: /vault/campaigns/<campaign>/<section>/
      if (SECTION_KEYS.has(section) && !pageSlug) {
        return `${basePath}/${campaignSlug}/${section}/`;
      }
      // Regular page: /vault/campaigns/<campaign>/<section>/<page>/
      return `${basePath}/${campaignSlug}/${section}/${pageSlug}/`;
    }
  }
};
