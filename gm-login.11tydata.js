// gm-login.11tydata.js
module.exports = {
  title: "GM Login",
  gm: true,
  layout: null,
  // Only emit in GM build
  permalink: () => (process.env.GM_MODE ? "/login/" : false),
};
