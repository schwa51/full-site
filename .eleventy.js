const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");

module.exports = function(eleventyConfig) {
  // … any other config …
};

module.exports = function(eleventyConfig) {
  /* ---------- Filters ---------- */
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

  /* ---------- Predicates ---------- */
  const typeIs = (e, ...tys) => {
    const t = (e.data?.type || "").toLowerCase();
    return tys.includes(t);
  };
  const isPublic = (e) => (e.data?.gm === true) ? false : (e.data?.publish !== false);
  const isGM     = (e) => (e.data?.gm === true) || (e.data?.publish === false);

  /* ---------- Universal public collections ---------- */
  eleventyConfig.addCollection("public_items",      c => c.getAll().filter(e => typeIs(e,"item","items")         && isPublic(e)));
  eleventyConfig.addCollection("public_npcs",       c => c.getAll().filter(e => typeIs(e,"npc","npcs")           && isPublic(e)));
  eleventyConfig.addCollection("public_lore",       c => c.getAll().filter(e => typeIs(e,"lore")                 && isPublic(e)));
  eleventyConfig.addCollection("public_locations",  c => c.getAll().filter(e => typeIs(e,"location","locations") && isPublic(e)));
  eleventyConfig.addCollection("public_sessions",   c => c.getAll().filter(e => typeIs(e,"session","sessions")   && isPublic(e)));

  /* ---------- Optional GM/private mirrors ---------- */
  eleventyConfig.addCollection("gm_items",      c => c.getAll().filter(e => typeIs(e,"item","items")         && isGM(e)));
  eleventyConfig.addCollection("gm_npcs",       c => c.getAll().filter(e => typeIs(e,"npc","npcs")           && isGM(e)));
  eleventyConfig.addCollection("gm_lore",       c => c.getAll().filter(e => typeIs(e,"lore")                 && isGM(e)));
  eleventyConfig.addCollection("gm_locations",  c => c.getAll().filter(e => typeIs(e,"location","locations") && isGM(e)));
  eleventyConfig.addCollection("gm_sessions",   c => c.getAll().filter(e => typeIs(e,"session","sessions")   && isGM(e)));
};


module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  // register a `map` filter for Nunjucks (and Liquid, if you want)
  eleventyConfig.addFilter("map", function(arr, prop) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => item[prop]);
  });
  // ✅ Pass through static assets
  eleventyConfig.addPassthroughCopy("assets");

 

  const enableMultiCampaign = true;

  if (enableMultiCampaign) {
    const campaigns = {
      "echoes": "vault/campaigns/Echoes Beneath the Mountains",
      "mothership": "vault/campaigns/Mothership campaign",
      "pirateborg": "vault/campaigns/Pirate Borg campaign",
      "wildsea": "vault/campaigns/The Wildsea campaign",
      "timewatch": "vault/campaigns/Timewatch campaign",
      "mythic": "vault/campaigns/Mythic Bastionland campaign",
      "dolmenwood": "vault/campaigns/Dolmenwood"
      // add more as needed
    };
  
    Object.entries(campaigns).forEach(([slug, path]) => {
      eleventyConfig.addCollection(`${slug}_all_general`, (collection) =>
        collection.getFilteredByGlob(`${path}/general/*.md`)
      );
  
      eleventyConfig.addCollection(`${slug}_public_general`, (collection) =>
        collection.getFilteredByGlob(`${path}/general/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
  
      eleventyConfig.addCollection(`${slug}_public_npcs`, (collection) =>
        collection.getFilteredByGlob(`${path}/npcs/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_items`, (collection) =>
        collection.getFilteredByGlob(`${path}/items/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_characters`, (collection) =>
        collection.getFilteredByGlob(`${path}/characters/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_locations`, (collection) =>
        collection.getFilteredByGlob(`${path}/locations/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_lore`, (collection) =>
        collection.getFilteredByGlob(`${path}/lore/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_maps`, (collection) =>
        collection.getFilteredByGlob(`${path}/maps/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      eleventyConfig.addCollection(`${slug}_public_sessions`, (collection) =>
        collection.getFilteredByGlob(`${path}/sessions/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
      
      // Repeat for items, locations, etc. as needed
//defining "keys" for testing
eleventyConfig.addFilter("keys", function(obj) {
  return Object.keys(obj || {});
});

    });
  // skips collections without content
  eleventyConfig.addFilter("hasContent", (collections, key) => {
    return Array.isArray(collections[key]) && collections[key].length > 0;
  });
//sets titles 
  eleventyConfig.addFilter("typeTitle", (type) => {
    const map = {
      npcs: "NPCs",
      items: "Items",
      sessions: "Sessions",
      locations: "Locations",
      lore: "Lore",
      maps: "Maps",
      general: "General Information",
      characters: "Player Characters"
    };
    return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
  });
  } else {
  // existing single-campaign logic
  const campaignPath = "vault/campaigns/Echos Beneath the Mountains";

  const filterPublished = (glob, collection) =>
    collection.getFilteredByGlob(glob).filter(
      (item) => item.data.publish === true
    );

  // ✅ Collections for Echoes
  eleventyConfig.addCollection("all_sessions", c =>
    c.getFilteredByGlob(`${campaignPath}/sessions/*.md`)
  );
  eleventyConfig.addCollection("public_sessions", c =>
    filterPublished(`${campaignPath}/sessions/*.md`, c)
  );

  eleventyConfig.addCollection("all_characters", c =>
    c.getFilteredByGlob(`${campaignPath}/characters/*.md`)
  );
  eleventyConfig.addCollection("public_characters", c =>
    filterPublished(`${campaignPath}/characters/*.md`, c)
  );

  eleventyConfig.addCollection("all_items", c =>
    c.getFilteredByGlob(`${campaignPath}/items/*.md`)
  );
  eleventyConfig.addCollection("public_items", c =>
    filterPublished(`${campaignPath}/items/*.md`, c)
  );

  eleventyConfig.addCollection("all_locations", c =>
    c.getFilteredByGlob(`${campaignPath}/locations/*.md`)
  );
  eleventyConfig.addCollection("public_locations", c =>
    filterPublished(`${campaignPath}/locations/*.md`, c)
  );

  eleventyConfig.addCollection("all_lore", c =>
    c.getFilteredByGlob(`${campaignPath}/lore/*.md`)
  );
  eleventyConfig.addCollection("public_lore", c =>
    filterPublished(`${campaignPath}/lore/*.md`, c)
  );

  eleventyConfig.addCollection("all_npcs", c =>
    c.getFilteredByGlob(`${campaignPath}/npcs/*.md`)
  );
  eleventyConfig.addCollection("public_npcs", c =>
    filterPublished(`${campaignPath}/npcs/*.md`, c)
  );
}
  eleventyConfig.addPlugin(interlinker, {
    // (optional) default layout to wrap embeds in:
    defaultLayout: "layouts/embed.liquid",
    // Which source extensions to scan for [[links]]:
    preProcessExtensions:  ["md","njk","html"],

    // When you see [[Some Page]], strip its .md and emit a URL ending in "/"
    postProcessExtensions: ["html","njk"],
    removeTargetExtension: true,

    // slugify "Some Page" → "some-page"
    slugifyName: name =>
      name
        .toLowerCase()
        .trim()
        .replace(/[^\w]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    // (optional) if you embed something that has its own `embedLayout` front-matter,
    // it will override `defaultLayout`
    layoutKey: "embedLayout",

    // how broken links are reported: "console" | "json" | "none"
    deadLinkReport: "console",
  });

  return {
    dir: {
      input: ".",           // 👈 Main project root is Eleventy input
      includes: "_includes",
      output: "_site"
    }
  };
};