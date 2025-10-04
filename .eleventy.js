/* .eleventy.mjs (or .eleventy.js with "type":"module") */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function(eleventyConfig) {
  console.log("[11ty] .eleventy config starting");

  // Markdown
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] });
  eleventyConfig.setLibrary("md", md);

  // Helpers
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const norm = s => String(s||"").toLowerCase().trim();

  // Filters (same behavior as your CJS)
  const whereFilter = (arr, keyPath, value) =>
    (Array.isArray(arr) ? arr : []).filter(item => get(item, keyPath) === value);

  const byTagFilter = (arr, tag) =>
    (arr||[]).filter(i => (i?.data?.tags||[]).map(norm).includes(norm(tag)));

  eleventyConfig.addFilter("slug", v => safeSlug(v));
  eleventyConfig.addFilter("where", whereFilter);
  eleventyConfig.addFilter("byTag", byTagFilter);

  eleventyConfig.addFilter("uniqueBy", (arr, keyPath = "inputPath") => {
    const seen = new Set();
    return (arr || []).filter(item => {
      const k = get(item, keyPath);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

  eleventyConfig.addFilter("sortBy", (arr, keyPath) =>
    (arr || []).slice().sort((a, b) => {
      const av = get(a, keyPath), bv = get(b, keyPath);
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
    })
  );

  eleventyConfig.addFilter("concat", (a, b) => ([...(a || []), ...(b || [])]));
  eleventyConfig.addFilter("collect", (keys, collections) =>
    (keys || []).flatMap(k => collections?.[k] || [])
  );

  eleventyConfig.addFilter("safeTitle", e => e?.data?.title || e?.fileSlug || "");
  eleventyConfig.addFilter("byCampaign", (arr, camp) => (arr || []).filter(e => e?.data?.campaign === camp));
  eleventyConfig.addFilter("map", (arr, prop) => Array.isArray(arr) ? arr.map(x => x?.[prop]) : []);
  eleventyConfig.addFilter("keys", obj => Object.keys(obj || {}));
  eleventyConfig.addFilter("hasContent", (collections, key) => Array.isArray(collections[key]) && collections[key].length > 0);
  eleventyConfig.addFilter("typeTitle", (type) => {
    const map = { npcs:"NPCs", items:"Items", sessions:"Sessions", locations:"Locations", lore:"Lore", maps:"Maps", general:"General Information", characters:"Player Characters" };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
  });
  eleventyConfig.addFilter("head", (arr, n) => Array.isArray(arr) && n > 0 ? arr.slice(0, n) : []);
  eleventyConfig.addFilter("titleize", (s = "") => String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
  eleventyConfig.addFilter("sortFeatured", (arr) =>
    (arr||[]).slice().sort((a,b) =>
      (a.data.indexOrder ?? 999) - (b.data.indexOrder ?? 999) ||
      (a.data.title||"").localeCompare(b.data.title||"")
    )
  );
  eleventyConfig.addFilter("hasTag", (item, tag) => {
    const tags = item?.data?.tags;
    return Array.isArray(tags) && tags.map(norm).includes(norm(tag));
  });

  // Plugins
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.liquid",
    // avoid touching njk so the Nunjucks env doesn’t get reset without your filters
    preProcessExtensions: ["md","html"],
    postProcessExtensions: ["html"],
    removeTargetExtension: true,
    slugifyName: name => safeSlug(name),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  // Make filters stick even if a plugin swapped the env
  eleventyConfig.amendLibrary("njk", (env) => {
    if (!env.filters.where) env.addFilter("where", whereFilter);
    if (!env.filters.byTag) env.addFilter("byTag", byTagFilter);
    console.log("[11ty] Nunjucks filters now:", Object.keys(env.filters).sort().join(", "));
  });

  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");

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
