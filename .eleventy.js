/* .eleventy.js (ESM, minimal CJS→ESM port) */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function (eleventyConfig) {
  /* ---------- Markdown: enable heading classes ---------- */
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, {
      allowedAttributes: ["id", "class", /^data-.*$/]
    });

  // Works on Eleventy v1 and v2
  if (eleventyConfig.amendLibrary) {
    eleventyConfig.amendLibrary("md", (lib) => lib.use(markdownItAttrs));
  }
  eleventyConfig.setLibrary("md", md);

  /* ---------- Slug helpers (global) ---------- */
  const safeSlug = s => String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/(^-|-$)/g, "");

  function inferSection(data) {
    if (data.type) return safeSlug(data.type);
    const stem = String(data.page?.filePathStem || "");
    const m = stem.match(/\/vault\/campaigns\/[^/]+\/([^/]+)/i);
    return m ? safeSlug(m[1]) : "general";
  }

  /* ---------- Filters / globals ---------- */
  eleventyConfig.addFilter("slug", v => safeSlug(v));

  // --- tiny utils ---
  const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const norm = s => String(s||"").toLowerCase().trim();

  // where: keep items whose keyPath === value
  const whereFilter = (arr, keyPath, value) => {
    return (arr || []).filter(item => get(item, keyPath) === value);
  };
  eleventyConfig.addFilter("where", whereFilter);

  // uniqueBy: de-dup by a key path (e.g., "inputPath")
  eleventyConfig.addFilter("uniqueBy", (arr, keyPath = "inputPath") => {
    const seen = new Set();
    return (arr || []).filter(item => {
      const k = get(item, keyPath);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

  // sortBy: stable, locale-aware sort by key path
  eleventyConfig.addFilter("sortBy", (arr, keyPath) => {
    return (arr || []).slice().sort((a, b) => {
      const av = get(a, keyPath), bv = get(b, keyPath);
      return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true, sensitivity: "base" });
    });
  });

  // byCampaign: convenience filter for your collections
  eleventyConfig.addFilter("byCampaign", (arr, campaign) => {
    const want = safeSlug(campaign);
    return (arr || []).filter(it => {
      const fromData = safeSlug(get(it, "data.campaign") || "");
      const fromComputed = safeSlug(get(it, "data.campaignSlug") || "");
      return fromData === want || fromComputed === want;
    });
  });

  // Join two arrays (A ⨁ B)
  eleventyConfig.addFilter("concat", (a, b) => ([...(a || []), ...(b || [])]));

  // Collect arrays from multiple collection keys
  eleventyConfig.addFilter("collect", (keys, collections) =>
    (keys || []).flatMap(k => collections?.[k] || [])
  );

  // Handy access if you want to use safeSlug in Nunjucks via global
  eleventyConfig.addGlobalData("helpers", { safeSlug });

  /* ---------- Plugins ---------- */
  eleventyConfig.addPlugin(eleventyNavigationPlugin);
  eleventyConfig.addPlugin(interlinker, {
    defaultLayout: "layouts/embed.liquid",
    preProcessExtensions:  ["md","njk","html"],
    postProcessExtensions: ["html","njk"],
    removeTargetExtension: true,
    slugifyName: name =>
      name.toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, ""),
    layoutKey: "embedLayout",
    deadLinkReport: "console",
  });

  /* ---------- Layouts ---------- */
  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");

  /* ---------- Filters (global) ---------- */
  eleventyConfig.addFilter("safeTitle", e => e?.data?.title || e?.fileSlug || "");
  eleventyConfig.addFilter("byCampaign", (arr, camp) => {
    if (!arr || !camp) return arr || [];
    return arr.filter(e => e?.data?.campaign === camp);
  });
  eleventyConfig.addFilter("bySession", (arr, sess) => {
    if (!arr || !sess) return [];
    const has = (v, s) =>
      (typeof v === "string" && v === s) ||
      (Array.isArray(v) && v.includes(s));
    return arr.filter(e => has(e?.data?.session, sess));
  });
  eleventyConfig.addFilter("map", (arr, prop) => Array.isArray(arr) ? arr.map(x => x?.[prop]) : []);
  eleventyConfig.addFilter("keys", obj => Object.keys(obj || {}));
  eleventyConfig.addFilter("hasContent", (collections, key) => Array.isArray(collections[key]) && collections[key].length > 0);
  eleventyConfig.addFilter("typeTitle", (type) => {
    const map = {
      npcs: "NPCs", items: "Items", sessions: "Sessions", locations: "Locations",
      lore: "Lore", maps: "Maps", general: "General Information", characters: "Player Characters",
    };
    return map[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : "");
  });

  /* ---------- Static assets ---------- */
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static"); // copies /static to site root

  /* ---------- Predicates ---------- */
  const typeIs = (e, ...tys) => (e.data?.type || "").toLowerCase() && tys.includes((e.data?.type || "").toLowerCase());
  const isPublic = (e) => (e.data?.gm === true) ? false : (e.data?.publish !== false);
  const isGM     = (e) => (e.data?.gm === true) || (e.data?.publish === false);

  /* ---------- Computed Data: Auto-generate permalinks based on publish status ---------- */
  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      // Skip if permalink is already explicitly set
      if (data.permalink !== undefined) {
        return data.permalink;
      }

      // Only auto-generate for campaign content files
      if (!data.page.inputPath.includes('/vault/campaigns/')) {
        return undefined; // Use default behavior
      }

      // Don't generate pages for unpublished content
      if (data.publish === false) {
        return false;
      }

      // (note: leaving your original structure untouched)

      // Generate permalink based on GM/public status and file structure
      const pathParts = data.page.inputPath.split('/');
      const campaignIndex = pathParts.indexOf('campaigns');
      if (campaignIndex === -1) return undefined;

      const campaign = pathParts[campaignIndex + 1];
      const contentType = pathParts[campaignIndex + 2]; // npcs, items, etc.
      const filename = pathParts[pathParts.length - 1].replace('.md', '');

      // Determine if this should be GM-only or public
      const isGMContent = data.gm === true || data.publish === false;
      const prefix = isGMContent ? '/gm' : '';

      // Create clean URL structure
      const campaignSlug = campaign.toLowerCase().replace(/[^\w]+/g, '-');
      return `${prefix}/${campaignSlug}/${contentType}/${filename}/`;
    }
  });

  // All campaign content (md + njk) that is publishable
  eleventyConfig.addCollection("campaign_content", (api) => {
    return api.getAll().filter((item) => {
      const data = item.data || {};
      if (data.publish === false) return false; // drafts/templates excluded elsewhere
      if (!data.campaign) return false;        // must belong to a campaign
      // exclude templates folder if present
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false; // ← exclude index pages globally
      return true;
    });
  });

  // Tag test + filter
  eleventyConfig.addFilter("hasTag", (item, tag) => {
    const tags = item?.data?.tags;
    return Array.isArray(tags) && tags.map(norm).includes(norm(tag));
  });
  eleventyConfig.addFilter("byTag", (arr, tag) =>
    (arr||[]).filter(i => (i?.data?.tags||[]).map(norm).includes(norm(tag)))
  );

  // Return the first n items of an array (like Eleventy docs examples)
  eleventyConfig.addFilter("head", (arr, n) => {
    if (!Array.isArray(arr)) return [];
    if (!n || n <= 0) return [];
    return arr.slice(0, n);
  });

  // (optional but nice) Titleize fallback used in the featured campaigns snippet
  eleventyConfig.addFilter("titleize", (s = "") =>
    String(s).split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );

  // Sort helper: indexOrder, then title
  eleventyConfig.addFilter("sortFeatured", (arr) =>
    (arr||[]).slice().sort((a,b) =>
      (a.data.indexOrder ?? 999) - (b.data.indexOrder ?? 999) ||
      (a.data.title||"").localeCompare(b.data.title||"")
    )
  );

  // Public-only subset (hide GM in public indexes)
  eleventyConfig.addCollection("public_content", (api) => {
    return api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.campaign) return false;
      if (d.gm === true) return false; // exclude GM
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/campaigns\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false; // ← exclude index pages globally
      return true;
    });
  });

  /* ---------- ESM fix: re-attach critical filters on the FINAL NJK env ---------- */
  eleventyConfig.amendLibrary?.("njk", (env) => {
    if (!env.filters.where)  env.addFilter("where", whereFilter);
    if (!env.filters.byTag)  env.addFilter("byTag", (arr, tag) =>
      (arr||[]).filter(i => (i?.data?.tags||[]).map(norm).includes(norm(tag)))
    );
    // Optional: print once to confirm on Netlify
    console.log("Final NJK filters:", Object.keys(env.filters).sort().join(", "));
  });

  /* ---------- Dirs & engines ---------- */
  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
