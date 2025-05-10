const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");
module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  // register a `map` filter for Nunjucks (and Liquid, if you want)
  eleventyConfig.addFilter("map", function(arr, prop) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => item[prop]);
  });
  // ✅ Pass through static assets
  eleventyConfig.addPassthroughCopy("assets");

    const contentTypes = ["npcs", "characters", "items", "lore", "locations", "sessions", "general", "maps"];
  
    contentTypes.forEach((type) => {
      eleventyConfig.addCollection(type, function (collectionApi) {
        return collectionApi.getAll().filter(item =>
          item.data.type === type
        );
      });
    });
  
    eleventyConfig.addCollection("campaigns", function (collectionApi) {
      // Group everything by campaign name
      const entries = collectionApi.getAll().filter(item => item.data.campaign);
      const campaigns = {};
  
      for (const entry of entries) {
        const camp = entry.data.campaign;
        if (!campaigns[camp]) campaigns[camp] = [];
        campaigns[camp].push(entry);
      }

      return Object.entries(campaigns).map(([name, entries]) => ({
        name,
        entries
      }));
    });
    
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
