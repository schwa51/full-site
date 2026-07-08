---
title: Tis the Season for Treason
layout: layout.njk
type: sessions
publish: true
system: paranoia
theme: christmas
created: 2025-11-18T21:46
updatedAt: 2025-12-16T12:53
no_heading_border: true
hide_title_block: false
eleventyNavigation:
  key: paranoia-current-game
  title: Paranoia
  parent: Current Games
  order: 1
---
<p><a href="/vault/systems/paranoia/">← Back to the main Paranoia page</a></p>

### Links to some basic rules and information:
<ul class="list">
  {% for it in collections["paranoialinks"] %}
    <li><a href="{{ it.url }}">{{ it.data.title }}</a></li>
  {% endfor %}
</ul>
<br>

### Surveys:  
<ul class="list">
  {% for it in collections["surveys"] %}
    <li><a href="{{ it.url }}">{{ it.data.title }}</a></li>
  {% endfor %}
</ul>
