import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../assets/js/arkham-character.js";
import worker, {
  arkhamCharacterIdFromPath,
  handleArkhamCharacters,
  validArkhamCharacter,
} from "../sites/worker.js";

class MemoryD1Statement {
  constructor(database, query, values = []) {
    this.database = database;
    this.query = query;
    this.values = values;
  }

  bind(...values) {
    return new MemoryD1Statement(this.database, this.query, values);
  }

  async first() {
    if (!this.query.includes("FROM arkham_characters")) return null;
    const [ownerId, characterId] = this.values;
    return this.database.rows.get(`${ownerId}:${characterId}`) ?? null;
  }

  async all() {
    if (!this.query.includes("FROM arkham_characters")) return { results: [] };
    const [ownerId] = this.values;
    const results = [...this.database.rows.values()]
      .filter((row) => row.owner_id === ownerId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    return { results };
  }

  async run() {
    if (this.query.startsWith("INSERT INTO arkham_characters")) {
      const [ownerId, characterId, name, data, createdAt, updatedAt] = this.values;
      const key = `${ownerId}:${characterId}`;
      if (this.database.rows.has(key)) throw new Error("duplicate");
      this.database.rows.set(key, {
        owner_id: ownerId,
        character_id: characterId,
        name,
        data,
        version: 1,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return { meta: { changes: 1 } };
    }
    if (this.query.startsWith("UPDATE arkham_characters")) {
      const [name, data, updatedAt, ownerId, characterId, expectedVersion] = this.values;
      const key = `${ownerId}:${characterId}`;
      const row = this.database.rows.get(key);
      if (!row || Number(row.version) !== Number(expectedVersion)) return { meta: { changes: 0 } };
      this.database.rows.set(key, { ...row, name, data, updated_at: updatedAt, version: row.version + 1 });
      return { meta: { changes: 1 } };
    }
    if (this.query.startsWith("DELETE FROM arkham_characters")) {
      const [ownerId, characterId] = this.values;
      const changes = this.database.rows.delete(`${ownerId}:${characterId}`) ? 1 : 0;
      return { meta: { changes } };
    }
    return { meta: { changes: 0 } };
  }
}

class MemoryD1 {
  constructor() {
    this.rows = new Map();
  }

  prepare(query) {
    return new MemoryD1Statement(this, query.trim());
  }

  async batch(statements) {
    return Promise.all(statements.map((statement) => statement.run()));
  }
}

function jsonRequest(url, method, body) {
  return new Request(url, {
    method,
    headers: { accept: "application/json", "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

test("Arkham cloud records accept complete investigators and safe character paths", () => {
  const character = createCharacter("Jenny Barnes", "rogue");
  assert.equal(validArkhamCharacter(character), true);
  assert.equal(validArkhamCharacter({ id: character.id, name: character.name }), false);
  assert.equal(arkhamCharacterIdFromPath(`/api/arkham/characters/${character.id}`), character.id);
  assert.equal(arkhamCharacterIdFromPath("/api/arkham/characters/not/one/id"), null);
});

test("Arkham cloud API requires a signed-in owner", async () => {
  const response = await worker.fetch(new Request("https://example.com/api/arkham/characters"), {
    ASSETS: { fetch: () => new Response("asset") },
  });
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /Sign in/);
});

test("Arkham cloud API creates, lists, updates, conflicts, and deletes per owner", async () => {
  const database = new MemoryD1();
  const env = { DB: database };
  const ownerId = "owner-1";
  const character = createCharacter("Roland Banks", "guardian");
  const path = `/api/arkham/characters/${character.id}`;
  const url = `https://example.com${path}`;

  const created = await handleArkhamCharacters(jsonRequest(url, "PUT", { character, version: 0 }), env, ownerId, path);
  assert.equal(created.status, 200);
  assert.equal((await created.json()).version, 1);

  const listed = await handleArkhamCharacters(new Request("https://example.com/api/arkham/characters"), env, ownerId);
  const library = await listed.json();
  assert.equal(library.characters.length, 1);
  assert.equal(library.characters[0].character.name, "Roland Banks");

  character.player = "Sam";
  const conflict = await handleArkhamCharacters(jsonRequest(url, "PUT", { character, version: 0 }), env, ownerId, path);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).version, 1);

  const updated = await handleArkhamCharacters(jsonRequest(url, "PUT", { character, version: 1 }), env, ownerId, path);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).version, 2);

  const removed = await handleArkhamCharacters(new Request(url, { method: "DELETE" }), env, ownerId, path);
  assert.equal(removed.status, 200);
  assert.equal(database.rows.size, 0);
});
