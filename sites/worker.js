const CHRONICLE_PATH = "/gm/api/tyov/chronicle";
const ARKHAM_CHARACTERS_PATH = "/api/arkham/characters";
const ARKHAM_PAGE_PATH = "/vault/systems/arkham-horror/characters/";
const MAX_BODY_BYTES = 1_500_000;

function json(value, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store, max-age=0");
  return new Response(JSON.stringify(value), { ...init, headers });
}

function authenticatedUser(request) {
  return request.headers.get("oai-authenticated-user-id")
    || request.headers.get("cf-access-authenticated-user-email")
    || null;
}

function isLocalRequest(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function safeReturnTo(value, fallback = "/") {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !value.includes("\\")
    ? value
    : fallback;
}

async function ensureDatabase(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS tyov_chronicles (
      owner_id TEXT NOT NULL,
      chronicle_id TEXT NOT NULL DEFAULT 'primary',
      title TEXT NOT NULL DEFAULT 'Unnamed Vampire',
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (owner_id, chronicle_id)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_tyov_chronicles_owner_updated
      ON tyov_chronicles(owner_id, updated_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS arkham_characters (
      owner_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Unnamed Investigator',
      data TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (owner_id, character_id)
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_arkham_characters_owner_updated
      ON arkham_characters(owner_id, updated_at)`),
  ]);
}

function validChronicle(value) {
  return value
    && value.schemaVersion === 1
    && value.vampire && typeof value.vampire === "object"
    && Array.isArray(value.memories)
    && Array.isArray(value.experiences)
    && Array.isArray(value.prompts)
    && value.traits && typeof value.traits === "object";
}

async function readChronicle(db, ownerId) {
  return db.prepare(`SELECT title, data, version, created_at, updated_at
    FROM tyov_chronicles
    WHERE owner_id = ? AND chronicle_id = 'primary'`)
    .bind(ownerId)
    .first();
}

async function handleChronicle(request, env, ownerId) {
  if (!env.DB) return json({ error: "Chronicle storage is unavailable." }, { status: 503 });
  await ensureDatabase(env.DB);

  if (request.method === "GET") {
    const row = await readChronicle(env.DB, ownerId);
    if (!row) return json({ chronicle: null, version: 0 });
    try {
      return json({
        chronicle: JSON.parse(row.data),
        version: Number(row.version),
        updatedAt: row.updated_at,
      });
    } catch {
      return json({ error: "The saved Chronicle could not be read." }, { status: 500 });
    }
  }

  if (request.method !== "PUT") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET, PUT" } });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Chronicle is too large to save." }, { status: 413 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!validChronicle(payload.chronicle)) {
    return json({ error: "Invalid Chronicle data." }, { status: 400 });
  }

  const encoded = JSON.stringify(payload.chronicle);
  if (new TextEncoder().encode(encoded).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Chronicle is too large to save." }, { status: 413 });
  }

  const expectedVersion = Number(payload.version || 0);
  const current = await readChronicle(env.DB, ownerId);
  if (current && Number(current.version) !== expectedVersion) {
    return json({
      error: "This Chronicle changed in another session.",
      conflict: true,
      version: Number(current.version),
      chronicle: JSON.parse(current.data),
    }, { status: 409 });
  }

  const title = String(payload.chronicle.vampire.name || "Unnamed Vampire").slice(0, 180);
  const now = new Date().toISOString();

  if (!current) {
    await env.DB.prepare(`INSERT INTO tyov_chronicles
      (owner_id, chronicle_id, title, data, version, created_at, updated_at)
      VALUES (?, 'primary', ?, ?, 1, ?, ?)`)
      .bind(ownerId, title, encoded, now, now)
      .run();
  } else {
    const result = await env.DB.prepare(`UPDATE tyov_chronicles
      SET title = ?, data = ?, version = version + 1, updated_at = ?
      WHERE owner_id = ? AND chronicle_id = 'primary' AND version = ?`)
      .bind(title, encoded, now, ownerId, expectedVersion)
      .run();
    if (!result.meta?.changes) {
      return json({ error: "The Chronicle could not be saved safely." }, { status: 409 });
    }
  }

  const saved = await readChronicle(env.DB, ownerId);
  return json({ ok: true, version: Number(saved.version), updatedAt: saved.updated_at });
}

export function validArkhamCharacter(value) {
  return Boolean(value
    && typeof value === "object"
    && typeof value.id === "string"
    && value.id.length > 0
    && value.id.length <= 128
    && typeof value.name === "string"
    && typeof value.archetype === "string"
    && value.skills && typeof value.skills === "object"
    && value.knacks && typeof value.knacks === "object"
    && value.background && typeof value.background === "object"
    && Array.isArray(value.weapons)
    && Array.isArray(value.injuries)
    && Array.isArray(value.equipment)
    && Array.isArray(value.supernatural)
    && Array.isArray(value.sessionNotes));
}

export function arkhamCharacterIdFromPath(pathname) {
  if (!pathname.startsWith(`${ARKHAM_CHARACTERS_PATH}/`)) return null;
  const encoded = pathname.slice(ARKHAM_CHARACTERS_PATH.length + 1);
  if (!encoded || encoded.includes("/")) return null;
  try {
    const id = decodeURIComponent(encoded);
    return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function readArkhamCharacter(db, ownerId, characterId) {
  return db.prepare(`SELECT character_id, data, version, created_at, updated_at
    FROM arkham_characters
    WHERE owner_id = ? AND character_id = ?`)
    .bind(ownerId, characterId)
    .first();
}

function arkhamConflict(row) {
  if (!row) return { conflict: true, deleted: true, version: 0, character: null };
  try {
    return {
      conflict: true,
      deleted: false,
      version: Number(row.version),
      updatedAt: row.updated_at,
      character: JSON.parse(row.data),
    };
  } catch {
    return { error: "The saved investigator could not be read." };
  }
}

export async function handleArkhamCharacters(request, env, ownerId, pathname = new URL(request.url).pathname) {
  if (!env.DB) return json({ error: "Investigator storage is unavailable." }, { status: 503 });
  await ensureDatabase(env.DB);

  if (pathname === ARKHAM_CHARACTERS_PATH) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
    }
    const result = await env.DB.prepare(`SELECT character_id, data, version, created_at, updated_at
      FROM arkham_characters
      WHERE owner_id = ?
      ORDER BY updated_at DESC`)
      .bind(ownerId)
      .all();
    try {
      return json({
        characters: (result.results ?? []).map((row) => ({
          character: JSON.parse(row.data),
          version: Number(row.version),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    } catch {
      return json({ error: "The cloud investigator library could not be read." }, { status: 500 });
    }
  }

  const characterId = arkhamCharacterIdFromPath(pathname);
  if (!characterId) return json({ error: "Investigator not found." }, { status: 404 });

  if (request.method === "DELETE") {
    await env.DB.prepare(`DELETE FROM arkham_characters
      WHERE owner_id = ? AND character_id = ?`)
      .bind(ownerId, characterId)
      .run();
    return json({ ok: true, characterId });
  }

  if (request.method !== "PUT") {
    return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "PUT, DELETE" } });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Investigator is too large to save." }, { status: 413 });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!validArkhamCharacter(payload.character) || payload.character.id !== characterId) {
    return json({ error: "Invalid investigator data." }, { status: 400 });
  }

  const encoded = JSON.stringify(payload.character);
  if (new TextEncoder().encode(encoded).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Investigator is too large to save." }, { status: 413 });
  }

  const expectedVersion = Number(payload.version || 0);
  const current = await readArkhamCharacter(env.DB, ownerId, characterId);
  if ((!current && expectedVersion !== 0) || (current && Number(current.version) !== expectedVersion)) {
    const conflict = arkhamConflict(current);
    return json(conflict, { status: conflict.error ? 500 : 409 });
  }

  const name = String(payload.character.name || "Unnamed Investigator").slice(0, 180);
  const now = new Date().toISOString();
  if (!current) {
    try {
      await env.DB.prepare(`INSERT INTO arkham_characters
        (owner_id, character_id, name, data, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)`)
        .bind(ownerId, characterId, name, encoded, now, now)
        .run();
    } catch {
      const raced = await readArkhamCharacter(env.DB, ownerId, characterId);
      const conflict = arkhamConflict(raced);
      return json(conflict, { status: conflict.error ? 500 : 409 });
    }
  } else {
    const result = await env.DB.prepare(`UPDATE arkham_characters
      SET name = ?, data = ?, version = version + 1, updated_at = ?
      WHERE owner_id = ? AND character_id = ? AND version = ?`)
      .bind(name, encoded, now, ownerId, characterId, expectedVersion)
      .run();
    if (!result.meta?.changes) {
      const raced = await readArkhamCharacter(env.DB, ownerId, characterId);
      const conflict = arkhamConflict(raced);
      return json(conflict, { status: conflict.error ? 500 : 409 });
    }
  }

  const saved = await readArkhamCharacter(env.DB, ownerId, characterId);
  return json({ ok: true, characterId, version: Number(saved.version), updatedAt: saved.updated_at });
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isGmPath = url.pathname === "/gm" || url.pathname.startsWith("/gm/");
    const isArkhamApi = url.pathname === ARKHAM_CHARACTERS_PATH || url.pathname.startsWith(`${ARKHAM_CHARACTERS_PATH}/`);
    let ownerId = authenticatedUser(request);

    if (!ownerId && isLocalRequest(url)) ownerId = "local-preview";

    if (url.pathname === ARKHAM_CHARACTERS_PATH && url.searchParams.get("login") === "1") {
      const returnTo = safeReturnTo(url.searchParams.get("return_to"), ARKHAM_PAGE_PATH);
      if (ownerId) return Response.redirect(new URL(returnTo, url.origin), 302);
      const signIn = new URL("/signin-with-chatgpt", url.origin);
      signIn.searchParams.set("return_to", returnTo);
      return Response.redirect(signIn, 302);
    }

    if (isGmPath && !ownerId) {
      if (url.pathname === CHRONICLE_PATH) {
        return json({ error: "Sign in to access this Chronicle." }, { status: 401 });
      }
      const signIn = new URL("/signin-with-chatgpt", url.origin);
      signIn.searchParams.set("return_to", `${url.pathname}${url.search}`);
      return Response.redirect(signIn, 302);
    }

    if (url.pathname === CHRONICLE_PATH) {
      return handleChronicle(request, env, ownerId);
    }

    if (isArkhamApi) {
      if (!ownerId) return json({ error: "Sign in to access your investigators." }, { status: 401 });
      return handleArkhamCharacters(request, env, ownerId, url.pathname);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
