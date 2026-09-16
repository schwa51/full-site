import {
  UVG_HERO_COLUMNS,
  UVG_HERO_TABLE,
  heroResultFor,
  rollD50,
  rollHero,
} from "./uvg-hero-table.js";
import {
  UVG_NAME_GROUPS,
  UVG_QUIRK_TABLES,
  nameGroupFor,
  quirkResultFor,
  quirkTableFor,
  rollD6,
} from "./uvg-names-quirks-data.js";
import {
  UVG_PETS_TABLE,
  petResultFor,
  rollPet,
} from "./uvg-pets-table.js";

const roller = document.querySelector("[data-uvg-hero-roller]");

function addCell(row, tagName, text, attributes = {}) {
  const cell = document.createElement(tagName);
  cell.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => {
    cell.setAttribute(name, value);
  });
  row.append(cell);
}

function populateSelect(select, options, { numbered = false } = {}) {
  const fragment = document.createDocumentFragment();
  options.forEach((option, index) => {
    const element = document.createElement("option");
    element.value = option.id;
    element.textContent = numbered ? `${index + 1}. ${option.label}` : option.label;
    fragment.append(element);
  });
  select.replaceChildren(fragment);
}

if (roller) {
  const announcement = roller.querySelector("[data-roll-announcement]");
  const reference = roller.querySelector(".uvg-reference");
  const referenceTable = roller.querySelector("[data-hero-reference-table]");

  function renderResult(result) {
    const card = roller.querySelector(`[data-result-card="${result.column}"]`);
    const roll = roller.querySelector(`[data-result-roll="${result.column}"]`);
    const text = roller.querySelector(`[data-result-text="${result.column}"]`);
    const button = roller.querySelector(`[data-roll-column="${result.column}"]`);

    roll.textContent = `d50 · ${result.roll}`;
    text.textContent = result.text;
    button.textContent = "Reroll";

    card.classList.remove("is-rolled");
    requestAnimationFrame(() => card.classList.add("is-rolled"));
  }

  function announce(results) {
    announcement.textContent = Object.values(results)
      .map((result) => `${result.label}: roll ${result.roll}, ${result.text}`)
      .join(". ");
  }

  function rollAllColumns() {
    const results = rollHero();
    Object.values(results).forEach(renderResult);
    announce(results);
  }

  function rollOneColumn(column) {
    const result = heroResultFor(column, rollD50());
    renderResult(result);
    announce({ [column]: result });
  }

  function buildReferenceTable() {
    const caption = referenceTable.querySelector("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");

    addCell(headRow, "th", "d50", { scope: "col" });
    Object.values(UVG_HERO_COLUMNS).forEach((label) => {
      addCell(headRow, "th", label, { scope: "col" });
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    UVG_HERO_TABLE.forEach((entry) => {
      const row = document.createElement("tr");
      addCell(row, "th", entry.roll, { scope: "row" });
      addCell(row, "td", entry.identity);
      addCell(row, "td", entry.reason);
      addCell(row, "td", entry.possession);
      body.append(row);
    });

    referenceTable.replaceChildren(caption, head, body);
  }

  roller.querySelector("[data-roll-all]").addEventListener("click", rollAllColumns);

  roller.querySelectorAll("[data-roll-column]").forEach((button) => {
    button.addEventListener("click", () => {
      rollOneColumn(button.dataset.rollColumn);
    });
  });

  reference.addEventListener("toggle", () => {
    reference.querySelector("summary").childNodes[0].textContent = reference.open
      ? "Hide table"
      : "Full table";
  });

  buildReferenceTable();
}

const petRoller = document.querySelector("[data-uvg-pet-roller]");

if (petRoller) {
  const announcement = petRoller.querySelector("[data-pet-roll-announcement]");
  const reference = petRoller.querySelector("[data-pet-reference]");
  const referenceTable = petRoller.querySelector("[data-pet-reference-table]");

  function renderPetResult(result) {
    const card = petRoller.querySelector(`[data-pet-result-card="${result.group}"]`);
    const roll = petRoller.querySelector(`[data-pet-result-roll="${result.group}"]`);
    const button = petRoller.querySelector(`[data-roll-pet-group="${result.group}"]`);

    roll.textContent = `d50 · ${result.roll}`;
    Object.entries(result.values).forEach(([column, value]) => {
      petRoller.querySelector(`[data-pet-result-value="${column}"]`).textContent = value;
    });
    button.textContent = "Reroll";

    card.classList.remove("is-rolled");
    requestAnimationFrame(() => card.classList.add("is-rolled"));
  }

  function describePetResult(result) {
    const values = Object.entries(result.values)
      .map(([column, value]) => `${column}: ${value}`)
      .join(", ");
    return `${result.label}: roll ${result.roll}, ${values}`;
  }

  function announcePet(results) {
    announcement.textContent = Object.values(results)
      .map(describePetResult)
      .join(". ");
  }

  function rollAllPetColumns() {
    const results = rollPet();
    Object.values(results).forEach(renderPetResult);
    announcePet(results);
  }

  function rollPetGroup(group) {
    const result = petResultFor(group, rollD50());
    renderPetResult(result);
    announcePet({ [group]: result });
  }

  function buildPetReferenceTable() {
    const caption = referenceTable.querySelector("caption");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");

    ["d50", "Mien", "Morph", "Attack", "Ability", "Likes"].forEach((label) => {
      addCell(headRow, "th", label, { scope: "col" });
    });
    head.append(headRow);

    const body = document.createElement("tbody");
    UVG_PETS_TABLE.forEach((entry) => {
      const row = document.createElement("tr");
      addCell(row, "th", entry.roll, { scope: "row" });
      addCell(row, "td", entry.mien);
      addCell(row, "td", entry.morph);
      addCell(row, "td", entry.attack);
      addCell(row, "td", entry.ability);
      addCell(row, "td", entry.likes);
      body.append(row);
    });

    referenceTable.replaceChildren(caption, head, body);
  }

  petRoller.querySelector("[data-roll-pet-all]").addEventListener("click", rollAllPetColumns);

  petRoller.querySelectorAll("[data-roll-pet-group]").forEach((button) => {
    button.addEventListener("click", () => {
      rollPetGroup(button.dataset.rollPetGroup);
    });
  });

  reference.addEventListener("toggle", () => {
    reference.querySelector("summary").childNodes[0].textContent = reference.open
      ? "Hide table"
      : "Full table";
  });

  buildPetReferenceTable();
}

const nameBrowser = document.querySelector("[data-uvg-name-browser]");

if (nameBrowser) {
  const select = nameBrowser.querySelector("[data-name-group]");
  const table = nameBrowser.querySelector("[data-name-table]");
  const caption = nameBrowser.querySelector("[data-name-caption]");

  function renderNameGroup() {
    const group = nameGroupFor(select.value);
    if (!group) return;

    caption.textContent = `${group.label} names`;
    table.setAttribute("aria-label", `${group.label} names`);

    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    addCell(headRow, "th", `${group.label} names`, { scope: "col" });
    head.append(headRow);

    const body = document.createElement("tbody");
    group.names.forEach((name) => {
      const row = document.createElement("tr");
      addCell(row, "td", name);
      body.append(row);
    });

    table.replaceChildren(caption, head, body);
  }

  populateSelect(select, UVG_NAME_GROUPS);
  select.addEventListener("change", renderNameGroup);
  renderNameGroup();
}

const quirkRoller = document.querySelector("[data-uvg-quirk-roller]");

if (quirkRoller) {
  const select = quirkRoller.querySelector("[data-quirk-table]");
  const rollButton = quirkRoller.querySelector("[data-roll-quirk]");
  const rollDisplay = quirkRoller.querySelector("[data-quirk-roll]");
  const textDisplay = quirkRoller.querySelector("[data-quirk-text]");
  const result = quirkRoller.querySelector("[data-quirk-result]");
  const announcement = quirkRoller.querySelector("[data-quirk-announcement]");
  const reference = quirkRoller.querySelector("[data-quirk-reference]");
  const referenceTable = quirkRoller.querySelector("[data-quirk-reference-table]");
  const referenceCaption = quirkRoller.querySelector("[data-quirk-caption]");

  function buildQuirkReferenceTable() {
    const table = quirkTableFor(select.value);
    if (!table) return;

    referenceCaption.textContent = `${table.label} complete d6 table`;

    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    addCell(headRow, "th", "d6", { scope: "col" });
    addCell(headRow, "th", table.label, { scope: "col" });
    head.append(headRow);

    const body = document.createElement("tbody");
    table.entries.forEach((entry, index) => {
      const row = document.createElement("tr");
      addCell(row, "th", index + 1, { scope: "row" });
      addCell(row, "td", entry);
      body.append(row);
    });

    referenceTable.replaceChildren(referenceCaption, head, body);
  }

  function resetQuirkResult() {
    rollDisplay.textContent = "d6";
    textDisplay.textContent = "—";
    rollButton.textContent = "Roll d6";
    result.classList.remove("is-rolled");
    announcement.textContent = "";
    buildQuirkReferenceTable();
  }

  function rollQuirk() {
    const rolled = quirkResultFor(select.value, rollD6());
    if (!rolled) return;

    rollDisplay.textContent = `d6 · ${rolled.roll}`;
    textDisplay.textContent = rolled.text;
    rollButton.textContent = "Reroll d6";
    announcement.textContent = `${rolled.label}: roll ${rolled.roll}, ${rolled.text}`;

    result.classList.remove("is-rolled");
    requestAnimationFrame(() => result.classList.add("is-rolled"));
  }

  populateSelect(select, UVG_QUIRK_TABLES, { numbered: true });
  select.addEventListener("change", resetQuirkResult);
  rollButton.addEventListener("click", rollQuirk);
  reference.addEventListener("toggle", () => {
    reference.querySelector("summary").childNodes[0].textContent = reference.open
      ? "Hide table"
      : "Full table";
  });
  resetQuirkResult();
}
