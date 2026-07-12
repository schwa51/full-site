import { PARANOIA_WEAPONS } from "./paranoia-weapons-data.js?v=20260712-1";

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
    description: "Choose a weapon, enter the attack skill roll to check for malfunction, then enter a separate d20 damage roll.",
    weapons: PARANOIA_WEAPONS,
    attackDie: { id: "attack", label: "Attack skill roll", sides: 20 },
    damageDie: { id: "damageRoll", label: "Damage d20 roll", sides: 20 },
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

function hitLocation(roll) {
  if (roll <= 2) return "Head";
  if (roll <= 4) return "Left Arm";
  if (roll <= 6) return "Right Arm";
  if (roll <= 11) return "Chest";
  if (roll <= 14) return "Abdomen";
  if (roll <= 17) return "Left Leg";
  return "Right Leg";
}

export function resolveWeaponResult(weapon, attackRoll, damageRoll, options = {}) {
  const malfunctionNumber = weaponMalfunctionNumber(weapon, options.laserShot);
  const code = weaponCode(weapon);

  if (malfunctionNumber && attackRoll >= malfunctionNumber) {
    return {
      kind: "malfunction",
      label: "Weapon malfunction",
      outcome: weapon.malfunction,
      note: `This ${weapon.reliability} weapon malfunctions on ${malfunctionNumber} or higher.`,
      code,
      malfunctionNumber,
    };
  }

  if (weapon.special?.kind === "stun") {
    const rounds = Math.floor(damageRoll / 2);
    return {
      kind: "special",
      label: "Stun effect",
      outcome: `The target is stunned for ${rounds} combat round${rounds === 1 ? "" : "s"}.`,
      note: "The damage roll is halved and fractions are rounded down.",
      code,
      malfunctionNumber,
    };
  }

  if (weapon.special?.kind === "tangler") {
    const location = hitLocation(damageRoll);
    const outcome = location === "Head"
      ? "The rope wraps around the target's neck. The target will strangle unless another character removes it; removal takes one round."
      : "That location is immobilized and cannot be used until another character removes the rope; removal takes one round.";
    return {
      kind: "special",
      label: `Tangler hit: ${location}`,
      outcome,
      note: "For the tangler, the second d20 is used as the Hit Location roll.",
      code,
      malfunctionNumber,
    };
  }

  if (weapon.special) {
    return {
      kind: "special",
      label: "Special ammunition effect",
      outcome: weapon.special.text,
      note: "This selection has no single normal Damage Table result.",
      code,
      malfunctionNumber,
    };
  }

  const lookupDamageNumber = weapon.lookupDamageNumber ?? weapon.damage;
  const outcome = lookupResult(PARANOIA_TABLES.damage, lookupDamageNumber, damageRoll);
  return {
    kind: "damage",
    label: "Damage received",
    outcome,
    note: weapon.note,
    code,
    malfunctionNumber,
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
  ["Weapon", "Damage", "Type", "Class", "Malfunctions on", "Malfunction effect"].forEach((heading) => {
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

  Object.entries(PARANOIA_TABLES).forEach(([id, table]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = table.title;
    choice.append(option);
  });

  function activeTable() {
    return PARANOIA_TABLES[choice.value];
  }

  function syncWeaponConditionalFields(table) {
    if (table.kind !== "weapons") return;
    const weaponSelect = root.querySelector("#table-weapon");
    const laserField = root.querySelector("#table-laserShot")?.closest(".paranoia-field");
    const laserInput = root.querySelector("#table-laserShot");
    const weapon = table.weapons.find((item) => item.id === weaponSelect?.value);
    const showLaserShot = Boolean(weapon?.laser);

    if (laserField) laserField.hidden = !showLaserShot;
    if (laserInput) {
      laserInput.required = showLaserShot;
      if (!showLaserShot) laserInput.value = "1";
    }
  }

  function renderMatrixInputs(table) {
    const fields = [table.axis, { ...table.die, min: 1, max: table.die.sides }];
    const fragment = document.createDocumentFragment();

    fields.forEach((field) => {
      fragment.append(createNumberField(field));
    });

    inputs.replaceChildren(fragment);
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
    fragment.append(createNumberField({ ...table.attackDie, min: 1, max: table.attackDie.sides }));
    fragment.append(createNumberField({ ...table.damageDie, min: 1, max: table.damageDie.sides }));

    const laserField = createNumberField({ id: "laserShot", label: "Laser barrel shot number", min: 1, max: 25 }, "1");
    laserField.hidden = true;
    fragment.append(laserField);

    inputs.replaceChildren(fragment);
    weaponSelect.addEventListener("change", () => syncWeaponConditionalFields(table));
    rollButton.textContent = "Roll both d20s";
  }

  function renderInputs(table) {
    if (table.kind === "weapons") renderWeaponInputs(table);
    else renderMatrixInputs(table);

    description.textContent = table.description;
    buildReferenceTable(table, reference);
    result.innerHTML = '<span class="paranoia-result__prompt">Awaiting authorized input.</span>';
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

  function renderWeaponResult(table) {
    const weaponId = root.querySelector("#table-weapon")?.value;
    const weapon = table.weapons.find((item) => item.id === weaponId);
    const attackRoll = Number(root.querySelector("#table-attack")?.value);
    const damageRoll = Number(root.querySelector("#table-damageRoll")?.value);
    const laserShot = Number(root.querySelector("#table-laserShot")?.value || 1);
    const attackValid = Number.isInteger(attackRoll) && attackRoll >= 1 && attackRoll <= 20;
    const damageValid = Number.isInteger(damageRoll) && damageRoll >= 1 && damageRoll <= 20;
    const laserValid = !weapon?.laser || (Number.isInteger(laserShot) && laserShot >= 1 && laserShot <= 25);

    if (!weapon || !attackValid || !damageValid || !laserValid) {
      showInvalid("Choose a weapon and enter separate attack and damage rolls from 1–20. Laser weapons also require the barrel's current shot number.");
      return;
    }

    const resolved = resolveWeaponResult(weapon, attackRoll, damageRoll, { laserShot });
    if (!resolved.outcome) {
      validation.textContent = "No result covers that combination. Please report this data error to Friend Computer.";
      validation.hidden = false;
      result.innerHTML = '<span class="paranoia-result__prompt">No matching result.</span>';
      return;
    }

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
    const threshold = resolved.malfunctionNumber ? ` · malfunction ${resolved.malfunctionNumber}+` : " · no malfunction";
    const laserText = weapon.laser ? ` · barrel shot ${laserShot}` : "";
    rollText.textContent = `${weapon.group} — ${weapon.name} · ${resolved.code} · attack ${attackRoll} · damage ${damageRoll}${threshold}${laserText}`;

    result.append(label, outcomeText, rollText);
    if (resolved.note) {
      const note = document.createElement("span");
      note.className = "paranoia-result__note";
      note.textContent = resolved.note;
      result.append(note);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("table", choice.value);
    url.searchParams.set("weapon", weapon.id);
    url.searchParams.set("attack", String(attackRoll));
    url.searchParams.set("damageRoll", String(damageRoll));
    if (weapon.laser) url.searchParams.set("laserShot", String(laserShot));
    else url.searchParams.delete("laserShot");
    window.history.replaceState({}, "", url);
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
      root.querySelector("#table-attack").value = rollDie(table.attackDie.sides);
      root.querySelector("#table-damageRoll").value = rollDie(table.damageDie.sides);
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
    ["weapon", "attack", "damageRoll", "laserShot"].forEach((id) => {
      if (params.has(id)) root.querySelector(`#table-${id}`).value = params.get(id);
    });
    syncWeaponConditionalFields(table);
    if (params.has("weapon") || params.has("attack") || params.has("damageRoll")) renderResult(table);
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
