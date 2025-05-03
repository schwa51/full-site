---
title: Notable NPCs
layout: layout.njk
theme: tor
---

<div class="callout">
  <strong>Browse the known figures</strong> encountered during your travels.
</div>

<ul>
{% for npc in collections.npcs_public %}
  <li><a href="{{ npc.url }}">{{ npc.data.title }}</a></li>
{% endfor %}
</ul>
