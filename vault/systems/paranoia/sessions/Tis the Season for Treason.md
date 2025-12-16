---
title: Tis the Season for Treason
layout: layout.njk
type: sessions
publish: true
system: paranoia
created: 2025-11-18T21:46
updatedAt: 2025-12-16T12:53
no_heading_border: true
hide_title_block: false
eleventyNavigation:
  key: Paranoia
  parent: Current Games
  order: 1
---
<style>
  h1,h2,h3{
     color: var(--color-accent, #FFB41FFF);
     text-align: left
  }
  body{
  --color-bg:       #1A5D11; 
  --color-text:     #fef7b8ff; 
  --color-accent:   #FFB41FFF;  
  --color-link:     #fef7b8ff; 
  }
  body{
      text-align: left;
  }
  .list{
      text-align: left;
      margin: 0;
      padding: 0;
      padding-left: 0.5rem
  }
  </style>
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