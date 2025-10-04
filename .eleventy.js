/* .eleventy.js (ESM) */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import Image from "@11ty/eleventy-img";

export default function(eleventyConfig) {
  // ---------- Shortcodes ----------
  eleventyConfig.addNunjucksAsyncShortcode("img", async (src, alt="", className="", sizes="(min-width: 800px) 800px, 100vw") => {
    const metadata = await Image(src, {
      widths: [320, 640, 960, 1280],
      formats: ["webp","jpeg"],
      urlPath: "/img/opt/",
      outputDir: "./_site/img/opt/",
      cacheOptions: { duration: "1y", directory: ".cache/eleventy-img" },
    });
    return Image.generateHTML(metadata, { alt, sizes, loading:"lazy", decoding:"async", class: className });
  });

  // ---------- Ignore junk ----------
  eleventyConfig.ignores.add("**/.obsidian/**");
  eleventyConfig.ignores.add("**/.history/**");
  eleventyConfig.ignores.add("**/.trash/**");

  // ---------- Markdown ----------
  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, linkify: true })
      .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] })
  );

  // ---------- Helpers ----------
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const norm     = s => String(s || "").toLowerCase().trim();
  const get      = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);

  // ---------- Core filter functions (single definitions) ----------
  const byTagFilter = (arr, tag) =>
    (arr || []).filter(i => (i?.data?.tags || []).map(norm).includes(norm(tag)));

  const whereDataFilter = (arr, key, val) =>
    (arr || []).filter(i => i?.data?.[key] === val);

  const whereFilter = (arr, keyPath, value) =>
    Array.isArray(arr) ? arr.filter(item => get(item, keyPath) === value) : [];

  // Register (universal + explicit engines)
  eleventyConfig.addFilter("byTag", byTagFilter);
  eleventyConfig.addFilter("whereData", whereDataFilter);
  eleventyConfig.addFilter("where", whereFilter);
  eleventyConfig.addNunjucksFilter("byTag", byTagFilter);
  eleventyConfig.addNunjucksFilter("whereData", whereDataFilter);
  eleventyConfig.addNunjucksFilter("where", whereFilter);
  eleventyConfig.addLiquidFilter?.("byTag", byTagFilter);
  eleventyConfig.addLiquidFilter?.("whereData", whereDataFilter);
  eleventyConfig.addLiquidFilter?.("where", whereFilter);

  // Also expose as globals so you can call them without the pipe if you like
  eleventyConfig.addGlobalData("filters", { byTag: byTagFilter, whereData: whereDataFilter, where: whereFilter });
  eleventyConfig.addGlobalData("helpers", { safeSlug });

  // ---------- Plugins ----------
  // Do NOT run interlinker on .njk; it can create a fresh env missing your filters
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.liquid",
    preProcessExtensions:  ["md","html"],   // ← removed "njk"
    postProcessExtensions: ["html"],        // ← removed "njk"
    removeTargetExtension: true,
    slugifyName: name => safeSlug(name),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  // ---------- Re-attach filters to the final NJK environment (belt & suspenders) ----------
  eleventyConfig.amendLibrary("njk", (env) => {
    if (!env.filters.byTag)     env.addFilter("byTag", byTagFilter);
    if (!env.filters.whereData) env.addFilter("whereData", whereDataFilter);
    if (!env.filters.where)     env.addFilter("where", whereFilter);
    console.log("Final NJK filters:", Object.keys(env.filters).sort().join(", "));
  });

  // ---------- A few of your other utilities ----------
  eleventyConfig.addFilter("slug", v => safeSlug(v));
  eleventyConfig.addFilter("head", (arr, n) => Array.isArray(arr) && n > 0 ? arr.slice(0, n) : []);
  eleventyConfig.addFilter("titleize", (s="") => String(s).split(" ").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" "));
  eleventyConfig.addFilter("sortFeatured", (arr) =>
    (arr||[]).slice().sort((a,b) =>
      (a.data.indexOrder ?? 999) - (b.data.indexOrder ?? 999) ||
      (a.data.title||"").localeCompare(b.data.title||"")
    )
  );

  // ---------- Passthrough ----------
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");

  // ---------- Collections ----------
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

  // ---------- Computed permalinks ----------
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

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
