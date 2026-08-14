const API_URL = "/gm/api/tyov/chronicle";
const DRAFT_KEY = "tyov-chronicle-draft-v1";
const ACTIVE_TAB_KEY = "tyov-chronicle-tab-v1";

const clone = (value) => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();

export function uid(prefix = "tyov") {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character]);
}

function localDate(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function calculateMovement(d10, d6, promptNumber) {
  const ten = Number(d10);
  const six = Number(d6);
  const prompt = Number(promptNumber);
  if (!Number.isInteger(ten) || ten < 1 || ten > 10 || !Number.isInteger(six) || six < 1 || six > 6) {
    return { movement: null, nextPrompt: null };
  }
  const movement = ten - six;
  return {
    movement,
    nextPrompt: Number.isFinite(prompt) ? prompt + movement : null,
  };
}

export function createEmptyChronicle() {
  const timestamp = now();
  return {
    schemaVersion: 1,
    setupComplete: false,
    vampire: {
      name: "",
      mortalIdentity: "",
      era: "",
      birthplace: "",
      currentPrompt: "1",
      ended: false,
      ending: "",
    },
    memories: [],
    experiences: [],
    traits: { skills: [], resources: [], characters: [], marks: [] },
    diaries: [],
    prompts: [],
    history: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function normalizeChronicle(value = {}) {
  const base = createEmptyChronicle();
  return {
    ...base,
    ...value,
    schemaVersion: 1,
    vampire: { ...base.vampire, ...(value.vampire ?? {}) },
    memories: Array.isArray(value.memories) ? value.memories : [],
    experiences: Array.isArray(value.experiences) ? value.experiences : [],
    traits: {
      skills: Array.isArray(value.traits?.skills) ? value.traits.skills : [],
      resources: Array.isArray(value.traits?.resources) ? value.traits.resources : [],
      characters: Array.isArray(value.traits?.characters) ? value.traits.characters : [],
      marks: Array.isArray(value.traits?.marks) ? value.traits.marks : [],
    },
    diaries: Array.isArray(value.diaries) ? value.diaries : [],
    prompts: Array.isArray(value.prompts) ? value.prompts : [],
    history: Array.isArray(value.history) ? value.history : [],
  };
}

function memoryRecord(title, experienceIds = []) {
  return {
    id: uid("memory"),
    title: String(title || "Untitled Memory"),
    status: "active",
    sealed: false,
    experienceIds,
    diaryId: null,
    forgottenAt: null,
    forgottenReason: "",
    createdAt: now(),
  };
}

function experienceRecord(text, source = "creation", promptEntryId = null, order = 1) {
  return {
    id: uid("experience"),
    text: String(text || ""),
    source,
    promptEntryId,
    order,
    createdAt: now(),
  };
}

function traitRecord(name, description = "", extra = {}) {
  return {
    id: uid("trait"),
    name: String(name || "Unnamed trait"),
    description: String(description || ""),
    status: "active",
    createdAt: now(),
    changedAt: null,
    ...extra,
  };
}

function historyRecord(type, label, details = "", promptEntryId = null) {
  return { id: uid("history"), type, label, details, promptEntryId, at: now() };
}

export function buildStartingChronicle(values) {
  const chronicle = createEmptyChronicle();
  chronicle.setupComplete = true;
  chronicle.vampire = {
    ...chronicle.vampire,
    name: values.vampireName,
    mortalIdentity: values.mortalIdentity,
    era: values.era,
    birthplace: values.birthplace,
  };

  const experienceTexts = [
    values.originExperience,
    ...values.formativeExperiences,
    values.transformationExperience,
  ];
  const memoryTitles = [
    values.originMemoryTitle || "The Mortal Life",
    ...values.memoryTitles,
    values.transformationMemoryTitle || "The Night I Became",
  ];

  experienceTexts.forEach((text, index) => {
    const experience = experienceRecord(text, "creation", null, index + 1);
    chronicle.experiences.push(experience);
    chronicle.memories.push(memoryRecord(memoryTitles[index], [experience.id]));
  });

  chronicle.traits.skills = values.skills.map((name) => traitRecord(name));
  chronicle.traits.resources = values.resources.map((name) => traitRecord(name, "", { stationary: false, kind: "resource" }));
  chronicle.traits.characters = [
    ...values.mortals.map((character) => traitRecord(character.name, character.description, { type: "mortal" })),
    traitRecord(values.immortal.name, values.immortal.description, { type: "immortal" }),
  ];
  chronicle.traits.marks = [traitRecord(values.mark.name, values.mark.concealment)];
  chronicle.history.push(historyRecord("creation", "The Chronicle begins", `${values.vampireName} enters an immortal life with five Memories.`));
  chronicle.updatedAt = now();
  return chronicle;
}

export function promptEncounterCount(chronicle, promptNumber) {
  return chronicle.prompts.filter((entry) => String(entry.promptNumber) === String(promptNumber)).length + 1;
}

export function validateChronicleRules(chronicle) {
  const errors = [];
  const active = chronicle.memories.filter((memory) => memory.status === "active");
  if (active.length > 5) errors.push("A vampire may hold no more than five active Memories.");
  chronicle.memories.forEach((memory) => {
    if (memory.experienceIds.length > 3) errors.push(`${memory.title} contains more than three Experiences.`);
  });
  const activeDiaries = chronicle.diaries.filter((diary) => diary.status === "active");
  if (activeDiaries.length > 1) errors.push("Only one Diary may be active at a time.");
  activeDiaries.forEach((diary) => {
    const count = chronicle.memories.filter((memory) => memory.diaryId === diary.id && memory.status === "diary").length;
    if (count < 1 || count > 4) errors.push("An active Diary must contain between one and four Memories.");
  });
  chronicle.prompts.forEach((entry) => {
    if (!entry.experienceId) errors.push(`Prompt entry ${entry.order} has no Experience.`);
  });
  return errors;
}

function setupTemplate() {
  const repeatedFields = (kind, labels) => labels.map((label, index) => `
    <label class="tyov-field">
      <span>${escapeHtml(label)}</span>
      <input name="${kind}" required data-setup-first="${index === 0 ? "true" : "false"}">
    </label>`).join("");

  return `<form id="tyov-setup-form" class="tyov-panel tyov-setup" autocomplete="off">
    <header class="tyov-setup-intro">
      <p class="tyov-kicker">Vampire creation</p>
      <h1>Begin before the forgetting.</h1>
      <p>Create the five Memories and defining traits your vampire carries into undeath. Every Experience should be written in the vampire’s voice.</p>
    </header>

    <section class="tyov-setup-step">
      <div class="tyov-setup-step__title"><span>01</span><h2>The mortal life</h2><p>Who were you before the night closed over you?</p></div>
      <div class="tyov-setup-grid">
        <label class="tyov-field"><span>Vampire’s name</span><input name="vampireName" required autofocus></label>
        <label class="tyov-field"><span>Mortal identity</span><input name="mortalIdentity" required placeholder="A midwife, knight, scholar…"></label>
        <label class="tyov-field"><span>Era</span><input name="era" required placeholder="13th century"></label>
        <label class="tyov-field"><span>Birthplace</span><input name="birthplace" required></label>
        <label class="tyov-field"><span>First Memory theme</span><input name="originMemoryTitle" value="The Mortal Life" required></label>
        <label class="tyov-field tyov-field--wide"><span>First Experience</span><textarea name="originExperience" required placeholder="A broad, evocative sentence summarizing the mortal life."></textarea></label>
      </div>
    </section>

    <section class="tyov-setup-step">
      <div class="tyov-setup-step__title"><span>02</span><h2>Mortal ties</h2><p>Name at least three people who matter and describe each relationship.</p></div>
      <div class="tyov-setup-grid">
        ${[1, 2, 3].map((number) => `<label class="tyov-field"><span>Mortal ${number}</span><input name="mortalName" required></label><label class="tyov-field"><span>Relationship</span><input name="mortalDescription" required></label>`).join("")}
      </div>
    </section>

    <section class="tyov-setup-step">
      <div class="tyov-setup-step__title"><span>03</span><h2>What you can do and possess</h2><p>Choose traits grounded in the life and time you have described.</p></div>
      <div>
        <div class="tyov-setup-grid">
          ${repeatedFields("skill", ["Skill 1", "Skill 2", "Skill 3"])}
          ${repeatedFields("resource", ["Resource 1", "Resource 2", "Resource 3"])}
        </div>
      </div>
    </section>

    <section class="tyov-setup-step">
      <div class="tyov-setup-step__title"><span>04</span><h2>Three formative Memories</h2><p>Each Experience should connect two of your existing traits.</p></div>
      <div class="tyov-setup-grid">
        ${[1, 2, 3].map((number) => `<label class="tyov-field"><span>Memory ${number + 1} theme</span><input name="memoryTitle" required></label><label class="tyov-field"><span>Experience ${number + 1}</span><textarea name="formativeExperience" required></textarea></label>`).join("")}
      </div>
    </section>

    <section class="tyov-setup-step">
      <div class="tyov-setup-step__title"><span>05</span><h2>The immortal night</h2><p>Name your maker, the Mark of your undying state, and what happened.</p></div>
      <div class="tyov-setup-grid">
        <label class="tyov-field"><span>Immortal’s name</span><input name="immortalName" required></label>
        <label class="tyov-field"><span>Immortal’s description</span><input name="immortalDescription" required></label>
        <label class="tyov-field"><span>Mark</span><input name="markName" required></label>
        <label class="tyov-field"><span>How it is concealed</span><input name="markConcealment"></label>
        <label class="tyov-field"><span>Final Memory theme</span><input name="transformationMemoryTitle" value="The Night I Became" required></label>
        <label class="tyov-field tyov-field--wide"><span>Transformation Experience</span><textarea name="transformationExperience" required></textarea></label>
      </div>
    </section>

    <div class="tyov-toolbar">
      <button type="submit" class="tyov-button">Seal the first five Memories</button>
      <button type="button" class="tyov-button--quiet" data-action="import-json">Import a backup</button>
      <input class="tyov-sr-only" data-import-file type="file" accept="application/json,.json">
    </div>
  </form>`;
}

function experiencesForMemory(chronicle, memory) {
  const byId = new Map(chronicle.experiences.map((experience) => [experience.id, experience]));
  return memory.experienceIds.map((id) => byId.get(id)).filter(Boolean);
}

function activeDiary(chronicle) {
  return chronicle.diaries.find((diary) => diary.status === "active") ?? null;
}

function memoryCard(chronicle, memory) {
  const experiences = experiencesForMemory(chronicle, memory);
  const diary = memory.diaryId ? chronicle.diaries.find((item) => item.id === memory.diaryId) : null;
  const meta = memory.status === "diary"
    ? `Diary · sealed · ${experiences.length}/3 Experiences`
    : memory.status === "forgotten"
      ? `Forgotten${memory.forgottenReason ? ` · ${memory.forgottenReason}` : ""}`
      : `${experiences.length}/3 Experiences${memory.sealed ? " · sealed" : ""}`;
  const activeCount = chronicle.memories.filter((item) => item.status === "active").length;
  const diaryCount = activeDiary(chronicle)
    ? chronicle.memories.filter((item) => item.status === "diary" && item.diaryId === activeDiary(chronicle).id).length
    : 0;

  return `<article class="tyov-memory-card" data-status="${memory.status}">
    <p class="tyov-card__meta">${escapeHtml(meta)}</p>
    <label class="tyov-field"><span>Memory theme</span><input data-memory-title="${memory.id}" value="${escapeHtml(memory.title)}"></label>
    <ol class="tyov-experience-list">${experiences.map((experience) => `<li>${escapeHtml(experience.text)}</li>`).join("")}</ol>
    ${diary ? `<p class="tyov-form-note">Preserved in ${escapeHtml(diary.description)}.</p>` : ""}
    <div class="tyov-card__actions">
      ${memory.status === "active" ? `<button type="button" class="tyov-small tyov-danger" data-action="forget-memory" data-id="${memory.id}">Forget</button><button type="button" class="tyov-small tyov-secondary" data-action="diary-memory" data-id="${memory.id}"${diaryCount >= 4 ? " disabled" : ""}>Move to Diary</button>` : ""}
      ${memory.status === "forgotten" ? `<button type="button" class="tyov-small tyov-secondary" data-action="restore-memory" data-id="${memory.id}"${activeCount >= 5 ? " disabled" : ""}>Restore by Prompt</button>` : ""}
    </div>
  </article>`;
}

function renderDiary(chronicle) {
  const diary = activeDiary(chronicle);
  if (!diary) return `<article class="tyov-card"><p class="tyov-card__meta">No active Diary</p><h3>The past exists only in your mind.</h3><p class="tyov-form-note">A Diary will be created when you first preserve a Memory outside the vampire’s mind.</p></article>`;
  const memories = chronicle.memories.filter((memory) => memory.status === "diary" && memory.diaryId === diary.id);
  return `<article class="tyov-diary">
    <p class="tyov-card__meta">Diary · ${memories.length}/4 Memories</p>
    <label class="tyov-field"><span>Description</span><input data-diary-description="${diary.id}" value="${escapeHtml(diary.description)}"></label>
    <p>${memories.map((memory) => escapeHtml(memory.title)).join(" · ")}</p>
    <div class="tyov-card__actions"><button type="button" class="tyov-small tyov-danger" data-action="lose-diary" data-id="${diary.id}">Lose this Diary</button></div>
  </article>`;
}

function allTraitOptions(chronicle) {
  const labels = { skills: "Skill", resources: "Resource", characters: "Character", marks: "Mark" };
  return Object.entries(chronicle.traits).flatMap(([collection, traits]) => traits.map((trait) => ({
    value: `${collection}:${trait.id}`,
    label: `${labels[collection]} · ${trait.name} (${trait.status})`,
  })));
}

function renderChangeRow(chronicle, index) {
  const options = allTraitOptions(chronicle);
  return `<div class="tyov-change-row" data-change-row="${index}">
    <label class="tyov-field"><span>Change</span><select data-change-action>
      <option value="">No change</option>
      <optgroup label="Skills"><option value="add-skill">Create Skill</option><option value="check-skill">Check Skill</option><option value="lose-skill">Lose Skill</option></optgroup>
      <optgroup label="Resources"><option value="add-resource">Create Resource</option><option value="lose-resource">Lose Resource</option></optgroup>
      <optgroup label="Characters"><option value="add-character">Create Character</option><option value="lose-character">Lose Character</option></optgroup>
      <optgroup label="Marks"><option value="add-mark">Create Mark</option><option value="lose-mark">Lose Mark</option></optgroup>
    </select></label>
    <label class="tyov-field"><span>Existing trait</span><select data-change-target><option value="">Choose when changing or losing…</option>${options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("")}</select></label>
    <label class="tyov-field"><span>New trait or context</span><input data-change-value placeholder="Name a new trait, or note what happened"></label>
    <button type="button" class="tyov-small tyov-danger" data-action="remove-change" data-index="${index}" aria-label="Remove trait change">Remove</button>
  </div>`;
}

function renderWritePanel(chronicle, changeRowCount) {
  const activeMemories = chronicle.memories.filter((memory) => memory.status === "active");
  const eligible = activeMemories.filter((memory) => !memory.sealed && memory.experienceIds.length < 3);
  const diary = activeDiary(chronicle);
  const diaryCount = diary ? chronicle.memories.filter((memory) => memory.status === "diary" && memory.diaryId === diary.id).length : 0;
  const uncheckedSkills = chronicle.traits.skills.filter((trait) => trait.status === "active").length;
  const activeResources = chronicle.traits.resources.filter((trait) => trait.status === "active" && trait.kind !== "diary").length;

  return `<section class="tyov-panel" data-panel="write">
    <div class="tyov-panel__heading"><div><p class="tyov-kicker">The next entry</p><h2>Answer a Prompt</h2><p>Keep the full journal response separate from the Experience that remains.</p></div></div>
    <div class="tyov-rule-note">${uncheckedSkills ? `${uncheckedSkills} unchecked Skill${uncheckedSkills === 1 ? "" : "s"}` : "No unchecked Skills"} · ${activeResources} available Resource${activeResources === 1 ? "" : "s"}. ${!uncheckedSkills ? "If asked to check a Skill, lose a Resource instead. " : ""}${!activeResources ? "If asked to lose a Resource, check a Skill instead." : ""}</div>
    <form id="tyov-prompt-form" class="tyov-composer" autocomplete="off">
      <div class="tyov-form-grid">
        <label class="tyov-field"><span>Prompt number</span><input name="promptNumber" type="number" min="1" required value="${escapeHtml(chronicle.vampire.currentPrompt || "")}"></label>
        <label class="tyov-field"><span>Encounter</span><input data-prompt-encounter readonly value="${promptEncounterCount(chronicle, chronicle.vampire.currentPrompt)}"></label>
        <label class="tyov-field tyov-field--wide"><span>Journal response</span><textarea name="journal" rows="9" required placeholder="Write a short paragraph or more in the vampire’s voice."></textarea></label>
        <label class="tyov-field tyov-field--wide"><span>Experience</span><textarea name="experience" rows="3" required placeholder="One evocative sentence: what happened; why it matters."></textarea></label>
        <label class="tyov-field"><span>Place in Memory</span><select name="memoryId" required>
          <option value="">Choose a Memory…</option>
          ${eligible.map((memory) => `<option value="${memory.id}">${escapeHtml(memory.title)} · ${memory.experienceIds.length}/3</option>`).join("")}
          <option value="new">Begin a new Memory</option>
        </select></label>
        <label class="tyov-field"><span>New Memory theme</span><input name="memoryTitle" placeholder="Required only for a new Memory"></label>
      </div>

      ${activeMemories.length >= 5 ? `<fieldset class="tyov-form-section"><legend>If a new Memory is needed</legend><p class="tyov-form-note">All five spaces are occupied. Choose what leaves the vampire’s mind.</p><div class="tyov-form-grid">
        <label class="tyov-field"><span>Disposition</span><select name="overflowAction"><option value="forget">Forget it</option><option value="diary"${diaryCount >= 4 ? " disabled" : ""}>Move it to the Diary</option></select></label>
        <label class="tyov-field"><span>Memory leaving the mind</span><select name="overflowMemoryId">${activeMemories.map((memory) => `<option value="${memory.id}">${escapeHtml(memory.title)}</option>`).join("")}</select></label>
        ${!diary ? `<label class="tyov-field tyov-field--wide"><span>New Diary description</span><input name="diaryDescription" placeholder="A sturdy leather-bound book, a ritual mask…"></label>` : ""}
      </div></fieldset>` : ""}

      <fieldset class="tyov-form-section"><legend>Trait changes</legend><p class="tyov-form-note">Record every instruction the Prompt caused. Add as many rows as needed.</p>
        <div class="tyov-change-list">${Array.from({ length: changeRowCount }, (_, index) => renderChangeRow(chronicle, index)).join("")}</div>
        <button type="button" class="tyov-small tyov-secondary" data-action="add-change">Add another change</button>
      </fieldset>

      <fieldset class="tyov-form-section"><legend>Move to the next Prompt</legend>
        <div class="tyov-roll-row">
          <label class="tyov-field"><span>d10</span><input name="d10" type="number" min="1" max="10"></label>
          <label class="tyov-field"><span>d6</span><input name="d6" type="number" min="1" max="6"></label>
          <label class="tyov-field"><span>Movement</span><output class="tyov-roll-result" data-roll-movement>—</output></label>
          <label class="tyov-field"><span>Next Prompt</span><input name="nextPrompt" type="number"></label>
          <button type="button" data-action="roll-prompt">Roll d10 − d6</button>
        </div>
      </fieldset>

      <fieldset class="tyov-form-section"><legend>The game ends</legend>
        <label class="tyov-field"><span><input type="checkbox" name="endGame"> End the Chronicle after this entry</span></label>
        <label class="tyov-field"><span>Final narration</span><textarea name="ending" rows="3" placeholder="If the game ends, narrate the vampire’s demise using the Prompt for inspiration."></textarea></label>
      </fieldset>

      <div class="tyov-toolbar"><button type="submit">Commit journal entry</button></div>
    </form>
  </section>`;
}

function renderMemoriesPanel(chronicle) {
  const active = chronicle.memories.filter((memory) => memory.status === "active");
  const diaryMemories = chronicle.memories.filter((memory) => memory.status === "diary");
  const forgotten = chronicle.memories.filter((memory) => memory.status === "forgotten");
  return `<section class="tyov-panel" data-panel="memories" hidden>
    <div class="tyov-panel__heading"><div><p class="tyov-kicker">The architecture of self</p><h2>Memories</h2><p>${active.length}/5 held in mind · ${diaryMemories.length} preserved in Diaries · ${forgotten.length} forgotten</p></div></div>
    <div class="tyov-memory-grid">${active.map((memory) => memoryCard(chronicle, memory)).join("")}${renderDiary(chronicle)}</div>
    ${diaryMemories.length ? `<h3>Written outside the mind</h3><div class="tyov-memory-grid">${diaryMemories.map((memory) => memoryCard(chronicle, memory)).join("")}</div>` : ""}
    ${forgotten.length ? `<h3>Forgotten</h3><div class="tyov-memory-grid">${forgotten.map((memory) => memoryCard(chronicle, memory)).join("")}</div>` : ""}
  </section>`;
}

function traitStatusActions(collection, trait) {
  if (collection === "skills") {
    if (trait.status === "active") return `<button type="button" class="tyov-small" data-action="trait-status" data-collection="skills" data-id="${trait.id}" data-status="checked">Check</button><button type="button" class="tyov-small tyov-danger" data-action="trait-status" data-collection="skills" data-id="${trait.id}" data-status="lost">Lose</button>`;
    if (trait.status === "checked") return `<button type="button" class="tyov-small tyov-danger" data-action="trait-status" data-collection="skills" data-id="${trait.id}" data-status="lost">Lose</button>`;
  }
  if (collection === "characters" && trait.status === "active") {
    return `<button type="button" class="tyov-small tyov-danger" data-action="trait-status" data-collection="characters" data-id="${trait.id}" data-status="dead">Mark dead</button><button type="button" class="tyov-small tyov-danger" data-action="trait-status" data-collection="characters" data-id="${trait.id}" data-status="lost">Lose</button>`;
  }
  if (trait.status === "active") return `<button type="button" class="tyov-small tyov-danger" data-action="trait-status" data-collection="${collection}" data-id="${trait.id}" data-status="lost">Lose</button>`;
  return `<button type="button" class="tyov-small tyov-secondary" data-action="trait-status" data-collection="${collection}" data-id="${trait.id}" data-status="active">Restore by Prompt</button>`;
}

function traitCard(collection, trait) {
  const typeNote = collection === "characters" ? trait.type : collection === "resources" && trait.stationary ? "stationary" : "";
  return `<article class="tyov-trait-card" data-status="${trait.status}">
    <p class="tyov-card__meta">${escapeHtml([trait.status, typeNote].filter(Boolean).join(" · "))}</p>
    <label class="tyov-field"><span>Name</span><input data-trait-edit="${collection}:${trait.id}:name" value="${escapeHtml(trait.name)}"></label>
    <label class="tyov-field"><span>${collection === "marks" ? "Concealment" : "Description"}</span><textarea rows="2" data-trait-edit="${collection}:${trait.id}:description">${escapeHtml(trait.description || "")}</textarea></label>
    <div class="tyov-card__actions">${trait.kind === "diary" ? "<span class=\"tyov-status-pill\">Managed with Diary</span>" : traitStatusActions(collection, trait)}</div>
  </article>`;
}

function traitSection(chronicle, collection, title, prompt) {
  const traits = chronicle.traits[collection];
  return `<section class="tyov-trait-section">
    <div class="tyov-trait-section__heading"><div><p class="tyov-kicker">${escapeHtml(prompt)}</p><h3>${escapeHtml(title)}</h3></div><span class="tyov-status-pill">${traits.filter((trait) => trait.status === "active").length} active</span></div>
    <form class="tyov-add-trait" data-add-trait="${collection}">
      <label class="tyov-field"><span>Name</span><input name="name" required></label>
      <label class="tyov-field"><span>Description</span><input name="description"></label>
      ${collection === "characters" ? `<label class="tyov-field"><span>Kind</span><select name="type"><option value="mortal">Mortal</option><option value="immortal">Immortal</option></select></label>` : ""}
      ${collection === "resources" ? `<label class="tyov-field"><span><input type="checkbox" name="stationary"> Stationary</span></label>` : ""}
      <button type="submit">Add</button>
    </form>
    <div class="tyov-trait-grid">${traits.length ? traits.map((trait) => traitCard(collection, trait)).join("") : `<p class="tyov-empty">Nothing recorded.</p>`}</div>
  </section>`;
}

function renderTraitsPanel(chronicle) {
  return `<section class="tyov-panel" data-panel="traits" hidden>
    <div class="tyov-panel__heading"><div><p class="tyov-kicker">Capabilities, possessions, attachments, signs</p><h2>Traits</h2><p>Lost traits remain readable. Restore them only when a Prompt tells you to.</p></div></div>
    ${traitSection(chronicle, "skills", "Skills", "What the vampire can do—and has done")}
    ${traitSection(chronicle, "resources", "Resources", "What can be spent or taken")}
    ${traitSection(chronicle, "characters", "Characters", "Mortals pass; immortals endure")}
    ${traitSection(chronicle, "marks", "Marks", "What separates the vampire from humanity")}
  </section>`;
}

function renderJournalPanel(chronicle) {
  const entries = [...chronicle.prompts].sort((a, b) => a.order - b.order);
  const experiences = new Map(chronicle.experiences.map((experience) => [experience.id, experience]));
  return `<section class="tyov-panel" data-panel="journal" hidden>
    <div class="tyov-panel__heading"><div><p class="tyov-kicker">In the order it happened</p><h2>The Journal</h2><p>${entries.length} Prompt encounter${entries.length === 1 ? "" : "s"}</p></div></div>
    <div class="tyov-journal">${entries.length ? entries.map((entry) => {
      const experience = experiences.get(entry.experienceId);
      const movement = entry.movement == null ? "No roll recorded" : `d10 ${entry.d10} − d6 ${entry.d6} = ${entry.movement > 0 ? "+" : ""}${entry.movement}; next Prompt ${entry.nextPrompt}`;
      return `<article class="tyov-journal-entry">
        <span class="tyov-journal-entry__number">${String(entry.order).padStart(2, "0")}</span>
        <p class="tyov-card__meta">Prompt ${escapeHtml(entry.promptNumber)} · encounter ${entry.encounter} · ${escapeHtml(movement)}</p>
        <blockquote>${escapeHtml(entry.journal)}</blockquote>
        <p><strong>Experience:</strong> <em>${escapeHtml(experience?.text || "Missing Experience")}</em></p>
        ${entry.traitChanges?.length ? `<p class="tyov-form-note">${entry.traitChanges.map((change) => escapeHtml(change.label)).join(" · ")}</p>` : ""}
      </article>`;
    }).join("") : `<p class="tyov-empty">No Prompt entries yet. The first page is waiting.</p>`}</div>
  </section>`;
}

function renderArchivePanel(chronicle) {
  const forgotten = chronicle.memories.filter((memory) => memory.status === "forgotten");
  const lostTraits = Object.entries(chronicle.traits).flatMap(([collection, traits]) => traits.filter((trait) => !["active", "checked"].includes(trait.status)).map((trait) => ({ ...trait, collection })));
  const history = [...chronicle.history].reverse();
  return `<section class="tyov-panel" data-panel="archive" hidden>
    <div class="tyov-panel__heading"><div><p class="tyov-kicker">The record beneath the record</p><h2>Forgotten Archive</h2><p>Nothing crossed out here is erased.</p></div></div>
    <div class="tyov-form-grid">
      <section><h3>Forgotten Memories</h3>${forgotten.length ? forgotten.map((memory) => memoryCard(chronicle, memory)).join("") : `<p class="tyov-empty">Nothing has been forgotten yet.</p>`}</section>
      <section><h3>Lost traits</h3>${lostTraits.length ? lostTraits.map((trait) => `<article class="tyov-card"><p class="tyov-card__meta">${escapeHtml(trait.collection)} · ${escapeHtml(trait.status)}</p><h4 style="text-decoration:line-through">${escapeHtml(trait.name)}</h4><p>${escapeHtml(trait.description || "")}</p></article>`).join("") : `<p class="tyov-empty">No traits have been lost.</p>`}</section>
    </div>
    <h3>Chronicle history</h3>
    <div class="tyov-history">${history.map((event) => `<article><p class="tyov-card__meta">${escapeHtml(localDate(event.at))} · ${escapeHtml(event.type)}</p><strong>${escapeHtml(event.label)}</strong>${event.details ? `<p class="tyov-form-note">${escapeHtml(event.details)}</p>` : ""}</article>`).join("")}</div>
  </section>`;
}

function markdownChronicle(chronicle) {
  const lines = [
    `# ${chronicle.vampire.name || "Unnamed Vampire"}`,
    "",
    `${chronicle.vampire.mortalIdentity || "Unknown mortal"}, from ${chronicle.vampire.birthplace || "an unknown place"} in ${chronicle.vampire.era || "an unknown age"}.`,
    "",
    "## Journal",
    "",
  ];
  const experiences = new Map(chronicle.experiences.map((experience) => [experience.id, experience]));
  [...chronicle.prompts].sort((a, b) => a.order - b.order).forEach((entry) => {
    lines.push(`### ${entry.order}. Prompt ${entry.promptNumber} (encounter ${entry.encounter})`, "", entry.journal, "", `*Experience: ${experiences.get(entry.experienceId)?.text || ""}*`, "");
  });
  for (const [heading, status] of [["Memories held in mind", "active"], ["Memories in the Diary", "diary"], ["Forgotten Memories", "forgotten"]]) {
    lines.push(`## ${heading}`, "");
    chronicle.memories.filter((memory) => memory.status === status).forEach((memory) => {
      lines.push(`### ${memory.title}`, "");
      experiencesForMemory(chronicle, memory).forEach((experience) => lines.push(`- ${experience.text}`));
      lines.push("");
    });
  }
  lines.push("## Traits", "");
  Object.entries(chronicle.traits).forEach(([collection, traits]) => {
    lines.push(`### ${collection[0].toUpperCase()}${collection.slice(1)}`);
    traits.forEach((trait) => lines.push(`- ${trait.status === "lost" || trait.status === "dead" ? "~~" : ""}${trait.name}${trait.status === "lost" || trait.status === "dead" ? "~~" : ""}${trait.description ? ` — ${trait.description}` : ""} (${trait.status})`));
    lines.push("");
  });
  return lines.join("\n");
}

function download(filename, content, type) {
  const href = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function fileSlug(value) {
  return String(value || "vampire").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "vampire";
}

function renderApp(root, chronicle, options) {
  if (!chronicle.setupComplete) {
    root.innerHTML = setupTemplate();
    return;
  }
  const activeMemories = chronicle.memories.filter((memory) => memory.status === "active");
  const forgotten = chronicle.memories.filter((memory) => memory.status === "forgotten");
  const activeTraits = Object.values(chronicle.traits).flat().filter((trait) => trait.status === "active").length;
  const errors = validateChronicleRules(chronicle);
  root.innerHTML = `<div class="tyov-app-shell">
    <header class="tyov-app-header">
      <div><p class="tyov-kicker">Private Chronicle</p><h1>${escapeHtml(chronicle.vampire.name || "Unnamed Vampire")}</h1><span class="tyov-save-status" data-save-status data-state="${escapeHtml(options.saveState)}">${escapeHtml(options.saveMessage)}</span></div>
      <div class="tyov-app-header__actions">
        <button type="button" class="tyov-button--quiet" data-action="export-markdown">Markdown</button>
        <button type="button" class="tyov-button--quiet" data-action="export-json">Backup</button>
        <button type="button" class="tyov-button--quiet" data-action="import-json">Import</button>
        <button type="button" class="tyov-button--quiet" data-action="print">Print</button>
        <input class="tyov-sr-only" data-import-file type="file" accept="application/json,.json">
      </div>
    </header>
    ${options.conflict ? `<div class="tyov-notice" role="alert">A newer copy exists on the server. <button type="button" class="tyov-small tyov-secondary" data-action="load-server">Load server copy</button> <button type="button" class="tyov-small" data-action="overwrite-server">Keep this copy</button></div>` : ""}
    ${errors.length ? `<div class="tyov-notice" role="alert">${errors.map(escapeHtml).join(" ")}</div>` : ""}
    <div class="tyov-dashboard">
      <div class="tyov-stat"><span>Current Prompt</span><strong>${escapeHtml(chronicle.vampire.currentPrompt || "—")}</strong></div>
      <div class="tyov-stat"><span>Memories held</span><strong>${activeMemories.length}/5</strong></div>
      <div class="tyov-stat"><span>Active traits</span><strong>${activeTraits}</strong></div>
      <div class="tyov-stat"><span>Forgotten</span><strong>${forgotten.length}</strong></div>
    </div>
    <nav class="tyov-tabs" role="tablist" aria-label="Chronicle sections">${[["write", "Write"], ["memories", "Memories"], ["traits", "Traits"], ["journal", "Journal"], ["archive", "Archive"]].map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${options.activeTab === id}">${label}</button>`).join("")}</nav>
    ${renderWritePanel(chronicle, options.changeRowCount)}
    ${renderMemoriesPanel(chronicle)}
    ${renderTraitsPanel(chronicle)}
    ${renderJournalPanel(chronicle)}
    ${renderArchivePanel(chronicle)}
  </div>`;
  root.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== options.activeTab; });
}

function setupValues(form) {
  const data = new FormData(form);
  const mortalNames = data.getAll("mortalName").map(String);
  const mortalDescriptions = data.getAll("mortalDescription").map(String);
  return {
    vampireName: String(data.get("vampireName") || ""),
    mortalIdentity: String(data.get("mortalIdentity") || ""),
    era: String(data.get("era") || ""),
    birthplace: String(data.get("birthplace") || ""),
    originMemoryTitle: String(data.get("originMemoryTitle") || ""),
    originExperience: String(data.get("originExperience") || ""),
    mortals: mortalNames.map((name, index) => ({ name, description: mortalDescriptions[index] || "" })),
    skills: data.getAll("skill").map(String),
    resources: data.getAll("resource").map(String),
    memoryTitles: data.getAll("memoryTitle").map(String),
    formativeExperiences: data.getAll("formativeExperience").map(String),
    immortal: { name: String(data.get("immortalName") || ""), description: String(data.get("immortalDescription") || "") },
    mark: { name: String(data.get("markName") || ""), concealment: String(data.get("markConcealment") || "") },
    transformationMemoryTitle: String(data.get("transformationMemoryTitle") || ""),
    transformationExperience: String(data.get("transformationExperience") || ""),
  };
}

function getTarget(chronicle, encoded) {
  const [collection, id] = String(encoded || "").split(":");
  return { collection, trait: chronicle.traits[collection]?.find((item) => item.id === id) ?? null };
}

export function applyPromptChange(chronicle, action, targetValue, note, promptEntryId) {
  if (!action) return null;
  const additions = {
    "add-skill": "skills",
    "add-resource": "resources",
    "add-character": "characters",
    "add-mark": "marks",
  };
  if (additions[action]) {
    if (!note.trim()) throw new Error("Name each new trait before committing the entry.");
    const collection = additions[action];
    const extra = collection === "resources" ? { stationary: false, kind: "resource" } : collection === "characters" ? { type: "mortal" } : {};
    const trait = traitRecord(note.trim(), "", extra);
    chronicle.traits[collection].push(trait);
    const label = `Created ${collection.slice(0, -1)}: ${trait.name}`;
    chronicle.history.push(historyRecord("trait", label, "", promptEntryId));
    return { action, traitId: trait.id, collection, label };
  }

  const { collection, trait } = getTarget(chronicle, targetValue);
  if (!trait) throw new Error("Choose the existing trait affected by each change.");
  const expected = action.includes("skill") ? "skills" : action.includes("resource") ? "resources" : action.includes("character") ? "characters" : "marks";
  if (collection !== expected) throw new Error("The selected trait does not match the requested change.");

  let status = "lost";
  if (action === "check-skill") {
    if (trait.status !== "active") throw new Error(`${trait.name} cannot be checked again.`);
    status = "checked";
  }
  trait.status = status;
  trait.changedAt = now();
  if (collection === "resources" && trait.kind === "diary" && status === "lost") {
    const diary = chronicle.diaries.find((item) => item.resourceId === trait.id && item.status === "active");
    if (diary) {
      diary.status = "lost";
      diary.lostAt = now();
      chronicle.memories
        .filter((memory) => memory.status === "diary" && memory.diaryId === diary.id)
        .forEach((memory) => forgetMemory(chronicle, memory, `Lost with ${diary.description}`, promptEntryId));
    }
  }
  const verb = status === "checked" ? "Checked" : "Lost";
  const label = `${verb} ${expected.slice(0, -1)}: ${trait.name}`;
  chronicle.history.push(historyRecord("trait", label, note, promptEntryId));
  return { action, traitId: trait.id, collection, label, note };
}

function ensureDiary(chronicle, description) {
  let diary = activeDiary(chronicle);
  if (diary) return diary;
  if (!String(description || "").trim()) throw new Error("Describe the new Diary before moving a Memory into it.");
  const resource = traitRecord(`Diary — ${String(description).trim()}`, "", { stationary: false, kind: "diary" });
  chronicle.traits.resources.push(resource);
  diary = { id: uid("diary"), description: String(description).trim(), resourceId: resource.id, status: "active", createdAt: now(), lostAt: null };
  chronicle.diaries.push(diary);
  chronicle.history.push(historyRecord("diary", "Created a Diary", diary.description));
  return diary;
}

export function forgetMemory(chronicle, memory, reason, promptEntryId = null) {
  memory.status = "forgotten";
  memory.forgottenAt = now();
  memory.forgottenReason = reason;
  chronicle.history.push(historyRecord("memory", `Forgotten: ${memory.title}`, reason, promptEntryId));
}

export function moveMemoryToDiary(chronicle, memory, description, promptEntryId = null) {
  const diary = ensureDiary(chronicle, description);
  const count = chronicle.memories.filter((item) => item.status === "diary" && item.diaryId === diary.id).length;
  if (count >= 4) throw new Error("The Diary already contains four Memories.");
  memory.status = "diary";
  memory.sealed = true;
  memory.diaryId = diary.id;
  chronicle.history.push(historyRecord("memory", `Written into the Diary: ${memory.title}`, diary.description, promptEntryId));
}

async function initChronicle(root) {
  let chronicle = createEmptyChronicle();
  let remoteVersion = 0;
  let activeTab = "write";
  let changeRowCount = 1;
  let saveState = "saving";
  let saveMessage = "Opening the private archive…";
  let saveTimer = null;
  let conflict = null;

  try { activeTab = sessionStorage.getItem(ACTIVE_TAB_KEY) || "write"; } catch { /* preference only */ }

  function localDraft() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY));
      return parsed?.schemaVersion === 1 ? normalizeChronicle(parsed) : null;
    } catch {
      return null;
    }
  }

  function storeDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(chronicle)); } catch { /* remote remains authoritative */ }
  }

  function showStatus(message, state = "saved") {
    saveMessage = message;
    saveState = state;
    const element = root.querySelector("[data-save-status]");
    if (element) {
      element.textContent = message;
      element.dataset.state = state;
    }
  }

  async function saveRemote(force = false) {
    clearTimeout(saveTimer);
    storeDraft();
    showStatus("Saving…", "saving");
    try {
      const version = force && conflict ? conflict.version : remoteVersion;
      const response = await fetch(API_URL, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chronicle, version }),
      });
      const result = await response.json();
      if (response.status === 409 && result.conflict) {
        conflict = { version: result.version, chronicle: normalizeChronicle(result.chronicle) };
        showStatus("A newer server copy needs attention", "error");
        render();
        return;
      }
      if (!response.ok) throw new Error(result.error || "Save failed");
      remoteVersion = result.version;
      conflict = null;
      showStatus(`Saved privately · ${localDate(result.updatedAt)}`, "saved");
    } catch (error) {
      console.warn("Unable to save Chronicle remotely", error);
      showStatus("Draft safe in this browser; server unavailable", "error");
    }
  }

  function scheduleSave(message = "Changes ready to save") {
    chronicle.updatedAt = now();
    storeDraft();
    showStatus(message, "saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRemote(), 700);
  }

  function render(message) {
    if (message) saveMessage = message;
    renderApp(root, chronicle, { activeTab, changeRowCount, saveState, saveMessage, conflict });
  }

  try {
    const response = await fetch(API_URL, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Load failed with ${response.status}`);
    const result = await response.json();
    remoteVersion = Number(result.version || 0);
    chronicle = result.chronicle ? normalizeChronicle(result.chronicle) : (localDraft() || createEmptyChronicle());
    saveState = result.chronicle ? "saved" : "saving";
    saveMessage = result.chronicle ? `Saved privately · ${localDate(result.updatedAt)}` : "New Chronicle · not yet saved";
  } catch (error) {
    console.warn("Unable to load Chronicle remotely", error);
    chronicle = localDraft() || createEmptyChronicle();
    saveState = "error";
    saveMessage = chronicle.setupComplete ? "Recovered browser draft; server unavailable" : "Server unavailable; creation will remain a browser draft";
  }
  render();

  root.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();

    if (form.id === "tyov-setup-form") {
      chronicle = buildStartingChronicle(setupValues(form));
      activeTab = "write";
      saveMessage = "The first five Memories are sealed";
      render();
      saveRemote();
      return;
    }

    if (form.matches("[data-add-trait]")) {
      const collection = form.dataset.addTrait;
      const data = new FormData(form);
      const name = String(data.get("name") || "").trim();
      if (!name) return;
      const extra = collection === "characters"
        ? { type: String(data.get("type") || "mortal") }
        : collection === "resources"
          ? { stationary: data.get("stationary") === "on", kind: "resource" }
          : {};
      chronicle.traits[collection].push(traitRecord(name, String(data.get("description") || ""), extra));
      chronicle.history.push(historyRecord("trait", `Added ${collection.slice(0, -1)}: ${name}`, "Added outside a Prompt entry."));
      render();
      scheduleSave();
      return;
    }

    if (form.id !== "tyov-prompt-form") return;
    const data = new FormData(form);
    const promptNumber = String(data.get("promptNumber") || "").trim();
    const journal = String(data.get("journal") || "").trim();
    const experienceText = String(data.get("experience") || "").trim();
    const selectedMemoryId = String(data.get("memoryId") || "");
    const promptEntryId = uid("prompt");
    try {
      if (!journal || !experienceText || !promptNumber) throw new Error("Complete the Prompt number, journal response, and Experience.");
      let targetMemory;
      if (selectedMemoryId === "new") {
        const memoryTitle = String(data.get("memoryTitle") || "").trim();
        if (!memoryTitle) throw new Error("Give the new Memory a theme.");
        const activeMemories = chronicle.memories.filter((memory) => memory.status === "active");
        if (activeMemories.length >= 5) {
          const leaving = activeMemories.find((memory) => memory.id === data.get("overflowMemoryId"));
          if (!leaving) throw new Error("Choose the Memory leaving the vampire’s mind.");
          if (data.get("overflowAction") === "diary") moveMemoryToDiary(chronicle, leaving, data.get("diaryDescription"), promptEntryId);
          else forgetMemory(chronicle, leaving, `Displaced while answering Prompt ${promptNumber}`, promptEntryId);
        }
        targetMemory = memoryRecord(memoryTitle);
        chronicle.memories.push(targetMemory);
      } else {
        targetMemory = chronicle.memories.find((memory) => memory.id === selectedMemoryId && memory.status === "active");
        if (!targetMemory) throw new Error("Choose an active Memory for the Experience.");
        if (targetMemory.sealed || targetMemory.experienceIds.length >= 3) throw new Error("That Memory cannot accept another Experience.");
      }

      const experience = experienceRecord(experienceText, "prompt", promptEntryId, chronicle.experiences.length + 1);
      chronicle.experiences.push(experience);
      targetMemory.experienceIds.push(experience.id);
      const roll = calculateMovement(data.get("d10"), data.get("d6"), promptNumber);
      const explicitNext = String(data.get("nextPrompt") || "").trim();
      const entry = {
        id: promptEntryId,
        order: chronicle.prompts.length + 1,
        promptNumber,
        encounter: promptEncounterCount(chronicle, promptNumber),
        journal,
        experienceId: experience.id,
        memoryId: targetMemory.id,
        d10: roll.movement == null ? null : Number(data.get("d10")),
        d6: roll.movement == null ? null : Number(data.get("d6")),
        movement: roll.movement,
        nextPrompt: explicitNext ? Number(explicitNext) : roll.nextPrompt,
        traitChanges: [],
        createdAt: now(),
      };
      form.querySelectorAll("[data-change-row]").forEach((row) => {
        const change = applyPromptChange(
          chronicle,
          row.querySelector("[data-change-action]").value,
          row.querySelector("[data-change-target]").value,
          row.querySelector("[data-change-value]").value,
          promptEntryId,
        );
        if (change) entry.traitChanges.push(change);
      });
      chronicle.prompts.push(entry);
      chronicle.vampire.currentPrompt = entry.nextPrompt == null ? promptNumber : String(entry.nextPrompt);
      if (data.get("endGame") === "on") {
        chronicle.vampire.ended = true;
        chronicle.vampire.ending = String(data.get("ending") || "").trim();
        chronicle.history.push(historyRecord("ending", "The game ends", chronicle.vampire.ending, promptEntryId));
      }
      chronicle.history.push(historyRecord("prompt", `Answered Prompt ${promptNumber}`, `Encounter ${entry.encounter}; Experience placed in ${targetMemory.title}.`, promptEntryId));
      changeRowCount = 1;
      render(`Prompt ${promptNumber} committed`);
      saveRemote();
    } catch (error) {
      root.querySelector("#tyov-prompt-form")?.insertAdjacentHTML("afterbegin", `<div class="tyov-notice" role="alert">${escapeHtml(error.message)}</div>`);
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    if (target.name === "promptNumber") {
      const encounter = root.querySelector("[data-prompt-encounter]");
      if (encounter) encounter.value = promptEncounterCount(chronicle, target.value);
    }
    if (target.matches("[name=d10], [name=d6]")) {
      const form = target.form;
      const prompt = form?.elements.promptNumber?.value;
      const roll = calculateMovement(form?.elements.d10?.value, form?.elements.d6?.value, prompt);
      const output = form?.querySelector("[data-roll-movement]");
      if (output) output.textContent = roll.movement == null ? "—" : `${roll.movement > 0 ? "+" : ""}${roll.movement}`;
      if (roll.nextPrompt != null) form.elements.nextPrompt.value = roll.nextPrompt;
    }
    if (target.dataset.memoryTitle) {
      const memory = chronicle.memories.find((item) => item.id === target.dataset.memoryTitle);
      if (memory) { memory.title = target.value; scheduleSave(); }
    }
    if (target.dataset.diaryDescription) {
      const diary = chronicle.diaries.find((item) => item.id === target.dataset.diaryDescription);
      if (diary) { diary.description = target.value; scheduleSave(); }
    }
    if (target.dataset.traitEdit) {
      const [collection, id, field] = target.dataset.traitEdit.split(":");
      const trait = chronicle.traits[collection]?.find((item) => item.id === id);
      if (trait) { trait[field] = target.value; scheduleSave(); }
    }
  });

  root.addEventListener("change", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches("[data-import-file]") || !target.files?.[0]) return;
    try {
      const imported = normalizeChronicle(JSON.parse(await target.files[0].text()));
      if (!imported.setupComplete) throw new Error("That file does not contain a completed Chronicle.");
      const importErrors = validateChronicleRules(imported);
      if (importErrors.length) throw new Error(importErrors[0]);
      if (!window.confirm(`Replace the current Chronicle with ${imported.vampire.name || "this backup"}?`)) return;
      chronicle = imported;
      chronicle.history.push(historyRecord("import", "Imported a Chronicle backup"));
      activeTab = "write";
      render("Backup imported; saving privately…");
      saveRemote();
    } catch (error) {
      showStatus(error.message || "That file is not a valid Chronicle backup", "error");
    } finally {
      target.value = "";
    }
  });

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action], button[data-tab]");
    if (!button) return;
    const action = button.dataset.action;
    if (button.dataset.tab) {
      activeTab = button.dataset.tab;
      try { sessionStorage.setItem(ACTIVE_TAB_KEY, activeTab); } catch { /* preference only */ }
      root.querySelectorAll("[data-tab]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === activeTab)));
      root.querySelectorAll("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== activeTab; });
      return;
    }
    if (action === "add-change") {
      const list = root.querySelector(".tyov-change-list");
      if (list) {
        list.insertAdjacentHTML("beforeend", renderChangeRow(chronicle, changeRowCount));
        changeRowCount += 1;
      }
      return;
    }
    if (action === "remove-change") {
      const rows = root.querySelectorAll("[data-change-row]");
      if (rows.length > 1) button.closest("[data-change-row]")?.remove();
      return;
    }
    if (action === "roll-prompt") {
      const form = button.closest("form");
      form.elements.d10.value = Math.floor(Math.random() * 10) + 1;
      form.elements.d6.value = Math.floor(Math.random() * 6) + 1;
      const roll = calculateMovement(form.elements.d10.value, form.elements.d6.value, form.elements.promptNumber.value);
      form.querySelector("[data-roll-movement]").textContent = `${roll.movement > 0 ? "+" : ""}${roll.movement}`;
      form.elements.nextPrompt.value = roll.nextPrompt;
      return;
    }
    if (action === "export-json") {
      download(`${fileSlug(chronicle.vampire.name)}-chronicle.json`, JSON.stringify(chronicle, null, 2), "application/json");
      showStatus("Backup downloaded", "saved");
      return;
    }
    if (action === "export-markdown") {
      download(`${fileSlug(chronicle.vampire.name)}-chronicle.md`, markdownChronicle(chronicle), "text/markdown");
      showStatus("Markdown Chronicle downloaded", "saved");
      return;
    }
    if (action === "import-json") { root.querySelector("[data-import-file]")?.click(); return; }
    if (action === "print") { window.print(); return; }
    if (action === "load-server" && conflict) {
      chronicle = clone(conflict.chronicle);
      remoteVersion = conflict.version;
      conflict = null;
      render("Loaded the newer server copy");
      return;
    }
    if (action === "overwrite-server" && conflict) { saveRemote(true); return; }

    if (action === "forget-memory") {
      const memory = chronicle.memories.find((item) => item.id === button.dataset.id);
      if (memory && window.confirm(`Forget “${memory.title}”? It will remain readable in the Archive.`)) {
        forgetMemory(chronicle, memory, "Forgotten by the player");
        render(); scheduleSave();
      }
      return;
    }
    if (action === "diary-memory") {
      const memory = chronicle.memories.find((item) => item.id === button.dataset.id);
      if (!memory) return;
      const description = activeDiary(chronicle)?.description || window.prompt("Describe the Diary that will preserve this Memory:", "A sturdy, leather-bound book") || "";
      try { moveMemoryToDiary(chronicle, memory, description); render(); scheduleSave(); } catch (error) { showStatus(error.message, "error"); }
      return;
    }
    if (action === "restore-memory") {
      const memory = chronicle.memories.find((item) => item.id === button.dataset.id);
      if (memory && chronicle.memories.filter((item) => item.status === "active").length < 5) {
        memory.status = "active";
        memory.forgottenAt = null;
        memory.forgottenReason = "";
        chronicle.history.push(historyRecord("memory", `Restored by a Prompt: ${memory.title}`));
        render(); scheduleSave();
      }
      return;
    }
    if (action === "lose-diary") {
      const diary = chronicle.diaries.find((item) => item.id === button.dataset.id);
      if (diary && window.confirm("Lose this Diary and forget every Memory it contains?")) {
        diary.status = "lost"; diary.lostAt = now();
        const resource = chronicle.traits.resources.find((item) => item.id === diary.resourceId);
        if (resource) { resource.status = "lost"; resource.changedAt = now(); }
        chronicle.memories.filter((memory) => memory.status === "diary" && memory.diaryId === diary.id).forEach((memory) => forgetMemory(chronicle, memory, `Lost with ${diary.description}`));
        chronicle.history.push(historyRecord("diary", "The Diary was lost", diary.description));
        render(); scheduleSave();
      }
      return;
    }
    if (action === "trait-status") {
      const trait = chronicle.traits[button.dataset.collection]?.find((item) => item.id === button.dataset.id);
      if (!trait) return;
      trait.status = button.dataset.status;
      trait.changedAt = now();
      chronicle.history.push(historyRecord("trait", `${button.dataset.status === "active" ? "Restored" : button.dataset.status === "checked" ? "Checked" : "Changed"}: ${trait.name}`, `Status: ${button.dataset.status}`));
      render(); scheduleSave();
    }
  });
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#tyov-chronicle");
  if (root) initChronicle(root);
}
