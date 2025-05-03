---
title: Session Summaries
layout: layout.njk
theme: tor
---

<ul>
{% for entry in collections.sessions %}
  <li><a href="{{ entry.url }}">{{ entry.data.title }}</a></li>
{% endfor %}
</ul>
