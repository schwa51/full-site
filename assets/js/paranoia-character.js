import {
  CLEARANCES,
  COMPETENCE_TIERS,
  DEFAULT_TIER_BY_CLEARANCE,
  MISC_EQUIPMENT,
  MUTANT_POWERS,
  NPC_ROLES,
  PARANOIA_ATTRIBUTES,
  PARANOIA_SKILLS,
  PC_PURCHASE_IDS,
  PERSONAL_EQUIPMENT,
  PSION_POWERS,
  SECRET_SOCIETIES,
  SERVICE_GROUPS,
  STARTING_PC_EQUIPMENT,
} from "./paranoia-character-data.js?v=20260712-4";
import { PARANOIA_WEAPONS } from "./paranoia-weapons-data.js?v=20260712-4";

const PDF_TEMPLATE_URL = "/assets/pdfs/paranoia-character-sheet.pdf?v=20260712-4";
const PDF_LIB_URL = "/assets/vendor/pdf-lib.esm.min.js?v=1.17.1";
const REFERENCE_PAGES = {
  service: { label: "Service group", url: "/vault/systems/paranoia/general/service-groups/" },
  mutant: { label: "Mutant power", url: "/vault/systems/paranoia/general/mutant-powers/" },
  society: { label: "Secret society", url: "/vault/systems/paranoia/general/secretsociety/" },
};
const ATTRIBUTE_BY_ID = new Map(PARANOIA_ATTRIBUTES.map((attribute) => [attribute.id, attribute]));
const SKILL_BY_ID = new Map(PARANOIA_SKILLS.map((item) => [item.id, item]));
const SERVICE_BY_ID = new Map(SERVICE_GROUPS.map((group) => [group.id, group]));
const CLEARANCE_BY_ID = new Map(CLEARANCES.map((clearance) => [clearance.id, clearance]));
const WEAPON_BY_ID = new Map(PARANOIA_WEAPONS.map((weapon) => [weapon.id, weapon]));

export function rollD20(random = Math.random) {
  return Math.floor(random() * 20) + 1;
}

export function attributeStats(value) {
  if (value <= 3) return { base: 0, bonus: 0 };
  if (value <= 6) return { base: 1, bonus: 0 };
  if (value <= 10) return { base: 2, bonus: 0 };
  if (value <= 13) return { base: 3, bonus: 0 };
  if (value === 14) return { base: 3, bonus: 1 };
  if (value <= 17) return { base: 4, bonus: 1 };
  if (value === 18) return { base: 5, bonus: 1 };
  return { base: 5, bonus: 2 };
}

export function deriveCharacter(attributes) {
  const strength = attributes.strength;
  return {
    total: Object.values(attributes).reduce((sum, value) => sum + value, 0),
    carryingCapacity: strength <= 12 ? 25 : 25 + ((strength - 12) * 5),
    damageBonus: attributeStats(strength).bonus,
    machoBonus: attributeStats(attributes.endurance).bonus,
    skillBases: {
      agility: attributeStats(attributes.agility).base,
      dexterity: attributeStats(attributes.dexterity).base,
      moxie: attributeStats(attributes.moxie).base,
      chutzpah: attributeStats(attributes.chutzpah).base,
      mechanical: attributeStats(attributes.mechanical).base,
    },
  };
}

export function rollAttributes(random = Math.random) {
  return Object.fromEntries(PARANOIA_ATTRIBUTES.map((attribute) => [attribute.id, rollD20(random)]));
}

function optionForRoll(options, roll) {
  return options.find((option) => option.rolls.includes(roll));
}

export function resolveServiceGroup(selection = "random", random = Math.random) {
  if (selection === "none") return { actual: null, cover: null, rolls: [], method: "none", actualRoll: null, coverRolls: [] };
  const rolls = [];
  const method = selection === "random" ? "rolled" : "selected";
  let actualRoll = null;
  let actual;

  if (selection === "random") {
    actualRoll = rollD20(random);
    rolls.push(actualRoll);
    actual = optionForRoll(SERVICE_GROUPS, actualRoll);
  } else {
    actual = SERVICE_BY_ID.get(selection);
  }

  if (!actual) return { actual: null, cover: null, rolls, method, actualRoll, coverRolls: [] };
  if (actual.id !== "internal-security") return { actual, cover: actual, rolls, method, actualRoll, coverRolls: [] };

  let cover;
  const coverRolls = [];
  do {
    const coverRoll = rollD20(random);
    rolls.push(coverRoll);
    coverRolls.push(coverRoll);
    cover = optionForRoll(SERVICE_GROUPS, coverRoll);
  } while (cover?.id === "internal-security");

  return { actual, cover, rolls, method, actualRoll, coverRolls };
}

export function resolveMutantPower(selection = "random", random = Math.random) {
  if (selection === "none") return { name: null, roll: null, method: "none" };
  if (selection !== "random") return { name: selection, roll: null, method: "selected" };
  const roll = rollD20(random);
  return { name: MUTANT_POWERS[roll - 1], roll, method: "rolled" };
}

export function resolveSecretSociety(power, selection = "random", random = Math.random) {
  if (selection === "none") return { name: null, rolls: [], needsManualName: false, method: "none" };
  if (selection !== "random") {
    if (selection === "Psion" && !PSION_POWERS.has(power)) {
      return { ...resolveSecretSociety(power, "random", random), rerolledFromPsion: true, requestedMethod: "selected" };
    }
    return { name: selection, rolls: [], needsManualName: selection === "Other", method: "selected" };
  }

  const rolls = [];
  while (rolls.length < 100) {
    const roll = rollD20(random);
    rolls.push(roll);
    const society = optionForRoll(SECRET_SOCIETIES, roll);
    if (society.name === "Psion" && !PSION_POWERS.has(power)) continue;
    return { name: society.name, rolls, needsManualName: society.name === "Other", method: "rolled" };
  }
  throw new Error("Unable to resolve a valid secret society roll.");
}

export function generateIdentity(options = {}, random = Math.random) {
  const service = resolveServiceGroup(options.serviceGroup ?? "random", random);
  const mutant = resolveMutantPower(options.mutantPower ?? "random", random);
  const society = resolveSecretSociety(mutant.name, options.secretSociety ?? "random", random);
  return { service, mutant, society };
}

export function skillCap(skillId, serviceGroupId, tierId = "standard") {
  const tier = COMPETENCE_TIERS[tierId] ?? COMPETENCE_TIERS.standard;
  const special = SERVICE_BY_ID.get(serviceGroupId)?.specialSkills.includes(skillId) ?? false;
  return { cap: special ? tier.specialCap : tier.normalCap, special };
}

export function skillNumber(skillId, attributes, allocations = {}) {
  const item = SKILL_BY_ID.get(skillId);
  return attributeStats(attributes[item.attribute]).base + Number(allocations[skillId] ?? 0);
}

export function allocationSummary(attributes, allocations, serviceGroupId, tierId = "standard") {
  const tier = COMPETENCE_TIERS[tierId] ?? COMPETENCE_TIERS.standard;
  let spent = 0;
  const errors = [];
  PARANOIA_SKILLS.forEach((item) => {
    const allocation = Number(allocations[item.id] ?? 0);
    const base = attributeStats(attributes[item.attribute]).base;
    const { cap } = skillCap(item.id, serviceGroupId, tierId);
    if (!Number.isInteger(allocation) || allocation < 0 || base + allocation > cap) errors.push(item.id);
    spent += Number.isFinite(allocation) ? allocation : 0;
  });
  return { spent, remaining: tier.points - spent, valid: errors.length === 0 && spent === tier.points, errors };
}

export function autoAllocateNpcSkills(attributes, serviceGroupId, tierId, roleId = "generalist") {
  const tier = COMPETENCE_TIERS[tierId] ?? COMPETENCE_TIERS.standard;
  const roleSkills = NPC_ROLES[roleId]?.skills ?? [];
  const serviceSkills = SERVICE_BY_ID.get(serviceGroupId)?.specialSkills ?? [];
  const focus = [...new Set([...roleSkills, ...serviceSkills])];
  const allSkills = PARANOIA_SKILLS.map((item) => item.id);
  const allocations = Object.fromEntries(PARANOIA_SKILLS.map((item) => [item.id, 0]));
  let remaining = tier.points;

  function spendAcross(skillIds) {
    while (remaining > 0) {
      let changed = false;
      for (const skillId of skillIds) {
        if (remaining === 0) break;
        const item = SKILL_BY_ID.get(skillId);
        if (!item) continue;
        const base = attributeStats(attributes[item.attribute]).base;
        const { cap } = skillCap(skillId, serviceGroupId, tierId);
        if (base + allocations[skillId] >= cap) continue;
        allocations[skillId] += 1;
        remaining -= 1;
        changed = true;
      }
      if (!changed) break;
    }
  }

  spendAcross(focus.length ? focus : allSkills);
  if (remaining > 0) spendAcross(allSkills);
  return allocations;
}

export function availableEquipment(mode, clearanceId) {
  if (mode === "pc") return PERSONAL_EQUIPMENT.filter((item) => PC_PURCHASE_IDS.has(item.id));
  const order = CLEARANCE_BY_ID.get(clearanceId)?.order ?? 1;
  return [...PERSONAL_EQUIPMENT, ...MISC_EQUIPMENT].filter((item) => {
    if (item.clearance === "varies") return true;
    return (CLEARANCE_BY_ID.get(item.clearance)?.order ?? 99) <= order;
  });
}

function selectMarkup(options, selected = "") {
  return options.map(({ value, label }) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
}

function displayName(state) {
  return state.name.trim() || "UNNAMED-CITIZEN";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function effectiveServiceId(state) {
  return state.identity?.service.cover?.id ?? null;
}

function effectiveSocietyName(state) {
  return state.identity?.society.name === "Other" ? state.manualSocietyName.trim() : state.identity?.society.name;
}

function rollDescription(method, rolls = []) {
  if (method === "selected") return "selected";
  if (method === "rolled") return `rolled ${rolls.join(" → ")}`;
  return "not assigned";
}

export function identitySummaryRows(state) {
  const { service, mutant, society } = state.identity;
  const rows = [];
  if (service.actual?.id === "internal-security") {
    const coverDescription = rollDescription("rolled", service.coverRolls ?? service.rolls.slice(service.actualRoll == null ? 0 : 1));
    rows.push(["Public service group", `${service.cover.name} (${coverDescription}; cover)`]);
    rows.push(["Secret affiliation", `Internal Security (${rollDescription(service.method, service.actualRoll == null ? [] : [service.actualRoll])})`]);
  } else {
    rows.push(["Public service group", service.cover ? `${service.cover.name} (${rollDescription(service.method, service.actualRoll == null ? [] : [service.actualRoll])})` : "None"]);
  }
  rows.push(["Mutant power", mutant.name ? `${mutant.name} (${rollDescription(mutant.method, mutant.roll == null ? [] : [mutant.roll])})` : "None"]);
  let societyDescription = society.name ? rollDescription(society.method, society.rolls) : "not assigned";
  if (society.rerolledFromPsion) societyDescription += "; selected Psion was incompatible and rerolled";
  rows.push(["Secret society", society.name ? `${effectiveSocietyName(state) || society.name} (${societyDescription})` : "None"]);
  return rows;
}

function identitySummaryMarkup(state) {
  const rows = identitySummaryRows(state);
  return `<dl>${rows.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`;
}

function normalizeHeading(value) {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

export function referenceSpecsForState(state) {
  const specs = [];
  const add = (kind, name) => {
    if (!name) return;
    specs.push({ kind, name, ...REFERENCE_PAGES[kind] });
  };
  add("service", state.identity?.service.cover?.name);
  if (state.identity?.service.actual?.id === "internal-security" && state.identity.service.cover?.id !== "internal-security") add("service", "Internal Security");
  add("mutant", state.identity?.mutant.name);
  add("society", effectiveSocietyName(state));
  return specs;
}

async function fetchReferenceSection(spec) {
  const response = await fetch(spec.url);
  if (!response.ok) throw new Error(`Unable to load ${spec.label.toLowerCase()} reference: ${response.status}`);
  const parsed = new DOMParser().parseFromString(await response.text(), "text/html");
  const heading = [...parsed.querySelectorAll("h3")].find((item) => normalizeHeading(item.textContent) === normalizeHeading(spec.name));
  if (!heading) return { ...spec, html: "", text: "", missing: true };
  const nodes = [];
  for (let node = heading.nextElementSibling; node && !/^H[23]$/.test(node.tagName); node = node.nextElementSibling) {
    if (!node.matches("script, style")) nodes.push(node);
  }
  return {
    ...spec,
    html: nodes.map((node) => node.outerHTML).join(""),
    text: nodes.map((node) => node.textContent.trim()).filter(Boolean).join("\n\n"),
    missing: nodes.length === 0,
  };
}

async function loadCharacterReferences(state) {
  if (!state.referencePromise) {
    state.referencePromise = Promise.all(referenceSpecsForState(state).map(async (spec) => {
      try {
        return await fetchReferenceSection(spec);
      } catch (error) {
        console.warn(error);
        return { ...spec, html: "", text: "", missing: true };
      }
    }));
  }
  return state.referencePromise;
}

function equipmentTotal(equipment) {
  return equipment.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
}

function equipmentCapacity(equipment) {
  const weapons = equipment.filter((item) => item.category === "Weapon").length;
  const armors = equipment.filter((item) => item.category === "Armor");
  const personal = equipment.filter((item) => item.category !== "Weapon" && item !== armors[0]).length;
  return { weapons, personal, valid: weapons <= 5 && personal <= 11 };
}

function setStatus(element, message, kind = "") {
  element.textContent = message;
  element.dataset.kind = kind;
  element.hidden = !message;
}

function setupOptions() {
  const groupOptions = [{ value: "random", label: "Roll d20 on the table" }, { value: "none", label: "None (NPC only)" }, ...SERVICE_GROUPS.map((group) => ({ value: group.id, label: group.name }))];
  const powerOptions = [{ value: "random", label: "Roll d20 on the table" }, { value: "none", label: "None (NPC only)" }, ...MUTANT_POWERS.map((name) => ({ value: name, label: name }))];
  const societyOptions = [{ value: "random", label: "Roll d20 on the table" }, { value: "none", label: "None (NPC only)" }, ...SECRET_SOCIETIES.map(({ name }) => ({ value: name, label: name }))];
  return { groupOptions, powerOptions, societyOptions };
}

export function initParanoiaCharacterGenerator(root = document) {
  const mount = root.querySelector("#paranoia-character-generator");
  if (!mount) return;

  let state = null;
  const { groupOptions, powerOptions, societyOptions } = setupOptions();
  mount.innerHTML = `
    <div class="paranoia-character__intro">
      <p class="paranoia-table-tool__eyebrow">Citizen fabrication terminal</p>
      <h2 id="character-generator-heading">Character and NPC generator</h2>
      <p>Roll attributes, apply the two mandatory rerolls, distribute skill points, choose equipment, and produce a completed character sheet.</p>
    </div>
    <form id="paranoia-character-form" class="paranoia-character-form" novalidate>
      <section class="paranoia-character-step" id="character-setup" aria-labelledby="character-setup-heading">
        <div class="paranoia-step-heading"><span>Setup</span><h3 id="character-setup-heading">Who is Friend Computer creating?</h3></div>
        <fieldset class="paranoia-mode-choice">
          <legend>Generator mode</legend>
          <label><input type="radio" name="character-mode" value="pc" checked> Red Troubleshooter</label>
          <label><input type="radio" name="character-mode" value="npc"> NPC</label>
        </fieldset>
        <div class="paranoia-character-grid">
          <label class="paranoia-field"><span>Character name</span><input id="character-name" required autocomplete="off" placeholder="SAM-R-CITIZEN-1"></label>
          <label class="paranoia-field"><span>Player or operator</span><input id="character-player" autocomplete="off" placeholder="Optional"></label>
        </div>
        <div id="npc-options" class="paranoia-npc-options" hidden>
          <div class="paranoia-character-grid">
            <label class="paranoia-field"><span>Security clearance</span><select id="npc-clearance">${selectMarkup(CLEARANCES.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` })), "orange")}</select></label>
            <label class="paranoia-field"><span>Competence tier</span><select id="npc-tier">${selectMarkup(Object.values(COMPETENCE_TIERS).map((tier) => ({ value: tier.id, label: `${tier.name} — ${tier.points} points` })), "veteran")}</select></label>
            <label class="paranoia-field"><span>NPC role</span><select id="npc-role">${selectMarkup(Object.entries(NPC_ROLES).map(([value, role]) => ({ value, label: role.name })))}</select></label>
          </div>
          <label class="paranoia-check"><input type="checkbox" id="npc-link-tier" checked> Suggest competence from clearance</label>
        </div>
        <fieldset id="identity-options" class="paranoia-identity-options">
          <legend>Assignments</legend>
          <p>Roll on each table or select an assigned result. Table rolls are shown with the generated character.</p>
          <div class="paranoia-character-grid">
            <label class="paranoia-field"><span>Service group</span><select id="identity-service">${selectMarkup(groupOptions)}</select></label>
            <label class="paranoia-field"><span>Mutant power</span><select id="identity-power">${selectMarkup(powerOptions)}</select></label>
            <label class="paranoia-field"><span>Secret society</span><select id="identity-society">${selectMarkup(societyOptions)}</select></label>
          </div>
        </fieldset>
        <button class="paranoia-primary" type="submit">Roll attributes</button>
        <p id="character-setup-status" class="paranoia-character-status" role="alert" hidden></p>
      </section>
      <div id="character-stage"></div>
    </form>`;

  const form = mount.querySelector("#paranoia-character-form");
  const stage = mount.querySelector("#character-stage");
  const npcOptions = mount.querySelector("#npc-options");
  const setupStatus = mount.querySelector("#character-setup-status");
  const npcClearance = mount.querySelector("#npc-clearance");
  const npcTier = mount.querySelector("#npc-tier");
  const npcLinkTier = mount.querySelector("#npc-link-tier");
  const identityOptions = mount.querySelector("#identity-options");

  function mode() {
    return form.elements["character-mode"].value;
  }

  function syncModeOptions() {
    npcOptions.hidden = mode() !== "npc";
    identityOptions.querySelectorAll('option[value="none"]').forEach((option) => {
      option.disabled = mode() === "pc";
      if (option.selected && option.disabled) option.parentElement.value = "random";
    });
  }

  Array.from(form.elements["character-mode"]).forEach((input) => input.addEventListener("change", syncModeOptions));
  syncModeOptions();

  npcClearance.addEventListener("change", () => {
    if (npcLinkTier.checked) npcTier.value = DEFAULT_TIER_BY_CLEARANCE[npcClearance.value];
  });
  npcLinkTier.addEventListener("change", () => {
    if (npcLinkTier.checked) npcTier.value = DEFAULT_TIER_BY_CLEARANCE[npcClearance.value];
  });

  function renderAttributes() {
    const derived = deriveCharacter(state.attributes);
    stage.innerHTML = `
      <section class="paranoia-character-step" aria-labelledby="character-attributes-heading">
        <div class="paranoia-step-heading"><span>Step 1 of 3</span><h3 id="character-attributes-heading">Choose two attributes to reroll</h3></div>
        <p>The two attributes must be different. The replacement rolls are final, even when they are lower.</p>
        <div class="paranoia-attribute-grid" id="attribute-grid"></div>
        <div class="paranoia-character-metrics">
          <strong>Attribute total: <span id="attribute-total">${derived.total}</span></strong>
          <span>${derived.total < 80 ? "Below 80 — you may reroll everything." : "Total meets the 80-point threshold."}</span>
        </div>
        <div class="paranoia-character-actions">
          <button type="button" id="select-lowest"${state.rerollsDone ? " hidden" : ""}>Select two lowest</button>
          <button type="button" id="reroll-selected" class="paranoia-primary"${state.rerollsDone ? " hidden" : ""}>Reroll selected attributes</button>
          <button type="button" id="reroll-all"${derived.total < 80 ? "" : " hidden"}>Reroll everything</button>
          <button type="button" id="continue-attributes" class="paranoia-primary"${state.rerollsDone ? "" : " hidden"}>Continue</button>
        </div>
        <div id="identity-result" class="paranoia-identity"${state.identity ? "" : " hidden"}></div>
        <p id="attribute-status" class="paranoia-character-status" role="alert" hidden></p>
      </section>`;

    const grid = stage.querySelector("#attribute-grid");
    PARANOIA_ATTRIBUTES.forEach((attribute) => {
      const label = document.createElement("label");
      label.className = "paranoia-attribute-card";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = attribute.id;
      checkbox.disabled = state.rerollsDone;
      checkbox.checked = state.selectedRerolls.includes(attribute.id);
      const text = document.createElement("span");
      text.className = "paranoia-attribute-card__name";
      text.textContent = attribute.name;
      const value = document.createElement("strong");
      value.textContent = state.attributes[attribute.id];
      label.append(checkbox, text, value);
      if (state.rerollHistory[attribute.id]) {
        const history = document.createElement("small");
        history.textContent = `${state.rerollHistory[attribute.id].before} → ${state.rerollHistory[attribute.id].after}`;
        label.append(history);
      }
      grid.append(label);
    });

    const status = stage.querySelector("#attribute-status");
    grid.addEventListener("change", (event) => {
      const selected = [...grid.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
      if (selected.length > 2) {
        event.target.checked = false;
        setStatus(status, "Choose exactly two different attributes.", "error");
        return;
      }
      state.selectedRerolls = selected;
      setStatus(status, "");
    });

    stage.querySelector("#select-lowest").addEventListener("click", () => {
      state.selectedRerolls = [...PARANOIA_ATTRIBUTES]
        .sort((a, b) => state.attributes[a.id] - state.attributes[b.id])
        .slice(0, 2)
        .map((attribute) => attribute.id);
      renderAttributes();
    });

    stage.querySelector("#reroll-selected").addEventListener("click", () => {
      if (state.selectedRerolls.length !== 2) {
        setStatus(status, "Select exactly two attributes before rerolling.", "error");
        return;
      }
      state.selectedRerolls.forEach((attributeId) => {
        const before = state.attributes[attributeId];
        const after = rollD20();
        state.attributes[attributeId] = after;
        state.rerollHistory[attributeId] = { before, after };
      });
      state.rerollsDone = true;
      renderAttributes();
    });

    stage.querySelector("#reroll-all").addEventListener("click", () => {
      state.attributes = rollAttributes();
      state.selectedRerolls = [];
      state.rerollHistory = {};
      state.rerollsDone = false;
      state.identity = null;
      state.manualSocietyName = "";
      renderAttributes();
    });

    stage.querySelector("#continue-attributes").addEventListener("click", () => {
      if (!state.identity) {
        state.identity = generateIdentity(state.identityOptions);
        if (state.identity.society.error) {
          setStatus(status, state.identity.society.error, "error");
          state.identity = null;
          return;
        }
        if (state.identity.society.needsManualName) {
          renderAttributes();
          return;
        }
      }
      if (state.identity.society.needsManualName) {
        const manual = stage.querySelector("#manual-society-name")?.value.trim();
        if (!manual) {
          setStatus(status, "Enter the gamemaster-selected secret society before continuing.", "error");
          return;
        }
        state.manualSocietyName = manual;
      }
      enterSkills();
    });

    if (state.identity) renderIdentity();
  }

  function renderIdentity() {
    const container = stage.querySelector("#identity-result");
    const { society } = state.identity;
    container.hidden = false;
    container.replaceChildren();

    const heading = document.createElement("h4");
    heading.textContent = "Generated identity";
    const list = document.createElement("dl");
    const pairs = identitySummaryRows(state);
    pairs.forEach(([term, description]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = description;
      list.append(dt, dd);
    });
    container.append(heading, list);

    if (society.needsManualName) {
      const label = document.createElement("label");
      label.className = "paranoia-field";
      const span = document.createElement("span");
      span.textContent = "Gamemaster-selected society";
      const input = document.createElement("input");
      input.id = "manual-society-name";
      input.required = true;
      input.value = state.manualSocietyName;
      label.append(span, input);
      container.append(label);
    }
  }

  function enterSkills() {
    state.allocations = Object.fromEntries(PARANOIA_SKILLS.map((item) => [item.id, 0]));
    if (state.mode === "npc") {
      state.allocations = autoAllocateNpcSkills(state.attributes, effectiveServiceId(state), state.tierId, state.roleId);
    }
    renderSkills();
  }

  function renderSkills() {
    const tier = COMPETENCE_TIERS[state.tierId];
    stage.innerHTML = `
      <section class="paranoia-character-step" aria-labelledby="character-skills-heading">
        <div class="paranoia-step-heading"><span>Step 2 of 3</span><h3 id="character-skills-heading">Distribute ${tier.points} skill points</h3></div>
        <p>Enter points added above each skill base. Special-training skills use the ${state.identity.service.cover?.name ?? "selected cover group"} cap.</p>
        <div class="paranoia-identity"><h4>Identity results</h4>${identitySummaryMarkup(state)}</div>
        <div class="paranoia-skill-toolbar">
          <strong><span id="skill-remaining">${tier.points}</span> points remaining</strong>
          <button type="button" id="clear-skills">Clear allocations</button>
          ${state.mode === "npc" ? '<button type="button" id="auto-skills">Auto-allocate by role</button>' : ""}
        </div>
        <div id="skill-groups" class="paranoia-skill-groups"></div>
        <div class="paranoia-character-actions"><button type="button" id="continue-skills" class="paranoia-primary">Continue to equipment</button></div>
        <p id="skill-status" class="paranoia-character-status" role="alert" hidden></p>
      </section>`;

    const groups = stage.querySelector("#skill-groups");
    ["agility", "chutzpah", "dexterity", "mechanical", "moxie"].forEach((attributeId) => {
      const attribute = ATTRIBUTE_BY_ID.get(attributeId);
      const base = attributeStats(state.attributes[attributeId]).base;
      const section = document.createElement("section");
      section.className = "paranoia-skill-group";
      const heading = document.createElement("h4");
      heading.textContent = `${attribute.skillGroup} skills — base ${base}`;
      const table = document.createElement("table");
      table.innerHTML = "<thead><tr><th>Skill</th><th>Base</th><th>Points</th><th>Final</th></tr></thead>";
      const body = document.createElement("tbody");

      PARANOIA_SKILLS.filter((item) => item.attribute === attributeId).forEach((item) => {
        const { cap, special } = skillCap(item.id, effectiveServiceId(state), state.tierId);
        const row = document.createElement("tr");
        const name = document.createElement("th");
        name.scope = "row";
        name.textContent = item.name;
        if (special) {
          const badge = document.createElement("span");
          badge.className = "paranoia-training-badge";
          badge.textContent = `Special · cap ${cap}`;
          name.append(" ", badge);
        }
        const baseCell = document.createElement("td");
        baseCell.textContent = base;
        const allocationCell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = String(cap - base);
        input.step = "1";
        input.inputMode = "numeric";
        input.value = state.allocations[item.id];
        input.dataset.skillId = item.id;
        input.setAttribute("aria-label", `${item.name} points`);
        allocationCell.append(input);
        const finalCell = document.createElement("td");
        finalCell.dataset.finalSkill = item.id;
        finalCell.textContent = base + state.allocations[item.id];
        row.append(name, baseCell, allocationCell, finalCell);
        body.append(row);
      });
      table.append(body);
      section.append(heading, table);
      groups.append(section);
    });

    const status = stage.querySelector("#skill-status");
    const remaining = stage.querySelector("#skill-remaining");
    function updateSkillSummary() {
      const summary = allocationSummary(state.attributes, state.allocations, effectiveServiceId(state), state.tierId);
      remaining.textContent = summary.remaining;
      remaining.parentElement.dataset.over = summary.remaining < 0 ? "true" : "false";
      return summary;
    }

    groups.addEventListener("input", (event) => {
      const input = event.target.closest("input[data-skill-id]");
      if (!input) return;
      const max = Number(input.max);
      let value = Number(input.value);
      if (!Number.isInteger(value)) value = 0;
      value = Math.max(0, Math.min(max, value));
      input.value = value;
      state.allocations[input.dataset.skillId] = value;
      stage.querySelector(`[data-final-skill="${input.dataset.skillId}"]`).textContent = skillNumber(input.dataset.skillId, state.attributes, state.allocations);
      updateSkillSummary();
      setStatus(status, "");
    });

    stage.querySelector("#clear-skills").addEventListener("click", () => {
      state.allocations = Object.fromEntries(PARANOIA_SKILLS.map((item) => [item.id, 0]));
      renderSkills();
    });
    stage.querySelector("#auto-skills")?.addEventListener("click", () => {
      state.allocations = autoAllocateNpcSkills(state.attributes, effectiveServiceId(state), state.tierId, state.roleId);
      renderSkills();
    });

    stage.querySelector("#continue-skills").addEventListener("click", () => {
      const summary = updateSkillSummary();
      if (!summary.valid) {
        const message = summary.remaining > 0
          ? `Allocate the remaining ${summary.remaining} skill point${summary.remaining === 1 ? "" : "s"}.`
          : summary.remaining < 0 ? `Remove ${Math.abs(summary.remaining)} excess skill points.` : "One or more skills exceed its permitted cap.";
        setStatus(status, message, "error");
        return;
      }
      state.equipment = state.mode === "pc" ? STARTING_PC_EQUIPMENT.map((item) => ({ ...item })) : [];
      renderEquipment();
    });

    updateSkillSummary();
  }

  function renderEquipment() {
    const catalog = availableEquipment(state.mode, state.clearanceId);
    const groups = new Map();
    catalog.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });
    stage.innerHTML = `
      <section class="paranoia-character-step" aria-labelledby="character-equipment-heading">
        <div class="paranoia-step-heading"><span>Step 3 of 3</span><h3 id="character-equipment-heading">Select equipment</h3></div>
        <p>${state.mode === "pc" ? "The Red laser pistol and Red reflec armor are assigned at no cost. Spend up to 100 credits on legal Red-clearance equipment." : "Choose equipment at or below the NPC’s clearance. NPC cost is displayed but not enforced."}</p>
        <div class="paranoia-equipment-picker">
          <label class="paranoia-field paranoia-field--wide"><span>Available equipment</span><select id="equipment-choice"><option value="">Choose an item</option>${[...groups].map(([category, items]) => `<optgroup label="${category}">${items.map((item) => `<option value="${item.id}">${item.name} — ${item.cost.toLocaleString()} credits</option>`).join("")}</optgroup>`).join("")}</select></label>
          <button type="button" id="add-equipment">Add item</button>
        </div>
        <div id="equipment-list" class="paranoia-equipment-list"></div>
        <div class="paranoia-character-metrics"><strong id="equipment-total"></strong><span id="equipment-capacity"></span></div>
        <div class="paranoia-character-actions"><button type="button" id="finish-character" class="paranoia-primary">Finish character</button></div>
        <p id="equipment-status" class="paranoia-character-status" role="alert" hidden></p>
      </section>`;

    const byId = new Map(catalog.map((item) => [item.id, item]));
    const list = stage.querySelector("#equipment-list");
    const status = stage.querySelector("#equipment-status");
    const total = stage.querySelector("#equipment-total");
    const capacityText = stage.querySelector("#equipment-capacity");

    function renderList() {
      list.replaceChildren();
      state.equipment.forEach((item) => {
        const row = document.createElement("div");
        row.className = "paranoia-equipment-row";
        const details = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = item.name;
        const note = document.createElement("small");
        note.textContent = item.issued ? "Standard issue · no cost" : `${item.cost.toLocaleString()} credits each · ${item.category}`;
        details.append(name, note);
        row.append(details);
        if (!item.issued) {
          const quantity = document.createElement("input");
          quantity.type = "number";
          quantity.min = "1";
          quantity.max = "99";
          quantity.value = item.quantity;
          quantity.inputMode = "numeric";
          quantity.setAttribute("aria-label", `${item.name} quantity`);
          quantity.addEventListener("input", () => {
            item.quantity = Math.max(1, Math.min(99, Number(quantity.value) || 1));
            quantity.value = item.quantity;
            updateTotals();
          });
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = "Remove";
          remove.addEventListener("click", () => {
            state.equipment = state.equipment.filter((selected) => selected.id !== item.id);
            renderList();
          });
          row.append(quantity, remove);
        }
        list.append(row);
      });
      updateTotals();
    }

    function updateTotals() {
      const cost = equipmentTotal(state.equipment);
      const capacity = equipmentCapacity(state.equipment);
      total.textContent = state.mode === "pc" ? `${100 - cost} credits remaining` : `${cost.toLocaleString()} credits total`;
      total.dataset.over = state.mode === "pc" && cost > 100 ? "true" : "false";
      capacityText.textContent = `${capacity.weapons}/5 weapon lines · ${capacity.personal}/11 personal equipment lines`;
      capacityText.dataset.over = capacity.valid ? "false" : "true";
    }

    stage.querySelector("#add-equipment").addEventListener("click", () => {
      const id = stage.querySelector("#equipment-choice").value;
      const item = byId.get(id);
      if (!item) {
        setStatus(status, "Choose an equipment item first.", "error");
        return;
      }
      if (state.equipment.some((selected) => selected.id === id)) {
        setStatus(status, "That item is already selected; adjust its quantity instead.", "error");
        return;
      }
      state.equipment.push({ ...item, quantity: 1 });
      setStatus(status, "");
      renderList();
    });

    stage.querySelector("#finish-character").addEventListener("click", () => {
      const cost = equipmentTotal(state.equipment);
      const capacity = equipmentCapacity(state.equipment);
      if (state.mode === "pc" && cost > 100) {
        setStatus(status, `Remove ${cost - 100} credits of equipment before continuing.`, "error");
        return;
      }
      if (!capacity.valid) {
        setStatus(status, "The character sheet holds at most five weapons and eleven personal equipment entries.", "error");
        return;
      }
      renderComplete();
    });

    renderList();
  }

  function renderComplete() {
    const derived = deriveCharacter(state.attributes);
    const clearance = CLEARANCE_BY_ID.get(state.clearanceId);
    const strongestSkills = PARANOIA_SKILLS
      .map((item) => ({ name: item.name, value: skillNumber(item.id, state.attributes, state.allocations) }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 6);
    stage.innerHTML = `
      <section class="paranoia-character-step" aria-labelledby="character-complete-heading">
        <div class="paranoia-step-heading"><span>Complete</span><h3 id="character-complete-heading">${escapeHtml(displayName(state))}</h3></div>
        <div class="paranoia-character-summary">
          <dl>
            <dt>Type</dt><dd>${state.mode === "pc" ? "Red Troubleshooter" : `${COMPETENCE_TIERS[state.tierId].name} NPC`}</dd>
            <dt>Clearance</dt><dd>${clearance.name} (${clearance.code})</dd>
            <dt>Attribute total</dt><dd>${derived.total}</dd>
            <dt>Best skills</dt><dd>${strongestSkills.map((item) => `${item.name} ${item.value}`).join(" · ")}</dd>
            <dt>Equipment</dt><dd>${state.equipment.map((item) => `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`).join(" · ") || "None"}</dd>
          </dl>
          ${identitySummaryMarkup(state)}
        </div>
        <section class="paranoia-reference-reminders" aria-labelledby="character-reminders-heading">
          <h4 id="character-reminders-heading">Character reminders</h4>
          <p>The selected service group, mutant power, and secret-society notes are also appended to the character PDF.</p>
          <div id="character-reference-list" class="paranoia-reference-list" aria-live="polite">Loading reference text…</div>
        </section>
        <div class="paranoia-download-panel">
          <h4>Character sheet</h4>
          <p>Download an editable form or a flattened final copy.</p>
          <div class="paranoia-character-actions">
            <button type="button" id="download-editable" class="paranoia-primary">Download editable PDF</button>
            <button type="button" id="download-flat">Download final PDF</button>
            <a href="${PDF_TEMPLATE_URL}" download>Blank fillable sheet</a>
          </div>
        </div>
        <button type="button" id="start-over">Create another character</button>
        <p id="download-status" class="paranoia-character-status" role="status" aria-live="polite" hidden></p>
      </section>`;

    const downloadStatus = stage.querySelector("#download-status");
    const referenceList = stage.querySelector("#character-reference-list");
    loadCharacterReferences(state).then((references) => {
      referenceList.replaceChildren();
      if (!references.length) {
        referenceList.textContent = "No service group, mutant power, or secret society was assigned.";
        return;
      }
      references.forEach((reference) => {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `${reference.label}: ${reference.name}`;
        const content = document.createElement("div");
        content.className = "paranoia-reference-reminder__content";
        if (reference.missing) {
          content.textContent = `No matching ${reference.label.toLowerCase()} writeup is available yet.`;
        } else {
          content.innerHTML = reference.html;
        }
        const link = document.createElement("a");
        link.href = reference.url;
        link.textContent = `Open the full ${reference.label.toLowerCase()} page`;
        details.append(summary, content, link);
        referenceList.append(details);
      });
    });

    async function download(flatten) {
      try {
        setStatus(downloadStatus, "Generating PDF…");
        const bytes = await createCharacterPdf(state, { flatten });
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${displayName(state).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "") || "paranoia-character"}${flatten ? "-final" : "-editable"}.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setStatus(downloadStatus, "PDF generated.", "success");
      } catch (error) {
        console.error(error);
        setStatus(downloadStatus, "The PDF could not be generated. Reload the page and try again.", "error");
      }
    }
    stage.querySelector("#download-editable").addEventListener("click", () => download(false));
    stage.querySelector("#download-flat").addEventListener("click", () => download(true));
    stage.querySelector("#start-over").addEventListener("click", () => {
      state = null;
      stage.replaceChildren();
      mount.querySelector("#character-setup").hidden = false;
      form.reset();
      syncModeOptions();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = mount.querySelector("#character-name").value.trim();
    if (!name) {
      setStatus(setupStatus, "Enter a character name before rolling.", "error");
      return;
    }
    const selectedMode = mode();
    const clearanceId = selectedMode === "pc" ? "red" : npcClearance.value;
    const tierId = selectedMode === "pc" ? "standard" : npcTier.value;
    state = {
      mode: selectedMode,
      name,
      player: mount.querySelector("#character-player").value.trim(),
      clearanceId,
      tierId,
      roleId: selectedMode === "pc" ? "generalist" : mount.querySelector("#npc-role").value,
      identityOptions: {
        serviceGroup: mount.querySelector("#identity-service").value,
        mutantPower: mount.querySelector("#identity-power").value,
        secretSociety: mount.querySelector("#identity-society").value,
      },
      attributes: rollAttributes(),
      selectedRerolls: [],
      rerollHistory: {},
      rerollsDone: false,
      identity: null,
      manualSocietyName: "",
      allocations: {},
      equipment: [],
    };
    setStatus(setupStatus, "");
    mount.querySelector("#character-setup").hidden = true;
    renderAttributes();
  });
}

function skillIdForWeapon(weapon) {
  const normalized = weapon.skill.name.replace(/s$/, "").toLowerCase();
  return PARANOIA_SKILLS.find((item) => item.name.replace(/s$/, "").toLowerCase() === normalized)?.id;
}

export function pdfFieldValues(state) {
  const derived = deriveCharacter(state.attributes);
  const clearance = CLEARANCE_BY_ID.get(state.clearanceId);
  const values = {
    Name: displayName(state), Name_2: displayName(state), Player: state.player, Player_2: state.player,
    "Secret Society": effectiveSocietyName(state) ?? "None", Degree: effectiveSocietyName(state) ? "1" : "", "Mutant Power": state.identity.mutant.name ?? "None",
    "Service Group": state.identity.service.cover?.name ?? "None", "Carrying Capacity": `${derived.carryingCapacity} kg`, "Damage Bonus": String(derived.damageBonus), "Macho Bonus": String(derived.machoBonus),
    Strength: String(state.attributes.strength), Endurance: String(state.attributes.endurance), Agility: String(state.attributes.agility), Dexterity: String(state.attributes.dexterity),
    Moxie: String(state.attributes.moxie), Chutzpah: String(state.attributes.chutzpah), "Mechanical Apt": String(state.attributes.mechanical), Power: String(state.attributes.power),
    "Agility Skill Base": String(derived.skillBases.agility), "Dexterity Skill Base": String(derived.skillBases.dexterity), "Moxie Skill Base": String(derived.skillBases.moxie),
    "Chutzpah Skill Base": String(derived.skillBases.chutzpah), "Mech Skill Base": String(derived.skillBases.mechanical), "Mechanical Skill Base": String(derived.skillBases.mechanical),
    "Damage Status 1": "Uninjured", "Credits 1": state.mode === "pc" ? String(100 - equipmentTotal(state.equipment)) : "",
  };
  PARANOIA_SKILLS.forEach((item) => { values[item.pdfName] = String(skillNumber(item.id, state.attributes, state.allocations)); });

  const notes = [];
  if (state.identity.mutant.name) notes.push("Mutant status: Unregistered.");
  if (state.identity.service.actual?.id === "internal-security") notes.unshift("Actual Service Group: Internal Security");
  if (state.mode === "npc") notes.push(`NPC competence: ${COMPETENCE_TIERS[state.tierId].name}.`);
  values.Notes = notes.join("\n");

  const weapons = state.equipment.filter((item) => item.category === "Weapon").slice(0, 5);
  weapons.forEach((item, index) => {
    const number = index + 1;
    const weapon = WEAPON_BY_ID.get(item.weaponId);
    const skillId = weapon ? skillIdForWeapon(weapon) : null;
    values[`Weapon ${number}`] = `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`;
    values[`Skill Number ${number}`] = skillId ? String(skillNumber(skillId, state.attributes, state.allocations)) : "";
    values[`Weapon Type ${number}`] = weapon?.type ?? "";
    values[`Weapon Damage Rating ${number}`] = Number.isInteger(weapon?.damage) ? String(weapon.damage) : "";
    values[`Weapon Range ${number}`] = item.range ?? "";
    values[`Weapon Experimental ${number}`] = weapon?.reliability === "experimental" ? "E" : weapon?.reliability === "really-experimental" ? "RE" : "S";
  });

  const armors = state.equipment.filter((item) => item.category === "Armor");
  if (armors[0]) {
    values.Armor = armors[0].name;
    values.Rating = armors[0].armorRating ?? "";
  }
  const personal = state.equipment.filter((item) => item.category !== "Weapon" && item !== armors[0]);
  personal.slice(0, 11).forEach((item, index) => {
    const name = index === 0 ? "Personal Equipment 1" : index === 1 ? "Personal Equipment 2" : index === 2 ? "Personal Equipment  3" : `Personal Equipment ${index + 1}`;
    values[name] = `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`;
  });
  return { values, clearance };
}

function sanitizePdfText(value) {
  return String(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function wrappedPdfLines(text, font, size, maxWidth) {
  const lines = [];
  String(text).split(/\n/).forEach((sourceLine) => {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
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

export function appendReferencePages(document, fonts, references) {
  const available = references.filter((reference) => reference.text && !reference.missing);
  if (!available.length) return 0;
  const templateSize = document.getPages()[0]?.getSize() ?? { width: 569.04, height: 783.12 };
  const margin = 44;
  const bodySize = 10.25;
  const lineHeight = 13.5;
  let pageCount = 0;

  available.forEach((reference) => {
    const title = sanitizePdfText(`${reference.label}: ${reference.name}`);
    const source = sanitizePdfText(`Reference: ${reference.url}`);
    let page;
    let y;
    let continuation = false;

    function addPage() {
      page = document.addPage([templateSize.width, templateSize.height]);
      pageCount += 1;
      y = templateSize.height - margin;
      const pageTitle = continuation ? `${title} (continued)` : title;
      wrappedPdfLines(pageTitle, fonts.bold, 17, templateSize.width - (margin * 2)).forEach((line) => {
        page.drawText(line, { x: margin, y, size: 17, font: fonts.bold });
        y -= 20;
      });
      y -= 2;
      page.drawText(source, { x: margin, y, size: 8, font: fonts.regular });
      y -= 24;
      continuation = true;
    }

    addPage();
    const paragraphs = sanitizePdfText(reference.text).split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    paragraphs.forEach((paragraph) => {
      const lines = wrappedPdfLines(paragraph, fonts.regular, bodySize, templateSize.width - (margin * 2));
      lines.forEach((line) => {
        if (y < margin + lineHeight) addPage();
        page.drawText(line, { x: margin, y, size: bodySize, font: fonts.regular });
        y -= lineHeight;
      });
      y -= 6;
    });
  });
  return pageCount;
}

export async function createCharacterPdf(state, { flatten = false } = {}) {
  const [{ PDFDocument, StandardFonts }, response] = await Promise.all([import(PDF_LIB_URL), fetch(PDF_TEMPLATE_URL)]);
  if (!response.ok) throw new Error(`Unable to load PDF template: ${response.status}`);
  const document = await PDFDocument.load(await response.arrayBuffer());
  const form = document.getForm();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const boldFont = await document.embedFont(StandardFonts.HelveticaBold);
  const { values, clearance } = pdfFieldValues(state);

  Object.entries(values).forEach(([name, value]) => {
    try {
      const field = form.getTextField(name);
      if (name === "Notes") {
        field.enableMultiline();
        field.setFontSize(10);
      }
      field.setText(value ?? "");
    } catch (error) {
      console.warn(`Missing PDF field: ${name}`, error);
    }
  });
  form.getRadioGroup("Security Clearance").select(clearance.code);
  form.updateFieldAppearances(font);
  if (flatten) form.flatten();
  const references = await loadCharacterReferences(state);
  appendReferencePages(document, { regular: font, bold: boldFont }, references);
  return document.save();
}

if (typeof document !== "undefined") initParanoiaCharacterGenerator();
