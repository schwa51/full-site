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
    if (!d.system) return false;
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
  if (!d.system) return false;
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
eleventyConfig.addCollection("SOAPSECsurvey", collection =>
  collection.getAll().filter(p =>
    p.data.list_groups?.includes("SOAPSEC-survey")
  )
);

eleventyConfig.addFilter("sortAlpha", (arr) => {
  if (!Array.isArray(arr)) return arr;
  return [...arr].sort((a, b) => String(a).localeCompare(String(b)));
});


  // Enhanced bysystem: checks FM system or systemSlug (existing behavior)
  // AND also matches by URL prefix /vault/systems/<slug>/
  eleventyConfig.addFilter("bysystem", (arr, system) => {
    if (!Array.isArray(arr)) return [];
    const targetSlug = safeSlug(system);
    const root = `/vault/systems/${targetSlug}/`;
    return arr.filter(item => {
      const itemsystem = safeSlug(get(item, "data.system") || "");
      const itemsystemSlug = safeSlug(get(item, "data.systemSlug") || "");
      const urlMatch = typeof item.url === "string" && item.url.startsWith(root);
      return itemsystem === targetSlug || itemsystemSlug === targetSlug || urlMatch;
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


  // Nav filtered to a specific system root
  eleventyConfig.addFilter("navForsystem", (navTree, slug) => {
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

  // system content (includes GM content)
  eleventyConfig.addCollection("system_content", (api) =>
    api.getAll().filter((item) => {
      const d = item.data || {};
      if (d.publish === false) return false;
      if (!d.system) return false;
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
      if (data.permalink !== undefined) return data.permalink;

      const inputPath = String(data.page?.inputPath || "").replace(/\\/g, "/");
      if (!inputPath.includes("/vault/systems/")) return undefined;

      if (data.publish === false) return false;
      if (!GM_MODE && data.gm === true) return false;

      const parts = inputPath.split("/");
      const i = parts.indexOf("systems");
      if (i === -1) return undefined;

      const safe = (s) =>
        String(s || "").toLowerCase().trim().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");

      const system     = parts[i + 1] || "";
      const contentType  = parts[i + 2] || "general";
      const filenameSlug = (data.page?.fileSlug || "").split("/").pop() || "index";

      return `/vault/systems/${safe(system)}/${safe(contentType)}/${safe(filenameSlug)}/`;
    }
    
  });

  console.log("Eleventy v3 config complete");

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
// eleventy.config.js

function tokenizeMana(input) {
  if (!input) return [];

  const s = String(input)
    .toLowerCase()
    .trim()
    // allow either "rg" or "r g" or "r,g"
    .replace(/[,|]+/g, " ")
    .replace(/\s+/g, " ");

  // If the user already separated symbols ("r g 2"), keep tokens.
  if (s.includes(" ")) return s.split(" ").filter(Boolean);

  // Otherwise parse compact strings like "2rg10w" into ["2","r","g","10","w"]
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    // multi-digit generic mana like "10"
    if (ch >= "0" && ch <= "9") {
      let j = i + 1;
      while (j < s.length && s[j] >= "0" && s[j] <= "9") j++;
      tokens.push(s.slice(i, j));
      i = j;
      continue;
    }

    // single-letter symbols like w u b r g c s x, etc.
    tokens.push(ch);
    i++;
  }

  return tokens;
}

module.exports = function (eleventyConfig) {
  // ...your existing config...

  eleventyConfig.addShortcode("manaIcons", function (mana, extraClasses = "ms-cost ms-shadow") {
    const tokens = tokenizeMana(mana);

    return tokens
      .map((t) => `<i class="ms ms-${t} ${extraClasses}"></i>`)
      .join("");
  });
};
