/* .eleventy.js */
export default function(eleventyConfig) {
  console.log("MINIMAL CONFIG LOADED - THIS SHOULD APPEAR IN LOGS");
  
  eleventyConfig.addFilter("where", (arr, keyPath, value) => {
    return (Array.isArray(arr) ? arr : []).filter(item => {
      const val = keyPath.split(".").reduce((o, p) => o?.[p], item);
      return val === value;
    });
  });

  return {
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: { input: ".", includes: "_includes", output: "_site" }
  };
}
