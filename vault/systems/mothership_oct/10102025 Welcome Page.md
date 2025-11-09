---
title: 10102025 Welcome Page
campaign: mothership_oct
layout: layout.njk
theme: mothership
tags:
  - overview
  - sci-fi
  - horror
publish: true
gm: false
system: mothership
created: 2025-10-04T21:42
updatedAt: 2025-11-09T16:48
isHome: "true"
permalink: /vault/systems/mothership_oct/
eleventyNavigation:
  key: Mothership October Oneshot
  parent: Home
  order: 2
---
<style>
  /* 1) Register the font (adjust the family name if needed) */
  @font-face {
    font-family: "Caramello Free";
    src: url("/assets/fonts/Caramello%20Free.woff2") format("woff2");
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }

  /* 2) Use it on your wordmark (with fallbacks) */
  .wordmark {
    font-family: "Caramello Free", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    line-height: 1;
  }

  .wordmark span { font-size: 4em; }
  .wordmark b { font-size: 50%; font-weight: normal; }
</style>

<p class="wordmark"><span>mother!<b> (ship)</b></span></p>

## Welcome
We're playing Mothership! Here's the [Mission Briefing](/vault/systems/mothership_oct/sessions/mission-briefing/) to bring you up to speed on our scenario for the evening. It contains a little background information and has links to the official Mothership app that allows for easy character creation for those so inclined, but also has a link to some pre-generated characters I'll also have available. (I highly recommend making your own character, even if you do it quickly that night). If you're a [Luddite](https://en.wikipedia.org/wiki/Luddite), I have some bad news, the machines are here to stay, but there are still paper and pencil options! I'm including links to both [a pdf character sheet with a walkthrough on character creation](/assets/pdfs/Mothership_Character_Profile_advanced.pdf) and [a clean character sheet that's easy to use in play](/assets/pdfs/Mothership_Character_Profile_basic.pdf).

## Rules Overview
If you have some free time -- maybe because you landed that cushy government job that pays you not to work, or you're 15, jobless, and homework is a problem for "later", or you've spent too much time on r/WorkReform and have decided that wage labor is over and you're personally ushering in the post capitalist future -- congratulations! Now you can spend a few hours studying up on rolling dice for fun. I've included the official [Player Survival Guide](/assets/pdfs/Player-Survival-Guide-v1.2.pdf), and the longer [Mothership Rulebook](/assets/pdfs/Mothership-Zine-Rulebook-v5.pdf) but don't feel obligated to read it all or any of this really; it's easy to pick up and you can just show up and we'll get along just fine, it's just dice. Here's a [cheat sheet](/assets/pdfs/player-cheat-sheet.pdf) that puts the most important things on one page. I'll have copies printed off as well.

### Final note from the Survival Guide on how to be a great player:
Mothership can be a very challenging game. You should expect:
- **Characters to die.** Play smart. Make the most of your time.
- **Violence to be punishing.** If you’re fighting, you’re losing. Violence is deadly, and should be avoided at all costs.
- **The odds to be stacked against you.** Rolls are punishing in Mothership. Find ways to stack the odds in your favor.
- **To make difficult choices.** Surviving the ordeal, solving the mystery, or saving the day are often mutually exclusive.
- **To pay attention.** Stay focused and plug into the fictional world. It helps you and everyone else get into the spirit of the game and have a more immersive experience.
- **A safe play environment.** This is a horror game, and it can deal with many uncomfortable topics. It’s your responsibility to make sure you’re not making anyone at the table uncomfortable with your words and actions (both in and out of character), and to speak up if you feel uncomfortable or if you notice anyone else might be uncomfortable.

***

{% set campaign = campaignSlug or (campaign | slug) %}
{% set sections = ["locations","sessions","items","npcs","lore","maps","general","characters"] %}

<section class="cards">
  {% for s in sections %}
    {# count only this campaign+section #}
    {% set count = (collections.public_content or [])
      | byCampaign(campaign)
      | where("data.section", s)
      | length %}

    {% if count > 0 %}
      {# build the expected section index URL and check if it exists to avoid 404 #}
      {% set sectionIndexUrl = "/vault/systems/" + campaign + "/" + s + "/" %}
      {% set hasIndex = (collections.all or []) | where("url", sectionIndexUrl) | length > 0 %}

      <article class="card">
        <h3>
          {% if hasIndex %}
            <a href="{{ sectionIndexUrl }}">{{ s | capitalize }}</a>
          {% else %}
            {{ s | capitalize }}
          {% endif %}
        </h3>
      </article>
    {% endif %}
  {% endfor %}
</section>


<p>stem: {{ page.filePathStem }}</p>
<p>campaignSeg: {{ campaignSlug }}</p>
<p>section: {{ section }}</p>
<p>url: {{ page.url }}</p>
