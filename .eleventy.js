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
    return arr.filter(item => get(item, keyPath) === value);
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
  eleventyConfig.ad
