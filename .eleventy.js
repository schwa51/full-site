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

  /* ---------- Universal collections (by `type`) ---------- */
  eleventyConfig.addCollection("public_items",      c => c.getAll().filter(e => typeIs(e,"item","items")         && isPublic(e)));
  eleventyConfig.addCollection("public_npcs",       c => c.getAll().filter(e => typeIs(e,"npc","npcs")           && isPublic(e)));
  eleventyConfig.addCollection("public_lore",       c => c.getAll().filter(e => typeIs(e,"lore")                 && isPublic(e)));
  eleventyConfig.addCollection("public_locations",  c => c.getAll().filter(e => typeIs(e,"location","locations") && isPublic(e)));
  eleventyConfig.addCollection("public_sessions",   c => c.getAll().filter(e => typeIs(e,"session","sessions")   && isPublic(e)));

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
    brindlewood: "vault/campaingns/Brindlewood Bay"
  };
  Object.entries(campaigns).forEach(([slug, p]) => {
    eleventyConfig.addCollection(`${slug}_all_general`,       c => c.getFilteredByGlob(`${p}/general/*.md`));
    eleventyConfig.addCollection(`${slug}_public_general`,    c => c.getFilteredByGlob(`${p}/general/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_npcs`,       c => c.getFilteredByGlob(`${p}/npcs/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_items`,      c => c.getFilteredByGlob(`${p}/items/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_characters`, c => c.getFilteredByGlob(`${p}/characters/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_locations`,  c => c.getFilteredByGlob(`${p}/locations/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_lore`,       c => c.getFilteredByGlob(`${p}/lore/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_maps`,       c => c.getFilteredByGlob(`${p}/maps/*.md`).filter(i => i.data.publish === true));
    eleventyConfig.addCollection(`${slug}_public_sessions`,   c => c.getFilteredByGlob(`${p}/sessions/*.md`).filter(i => i.data.publish === true));
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
    // templateFormats: ["md","njk","html"] // uncomment if you restrict formats
  };
};
