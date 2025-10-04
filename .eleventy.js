/* .eleventy.js */
console.log("[DEBUG] Config file loading...");

import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

console.log("[DEBUG] Imports successful");

export default function(eleventyConfig) {
  console.log("[DEBUG] Config function called");
  
  // Force early logging to confirm function execution
  eleventyConfig.on('eleventy.before', () => {
    console.log("[DEBUG] Eleventy.before event - config is definitely loaded");
  });

  // Helper functions
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  
  // Filter function
  const whereFilter = (arr, keyPath, value) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => get(item, keyPath) === value);
  };

  console.log("[DEBUG] Registering filters...");
  
  // Multiple registration approaches for reliability
  eleventyConfig.addFilter("where", whereFilter);
  eleventyConfig.addNunjucksFilter("where", whereFilter);
  eleventyConfig.addFilter("slug", v => safeSlug(v));
  
  console.log("[DEBUG] Filters registered");

  // Markdown
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] });
  eleventyConfig.setLibrary("md", md);

  // Plugins  
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.njk",
    preProcessExtensions: ["md","njk","html"],
    postProcessExtensions: ["html","njk"],
    removeTargetExtension: true,
    slugifyName: name => safeSlug(name),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  console.log("[DEBUG] Plugins loaded");

  // Collections
  eleventyConfig.addCollection("public_content", (api) => {
    console.log("[DEBUG] Building public_content collection");
    return api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.campaign) return false;
      if (d.gm === true) return false;
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false;
      return true;
    });
  });

  // Other essentials
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");

  console.log("[DEBUG] Config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}

console.log("[DEBUG] Config file fully processed");
