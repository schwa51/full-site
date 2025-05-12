const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
const interlinker = require("@photogabble/eleventy-plugin-interlinker");

module.exports = function(eleventyConfig) {
  // … any other config …
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

  const enableMultiCampaign = false;

if (enableMultiCampaign) {
  campaignDirs.forEach((campaignPath) => {
    // new logic
    const campaignDirs = [
      "vault/campaigns/Echos Beneath the Mountains",
      "vault/campaigns/Mothership campaign",
      "vault/campaigns/Pirate Borg campaign",
      "vault/campaigns/The Wildsea campaign",
      "vault/campaigns/Timewatch campaign"
      // add more as needed
    ];
    campaignDirs.forEach((campaignPath) => {
      const campaignSlug = campaignPath.split("/").pop().toLowerCase().replace(/\s+/g, "-");

    //for general folder
      eleventyConfig.addCollection(`${campaignSlug}_all_general`, (collection) =>
        collection.getFilteredByGlob(`${campaignPath}/general/*.md`)
      );
    
      eleventyConfig.addCollection(`${campaignSlug}_public_general`, (collection) =>
        collection.getFilteredByGlob(`${campaignPath}/general/*.md`).filter(
          (item) => item.data.publish === true
        )
      );
    
      // You can repeat this for npcs, items, etc.
      eleventyConfig.addFilter("hasContent", (collections, key) => {
        return Array.isArray(collections[key]) && collections[key].length > 0;
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
        maps; "Maps",
        general: "General Information"
        characters: "Player Characters"
      };
      return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
    });
    

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