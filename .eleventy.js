const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");
  // ✅ Pass through static assets
eleventyConfig.addPassthroughCopy("assets");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  // register a `map` filter for Nunjucks (and Liquid, if you want)
  eleventyConfig.addFilter("map", function(arr, prop) {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => item[prop]);
  });
  eleventyConfig.addFilter("filterBy", function (collection, key, value) {
    return collection.filter(item => item.data[key] === value);
  });
  eleventyConfig.addFilter("filterByMultiple", function (collection, criteria = {}) {
    return collection.filter(item => {
      return Object.entries(criteria).every(([key, value]) => item.data[key] === value);
    });
  });
  eleventyConfig.addCollection("content", function (collectionApi) {
    return collectionApi.getAll().filter(item => item.data.type && item.data.campaign);
  }); 
  const campaigns = [
    "Echoes Beneath the Mountains",
    "Mothership campaign",
    "Pirate Borg campaign",
    "Timewatch campaign",
    "Wildsea campaign"
    // Add more campaign folders here
  ];
 
 
  const contentTypes = ["npc", "location", "lore", "item", "session", "general", "map", "character"];
  campaigns.forEach((campaign) => {
    contentTypes.forEach((type) => {
      const collectionName = `${campaign}-${type}`;
      const globPath = `vault/campaigns/${campaign}/${type}/*.md`;

      eleventyConfig.addCollection(collectionName, function (collectionApi) {
        return collectionApi.getFilteredByGlob(globPath);
      });
    });
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
