---
layout: layouts/base.njk
title: “All Campaigns”
---
# All Campaigns
{% for c in collections.campaigns %}
- [{{ c.data.title }}]({{ c.url }})
{% endfor %}
