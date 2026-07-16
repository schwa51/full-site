import {
  UVG_HERO_COLUMNS,
  UVG_HERO_TABLE,
  heroResultFor,
  rollD50,
  rollHero,
} from "./uvg-hero-table.js";

const roller = document.querySelector("[data-uvg-hero-roller]");

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
    button.textContent = "Reroll this column";

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

  function addCell(row, tagName, text, attributes = {}) {
    const cell = document.createElement(tagName);
    cell.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => {
      cell.setAttribute(name, value);
    });
    row.append(cell);
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
      ? "Hide the complete d50 table"
      : "Show the complete d50 table";
  });

  buildReferenceTable();
}
