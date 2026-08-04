import test from "node:test";
import assert from "node:assert/strict";

import { PDFDocument, StandardFonts, rgb } from "../assets/vendor/pdf-lib.esm.min.js";
import { ARCHETYPES, ARKHAM_SKILLS, KNACKS } from "../assets/js/arkham-character-data.js";
import {
  MULTICLASS_COST,
  MULTICLASS_MINIMUM_XP,
  applyMulticlass,
  arkhamPdfFilename,
  arkhamPdfSections,
  archetypeCaps,
  availableKnacks,
  combinedArchetypeCaps,
  createArkhamCharacterPdf,
  createCharacter,
  knackSlotCounts,
  multiclassEligibility,
  normalizeCharacter,
  skillWarnings,
  suggestedSkills,
  undoMulticlass,
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
  assert.equal(imported.sessionNotes.length, 0);
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
  character.knacks[1][0] = "Come and Get Me";
  const skillsBeforeMulticlass = structuredClone(character.skills);
  const knacksBeforeMulticlass = structuredClone(character.knacks);

  const result = applyMulticlass(character, "seeker");
  assert.equal(result.ok, true);
  assert.equal(character.xpUnused, 5);
  assert.equal(character.dicePoolMaximumIncrease, 1);
  assert.equal(combinedArchetypeCaps(character).athletics, 2);
  assert.equal(combinedArchetypeCaps(character).knowledge, 2);
  assert.equal(character.skills.knowledge.max, 2);
  assert.deepEqual(knackSlotCounts(character), { 1: 5, 2: 3, 3: 3, 4: 2 });
  assert.ok(availableKnacks(character, 1).includes("Come and Get Me"));
  assert.ok(availableKnacks(character, 1).includes("Brilliant Insight"));
  assert.ok(availableKnacks(character, 1, true).includes("Brilliant Insight"));
  assert.equal(availableKnacks(character, 1, true).includes("Come and Get Me"), false);
  for (const tier of [1, 2, 3, 4]) {
    assert.deepEqual(availableKnacks(character, tier, true), ARCHETYPES.seeker.knacks[tier]);
  }

  character.knacks[1][1] = "Brilliant Insight";
  character.skills.knowledge.current = 2;
  const undo = undoMulticlass(character);
  assert.equal(undo.ok, true);
  assert.equal(undo.refundedXp, 20);
  assert.equal(character.xpUnused, 25);
  assert.equal(character.multiclass, null);
  assert.equal(character.dicePoolMaximumIncrease, 0);
  assert.deepEqual(character.skills, skillsBeforeMulticlass);
  assert.deepEqual(character.knacks, knacksBeforeMulticlass);
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
  assert.equal(undoMulticlass(character).ok, true);
  assert.deepEqual(Object.values(character.knacks).map((slots) => slots.length), [3, 2, 2, 1]);
  assert.equal(character.xpUnused, 20);
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
  assert.deepEqual(Object.values(imported.knacks).map((slots) => slots.length), [5, 3, 3, 2]);
  assert.equal(undoMulticlass(imported).ok, true);
  assert.equal(imported.skills.knowledge.max, 2);
  assert.equal(imported.skills.lore.max, 3);
});

test("dated session notes persist through dossier normalization", () => {
  const imported = normalizeCharacter({
    name: "Trish Scarborough",
    archetype: "rogue",
    sessionNotes: [
      { rowId: "session-1", date: "1926-10-31", notes: "Followed the silver key to the old house." },
      { date: "1926-11-07", notes: "The door was waiting for us." },
    ],
  });
  assert.equal(imported.sessionNotes.length, 2);
  assert.equal(imported.sessionNotes[0].rowId, "session-1");
  assert.equal(imported.sessionNotes[0].date, "1926-10-31");
  assert.match(imported.sessionNotes[1].notes, /door was waiting/);
});

test("PDF export includes the complete dossier and produces a readable document", async () => {
  const character = createCharacter("Jenny Barnes", "rogue");
  character.player = "Sam";
  character.knacks[1][0] = "Ambush";
  character.weapons.push({ name: ".45 Automatic", skill: "Ranged Combat", damage: 2, injury: 4, range: "Short", ammunition: 7, ammoMax: 7, ammoRemaining: 5, special: "Reliable." });
  character.background.origin = "Arkham, Massachusetts";
  character.equipment.push({ name: "Flashlight", quantity: 1, uses: 3, usesRemaining: 2, description: "Cuts through the fog.", notes: "Fresh batteries." });
  character.supernatural.push({ type: "Relic", name: "Silver Key", details: "Opens doors that should remain closed." });
  character.sessionNotes.push({ date: "1926-10-31", notes: "Followed the bell into the fog." });

  const sections = arkhamPdfSections(character);
  assert.deepEqual(sections.map((section) => section.title), [
    "Investigator", "Archetype & Personality", "Skills", "Knacks", "Weapons", "Injuries & Other Effects", "Background", "Mundane Resources", "Supernatural Resources", "Session Notes",
  ]);
  assert.match(sections.find((section) => section.title === "Knacks").entries[0].value, /surprise round/i);
  assert.equal(arkhamPdfFilename(character), "jenny-barnes-dossier.pdf");

  const bytes = await createArkhamCharacterPdf(character, { pdfLib: { PDFDocument, StandardFonts, rgb } });
  const document = await PDFDocument.load(bytes);
  assert.ok(bytes.length > 3_000);
  assert.ok(document.getPageCount() >= 2);
  assert.equal(document.getTitle(), "Jenny Barnes - Arkham Horror Investigator Dossier");
});
