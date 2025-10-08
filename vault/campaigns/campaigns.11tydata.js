// vault/campaigns/campaigns.11tydata.js
console.log("USING ELEVENTY CONFIG (dir data):", import.meta.url);

const GM_MODE = !!process.env.GM_MODE;

// Safe slug
const safe = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

// Pull campaign + section from file path
function parsePath(data) {
  const stem = String(data.page?.filePathStem || "").replace(/\\/g, "/");
  const m = stem.match(/\/vault\/campaigns\/([^/]+)(?:\/([^/]+))?/i);
  const campaignSeg = m?.[1] || "";
  const sectionSeg  = m?.[2] || "";
  return {
    stem,
    campaignSeg,
    sectionSeg,
    isIndex: /\/index$/i.test(stem)
  };
}

const SECTION_KEYS = new Set([
  "items","locations","npcs","lore","sessions","maps","general","characters"
]);

function isCampaignRootIndex(parsed) {
  const { stem, campaignSeg } = parsed;
  if (!campaignSeg) return false;
  return new RegExp(`/vault/campaigns/${campaignSeg}/index$`, "i").test(stem);
}

function isSectionIndex(parsed) {
  const { stem, campaignSeg, sectionSeg } = parsed;
  if (!campaignSeg || !sectionSeg) return false;
  return new RegExp(`/vault/campaigns/${campaignSeg}/${sectionSeg}/index$`, "i").test(stem);
}

const isTemplatePath = d =>
  /\/vault\/campaigns\/templates\//i.test(String(d.page?.filePathStem || "").replace(/\\/g, "/"));

export default {
  eleventyComputed: {
    permalink: d => {
      // 0) Respect explicit permalink
      if (d.permalink) return d.permalink;

      // 1) Skip drafts/templates
      if (d.publish === false) return false;
      if (isTemplatePath(d))   return false;

      // 2) Hide GM docs in PUBLIC build. In GM build, emit normally (no /gm prefix).
      if (!GM_MODE && d.gm === true) return false;

      // 3) Compute campaign/section/slug
      const parsed       = parsePath(d);
      const campaignSlug = safe(d.campaign || parsed.campaignSeg);
      if (!campaignSlug) return false; // don’t emit without a campaign

      const sectionFromFM = d.type ? safe(d.type) : "";
      const section = sectionFromFM ||
        (SECTION_KEYS.has(safe(parsed.sectionSeg)) ? safe(parsed.sectionSeg) : "");

      const pageSlug = safe(d.slug || d.page?.fileSlug);

      // 4) Build URL — NOTE: no /gm prefix here, ever
      const base = "/vault/campaigns";

      if (isCampaignRootIndex(parsed)) {
        return `${base}/${campaignSlug}/`;
      }
      if (isSectionIndex(parsed) && section) {
        return `${base}/${campaignSlug}/${section}/`;
      }
      if (section) {
        return `${base}/${campaignSlug}/${section}/${pageSlug || "index"}/`;
      }
      return `${base}/${campaignSlug}/${pageSlug || "index"}/`;
    },

    // Keep drafts/templates out of collections
    eleventyExcludeFromCollections: d => (isTemplatePath(d) || d.publish === false),

    // Don’t render layout for drafts/templates
    layout: d => {
      if (isTemplatePath(d) || d.publish === false) return null;
      return d.layout;
    },

    // Optional helpers
    campaignSlug: d => safe(d.campaign || parsePath(d).campaignSeg),
    section: d => {
      const parsed = parsePath(d);
      return d.type ? safe(d.type)
        : (SECTION_KEYS.has(safe(parsed.sectionSeg)) ? safe(parsed.sectionSeg) : "");
    },
    pageSlug: d => safe(d.slug || d.page?.fileSlug),
    basePath: "/vault/campaigns",
  }
};
