import { createHash } from "node:crypto";

import { getStore } from "@netlify/blobs";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { validArkhamCharacter } from "../../sites/worker.js";

const ARKHAM_PAGE_PATH = "/vault/systems/arkham-horror/characters/";
const DEFAULT_ACCESS_TEAM_DOMAIN = "schwa51.cloudflareaccess.com";
const MAX_BODY_BYTES = 1_500_000;
const STORE_NAME = "arkham-characters";
const jwksByIssuer = new Map();

function json(value, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store, max-age=0");
  return new Response(JSON.stringify(value), { ...init, headers });
}

export function safeReturnTo(value, fallback = ARKHAM_PAGE_PATH) {
  return typeof value === "string" && /^\/(?!\/)/.test(value) && !value.includes("\\")
    ? value
    : fallback;
}

function validCharacterId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

function ownerPrefix(ownerId) {
  return `${createHash("sha256").update(ownerId).digest("hex")}/`;
}

function cloudflareIssuer() {
  const configured = (process.env.CLOUDFLARE_ACCESS_TEAM_DOMAIN || DEFAULT_ACCESS_TEAM_DOMAIN).trim();
  return (configured.startsWith("https://") ? configured : `https://${configured}`).replace(/\/+$/, "");
}

function remoteJwks(issuer) {
  if (!jwksByIssuer.has(issuer)) {
    jwksByIssuer.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  }
  return jwksByIssuer.get(issuer);
}

async function cloudflareAccessOwner(request) {
  const audience = process.env.CLOUDFLARE_ACCESS_ARKHAM_AUD?.trim();
  if (!audience) return { configurationError: true, ownerId: null };
  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) return { configurationError: false, ownerId: null };

  const issuer = cloudflareIssuer();
  try {
    const { payload } = await jwtVerify(assertion, remoteJwks(issuer), { audience, issuer });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return { configurationError: false, ownerId: email || null };
  } catch (error) {
    console.warn("Cloudflare Access token validation failed", error);
    return { configurationError: false, ownerId: null };
  }
}

async function readRecord(store, key) {
  return store.getWithMetadata(key, { consistency: "strong", type: "json" });
}

function conflictResponse(entry) {
  if (!entry) return json({ conflict: true, deleted: true, version: 0, character: null }, { status: 409 });
  const record = entry.data;
  return json({
    conflict: true,
    deleted: false,
    version: Number(record.version || 0),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    character: record.character,
  }, { status: 409 });
}

export async function handleArkhamBlobRequest(request, context, ownerId, store) {
  const characterId = context?.params?.characterId || null;
  const prefix = ownerPrefix(ownerId);

  if (!characterId) {
    if (request.method !== "GET") {
      return json({ error: "Method not allowed." }, { status: 405, headers: { allow: "GET" } });
    }
    const listing = await store.list({ prefix });
    const records = await Promise.all((listing.blobs || []).map((blob) => store.get(blob.key, {
      consistency: "strong",
      type: "json",
    })));
    const characters = records
      .filter((record) => record?.character)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      .map((record) => ({
        character: record.character,
        version: Number(record.version || 0),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      }));
    return json({ characters });
  }

  if (!validCharacterId(characterId)) return json({ error: "Investigator not found." }, { status: 404 });
  const key = `${prefix}${characterId}`;

  if (request.method === "DELETE") {
    await store.delete(key);
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
  if (new TextEncoder().encode(JSON.stringify(payload.character)).byteLength > MAX_BODY_BYTES) {
    return json({ error: "Investigator is too large to save." }, { status: 413 });
  }

  const expectedVersion = Number(payload.version || 0);
  const current = await readRecord(store, key);
  const currentVersion = Number(current?.data?.version || 0);
  if ((!current && expectedVersion !== 0) || (current && currentVersion !== expectedVersion)) {
    return conflictResponse(current);
  }

  const now = new Date().toISOString();
  const nextVersion = currentVersion + 1;
  const record = {
    character: payload.character,
    version: nextVersion,
    createdAt: current?.data?.createdAt || now,
    updatedAt: now,
  };
  const writeOptions = current
    ? { onlyIfMatch: current.etag }
    : { onlyIfNew: true };

  let write;
  try {
    write = await store.setJSON(key, record, writeOptions);
  } catch (error) {
    const raced = await readRecord(store, key);
    if (raced) return conflictResponse(raced);
    throw error;
  }
  if (!write.modified) return conflictResponse(await readRecord(store, key));

  return json({ ok: true, characterId, version: nextVersion, updatedAt: now });
}

export default async function handler(request, context) {
  const auth = await cloudflareAccessOwner(request);
  if (auth.configurationError) {
    return json({ error: "Cloudflare Access is not configured for the investigator library." }, { status: 503 });
  }
  if (!auth.ownerId) return json({ error: "Sign in to access your investigators." }, { status: 401 });

  const url = new URL(request.url);
  if (url.searchParams.get("login") === "1") {
    const returnTo = safeReturnTo(url.searchParams.get("return_to"));
    return Response.redirect(new URL(returnTo, url.origin), 302);
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    return await handleArkhamBlobRequest(request, context, auth.ownerId, store);
  } catch (error) {
    console.error("Arkham investigator storage failed", error);
    return json({ error: "The cloud investigator library is temporarily unavailable." }, { status: 500 });
  }
}

export const config = {
  path: [
    "/api/arkham/characters",
    "/api/arkham/characters/:characterId",
  ],
};
