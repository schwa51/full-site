exports.data = {
  permalink: "/api/ping.json",
  eleventyExcludeFromCollections: true,
};
exports.render = () => JSON.stringify({ ok: true }, null, 2);
