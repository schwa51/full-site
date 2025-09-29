// /api/netlify-headers.11ty.js  → outputs _site/_headers
export const data  = { permalink: "/_headers", eleventyExcludeFromCollections: true };

export function render ({ collections }) {
  const latestMs = (collections.all || []).reduce((acc, d) => {
    const t = +new Date(d.data?.updatedAt || d.date || Date.now());
    return t > acc ? t : acc;
  }, 0);
  const version = new Date(latestMs || Date.now()).toISOString();

  return `
/api/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-None-Match, If-Modified-Since
  Cache-Control: public, max-age=60
  x-content-version: ${version}
`;
};
