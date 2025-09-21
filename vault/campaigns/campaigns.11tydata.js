// vault/campaigns/campaigns.11tydata.js

const safeSlug = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

// Return explicit section if type present; else infer from path; else null (campaign-root)
function inferSection(data) {
  if (data.type) return safeSlug(data.type);

  const stem = String(data.page?.filePathStem || "");
  // Matches ".../vault/campaigns/<campaign>/<section>/..."
  const m = stem.match(/\/vault\/campaigns\/[^/]+\/([^/]+)(?:\/|$)/i);
  return m ? safeSlug(m[1]) : null;
}

function isCampaignRootIndex(data) {
  const stem = String(data.page?.filePathStem || "");
  // ".../vault/campaigns/<campaign>/index"
  return /\/vault\/campaigns\/[^/]+\/index$/i.test(stem)
      || data.campaignIndex === true; // optional manual flag
}

function isSectionIndex(data, section) {
  if (!section) return false;
  const stem = String(data.page?.filePathStem || "");
  // ".../vault/campaigns/<campaign>/<section>/index"
  return new RegExp(`/vault/campaigns/[^/]+/${section}/index$`, "i").test(stem)
      || data.sectionIndex === true; // optional manual flag
}

module.exports = {
  eleventyComputed: {
    campaignSlug: d => safeSlug(d.campaign || ""),
    section:      d => inferSection(d),                     // null for campaign-root
    pageSlug:     d => safeSlug(d.slug || d.page?.fileSlug),
    basePath:     d => d.gm ? "/gm/vault/campaigns" : "/vault/campaigns",

    // During migration, honor any explicit permalink to avoid surprises.
    // When you're done, you can switch to the strict override:
    // permalink: d => { ...computed only... }
    permalink: d => {
      if (d.permalink) return d.permalink;

      const campaignSlug = d.campaignSlug;
      if (!campaignSlug) return false; // don't emit without a campaign

      const base = d.basePath;
      const section = d.section; // may be null
      const pageSlug = d.pageSlug;

      // 1) Campaign root index: /.../<campaign>/
      if (isCampaignRootIndex(d)) {
        return `${base}/${campaignSlug}/`;
      }

      // 2) Section index: /.../<campaign>/<section>/
      if (isSectionIndex(d, section)) {
        return `${base}/${campaignSlug}/${section}/`;
      }

      // 3) Regular page paths
      if (section) {
        // /.../<campaign>/<section>/<page>/
        return `${base}/${campaignSlug}/${section}/${pageSlug || "index"}/`;
      } else {
        // Non-section page at campaign root (rare but supported):
        // /.../<campaign>/<page>/
        return `${base}/${campaignSlug}/${pageSlug || "index"}/`;
      }
    }
  }
};
