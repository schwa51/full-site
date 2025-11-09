console.log("USING ELEVENTY CONFIG:", import.meta.url);

/* eleventy.config.js */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";

export default function(eleventyConfig) {
  console.log("Eleventy v3 config loading...");

  // ------------------------------
  // Helpers
  // ------------------------------
  const safeSlug = s =>
    String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
  const get = (obj, path) =>
    (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);

  // Shared "public content" predicate (DRY)
  function isPublicContent(item) {
    if (!item) return false;
    const d = item.data || {};
    if (d.publish === false) return false;
    if (!d.campaign) return false;
    if (d.gm === true) return false;

    const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
    if (/\/vault\/systems\/templates\//i.test(stem)) return false;

    // Avoid listing the folder index pages themselves
    if (item.page?.fileSlug === "index") return false;

    return true;
  }

  // ------------------------------
  // Filters (existing + new)
  // ------------------------------
  eleventyConfig.addFilter("slug", v => safeSlug(v));

  eleventyConfig.addFilter("where", (arr, keyPath, value) => {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => get(item, keyPath) === value);
  });
function isPublicForNav(item) {
  if (!item) return false;
  const d = item.data || {};
  if (d.publish === false) return false;
  if (!d.campaign) return false;
  if (d.gm === true) return false;

  const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
  if (/\/vault\/systems\/templates\//i.test(stem)) return false;

  // NOTE: DO NOT exclude fileSlug === "index" for nav
  return true;
}
// String → Array
eleventyConfig.addFilter("split", (str, delim = "/") =>
  String(str ?? "").split(delim)
);

// URL → path segments (no empty items)
eleventyConfig.addFilter("pathSegments", (url) =>
  String(url ?? "").split("/").filter(Boolean)
);

// Get a single segment by index (0-based) or null
eleventyConfig.addFilter("segment", (url, index) => {
  const segs = String(url ?? "").split("/").filter(Boolean);
  return segs[index] ?? null;
});
//adding "jobs"
eleventyConfig.addCollection("jobs", (collectionApi) =>
    collectionApi.getAll().filter(p => p.data?.type === "job" && p.data?.publish !== false)
  );

  // Tiny helper to filter by a frontmatter field
  eleventyConfig.addFilter("byField", (arr, field, value) =>
    (arr || []).filter(it => (it.data?.[field] ?? "") === value)
  );

  // Optional: sort newest first (by file date or custom)
  eleventyConfig.addFilter("byNewest", (arr) =>
    (arr || []).sort((a,b) => (b.date ?? 0) - (a.date ?? 0))
  );
// eleventy.config.js (inside export default function(eleventyConfig) { ... })
function getByPath(obj, path) {
  if (!path) return obj;
  return String(path).split('.').reduce((acc, key) => acc?.[key], obj);
}

eleventyConfig.addFilter("pluck", (arr, path) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => getByPath(item, path)).filter(v => v !== undefined && v !== null && v !== "");
});

eleventyConfig.addFilter("uniq", (arr, path) => {
  if (!Array.isArray(arr)) return arr;
  if (!path) {
    // primitives or already-projected values
    return Array.from(new Set(arr));
  }
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const key = getByPath(item, path);
    const k = typeof key === "object" ? JSON.stringify(key) : String(key);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
});
  eleventyConfig.addFilter("byType", (items, type, opts = { publishedOnly: true }) => {
    if (!Array.isArray(items)) return [];
    return items.filter((p) => {
      const d = p && p.data || {};
      if (opts.publishedOnly && d.publish === false) return false;
      return d.type === type;
    });
  });
eleventyConfig.addFilter("sortAlpha", (arr) => {
  if (!Array.isArray(arr)) return arr;
  return [...arr].sort((a, b) => String(a).localeCompare(String(b)));
});


  // Enhanced byCampaign: checks FM campaign or campaignSlug (existing behavior)
  // AND also matches by URL prefix /vault/systems/<slug>/
  eleventyConfig.addFilter("byCampaign", (arr, campaign) => {
    if (!Array.isArray(arr)) return [];
    const targetSlug = safeSlug(campaign);
    const root = `/vault/systems/${targetSlug}/`;
    return arr.filter(item => {
      const itemCampaign = safeSlug(get(item, "data.campaign") || "");
      const itemCampaignSlug = safeSlug(get(item, "data.campaignSlug") || "");
      const urlMatch = typeof item.url === "string" && item.url.startsWith(root);
      return itemCampaign === targetSlug || itemCampaignSlug === targetSlug || urlMatch;
    });
  });
eleventyConfig.addCollection("nav_content", (api) =>
  api.getAll().filter(isPublicForNav)
);
  eleventyConfig.addFilter("sortBy", (arr, keyPath) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice().sort((a, b) => {
      const aVal = get(a, keyPath);
      const bVal = get(b, keyPath);
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      return String(aVal || "").localeCompare(String(bVal || ""), undefined, {
        numeric: true, sensitivity: "base"
      });
    });
  });

  eleventyConfig.addFilter("capitalize", str =>
    String(str || "").charAt(0).toUpperCase() + String(str || "").slice(1)
  );

  eleventyConfig.addFilter("length", arr =>
    Array.isArray(arr) ? arr.length : 0
  );

  // New small helpers
  eleventyConfig.addFilter("startsWith", (str, prefix) =>
    typeof str === "string" && typeof prefix === "string" ? str.startsWith(prefix) : false
  );
  eleventyConfig.addFilter("titleize", s =>
    String(s || "").replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  );

  // Public-only content filter (mirrors collection)
  eleventyConfig.addFilter("publishOnly", items =>
    (items || []).filter(isPublicContent)
  );

  // Expose the predicate as a filter if needed in templates/macros
  eleventyConfig.addFilter("isPublicItem", isPublicContent);

  // Prune eleventyNavigation to only public pages
 eleventyConfig.addFilter("navPublic", (navTree) =>
  (navTree || []).filter(n => !n.page || isPublicForNav(n.page))
);


  // Nav filtered to a specific campaign root
  eleventyConfig.addFilter("navForCampaign", (navTree, slug) => {
    const root = `/vault/systems/${safeSlug(slug)}/`;
    return (navTree || []).filter(n => n.url && n.url.startsWith(root));
  });

  // Expand only the branch you're inside
  eleventyConfig.addFilter("currentBranch", (node, currentUrl) =>
    node && node.url && typeof currentUrl === "string" ? currentUrl.startsWith(node.url) : false
  );

  console.log("Filters registered");

  // ------------------------------
  // Markdown
  // ------------------------------
  const md = markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] });
  eleventyConfig.setLibrary("md", md);

  // ------------------------------
  // Plugins
  // ------------------------------
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

  // ------------------------------
  // Collections
  // ------------------------------
  eleventyConfig.addCollection("public_content", (api) =>
    api.getAll().filter(isPublicContent)
  );

  // Campaign content (includes GM content)
  eleventyConfig.addCollection("campaign_content", (api) =>
    api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.campaign) return false;
      const stem = String(item.page?.filePathStem || "").replace(/\\/g, "/");
      if (/\/vault\/systems\/templates\//i.test(stem)) return false;
      if (item.page?.fileSlug === "index") return false;
      return true;
    })
  );

  // ------------------------------
  // GM mode controls (unchanged)
  // ------------------------------
  const GM_MODE = !!process.env.GM_MODE;
  eleventyConfig.addGlobalData("GM_MODE", GM_MODE);
  eleventyConfig.addPairedShortcode("gm", (content) => GM_MODE ? content : "");
  eleventyConfig.addFilter("ifGM", (txt) => (GM_MODE ? txt : ""));
  eleventyConfig.addFilter("gmHref", (url) => {
    if (!url) return url;
    if (GM_MODE) return String(url).replace(/^\/vault\//, "/gm/vault/");
    return url;
  });

  // ------------------------------
  // Passthroughs (unchanged)
  // ------------------------------
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("static");
  eleventyConfig.addPassthroughCopy({ "assets/pdfs": "assets/pdfs" });

  // ------------------------------
  // Computed permalink (unchanged)
  // ------------------------------
  eleventyConfig.addGlobalData("eleventyComputed", {
    permalink: (data) => {
      const parsed = parsePath(d);
const campaignSlug = safe(d.campaign || parsed.campaignSeg);

      if (data.permalink !== undefined) return data.permalink;

      const inputPath = String(data.page?.inputPath || "").replace(/\\/g, "/");
      if (!inputPath.includes("/vault/systems/")) return undefined;

      if (data.publish === false) return false;
      if (!GM_MODE && data.gm === true) return false;

      const parts = inputPath.split("/");
      const i = parts.indexOf("campaigns");
      if (i === -1) return undefined;

      const safe = (s) =>
        String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");

      const campaign     = parts[i + 1] || "";
      const contentType  = parts[i + 2] || "general";
      const filenameSlug = (data.page?.fileSlug || "").split("/").pop() || "index";

      return `/vault/systems/${safe(campaign)}/${safe(contentType)}/${safe(filenameSlug)}/`;
    }
  });

  console.log("Eleventy v3 config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
