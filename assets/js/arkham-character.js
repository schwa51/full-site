import {
  ARCHETYPES,
  ARKHAM_SKILLS,
  INJURIES,
  KNACKS,
  MUNDANE_ITEMS,
  PERSONALITY_TRAITS,
  SUPERNATURAL_TYPES,
  WEAPONS,
} from "./arkham-character-data.js?v=20260803-4";

const STORAGE_KEY = "arkham-horror-character-manager-v1";
const VIEW_MODE_KEY = "arkham-horror-character-manager-view-v1";
const CLOUD_SYNC_KEY = "arkham-horror-character-manager-cloud-v1";
const CLOUD_API_URL = "/api/arkham/characters";
const ARKHAM_PAGE_PATH = "/vault/systems/arkham-horror/characters/";
const CLOUD_LOGIN_URL = `${CLOUD_API_URL}?login=1&return_to=${encodeURIComponent(ARKHAM_PAGE_PATH)}`;
const CLOUD_SAVE_DELAY = 800;
const PDF_LIB_URL = "/assets/vendor/pdf-lib.esm.min.js?v=1.17.1";
const TIER_SLOTS = { 1: 3, 2: 2, 3: 2, 4: 1 };
const MULTICLASS_BONUS_SLOTS = { 1: 2, 2: 1, 3: 1, 4: 1 };
export const MULTICLASS_MINIMUM_XP = 125;
export const MULTICLASS_COST = 20;
const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

const byId = (items, id) => items.find((item) => item.id === id);
const clone = (value) => JSON.parse(JSON.stringify(value));

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `arkham-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function localDateValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function localDateTime(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function options(values, selected, labelFor = (value) => value) {
  return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(labelFor(value))}</option>`).join("");
}

function pathValue(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const final = keys.pop();
  const target = keys.reduce((current, key) => current[key], object);
  target[final] = value;
}

export function archetypeCaps(archetypeId, dreamerFocus = []) {
  const archetype = ARCHETYPES[archetypeId] ?? ARCHETYPES.seeker;
  const cap3 = archetype.cap3 ?? dreamerFocus.slice(0, 3);
  const caps = Object.fromEntries(ARKHAM_SKILLS.map((skill) => [skill.id, 4]));
  cap3.forEach((skillId) => { caps[skillId] = 3; });
  caps[archetype.cap2] = 2;
  return caps;
}

export function suggestedSkills(archetypeId, dreamerFocus = []) {
  const archetype = ARCHETYPES[archetypeId] ?? ARCHETYPES.seeker;
  const focus = archetype.cap3 ?? dreamerFocus.slice(0, 3);
  const caps = archetypeCaps(archetypeId, dreamerFocus);
  const skills = Object.fromEntries(ARKHAM_SKILLS.map((skill) => [skill.id, { current: 6, max: caps[skill.id] }]));
  focus.forEach((skillId) => { skills[skillId].current = 5; });
  skills[archetype.cap2].current = 4;
  return skills;
}

export function combinedArchetypeCaps(character) {
  const primary = archetypeCaps(character.archetype, character.dreamerFocus);
  const secondaryId = character.multiclass?.archetype;
  if (!secondaryId || secondaryId === character.archetype || !ARCHETYPES[secondaryId]) return primary;
  const secondary = archetypeCaps(secondaryId, character.secondaryDreamerFocus);
  return Object.fromEntries(ARKHAM_SKILLS.map((skill) => [skill.id, Math.min(primary[skill.id], secondary[skill.id])]));
}

export function knackSlotCounts(character) {
  const multiclassed = Boolean(character.multiclass?.archetype);
  return Object.fromEntries(Object.entries(TIER_SLOTS).map(([tier, count]) => [tier, count + (multiclassed ? MULTICLASS_BONUS_SLOTS[tier] : 0)]));
}

export function availableKnacks(character, tier, bonusSlot = false) {
  const secondaryId = character.multiclass?.archetype;
  if (bonusSlot && secondaryId && ARCHETYPES[secondaryId]) return [...ARCHETYPES[secondaryId].knacks[tier]];
  const archetypeIds = [character.archetype];
  if (secondaryId && secondaryId !== character.archetype && ARCHETYPES[secondaryId]) archetypeIds.push(secondaryId);
  return [...new Set(archetypeIds.flatMap((id) => ARCHETYPES[id].knacks[tier] ?? []))];
}

export function multiclassEligibility(character) {
  const earned = Number(character.xpEarned) || 0;
  const unused = Number(character.xpUnused) || 0;
  const spent = Math.max(0, earned - unused);
  return {
    alreadyMulticlassed: Boolean(character.multiclass),
    spent,
    spentEnough: spent >= MULTICLASS_MINIMUM_XP,
    canAfford: unused >= MULTICLASS_COST,
    xpUntilEligible: Math.max(0, MULTICLASS_MINIMUM_XP - spent),
    xpNeeded: Math.max(0, MULTICLASS_COST - unused),
    canPurchase: !character.multiclass && spent >= MULTICLASS_MINIMUM_XP && unused >= MULTICLASS_COST,
  };
}

function emptyKnacks(counts = TIER_SLOTS) {
  return Object.fromEntries(Object.entries(counts).map(([tier, count]) => [tier, Array(count).fill("")]));
}

function normalizeKnacks(knacks, counts) {
  return Object.fromEntries(Object.entries(counts).map(([tier, count]) => {
    const saved = Array.isArray(knacks?.[tier]) ? knacks[tier].slice(0, count) : [];
    return [tier, [...saved, ...Array(Math.max(0, count - saved.length)).fill("")]];
  }));
}

function originalArchetypeKnacks(character) {
  const normalized = normalizeKnacks(character.knacks, TIER_SLOTS);
  return Object.fromEntries(Object.entries(normalized).map(([tier, slots]) => [
    tier,
    slots.map((knack) => ARCHETYPES[character.archetype].knacks[tier].includes(knack) ? knack : ""),
  ]));
}

function syncSkillLimits(character) {
  const caps = combinedArchetypeCaps(character);
  ARKHAM_SKILLS.forEach((skill) => { character.skills[skill.id].max = caps[skill.id]; });
}

function suggestedCharacterSkills(character) {
  const skills = suggestedSkills(character.archetype, character.dreamerFocus);
  const caps = combinedArchetypeCaps(character);
  ARKHAM_SKILLS.forEach((skill) => { skills[skill.id].max = caps[skill.id]; });
  return skills;
}

export function applyMulticlass(character, secondaryArchetypeId) {
  const eligibility = multiclassEligibility(character);
  if (!eligibility.canPurchase) return { ok: false, eligibility };
  if (!ARCHETYPES[secondaryArchetypeId]) return { ok: false, eligibility, reason: "invalid-archetype" };

  character.xpUnused = Number(character.xpUnused) - MULTICLASS_COST;
  character.multiclass = {
    archetype: secondaryArchetypeId,
    xpSpent: MULTICLASS_COST,
    selectedAt: new Date().toISOString(),
    previousSkills: clone(character.skills),
    previousKnacks: clone(character.knacks),
  };
  character.dicePoolMaximumIncrease = 1;
  character.secondaryDreamerFocus = secondaryArchetypeId === "dreamer" && secondaryArchetypeId !== character.archetype
    ? [...ARCHETYPES.dreamer.defaultCap3]
    : [];
  const combinedCaps = combinedArchetypeCaps(character);
  ARKHAM_SKILLS.forEach((skill) => {
    character.skills[skill.id].max = Math.min(Number(character.skills[skill.id].max), combinedCaps[skill.id]);
  });
  character.knacks = normalizeKnacks(character.knacks, knackSlotCounts(character));
  return { ok: true, eligibility: multiclassEligibility(character) };
}

export function undoMulticlass(character) {
  if (!character.multiclass) return { ok: false, reason: "not-multiclassed" };
  const advancement = character.multiclass;
  const refundedXp = Number(advancement.xpSpent) || MULTICLASS_COST;
  const fallbackSkills = suggestedSkills(character.archetype, character.dreamerFocus);

  if (advancement.previousSkills && typeof advancement.previousSkills === "object") {
    character.skills = Object.fromEntries(ARKHAM_SKILLS.map((skill) => [
      skill.id,
      { ...fallbackSkills[skill.id], ...(advancement.previousSkills[skill.id] ?? {}) },
    ]));
  } else {
    const originalCaps = archetypeCaps(character.archetype, character.dreamerFocus);
    ARKHAM_SKILLS.forEach((skill) => { character.skills[skill.id].max = originalCaps[skill.id]; });
  }

  character.knacks = advancement.previousKnacks
    ? normalizeKnacks(advancement.previousKnacks, TIER_SLOTS)
    : originalArchetypeKnacks(character);
  character.xpUnused = Number(character.xpUnused) + refundedXp;
  character.multiclass = null;
  character.secondaryDreamerFocus = [];
  character.dicePoolMaximumIncrease = 0;
  return { ok: true, refundedXp };
}

export function createCharacter(name = "New Investigator", archetypeId = "seeker") {
  const archetype = ARCHETYPES[archetypeId] ?? ARCHETYPES.seeker;
  const dreamerFocus = archetype.defaultCap3 ? [...archetype.defaultCap3] : [];
  return {
    id: uid(),
    name,
    player: "",
    archetype: archetypeId,
    dreamerFocus,
    xpEarned: 0,
    xpUnused: 0,
    multiclass: null,
    secondaryDreamerFocus: [],
    dicePoolMaximumIncrease: 0,
    insightLimit: 1,
    insightRemaining: 1,
    personality: "cautious",
    skills: suggestedSkills(archetypeId, dreamerFocus),
    knacks: emptyKnacks(),
    weapons: [],
    injuries: [],
    background: {
      origin: "",
      family: "",
      employment: "",
      salary: "",
      encounter: "",
      enemies: "",
      notes: "",
    },
    money: "",
    equipment: [],
    vehicle: "",
    lodging: "",
    supernatural: [],
    sessionNotes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCharacter(value = {}) {
  const archetypeId = ARCHETYPES[value.archetype] ? value.archetype : "seeker";
  const base = createCharacter(value.name || "Imported Investigator", archetypeId);
  const secondaryArchetypeId = ARCHETYPES[value.multiclass?.archetype] ? value.multiclass.archetype : null;
  const merged = {
    ...base,
    ...value,
    id: value.id || uid(),
    archetype: archetypeId,
    background: { ...base.background, ...(value.background ?? {}) },
    dreamerFocus: Array.isArray(value.dreamerFocus) ? value.dreamerFocus.slice(0, 3) : base.dreamerFocus,
    multiclass: secondaryArchetypeId ? {
      archetype: secondaryArchetypeId,
      xpSpent: Number(value.multiclass?.xpSpent) || MULTICLASS_COST,
      selectedAt: value.multiclass?.selectedAt || "",
      previousSkills: value.multiclass?.previousSkills && typeof value.multiclass.previousSkills === "object"
        ? clone(value.multiclass.previousSkills)
        : null,
      previousKnacks: value.multiclass?.previousKnacks && typeof value.multiclass.previousKnacks === "object"
        ? clone(value.multiclass.previousKnacks)
        : null,
    } : null,
    secondaryDreamerFocus: Array.isArray(value.secondaryDreamerFocus)
      ? value.secondaryDreamerFocus.slice(0, 3)
      : secondaryArchetypeId === "dreamer" && archetypeId !== "dreamer" ? [...ARCHETYPES.dreamer.defaultCap3] : [],
    dicePoolMaximumIncrease: secondaryArchetypeId ? 1 : 0,
    weapons: Array.isArray(value.weapons) ? value.weapons : [],
    injuries: Array.isArray(value.injuries) ? value.injuries : [],
    equipment: Array.isArray(value.equipment) ? value.equipment : [],
    supernatural: Array.isArray(value.supernatural) ? value.supernatural : [],
    sessionNotes: Array.isArray(value.sessionNotes) ? value.sessionNotes.map((entry) => ({
      rowId: entry?.rowId || uid(),
      date: typeof entry?.date === "string" ? entry.date : "",
      notes: typeof entry?.notes === "string" ? entry.notes : "",
    })) : [],
  };
  const defaults = suggestedSkills(merged.archetype, merged.dreamerFocus);
  merged.skills = Object.fromEntries(ARKHAM_SKILLS.map((skill) => [
    skill.id,
    { ...defaults[skill.id], ...(value.skills?.[skill.id] ?? {}) },
  ]));
  if (merged.multiclass) {
    const caps = combinedArchetypeCaps(merged);
    ARKHAM_SKILLS.forEach((skill) => {
      if (value.skills?.[skill.id]?.max == null) merged.skills[skill.id].max = caps[skill.id];
    });
  }
  merged.knacks = normalizeKnacks(value.knacks, knackSlotCounts(merged));
  return merged;
}

export function skillWarnings(character) {
  return ARKHAM_SKILLS.filter((skill) => Number(character.skills[skill.id].current) < Number(character.skills[skill.id].max)).map((skill) => skill.name);
}

function pdfText(value = "") {
  return String(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00d7/g, "x")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function pdfValue(value, fallback = "None recorded") {
  const normalized = pdfText(value).trim();
  return normalized || fallback;
}

export function arkhamPdfFilename(character) {
  const slug = pdfText(character?.name || "arkham-investigator")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug || "arkham-investigator"}-dossier.pdf`;
}

export function arkhamPdfSections(character) {
  const archetype = ARCHETYPES[character.archetype] ?? ARCHETYPES.seeker;
  const secondaryId = character.multiclass?.archetype;
  const secondary = secondaryId ? ARCHETYPES[secondaryId] : null;
  const personality = byId(PERSONALITY_TRAITS, character.personality) ?? PERSONALITY_TRAITS[0];
  const focused = secondaryId === character.archetype;
  const archetypeName = secondary
    ? focused ? `Focused ${archetype.name}` : `${archetype.name} + ${secondary.name}`
    : archetype.name;
  const selectedKnacks = Object.entries(character.knacks ?? {}).flatMap(([tier, slots]) =>
    (slots ?? []).filter(Boolean).map((name) => ({
      label: `Tier ${tier}: ${name}`,
      value: KNACKS[name] ?? "Rules reference unavailable.",
    })),
  );
  const weapons = (character.weapons ?? []).map((weapon) => ({
    label: weapon.name || "Unnamed weapon",
    value: [
      [weapon.skill && `Skill: ${weapon.skill}`, weapon.damage != null && weapon.damage !== "" && `Damage: ${weapon.damage}`, weapon.injury != null && weapon.injury !== "" && `Injury: ${weapon.injury}`].filter(Boolean).join(" | "),
      [weapon.range && `Range: ${weapon.range}`, weapon.ammunition && `Ammunition: ${weapon.ammoRemaining ?? weapon.ammunition}/${weapon.ammoMax ?? weapon.ammunition}`, weapon.cost && `Cost: ${weapon.cost}`].filter(Boolean).join(" | "),
      weapon.special,
    ].filter(Boolean).join("\n"),
  }));
  const injuries = (character.injuries ?? []).map((entry) => {
    const injury = byId(INJURIES, entry.injuryId);
    return {
      label: `${entry.healed ? "Healed - " : ""}${injury?.name ?? entry.name ?? "Custom effect"}`,
      value: [injury?.roll && `Roll: ${injury.roll}`, injury?.description, entry.notes].filter(Boolean).join("\n"),
    };
  });
  const equipment = (character.equipment ?? []).map((item) => ({
    label: item.name || "Unnamed item",
    value: [
      `Quantity: ${Number(item.quantity ?? 1)}`,
      item.uses != null ? `Uses: ${Number(item.usesRemaining ?? item.uses)}/${Number(item.uses)}` : "",
      item.cost && `Cost: ${item.cost}`,
      item.description,
      item.notes,
    ].filter(Boolean).join(" | "),
  }));
  const supernatural = (character.supernatural ?? []).map((item) => ({
    label: `${item.type || "Supernatural resource"}: ${item.name || "Unnamed"}`,
    value: item.details || "No additional notes.",
  }));
  const sessions = (character.sessionNotes ?? []).map((entry, index) => ({
    label: entry.date ? `Session ${index + 1} - ${entry.date}` : `Session ${index + 1}`,
    value: entry.notes || "No notes recorded.",
  }));

  return [
    {
      title: "Investigator",
      layout: "grid",
      entries: [
        { label: "Character", value: character.name || "Unnamed Investigator" },
        { label: "Player", value: character.player || "Not recorded" },
        { label: "Archetype", value: archetypeName },
        { label: "Personality", value: personality.name },
        { label: "Total XP earned", value: String(Number(character.xpEarned) || 0) },
        { label: "Unused XP", value: String(Number(character.xpUnused) || 0) },
        { label: "Insight limit", value: String(Number(character.insightLimit) || 0) },
        { label: "Insight remaining", value: String(Number(character.insightRemaining) || 0) },
      ],
    },
    {
      title: "Archetype & Personality",
      layout: "list",
      entries: [
        { label: archetypeName, value: archetype.summary },
        { label: personality.name, value: `${personality.description}\nPositive: ${personality.positive}\nNegative: ${personality.negative}` },
        ...(secondary ? [{ label: "Multiclass advancement", value: `Dice pool maximum +${Number(character.dicePoolMaximumIncrease) || 1}; ${Number(character.multiclass.xpSpent) || MULTICLASS_COST} XP spent.` }] : []),
      ],
    },
    {
      title: "Skills",
      layout: "grid",
      entries: ARKHAM_SKILLS.map((skill) => ({
        label: skill.name,
        value: `Current ${Number(character.skills?.[skill.id]?.current ?? 6)}+ | best ${Number(character.skills?.[skill.id]?.max ?? 4)}+`,
      })),
    },
    { title: "Knacks", layout: "list", entries: selectedKnacks.length ? selectedKnacks : [{ label: "Knacks", value: "None selected" }] },
    { title: "Weapons", layout: "list", entries: weapons.length ? weapons : [{ label: "Weapons", value: "None recorded" }] },
    { title: "Injuries & Other Effects", layout: "list", entries: injuries.length ? injuries : [{ label: "Injuries", value: "None recorded" }] },
    {
      title: "Background",
      layout: "list",
      entries: [
        { label: "Place of origin", value: pdfValue(character.background?.origin) },
        { label: "Family and friends", value: pdfValue(character.background?.family) },
        { label: "Employment", value: pdfValue([character.background?.employment, character.background?.salary && `Weekly salary: ${character.background.salary}`].filter(Boolean).join(" | ")) },
        { label: "First supernatural encounter", value: pdfValue(character.background?.encounter) },
        { label: "Notable enemies", value: pdfValue(character.background?.enemies) },
        { label: "Additional background", value: pdfValue(character.background?.notes) },
      ],
    },
    {
      title: "Mundane Resources",
      layout: "list",
      entries: [
        { label: "Money", value: pdfValue(character.money) },
        { label: "Vehicle", value: pdfValue(character.vehicle) },
        { label: "Lodging", value: pdfValue(character.lodging) },
        ...(equipment.length ? equipment : [{ label: "Equipment", value: "None recorded" }]),
      ],
    },
    { title: "Supernatural Resources", layout: "list", entries: supernatural.length ? supernatural : [{ label: "Resources", value: "None recorded" }] },
    { title: "Session Notes", layout: "list", entries: sessions.length ? sessions : [{ label: "Sessions", value: "No session notes yet" }] },
  ];
}

function wrappedPdfLines(text, font, size, maxWidth) {
  const lines = [];
  pdfText(text).split("\n").forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap((word) => {
      if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
      const chunks = [];
      let chunk = "";
      [...word].forEach((character) => {
        const candidate = chunk + character;
        if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          chunks.push(chunk);
          chunk = character;
        } else {
          chunk = candidate;
        }
      });
      if (chunk) chunks.push(chunk);
      return chunks;
    });
    if (!words.length) {
      lines.push("");
      return;
    }
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
  });
  return lines;
}

export async function createArkhamCharacterPdf(character, { pdfLib } = {}) {
  const library = pdfLib ?? await import(PDF_LIB_URL);
  const { PDFDocument, StandardFonts, rgb } = library;
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 44;
  const bottom = 42;
  const contentWidth = pageWidth - (margin * 2);
  const colors = {
    ink: rgb(0.145, 0.192, 0.173),
    green: rgb(0.129, 0.298, 0.263),
    greenDark: rgb(0.082, 0.22, 0.192),
    rust: rgb(0.557, 0.306, 0.204),
    gold: rgb(0.702, 0.58, 0.341),
    paper: rgb(0.973, 0.957, 0.914),
    card: rgb(0.998, 0.99, 0.957),
    line: rgb(0.706, 0.647, 0.51),
    muted: rgb(0.36, 0.4, 0.376),
    white: rgb(1, 1, 1),
  };
  const sections = arkhamPdfSections(character);
  const documentTitle = `${pdfValue(character.name, "Unnamed Investigator")} - Arkham Horror Investigator Dossier`;
  document.setTitle(documentTitle);
  document.setSubject("Arkham Horror investigator dossier");
  document.setCreator("Arkham Horror Character Manager");
  document.setProducer("Arkham Horror Character Manager");

  let page;
  let y;
  let currentSection = "";

  function fittedSize(text, maximum, maxWidth, minimum = 13) {
    let size = maximum;
    while (size > minimum && bold.widthOfTextAtSize(pdfText(text), size) > maxWidth) size -= 1;
    return size;
  }

  function addPage(first = false) {
    page = document.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: colors.paper });
    if (first) {
      page.drawRectangle({ x: 0, y: pageHeight - 108, width: pageWidth, height: 108, color: colors.greenDark });
      page.drawText("INVESTIGATOR ARCHIVE", { x: margin, y: pageHeight - 38, size: 8.5, font: bold, color: colors.gold });
      const name = pdfValue(character.name, "Unnamed Investigator");
      page.drawText(name, { x: margin, y: pageHeight - 77, size: fittedSize(name, 25, contentWidth), font: bold, color: colors.white });
      page.drawText("Arkham Horror investigator dossier", { x: margin, y: pageHeight - 96, size: 9.5, font: regular, color: rgb(0.89, 0.84, 0.72) });
      y = pageHeight - 130;
    } else {
      page.drawText(pdfValue(character.name, "Unnamed Investigator"), { x: margin, y: pageHeight - 35, size: 10, font: bold, color: colors.greenDark });
      page.drawText("INVESTIGATOR DOSSIER", { x: pageWidth - margin - 112, y: pageHeight - 35, size: 7.5, font: bold, color: colors.rust });
      page.drawLine({ start: { x: margin, y: pageHeight - 44 }, end: { x: pageWidth - margin, y: pageHeight - 44 }, thickness: 0.8, color: colors.line });
      y = pageHeight - 64;
    }
  }

  function ensureSpace(height, continued = false) {
    if (y - height >= bottom) return;
    addPage(false);
    if (continued && currentSection) drawSectionHeading(`${currentSection} - continued`, true);
  }

  function drawSectionHeading(title, skipEnsure = false) {
    if (!skipEnsure) ensureSpace(30);
    currentSection = title.replace(/ - continued$/, "");
    page.drawRectangle({ x: margin, y: y - 21, width: 4, height: 21, color: colors.rust });
    page.drawText(pdfText(title).toUpperCase(), { x: margin + 12, y: y - 15, size: 10, font: bold, color: colors.greenDark });
    page.drawLine({ start: { x: margin + 12, y: y - 21 }, end: { x: pageWidth - margin, y: y - 21 }, thickness: 0.6, color: colors.line });
    y -= 31;
  }

  function drawGrid(entries) {
    const gap = 10;
    const cellWidth = (contentWidth - gap) / 2;
    for (let index = 0; index < entries.length; index += 2) {
      const row = entries.slice(index, index + 2);
      const wrapped = row.map((entry) => wrappedPdfLines(entry.value, regular, 9.5, cellWidth - 18));
      const height = Math.max(37, ...wrapped.map((lines) => 22 + (Math.max(1, lines.length) * 11)));
      ensureSpace(height + 7, true);
      row.forEach((entry, column) => {
        const x = margin + (column * (cellWidth + gap));
        page.drawRectangle({ x, y: y - height, width: cellWidth, height, color: colors.card, borderColor: colors.line, borderWidth: 0.55 });
        page.drawText(pdfText(entry.label).toUpperCase(), { x: x + 9, y: y - 13, size: 6.8, font: bold, color: colors.rust });
        wrapped[column].forEach((line, lineIndex) => {
          page.drawText(line || " ", { x: x + 9, y: y - 27 - (lineIndex * 11), size: 9.5, font: regular, color: colors.ink });
        });
      });
      y -= height + 7;
    }
  }

  function drawListEntry(entry) {
    let lines = wrappedPdfLines(pdfValue(entry.value), regular, 9.5, contentWidth - 12);
    let continued = false;
    do {
      ensureSpace(38, true);
      page.drawText(pdfText(`${entry.label}${continued ? " - continued" : ""}`), { x: margin, y: y - 10, size: 9, font: bold, color: colors.greenDark });
      y -= 21;
      while (lines.length && y - 11 >= bottom) {
        const line = lines.shift();
        page.drawText(line || " ", { x: margin + 8, y: y - 8, size: 9.5, font: regular, color: colors.ink });
        y -= 12;
      }
      if (lines.length) {
        addPage(false);
        drawSectionHeading(`${currentSection} - continued`, true);
        continued = true;
      }
    } while (lines.length);
    page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: pageWidth - margin, y: y - 2 }, thickness: 0.35, color: colors.line });
    y -= 10;
  }

  addPage(true);
  sections.forEach((section) => {
    drawSectionHeading(section.title);
    if (section.layout === "grid") drawGrid(section.entries);
    else section.entries.forEach(drawListEntry);
    y -= 6;
  });

  const pages = document.getPages();
  pages.forEach((item, index) => {
    const footer = `ARKHAM HORROR INVESTIGATOR DOSSIER  |  ${index + 1} / ${pages.length}`;
    item.drawLine({ start: { x: margin, y: 29 }, end: { x: pageWidth - margin, y: 29 }, thickness: 0.5, color: colors.line });
    item.drawText(footer, { x: margin, y: 17, size: 6.7, font: bold, color: colors.muted });
  });
  return document.save();
}

function resetArchetype(character, archetypeId) {
  const archetype = ARCHETYPES[archetypeId] ?? ARCHETYPES.seeker;
  character.archetype = archetypeId;
  character.dreamerFocus = archetype.defaultCap3 ? [...archetype.defaultCap3] : [];
  character.secondaryDreamerFocus = [];
  character.multiclass = null;
  character.dicePoolMaximumIncrease = 0;
  character.skills = suggestedSkills(archetypeId, character.dreamerFocus);
  character.knacks = emptyKnacks();
}

function weaponFromCatalog(catalogId) {
  const item = byId(WEAPONS, catalogId);
  if (!item) return null;
  return { ...clone(item), rowId: uid(), ammoRemaining: item.ammoMax };
}

function equipmentFromCatalog(catalogId) {
  const item = byId(MUNDANE_ITEMS, catalogId);
  if (!item) return null;
  return { ...clone(item), rowId: uid(), quantity: 1, usesRemaining: item.uses ?? null };
}

function loadLibrary() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored?.characters) && stored.characters.length) {
      const characters = stored.characters.map(normalizeCharacter);
      return {
        activeId: characters.some((item) => item.id === stored.activeId) ? stored.activeId : characters[0].id,
        characters,
      };
    }
  } catch (error) {
    console.warn("Unable to load Arkham character library", error);
  }
  const first = createCharacter();
  return { activeId: first.id, characters: [first] };
}

function hasStoredLibrary() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored?.characters) && stored.characters.length > 0;
  } catch {
    return false;
  }
}

function activeCharacter(library) {
  return library.characters.find((item) => item.id === library.activeId) ?? library.characters[0];
}

function field(label, input) {
  return `<label class="arkham-field"><span>${escapeHtml(label)}</span>${input}</label>`;
}

function textInput(label, path, character, attributes = "") {
  return field(label, `<input type="text" data-bind="${path}" value="${escapeHtml(pathValue(character, path) ?? "")}" ${attributes}>`);
}

function textarea(label, path, character, rows = 4) {
  return field(label, `<textarea data-bind="${path}" rows="${rows}">${escapeHtml(pathValue(character, path) ?? "")}</textarea>`);
}

function tierLabel(tier) {
  return `Tier ${tier} - ${[0, 3, 6, 10, 15][tier]} XP`;
}

function renderKnackSlot(character, tier, slot) {
  const selected = character.knacks[tier]?.[slot] ?? "";
  const bonusSlot = slot >= TIER_SLOTS[tier];
  const available = availableKnacks(character, tier, bonusSlot);
  const secondaryId = character.multiclass?.archetype;
  const sourceLabel = (knack) => {
    const eligibleArchetypes = bonusSlot && secondaryId ? [secondaryId] : [character.archetype, secondaryId];
    const sources = eligibleArchetypes
      .filter((id, index, ids) => id && ids.indexOf(id) === index && ARCHETYPES[id]?.knacks[tier]?.includes(knack))
      .map((id) => ARCHETYPES[id].name);
    return sources.length > 1 ? `${knack} - ${sources.join(" / ")}` : `${knack} - ${sources[0]}`;
  };
  return `<div class="arkham-knack-row">
    <label class="arkham-field">
      <span>${tierLabel(Number(tier))}${bonusSlot ? ` - ${escapeHtml(ARCHETYPES[secondaryId].name)} multiclass bonus` : ""}</span>
      <select data-knack-tier="${tier}" data-knack-slot="${slot}">
        <option value="">Choose a knack...</option>
        ${options(available, selected, sourceLabel)}
      </select>
    </label>
    ${selected ? `<div class="arkham-reference" role="note"><strong>${escapeHtml(selected)}</strong><p>${escapeHtml(KNACKS[selected] ?? "Rules reference unavailable.")}</p></div>` : ""}
  </div>`;
}

function renderSkills(character) {
  const warnings = new Set(skillWarnings(character));
  const levelOptions = (selected) => options([2, 3, 4, 5, 6], Number(selected), (value) => `${value}+`);
  return `<div class="arkham-skill-table" role="table" aria-label="Character skills">
    <div class="arkham-skill-row arkham-skill-row--head" role="row">
      <span role="columnheader">Skill</span><span role="columnheader">Current</span><span role="columnheader">Minimum / best</span>
    </div>
    ${ARKHAM_SKILLS.map((skill) => {
      const values = character.skills[skill.id];
      const invalid = warnings.has(skill.name);
      return `<div class="arkham-skill-row" role="row" data-invalid="${invalid}">
        <strong role="rowheader">${escapeHtml(skill.name)}</strong>
        <label><span class="sr-only">${escapeHtml(skill.name)} current level</span><select data-bind="skills.${skill.id}.current">${levelOptions(values.current)}</select></label>
        <label><span class="sr-only">${escapeHtml(skill.name)} minimum or best allowed level</span><select data-bind="skills.${skill.id}.max">${levelOptions(values.max)}</select></label>
      </div>`;
    }).join("")}
  </div>
  ${warnings.size ? `<p class="arkham-warning" role="alert">Current level is better than the selected minimum / best value for: ${escapeHtml([...warnings].join(", "))}.</p>` : ""}`;
}

function renderDreamerFocus(character) {
  const roles = [];
  if (character.archetype === "dreamer") roles.push({ key: "primary", label: "Dreamer focus skills", selected: character.dreamerFocus });
  if (character.multiclass?.archetype === "dreamer" && character.archetype !== "dreamer") {
    roles.push({ key: "secondary", label: "Dreamer multiclass focus skills", selected: character.secondaryDreamerFocus });
  }
  if (!roles.length) return "";
  const skillName = (id) => byId(ARKHAM_SKILLS, id)?.name ?? id;
  return roles.map((role) => `<fieldset class="arkham-focus">
    <legend>${role.label}</legend>
    <p>Choose exactly three skills that may improve to 3+. Lore may improve to 2+.</p>
    <div>${ARCHETYPES.dreamer.cap3Options.map((skillId) => `<label>
      <input type="checkbox" data-dreamer-focus="${role.key}" data-focus-skill="${skillId}"${role.selected.includes(skillId) ? " checked" : ""}> ${escapeHtml(skillName(skillId))}
    </label>`).join("")}</div>
  </fieldset>`).join("");
}

function renderMulticlass(character) {
  const eligibility = multiclassEligibility(character);
  const primary = ARCHETYPES[character.archetype];
  if (character.multiclass) {
    const secondary = ARCHETYPES[character.multiclass.archetype];
    const focused = character.multiclass.archetype === character.archetype;
    return `<section class="arkham-multiclass-card is-complete" aria-label="Multiclass advancement">
      <div>
        <span class="arkham-pill">Multiclassed</span>
        <h4>${focused ? `Focused ${escapeHtml(primary.name)}` : `${escapeHtml(primary.name)} + ${escapeHtml(secondary.name)}`}</h4>
        <p>${focused
          ? "Your skill limits remain unchanged. You have two additional tier 1 knack slots and one additional slot in tiers 2, 3, and 4."
          : `You may select knacks from either archetype and use the best skill improvement limit granted by ${escapeHtml(primary.name)} or ${escapeHtml(secondary.name)}. Your two additional tier 1 slots and one additional slot in tiers 2, 3, and 4 use ${escapeHtml(secondary.name)} knacks.`}</p>
      </div>
      <div class="arkham-multiclass-result">
        <dl>
          <div><dt>Multiclass cost</dt><dd>${Number(character.multiclass.xpSpent) || MULTICLASS_COST} XP</dd></div>
          <div><dt>Dice pool maximum</dt><dd>+${Number(character.dicePoolMaximumIncrease) || 1}</dd></div>
        </dl>
        <button type="button" class="arkham-danger arkham-undo-multiclass" data-action="undo-multiclass">Undo multiclass</button>
      </div>
    </section>`;
  }

  const status = !eligibility.spentEnough
    ? `${eligibility.spent} / ${MULTICLASS_MINIMUM_XP} XP already spent - ${eligibility.xpUntilEligible} XP to eligibility.`
    : !eligibility.canAfford
      ? `Experience requirement met. You need ${eligibility.xpNeeded} more unused XP to pay the ${MULTICLASS_COST} XP cost.`
      : `Eligible now. Confirming this advancement spends ${MULTICLASS_COST} unused XP.`;
  return `<section class="arkham-multiclass-card" aria-label="Multiclass advancement">
    <div>
      <span class="arkham-pill">125 XP advancement</span>
      <h4>Multiclass</h4>
      <p>${status}</p>
    </div>
    <div class="arkham-multiclass-action">
      <label class="arkham-field"><span>Second archetype or focused path</span>
        <select id="arkham-multiclass-archetype">${options(ARCHETYPE_IDS, character.archetype, (id) => id === character.archetype ? `${ARCHETYPES[id].name} - remain focused` : ARCHETYPES[id].name)}</select>
      </label>
      <button type="button" data-action="apply-multiclass"${eligibility.canPurchase ? "" : " disabled"}>Spend ${MULTICLASS_COST} XP & multiclass</button>
    </div>
  </section>`;
}

function renderWeaponCard(weapon, index) {
  const pips = weapon.ammoMax > 0 ? `<div class="arkham-ammo" aria-label="${weapon.ammoRemaining} ammunition remaining">
    ${Array.from({ length: weapon.ammoMax }, (_, pip) => `<span data-filled="${pip < weapon.ammoRemaining}" aria-hidden="true"></span>`).join("")}
    <button type="button" class="arkham-mini" data-action="ammo-down" data-index="${index}" aria-label="Spend ammunition">-</button>
    <button type="button" class="arkham-mini" data-action="ammo-up" data-index="${index}" aria-label="Restore ammunition">+</button>
  </div>` : "";
  return `<article class="arkham-item-card">
    <div class="arkham-item-card__head">
      <strong>${escapeHtml(weapon.name)}</strong>
      <button type="button" class="arkham-remove" data-action="remove-weapon" data-index="${index}">Remove</button>
    </div>
    <div class="arkham-weapon-grid">
      ${["name", "skill", "damage", "injury", "range", "ammunition", "cost"].map((key) => field(key === "injury" ? "Injury rating" : key[0].toUpperCase() + key.slice(1), `<input type="text" data-weapon-field="${key}" data-index="${index}" value="${escapeHtml(weapon[key] ?? "")}">`)).join("")}
    </div>
    ${pips}
    ${field("Special rules", `<textarea rows="2" data-weapon-field="special" data-index="${index}">${escapeHtml(weapon.special ?? "")}</textarea>`)}
  </article>`;
}

function renderInjuryCard(entry, index) {
  const injury = byId(INJURIES, entry.injuryId);
  return `<article class="arkham-item-card${entry.healed ? " is-healed" : ""}">
    <div class="arkham-item-card__head">
      <label class="arkham-check"><input type="checkbox" data-injury-field="healed" data-index="${index}"${entry.healed ? " checked" : ""}> Healed</label>
      <button type="button" class="arkham-remove" data-action="remove-injury" data-index="${index}">Remove</button>
    </div>
    ${injury ? `<div class="arkham-reference"><strong>${escapeHtml(injury.name)} <span>(${escapeHtml(injury.roll)})</span></strong><p>${escapeHtml(injury.description)}</p></div>` : ""}
    ${!injury ? field("Effect", `<input type="text" data-injury-field="name" data-index="${index}" value="${escapeHtml(entry.name ?? "")}">`) : ""}
    ${field("Notes", `<textarea rows="2" data-injury-field="notes" data-index="${index}">${escapeHtml(entry.notes ?? "")}</textarea>`)}
  </article>`;
}

function renderEquipmentCard(item, index) {
  return `<article class="arkham-resource-row">
    <div>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${escapeHtml([item.cost, item.description].filter(Boolean).join(" - "))}</small>
    </div>
    <label>Qty <input type="number" min="0" data-equipment-field="quantity" data-index="${index}" value="${Number(item.quantity ?? 1)}"></label>
    ${item.uses != null ? `<label>Uses <input type="number" min="0" max="${item.uses}" data-equipment-field="usesRemaining" data-index="${index}" value="${Number(item.usesRemaining ?? item.uses)}"></label>` : ""}
    <button type="button" class="arkham-remove" data-action="remove-equipment" data-index="${index}">Remove</button>
    ${field("Notes", `<input type="text" data-equipment-field="notes" data-index="${index}" value="${escapeHtml(item.notes ?? "")}">`)}
  </article>`;
}

function renderSupernaturalCard(item, index) {
  return `<article class="arkham-item-card">
    <div class="arkham-item-card__head">
      <span class="arkham-pill">${escapeHtml(item.type)}</span>
      <button type="button" class="arkham-remove" data-action="remove-supernatural" data-index="${index}">Remove</button>
    </div>
    <div class="arkham-two-col">
      ${field("Name", `<input type="text" data-supernatural-field="name" data-index="${index}" value="${escapeHtml(item.name ?? "")}">`)}
      ${field("Type", `<select data-supernatural-field="type" data-index="${index}">${options(SUPERNATURAL_TYPES, item.type)}</select>`)}
    </div>
    ${field("Rules and notes", `<textarea rows="3" data-supernatural-field="details" data-index="${index}">${escapeHtml(item.details ?? "")}</textarea>`)}
  </article>`;
}

function renderSessionNote(entry, index) {
  return `<article class="arkham-session-note">
    <div class="arkham-session-note__head">
      ${field("Session date", `<input type="date" data-session-field="date" data-index="${index}" value="${escapeHtml(entry.date ?? "")}">`)}
      <button type="button" class="arkham-remove" data-action="remove-session-note" data-index="${index}">Remove entry</button>
    </div>
    ${field("Session notes", `<textarea rows="8" data-session-field="notes" data-index="${index}" placeholder="Clues uncovered, people met, unresolved leads, and memorable events...">${escapeHtml(entry.notes ?? "")}</textarea>`)}
  </article>`;
}

function renderPlayFacts(facts) {
  const visible = facts.filter(([, value]) => value !== "" && value != null);
  if (!visible.length) return "";
  return `<dl class="arkham-play-facts">${visible.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function renderPlayDetails({ title, meta = "", body, open = false, className = "" }) {
  return `<details class="arkham-play-detail${className ? ` ${className}` : ""}"${open ? " open" : ""}>
    <summary>
      <span><strong>${escapeHtml(title)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</span>
      <span class="arkham-play-detail__toggle" aria-hidden="true"></span>
    </summary>
    <div class="arkham-play-detail__body">${body}</div>
  </details>`;
}

function renderPlayWeapon(weapon, index) {
  const summary = [
    weapon.damage && `${weapon.damage} damage`,
    weapon.injury && `injury ${weapon.injury}`,
    weapon.skill,
    Number(weapon.ammoMax) > 0 && `ammo ${Number(weapon.ammoRemaining)}/${Number(weapon.ammoMax)}`,
  ].filter(Boolean).join(" · ");
  const ammo = Number(weapon.ammoMax) > 0 ? `<div class="arkham-play-counter" aria-label="${Number(weapon.ammoRemaining)} ammunition remaining out of ${Number(weapon.ammoMax)}">
    <span>Ammunition</span>
    <button type="button" data-action="ammo-down" data-index="${index}" aria-label="Spend ammunition">−</button>
    <strong>${Number(weapon.ammoRemaining)} / ${Number(weapon.ammoMax)}</strong>
    <button type="button" data-action="ammo-up" data-index="${index}" aria-label="Restore ammunition">+</button>
  </div>` : "";
  const special = weapon.special ? `<div class="arkham-play-rule"><strong>Special rules</strong><p>${escapeHtml(weapon.special)}</p></div>` : "";
  return renderPlayDetails({
    title: weapon.name || "Unnamed weapon",
    meta: summary,
    body: `${renderPlayFacts([["Range", weapon.range], ["Ammunition", weapon.ammunition], ["Cost", weapon.cost]])}${ammo}${special || (!ammo ? `<p class="arkham-play-muted">No additional rules recorded.</p>` : "")}`,
  });
}

function renderPlayInjury(entry) {
  const injury = byId(INJURIES, entry.injuryId);
  const title = injury?.name ?? entry.name ?? "Custom effect";
  const meta = entry.healed ? "Healed" : injury?.roll ?? "Active effect";
  const description = injury?.description ? `<div class="arkham-play-rule"><strong>Effect</strong><p>${escapeHtml(injury.description)}</p></div>` : "";
  const notes = entry.notes ? `<div class="arkham-play-rule"><strong>Notes</strong><p>${escapeHtml(entry.notes)}</p></div>` : "";
  return renderPlayDetails({
    title,
    meta,
    body: description || notes ? `${description}${notes}` : `<p class="arkham-play-muted">No rules or notes recorded.</p>`,
    open: !entry.healed,
    className: entry.healed ? "is-resolved" : "is-active-effect",
  });
}

function renderPlayEquipment(item, index) {
  const quantity = Number(item.quantity ?? 1);
  const uses = item.uses != null ? `<div class="arkham-play-counter" aria-label="${Number(item.usesRemaining ?? item.uses)} uses remaining out of ${Number(item.uses)}">
    <span>Uses</span>
    <button type="button" data-action="uses-down" data-index="${index}" aria-label="Spend a use">−</button>
    <strong>${Number(item.usesRemaining ?? item.uses)} / ${Number(item.uses)}</strong>
    <button type="button" data-action="uses-up" data-index="${index}" aria-label="Restore a use">+</button>
  </div>` : "";
  const rules = [item.description, item.notes].filter(Boolean).map((text) => `<p>${escapeHtml(text)}</p>`).join("");
  return renderPlayDetails({
    title: item.name || "Unnamed item",
    meta: [`Qty ${quantity}`, item.uses != null && `uses ${Number(item.usesRemaining ?? item.uses)}/${Number(item.uses)}`, item.cost].filter(Boolean).join(" · "),
    body: `${uses}${rules ? `<div class="arkham-play-rule"><strong>Rules & notes</strong>${rules}</div>` : !uses ? `<p class="arkham-play-muted">No rules or notes recorded.</p>` : ""}`,
  });
}

function renderPlaySupernatural(item) {
  return renderPlayDetails({
    title: item.name || `Unnamed ${String(item.type || "resource").toLowerCase()}`,
    meta: item.type || "Supernatural resource",
    body: item.details ? `<div class="arkham-play-rule"><strong>Rules & notes</strong><p>${escapeHtml(item.details)}</p></div>` : `<p class="arkham-play-muted">No rules or notes recorded.</p>`,
  });
}

export function renderPlayView(character) {
  const archetype = ARCHETYPES[character.archetype] ?? ARCHETYPES.seeker;
  const secondary = character.multiclass?.archetype ? ARCHETYPES[character.multiclass.archetype] : null;
  const archetypeName = secondary && secondary !== archetype
    ? `${archetype.name} + ${secondary.name}`
    : secondary ? `Focused ${archetype.name}` : archetype.name;
  const personality = byId(PERSONALITY_TRAITS, character.personality) ?? PERSONALITY_TRAITS[0];
  const selectedKnacks = Object.entries(character.knacks ?? {}).flatMap(([tier, slots]) => (slots ?? [])
    .filter(Boolean)
    .map((name) => ({ name, tier, rule: KNACKS[name] ?? "No rules reference is available for this knack." })));
  const sessionNotes = [...(character.sessionNotes ?? [])].map((entry, index) => ({ entry, index })).reverse();

  return `<main class="arkham-play-view">
    <nav class="arkham-play-nav" aria-label="Play view sections">
      <a href="#arkham-play-skills">Skills</a><a href="#arkham-play-knacks">Knacks</a><a href="#arkham-play-gear">Gear & effects</a><a href="#arkham-play-notes">Notes</a>
    </nav>

    <section class="arkham-play-overview" aria-label="Investigator at a glance">
      <div class="arkham-play-trackers">
        <article class="arkham-play-tracker arkham-play-tracker--primary">
          <span>Insight remaining</span>
          <div class="arkham-play-tracker__value"><strong>${Number(character.insightRemaining)}</strong><small>/ ${Number(character.insightLimit)}</small></div>
          <div class="arkham-play-counter">
            <button type="button" data-action="insight-down" aria-label="Spend Insight">−</button>
            <span>Adjust</span>
            <button type="button" data-action="insight-up" aria-label="Restore Insight">+</button>
          </div>
        </article>
        <article class="arkham-play-tracker"><span>Unused XP</span><strong>${Number(character.xpUnused)}</strong></article>
        <article class="arkham-play-tracker"><span>Total XP</span><strong>${Number(character.xpEarned)}</strong></article>
        ${Number(character.dicePoolMaximumIncrease) > 0 ? `<article class="arkham-play-tracker"><span>Dice pool maximum</span><strong>+${Number(character.dicePoolMaximumIncrease)}</strong></article>` : ""}
      </div>
      <article class="arkham-play-personality">
        <span class="arkham-pill">${escapeHtml(archetypeName)}</span>
        <h3>${escapeHtml(personality.name)}</h3>
        <p>${escapeHtml(personality.description)}</p>
        <dl><dt>Positive</dt><dd>${escapeHtml(personality.positive)}</dd><dt>Negative</dt><dd>${escapeHtml(personality.negative)}</dd></dl>
      </article>
    </section>

    <section id="arkham-play-skills" class="arkham-play-section arkham-play-section--skills">
      <header><div><p class="arkham-eyebrow">Roll targets</p><h3>Active skills</h3></div><p>Current target first; best purchasable target below.</p></header>
      <div class="arkham-play-skill-grid">${ARKHAM_SKILLS.map((skill) => {
        const current = Number(character.skills?.[skill.id]?.current ?? 6);
        const best = Number(character.skills?.[skill.id]?.max ?? 4);
        return `<article class="arkham-play-skill${current < best ? " is-beyond-limit" : ""}"><span>${escapeHtml(skill.name)}</span><strong>${current}+</strong><small>Best ${best}+</small></article>`;
      }).join("")}</div>
    </section>

    <section id="arkham-play-knacks" class="arkham-play-section">
      <header><div><p class="arkham-eyebrow">Always visible</p><h3>Knacks & rules</h3></div><p>${selectedKnacks.length} selected</p></header>
      <div class="arkham-play-knack-grid">${selectedKnacks.length ? selectedKnacks.map((knack) => `<article class="arkham-play-knack"><div><span>Tier ${escapeHtml(knack.tier)}</span><h4>${escapeHtml(knack.name)}</h4></div><p>${escapeHtml(knack.rule)}</p></article>`).join("") : `<p class="arkham-play-empty">No knacks selected yet. Switch to Edit dossier to add them.</p>`}</div>
    </section>

    <section id="arkham-play-gear" class="arkham-play-section">
      <header><div><p class="arkham-eyebrow">Tap to expand</p><h3>Gear, resources & effects</h3></div><p>Rules stay tucked away until they are needed.</p></header>
      <div class="arkham-play-resources">
        <article><span>Money</span><strong>${escapeHtml(character.money || "—")}</strong></article>
        <article><span>Vehicle</span><strong>${escapeHtml(character.vehicle || "—")}</strong></article>
        <article><span>Lodging</span><strong>${escapeHtml(character.lodging || "—")}</strong></article>
      </div>
      <div class="arkham-play-gear-grid">
        <div><h4>Weapons <span>${character.weapons.length}</span></h4>${character.weapons.length ? character.weapons.map(renderPlayWeapon).join("") : `<p class="arkham-play-empty">No weapons recorded.</p>`}</div>
        <div><h4>Injuries & effects <span>${character.injuries.length}</span></h4>${character.injuries.length ? character.injuries.map(renderPlayInjury).join("") : `<p class="arkham-play-empty">No injuries or effects recorded.</p>`}</div>
        <div><h4>Equipment <span>${character.equipment.length}</span></h4>${character.equipment.length ? character.equipment.map(renderPlayEquipment).join("") : `<p class="arkham-play-empty">No equipment recorded.</p>`}</div>
        <div><h4>Supernatural <span>${character.supernatural.length}</span></h4>${character.supernatural.length ? character.supernatural.map(renderPlaySupernatural).join("") : `<p class="arkham-play-empty">No supernatural resources recorded.</p>`}</div>
      </div>
    </section>

    <section id="arkham-play-notes" class="arkham-play-section">
      <header><div><p class="arkham-eyebrow">Newest first</p><h3>Session notes</h3></div><p>${sessionNotes.length} entries</p></header>
      <div class="arkham-play-note-list">${sessionNotes.length ? sessionNotes.map(({ entry }) => renderPlayDetails({
        title: entry.date || "Undated session",
        meta: "Session notes",
        body: entry.notes ? `<p class="arkham-play-note-text">${escapeHtml(entry.notes)}</p>` : `<p class="arkham-play-muted">No notes recorded.</p>`,
      })).join("") : `<p class="arkham-play-empty">No session notes yet.</p>`}</div>
    </section>
  </main>`;
}

function renderCloudNotice(cloud, library) {
  if (!cloud || cloud.mode === "connected") return "";
  if (cloud.mode === "loading") {
    return `<aside class="arkham-cloud-notice" data-state="loading" role="status"><div><strong>Connecting to your cloud library…</strong><p>Your browser copy remains available while the connection is checked.</p></div></aside>`;
  }
  if (cloud.mode === "signed-out") {
    return `<aside class="arkham-cloud-notice" data-state="signed-out"><div><strong>Your cloud session needs to be reconnected</strong><p>Your characters are still saved in this browser. Sign in through Cloudflare, then you will return here and syncing will resume.</p></div><a class="arkham-cloud-action" href="${CLOUD_LOGIN_URL}">Sign in to Cloudflare</a></aside>`;
  }
  if (cloud.mode === "migration") {
    const count = library.characters.length;
    return `<aside class="arkham-cloud-notice" data-state="migration"><div><strong>Move this browser’s investigators to the cloud?</strong><p>Your cloud library is empty. Upload ${count} ${count === 1 ? "investigator" : "investigators"} so they are available on your other signed-in devices.</p></div><div class="arkham-cloud-notice__actions"><button type="button" data-action="upload-local-to-cloud">Upload to cloud</button><button type="button" data-action="use-browser-only">Not now</button></div></aside>`;
  }
  if (cloud.mode === "conflict") {
    const conflictName = cloud.conflict?.local?.name || cloud.conflict?.cloud?.name || "This investigator";
    const cloudDescription = cloud.conflict?.cloud ? "A newer cloud copy exists." : "The cloud copy was deleted on another device.";
    return `<aside class="arkham-cloud-notice" data-state="conflict" role="alert"><div><strong>${escapeHtml(conflictName)} changed elsewhere</strong><p>${cloudDescription} Choose which copy to keep before more changes are synced.</p></div><div class="arkham-cloud-notice__actions"><button type="button" data-action="load-cloud-copy">${cloud.conflict?.cloud ? "Use cloud copy" : "Accept deletion"}</button><button type="button" data-action="keep-browser-copy">Keep this browser’s copy</button></div></aside>`;
  }
  if (cloud.mode === "offline") {
    return `<aside class="arkham-cloud-notice" data-state="offline"><div><strong>Cloud sync needs attention</strong><p>Changes remain safe in this browser. If your Cloudflare session expired, sign in again; otherwise retry the connection.</p></div><div class="arkham-cloud-notice__actions"><a class="arkham-cloud-action" href="${CLOUD_LOGIN_URL}">Sign in to Cloudflare</a><button type="button" data-action="retry-cloud">Try again</button></div></aside>`;
  }
  if (cloud.mode === "local-only") {
    return `<aside class="arkham-cloud-notice" data-state="local-only"><div><strong>Using this browser only</strong><p>These investigators have not been uploaded. You can connect them to your private cloud library whenever you are ready.</p></div><button type="button" data-action="retry-cloud">Connect to cloud</button></aside>`;
  }
  return "";
}

function renderManager(root, library, message = "Checking cloud library…", viewMode = "edit", cloud = null) {
  const character = activeCharacter(library);
  const archetype = ARCHETYPES[character.archetype];
  const personality = byId(PERSONALITY_TRAITS, character.personality) ?? PERSONALITY_TRAITS[0];
  root.innerHTML = `<div class="arkham-manager__masthead${viewMode === "play" ? " is-play-view" : ""}">
    <div>
      <p class="arkham-eyebrow">${viewMode === "play" ? "At the table" : "Investigator archive"}</p>
      <h2>${escapeHtml(character.name || "Unnamed Investigator")}</h2>
      <p>${viewMode === "play" ? "A compact reference for active rolls, rules, gear, and notes." : "Build, update, and reference your investigator at the table. Signed-in changes sync across your devices automatically."}</p>
    </div>
    <div class="arkham-sigil" aria-hidden="true"><span></span></div>
  </div>

  <div class="arkham-library" aria-label="Character library controls">
    <label><span>Active dossier</span><select id="arkham-active-character">${library.characters.map((item) => `<option value="${item.id}"${item.id === character.id ? " selected" : ""}>${escapeHtml(item.name || "Unnamed Investigator")}</option>`).join("")}</select></label>
    <div class="arkham-view-switcher" aria-label="Dossier view">
      <span>View</span>
      <div><button type="button" data-action="show-play-view" aria-pressed="${viewMode === "play"}">Play</button><button type="button" data-action="show-edit-view" aria-pressed="${viewMode === "edit"}">Edit dossier</button></div>
    </div>
    <div class="arkham-actions">
      <button type="button" data-action="new-character">New</button>
      <button type="button" data-action="duplicate-character">Duplicate</button>
      <button type="button" data-action="export-character">Export JSON</button>
      <button type="button" data-action="import-character">Import</button>
      <button type="button" data-action="download-pdf">Download PDF</button>
      <button type="button" class="arkham-danger" data-action="delete-character"${library.characters.length === 1 ? " disabled" : ""}>Delete</button>
    </div>
    <span id="arkham-save-status" class="arkham-save-status" data-state="${escapeHtml(cloud?.saveState ?? cloud?.mode ?? "local")}" role="status">${escapeHtml(message)}</span>
    <input id="arkham-import-file" type="file" accept="application/json,.json" hidden>
  </div>

  ${renderCloudNotice(cloud, library)}

  ${viewMode === "play" ? renderPlayView(character) : `<nav class="arkham-section-nav" aria-label="Character sheet sections">
    ${[["identity", "Identity"], ["skills", "Skills"], ["knacks", "Knacks"], ["weapons", "Weapons"], ["injuries", "Injuries"], ["background", "Background"], ["resources", "Resources"], ["sessions", "Sessions"]].map(([id, label]) => `<a href="#arkham-${id}">${label}</a>`).join("")}
  </nav>

  <form class="arkham-sheet" autocomplete="off">
    <section id="arkham-identity" class="arkham-panel arkham-panel--identity">
      <div class="arkham-section-heading"><span>01</span><div><h3>Identity & play trackers</h3><p>The details you reach for most often during a session.</p></div></div>
      <div class="arkham-identity-grid">
        ${textInput("Character name", "name", character)}
        ${textInput("Player name", "player", character)}
        ${field("Archetype", `<select id="arkham-archetype"${character.multiclass ? " disabled" : ""}>${options(ARCHETYPE_IDS, character.archetype, (id) => `${ARCHETYPES[id].name}${ARCHETYPES[id].source ? " - Kingsport" : ""}`)}</select>`)}
        ${field("Personality", `<select id="arkham-personality">${options(PERSONALITY_TRAITS.map((item) => item.id), character.personality, (id) => byId(PERSONALITY_TRAITS, id).name)}</select>`)}
      </div>
      <div class="arkham-trackers">
        ${field("Total XP earned", `<input type="number" min="0" data-bind="xpEarned" value="${Number(character.xpEarned)}">`)}
        ${field("Unused XP", `<input type="number" min="0" data-bind="xpUnused" value="${Number(character.xpUnused)}">`)}
        ${field("Insight limit", `<input type="number" min="0" max="10" data-bind="insightLimit" value="${Number(character.insightLimit)}">`)}
        ${field("Insight remaining", `<input type="number" min="0" max="10" data-bind="insightRemaining" value="${Number(character.insightRemaining)}">`)}
      </div>
      <div class="arkham-two-col arkham-live-reference">
        <article class="arkham-reference"><span class="arkham-pill">${escapeHtml(archetype.source ?? "Core Rulebook")}</span><h4>${escapeHtml(archetype.name)}</h4><p>${escapeHtml(archetype.summary)}</p></article>
        <article class="arkham-reference"><h4>${escapeHtml(personality.name)}</h4><p>${escapeHtml(personality.description)}</p><dl><dt>Positive</dt><dd>${escapeHtml(personality.positive)}</dd><dt>Negative</dt><dd>${escapeHtml(personality.negative)}</dd></dl></article>
      </div>
      ${renderMulticlass(character)}
    </section>

    <section id="arkham-skills" class="arkham-panel">
      <div class="arkham-section-heading"><span>02</span><div><h3>Skills</h3><p>Current is what you roll against. Minimum / best is the lowest target number this archetype can normally purchase.</p></div><button type="button" data-action="reset-skills">Reset suggested values</button></div>
      ${renderDreamerFocus(character)}
      ${renderSkills(character)}
      <p class="arkham-footnote">Suggested starting values place the archetype's 2+ skill at 4+, its three 3+ skills at 5+, and every other skill at 6+. The rulebook allows the one 4+ and three 5+ starting improvements to be assigned differently.</p>
    </section>

    <section id="arkham-knacks" class="arkham-panel">
      <div class="arkham-section-heading"><span>03</span><div><h3>Knacks</h3><p>${character.multiclass?.archetype && character.multiclass.archetype !== character.archetype ? "Options include both archetypes" : "Options are filtered to your archetype"}; rules appear as soon as you choose one.</p></div></div>
      <div class="arkham-knacks">${Object.entries(knackSlotCounts(character)).flatMap(([tier, count]) => Array.from({ length: count }, (_, slot) => renderKnackSlot(character, tier, slot))).join("")}</div>
    </section>

    <section id="arkham-weapons" class="arkham-panel">
      <div class="arkham-section-heading"><span>04</span><div><h3>Weapons</h3><p>Add a common weapon, then customize any field. Ammunition pips are live play trackers.</p></div></div>
      <div class="arkham-add-row"><label><span>Common weapon</span><select id="arkham-weapon-picker"><option value="">Choose a weapon...</option>${options(WEAPONS.map((item) => item.id), "", (id) => byId(WEAPONS, id).name)}</select></label><button type="button" data-action="add-weapon">Add weapon</button><button type="button" data-action="add-custom-weapon">Add custom</button></div>
      <div class="arkham-card-list">${character.weapons.length ? character.weapons.map(renderWeaponCard).join("") : `<p class="arkham-empty">No weapons recorded.</p>`}</div>
    </section>

    <section id="arkham-injuries" class="arkham-panel">
      <div class="arkham-section-heading"><span>05</span><div><h3>Injuries & other effects</h3><p>Pick a known injury for its live rules, or add a custom condition.</p></div></div>
      <div class="arkham-add-row"><label><span>Injury</span><select id="arkham-injury-picker"><option value="">Choose an injury...</option>${options(INJURIES.map((item) => item.id), "", (id) => { const item = byId(INJURIES, id); return `${item.roll}: ${item.name}`; })}</select></label><button type="button" data-action="add-injury">Add injury</button><button type="button" data-action="add-custom-injury">Add custom effect</button></div>
      <div class="arkham-card-list">${character.injuries.length ? character.injuries.map(renderInjuryCard).join("") : `<p class="arkham-empty">No injuries or ongoing effects recorded.</p>`}</div>
    </section>

    <section id="arkham-background" class="arkham-panel">
      <div class="arkham-section-heading"><span>06</span><div><h3>Background</h3><p>Freeform history and connections for the investigator and GM.</p></div></div>
      <div class="arkham-two-col">
        ${textarea("Place of origin", "background.origin", character, 4)}
        ${textarea("Family and friends", "background.family", character, 4)}
        ${textInput("Employment", "background.employment", character)}
        ${textInput("Weekly salary", "background.salary", character)}
        ${textarea("First supernatural encounter", "background.encounter", character, 5)}
        ${textarea("Notable enemies", "background.enemies", character, 5)}
      </div>
      ${textarea("Additional background", "background.notes", character, 7)}
    </section>

    <section id="arkham-resources" class="arkham-panel">
      <div class="arkham-section-heading"><span>07</span><div><h3>Resources</h3><p>Use the catalog for common gear and free text for anything unusual or campaign-specific.</p></div></div>
      <div class="arkham-resource-columns">
        <div>
          <h4>Mundane resources</h4>
          <div class="arkham-two-col">${textInput("Money", "money", character)}${textInput("Vehicle", "vehicle", character)}${textInput("Lodging", "lodging", character)}</div>
          <div class="arkham-add-row"><label><span>Common item</span><select id="arkham-equipment-picker"><option value="">Choose an item...</option>${options(MUNDANE_ITEMS.map((item) => item.id), "", (id) => byId(MUNDANE_ITEMS, id).name)}</select></label><input id="arkham-custom-equipment" type="text" placeholder="Or enter a custom item"><button type="button" data-action="add-equipment">Add item</button></div>
          <div class="arkham-card-list">${character.equipment.length ? character.equipment.map(renderEquipmentCard).join("") : `<p class="arkham-empty">No equipment recorded.</p>`}</div>
        </div>
        <div>
          <h4>Supernatural resources</h4>
          <div class="arkham-add-row"><label><span>Type</span><select id="arkham-supernatural-type">${options(SUPERNATURAL_TYPES, SUPERNATURAL_TYPES[0])}</select></label><input id="arkham-supernatural-name" type="text" placeholder="Name the tome, relic, debt, or favor"><button type="button" data-action="add-supernatural">Add resource</button></div>
          <div class="arkham-card-list">${character.supernatural.length ? character.supernatural.map(renderSupernaturalCard).join("") : `<p class="arkham-empty">No supernatural resources recorded.</p>`}</div>
        </div>
      </div>
    </section>

    <section id="arkham-sessions" class="arkham-panel">
      <div class="arkham-section-heading"><span>08</span><div><h3>Session notes</h3><p>Keep a dated campaign journal with this investigator. Entries sync with the dossier and remain included in exports.</p></div><button type="button" data-action="add-session-note">Add session</button></div>
      <div class="arkham-session-notes">${character.sessionNotes.length ? character.sessionNotes.map(renderSessionNote).join("") : `<p class="arkham-empty">No session notes yet.</p>`}</div>
    </section>
  </form>`}`;
}

async function initManager(root) {
  const hadLocalLibrary = hasStoredLibrary();
  let library = loadLibrary();
  let cachedSync = {};
  try {
    cachedSync = JSON.parse(localStorage.getItem(CLOUD_SYNC_KEY)) ?? {};
  } catch (error) {
    console.warn("Unable to load Arkham cloud sync state", error);
  }
  const cloud = {
    mode: "loading",
    saveState: "loading",
    versions: new Map(Object.entries(cachedSync.versions ?? {}).map(([id, version]) => [id, Number(version) || 0])),
    dirty: new Set(Array.isArray(cachedSync.dirtyIds) ? cachedSync.dirtyIds : []),
    deleted: new Set(Array.isArray(cachedSync.deletedIds) ? cachedSync.deletedIds : []),
    initialized: Boolean(cachedSync.initialized),
    conflict: null,
    saveTimer: null,
    saving: false,
  };
  let saveMessage = "Checking cloud library…";
  let viewMode = "edit";
  try {
    viewMode = localStorage.getItem(VIEW_MODE_KEY) === "play" ? "play" : "edit";
  } catch (error) {
    console.warn("Unable to load Arkham character view preference", error);
  }

  function setViewMode(mode) {
    viewMode = mode === "play" ? "play" : "edit";
    try {
      localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch (error) {
      console.warn("Unable to save Arkham character view preference", error);
    }
  }

  function persistCloudState() {
    try {
      localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify({
        initialized: cloud.initialized,
        versions: Object.fromEntries(cloud.versions),
        dirtyIds: [...cloud.dirty],
        deletedIds: [...cloud.deleted],
      }));
    } catch (error) {
      console.warn("Unable to save Arkham cloud sync state", error);
    }
  }

  function setStatus(message, state = cloud.saveState) {
    saveMessage = message;
    cloud.saveState = state;
    const status = root.querySelector("#arkham-save-status");
    if (status) {
      status.textContent = message;
      status.dataset.state = state;
    }
  }

  function storeLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      return true;
    } catch (error) {
      console.warn("Unable to save Arkham character library", error);
      setStatus("Could not save in this browser", "error");
      return false;
    }
  }

  function scheduleRemoteSave() {
    if (cloud.mode !== "connected") return;
    clearTimeout(cloud.saveTimer);
    setStatus("Saving to cloud…", "saving");
    cloud.saveTimer = setTimeout(() => flushRemoteChanges(), CLOUD_SAVE_DELAY);
  }

  function save(message = "Changes saved", { dirty = true, characterId = activeCharacter(library).id } = {}) {
    if (dirty) {
      const character = library.characters.find((item) => item.id === characterId);
      if (character) character.updatedAt = new Date().toISOString();
      cloud.dirty.add(characterId);
      cloud.deleted.delete(characterId);
      persistCloudState();
    }
    if (!storeLocal()) return;
    if (dirty && cloud.mode === "connected") {
      scheduleRemoteSave();
      return;
    }
    const suffix = cloud.mode === "migration" ? " · cloud upload pending"
      : cloud.mode === "signed-out" ? " · sign in to sync"
        : cloud.mode === "offline" ? " · waiting for cloud"
          : cloud.mode === "local-only" ? " · browser only" : "";
    setStatus(`${message}${suffix}`, dirty ? "local" : cloud.saveState);
  }

  function renderCurrent(message = saveMessage) {
    renderManager(root, library, message, viewMode, cloud);
  }

  function rerender(message, options = {}) {
    const y = window.scrollY;
    renderManager(root, library, message, viewMode, cloud);
    window.scrollTo({ top: y });
    save(message, options);
  }

  function cloudCharacterUrl(characterId) {
    return `${CLOUD_API_URL}/${encodeURIComponent(characterId)}`;
  }

  async function responseJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  function cloudFetch(url, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("X-Requested-With", "XMLHttpRequest");
    return fetch(url, {
      ...options,
      cache: "no-store",
      credentials: "same-origin",
      headers,
    });
  }

  function needsCloudSignIn(response) {
    if (response.status === 401 || response.redirected) return true;
    const contentType = response.headers.get("content-type") || "";
    return response.ok && !contentType.toLowerCase().includes("application/json");
  }

  function disconnectCloud(mode, message) {
    cloud.mode = mode;
    cloud.saveState = mode === "signed-out" ? "local" : "error";
    clearTimeout(cloud.saveTimer);
    persistCloudState();
    renderCurrent(message);
  }

  async function flushRemoteChanges() {
    if (cloud.saving || cloud.mode !== "connected") return;
    cloud.saving = true;
    clearTimeout(cloud.saveTimer);
    setStatus("Saving to cloud…", "saving");
    let latestSavedAt = null;
    try {
      for (const characterId of [...cloud.deleted]) {
        const response = await cloudFetch(cloudCharacterUrl(characterId), { method: "DELETE" });
        if (needsCloudSignIn(response)) {
          disconnectCloud("signed-out", "Saved in this browser · sign in to sync");
          return;
        }
        if (!response.ok) throw new Error(`Delete failed with ${response.status}`);
        cloud.deleted.delete(characterId);
        cloud.versions.delete(characterId);
      }

      for (const characterId of [...cloud.dirty]) {
        const character = library.characters.find((item) => item.id === characterId);
        if (!character) {
          cloud.dirty.delete(characterId);
          continue;
        }
        const snapshotUpdatedAt = character.updatedAt;
        const response = await cloudFetch(cloudCharacterUrl(characterId), {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ character, version: cloud.versions.get(characterId) ?? 0 }),
        });
        const result = await responseJson(response);
        if (needsCloudSignIn(response)) {
          disconnectCloud("signed-out", "Saved in this browser · sign in to sync");
          return;
        }
        if (response.status === 409 && result.conflict) {
          cloud.conflict = {
            id: characterId,
            local: clone(character),
            cloud: result.character ? normalizeCharacter(result.character) : null,
            version: Number(result.version || 0),
          };
          cloud.mode = "conflict";
          cloud.saveState = "conflict";
          persistCloudState();
          renderCurrent("Sync paused · choose which copy to keep");
          return;
        }
        if (!response.ok) throw new Error(result.error || `Save failed with ${response.status}`);
        cloud.versions.set(characterId, Number(result.version || 0));
        latestSavedAt = result.updatedAt || latestSavedAt;
        if (library.characters.find((item) => item.id === characterId)?.updatedAt === snapshotUpdatedAt) {
          cloud.dirty.delete(characterId);
        }
      }
      persistCloudState();
      setStatus(`Saved to cloud${latestSavedAt ? ` · ${localDateTime(latestSavedAt)}` : ""}`, "saved");
    } catch (error) {
      console.warn("Unable to sync Arkham investigators", error);
      disconnectCloud("offline", "Saved in this browser · cloud unavailable");
    } finally {
      cloud.saving = false;
      if (cloud.mode === "connected" && (cloud.dirty.size || cloud.deleted.size)) scheduleRemoteSave();
    }
  }

  async function connectCloud() {
    cloud.mode = "loading";
    cloud.saveState = "loading";
    renderCurrent("Checking cloud library…");
    try {
      const response = await cloudFetch(CLOUD_API_URL);
      if (needsCloudSignIn(response)) {
        disconnectCloud("signed-out", "Saved in this browser · sign in to sync");
        return;
      }
      const result = await responseJson(response);
      if (!response.ok) throw new Error(result.error || `Load failed with ${response.status}`);
      const entries = Array.isArray(result.characters) ? result.characters
        .filter((entry) => entry?.character)
        .map((entry) => ({
          character: normalizeCharacter(entry.character),
          version: Number(entry.version || 0),
          updatedAt: entry.updatedAt,
        })) : [];

      if (!entries.length && !cloud.initialized && hadLocalLibrary) {
        cloud.mode = "migration";
        cloud.saveState = "local";
        renderCurrent("Saved in this browser · ready to upload");
        return;
      }

      const priorVersions = new Map(cloud.versions);
      const localById = new Map(library.characters.map((character) => [character.id, character]));
      const remoteById = new Map(entries.map((entry) => [entry.character.id, entry]));
      const merged = [];
      let firstConflict = null;
      cloud.versions = new Map(entries.map((entry) => [entry.character.id, entry.version]));

      for (const entry of entries) {
        const id = entry.character.id;
        if (cloud.deleted.has(id)) continue;
        const local = localById.get(id);
        if (local && cloud.dirty.has(id)) {
          if ((priorVersions.get(id) ?? 0) !== entry.version && !firstConflict) {
            firstConflict = { id, local: clone(local), cloud: entry.character, version: entry.version };
          }
          merged.push(local);
        } else {
          merged.push(entry.character);
        }
      }

      for (const local of library.characters) {
        if (remoteById.has(local.id) || cloud.deleted.has(local.id) || !cloud.dirty.has(local.id)) continue;
        if ((priorVersions.get(local.id) ?? 0) > 0 && !firstConflict) {
          firstConflict = { id: local.id, local: clone(local), cloud: null, version: 0 };
        }
        merged.push(local);
      }

      if (!merged.length) merged.push(createCharacter());
      const activeId = merged.some((character) => character.id === library.activeId) ? library.activeId : merged[0].id;
      library = { activeId, characters: merged };
      cloud.initialized = true;
      cloud.conflict = firstConflict;
      cloud.mode = firstConflict ? "conflict" : "connected";
      cloud.saveState = firstConflict ? "conflict" : "saved";
      storeLocal();
      persistCloudState();
      const latest = entries.map((entry) => entry.updatedAt).filter(Boolean).sort().at(-1);
      renderCurrent(firstConflict ? "Sync paused · choose which copy to keep" : entries.length ? `Loaded from cloud${latest ? ` · ${localDateTime(latest)}` : ""}` : "Cloud library ready");
      if (!firstConflict && (cloud.dirty.size || cloud.deleted.size)) flushRemoteChanges();
    } catch (error) {
      console.warn("Unable to load Arkham cloud library", error);
      disconnectCloud("offline", "Using the copy saved in this browser");
    }
  }

  function updateBoundField(target) {
    const path = target.dataset.bind;
    if (!path) return false;
    const numeric = target.type === "number" || target.tagName === "SELECT" && /^skills\./.test(path);
    setPath(activeCharacter(library), path, numeric ? Number(target.value) : target.value);
    if (path === "name") {
      const heading = root.querySelector(".arkham-manager__masthead h2");
      const selected = root.querySelector("#arkham-active-character option:checked");
      if (heading) heading.textContent = target.value || "Unnamed Investigator";
      if (selected) selected.textContent = target.value || "Unnamed Investigator";
    }
    save();
    return true;
  }

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (updateBoundField(target)) return;
    const character = activeCharacter(library);
    for (const [attribute, collection] of [["weaponField", "weapons"], ["injuryField", "injuries"], ["equipmentField", "equipment"], ["supernaturalField", "supernatural"], ["sessionField", "sessionNotes"]]) {
      const key = target.dataset[attribute];
      if (!key) continue;
      const row = character[collection][Number(target.dataset.index)];
      if (!row) return;
      row[key] = target.type === "checkbox" ? target.checked : target.type === "number" ? Number(target.value) : target.value;
      save();
      return;
    }
  });

  root.addEventListener("change", async (event) => {
    const target = event.target;
    const character = activeCharacter(library);
    if (target.id === "arkham-active-character") {
      library.activeId = target.value;
      rerender("Dossier opened", { dirty: false });
      return;
    }
    if (target.id === "arkham-archetype") {
      resetArchetype(character, target.value);
      rerender("Archetype defaults applied");
      return;
    }
    if (target.id === "arkham-personality") {
      character.personality = target.value;
      rerender("Personality reference updated");
      return;
    }
    if (target.dataset.dreamerFocus) {
      const role = target.dataset.dreamerFocus;
      const skillId = target.dataset.focusSkill;
      const focusKey = role === "secondary" ? "secondaryDreamerFocus" : "dreamerFocus";
      const next = new Set(character[focusKey]);
      if (target.checked && next.size >= 3) {
        target.checked = false;
        root.querySelector("#arkham-save-status").textContent = "Dreamers choose exactly three focus skills";
        return;
      }
      target.checked ? next.add(skillId) : next.delete(skillId);
      character[focusKey] = [...next];
      syncSkillLimits(character);
      rerender(character[focusKey].length === 3 ? "Dreamer focus updated" : "Choose one more Dreamer focus skill");
      return;
    }
    if (target.dataset.knackTier) {
      character.knacks[target.dataset.knackTier][Number(target.dataset.knackSlot)] = target.value;
      rerender("Knack reference updated");
      return;
    }
    if (target.dataset.bind) {
      updateBoundField(target);
      if (/^skills\./.test(target.dataset.bind)) rerender("Skill values updated");
      if (["xpEarned", "xpUnused"].includes(target.dataset.bind)) rerender("Experience updated");
      return;
    }
    if (target.dataset.injuryField || target.dataset.equipmentField || target.dataset.supernaturalField || target.dataset.sessionField) {
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (target.id === "arkham-import-file" && target.files?.[0]) {
      try {
        const imported = normalizeCharacter(JSON.parse(await target.files[0].text()));
        imported.id = uid();
        imported.name = imported.name || "Imported Investigator";
        library.characters.push(imported);
        library.activeId = imported.id;
        rerender("Imported dossier saved");
      } catch (error) {
        console.warn(error);
        root.querySelector("#arkham-save-status").textContent = "That file is not a valid dossier";
      }
    }
  });

  root.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const character = activeCharacter(library);
    const index = Number(button.dataset.index);

    if (action === "upload-local-to-cloud") {
      cloud.initialized = true;
      cloud.mode = "connected";
      cloud.saveState = "saving";
      cloud.versions.clear();
      library.characters.forEach((item) => cloud.dirty.add(item.id));
      persistCloudState();
      renderCurrent("Uploading investigators to the cloud…");
      flushRemoteChanges();
    } else if (action === "use-browser-only") {
      cloud.mode = "local-only";
      cloud.saveState = "local";
      renderCurrent("Saved in this browser · cloud upload postponed");
    } else if (action === "retry-cloud") {
      connectCloud();
    } else if (action === "load-cloud-copy" && cloud.conflict) {
      const { id, cloud: cloudCharacter, version } = cloud.conflict;
      const localIndex = library.characters.findIndex((item) => item.id === id);
      if (cloudCharacter) {
        if (localIndex >= 0) library.characters.splice(localIndex, 1, normalizeCharacter(cloudCharacter));
        else library.characters.push(normalizeCharacter(cloudCharacter));
        cloud.versions.set(id, version);
      } else if (localIndex >= 0) {
        library.characters.splice(localIndex, 1);
        cloud.versions.delete(id);
      }
      cloud.dirty.delete(id);
      if (!library.characters.length) library.characters.push(createCharacter());
      if (!library.characters.some((item) => item.id === library.activeId)) library.activeId = library.characters[0].id;
      cloud.conflict = null;
      cloud.mode = "connected";
      cloud.saveState = "saved";
      storeLocal();
      persistCloudState();
      renderCurrent(cloudCharacter ? "Cloud copy loaded" : "Cloud deletion accepted");
      if (cloud.dirty.size || cloud.deleted.size) flushRemoteChanges();
    } else if (action === "keep-browser-copy" && cloud.conflict) {
      const { id, version } = cloud.conflict;
      cloud.versions.set(id, version);
      cloud.dirty.add(id);
      cloud.conflict = null;
      cloud.mode = "connected";
      cloud.saveState = "saving";
      persistCloudState();
      renderCurrent("Keeping this browser’s copy · saving to cloud…");
      flushRemoteChanges();
    } else if (action === "show-play-view" || action === "show-edit-view") {
      setViewMode(action === "show-play-view" ? "play" : "edit");
      rerender(viewMode === "play" ? "Play view ready" : "Edit view ready", { dirty: false });
    } else if (action === "new-character") {
      const created = createCharacter(`Investigator ${library.characters.length + 1}`);
      library.characters.push(created);
      library.activeId = created.id;
      setViewMode("edit");
      rerender("New dossier created");
    } else if (action === "duplicate-character") {
      const copied = normalizeCharacter(clone(character));
      copied.id = uid();
      copied.name = `${character.name || "Unnamed Investigator"} - copy`;
      library.characters.push(copied);
      library.activeId = copied.id;
      rerender("Dossier duplicated");
    } else if (action === "delete-character" && library.characters.length > 1) {
      const destination = cloud.mode === "connected" ? "the cloud and this browser" : "this browser";
      if (!window.confirm(`Delete ${character.name || "this investigator"} from ${destination}?`)) return;
      cloud.deleted.add(character.id);
      cloud.dirty.delete(character.id);
      library.characters = library.characters.filter((item) => item.id !== character.id);
      library.activeId = library.characters[0].id;
      persistCloudState();
      rerender("Dossier deleted", { dirty: false });
      if (cloud.mode === "connected") flushRemoteChanges();
    } else if (action === "export-character") {
      const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${(character.name || "arkham-investigator").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      save("Dossier exported", { dirty: false });
    } else if (action === "import-character") {
      root.querySelector("#arkham-import-file").click();
    } else if (action === "download-pdf") {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      root.querySelector("#arkham-save-status").textContent = "Generating PDF...";
      try {
        const bytes = await createArkhamCharacterPdf(character);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = arkhamPdfFilename(character);
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        save("PDF downloaded", { dirty: false });
      } catch (error) {
        console.error(error);
        root.querySelector("#arkham-save-status").textContent = "The PDF could not be generated; reload and try again";
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    } else if (action === "apply-multiclass") {
      const secondaryArchetypeId = root.querySelector("#arkham-multiclass-archetype")?.value;
      const secondary = ARCHETYPES[secondaryArchetypeId];
      if (!secondary) return;
      const focused = secondaryArchetypeId === character.archetype;
      const description = focused
        ? `Remain focused on ${secondary.name}, spend ${MULTICLASS_COST} XP, increase the dice pool maximum by 1, and add the bonus knack slots?`
        : `Add ${secondary.name} as a second archetype, spend ${MULTICLASS_COST} XP, and increase the dice pool maximum by 1?`;
      if (!window.confirm(description)) return;
      const result = applyMulticlass(character, secondaryArchetypeId);
      if (!result.ok) {
        root.querySelector("#arkham-save-status").textContent = "Multiclass requirements are not currently met";
        return;
      }
      rerender(focused ? "Focused multiclass purchased" : `${secondary.name} multiclass purchased`);
    } else if (action === "undo-multiclass") {
      const refund = Number(character.multiclass?.xpSpent) || MULTICLASS_COST;
      if (!window.confirm(`Undo this multiclass, refund ${refund} XP, and restore the skill limits and knack selections from before the advancement?`)) return;
      const result = undoMulticlass(character);
      if (!result.ok) return;
      rerender(`Multiclass undone; ${result.refundedXp} XP refunded`);
    } else if (action === "reset-skills") {
      character.skills = suggestedCharacterSkills(character);
      rerender("Suggested skill values restored");
    } else if (action === "add-weapon") {
      const selected = root.querySelector("#arkham-weapon-picker").value;
      const weapon = weaponFromCatalog(selected);
      if (!weapon) return;
      character.weapons.push(weapon);
      rerender("Weapon added");
    } else if (action === "add-custom-weapon") {
      character.weapons.push({ rowId: uid(), id: "custom", name: "Custom weapon", skill: "", damage: "", injury: "", range: "", ammunition: "", ammoMax: 0, ammoRemaining: 0, cost: "", special: "" });
      rerender("Custom weapon added");
    } else if (action === "remove-weapon") {
      character.weapons.splice(index, 1);
      rerender("Weapon removed");
    } else if (action === "ammo-down" || action === "ammo-up") {
      const weapon = character.weapons[index];
      if (!weapon) return;
      const delta = action === "ammo-up" ? 1 : -1;
      weapon.ammoRemaining = Math.max(0, Math.min(weapon.ammoMax, Number(weapon.ammoRemaining) + delta));
      if (viewMode === "play") {
        const counter = button.closest(".arkham-play-counter");
        const value = counter?.querySelector("strong");
        if (value) value.textContent = `${Number(weapon.ammoRemaining)} / ${Number(weapon.ammoMax)}`;
        if (counter) counter.setAttribute("aria-label", `${Number(weapon.ammoRemaining)} ammunition remaining out of ${Number(weapon.ammoMax)}`);
        save("Ammunition updated");
      } else {
        rerender("Ammunition updated");
      }
    } else if (action === "insight-down" || action === "insight-up") {
      const delta = action === "insight-up" ? 1 : -1;
      character.insightRemaining = Math.max(0, Math.min(Number(character.insightLimit) || 0, Number(character.insightRemaining) + delta));
      const value = button.closest(".arkham-play-tracker")?.querySelector(".arkham-play-tracker__value strong");
      if (value) value.textContent = Number(character.insightRemaining);
      save("Insight updated");
    } else if (action === "uses-down" || action === "uses-up") {
      const item = character.equipment[index];
      if (!item || item.uses == null) return;
      const delta = action === "uses-up" ? 1 : -1;
      item.usesRemaining = Math.max(0, Math.min(Number(item.uses), Number(item.usesRemaining ?? item.uses) + delta));
      const counter = button.closest(".arkham-play-counter");
      const value = counter?.querySelector("strong");
      if (value) value.textContent = `${Number(item.usesRemaining)} / ${Number(item.uses)}`;
      if (counter) counter.setAttribute("aria-label", `${Number(item.usesRemaining)} uses remaining out of ${Number(item.uses)}`);
      save("Item uses updated");
    } else if (action === "add-injury") {
      const injuryId = root.querySelector("#arkham-injury-picker").value;
      if (!byId(INJURIES, injuryId)) return;
      character.injuries.push({ rowId: uid(), injuryId, notes: "", healed: false });
      rerender("Injury added");
    } else if (action === "add-custom-injury") {
      character.injuries.push({ rowId: uid(), injuryId: "custom", name: "Custom effect", notes: "", healed: false });
      rerender("Custom effect added");
    } else if (action === "remove-injury") {
      character.injuries.splice(index, 1);
      rerender("Injury removed");
    } else if (action === "add-equipment") {
      const catalogId = root.querySelector("#arkham-equipment-picker").value;
      const customName = root.querySelector("#arkham-custom-equipment").value.trim();
      const item = customName ? { rowId: uid(), id: "custom", name: customName, cost: "", description: "", quantity: 1, usesRemaining: null, notes: "" } : equipmentFromCatalog(catalogId);
      if (!item) return;
      character.equipment.push(item);
      rerender("Equipment added");
    } else if (action === "remove-equipment") {
      character.equipment.splice(index, 1);
      rerender("Equipment removed");
    } else if (action === "add-supernatural") {
      const type = root.querySelector("#arkham-supernatural-type").value;
      const name = root.querySelector("#arkham-supernatural-name").value.trim() || `Unnamed ${type.toLowerCase()}`;
      character.supernatural.push({ rowId: uid(), type, name, details: "" });
      rerender("Supernatural resource added");
    } else if (action === "remove-supernatural") {
      character.supernatural.splice(index, 1);
      rerender("Supernatural resource removed");
    } else if (action === "add-session-note") {
      character.sessionNotes.push({ rowId: uid(), date: localDateValue(), notes: "" });
      rerender("Session entry added");
    } else if (action === "remove-session-note") {
      const entry = character.sessionNotes[index];
      if (!entry || !window.confirm(`Remove the session notes for ${entry.date || "this undated session"}?`)) return;
      character.sessionNotes.splice(index, 1);
      rerender("Session entry removed");
    }
  });

  renderManager(root, library, saveMessage, viewMode, cloud);
  storeLocal();
  await connectCloud();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#arkham-character-manager");
  if (root) void initManager(root);
}
