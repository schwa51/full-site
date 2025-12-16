---
title: Tis the Season for Treason
layout: layout.njk
theme: mothership
type: sessions
publish: true
system: paranoia
created: 2025-11-18T21:46
updatedAt: 2025-12-15T23:08
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
{% set system = systemSlug or (system | slug) %}
{% set section  = "items" %}

{% set items = (collections.public_content or [])
  | where("data.systemSlug", system)
  | where("data.section", section)
  | sortBy("data.title") %}

<ul class="list">
  {% for it in items %}
    {% set isSelfOrIndex = (it.inputPath == currentPath)
                           or (it.url == currentUrl)
                           or (it.url == sectionIndexUrl)
                           or (it.page and it.page.fileSlug == "index") %}
    {% if not isSelfOrIndex %}
      <li><a href="{{ it.url }}">{{ it.data.title }}</a></li>
    {% endif %}
  {% endfor %}
</ul>