import test from "node:test";
import assert from "node:assert/strict";

import {
  PARANOIA_TABLES,
  attackRollSucceeds,
  lookupResult,
  rangeIncludes,
  resolveAttackCheck,
  resolveFollowUp,
  weaponMalfunctionNumber,
} from "../assets/js/paranoia-tables.js";

const weapons = PARANOIA_TABLES.weapons.weapons;
const byId = (id) => weapons.find((weapon) => weapon.id === id);

test("damage range lookup preserves the existing table", () => {
  assert.equal(rangeIncludes("03-10", 7), true);
  assert.equal(rangeIncludes("03-10", 11), false);
  assert.match(lookupResult(PARANOIA_TABLES.damage, 8, 12), /^Wound/);
});

test("every reconstructed weapon has an attack skill and attribute", () => {
  assert.equal(weapons.length, 54);
  assert.deepEqual(weapons.filter((weapon) => !weapon.skill), []);
  assert.deepEqual(byId("laser-pistol").skill, { name: "Laser Weapons", attribute: "Dexterity" });
  assert.deepEqual(byId("slug-napalm").skill, { name: "Projectile Weapons", attribute: "Dexterity" });
  assert.deepEqual(byId("force-sword").skill, { name: "Force Sword", attribute: "Agility" });
  assert.deepEqual(byId("bow").skill, { name: "Primitive Missile Weapons", attribute: "Dexterity" });
  assert.deepEqual(byId("knife").skill, { name: "Primitive Melee Weapon", attribute: "Agility" });
});

test("an attack hits on a roll less than or equal to its skill number", () => {
  const laser = byId("laser-pistol");
  const hit = resolveAttackCheck(laser, 12, 12);
  const miss = resolveAttackCheck(laser, 12, 13);

  assert.equal(hit.kind, "hit");
  assert.equal(hit.followUp.code, "L8");
  assert.equal(miss.kind, "miss");
  assert.equal(miss.followUp, null);
});

test("natural 1 always succeeds and natural 20 always fails", () => {
  assert.equal(attackRollSucceeds(0, 1), true);
  assert.equal(attackRollSucceeds(20, 20), false);
  assert.equal(resolveAttackCheck(byId("unarmed"), 0, 1).kind, "hit");
  assert.equal(resolveAttackCheck(byId("unarmed"), 20, 20).kind, "miss");
});

test("malfunctions take precedence over normal hit damage", () => {
  const flamethrower = resolveAttackCheck(byId("flamethrower"), 20, 19);
  assert.equal(flamethrower.kind, "malfunction");
  assert.equal(flamethrower.hit, true);
  assert.equal(flamethrower.followUp.code, "F9");
  assert.equal(flamethrower.followUp.damage, 9);

  const grenade = resolveAttackCheck(byId("grenade"), 10, 20);
  assert.equal(grenade.kind, "malfunction");
  assert.equal(grenade.followUp, null);
});

test("standard, experimental, and degraded laser thresholds are respected", () => {
  const laser = byId("laser-pistol");
  assert.equal(weaponMalfunctionNumber(byId("grenade")), 20);
  assert.equal(weaponMalfunctionNumber(byId("flamethrower")), 19);
  assert.equal(weaponMalfunctionNumber(laser, 6), 20);
  assert.equal(weaponMalfunctionNumber(laser, 7), 19);
  assert.equal(weaponMalfunctionNumber(laser, 8), 18);
  assert.equal(resolveAttackCheck(laser, 10, 19, { laserShot: 7 }).kind, "malfunction");
});

test("weapons that cannot malfunction still fail on a natural 20", () => {
  const attack = resolveAttackCheck(byId("unarmed"), 20, 20);
  assert.equal(attack.kind, "miss");
  assert.equal(attack.followUp, null);
});

test("conditional malfunctions resolve their effect before damage", () => {
  const malfunction = resolveAttackCheck(byId("energy-pistol"), 10, 19);
  assert.equal(malfunction.followUp.kind, "conditionalDamage");

  const even = resolveFollowUp(malfunction.followUp, 2);
  assert.equal(even.kind, "malfunction-resolved");
  assert.equal(even.followUp, null);

  const odd = resolveFollowUp(malfunction.followUp, 3);
  assert.equal(odd.kind, "damage-required");
  assert.equal(odd.followUp.code, "E8");
  assert.match(resolveFollowUp(odd.followUp, 12).outcome, /^Wound/);
});

test("successful special weapons unlock their weapon-effect roll", () => {
  const stunAttack = resolveAttackCheck(byId("stun-gun"), 10, 9);
  const stun = resolveFollowUp(stunAttack.followUp, 9);
  assert.equal(stun.label, "Stun effect");
  assert.match(stun.outcome, /4 combat rounds/);

  const tanglerAttack = resolveAttackCheck(byId("tangler"), 10, 3);
  const tangler = resolveFollowUp(tanglerAttack.followUp, 3);
  assert.equal(tangler.label, "Tangler hit: Left Arm");
});

test("tacnuke values above the damage table use column 20", () => {
  const attack = resolveAttackCheck(byId("cone-tacnuke"), 10, 10);
  assert.equal(attack.followUp.code, "F30");
  assert.equal(attack.followUp.damage, 20);
  assert.match(resolveFollowUp(attack.followUp, 2).outcome, /^Vaporize/);
});

test("the Sonic Rifle OCR correction remains present", () => {
  assert.equal(byId("sonic-rifle").name, "Sonic Rifle");
  assert.equal(byId("sonic-rifle").damage, 8);
});
