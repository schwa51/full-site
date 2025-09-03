exports.data = { permalink: "/api/last_modified.llty.js", eleventyExcludeFromCollections: true };
exports.render = ({ collections }) => {
  const latestMs = (collections.all || []).reduce((acc, d) => {
    const t = +new Date(d.data?.updatedAt || d.date || Date.now());
    return t > acc ? t : acc;
  }, 0);
  return JSON.stringify({ updatedAt: new Date(latestMs || Date.now()).toISOString() }, null, 2);
};
