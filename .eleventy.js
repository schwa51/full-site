const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

module.exports = function (eleventyConfig) {
  // ✅ Register plugin
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // ✅ Static assets
  eleventyConfig.addPassthroughCopy("assets");

  // ✅ Vault content path
  const campaignPath = "vault/campaigns/Echos Beneath the Mountains";

  const filterPublished = (glob, collection) =>
    collection.getFilteredByGlob(glob).filter(
      (item) => item.data.publish === true
    );

  // ✅ Collections
  eleventyConfig.addCollection("all_npcs", c =>
    c.getFilteredByGlob(`${campaignPath}/npcs/*.md`)
  );
  eleventyConfig.addCollection("public_npcs", c =>
    filterPublished(`${campaignPath}/npcs/*.md`, c)
  );

  eleventyConfig.addCollection("all_characters", c =>
    c.getFilteredByGlob(`${campaignPath}/characters/*.md`)
  );
  eleventyConfig.addCollection("public_characters", c =>
    filterPublished(`${campaignPath}/characters/*.md`, c)
  );

  eleventyConfig.addCollection("all_items", c =>
    c.getFilteredByGlob(`${campaignPath}/items/*.md`)
  );
  eleventyConfig.addCollection("public_items", c =>
    filterPublished(`${campaignPath}/items/*.md`, c)
  );

  eleventyConfig.addCollection("all_locations", c =>
    c.getFilteredByGlob(`${campaignPath}/locations/*.md`)
  );
  eleventyConfig.addCollection("public_locations", c =>
    filterPublished(`${campaignPath}/locations/*.md`, c)
  );

  eleventyConfig.addCollection("all_lore", c =>
    c.getFilteredByGlob(`${campaignPath}/lore/*.md`)
  );
  eleventyConfig.addCollection("public_lore", c =>
    filterPublished(`${campaignPath}/lore/*.md`, c)
  );

  eleventyConfig.addCollection("all_sessions", c =>
    c.getFilteredByGlob(`${campaignPath}/sessions/*.md`)
  );
  eleventyConfig.addCollection("public_sessions", c =>
    filterPublished(`${campaignPath}/sessions/*.md`, c)
  );

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
  };
};

<nav class="sidebar">
  <ul>
    {% for entry in collections.all | eleventyNavigation %}
      <li>
        <a href="{{ entry.url }}">{{ entry.title }}</a>
        {% if entry.children %}
          <ul>
            {% for child in entry.children %}
              <li><a href="{{ child.url }}">{{ child.title }}</a></li>
            {% endfor %}
          </ul>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
</nav>
