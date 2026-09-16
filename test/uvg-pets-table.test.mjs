import test from "node:test";
import assert from "node:assert/strict";
import {
  UVG_PET_ROLL_GROUPS,
  UVG_PETS_TABLE,
  petResultFor,
  rollPet,
} from "../assets/js/uvg-pets-table.js";

test("the pets table contains one complete result for every d50 face", () => {
  assert.equal(UVG_PETS_TABLE.length, 50);
  assert.deepEqual(
    UVG_PETS_TABLE.map((entry) => entry.roll),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );

  for (const entry of UVG_PETS_TABLE) {
    for (const column of ["mien", "morph", "attack", "ability", "likes"]) {
      assert.equal(typeof entry[column], "string");
      assert.notEqual(entry[column].trim(), "");
    }
  }
});

test("the form lookup returns morph, attack, and ability from one roll", () => {
  assert.deepEqual(petResultFor("form", 45), {
    group: "form",
    label: "Morph, attack, and ability",
    roll: 45,
    values: {
      morph: "Cobra",
      attack: "Neurotoxic bite (1d4 damage, no Shock); on a hit, the target must make a Physical save or lose its next Main Action.",
      ability: "It can live indefinitely in a closed wicker basket without food, water, or air.",
    },
  });
});

test("pet lookups reject unknown groups and rolls outside the d50", () => {
  assert.equal(petResultFor("unknown", 24), null);
  assert.equal(petResultFor("mien", 0), null);
  assert.equal(petResultFor("likes", 51), null);
});

test("rolling a pet makes three d50 rolls with one shared by columns two through four", () => {
  const values = [0, 0.5, 0.999999];
  const results = rollPet(() => values.shift());

  assert.deepEqual(Object.keys(results), Object.keys(UVG_PET_ROLL_GROUPS));
  assert.equal(results.mien.roll, 1);
  assert.deepEqual(results.mien.values, { mien: "Sneaky" });

  assert.equal(results.form.roll, 26);
  assert.deepEqual(results.form.values, {
    morph: "Wombat",
    attack: "Murderous headbutt (1d6 damage, Shock 2/AC 15).",
    ability: "It is immune to non-lethal damage; attacks intended only to incapacitate it deal no damage.",
  });

  assert.equal(results.likes.roll, 50);
  assert.deepEqual(results.likes.values, { likes: "Fighting" });
});

test("pet attacks and abilities use WWN combat terminology", () => {
  for (const entry of UVG_PETS_TABLE) {
    assert.match(entry.attack, /damage/);
    assert.match(entry.attack, /Shock/);
    assert.doesNotMatch(entry.ability, /counterattacks|critical failures|non-lethal amounts/i);
  }
});
