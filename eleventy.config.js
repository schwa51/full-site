/* .eleventy.js */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function(eleventyConfig) {
  console.log("Eleventy v3 config loading...");
  
  // Helper functions
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);

  // Register all filters your template needs
  eleventyConfig.addFilter("slug", v => safeSlug(v));
  
  eleventyConfig.addFilter("where", (arr, keyPath, value) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => get(item, keyPath) === value);
  });

  eleventyConfig.addFilter("byCampaign", (arr, campaign) => {
    if (!Array.isArray(arr)) return [];
    const targetSlug = safeSlug(campaign);
    return arr.filter(item => {
      // Check both data.campaign and data.campaignSlug
      const itemCampaign = safeSlug(get(item, "data.campaign") || "");
      const itemCampaignSlug = safeSlug(get(item, "data.campaignSlug") || "");
      return itemCampaign === targetSlug || itemCampaignSlug === targetSlug;
    });
  });

  eleventyConfig.addFilter("sortBy", (arr, keyPath) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice().sort((a, b) => {
      const aVal = get(a, keyPath);
      const bVal = get(b, keyPath);
      
      // Handle numbers vs strings
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return aVal - bVal;
      }
      
      return String(aVal || "").localeCompare(String(bVal || ""), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });
  });

  eleventyConfig.addFilter("capitalize", str => {
    return String(str || "").charAt(0).toUpperCase() + String(str || "").slice(1);
  });

  eleventyConfig.addFilter("length", arr => {
    return Array.isArray(arr) ? arr.length : 0;
  });

  console.log("Filters registered");

  // Markdown setup
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

  // Collections
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

  // Campaign content (includes GM content)
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
  
// keep these exactly as you have them
const GM_MODE = !!process.env.GM_MODE;
eleventyConfig.addGlobalData("GM_MODE", GM_MODE);
eleventyConfig.addPairedShortcode("gm", (content) => GM_MODE ? content : "");
eleventyConfig.addFilter("ifGM", (txt) => (GM_MODE ? txt : ""));

// keep passthroughs as-is
eleventyConfig.addPassthroughCopy("assets");
eleventyConfig.addPassthroughCopy("static");
eleventyConfig.addPassthroughCopy({ "assets/pdfs": "assets/pdfs" });

// keep GM_MODE + your shortcodes/filters as-is above

// keep GM_MODE + shortcodes/filters as you have above

eleventyConfig.addGlobalData("eleventyComputed", {
  permalink: (data) => {
    // Respect explicit permalinks but normalize legacy "/gm/..." in GM build,
    // and drop GM pages entirely in the public build.
    if (data.permalink !== undefined) {
      const p = data.permalink;
      if (p === false) return false;

      const normalize = (out) => {
        if (!GM_MODE && (data.gm === true || String(out).startsWith("/gm/"))) return false;
        // strip /gm prefix in GM build so paths are stable
        return GM_MODE ? String(out).replace(/^\/gm(?=\/)/, "/") : out;
      };

      if (typeof p === "function") return normalize(p(data));
      return normalize(p);
    }

    const inputPath = String(data.page?.inputPath || "").replace(/\\/g, "/");
    if (!inputPath.includes("/vault/campaigns/")) return undefined;
    if (data.publish === false) return false;
    if (!GM_MODE && data.gm === true) return false;

    const parts = inputPath.split("/");
    const i = parts.indexOf("campaigns");
    if (i === -1) return undefined;

    const campaign    = parts[i + 1] || "";
    const contentType = parts[i + 2] || "general";
    const filename    = (data.page?.fileSlug || "").split("/").pop() || "index";

    const slugify = (s) => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
    const campaignSlug = slugify(campaign);
    const typeSlug     = slugify(contentType);
    const fileSlug     = slugify(filename);

    // 🔎 TEMP DEBUG: log GM pages during GM build
    if (GM_MODE && data.gm === true) {
      console.log("[GM PERMALINK]", data.page?.inputPath, "→", out);
    }

    // match your site’s existing structure
    return `/vault/campaigns/${campaignSlug}/${typeSlug}/${fileSlug}/`;
  }
});

  console.log("Eleventy v3 config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
