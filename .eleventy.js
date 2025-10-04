/* .eleventy.js (ESM) */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import Image from "@11ty/eleventy-img";

export default function(eleventyConfig) {
  /* ---------- Shortcodes ---------- */
  eleventyConfig.addNunjucksAsyncShortcode("img", async function(src, alt = "", className = "", sizes="(min-width: 800px) 800px, 100vw") {
    const metadata = await Image(src, {
      widths: [320, 640, 960, 1280],
      formats: ["webp","jpeg"],
      urlPath: "/img/opt/",
      outputDir: "./_site/img/opt/",
      cacheOptions: { duration: "1y", directory: ".cache/eleventy-img" },
    });
    const attrs = { alt, sizes, loading: "lazy", decoding: "async", class: className };
    return Image.generateHTML(metadata, attrs);
  });

  /* ---------- Ignore junk ---------- */
  eleventyConfig.ignores.add("**/.obsidian/**");
  eleventyConfig.ignores.add("**/.history/**");
  eleventyConfig.ignores.add("**/.trash/**");

  /* ---------- Markdown ---------- */
  eleventyConfig.setLibrary(
    "md",
    markdownIt({ html: true, linkify: true })
      .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] })
  );

  /* ---------- Helpers ---------- */
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const norm = s => String(s || "").toLowerCase().trim();

  /* ---------- Filters (single source of truth) ---------- */
  const byTagFilter = (arr, tag) =>
    (arr || []).filter(i => (i?.data?.tags || []).map(norm).includes(norm(tag)));

  const whereDataFilter = (arr, key, val) =>
    (arr || []).filter(i => i?.data?.[key] === val);

  // takes a dot path, e.g. "data.campaign"
  const whereFilter = (arr, keyPath, value) => {
  if (!Array.isArray(arr)) return [];
  const getProp = (obj, path) =>
    String(path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  return arr.filter(item => getProp(item, keyPath) === value);
};

  // Universal registration
  eleventyConfig.addFilter("byTag", byTagFilter);
  eleventyConfig.addFilter("whereData", whereDataFilter);
  eleventyConfig.addFilter("where", whereFilter);

  // Explicit Nunjucks registration (belt & suspenders)
  eleventyConfig.addNunjucksFilter("byTag", byTagFilter);
  eleventyConfig.addNunjucksFilter("whereData", whereDataFilter);
  eleventyConfig.addNunjucksFilter("where", whereFilter);

  // Optional: Liquid safe-guards (no-ops if Liquid isn’t used)
  eleventyConfig.addLiquidFilter?.("byTag", byTagFilter);
  eleventyConfig.addLiquidFilter?.("whereData", whereDataFilter);
  eleventyConfig.addLiquidFilter?.("where", whereFilter);

  eleventyConfig.addGlobalData("helpers", { safeSlug });

  /* ---------- Plugins ---------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.liquid",
    preProcessExtensions:  ["md","njk","html"],
    postProcessExtensions: ["html","njk"],
    removeTargetExtension: true,
    slugifyName: name => safeSlug(name),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  /* ---------- Ensure filters survive plugin env changes ---------- */
  eleventyConfig.amendLibrary("njk", (env) => {
    if (!env.filters.byTag)     env.addFilter("byTag", byTagFilter);
    if (!env.filters.whereData) env.addFilter("whereData", whereDataFilter);
    if (!env.filters.where)     env.addFilter("where", whereFilter);

    // Leave this ON for one build so you can verify on Netlify
    console.log("Final NJK filters:", Object.keys(env.filters).sort().join(", "));
  });

  /* ---------- A few of your other utilities (unchanged) ---------- */
  eleventyConfig.addFilter("slug", v => safeSlug(v));
  eleventyConfig.addFilter("head", (arr, n) => Array.isArray(arr) && n > 0 ? arr.slice(0, n) : []);
  eleventyConfig.addFilter("titleize", (s="") => String(s).split(" ").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" "));
  eleventyConfig.addFilter("sortFeatured", (arr) =>
    (arr||[]).slice().sort((a,b) =>
      (a.data.indexOrder ?? 999) - (b.data.indexOrder ?? 999) ||
      (a.data.title||"").localeCompare(b.data.title||"")
    )
  );

  /* ---------- Passthrough ---------- */
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");

  /* ---------- Collections (kept minimal here) ---------- */
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

  /* ---------- Computed permalinks (unchanged) ---------- */
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

  /* ---------- Engines & dirs ---------- */
  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
