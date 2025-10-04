/* .eleventy.js */
console.log("[DEBUG] Config file loading...");

import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

console.log("[DEBUG] Imports successful");

// Use named export instead of default export for v2.0.1 compatibility
const eleventyConfig = function(eleventyConfig) {
  console.log("[DEBUG] Config function called - SHOULD SEE THIS NOW");
  
  // Helper functions
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  
  // Filter function
  const whereFilter = (arr, keyPath, value) => {
    console.log("[DEBUG] whereFilter called", { keyPath, value, arrLength: Array.isArray(arr) ? arr.length : 'not array' });
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => get(item, keyPath) === value);
  };

  console.log("[DEBUG] Registering filters...");
  
  // Register filters with explicit logging
  eleventyConfig.addFilter("where", whereFilter);
  eleventyConfig.addNunjucksFilter("where", whereFilter);
  
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

  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      if (data.permalink !== undefined) return data.permalink;
      const inputPath = String(data.page?.inputPath || "").replace(/\\/g, "/");
      if (!inputPath.includes("/vault/campaigns/")) return undefined;
      if (data.publish === false) return false;
      const parts = inputPath.split("/");
      const i = parts.indexOf("campaigns");
      if (i === -1) return undefined;
      const campaign = parts[i + 1] || "";
      const contentType = parts[i + 2] || "general";
      const filename = (data.page?.fileSlug || "").split("/").pop() || "index";
      const isGMContent = data.gm === true || data.publish === false;
      const prefix = isGMContent ? "/gm" : "";
      const campaignSlug = safeSlug(campaign);
      return `${prefix}/${campaignSlug}/${safeSlug(contentType)}/${safeSlug(filename)}/`;
    }
  });

  console.log("[DEBUG] Config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
};

// Export as default
export default eleventyConfig;

console.log("[DEBUG] Config file fully processed");
