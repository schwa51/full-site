import test from "node:test";
import assert from "node:assert/strict";

import {
  allocationSummary,
  attributeStats,
  autoAllocateNpcSkills,
  availableEquipment,
  deriveCharacter,
  generateIdentity,
  pdfFieldValues,
  resolveSecretSociety,
  resolveServiceGroup,
  skillCap,
} from "../assets/js/paranoia-character.js";
import { STARTING_PC_EQUIPMENT } from "../assets/js/paranoia-character-data.js";

function randomForRolls(...rolls) {
  let index = 0;
  return () => ((rolls[index++] ?? rolls.at(-1) ?? 1) - 0.5) / 20;
}

const attributes = {
  strength: 15,
  endurance: 19,
  agility: 14,
  dexterity: 18,
  moxie: 10,
  chutzpah: 6,
  mechanical: 20,
  power: 1,
};

test("attribute chart, carrying capacity, bonuses, and skill bases follow the rules", () => {
  assert.deepEqual(attributeStats(3), { base: 0, bonus: 0 });
  assert.deepEqual(attributeStats(14), { base: 3, bonus: 1 });
  assert.deepEqual(attributeStats(20), { base: 5, bonus: 2 });
  assert.deepEqual(deriveCharacter(attributes), {
    total: 103,
    carryingCapacity: 40,
    damageBonus: 1,
    machoBonus: 2,
    skillBases: { agility: 3, dexterity: 5, moxie: 2, chutzpah: 1, mechanical: 5 },
  });
});

test("Internal Security receives a non-IntSec cover group", () => {
  const service = resolveServiceGroup("random", randomForRolls(1, 2, 3));
  assert.equal(service.actual.name, "Internal Security");
  assert.equal(service.cover.name, "Technical Services");
  assert.deepEqual(service.rolls, [1, 2, 3]);
});

test("invalid Psion rolls reroll automatically while valid powers retain Psion", () => {
  const invalid = resolveSecretSociety("Charm", "random", randomForRolls(15, 12));
  assert.equal(invalid.name, "Illuminati");
  assert.deepEqual(invalid.rolls, [15, 12]);

  const valid = resolveSecretSociety("Deep Probe", "random", randomForRolls(15));
  assert.equal(valid.name, "Psion");

  const directedInvalid = resolveSecretSociety("Charm", "Psion", randomForRolls(12));
  assert.equal(directedInvalid.name, "Illuminati");
  assert.equal(directedInvalid.rerolledFromPsion, true);
});

test("roll 20 pauses for a gamemaster-selected society", () => {
  const identity = generateIdentity({}, randomForRolls(3, 1, 20));
  assert.equal(identity.service.cover.name, "Technical Services");
  assert.equal(identity.mutant.name, "Adrenalin Control");
  assert.equal(identity.society.name, "Other");
  assert.equal(identity.society.needsManualName, true);
});

test("cover service group determines special-training caps", () => {
  assert.deepEqual(skillCap("spurious-logic", "technical-services", "standard"), { cap: 14, special: true });
  assert.deepEqual(skillCap("laser-weapons", "technical-services", "standard"), { cap: 12, special: false });
  assert.deepEqual(skillCap("laser-weapons", "armed-forces", "elite"), { cap: 16, special: true });
});

test("NPC auto-allocation spends the exact competence-tier budget within caps", () => {
  const allocations = autoAllocateNpcSkills(attributes, "technical-services", "veteran", "technician");
  const summary = allocationSummary(attributes, allocations, "technical-services", "veteran");
  assert.equal(summary.spent, 40);
  assert.equal(summary.remaining, 0);
  assert.equal(summary.valid, true);
  assert.ok(allocations["electronic-engineering"] > allocations["force-sword"]);
});

test("PC and NPC equipment catalogs respect their different rules", () => {
  const pc = availableEquipment("pc", "red");
  assert.equal(pc.length, 14);
  assert.ok(pc.every((item) => item.clearance === "red" && item.category === "Personal equipment"));

  const npc = availableEquipment("npc", "orange");
  assert.ok(npc.some((item) => item.name === "Laser rifle"));
  assert.ok(npc.some((item) => item.name === "Bottle of Bouncy Bubble Beverage"));
  assert.ok(!npc.some((item) => item.name === "Force sword"));
});

test("PDF mapping includes derived values, all skill fields, and issued gear", () => {
  const state = {
    mode: "pc",
    name: "TEST-R-CITIZEN-1",
    player: "QA",
    clearanceId: "red",
    tierId: "standard",
    attributes,
    allocations: {},
    manualSocietyName: "",
    identity: {
      service: { actual: { id: "technical-services" }, cover: { id: "technical-services", name: "Technical Services" } },
      mutant: { name: "Charm" },
      society: { name: "Illuminati" },
    },
    equipment: STARTING_PC_EQUIPMENT.map((item) => ({ ...item })),
  };
  const { values, clearance } = pdfFieldValues(state);
  assert.equal(clearance.code, "R");
  assert.equal(values["Carrying Capacity"], "40 kg");
  assert.equal(values["Force Sword"], "3");
  assert.equal(values["Laser Weapons"], "5");
  assert.equal(values["Weapon 1"], "Red laser pistol");
  assert.equal(values["Weapon Experimental 1"], "S");
  assert.equal(values.Armor, "Red reflec armor");
  assert.equal(values.Rating, "L4");
});
