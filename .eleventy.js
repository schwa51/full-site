/* .eleventy.mjs (or .eleventy.js with "type":"module") */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function(eleventyConfig) {
  console.log("[11ty] .eleventy config starting");

  // Helpers
  const safeSlug = s => String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const norm = s => String(s||"").toLowerCase().trim();

  // Filter functions
  const whereFilter = (arr, keyPath, value) =>
    (Array.isArray(arr) ? arr : []).filter(item => get(item, keyPath) === value);

  const byTagFilter = (arr, tag) =>
    (arr||[]).filter(i => (i?.data?.tags||[]).map(norm).includes(norm(tag)));

  // *** CRITICAL: Register Nunjucks filters FIRST, before plugins ***
  eleventyConfig.addNunjucksFilter("where", whereFilter);
  eleventyConfig.addNunjucksFilter("byTag", byTagFilter);
  eleventyConfig.addNunjucksFilter("slug", v => safeSlug(v));
  
  // Universal filters (backup registration)
  eleventyConfig.addFilter("where", whereFilter);
  eleventyConfig.addFilter("byTag", byTagFilter);
  eleventyConfig.addFilter("slug", v => safeSlug(v));

  console.log("[11ty] Filters registered before plugins");

  // Markdown
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] });
  eleventyConfig.setLibrary("md", md);

  // Other filters (register these too explicitly for Nunjucks)
  const filterDefinitions = [
    ["uniqueBy", (arr, keyPath = "inputPath") => {
      const seen = new Set();
      return (arr || []).filter(item => {
        const k = get(item, keyPath);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }],
    ["sortBy", (arr, keyPath) =>
      (arr || []).slice().sort((a, b) => {
        const av = get(a, keyPath), bv = get(b, keyPath);
        return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
      })
    ],
    ["concat", (a, b) => ([...(a || []), ...(b || [])])],
    ["collect", (keys, collections) =>
      (keys || []).flatMap(k => collections?.[k] || [])
    ],
    ["safeTitle", e => e?.data?.title || e?.fileSlug || ""],
    ["byCampaign", (arr, camp) => (arr || []).filter(e => e?.data?.campaign === camp)],
    ["map", (arr, prop) => Array.isArray(arr) ? arr.map(x => x?.[prop]) : []],
    ["keys", obj => Object.keys(obj || {})],
    ["hasContent", (collections, key) => Array.isArray(collections[key]) && collections[key].length > 0],
    ["typeTitle", (type) => {
      const map = { npcs:"NPCs", items:"Items", sessions:"Sessions", locations:"Locations", lore:"Lore", maps:"Maps", general:"General Information", characters:"Player Characters" };
      return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
    }],
    ["head", (arr, n) => Array.isArray(arr) && n > 0 ? arr.slice(0, n) : []],
    ["titleize", (s = "") => String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")],
    ["sortFeatured", (arr) =>
      (arr||[]).slice().sort((a,b) =>
        (a.data.indexOrder ?? 999) - (b.data.indexOrder ?? 999) ||
        (a.data.title||"").localeCompare(b.data.title||"")
      )
    ],
    ["hasTag", (item, tag) => {
      const tags = item?.data?.tags;
      return Array.isArray(tags) && tags.map(norm).includes(norm(tag));
    }]
  ];

  // Register each filter explicitly for both Nunjucks and universal
  filterDefinitions.forEach(([name, fn]) => {
    eleventyConfig.addNunjucksFilter(name, fn);
    eleventyConfig.addFilter(name, fn);
  });

  console.log("[11ty] All filters registered, loading plugins...");

  // Plugins (loaded AFTER filter registration)
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

  // Safety net - this should NOT be needed if explicit registration above works
  eleventyConfig.amendLibrary("njk", (env) => {
    console.log("[11ty] amendLibrary called - current filters:", Object.keys(env.filters).filter(f => ['where', 'byTag', 'slug'].includes(f)));
    
    if (!env.filters.where) {
      console.log("[11ty] WARNING: Adding missing 'where' filter in amendLibrary");
      env.addFilter("where", whereFilter);
    }
    if (!env.filters.byTag) {
      console.log("[11ty] WARNING: Adding missing 'byTag' filter in amendLibrary");
      env.addFilter("byTag", byTagFilter);
    }
  });

  // Rest of config...
  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");

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
