---
title: World Lore
layout: layout.njk
theme: tor
---

<ul>
{% for entry in collections.lore %}
  <li><a href="{{ entry.url }}">{{ entry.data.title }}</a></li>
{% endfor %}
</ul>
