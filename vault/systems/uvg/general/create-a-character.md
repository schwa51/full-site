---
title: Create a Character
description: Build a level-1 UVG hero from first concept through final statistics.
layout: layout.njk
type: general
publish: true
theme: uvg
system: uvg
rules_page: true
no_heading_border: true
eleventyNavigation:
  parent: uvg-general
  key: uvg-create-a-character
  title: Create a Character
  order: -20
created: 2026-08-21T19:30
updatedAt: 2026-08-22T16:05
---

<p class="uvg-guide-intro">Follow these steps in order to build a level-1 hero. Following the links will take you to detailed option lists.</p>

<aside class="uvg-guide-note" aria-labelledby="traveler-first">
  <h2 id="traveler-first">Begin with a traveler</h2>
  <p>Before choosing mechanics, decide who your hero is, why they are heading west, and what strange thing they carry. You can invent the answers or use the UVG generators.</p>
  <a class="uvg-action-link" href="/vault/systems/uvg/general/tables/">Generate a UVG traveler</a>
</aside>

<nav aria-label="Character creation stages">
  <ol class="uvg-stage-nav">
    <li><a href="#attributes">1. Attributes</a></li>
    <li><a href="#background-skills">2. Background &amp; skills</a></li>
    <li><a href="#class-abilities">3. Class &amp; abilities</a></li>
    <li><a href="#ready-to-play">4. Ready to play</a></li>
    <li><a href="#identity-goal">5. Identity &amp; goal</a></li>
  </ol>
</nav>

<section class="uvg-guide-stage" id="attributes">
  <header>
    <h2>Attributes</h2>
    <p>Establish your hero's basic physical and mental potential.</p>
  </header>
  <ol class="uvg-steps">
    <li class="uvg-step">
      <h3>Assign six attributes</h3>
      <p>Record Strength, Dexterity, Constitution, Intelligence, Wisdom, and Charisma. Either roll 3d6 for each score in order, or assign <code>14, 12, 11, 10, 9, 7</code> as you wish. If you roll randomly, you may change one score to 14.</p>
    </li>
    <li class="uvg-step">
      <h3>Record attribute modifiers</h3>
      <p>Use the modifier rather than the full score when a rule calls for an attribute.</p>
      <table>
        <thead><tr><th>Score</th><th>3</th><th>4-7</th><th>8-13</th><th>14-17</th><th>18</th></tr></thead>
        <tbody><tr><th>Modifier</th><td>-2</td><td>-1</td><td>+0</td><td>+1</td><td>+2</td></tr></tbody>
      </table>
    </li>
  </ol>
</section>

<section class="uvg-guide-stage" id="background-skills">
  <header>
    <h2>Background and skills</h2>
    <p>Choose what your hero did before joining the road.</p>
  </header>
  <ol class="uvg-steps" style="--step-start: 2">
    <li class="uvg-step">
      <h3>Choose a background</h3>
      <p>Pick the background that best reflects your hero's past. Gain its listed free skill at level-0 and note any personal details that make the background your own.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/backgrounds/">Browse backgrounds</a>
    </li>
    <li class="uvg-step">
      <h3>Pick or roll additional skills</h3>
      <p>Choose two more skills from the background's Learning table, or take its suggested Quick Skills. Entries marked “Any Skill” cannot be chosen directly. If you prefer to roll, continue to the next step.</p>
    </li>
    <li class="uvg-step">
      <h3>Roll on Growth and Learning</h3>
      <p>You may roll up to three times, dividing the rolls between the background's Growth and Learning tables. “+2 Physical” can improve Strength, Dexterity, or Constitution; “+2 Mental” can improve Intelligence, Wisdom, or Charisma. Split the two points between eligible attributes if desired.</p>
      <p>The first time you gain a skill it becomes level-0. The second time it becomes level-1. A novice hero cannot begin with a skill above level-1.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/skills/">Review the skill list</a>
    </li>
  </ol>
</section>

<section class="uvg-guide-stage" id="class-abilities">
  <header>
    <h2>Class and special abilities</h2>
    <p>Choose the capabilities your hero relies on when the road becomes dangerous.</p>
  </header>
  <ol class="uvg-steps" style="--step-start: 5">
    <li class="uvg-step">
      <h3>Choose a class</h3>
      <p>Choose Warrior, Expert, Mage, or Psychic. If no single class fits, choose Adventurer and combine two supported partial classes, including Partial Psychic.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/classes/">Compare classes and partial classes</a>
    </li>
    <li class="uvg-step">
      <h3>Choose your Foci</h3>
      <p>Every hero gains one level of a Focus. Experts and Partial Experts gain an additional non-combat Focus level. Warriors and Partial Warriors gain an additional combat Focus level. These two picks may raise the same eligible Focus to level 2.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/foci/">Browse Foci</a>
    </li>
    <li class="uvg-step">
      <h3>Choose one personal skill</h3>
      <p>Pick one non-psychic skill that reflects an outside interest, natural talent, hobby, or area of expertise.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/skills/">Choose a personal skill</a>
    </li>
    <li class="uvg-step">
      <h3>Complete your supernatural choices</h3>
      <div class="uvg-choice-grid">
        <div class="uvg-choice">
          <strong>Psychic</strong>
          Choose two psychic skills. You may choose the same one twice, raising it to level-1 and gaining a level-1 technique from that discipline.
        </div>
        <div class="uvg-choice">
          <strong>Partial Psychic</strong>
          Choose one psychic discipline at level-0. You are restricted to that discipline and cannot learn or improve other psychic skills.
        </div>
        <div class="uvg-choice">
          <strong>Mage or Partial Mage</strong>
          Choose a magical tradition with the GM and observe its benefits, limits, and requirements.
        </div>
        <div class="uvg-choice">
          <strong>Other classes</strong>
          No additional supernatural selection is required unless another feature says otherwise.
        </div>
      </div>
      <p>Psychics and Partial Psychics have maximum Effort equal to <code>1 + highest psychic skill + better of Wisdom or Constitution modifier</code>, with a minimum of 1.</p>
    </li>
    <li class="uvg-step">
      <h3>Record techniques or starting spells</h3>
      <p>Psychics record the core ability for every discipline they possess and any technique they gained. Mages choose their starting spells with the GM according to their tradition; Partial Mages receive the reduced selection granted by their class.</p>
    </li>
  </ol>
</section>

<section class="uvg-guide-stage" id="ready-to-play">
  <header>
    <h2>Ready to play</h2>
    <p>Finish the numbers used during exploration and combat.</p>
  </header>
  <ol class="uvg-steps" style="--step-start: 11">
    <li class="uvg-step">
      <h3>Roll maximum hit points</h3>
      <p>Roll the hit dice given by your class and add your Constitution modifier, to a minimum of 1 hit point. A first-level Warrior rolls <code>1d6+2</code>; an Expert, Psychic, or most Adventurers roll <code>1d6</code>; a Mage rolls <code>1d6-1</code>. Adventurers with Partial Warrior add 2 hit points.</p>
    </li>
    <li class="uvg-step">
      <h3>Record base attack bonus</h3>
      <p>Use the first-level value for your class or Adventurer pairing.</p>
      <a class="uvg-action-link" href="/vault/systems/uvg/general/classes/">Check class statistics</a>
    </li>
    <li class="uvg-step">
      <h3>Add equipment with the GM during play</h3>
      <p>Leave your equipment package open for now. You and the GM will assemble appropriate starting equipment together during play as the campaign's packages are developed.</p>
    </li>
    <li class="uvg-step">
      <h3>Calculate weapon hit bonuses</h3>
      <p><code>Base attack bonus + Punch, Stab, or Shoot + relevant attribute modifier</code>. If you lack even level-0 in the combat skill, apply a -2 penalty.</p>
    </li>
    <li class="uvg-step">
      <h3>Record weapon damage</h3>
      <p>Add the weapon's relevant attribute modifier to its base damage. Punch weapons also add the wielder's Punch skill.</p>
    </li>
    <li class="uvg-step">
      <h3>Record Armor Class</h3>
      <p>Use the Armor Class granted by your armor and add your Dexterity modifier when applicable. Without armor, your base Armor Class is 10 plus your Dexterity modifier.</p>
    </li>
    <li class="uvg-step">
      <h3>Record saving throws</h3>
      <ul>
        <li><strong>Physical:</strong> 15 minus the better of Strength or Constitution modifier.</li>
        <li><strong>Evasion:</strong> 15 minus the better of Intelligence or Dexterity modifier.</li>
        <li><strong>Mental:</strong> 15 minus the better of Wisdom or Charisma modifier.</li>
        <li><strong>Luck:</strong> 15.</li>
      </ul>
      <p>To succeed, roll equal to or higher than the saving throw score on 1d20.</p>
    </li>
  </ol>
</section>

<section class="uvg-guide-stage" id="identity-goal">
  <header>
    <h2>Identity and goal</h2>
    <p>Give the finished hero a reason to take risks and keep traveling west.</p>
  </header>
  <ol class="uvg-steps" style="--step-start: 18">
    <li class="uvg-step">
      <h3>Choose a name and a goal</h3>
      <p>Name your hero and give them an active goal. Their goal may change, but they should always have a reason to engage with the world, cooperate with the caravan, and dare something consequential.</p>
    </li>
  </ol>
</section>

<aside class="uvg-advancement-link" aria-labelledby="level-up-next">
  <h2 id="level-up-next">Already have a character?</h2>
  <p>Use the advancement rules when your hero earns enough experience to gain a level.</p>
  <a class="uvg-action-link" href="/vault/systems/uvg/general/character-advancement/">Advance a character</a>
</aside>  


All text and pages shamelessly stolen for personal use from <a href="https://www.wizardthieffighter.com">UVG: Ultraviolet Grasslands</a> by Luka Rejec, and the <a href="https://sine-nomine-publishing.myshopify.com">Without Number</a> games by Kevin Crawford so please don't share outside our group!