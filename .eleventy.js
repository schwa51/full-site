/* .eleventy.js (CJS, single export) */
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");

module.exports = function (eleventyConfig) {
  /* ---------- Plugins ---------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

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
      npcs: "NPCs",
      items: "Items",
      sessions: "Sessions",
      locations: "Locations",
      lore: "Lore",
      maps: "Maps",
      general: "General Information",
      characters: "Player Characters",
    };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
  });

  /* ---------- Static assets ---------- */
  eleventyConfig.addPassthroughCopy("assets");

  /* ---------- Predicates ---------- */
  const typeIs = (e, ...tys) => {
    const t = (e.data?.type || "").toLowerCase();
    return tys.includes(t);
  };
  const isPublic = (e) => (e.data?.gm === true) ? false : (e.data?.publish !== false);
  const isGM     = (e) => (e.data?.gm === true) || (e.data?.publish === false);

  /* ---------- Universal collections (by `type` frontmatter) ---------- */
  eleventyConfig.addCollection("public_items",      c => c.getAll().filter(e => typeIs(e,"item","items")         && isPublic(e)));
  eleventyConfig.addCollection("public_npcs",       c => c.getAll().filter(e => typeIs(e,"npc","npcs")           && isPublic(e)));
  eleventyConfig.addCollection("public_lore",       c => c.getAll().filter(e => typeIs(e,"lore")                 && isPublic(e)));
  eleventyConfig.addCollection("public_locations",  c => c.getAll().filter(e => typeIs(e,"location","locations") && isPublic(e)));
  eleventyConfig.addCollection("public_sessions",   c => c.getAll().filter(e => typeIs(e,"session","sessions")   && isPublic(e)));

  /* Optional GM/private mirrors */
  eleventyConfig.addCollection("gm_items",      c => c.getAll().filter(e => typeIs(e,"item","items")         && isGM(e)));
  eleventyConfig.addCollection("gm_npcs",       c => c.getAll().filter(e => typeIs(e,"npc","npcs")           && isGM(e)));
  eleventyConfig.addCollection("gm_lore",       c => c.getAll().filter(e => typeIs(e,"lore")                 && isGM(e)));
  eleventyConfig.addCollection("gm_locations",  c => c.getAll().filter(e => typeIs(e,"location","locations") && isGM(e)));
  eleventyConfig.addCollection("gm_sessions",   c => c.getAll().filter(e => typeIs(e,"session","sessions")   && isGM(e)));

  /* ---------- (Optional) Per-campaign globs ---------- */
  const enableMultiCampaign = true; // keep if you still use slug_* collections anywhere
  if (enableMultiCampaign) {
    const campaigns = {
      echoes:      "vault/campaigns/Echoes Beneath the Mountains",
      mothership:  "vault/campaigns/Mothership campaign",
      pirateborg:  "vault/campaigns/Pirate Borg campaign",
      wildsea:     "vault/campaigns/The Wildsea campaign",
      timewatch:   "vault/campaigns/Timewatch campaign",
      mythic:      "vault/campaigns/Mythic Bastionland campaign",
      dolmenwood:  "vault/campaigns/Dolmenwood",
    };
    Object.entries(campaigns).forEach(([slug, p]) => {
      eleventyConfig.addCollection(`${slug}_all_general`,      c => c.getFilteredByGlob(`${p}/general/*.md`));
      eleventyConfig.addCollection(`${slug}_public_general`,   c => c.getFilteredByGlob(`${p}/general/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_npcs`,      c => c.getFilteredByGlob(`${p}/npcs/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_items`,     c => c.getFilteredByGlob(`${p}/items/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_characters`,c => c.getFilteredByGlob(`${p}/characters/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_locations`, c => c.getFilteredByGlob(`${p}/locations/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_lore`,      c => c.getFilteredByGlob(`${p}/lore/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_maps`,      c => c.getFilteredByGlob(`${p}/maps/*.md`).filter(i => i.data.publish === true));
      eleventyConfig.addCollection(`${slug}_public_sessions`,  c => c.getFilteredByGlob(`${p}/sessions/*.md`).filter(i => i.data.publish === true));
    });
  } else {
    // Legacy single-campaign fallback (fix the typo if you ever use it)
    const campaignPath = "vault/campaigns/Echoes Beneath the Mountains";
    const filterPublished = (glob, c) => c.getFilteredByGlob(glob).filter(i => i.data.publish === true);
    eleventyConfig.addCollection("public_sessions",  c => filterPublished(`${campaignPath}/sessions/*.md`,  c));
    eleventyConfig.addCollection("public_characters",c => filterPublished(`${campaignPath}/characters/*.md`,c));
    eleventyConfig.addCollection("public_items",     c => filterPublished(`${campaignPath}/items/*.md`,     c));
    eleventyConfig.addCollection("public_locations", c => filterPublished(`${campaignPath}/locations/*.md`, c));
    eleventyConfig.addCollection("public_lore",      c => filterPublished(`${campaignPath}/lore/*.md`,      c));
    eleventyConfig.addCollection("public_npcs",      c => filterPublished(`${campaignPath}/npcs/*.md`,      c));
  }
  /*----------- Halloween game collection --------- */
eleventyConfig.addCollection("halloween_games", collectionApi => {
  return collectionApi.getAll().filter(p =>
    p.data.publish &&
    (p.data.tags || []).includes("halloween_game")
  ).sort((a,b) => (a.data.order || 999) - (b.data.order || 999));
});


  /* ---------- Interlinker plugin ---------- */
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

  /* ---------- Dir ---------- */
  return {
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
};
