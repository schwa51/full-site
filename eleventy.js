module.exports = function (eleventyConfig) {
    // All NPCs
    eleventyConfig.addCollection("npcs", (collection) =>
      collection.getFilteredByGlob("npcs/*.md")
    );
  
    // Only public NPCs
    eleventyConfig.addCollection("npcs_public", (collection) =>
      collection.getFilteredByGlob("npcs/*.md").filter((item) => item.data.public)
    );
  
    // Sessions, Items, Lore
    eleventyConfig.addCollection("sessions", (collection) =>
      collection.getFilteredByGlob("sessions/*.md")
    );
    eleventyConfig.addCollection("items", (collection) =>
      collection.getFilteredByGlob("items/*.md")
    );
    eleventyConfig.addCollection("lore", (collection) =>
      collection.getFilteredByGlob("lore/*.md")
    );
    // ✅ Tell Eleventy to pass through static assets (like CSS)
    eleventyConfig.addPassthroughCopy("assets/css");

    return {
      dir: {
        input: ".",
        includes: "_includes",
        output: "_site",
      },
    };
  }; 