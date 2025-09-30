/* .eleventy.js (EMS, single export) */
import eleventyNavigationPlugin from "@11ty/eleventy-navigation";
import interlinker from "@photogabble/eleventy-plugin-interlinker";
import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import Image from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  eleventyConfig.addNunjucksAsyncShortcode("img", async function(src, alt="", className="", sizes="(min-width: 800px) 800px, 100vw") {
    const metadata = await Image(src, {
      widths: [320, 640, 960, 1280],
      formats: ["webp","jpeg"],
      urlPath: "/img/opt/",
      outputDir: "./_site/img/opt/",
      cacheOptions: { duration:"1y", directory: ".cache/eleventy-img" },
    });
    const attrs = { alt, sizes, loading:"lazy", decoding:"async", class: className };
    return Image.generateHTML(metadata, attrs);
  });
  eleventyConfig.ignores.add("**/.obsidian/**");
eleventyConfig.ignores.add("**/.history/**");
eleventyConfig.ignores.add("**/.trash/**");
  /* ---------- Markdown: enable heading classes ---------- */
eleventyConfig.setLibrary(
  "md",
  markdownIt({ html: true, linkify: true })
    .use(markdownItAttrs, { allowedAttributes: ["id", "class", /^data-.*$/] })
);
/* ---------- Slug helpers (global) ---------- */
const safeSlug = s => String(s || "")
  .toLowerCase()
  .trim()
  .replace(/[^\w]+/g, "-")
  .replace(/(^-|-$)/g, "");

function inferSection(data) {
  // Prefer explicit "type" in front matter (e.g., 'items', 'locations', 'npcs', 'lore', 'sessions', 'maps', 'general')
  if (data.type) return safeSlug(data.type);
  // Fallback: derive from the file path under vault/campaigns/<campaign>/<section>/...
  const stem = String(data.page?.filePathStem || "");
  const m = stem.match(/\/vault\/campaigns\/[^/]+\/([^/]+)/i);
  return m ? safeSlug(m[1]) : "general";
}
/* ---------- Filters / globals ---------- */
eleventyConfig.addFilter("slug", v => safeSlug(v));
// --- tiny utils ---
const get = (obj, path) => (path || "").split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
// where: keep items whose keyPath === value
eleventyConfig.addFilter("where", (arr, keyPath, value) => {
  return (arr || []).filter(item => get(item, keyPath) === value);
});

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
// Join two arrays (A ⨁ B)
eleventyConfig.addFilter("concat", (a, b) => ([...(a || []), ...(b || [])]));

// Collect arrays from multiple collection keys:  ["key1","key2"] -> collections[key1] + collections[key2]
eleventyConfig.addFilter("collect", (keys, collections) =>
  (keys || []).flatMap(k => collections?.[k] || [])
);
console.log(">> filters registered");

// Handy access if you want to use safeSlug in Nunjucks via global
eleventyConfig.addGlobalData("helpers", { safeSlug });

// --- Filters used by rails.njk (register EARLY, before plugins) ---
const norm = s => String(s || "").toLowerCase().trim();

const byTagFilter = (arr, tag) =>
  (arr || []).filter(i => (i?.data?.tags || []).map(norm).includes(norm(tag)));

const whereDataFilter = (arr, key, val) =>
  (arr || []).filter(i => i?.data?.[key] === val);

// Universal (all engines)
eleventyConfig.addFilter("byTag", byTagFilter);
eleventyConfig.addFilter("whereData", whereDataFilter);

// Explicit Nunjucks (belt + suspenders)
eleventyConfig.addNunjucksFilter("byTag", byTagFilter);
eleventyConfig.addNunjucksFilter("whereData", whereDataFilter);

// Optional aliases (guard against case variations in templates)
eleventyConfig.addNunjucksFilter("bytag", byTagFilter);
eleventyConfig.addFilter("bytag", byTagFilter);

console.log("✅ byTag registered");



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
// --- Ensure filters exist in the FINAL Nunjucks environment (after plugins) ---
eleventyConfig.amendLibrary("njk", (env) => {
  try {
    if (!env.filters.byTag)      env.addFilter("byTag", byTagFilter);
    if (!env.filters.bytag)      env.addFilter("bytag", byTagFilter); // case-insensitive safety
    if (!env.filters.whereData)  env.addFilter("whereData", whereDataFilter);

    // Uncomment to inspect locally:
    // console.log("NJK filters now:", Object.keys(env.filters).sort());
  } catch (e) {
    console.error("Failed to amend NJK env:", e);
  }
});

  /* ---------- Layouts ---------- */
  eleventyConfig.addLayoutAlias("session", "layouts/session.njk");

  /* ---------- Filters (global) ---------- */
  eleventyConfig.addFilter("safeTitle", e => e?.data?.title || e?.fileSlug || "");
  eleventyConfig.addFilter("byCampaign", (arr, camp) => {
    if (!arr || !camp) return arr || [];
    return arr.filter(e => e?.data?.campaign === camp);
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
// Move the bySession filter OUTSIDE the computed data section:
eleventyConfig.addFilter("bySession", (arr, sessionId) => {
  const norm = v => String(v || "").toLowerCase().trim();
  const want = norm(sessionId);
  return (arr || []).filter(it => {
    const d = it.data || {};
    const one = d.session != null ? [d.session] : [];
    const many = Array.isArray(d.sessions) ? d.sessions : [];
    const all = [...one, ...many].map(norm).filter(Boolean);
    return all.includes(want);
  });
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

  /* ---------- Universal collections (REMOVED - using campaign-specific only) ---------- */
  // Removed to eliminate duplicates - use campaign-specific collections instead

  /* ---------- Per-campaign globs ---------- */
 // const campaigns = {
 //   echoes:      "vault/campaigns/Echoes Beneath the Mountains",
  //  mothership:  "vault/campaigns/Mothership campaign",
 //   pirateborg:  "vault/campaigns/Pirate Borg campaign",
 //   wildsea:     "vault/campaigns/The Wildsea campaign",
 //   timewatch:   "vault/campaigns/Timewatch campaign",
 //   mythic:      "vault/campaigns/Mythic Bastionland campaign",
 //   dolmenwood:  "vault/campaigns/Dolmenwood",
 //   tencandles:  "vault/campaigns/Ten Candles",
 //   shadowdark:  "vault/campaigns/Shadowdark",
 //   brindlewood: "vault/campaigns/Brindlewood Bay"
 // };

 // Object.entries(campaigns).forEach(([slug, p]) => {
    // All content (for GM pages)
 //   eleventyConfig.addCollection(`${slug}_all_general`,       c => c.getFilteredByGlob(`${p}/general/*.md`));
   // eleventyConfig.addCollection(`${slug}_all_npcs`,          c => c.getFilteredByGlob(`${p}/npcs/*.md`));
  //  eleventyConfig.addCollection(`${slug}_all_items`,         c => c.getFilteredByGlob(`${p}/items/*.md`));
 //   eleventyConfig.addCollection(`${slug}_all_characters`,    c => c.getFilteredByGlob(`${p}/characters/*.md`));
 //   eleventyConfig.addCollection(`${slug}_all_locations`,     c => c.getFilteredByGlob(`${p}/locations/*.md`));
 //   eleventyConfig.addCollection(`${slug}_all_lore`,          c => c.getFilteredByGlob(`${p}/lore/*.md`));
 //   eleventyConfig.addCollection(`${slug}_all_maps`,          c => c.getFilteredByGlob(`${p}/maps/*.md`));
 //   eleventyConfig.addCollection(`${slug}_all_sessions`,      c => c.getFilteredByGlob(`${p}/sessions/*.md`));
    
    // Public content only (for player-visible pages)
 //   eleventyConfig.addCollection(`${slug}_public_general`,    c => c.getFilteredByGlob(`${p}/general/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_npcs`,       c => c.getFilteredByGlob(`${p}/npcs/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_items`,      c => c.getFilteredByGlob(`${p}/items/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_characters`, c => c.getFilteredByGlob(`${p}/characters/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_locations`,  c => c.getFilteredByGlob(`${p}/locations/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_lore`,       c => c.getFilteredByGlob(`${p}/lore/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_maps`,       c => c.getFilteredByGlob(`${p}/maps/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 //   eleventyConfig.addCollection(`${slug}_public_sessions`,   c => c.getFilteredByGlob(`${p}/sessions/*.md`).filter(i => i.data.publish !== false && i.data.gm !== true));
 // });

  /* ---------- Halloween game collection ---------- */
 // eleventyConfig.addCollection("halloween_game", api =>
 //   api.getAll()
 //     .filter(p => p.data.publish && (p.data.tags || []).includes("halloween_game"))
 //     .sort((a,b) => (a.data.order || 999) - (b.data.order || 999))
 // );

  /* ---------- Dirs & engines ---------- */
  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
};