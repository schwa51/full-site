import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPromptChange,
  buildStartingChronicle,
  calculateMovement,
  forgetMemory,
  moveMemoryToDiary,
  promptEncounterCount,
  validateChronicleRules,
} from "../assets/js/tyov-chronicle.js";

function startingValues() {
  return {
    vampireName: "Ilyana",
    mortalIdentity: "A court astronomer",
    era: "The late 14th century",
    birthplace: "Veliko Tarnovo",
    originMemoryTitle: "The Mortal Court",
    originExperience: "I chart the winter stars for a doomed tsar; I mistake precision for safety.",
    mortals: [
      { name: "Mara", description: "My sister and fiercest critic" },
      { name: "Petar", description: "The apprentice who steals my tables" },
      { name: "Tsar Ivan", description: "My exhausted patron" },
    ],
    skills: ["Read the heavens", "Courtly silence", "Ride through snow"],
    resources: ["A brass astrolabe", "Rooms in the palace", "A patient grey mare"],
    memoryTitles: ["Mara", "The Falling City", "The Northern Road"],
    formativeExperiences: [
      "Mara corrects my false prediction before the court; I love her enough to resent her.",
      "Petar carries my astrolabe from the burning observatory; I let the palace fall behind us.",
      "I ride north beneath unfamiliar stars; freedom feels exactly like terror.",
    ],
    immortal: { name: "Veselin", description: "An immortal pilgrim who follows eclipses" },
    mark: { name: "My eyes hold a starless sky", concealment: "I wear smoked crystal spectacles" },
    transformationMemoryTitle: "The Black Eclipse",
    transformationExperience: "Veselin drinks from me beneath the eclipsed Moon; I wake unable to see the dawn.",
  };
}

test("creation produces the required five Memories and starting traits", () => {
  const chronicle = buildStartingChronicle(startingValues());
  assert.equal(chronicle.setupComplete, true);
  assert.equal(chronicle.memories.length, 5);
  assert.ok(chronicle.memories.every((memory) => memory.status === "active" && memory.experienceIds.length === 1));
  assert.equal(chronicle.experiences.length, 5);
  assert.equal(chronicle.traits.skills.length, 3);
  assert.equal(chronicle.traits.resources.length, 3);
  assert.equal(chronicle.traits.characters.filter((character) => character.type === "mortal").length, 3);
  assert.equal(chronicle.traits.characters.filter((character) => character.type === "immortal").length, 1);
  assert.equal(chronicle.traits.marks.length, 1);
  assert.deepEqual(validateChronicleRules(chronicle), []);
});

test("Prompt movement follows d10 minus d6 and permits repeat encounters", () => {
  assert.deepEqual(calculateMovement(7, 4, 11), { movement: 3, nextPrompt: 14 });
  assert.deepEqual(calculateMovement(4, 4, 11), { movement: 0, nextPrompt: 11 });
  assert.deepEqual(calculateMovement(2, 6, 11), { movement: -4, nextPrompt: 7 });
  assert.deepEqual(calculateMovement("", 6, 11), { movement: null, nextPrompt: null });

  const chronicle = buildStartingChronicle(startingValues());
  chronicle.prompts.push({ promptNumber: "11" }, { promptNumber: "9" }, { promptNumber: "11" });
  assert.equal(promptEncounterCount(chronicle, 11), 3);
});

test("Diary transfer seals Memories and enforces the four-Memory limit", () => {
  const chronicle = buildStartingChronicle(startingValues());
  for (const memory of chronicle.memories.slice(0, 4)) moveMemoryToDiary(chronicle, memory, "A locked iron folio");

  const diary = chronicle.diaries[0];
  assert.equal(diary.status, "active");
  assert.equal(chronicle.traits.resources.find((resource) => resource.id === diary.resourceId).kind, "diary");
  assert.ok(chronicle.memories.slice(0, 4).every((memory) => memory.status === "diary" && memory.sealed));
  assert.throws(() => moveMemoryToDiary(chronicle, chronicle.memories[4], "Ignored"), /four Memories/);
});

test("losing a Diary Resource forgets every Memory it contained", () => {
  const chronicle = buildStartingChronicle(startingValues());
  moveMemoryToDiary(chronicle, chronicle.memories[0], "A mask engraved with names");
  moveMemoryToDiary(chronicle, chronicle.memories[1], "A mask engraved with names");
  const diary = chronicle.diaries[0];
  const resource = chronicle.traits.resources.find((item) => item.id === diary.resourceId);

  applyPromptChange(chronicle, "lose-resource", `resources:${resource.id}`, "It is shattered.", "prompt-1");

  assert.equal(diary.status, "lost");
  assert.equal(resource.status, "lost");
  assert.ok(chronicle.memories.slice(0, 2).every((memory) => memory.status === "forgotten"));
  assert.deepEqual(validateChronicleRules(chronicle), []);
});

test("lost Memories remain present and checked Skills cannot be checked twice", () => {
  const chronicle = buildStartingChronicle(startingValues());
  const memory = chronicle.memories[0];
  forgetMemory(chronicle, memory, "Displaced by a later century");
  assert.equal(chronicle.memories.length, 5);
  assert.equal(memory.status, "forgotten");

  const skill = chronicle.traits.skills[0];
  applyPromptChange(chronicle, "check-skill", `skills:${skill.id}`, "", "prompt-1");
  assert.equal(skill.status, "checked");
  assert.throws(() => applyPromptChange(chronicle, "check-skill", `skills:${skill.id}`, "", "prompt-2"), /cannot be checked again/);
});

test("validation reports illegal active Memory and Experience counts", () => {
  const chronicle = buildStartingChronicle(startingValues());
  chronicle.memories.push({ ...structuredClone(chronicle.memories[0]), id: "sixth-memory" });
  chronicle.memories[0].experienceIds.push("extra-1", "extra-2", "extra-3");
  const errors = validateChronicleRules(chronicle);
  assert.ok(errors.some((error) => /five active Memories/.test(error)));
  assert.ok(errors.some((error) => /more than three Experiences/.test(error)));
});
