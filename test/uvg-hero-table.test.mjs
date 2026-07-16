import test from "node:test";
import assert from "node:assert/strict";
import {
  UVG_HERO_COLUMNS,
  UVG_HERO_TABLE,
  heroResultFor,
  rollD50,
  rollHero,
} from "../assets/js/uvg-hero-table.js";

test("the hero table contains one complete result for every d50 face", () => {
  assert.equal(UVG_HERO_TABLE.length, 50);
  assert.deepEqual(
    UVG_HERO_TABLE.map((entry) => entry.roll),
    Array.from({ length: 50 }, (_, index) => index + 1),
  );

  for (const entry of UVG_HERO_TABLE) {
    for (const column of Object.keys(UVG_HERO_COLUMNS)) {
      assert.equal(typeof entry[column], "string");
      assert.notEqual(entry[column].trim(), "");
    }
  }
});

test("d50 rolls include both endpoints", () => {
  assert.equal(rollD50(() => 0), 1);
  assert.equal(rollD50(() => 0.999999), 50);
});

test("column lookups return the matching source result", () => {
  assert.deepEqual(heroResultFor("possession", 24), {
    column: "possession",
    label: "What do they bear?",
    roll: 24,
    text: "Yellow-orange weightless rock—an aerolith",
  });
  assert.equal(heroResultFor("unknown", 24), null);
  assert.equal(heroResultFor("identity", 0), null);
  assert.equal(heroResultFor("identity", 51), null);
});

test("rolling a hero makes three independent d50 rolls", () => {
  const values = [0, 0.5, 0.999999];
  const results = rollHero(() => values.shift());

  assert.equal(results.identity.roll, 1);
  assert.equal(results.reason.roll, 26);
  assert.equal(results.possession.roll, 50);
  assert.equal(results.identity.text, "Decapolitan ambassador");
  assert.equal(results.reason.text, "Nightly dreams of a lost world");
  assert.equal(results.possession.text, "Source-bonded replacement clone seed");
});
