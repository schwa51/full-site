// gm-login.11tydata.js
export default {
  title: "GM Login",
  gm: true,
  layout: null,
  permalink: () => (process.env.GM_MODE ? "/login/" : false),
};

