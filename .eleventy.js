/* .eleventy.js (CJS, single export) */
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");
const markdownIt = require("markdown-it");
const markdownItAttrs = require("markdown-it-attrs");

module.exports = function (eleventyConfig) {
  /* ---------- Markdown: enable heading classes ---------- */
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, {
      allowedAttributes: ["id", "class", /^data-.*$/]
    });

  // Works on Eleventy v1 and v2
  if (eleventyConfig.amendLibrary) {
    eleventyConfig.amendLibrary("md", (lib) => lib.use(markdownItAttrs));
  }
  eleventyConfig.setLibrary("md", md);
/* ---------- Slug helpers (global) ---------- */
const safeSlug = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

function inferSection(data) {
  // Prefer explicit "type" in front matter (e.g., 'items', 'locations', 'npcs', 'lore', 'sessions', 'maps', 'general')
  if (data.type) return safeSlug(data.type);
  // Fallback: derive from the file path under vault/campaigns/<campaign>/<section>/...
  const stem = String(data.page?.filePathStem || "");
  const m = stem.match(/\/vault\/campaigns\/[^/]+\/([^/]+)/i);
  return m ? safeSlug(m[1]) : "general";
}
/* ---------- Filters / globals ---------- */
eleventyConfig.addFilter("slug", v => safeSlug(v));
// --- tiny utils ---
const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
// where: keep items whose keyPath === value
eleventyConfig.addFilter("where", (arr, keyPath, value) => {
  return (arr || []).filter(item => get(item, keyPath) === value);
});

// uniqueBy: de-dup by a key path (e.g., "inputPath")
eleventyConfig.addFilter("uniqueBy", (arr, keyPath = "inputPath") => {
  const seen = new Set();
  return (arr || []).filter(item => {
    const k = get(item, keyPath);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
});

// sortBy: stable, locale-aware sort by key path
eleventyConfig.addFilter("sortBy", (arr, keyPath) => {
  return (arr || []).slice().sort((a, b) => {
    const av = get(a, keyPath), bv = get(b, keyPath);
    return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
  });
});

// byCampaign: convenience filter for your collections
eleventyConfig.addFilter("byCampaign", (arr, campaign) => {
  const want = safeSlug(campaign);
  return (arr || []).filter(it => {
    const fromData = safeSlug(get(it, "data.campaign") || "");
    const fromComputed = safeSlug(get(it, "data.campaignSlug") || "");
    return fromData === want || fromComputed === want;
  });
});
// Join two arrays (A ⨁ B)
eleventyConfig.addFilter("concat", (a, b) => ([...(a || []), ...(b || [])]));

// Collect arrays from multiple collection keys:  ["key1","key2"] -> collections[key1] + collections[key2]
eleventyConfig.addFilter("collect", (keys, collections) =>
  (keys || []).flatMap(k => collections?.[k] || [])
);

// Handy access if you want to use safeSlug in Nunjucks via global
eleventyConfig.addGlobalData("helpers", { safeSlug });

  /* ---------- Plugins ---------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.liquid",
    preProcessExtensions:  ["md","njk","html"],
    postProcessExtensions: ["html","njk"],
    removeTargetExtension: true,
    slugifyName: name =>
      name.toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, ""),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  /* ---------- Layouts ---------- */
  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");

  /* ---------- Filters (global) ---------- */
  eleventyConfig.addFilter("safeTitle", e => e?.data?.title || e?.fileSlug || "");
  eleventyConfig.addFilter("byCampaign", (arr, camp) => {
    if (!arr || !camp) return arr || [];
    return arr.filter(e => e?.data?.campaign === camp);
  });
  eleventyConfig.addFilter("bySession", (arr, sess) => {
    if (!arr || !sess) return [];
    const has = (v, s) =>
      (typeof v === "string" && v === s) ||
      (Array.isArray(v) && v.includes(s));
    return arr.filter(e => has(e?.data?.session, sess));
  });
  eleventyConfig.addFilter("map", (arr, prop) => Array.isArray(arr) ? arr.map(x => x?.[prop]) : []);
  eleventyConfig.addFilter("keys", obj => Object.keys(obj || {}));
  eleventyConfig.addFilter("hasContent", (collections, key) => Array.isArray(collections[key]) && collections[key].length > 0);
  eleventyConfig.addFilter("typeTitle", (type) => {
    const map = {
      npcs: "NPCs", items: "Items", sessions: "Sessions", locations: "Locations",
      lore: "Lore", maps: "Maps", general: "General Information", characters: "Player Characters",
    };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
  });

  /* ---------- Static assets ---------- */
  eleventyConfig.addPassthroughCopy("assets");

  /* ---------- Predicates ---------- */
  const typeIs = (e, ...tys) => (e.data?.type || "").toLowerCase() && tys.includes((e.data?.type || "").toLowerCase());
  const isPublic = (e) => (e.data?.gm === true) ? false : (e.data?.publish !== false);
  const isGM     = (e) => (e.data?.gm === true) || (e.data?.publish === false);

  /* ---------- Computed Data: Auto-generate permalinks based on publish status ---------- */
  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      // Skip if permalink is already explicitly set
      if (data.permalink !== undefined) {
        return data.permalink;
      }
      
      // Only auto-generate for campaign content files
      if (!data.page.inputPath.includes('/vault/campaigns/')) {
        return undefined; // Use default behavior
      }
      
      // Don't generate pages for unpublished content
      if (data.publish === false) {
        return false;
      }
      
      // Generate permalink based on GM/public status and file structure
      const pathParts = data.page.inputPath.split('/');
      const campaignIndex = pathParts.indexOf('campaigns');
      if (campaignIndex === -1) return undefined;
      
      const campaign = pathParts[campaignIndex + 1];
      const contentType = pathParts[campaignIndex + 2]; // npcs, items, etc.
      const filename = pathParts[pathParts.length - 1].replace('.md', '');
      
      // Determine if this should be GM-only or public
      const isGMContent = data.gm === true || data.publish === false;
      const prefix = isGMContent ? '/gm' : '';
      
      // Create clean URL structure
      const campaignSlug = campaign.toLowerCase().replace(/[^\w]+/g, '-');
      return `${prefix}/${campaignSlug}/${contentType}/${filename}/`;
    }
  });

  /* ---------- Universal collections (REMOVED - using campaign-specific only) ---------- */
  // Removed to eliminate duplicates - use campaign-specific collections instead

  /* ---------- Per-campaign globs ---------- */
  const campaigns = {
    echoes:      "vault/campaigns/Echoes Beneath the Mountains",
    mothership:  "vault/campaigns/Mothership campaign",
    pirateborg:  "vault/campaigns/Pirate Borg campaign",
    wildsea:     "vault/campaigns/The Wildsea campaign",
    timewatch:   "vault/campaigns/Timewatch campaign",
    mythic:      "vault/campaigns/Mythic Bastionland campaign",
    dolmenwood:  "vault/campaigns/Dolmenwood",
    tencandles:  "vault/campaigns/Ten Candles",
    shadowdark:  "vault/campaigns/Shadowdark",
    brindlewood: "vault/campaigns/Brindlewood Bay"
  };

  Object.entries(campaigns).forEach(([slug, p]) => {
    // All content (for GM pages)
    eleventyConfig.addCollection(`${slug}_all_general`,       c => c.getFilteredByGlob(`${p}/general/*.md`));
    eleventyConfig.addCollection(`${slug}_all_npcs`,          c => c.getFilteredByGlob(`${p}/npcs/*.md`));
    eleventyConfig.addCollection(`${slug}_all_items`,         c => c.getFilteredByGlob(`${p}/items/*.md`));
    eleventyConfig.addCollection(`${slug}_all_characters`,    c => c.getFilteredByGlob(`${p}/characters/*.md`));
    eleventyConfig.addCollection(`${slug}_all_locations`,     c => c.getFilteredByGlob(`${p}/locations/*.md`));
    eleventyConfig.addCollection(`${slug}_all_lore`,          c => c.getFilteredByGlob(`${p}/lore/*.md`));
    eleventyConfig.addCollection(`${slug}_all_maps`,          c => c.getFilteredByGlob(`${p}/maps/*.md`));
    eleventyConfig.addCollection(`${slug}_all_sessions`,      c => c.getFilteredByGlob(`${p}/sessions/*.md`));
    
    // Public content only (for player-visible pages)
    eleventyConfig.addCollection(`${slug}_public_general`,    c => c.getFilteredByGlob(`${p}/general/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_npcs`,       c => c.getFilteredByGlob(`${p}/npcs/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_items`,      c => c.getFilteredByGlob(`${p}/items/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_characters`, c => c.getFilteredByGlob(`${p}/characters/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_locations`,  c => c.getFilteredByGlob(`${p}/locations/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_lore`,       c => c.getFilteredByGlob(`${p}/lore/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_maps`,       c => c.getFilteredByGlob(`${p}/maps/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
    eleventyConfig.addCollection(`${slug}_public_sessions`,   c => c.getFilteredByGlob(`${p}/sessions/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
  });

  /* ---------- Halloween game collection ---------- */
  eleventyConfig.addCollection("halloween_game", api =>
    api.getAll()
      .filter(p => p.data.publish && (p.data.tags || []).includes("halloween_game"))
      .sort((a,b) => (a.data.order || 999) - (b.data.order || 999))
  );

  /* ---------- Dirs & engines ---------- */
  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
};