---
title: MCS Stella d'Argento - Ship Manifest
layout: layout.njk
theme: mothership
publish: true
campaign: mothership_oct
permalink: /stella-dargento/
created: 2025-10-04T22:51
updatedAt: 2025-10-05T16:42
---

## MCS {{ stelladargento.shipIdentifier }}
**Ship Manifest - CLASSIFIED**

---

## Technical Specifications

| **Designation** | **Details** |
|-----------------|-------------|
| **Manufacturer** | {{ stelladargento.make }} |
| **Model** | {{ stelladargento.model }} |
| **Class** | {{ stelladargento.classString }} {{ stelladargento.typeString }} |
| **Jump Drive** | Class {{ stelladargento.jump }} FTL |
| **Transponder** | {% if stelladargento.transponderOn %}Active{% else %}Inactive{% endif %} |

---

## Operational Capacity

| **System** | **Rating** |
|------------|------------|
| **Crew Capacity** | {{ stelladargento.crewCapacity }} personnel |
| **Life Support** | {{ stelladargento.cryoPods }} cryogenic pods |
| **Emergency Systems** | {{ stelladargento.escapePods }} escape pod{{ "s" if stelladargento.escapePods != 1 }} |
| **Fuel Status** | {{ stelladargento.fuelCurrent }}/{{ stelladargento.fuelMax }} units |

---

## Ship Systems

| **Component** | **Status** |
|---------------|------------|
| **Thrusters** | {{ stelladargento.thrusters }}% efficiency |
| **Battle Systems** | {{ stelladargento.battle }}% operational |
| **Ship Systems** | {{ stelladargento.systems }}% functional |
| **Weapons** | {% if stelladargento.weaponsBase > 0 %}{{ stelladargento.weaponsBase }} hardpoint{{ "s" if stelladargento.weaponsBase != 1 }}{% else %}Unarmed civilian vessel{% endif %} |

---

## Ship Layout

{% for id, room in stelladargento.rooms %}
### {{ room.title or "Deck " + room.index }}
{% if room.notes %}
{{ room.notes }}
{% endif %}

**Systems:** {% for icon in room.icons %}{{ icon | title }}{% if not loop.last %}, {% endif %}{% endfor %}

{% endfor %}

---

## Special Equipment

{% for id, upgrade in stelladargento.upgrades %}
### {{ upgrade.title }}
{% if upgrade.description %}
{{ upgrade.description }}
{% endif %}
{% endfor %}

---

**Navigation Status:** Ready for departure  
**Mission Clearance:** Authorized for Ypsilon 14 operations  

[[10102025 Mission Briefing|← Back to Mission Briefing]]
