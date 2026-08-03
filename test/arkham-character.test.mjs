import test from "node:test";
import assert from "node:assert/strict";

import { ARCHETYPES, ARKHAM_SKILLS, KNACKS } from "../assets/js/arkham-character-data.js";
import {
  MULTICLASS_COST,
  MULTICLASS_MINIMUM_XP,
  applyMulticlass,
  archetypeCaps,
  availableKnacks,
  combinedArchetypeCaps,
  createCharacter,
  knackSlotCounts,
  multiclassEligibility,
  normalizeCharacter,
  skillWarnings,
  suggestedSkills,
} from "../assets/js/arkham-character.js";

test("every archetype knack has a playable reference description", () => {
  for (const archetype of Object.values(ARCHETYPES)) {
    for (const tier of [1, 2, 3, 4]) {
      assert.ok(archetype.knacks[tier].length > 0, `${archetype.name} tier ${tier}`);
      for (const name of archetype.knacks[tier]) {
        assert.ok(KNACKS[name]?.length > 20, `${archetype.name}: ${name}`);
      }
    }
  }
});

test("standard archetypes receive three 3+ caps, one 2+ cap, and legal suggested starting values", () => {
  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    if (id === "dreamer") continue;
    const caps = archetypeCaps(id);
    assert.equal(Object.values(caps).filter((value) => value === 3).length, 3, id);
    assert.equal(Object.values(caps).filter((value) => value === 2).length, 1, id);

    const skills = suggestedSkills(id);
    assert.equal(Object.values(skills).filter((value) => value.current === 5).length, 3, id);
    assert.equal(Object.values(skills).filter((value) => value.current === 4).length, 1, id);
    assert.equal(Object.values(skills).filter((value) => value.current === 6).length, ARKHAM_SKILLS.length - 4, id);
  }
});

test("Dreamer uses three chosen focus skills at 3+ and Lore at 2+", () => {
  const focus = ["presence", "resolve", "wits"];
  const caps = archetypeCaps("dreamer", focus);
  assert.deepEqual(focus.map((id) => caps[id]), [3, 3, 3]);
  assert.equal(caps.lore, 2);
  assert.equal(caps.intuition, 4);
});

test("new and imported dossiers retain the complete sheet structure", () => {
  const created = createCharacter("Jenny Barnes", "rogue");
  assert.equal(created.name, "Jenny Barnes");
  assert.equal(Object.keys(created.skills).length, 10);
  assert.deepEqual(Object.values(created.knacks).map((slots) => slots.length), [3, 2, 2, 1]);

  const imported = normalizeCharacter({ name: "Ashcan Pete", archetype: "survivor", background: { origin: "Arkham" } });
  assert.equal(imported.background.origin, "Arkham");
  assert.equal(imported.background.family, "");
  assert.equal(imported.weapons.length, 0);
  assert.equal(imported.skills.resolve.max, 2);
});

test("skill warnings identify current levels that exceed their configured cap", () => {
  const character = createCharacter("Daisy Walker", "seeker");
  assert.deepEqual(skillWarnings(character), []);
  character.skills.agility.current = 3;
  character.skills.agility.max = 4;
  assert.deepEqual(skillWarnings(character), ["Agility"]);
});

test("multiclassing requires 125 spent XP and 20 unused XP", () => {
  const character = createCharacter("Roland Banks", "guardian");
  character.xpEarned = MULTICLASS_MINIMUM_XP + MULTICLASS_COST - 1;
  character.xpUnused = MULTICLASS_COST;
  assert.equal(multiclassEligibility(character).canPurchase, false);
  assert.equal(applyMulticlass(character, "seeker").ok, false);

  character.xpEarned = MULTICLASS_MINIMUM_XP + MULTICLASS_COST - 1;
  character.xpUnused = MULTICLASS_COST - 1;
  assert.equal(multiclassEligibility(character).canPurchase, false);
  assert.equal(character.multiclass, null);
});

test("a second archetype spends XP and combines skill limits and knack lists", () => {
  const character = createCharacter("Roland Banks", "guardian");
  character.xpEarned = 150;
  character.xpUnused = 25;

  const result = applyMulticlass(character, "seeker");
  assert.equal(result.ok, true);
  assert.equal(character.xpUnused, 5);
  assert.equal(character.dicePoolMaximumIncrease, 1);
  assert.equal(combinedArchetypeCaps(character).athletics, 2);
  assert.equal(combinedArchetypeCaps(character).knowledge, 2);
  assert.equal(character.skills.knowledge.max, 2);
  assert.deepEqual(knackSlotCounts(character), { 1: 3, 2: 2, 3: 2, 4: 1 });
  assert.ok(availableKnacks(character, 1).includes("Come and Get Me"));
  assert.ok(availableKnacks(character, 1).includes("Brilliant Insight"));
});

test("a focused multiclass adds the correct knack slots without new skill limits", () => {
  const character = createCharacter("Wendy Adams", "survivor");
  const originalCaps = combinedArchetypeCaps(character);
  character.xpEarned = 145;
  character.xpUnused = 20;

  assert.equal(applyMulticlass(character, "survivor").ok, true);
  assert.deepEqual(knackSlotCounts(character), { 1: 5, 2: 3, 3: 3, 4: 2 });
  assert.deepEqual(combinedArchetypeCaps(character), originalCaps);
  assert.deepEqual(Object.values(character.knacks).map((slots) => slots.length), [5, 3, 3, 2]);
  assert.equal(applyMulticlass(character, "rogue").ok, false);
});

test("saved multiclass dossiers normalize new fields and Dreamer focus", () => {
  const imported = normalizeCharacter({
    name: "Kate Winthrop",
    archetype: "seeker",
    multiclass: { archetype: "dreamer", xpSpent: 20 },
  });
  assert.deepEqual(imported.secondaryDreamerFocus, ["intuition", "presence", "resolve"]);
  assert.equal(imported.skills.lore.max, 2);
  assert.equal(imported.dicePoolMaximumIncrease, 1);
  assert.deepEqual(Object.values(imported.knacks).map((slots) => slots.length), [3, 2, 2, 1]);
});
