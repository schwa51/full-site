---
title: Tis the Season for Treason
layout: layout.njk
theme: christmas
type: sessions
publish: true
system: paranoia
created: 2025-11-18T21:46
updatedAt: 2025-12-16T06:53
no_heading_border: true
hide_title_block: false
eleventyNavigation:
  key: Paranoia
  parent: Current Games
  order: 1
---
### Links to some basic rules and information:
<a href="/vault/systems/paranoia/general/attributes/">Paranoia Abilities Explained</a>  
<a href="/vault/systems/paranoia/general/skills/">Paranoia Skills Explained</a>  
<a href="/vault/systems/paranoia/general/secretsociety/">Paranoia Secret Societies Explained</a>  
<br>

### Surveys:  
<ul class="list">
  {% for it in collections.SOAPSECsurvey %}
    <li><a href="{{ it.url }}">{{ it.data.title }}</a></li>
  {% endfor %}
</ul>