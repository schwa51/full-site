export const data  = {
  permalink: "/api/ping.json",
  eleventyExcludeFromCollections: true,
};
export function render () => JSON.stringify({ ok: true }, null, 2);
