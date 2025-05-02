---
title: Notable NPCs
layout: layout.njk
theme: tor
---

<ul>
{% for npc in collections.npcs_public %}
  <li><a href="{{ npc.url }}">{{ npc.data.title }}</a></li>
{% endfor %}
</ul>
