import test from "node:test";
import assert from "node:assert/strict";

import {
  PARANOIA_TABLES,
  lookupResult,
  rangeIncludes,
  resolveWeaponResult,
  weaponMalfunctionNumber,
} from "../assets/js/paranoia-tables.js";

const weapons = PARANOIA_TABLES.weapons.weapons;
const byId = (id) => weapons.find((weapon) => weapon.id === id);

test("damage range lookup preserves the existing table", () => {
  assert.equal(rangeIncludes("03-10", 7), true);
  assert.equal(rangeIncludes("03-10", 11), false);
  assert.match(lookupResult(PARANOIA_TABLES.damage, 8, 12), /^Wound/);
});

test("standard and experimental malfunction thresholds use the raw attack roll", () => {
  assert.equal(weaponMalfunctionNumber(byId("grenade")), 20);
  assert.equal(weaponMalfunctionNumber(byId("flamethrower")), 19);
  assert.equal(resolveWeaponResult(byId("grenade"), 19, 10).kind, "damage");
  assert.equal(resolveWeaponResult(byId("grenade"), 20, 10).kind, "malfunction");
  assert.equal(resolveWeaponResult(byId("flamethrower"), 19, 10).kind, "malfunction");
});

test("laser malfunction number drops after the sixth barrel shot", () => {
  const laser = byId("laser-pistol");
  assert.equal(weaponMalfunctionNumber(laser, 6), 20);
  assert.equal(weaponMalfunctionNumber(laser, 7), 19);
  assert.equal(weaponMalfunctionNumber(laser, 8), 18);
  assert.equal(resolveWeaponResult(laser, 19, 12, { laserShot: 7 }).kind, "malfunction");
});

test("weapons that cannot malfunction still resolve damage", () => {
  const result = resolveWeaponResult(byId("unarmed"), 20, 20);
  assert.equal(result.kind, "damage");
  assert.match(result.outcome, /^Kill/);
});

test("special weapons use the second d20 for their own resolution", () => {
  const stun = resolveWeaponResult(byId("stun-gun"), 10, 9);
  assert.equal(stun.label, "Stun effect");
  assert.equal(stun.code, "E");
  assert.match(stun.outcome, /4 combat rounds/);

  const tangler = resolveWeaponResult(byId("tangler"), 10, 3);
  assert.equal(tangler.label, "Tangler hit: Left Arm");
});

test("the reconstructed weapon list is complete and corrects Sonic Rifle OCR", () => {
  assert.equal(weapons.length, 54);
  assert.equal(byId("sonic-rifle").name, "Sonic Rifle");
  assert.equal(byId("sonic-rifle").damage, 8);
});

test("tacnuke values above the damage table use column 20", () => {
  const result = resolveWeaponResult(byId("cone-tacnuke"), 10, 2);
  assert.equal(result.code, "F30");
  assert.match(result.outcome, /^Vaporize/);
});
