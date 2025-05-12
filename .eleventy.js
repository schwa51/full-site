// .eleventy.js
module.exports = {
  dir: {
    input: "vault",
    includes: "../_includes",
    data: "../_data",
    output: "_site"
  }
};
// .eleventy.js
const wiki = require("eleventy-plugin-wikilinks");
const nav  = require("@11ty/eleventy-navigation");

module.exports = function(eleventyConfig) {
  // Copy assets & CSS
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("styles");

  // Convert [[wikilinks]] → links
  eleventyConfig.addPlugin(wiki, { uriSuffix: ".html" });

  // Build nav trees
  eleventyConfig.addPlugin(nav);
  
    // All NPCs marked for public viewing
    eleventyConfig.addCollection("npcs_public", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/npcs/*.md")
        .filter(item => item.data.publish !== true);
    });
  
    // All NPCs marked GM-only
    eleventyConfig.addCollection("npcs_gm", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/npcs/*.md")
        .filter(item => item.data.publish === false);
    });
    // All characters marked for public viewing
    eleventyConfig.addCollection("characters_public", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/characters/*.md")
        .filter(item => item.data.publish !== true);
    });
  
    // All characters marked GM-only
    eleventyConfig.addCollection("characters_gm", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/characters/*.md")
        .filter(item => item.data.publish === false);
    });
      // All lore marked for public viewing
      eleventyConfig.addCollection("lore_public", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/lore/*.md")
          .filter(item => item.data.publish !== true);
      });
    
      // All lore marked GM-only
      eleventyConfig.addCollection("lore_gm", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/lore/*.md")
          .filter(item => item.data.publish === false);
      });
        // All items marked for public viewing
    eleventyConfig.addCollection("items_public", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/items/*.md")
        .filter(item => item.data.publish !== true);
    });
  
    // All items marked GM-only
    eleventyConfig.addCollection("items_gm", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/items/*.md")
        .filter(item => item.data.publish === false);
    });
      // All sessions marked for public viewing
      eleventyConfig.addCollection("sessions_public", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/sessions/*.md")
          .filter(item => item.data.publish !== true);
      });
    
      // All sessions marked GM-only
      eleventyConfig.addCollection("sessions_gm", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/sessions/*.md")
          .filter(item => item.data.publish === false);
      });
        // All general marked for public viewing
    eleventyConfig.addCollection("general_public", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/general/*.md")
        .filter(item => item.data.publish !== true);
    });
  
    // All general marked GM-only
    eleventyConfig.addCollection("general_gm", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/general/*.md")
        .filter(item => item.data.publish === false);
    });
      // All maps marked for public viewing
      eleventyConfig.addCollection("maps_public", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/maps/*.md")
          .filter(item => item.data.publish !== true);
      });
    
      // All maps marked GM-only
      eleventyConfig.addCollection("maps_gm", (collectionApi) => {
        return collectionApi
          .getFilteredByGlob("vault/campaigns/*/maps/*.md")
          .filter(item => item.data.publish === false);
      });
        // All locations marked for public viewing
    eleventyConfig.addCollection("locations_public", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/locations/*.md")
        .filter(item => item.data.publish !== true);
    });
  
    // All locations marked GM-only
    eleventyConfig.addCollection("locations_gm", (collectionApi) => {
      return collectionApi
        .getFilteredByGlob("vault/campaigns/*/locations/*.md")
        .filter(item => item.data.publish === false);
    });
  };

  return {
    markdownTemplateEngine: "njk",
    passthroughFileCopy: true
  };