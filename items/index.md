---
title: Legendary Items
layout: layout.njk
theme: tor
---

<ul>
{% for entry in collections.items %}
  <li><a href="{{ entry.url }}">{{ entry.data.title }}</a></li>
{% endfor %}
</ul>
