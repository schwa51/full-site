/* .eleventy.mjs */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function(eleventyConfig) {
  console.log("[11ty] Config loading...");

  // Markdown setup
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] });
  eleventyConfig.setLibrary("md", md);

  // Helper functions
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);

  // Global helpers (bypasses filter registration issues)
  eleventyConfig.addGlobalData("helpers", {
    safeSlug,
    filterRows: (collection, campaignKey, section) => {
      if (!Array.isArray(collection)) return [];
      
      return collection.filter(item => {
        const itemCampaignSlug = get(item, "data.campaignSlug");
        const itemSection = get(item, "data.section");
        
        return itemCampaignSlug === campaignKey && itemSection === section;
      });
    },
    
    // Add other helper functions you need
    byTag: (arr, tag) => {
      const norm = s => String(s||"").toLowerCase().trim();
      return (arr||[]).filter(i => (i?.data?.tags||[]).map(norm).includes(norm(tag)));
    }
  });

  // Basic filters (these should work)
  eleventyConfig.addFilter("slug", v => safeSlug(v));
  eleventyConfig.addFilter("length", arr => Array.isArray(arr) ? arr.length : 0);

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

  console.log("[11ty] Plugins loaded");

  // Collections
  eleventyConfig.addCollection("campaign_content", (api) =>
    api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.campaign) return false;
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false;
      return true;
    })
  );

  eleventyConfig.addCollection("public_content", (api) =>
    api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.campaign) return false;
      if (d.gm === true) return false;
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false;
      return true;
    })
  );

  // Other config
  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");
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

  console.log("[11ty] Config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk", 
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
