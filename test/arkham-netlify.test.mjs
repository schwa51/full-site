import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../assets/js/arkham-character.js";
import {
  config,
  handleArkhamBlobRequest,
  safeReturnTo,
} from "../netlify/functions/arkham-characters.mjs";

class MemoryBlobStore {
  constructor() {
    this.entries = new Map();
    this.sequence = 0;
  }

  async list({ prefix = "" } = {}) {
    return { blobs: [...this.entries.keys()].filter((key) => key.startsWith(prefix)).map((key) => ({ key })) };
  }

  async get(key) {
    return structuredClone(this.entries.get(key)?.data ?? null);
  }

  async getWithMetadata(key) {
    const entry = this.entries.get(key);
    return entry ? { data: structuredClone(entry.data), etag: entry.etag, metadata: {} } : null;
  }

  async setJSON(key, data, { onlyIfMatch, onlyIfNew } = {}) {
    const current = this.entries.get(key);
    if (onlyIfNew && current) return { modified: false };
    if (onlyIfMatch && current?.etag !== onlyIfMatch) return { modified: false };
    const etag = `\"${++this.sequence}\"`;
    this.entries.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }

  async delete(key) {
    this.entries.delete(key);
  }
}

function request(url, method = "GET", body) {
  return new Request(url, {
    method,
    headers: body == null ? undefined : { "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
}

test("Netlify function owns the dedicated Arkham API routes", () => {
  assert.deepEqual(config.path, [
    "/api/arkham/characters",
    "/api/arkham/characters/:characterId",
  ]);
  assert.equal(safeReturnTo("https://attacker.example"), "/vault/systems/arkham-horror/characters/");
  assert.equal(safeReturnTo("//attacker.example"), "/vault/systems/arkham-horror/characters/");
});

test("Netlify Arkham storage creates, lists, updates, isolates, conflicts, and deletes", async () => {
  const store = new MemoryBlobStore();
  const character = createCharacter("Daisy Walker", "seeker");
  const characterUrl = `https://example.com/api/arkham/characters/${character.id}`;
  const context = { params: { characterId: character.id } };

  const created = await handleArkhamBlobRequest(request(characterUrl, "PUT", { character, version: 0 }), context, "daisy@example.com", store);
  assert.equal(created.status, 200);
  assert.equal((await created.json()).version, 1);

  const listed = await handleArkhamBlobRequest(request("https://example.com/api/arkham/characters"), { params: {} }, "daisy@example.com", store);
  const library = await listed.json();
  assert.equal(library.characters.length, 1);
  assert.equal(library.characters[0].character.name, "Daisy Walker");

  const isolated = await handleArkhamBlobRequest(request("https://example.com/api/arkham/characters"), { params: {} }, "roland@example.com", store);
  assert.equal((await isolated.json()).characters.length, 0);

  const conflict = await handleArkhamBlobRequest(request(characterUrl, "PUT", { character, version: 0 }), context, "daisy@example.com", store);
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).version, 1);

  character.player = "Sam";
  const updated = await handleArkhamBlobRequest(request(characterUrl, "PUT", { character, version: 1 }), context, "daisy@example.com", store);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).version, 2);

  const removed = await handleArkhamBlobRequest(request(characterUrl, "DELETE"), context, "daisy@example.com", store);
  assert.equal(removed.status, 200);
  assert.equal(store.entries.size, 0);
});
