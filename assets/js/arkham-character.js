import {
  ARCHETYPES,
  ARKHAM_SKILLS,
  INJURIES,
  KNACKS,
  MUNDANE_ITEMS,
  PERSONALITY_TRAITS,
  SUPERNATURAL_TYPES,
  WEAPONS,
} from "./arkham-character-data.js?v=20260803-2";

const STORAGE_KEY = "arkham-horror-character-manager-v1";
const TIER_SLOTS = { 1: 3, 2: 2, 3: 2, 4: 1 };
const FOCUSED_MULTICLASS_BONUS_SLOTS = { 1: 2, 2: 1, 3: 1, 4: 1 };
export const MULTICLASS_MINIMUM_XP = 125;
export const MULTICLASS_COST = 20;
const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

const byId = (items, id) => items.find((item) => item.id === id);
const clone = (value) => JSON.parse(JSON.stringify(value));

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `arkham-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const focused = character.multiclass?.archetype === character.archetype;
  return Object.fromEntries(Object.entries(TIER_SLOTS).map(([tier, count]) => [tier, count + (focused ? FOCUSED_MULTICLASS_BONUS_SLOTS[tier] : 0)]));
}

export function availableKnacks(character, tier) {
  const archetypeIds = [character.archetype];
  const secondaryId = character.multiclass?.archetype;
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
    } : null,
    secondaryDreamerFocus: Array.isArray(value.secondaryDreamerFocus)
      ? value.secondaryDreamerFocus.slice(0, 3)
      : secondaryArchetypeId === "dreamer" && archetypeId !== "dreamer" ? [...ARCHETYPES.dreamer.defaultCap3] : [],
    dicePoolMaximumIncrease: secondaryArchetypeId ? 1 : 0,
    weapons: Array.isArray(value.weapons) ? value.weapons : [],
    injuries: Array.isArray(value.injuries) ? value.injuries : [],
    equipment: Array.isArray(value.equipment) ? value.equipment : [],
    supernatural: Array.isArray(value.supernatural) ? value.supernatural : [],
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
  const available = availableKnacks(character, tier);
  const bonusSlot = slot >= TIER_SLOTS[tier];
  const sourceLabel = (knack) => {
    const sources = [character.archetype, character.multiclass?.archetype]
      .filter((id, index, ids) => id && ids.indexOf(id) === index && ARCHETYPES[id]?.knacks[tier]?.includes(knack))
      .map((id) => ARCHETYPES[id].name);
    return sources.length > 1 ? `${knack} - ${sources.join(" / ")}` : `${knack} - ${sources[0]}`;
  };
  return `<div class="arkham-knack-row">
    <label class="arkham-field">
      <span>${tierLabel(Number(tier))}${bonusSlot ? " - focused multiclass bonus" : ""}</span>
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
          : `You may select knacks from either archetype and use the best skill improvement limit granted by ${escapeHtml(primary.name)} or ${escapeHtml(secondary.name)}.`}</p>
      </div>
      <dl>
        <div><dt>Multiclass cost</dt><dd>${Number(character.multiclass.xpSpent) || MULTICLASS_COST} XP</dd></div>
        <div><dt>Dice pool maximum</dt><dd>+${Number(character.dicePoolMaximumIncrease) || 1}</dd></div>
      </dl>
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

function renderManager(root, library, message = "Saved locally") {
  const character = activeCharacter(library);
  const archetype = ARCHETYPES[character.archetype];
  const personality = byId(PERSONALITY_TRAITS, character.personality) ?? PERSONALITY_TRAITS[0];
  root.innerHTML = `<div class="arkham-manager__masthead">
    <div>
      <p class="arkham-eyebrow">Investigator archive</p>
      <h2>${escapeHtml(character.name || "Unnamed Investigator")}</h2>
      <p>Build, update, and reference your investigator at the table. Changes stay in this browser automatically.</p>
    </div>
    <div class="arkham-sigil" aria-hidden="true"><span></span></div>
  </div>

  <div class="arkham-library" aria-label="Character library controls">
    <label><span>Active dossier</span><select id="arkham-active-character">${library.characters.map((item) => `<option value="${item.id}"${item.id === character.id ? " selected" : ""}>${escapeHtml(item.name || "Unnamed Investigator")}</option>`).join("")}</select></label>
    <div class="arkham-actions">
      <button type="button" data-action="new-character">New</button>
      <button type="button" data-action="duplicate-character">Duplicate</button>
      <button type="button" data-action="export-character">Export</button>
      <button type="button" data-action="import-character">Import</button>
      <button type="button" data-action="print-character">Print</button>
      <button type="button" class="arkham-danger" data-action="delete-character"${library.characters.length === 1 ? " disabled" : ""}>Delete</button>
    </div>
    <span id="arkham-save-status" class="arkham-save-status" role="status">${escapeHtml(message)}</span>
    <input id="arkham-import-file" type="file" accept="application/json,.json" hidden>
  </div>

  <nav class="arkham-section-nav" aria-label="Character sheet sections">
    ${[["identity", "Identity"], ["skills", "Skills"], ["knacks", "Knacks"], ["weapons", "Weapons"], ["injuries", "Injuries"], ["background", "Background"], ["resources", "Resources"]].map(([id, label]) => `<a href="#arkham-${id}">${label}</a>`).join("")}
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
  </form>`;
}

function initManager(root) {
  const library = loadLibrary();

  function save(message = "Saved locally") {
    const character = activeCharacter(library);
    character.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
      const status = root.querySelector("#arkham-save-status");
      if (status) status.textContent = message;
    } catch (error) {
      console.warn("Unable to save Arkham character library", error);
      const status = root.querySelector("#arkham-save-status");
      if (status) status.textContent = "Could not save in this browser";
    }
  }

  function rerender(message) {
    const y = window.scrollY;
    renderManager(root, library, message);
    window.scrollTo({ top: y });
    save(message);
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
    for (const [attribute, collection] of [["weaponField", "weapons"], ["injuryField", "injuries"], ["equipmentField", "equipment"], ["supernaturalField", "supernatural"]]) {
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
      rerender("Dossier opened");
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
    if (target.dataset.injuryField || target.dataset.equipmentField || target.dataset.supernaturalField) {
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

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const character = activeCharacter(library);
    const index = Number(button.dataset.index);

    if (action === "new-character") {
      const created = createCharacter(`Investigator ${library.characters.length + 1}`);
      library.characters.push(created);
      library.activeId = created.id;
      rerender("New dossier created");
    } else if (action === "duplicate-character") {
      const copied = normalizeCharacter(clone(character));
      copied.id = uid();
      copied.name = `${character.name || "Unnamed Investigator"} - copy`;
      library.characters.push(copied);
      library.activeId = copied.id;
      rerender("Dossier duplicated");
    } else if (action === "delete-character" && library.characters.length > 1) {
      if (!window.confirm(`Delete ${character.name || "this investigator"} from this browser?`)) return;
      library.characters = library.characters.filter((item) => item.id !== character.id);
      library.activeId = library.characters[0].id;
      rerender("Dossier deleted");
    } else if (action === "export-character") {
      const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${(character.name || "arkham-investigator").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      save("Dossier exported");
    } else if (action === "import-character") {
      root.querySelector("#arkham-import-file").click();
    } else if (action === "print-character") {
      window.print();
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
      rerender("Ammunition updated");
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
    }
  });

  renderManager(root, library);
  save();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#arkham-character-manager");
  if (root) initManager(root);
}
