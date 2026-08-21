const CHRONICLE_PATH = "/gm/api/tyov/chronicle";
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

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isGmPath = url.pathname === "/gm" || url.pathname.startsWith("/gm/");
    let ownerId = authenticatedUser(request);

    if (!ownerId && isLocalRequest(url)) ownerId = "local-preview";

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

    return env.ASSETS.fetch(request);
  },
};

export default worker;
