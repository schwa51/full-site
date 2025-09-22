// vault/campaigns/campaigns.11tydata.js

// Safe slug
const safe = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

// Pull campaign + section from file path, case-insensitive, works with spaces
function parsePath(data) {
  const stem = String(data.page?.filePathStem || "").replace(/\\/g, "/");
  // Find ".../vault/campaigns/<campaign>/..."
  const m = stem.match(/\/vault\/campaigns\/([^/]+)(?:\/([^/]+))?/i);
  const campaignSeg = m?.[1] || "";                   // may be "Echoes Beneath the Mountains"
  const sectionSeg  = m?.[2] || "";                   // e.g., "items", "sessions", "locations"
  return {
    stem,
    campaignSeg,
    sectionSeg,
    isIndex: /\/index$/i.test(stem)
  };
}

// Treat these as first-level sections under a campaign folder
const SECTION_KEYS = new Set([
  "items","locations","npcs","lore","sessions","maps","general","characters"
]);

function isCampaignRootIndex(parsed) {
  // vault/campaigns/<campaign>/index.*
  const { stem, campaignSeg } = parsed;
  if (!campaignSeg) return false;
  return new RegExp(`/vault/campaigns/${campaignSeg}/index$`, "i").test(stem);
}

function isSectionIndex(parsed) {
  // vault/campaigns/<campaign>/<section>/index.*
  const { stem, campaignSeg, sectionSeg } = parsed;
  if (!campaignSeg || !sectionSeg) return false;
  return new RegExp(`/vault/campaigns/${campaignSeg}/${sectionSeg}/index$`, "i").test(stem);
}

const isTemplatePath = d =>
  /\/vault\/campaigns\/templates\//i.test(String(d.page?.filePathStem || "").replace(/\\/g, "/"));

module.exports = {
  eleventyComputed: {
    // Skip output for drafts/templates
    permalink: d => {
      // 0) Respect explicit permalink during migration
      if (d.permalink) return d.permalink;

      // 1) Skip drafts
      if (d.publish === false) return false;

      // 2) Skip templates folder entirely
      const stem = String(d.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;

      // 3) Parse path and compute
      const parsed = parsePath(d);
      const campaignSlug = safe(d.campaign || parsed.campaignSeg);
      if (!campaignSlug) return false; // don’t emit without a campaign

      // Allow front matter "type" to override section if present
      const sectionFromFM = d.type ? safe(d.type) : "";
      const section = sectionFromFM || (SECTION_KEYS.has(safe(parsed.sectionSeg)) ? safe(parsed.sectionSeg) : "");

      // Compute last segment: prefer front matter "slug", else fileSlug
      const pageSlug = safe(d.slug || d.page?.fileSlug);

      // GM vs public base
      const base = d.gm ? "/gm/vault/campaigns" : "/vault/campaigns";

      // Campaign root index
      if (isCampaignRootIndex(parsed)) {
        return `${base}/${campaignSlug}/`;
      }

      // Section index
      if (isSectionIndex(parsed) && section) {
        return `${base}/${campaignSlug}/${section}/`;
      }

      // Regular page under a section
      if (section) {
        return `${base}/${campaignSlug}/${section}/${pageSlug || "index"}/`;
      }

      // Rare: page directly under campaign root (no first-level section)
      return `${base}/${campaignSlug}/${pageSlug || "index"}/`;
    },

    // ✅ ADD: keep drafts/templates out of collections
    eleventyExcludeFromCollections: d => (isTemplatePath(d) || d.publish === false),

    // ✅ ADD: prevent layout from rendering for drafts/templates
    layout: d => {
      if (isTemplatePath(d) || d.publish === false) return null;
      return d.layout; // leave as-is otherwise
    },

    // Optional: expose computed pieces to your templates if useful
    campaignSlug: d => safe(d.campaign || parsePath(d).campaignSeg),
    section:      d => {
      const parsed = parsePath(d);
      return d.type ? safe(d.type)
        : (SECTION_KEYS.has(safe(parsed.sectionSeg)) ? safe(parsed.sectionSeg) : "");
    },
    pageSlug:     d => safe(d.slug || d.page?.fileSlug),
    basePath:     d => d.gm ? "/gm/vault/campaigns" : "/vault/campaigns",
  }
};
