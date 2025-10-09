---
title: How to Play Mothership
campaign: mothership_oct
type: general
layout: layout.njk
theme: mothership
publish: true
permalink: /mothership/how-to-play/
created: 2025-10-09T07:26
updatedAt: 2025-10-09T14:52
---

<style>
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin: 1.25rem 0 2rem;
}
.rule-card {
  border: 1.5px solid currentColor;
  border-radius: 10px;
  padding: 1rem 1rem 1.125rem;
  background: var(--card-bg, #fff);
  box-shadow: 0 2px 0 rgba(0,0,0,.08);
}
.rule-card h3 {
  margin: 0 0 .5rem;
  font-size: 1.05rem;
  letter-spacing: .02em;
}
.rule-card p, .rule-card ul, .rule-card table {
  margin: .25rem 0 .5rem;
  line-height: 1.35;
}
.rule-card a {
  text-underline-offset: 2px;
}
.rule-card .cta {
  display: inline-block;
  margin-top: .25rem;
  font-size: .95rem;
  font-weight: 600;
}
.range-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .95rem;
}
.range-table th, .range-table td {
  border-top: 1px solid currentColor;
  padding: .35rem .25rem;
  text-align: left;
}
.range-table th {
  font-weight: 700;
}
.section-label {
  margin: 1.75rem 0 .5rem;
  font-weight: 800;
  letter-spacing: .03em;
  text-transform: uppercase;
  font-size: .9rem;
  opacity: .75;
}
.attribution {
  margin-top: 2.5rem;
  font-size: 0.85rem;
  text-align: center;
  opacity: 0.7;
}
.attribution a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* dark/light & print */
@media (prefers-color-scheme: dark) {
  .rule-card { background: rgba(255,255,255,.04); box-shadow: none; }
}
@media print {
  .rules-grid { grid-template-columns: 1fr 1fr; gap: .75rem; }
  .rule-card { page-break-inside: avoid; }
}
</style>

<div class="rules-grid">

  <article class="rule-card">
    <h3>Stat Checks</h3>
    <p>Roll <strong>1d100</strong> less than your <strong>Strength, Speed, Intellect,</strong> or <strong>Combat</strong> to accomplish the task — otherwise fail and gain <strong>1 Stress</strong>.</p>
    <p><em>A roll of <strong>90–99</strong> is always a failure.</em></p>
  </article>

  <article class="rule-card">
    <h3>Saves</h3>
    <p>Roll <strong>1d100</strong> less than your <strong>Sanity, Fear,</strong> or <strong>Body</strong> to avoid danger — otherwise fail and gain <strong>1 Stress</strong>.</p>
    <p><em>A roll of <strong>90–99</strong> is always a failure.</em></p>
  </article>

  <article class="rule-card">
    <h3>Panic Checks</h3>
    <p>When the worst has happened, roll the <strong>Panic Die (1d20)</strong> <em>greater than</em> your current <strong>Stress</strong> to avoid Panicking; otherwise you <strong>Panic</strong>.</p>
    <a class="cta" href="/mothership/tools/panic/">Panic Table →</a>
  </article>

  <article class="rule-card">
    <h3>Skills</h3>
    <p>If a character has a relevant Skill, add its <strong>Skill Bonus</strong> to the Stat <em>before</em> rolling a Stat Check.</p>
    <ul>
      <li><strong>Trained</strong>: +10</li>
      <li><strong>Expert</strong>: +15</li>
      <li><strong>Master</strong>: +20</li>
    </ul>
  </article>

  <article class="rule-card">
    <h3>Advantage and Disadvantage</h3>
    <p><strong>Advantage [+]</strong>: roll twice, take the <strong>best</strong> result.</p>
    <p><strong>Disadvantage [-]</strong>: roll twice, take the <strong>worst</strong> result.</p>
  </article>

  <article class="rule-card">
    <h3>Criticals</h3>
    <p>Rolling <strong>doubles</strong> on 1d100 is special.</p>
    <ul>
      <li><strong>Critical Success</strong>: success with an especially good outcome.</li>
      <li><strong>Critical Failure</strong>: failure with extra consequences — <strong>make a Panic Check</strong>.</li>
    </ul>
  </article>

</div>

<p class="section-label">Violence</p>

<div class="rules-grid">

  <article class="rule-card">
    <h3>Damage and Wounds</h3>
    <p>Reduce <strong>Health</strong> by incoming Damage. If Health hits <strong>0</strong>, gain a <strong>Wound</strong> and roll on the Wounds Table.</p>
    <a class="cta" href="/mothership/tools/wound/">Wounds Table →</a>
  </article>

  <article class="rule-card">
    <h3>Armor and Cover</h3>
    <p>Ignore any Damage less than <strong>AP</strong> of <strong>armor + cover</strong>. If Damage exceeds that value, the armor/cover is <strong>destroyed</strong> and remaining Damage <strong>carries over</strong>.</p>
    <p><em>Damage Reduction</em> reduces all incoming Damage.</p>
    <p>See Armor → pg. 28</p>
  </article>

  <article class="rule-card">
    <h3>Death</h3>
    <p>When Wounds taken equal your <strong>Maximum Wounds</strong>, make a <strong>Death Save</strong>.</p>
    <p>See Death → pg. 29.2</p>
  </article>

  <article class="rule-card">
    <h3>Range Bands</h3>
    <table class="range-table">
      <thead>
        <tr><th>Range</th><th>Description</th><th>Distance</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>Adjacent</strong></td><td>It can touch you.</td><td>&lt; 1 m / 3 ft</td></tr>
        <tr><td><strong>Close</strong></td><td>It can reach you.</td><td>5–10 m / 15–30 ft</td></tr>
        <tr><td><strong>Long</strong></td><td>It can shoot you.</td><td>20–100 m / 50–300 ft</td></tr>
        <tr><td><strong>Extreme</strong></td><td>You can hear them scream.</td><td>&gt; 100 m / 300 ft</td></tr>
      </tbody>
    </table>
  </article>

</div>

<p class="attribution">
  Adapted from the <em>Mothership Player’s Survival Guide</em> published by
  <a href="https://www.tuesdayknightgames.com/pages/mothership-rpg" target="_blank" rel="noopener">Tuesday&nbsp;Knight&nbsp;Games</a>.
</p>
