import test from "node:test";
import assert from "node:assert/strict";

import {
  allocationSummary,
  appendReferencePages,
  attributeStats,
  autoAllocateNpcSkills,
  availableEquipment,
  chooseSecondaryServiceGroup,
  deriveCharacter,
  generateIdentity,
  identitySummaryRows,
  pdfFieldValues,
  referenceSpecsForState,
  resolveSecretSociety,
  resolveServiceGroup,
  skillCap,
} from "../assets/js/paranoia-character.js";
import { STARTING_PC_EQUIPMENT } from "../assets/js/paranoia-character-data.js";
import { PDFDocument, StandardFonts } from "../assets/vendor/pdf-lib.esm.min.js";

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

test("Internal Security requires a chosen non-IntSec secondary service group", () => {
  const service = resolveServiceGroup("random", randomForRolls(1));
  assert.equal(service.actual.name, "Internal Security");
  assert.equal(service.cover, null);
  assert.equal(service.needsSecondaryServiceGroup, true);
  assert.deepEqual(service.rolls, [1]);
  const pendingState = {
    identity: {
      service,
      mutant: { name: null, method: "none", roll: null },
      society: { name: null, method: "none", rolls: [] },
    },
    manualSocietyName: "",
  };
  assert.deepEqual(identitySummaryRows(pendingState).slice(0, 2), [
    ["Secondary service group", "Selection required"],
    ["Secret affiliation", "Internal Security (rolled 1)"],
  ]);

  const chosen = chooseSecondaryServiceGroup(service, "technical-services");
  assert.equal(chosen.cover.name, "Technical Services");
  assert.equal(chosen.coverMethod, "selected");
  assert.equal(chosen.needsSecondaryServiceGroup, false);
  assert.deepEqual(identitySummaryRows({ ...pendingState, identity: { ...pendingState.identity, service: chosen } }).slice(0, 2), [
    ["Secondary service group", "Technical Services (selected; public cover)"],
    ["Secret affiliation", "Internal Security (rolled 1)"],
  ]);
  assert.throws(() => chooseSecondaryServiceGroup(service, "internal-security"), /non-IntSec secondary service group/);
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

test("assigned identities retain selection provenance while table results retain their rolls", () => {
  const selected = generateIdentity({
    serviceGroup: "technical-services",
    mutantPower: "Charm",
    secretSociety: "Illuminati",
  }, randomForRolls(1));
  assert.equal(selected.service.method, "selected");
  assert.equal(selected.mutant.method, "selected");
  assert.equal(selected.society.method, "selected");

  const state = { identity: selected, manualSocietyName: "" };
  assert.deepEqual(identitySummaryRows(state), [
    ["Public service group", "Technical Services (selected)"],
    ["Mutant power", "Charm (selected)"],
    ["Secret society", "Illuminati (selected)"],
  ]);

  const rolled = generateIdentity({}, randomForRolls(3, 2, 12));
  assert.deepEqual(identitySummaryRows({ identity: rolled, manualSocietyName: "" }), [
    ["Public service group", "Technical Services (rolled 3)"],
    ["Mutant power", "Charm (rolled 2)"],
    ["Secret society", "Illuminati (rolled 12)"],
  ]);
});

test("character references include an Internal Security cover and secret affiliation", () => {
  const identity = generateIdentity({
    secondaryServiceGroup: "technical-services",
    mutantPower: "Charm",
    secretSociety: "Illuminati",
  }, randomForRolls(1));
  const specs = referenceSpecsForState({ identity, manualSocietyName: "" });
  assert.deepEqual(specs.map(({ kind, name }) => [kind, name]), [
    ["service", "Technical Services"],
    ["service", "Internal Security"],
    ["mutant", "Charm"],
    ["society", "Illuminati"],
  ]);
});

test("reference text is appended to a PDF as continuation pages", async () => {
  const document = await PDFDocument.create();
  document.addPage([569.04, 783.12]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const added = appendReferencePages(document, { regular, bold }, [{
    label: "Mutant power",
    name: "Charm",
    url: "/vault/systems/paranoia/general/mutant-powers/",
    text: "A short reminder.\n\n".repeat(180),
    missing: false,
  }]);
  assert.ok(added > 1);
  assert.equal(document.getPageCount(), added + 1);
  assert.ok((await document.save()).length > 1000);
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

  const intSecIdentity = generateIdentity({
    secondaryServiceGroup: "armed-forces",
    mutantPower: "Charm",
    secretSociety: "Illuminati",
  }, randomForRolls(1));
  const { values: intSecValues } = pdfFieldValues({ ...state, identity: intSecIdentity });
  assert.equal(intSecValues["Service Group"], "Armed Forces");
  assert.match(intSecValues.Notes, /Actual Service Group: Internal Security/);
});
