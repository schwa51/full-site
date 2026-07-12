import { PARANOIA_WEAPONS } from "./paranoia-weapons-data.js?v=20260712-4";

export const PARANOIA_TABLES = {
  damage: {
    kind: "matrix",
    title: "Weapon damage",
    description: "Enter a weapon’s Damage number and a d20 roll to find the damage the character receives.",
    die: { id: "roll", label: "d20 roll", sides: 20 },
    axis: { id: "damage", label: "Damage number", min: 1, max: 20 },
    outcomes: [
      {
        label: "No Effect",
        ranges: ["01-12", "01-10", "01-09", "01-08", "01-07", "01-06", "01-05", "01-04", "01-03", "01-02", "01", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
      },
      {
        label: "Stun (no action during next combat round)",
        ranges: ["13-20", "11-20", "10-18", "09-16", "08-15", "07-13", "06-11", "05-09", "04-07", "03-05", "02-03", "01", "01", "01", "-", "-", "-", "-", "-", "-"],
      },
      {
        label: "Wound (stunned plus -4 to all skill/attribute rolls)",
        ranges: ["-", "-", "19-20", "17-18", "16-17", "14-17", "12-15", "10-14", "08-13", "06-12", "04-11", "02-10", "02-09", "02-05", "01-04", "01-02", "01-02", "01", "-", "-"],
      },
      {
        label: "Incapacitate (wounded plus unconscious—no actions until healed)",
        ranges: ["-", "-", "-", "19-20", "18-19", "18-19", "16-18", "15-18", "14-17", "13-17", "12-17", "11-16", "10-15", "06-14", "05-12", "03-10", "03-08", "02-05", "01-02", "-"],
      },
      {
        label: "Kill (You're dead!)",
        ranges: ["-", "-", "-", "-", "20", "20", "19-20", "19-20", "18-20", "18-20", "18-20", "17-20", "16-20", "15-20", "13-20", "11-20", "09-19", "06-18", "03-14", "01"],
      },
      {
        label: "Vaporize (Wow, much dust)",
        ranges: ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "20", "19-20", "15-20", "02-20"],
      },
    ],
  },
  weapons: {
    kind: "weapons",
    title: "Weapon lookup",
    description: "Choose a weapon, enter its relevant skill number, then roll a d20. Successful attacks—and damaging malfunctions—unlock the appropriate follow-up roll.",
    weapons: PARANOIA_WEAPONS,
    attackDie: { id: "attack", label: "Attack d20 roll", sides: 20 },
  },
};

export function rangeIncludes(range, roll) {
  const normalized = String(range ?? "").trim();
  if (!normalized || normalized === "-") return false;

  const match = normalized.match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/);
  if (!match) return false;

  const low = Number(match[1]);
  const high = match[2] ? Number(match[2]) : low;
  return roll >= low && roll <= high;
}

export function lookupResult(table, axisValue, roll) {
  const rangeIndex = axisValue - table.axis.min;
  const outcome = table.outcomes.find((row) => rangeIncludes(row.ranges[rangeIndex], roll));
  return outcome?.label ?? null;
}

export function weaponCode(weapon) {
  if (weapon.type && Number.isInteger(weapon.damage)) return `${weapon.type}${weapon.damage}`;
  return weapon.type ?? "—";
}

export function weaponMalfunctionNumber(weapon, laserShot = 1) {
  if (!weapon || weapon.reliability === "none") return null;

  const base = weapon.reliability === "experimental" ? 19 : 20;
  if (!weapon.laser || laserShot <= 6) return base;

  return Math.max(1, base - (laserShot - 6));
}

export function attackRollSucceeds(skillNumber, attackRoll) {
  if (attackRoll === 1) return true;
  if (attackRoll === 20) return false;
  return attackRoll <= skillNumber;
}

function hitLocation(roll) {
  if (roll <= 2) return "Head";
  if (roll <= 4) return "Left Arm";
  if (roll <= 6) return "Right Arm";
  if (roll <= 11) return "Chest";
  if (roll <= 14) return "Abdomen";
  if (roll <= 17) return "Left Leg";
  return "Right Leg";
}

function normalHitFollowUp(weapon) {
  if (weapon.special?.kind === "stun" || weapon.special?.kind === "tangler") {
    return { kind: "special", special: weapon.special.kind, label: "Resolve weapon effect" };
  }
  if (weapon.special) return null;
  return {
    kind: "damage",
    type: weapon.type,
    damage: weapon.lookupDamageNumber ?? weapon.damage,
    code: weaponCode(weapon),
    label: "Damage received",
    note: weapon.note,
  };
}

function malfunctionFollowUp(weapon) {
  const followUp = weapon.malfunctionResult;
  if (!followUp || followUp.kind === "none" || followUp.kind === "manual") return null;
  if (followUp.kind === "weaponDamage") {
    if (!weapon.type || !Number.isInteger(weapon.damage)) return null;
    return {
      kind: "damage",
      type: weapon.type,
      damage: weapon.lookupDamageNumber ?? weapon.damage,
      code: weaponCode(weapon),
      label: followUp.label,
      note: weapon.note,
    };
  }
  return { ...followUp, code: followUp.type && followUp.damage ? `${followUp.type}${followUp.damage}` : weaponCode(weapon) };
}

export function resolveAttackCheck(weapon, skillNumber, attackRoll, options = {}) {
  const malfunctionNumber = weaponMalfunctionNumber(weapon, options.laserShot);
  const hit = attackRollSucceeds(skillNumber, attackRoll);

  if (malfunctionNumber && attackRoll >= malfunctionNumber) {
    const followUp = malfunctionFollowUp(weapon);
    return {
      kind: "malfunction",
      label: "Weapon malfunction",
      outcome: weapon.malfunction,
      note: `The attack roll triggered a malfunction on ${malfunctionNumber} or higher. Resolve the malfunction instead of normal weapon damage.`,
      hit,
      malfunctionNumber,
      followUp,
    };
  }

  if (!hit) {
    const outcome = attackRoll === 20
      ? "An unmodified roll of 20 always fails."
      : `The roll of ${attackRoll} is greater than the ${weapon.skill.name} skill number of ${skillNumber}.`;
    return {
      kind: "miss",
      label: "Attack misses",
      outcome,
      note: "No damage roll is required.",
      hit: false,
      malfunctionNumber,
      followUp: null,
    };
  }

  if (weapon.special && !["stun", "tangler"].includes(weapon.special.kind)) {
    return {
      kind: "special",
      label: "Attack succeeds",
      outcome: weapon.special.text,
      note: "This weapon or ammunition has no single normal Damage Table result.",
      hit: true,
      malfunctionNumber,
      followUp: null,
    };
  }

  return {
    kind: "hit",
    label: "Attack succeeds",
    outcome: attackRoll === 1
      ? "An unmodified roll of 1 always succeeds."
      : `The roll of ${attackRoll} is less than or equal to the ${weapon.skill.name} skill number of ${skillNumber}.`,
    note: "Proceed to the damage or weapon-effect roll.",
    hit: true,
    malfunctionNumber,
    followUp: normalHitFollowUp(weapon),
  };
}

export function resolveFollowUp(followUp, roll) {
  if (followUp.kind === "conditionalDamage") {
    if (roll % 2 === 0) {
      return {
        kind: "malfunction-resolved",
        label: followUp.label,
        outcome: followUp.evenText,
        note: `Malfunction effect roll: ${roll} (even).`,
        followUp: null,
      };
    }
    return {
      kind: "damage-required",
      label: followUp.label,
      outcome: followUp.oddText,
      note: `Malfunction effect roll: ${roll} (odd).`,
      followUp: {
        kind: "damage",
        type: followUp.type,
        damage: followUp.damage,
        code: followUp.code,
        label: "Malfunction damage",
      },
    };
  }

  if (followUp.kind === "special") {
    const rounds = Math.floor(roll / 2);
    if (followUp.special === "stun" || followUp.special === "stun-area") {
      const target = followUp.special === "stun-area" ? "Everyone within 5 meters is" : "The target is";
      return {
        kind: "special",
        label: followUp.special === "stun-area" ? "Stun gun malfunction" : "Stun effect",
        outcome: `${target} stunned for ${rounds} combat round${rounds === 1 ? "" : "s"}.`,
        note: "The effect roll is halved and fractions are rounded down.",
        followUp: null,
      };
    }

    const location = hitLocation(roll);
    const outcome = location === "Head"
      ? "The rope wraps around the target's neck. The target will strangle unless another character removes it; removal takes one round."
      : "That location is immobilized and cannot be used until another character removes the rope; removal takes one round.";
    return {
      kind: "special",
      label: `Tangler hit: ${location}`,
      outcome,
      note: "The follow-up d20 is used as the Hit Location roll.",
      followUp: null,
    };
  }

  const outcome = lookupResult(PARANOIA_TABLES.damage, followUp.damage, roll);
  return {
    kind: "damage",
    label: followUp.label,
    outcome,
    note: followUp.note,
    code: followUp.code,
    followUp: null,
  };
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function buildDamageReferenceTable(table, element) {
  const headings = Array.from(
    { length: table.axis.max - table.axis.min + 1 },
    (_, index) => table.axis.min + index,
  );

  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  [table.axis.label, ...headings].forEach((heading) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = heading;
    headRow.append(cell);
  });
  head.append(headRow);

  const body = document.createElement("tbody");
  table.outcomes.forEach((outcome) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = outcome.label;
    row.append(label);

    outcome.ranges.forEach((range) => {
      const cell = document.createElement("td");
      cell.textContent = range;
      row.append(cell);
    });
    body.append(row);
  });

  element.replaceChildren(head, body);
  element.dataset.referenceKind = "damage";
}

function buildWeaponReferenceTable(table, element) {
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Weapon", "Attack skill", "Attribute", "Damage", "Type", "Class", "Malfunctions on", "Malfunction effect"].forEach((heading) => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = heading;
    headRow.append(cell);
  });
  head.append(headRow);

  const body = document.createElement("tbody");
  table.weapons.forEach((weapon) => {
    const row = document.createElement("tr");
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = `${weapon.group} — ${weapon.name}`;
    row.append(label);

    const malfunctionRange = weapon.reliability === "none"
      ? "—"
      : weapon.laser
        ? "20; decreases after shot 6"
        : weapon.reliability === "experimental" ? "19–20" : "20";
    const values = [
      weapon.skill.name,
      weapon.skill.attribute,
      Number.isInteger(weapon.damage) ? weapon.damage : "—",
      weapon.type ?? "—",
      weapon.reliability === "none" ? "No malfunction" : weapon.reliability,
      malfunctionRange,
      weapon.malfunction,
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });
    body.append(row);
  });

  element.replaceChildren(head, body);
  element.dataset.referenceKind = "weapons";
}

function buildReferenceTable(table, element) {
  if (table.kind === "weapons") {
    buildWeaponReferenceTable(table, element);
  } else {
    buildDamageReferenceTable(table, element);
  }
}

function createNumberField(field, value = "") {
  const label = document.createElement("label");
  label.className = "paranoia-field";
  label.htmlFor = `table-${field.id}`;

  const text = document.createElement("span");
  text.textContent = field.label;

  const input = document.createElement("input");
  input.id = `table-${field.id}`;
  input.name = field.id;
  input.type = "number";
  input.min = field.min;
  input.max = field.max;
  input.step = "1";
  input.required = true;
  input.inputMode = "numeric";
  input.value = value;

  label.append(text, input);
  return label;
}

export function initParanoiaTables(root = document) {
  const form = root.querySelector("#paranoia-table-form");
  if (!form) return;

  const choice = root.querySelector("#table-choice");
  const inputs = root.querySelector("#table-inputs");
  const description = root.querySelector("#table-description");
  const result = root.querySelector("#table-result");
  const validation = root.querySelector("#table-validation");
  const rollButton = root.querySelector("#roll-table-die");
  const reference = root.querySelector("#table-reference");
  const submitButton = form.querySelector('button[type="submit"]');
  let weaponState = { phase: "attack", followUp: null };

  Object.entries(PARANOIA_TABLES).forEach(([id, table]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = table.title;
    choice.append(option);
  });

  function activeTable() {
    return PARANOIA_TABLES[choice.value];
  }

  function resetWeaponFlow({ clearResult = true } = {}) {
    weaponState = { phase: "attack", followUp: null };
    const followUpField = root.querySelector("#table-followUpRoll")?.closest(".paranoia-field");
    const followUpInput = root.querySelector("#table-followUpRoll");
    if (followUpField) followUpField.hidden = true;
    if (followUpInput) followUpInput.value = "";
    submitButton.textContent = "Check attack";
    rollButton.textContent = "Roll attack d20";
    validation.hidden = true;
    if (clearResult) result.innerHTML = '<span class="paranoia-result__prompt">Awaiting attack check.</span>';
  }

  function syncWeaponConditionalFields(table, { reset = true } = {}) {
    if (table.kind !== "weapons") return;
    const weaponSelect = root.querySelector("#table-weapon");
    const laserField = root.querySelector("#table-laserShot")?.closest(".paranoia-field");
    const laserInput = root.querySelector("#table-laserShot");
    const skillLabel = root.querySelector("#table-skill")?.closest(".paranoia-field")?.querySelector("span");
    const weapon = table.weapons.find((item) => item.id === weaponSelect?.value);
    const showLaserShot = Boolean(weapon?.laser);

    if (skillLabel) {
      skillLabel.textContent = weapon
        ? `${weapon.skill.name} skill number (${weapon.skill.attribute})`
        : "Relevant skill number";
    }
    if (laserField) laserField.hidden = !showLaserShot;
    if (laserInput) {
      laserInput.required = showLaserShot;
      if (!showLaserShot) laserInput.value = "1";
    }
    if (reset) resetWeaponFlow();
  }

  function setFollowUpPhase(followUp) {
    weaponState = { phase: "followUp", followUp };
    const field = root.querySelector("#table-followUpRoll")?.closest(".paranoia-field");
    const input = root.querySelector("#table-followUpRoll");
    const label = field?.querySelector("span");
    const isConditional = followUp.kind === "conditionalDamage";
    const isSpecial = followUp.kind === "special";
    const prompt = isConditional
      ? "Malfunction effect d20 roll"
      : isSpecial ? "Weapon effect d20 roll" : `${followUp.code} damage d20 roll`;

    if (label) label.textContent = prompt;
    if (field) field.hidden = false;
    if (input) input.value = "";
    submitButton.textContent = isConditional ? "Resolve malfunction" : isSpecial ? "Resolve effect" : "Resolve damage";
    rollButton.textContent = `Roll ${isConditional ? "malfunction" : isSpecial ? "effect" : "damage"} d20`;
  }

  function renderMatrixInputs(table) {
    const fields = [table.axis, { ...table.die, min: 1, max: table.die.sides }];
    const fragment = document.createDocumentFragment();

    fields.forEach((field) => {
      fragment.append(createNumberField(field));
    });

    inputs.replaceChildren(fragment);
    submitButton.textContent = "Find result";
    rollButton.textContent = `Roll d${table.die.sides}`;
  }

  function renderWeaponInputs(table) {
    const fragment = document.createDocumentFragment();
    const weaponLabel = document.createElement("label");
    weaponLabel.className = "paranoia-field paranoia-field--wide";
    weaponLabel.htmlFor = "table-weapon";

    const weaponText = document.createElement("span");
    weaponText.textContent = "Weapon";
    const weaponSelect = document.createElement("select");
    weaponSelect.id = "table-weapon";
    weaponSelect.name = "weapon";
    weaponSelect.required = true;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a weapon";
    weaponSelect.append(placeholder);

    const groups = new Map();
    table.weapons.forEach((weapon) => {
      if (!groups.has(weapon.group)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = weapon.group;
        groups.set(weapon.group, optgroup);
        weaponSelect.append(optgroup);
      }
      const option = document.createElement("option");
      option.value = weapon.id;
      option.textContent = weapon.name;
      groups.get(weapon.group).append(option);
    });

    weaponLabel.append(weaponText, weaponSelect);
    fragment.append(weaponLabel);
    fragment.append(createNumberField({ id: "skill", label: "Relevant skill number", min: 0, max: 20 }));
    fragment.append(createNumberField({ ...table.attackDie, min: 1, max: table.attackDie.sides }));

    const laserField = createNumberField({ id: "laserShot", label: "Laser barrel shot number", min: 1, max: 25 }, "1");
    laserField.hidden = true;
    fragment.append(laserField);

    const followUpField = createNumberField({ id: "followUpRoll", label: "Follow-up d20 roll", min: 1, max: 20 });
    followUpField.hidden = true;
    fragment.append(followUpField);

    inputs.replaceChildren(fragment);
    weaponSelect.addEventListener("change", () => syncWeaponConditionalFields(table));
    ["skill", "attack", "laserShot"].forEach((id) => {
      root.querySelector(`#table-${id}`).addEventListener("input", () => resetWeaponFlow());
    });
    resetWeaponFlow({ clearResult: false });
  }

  function renderInputs(table) {
    if (table.kind === "weapons") renderWeaponInputs(table);
    else renderMatrixInputs(table);

    description.textContent = table.description;
    buildReferenceTable(table, reference);
    result.innerHTML = table.kind === "weapons"
      ? '<span class="paranoia-result__prompt">Awaiting attack check.</span>'
      : '<span class="paranoia-result__prompt">Awaiting authorized input.</span>';
    validation.hidden = true;
  }

  function showInvalid(message) {
    validation.textContent = message;
    validation.hidden = false;
    result.innerHTML = '<span class="paranoia-result__prompt">Invalid or incomplete input.</span>';
  }

  function renderMatrixResult(table) {
    const axisInput = root.querySelector(`#table-${table.axis.id}`);
    const dieInput = root.querySelector(`#table-${table.die.id}`);
    const axisValue = Number(axisInput.value);
    const roll = Number(dieInput.value);

    const axisValid = Number.isInteger(axisValue) && axisValue >= table.axis.min && axisValue <= table.axis.max;
    const rollValid = Number.isInteger(roll) && roll >= 1 && roll <= table.die.sides;

    if (!axisValid || !rollValid) {
      showInvalid(`Enter a ${table.axis.label.toLowerCase()} from ${table.axis.min}–${table.axis.max} and a d${table.die.sides} roll from 1–${table.die.sides}.`);
      return;
    }

    const outcome = lookupResult(table, axisValue, roll);
    if (!outcome) {
      validation.textContent = "No result covers that combination. Please report this data error to Friend Computer.";
      validation.hidden = false;
      result.innerHTML = '<span class="paranoia-result__prompt">No matching result.</span>';
      return;
    }

    validation.hidden = true;
    result.replaceChildren();

    const label = document.createElement("span");
    label.className = "paranoia-result__label";
    label.textContent = "Damage received";

    const outcomeText = document.createElement("span");
    outcomeText.className = "paranoia-result__outcome";
    outcomeText.textContent = outcome;

    const rollText = document.createElement("span");
    rollText.className = "paranoia-result__roll";
    rollText.textContent = `${table.axis.label} ${axisValue} · d${table.die.sides} roll ${roll}`;

    result.append(label, outcomeText, rollText);

    const url = new URL(window.location.href);
    url.searchParams.set("table", choice.value);
    url.searchParams.set(table.axis.id, String(axisValue));
    url.searchParams.set(table.die.id, String(roll));
    window.history.replaceState({}, "", url);
  }

  function renderWeaponOutcome(weapon, skillNumber, attackRoll, resolved, followUpRoll = null, followUpCode = null) {
    validation.hidden = true;
    result.replaceChildren();

    const label = document.createElement("span");
    label.className = "paranoia-result__label";
    label.textContent = resolved.label;

    const outcomeText = document.createElement("span");
    outcomeText.className = "paranoia-result__outcome";
    outcomeText.textContent = resolved.outcome;

    const rollText = document.createElement("span");
    rollText.className = "paranoia-result__roll";
    const attackStatus = attackRollSucceeds(skillNumber, attackRoll) ? "success" : "failure";
    const malfunctionText = resolved.malfunctionNumber ? ` · malfunction ${resolved.malfunctionNumber}+` : "";
    const followUpText = followUpRoll === null ? "" : ` · ${followUpCode ?? "follow-up"} roll ${followUpRoll}`;
    rollText.textContent = `${weapon.group} — ${weapon.name} · ${weapon.skill.name} ${skillNumber} · attack ${attackRoll} (${attackStatus})${malfunctionText}${followUpText}`;

    result.append(label, outcomeText, rollText);
    if (resolved.note) {
      const note = document.createElement("span");
      note.className = "paranoia-result__note";
      note.textContent = resolved.note;
      result.append(note);
    }
  }

  function updateWeaponUrl(weapon, skillNumber, attackRoll, laserShot) {
    const url = new URL(window.location.href);
    url.searchParams.set("table", choice.value);
    url.searchParams.set("weapon", weapon.id);
    url.searchParams.set("skill", String(skillNumber));
    url.searchParams.set("attack", String(attackRoll));
    url.searchParams.delete("effectRoll");
    url.searchParams.delete("damageRoll");
    if (weapon.laser) url.searchParams.set("laserShot", String(laserShot));
    else url.searchParams.delete("laserShot");
    window.history.replaceState({}, "", url);
  }

  function renderWeaponAttack(table) {
    const weaponId = root.querySelector("#table-weapon")?.value;
    const weapon = table.weapons.find((item) => item.id === weaponId);
    const skillNumber = Number(root.querySelector("#table-skill")?.value);
    const attackRoll = Number(root.querySelector("#table-attack")?.value);
    const laserShot = Number(root.querySelector("#table-laserShot")?.value || 1);
    const skillValid = Number.isInteger(skillNumber) && skillNumber >= 0 && skillNumber <= 20;
    const attackValid = Number.isInteger(attackRoll) && attackRoll >= 1 && attackRoll <= 20;
    const laserValid = !weapon?.laser || (Number.isInteger(laserShot) && laserShot >= 1 && laserShot <= 25);

    if (!weapon || !skillValid || !attackValid || !laserValid) {
      showInvalid("Choose a weapon, enter its relevant skill number from 0–20, and enter an attack d20 roll from 1–20. Laser weapons also require the barrel's current shot number.");
      return;
    }

    const resolved = resolveAttackCheck(weapon, skillNumber, attackRoll, { laserShot });
    if (resolved.followUp) {
      const nextStep = resolved.followUp.kind === "conditionalDamage"
        ? "Next, roll the malfunction effect d20."
        : resolved.followUp.kind === "special"
          ? "Next, roll the weapon effect d20."
          : `Next, roll ${resolved.followUp.code} damage.`;
      resolved.note = `${resolved.note} ${nextStep}`;
    }
    renderWeaponOutcome(weapon, skillNumber, attackRoll, resolved);
    updateWeaponUrl(weapon, skillNumber, attackRoll, laserShot);

    if (resolved.followUp) setFollowUpPhase(resolved.followUp);
    else resetWeaponFlow({ clearResult: false });
  }

  function renderWeaponFollowUp(table) {
    const weapon = table.weapons.find((item) => item.id === root.querySelector("#table-weapon")?.value);
    const skillNumber = Number(root.querySelector("#table-skill")?.value);
    const attackRoll = Number(root.querySelector("#table-attack")?.value);
    const roll = Number(root.querySelector("#table-followUpRoll")?.value);
    const rollValid = Number.isInteger(roll) && roll >= 1 && roll <= 20;
    if (!weapon || !rollValid || !weaponState.followUp) {
      showInvalid("Enter the requested follow-up d20 roll from 1–20.");
      return;
    }

    const currentFollowUp = weaponState.followUp;
    const resolved = resolveFollowUp(currentFollowUp, roll);
    const rollLabel = ["conditionalDamage", "special"].includes(currentFollowUp.kind) ? "effect" : currentFollowUp.code;
    renderWeaponOutcome(weapon, skillNumber, attackRoll, resolved, roll, rollLabel);

    const url = new URL(window.location.href);
    const parameter = currentFollowUp.kind === "damage" ? "damageRoll" : "effectRoll";
    url.searchParams.set(parameter, String(roll));
    window.history.replaceState({}, "", url);

    if (resolved.followUp) setFollowUpPhase(resolved.followUp);
    else resetWeaponFlow({ clearResult: false });
  }

  function renderWeaponResult(table) {
    if (weaponState.phase === "followUp") renderWeaponFollowUp(table);
    else renderWeaponAttack(table);
  }

  function renderResult(table) {
    if (table.kind === "weapons") renderWeaponResult(table);
    else renderMatrixResult(table);
  }

  choice.addEventListener("change", () => renderInputs(activeTable()));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResult(activeTable());
  });

  rollButton.addEventListener("click", () => {
    const table = activeTable();
    if (table.kind === "weapons") {
      const input = weaponState.phase === "followUp"
        ? root.querySelector("#table-followUpRoll")
        : root.querySelector("#table-attack");
      input.value = rollDie(20);
    } else {
      const dieInput = root.querySelector(`#table-${table.die.id}`);
      dieInput.value = rollDie(table.die.sides);
    }
    renderResult(table);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("table") && PARANOIA_TABLES[params.get("table")]) {
    choice.value = params.get("table");
  }

  const table = activeTable();
  renderInputs(table);
  if (table.kind === "weapons") {
    ["weapon", "skill", "attack", "laserShot"].forEach((id) => {
      if (params.has(id)) root.querySelector(`#table-${id}`).value = params.get(id);
    });
    syncWeaponConditionalFields(table, { reset: false });
    if (params.has("weapon") && params.has("skill") && params.has("attack")) {
      renderWeaponAttack(table);
      if (weaponState.phase === "followUp") {
        const firstParameter = weaponState.followUp.kind === "damage" ? "damageRoll" : "effectRoll";
        if (params.has(firstParameter)) {
          root.querySelector("#table-followUpRoll").value = params.get(firstParameter);
          renderWeaponFollowUp(table);
        }
      }
      if (weaponState.phase === "followUp" && weaponState.followUp.kind === "damage" && params.has("damageRoll")) {
        root.querySelector("#table-followUpRoll").value = params.get("damageRoll");
        renderWeaponFollowUp(table);
      }
    }
  } else {
    [table.axis.id, table.die.id].forEach((id) => {
      if (params.has(id)) root.querySelector(`#table-${id}`).value = params.get(id);
    });
    if (params.has(table.axis.id) || params.has(table.die.id)) renderResult(table);
  }
}

if (typeof document !== "undefined") {
  initParanoiaTables();
}
