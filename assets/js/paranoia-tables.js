export const PARANOIA_TABLES = {
  damage: {
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

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function buildReferenceTable(table, element) {
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

  function renderInputs(table) {
    const fields = [table.axis, { ...table.die, min: 1, max: table.die.sides }];
    const fragment = document.createDocumentFragment();

    fields.forEach((field) => {
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

      label.append(text, input);
      fragment.append(label);
    });

    inputs.replaceChildren(fragment);
    description.textContent = table.description;
    rollButton.textContent = `Roll d${table.die.sides}`;
    buildReferenceTable(table, reference);
    result.innerHTML = '<span class="paranoia-result__prompt">Awaiting authorized input.</span>';
    validation.hidden = true;
  }

  function renderResult(table) {
    const axisInput = root.querySelector(`#table-${table.axis.id}`);
    const dieInput = root.querySelector(`#table-${table.die.id}`);
    const axisValue = Number(axisInput.value);
    const roll = Number(dieInput.value);

    const axisValid = Number.isInteger(axisValue) && axisValue >= table.axis.min && axisValue <= table.axis.max;
    const rollValid = Number.isInteger(roll) && roll >= 1 && roll <= table.die.sides;

    if (!axisValid || !rollValid) {
      validation.textContent = `Enter a ${table.axis.label.toLowerCase()} from ${table.axis.min}–${table.axis.max} and a d${table.die.sides} roll from 1–${table.die.sides}.`;
      validation.hidden = false;
      result.innerHTML = '<span class="paranoia-result__prompt">Invalid or incomplete input.</span>';
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

  choice.addEventListener("change", () => renderInputs(activeTable()));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderResult(activeTable());
  });

  rollButton.addEventListener("click", () => {
    const table = activeTable();
    const dieInput = root.querySelector(`#table-${table.die.id}`);
    dieInput.value = rollDie(table.die.sides);
    renderResult(table);
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("table") && PARANOIA_TABLES[params.get("table")]) {
    choice.value = params.get("table");
  }

  const table = activeTable();
  renderInputs(table);
  [table.axis.id, table.die.id].forEach((id) => {
    if (params.has(id)) root.querySelector(`#table-${id}`).value = params.get(id);
  });
  if (params.has(table.axis.id) || params.has(table.die.id)) renderResult(table);
}

if (typeof document !== "undefined") {
  initParanoiaTables();
}
