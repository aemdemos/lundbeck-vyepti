import { parseOptions } from './doctor-discussion-steps.js';
import { extractIconMarkdown } from './doctor-discussion-markdown.js';
import { parseEmailModalRows } from './doctor-discussion-email-config.js';

// ---------------------------------------------------------------------------
// Block-level config (Doctor Discussion Sheet url / Download PDF
// Endpoint / Form Submission Endpoint / API Username / API Password /
// Thank You image + message / CTA Heading / Tips Heading / Tips List).
// ---------------------------------------------------------------------------

function hasVisibleText(nodes) {
  return nodes.some((n) => (n.textContent || '').trim());
}

// Reads a rich-text cell into cloned DOM nodes (preserving any authored
// hyperlink), unwrapping a lone wrapping <p>. Returns null if unauthored.
//
// @param {HTMLElement} valueCell
// @returns {Node[]|null}
function parseRichText(valueCell) {
  const source = (valueCell.children.length === 1 && valueCell.children[0].tagName === 'P')
    ? valueCell.children[0].childNodes
    : valueCell.childNodes;
  const cloned = [...source].map((n) => n.cloneNode(true));
  return hasVisibleText(cloned) ? cloned : null;
}

// Reads "Tips List" into tips: one per <li>/<p> as cloned DOM nodes (so a
// real authored hyperlink survives), falling back to one tip per newline.
//
// @param {HTMLElement} valueCell
// @returns {(Node[]|string)[]}
function parseTipsList(valueCell) {
  const items = [...valueCell.querySelectorAll('li')];
  if (items.length) {
    return items
      .map((li) => [...li.childNodes].map((n) => n.cloneNode(true)))
      .filter(hasVisibleText);
  }

  const paragraphs = [...valueCell.querySelectorAll('p')];
  if (paragraphs.length) {
    return paragraphs
      .map((p) => [...p.childNodes].map((n) => n.cloneNode(true)))
      .filter(hasVisibleText);
  }

  return valueCell.textContent.split('\n').map((s) => s.trim()).filter(Boolean);
}

/**
* Reads the authored config rows off the block into endpoint overrides, API
 * credentials, Thank You content, and results-screen copy (all optional,
 * falling back to defaults/null when unauthored; see block schema above).
 *
 * @param {HTMLElement} block
 * @returns {{
 *   sheetUrl: string|null,
 *   emailModalSheetUrl: string|null,
 *   pdfUrl: string|null,
 *   emailUrl: string|null,
 *   apiUsername: string|null,
 *   apiPassword: string|null,
 *   thankYouContent: Element[],
 *   ctaHeading: Node[]|null,
 *   tipsHeading: Node[]|null,
 *   tipsList: (Node[]|string)[]|null,
 *   retakeLabel: string|null,
 *   retakeIcon: string|null,
 *   resultsDownloadDescription: Node[]|null,
 *   resultsNote: Node[]|null,
 *   downloadButtonLabel: string|null,
 *   downloadButtonIcon: string|null,
 *   emailButtonLabel: string|null,
 *   emailButtonIcon: string|null,
 * }}
 */
function defaultDoctorDiscussionConfig() {
  return {
    sheetUrl: null,
    emailModalSheetUrl: null,
    pdfUrl: null,
    emailUrl: null,
    apiUsername: null,
    apiPassword: null,
    thankYouContent: [],
    ctaHeading: null,
    tipsHeading: null,
    tipsList: null,
    retakeLabel: null,
    retakeIcon: null,
    resultsDownloadDescription: null,
    resultsNote: null,
    downloadButtonLabel: null,
    downloadButtonIcon: null,
    emailButtonLabel: null,
    emailButtonIcon: null,
  };
}

// Plain "hyperlink, else typed text" resolution shared by every URL-ish
// config row (sheet/PDF/email endpoints).
function linkOrText(valueCell, link) {
  return link ? link.href : valueCell.textContent.trim();
}

// Resolves an icon cell to a URL: image, then link, then plain text,
// falling back to null so callers can use their existing CSS icon.
function resolveIconSrc(valueCell, link, img) {
  if (img) return img.src;
  if (link) return link.href || null;
  return valueCell.textContent.trim() || null;
}

// Ordered (predicate, assign) pairs, one per config row. Order matters —
// broader predicates must come after the more specific ones they'd match.
const CONFIG_ROW_MATCHERS = [
  {
    // Must precede "sheet url" below — both keys contain that substring,
    // so this specific check has to match first.
    test: (key) => key.includes('email modal sheet url'),
    assign: (config, { valueCell, link }) => {
      config.emailModalSheetUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('sheet url'),
    assign: (config, { valueCell, link }) => {
      // IMPORTANT: form.js's createForm() fetches this URL's pathname
      // directly, requiring plain .json single-tab shape.
      config.sheetUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('download pdf'),
    assign: (config, { valueCell, link }) => {
      config.pdfUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('form submission'),
    assign: (config, { valueCell, link }) => {
      config.emailUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('api username'),
    assign: (config, { valueCell }) => { config.apiUsername = valueCell.textContent.trim(); },
  },
  {
    test: (key) => key.includes('api password'),
    assign: (config, { valueCell }) => { config.apiPassword = valueCell.textContent.trim(); },
  },
  {
    test: (key) => key.includes('upload image'),
    // Image goes in first so classifyThankYouContent() sees it before the message.
    assign: (config, { img }) => { if (img) config.thankYouContent.unshift(img); },
  },
  {
    test: (key) => key.includes('thank you message'),
    assign: (config, { valueCell }) => {
      // Keep as live DOM nodes (falls back to the cell itself if it has no
      // element children, e.g. plain unwrapped text).
      const nodes = valueCell.children.length ? [...valueCell.children] : [valueCell];
      config.thankYouContent.push(...nodes);
    },
  },
  {
    test: (key) => key.includes('retake heading'),
    assign: (config, { valueCell }) => {
      // Results-screen CTA heading. Preserves any authored hyperlink (see
      // parseRichText()) — .textContent.trim() used to silently drop it.
      config.ctaHeading = parseRichText(valueCell);
    },
  },
  {
    test: (key) => key.includes('tips heading'),
    assign: (config, { valueCell }) => { config.tipsHeading = parseRichText(valueCell); },
  },
  {
    test: (key) => key.includes('tips list'),
    assign: (config, { valueCell }) => { config.tipsList = parseTipsList(valueCell); },
  },
  {
    // Checked before the generic "download" branches below since it
    // contains "download" too.
    test: (key) => key.includes('results download description'),
    assign: (config, { valueCell }) => {

      config.resultsDownloadDescription = parseRichText(valueCell);
    },
  },
  {
    test: (key) => key.includes('results note'),
    assign: (config, { valueCell }) => {
      // The italic "Note: if you navigate away..." caption below the
      // Download/Email buttons.
      config.resultsNote = parseRichText(valueCell);
    },
  },
  {
    // "Download Button Label" — must require "label" so it doesn't
    // collide with the "download pdf" (endpoint) row above.
    test: (key) => key.includes('download') && key.includes('label'),
    assign: (config, { valueCell }) => { config.downloadButtonLabel = valueCell.textContent.trim(); },
  },
  {
    // "Download Button Icon" 
    // Icon below. Falls back to the existing CSS background-image on
    // .dg-download-icon when unauthored 
    test: (key) => key.includes('download') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.downloadButtonIcon = resolveIconSrc(valueCell, link, img);
    },
  },
  {
    // "Email Button Label" — must require "button" so it doesn't collide
    // with "email modal sheet url" / "form submission" rows.
    test: (key) => key.includes('email') && key.includes('button') && key.includes('label'),
    assign: (config, { valueCell }) => { config.emailButtonLabel = valueCell.textContent.trim(); },
  },
  {
    // "Email Button Icon" — see the Download Button Icon note above;
    // falls back to the existing CSS background-image on .dg-email-icon
    // when unauthored.
    test: (key) => key.includes('email') && key.includes('button') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.emailButtonIcon = resolveIconSrc(valueCell, link, img);
    },
  },
  {
    // Results-screen Retake button text (see buildRetakeButton() in
    // doctor-discussion-results-builders.js).
    test: (key) => key.includes('retake') && key.includes('label'),
    assign: (config, { valueCell }) => { config.retakeLabel = valueCell.textContent.trim(); },
  },
  {
    // Retake button icon: plain path/URL, uploaded image, or hyperlink, in
    // that priority order. Falls back to the existing CSS icon if unauthored.
    test: (key) => key.includes('retake') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.retakeIcon = resolveIconSrc(valueCell, link, img);
    },
  },
];

function applyConfigRow(config, key, context) {
  const matcher = CONFIG_ROW_MATCHERS.find(({ test }) => test(key));
  if (matcher) matcher.assign(config, context);
}

export function parseDoctorDiscussionConfig(block) {
  const config = defaultDoctorDiscussionConfig();

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;

    const key = cells[0].textContent.trim().toLowerCase();
    const valueCell = cells[1];
    const link = valueCell.querySelector('a');
    const img = valueCell.querySelector('img');

    applyConfigRow(config, key, { valueCell, link, img });
  });

  return config;
}

// ---------------------------------------------------------------------------
// Sheet fetch + row → steps translation (Image 2 schema).
// ---------------------------------------------------------------------------

/**
 * Fetches a da.live/AEM sheet JSON and returns one named tab's rows as
 * plain objects.
 *
 * @param {string} sheetUrl
 * @param {string} sheetName - name of the tab to read (e.g. 'data', 'email-modal').
 * @returns {Promise<Array<Object>>}
 */
async function fetchNamedSheetRows(sheetUrl, sheetName) {
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const json = await res.json();

  const sheetsByName = new Map(Object.entries(json));
  const namedSheet = sheetsByName.get(sheetName);
  if (namedSheet && Array.isArray(namedSheet.data)) return namedSheet.data;

  const sheet = json.data;
  if (Array.isArray(sheet)) return sheet;
  if (sheet && Array.isArray(sheet.data)) return sheet.data;

  return [];
}

// Strips a trailing 1-based option index ("q1a1" -> "q1") so consecutive
// options collapse into one group; falls back to the full name if no match.
function deriveGroupName(name) {
  const match = /^(.*)a\d+$/i.exec(name || '');
  return match ? match[1] : name;
}

// True/false-ish sheet values ("true", "yes", "1", "x") for the Mandatory column.
function isTruthy(value) {
  return /^(true|yes|1|x)$/i.test((value || '').trim());
}

function createStepBuilderState() {
  return {
    steps: [], current: null, pendingLabel: null, pendingDescription: null, optionGroup: null,
  };
}

function ensureCurrentStep(state) {
  if (!state.current) {
    state.current = { title: '', fields: [] };
    state.steps.push(state.current);
  }
  return state.current;
}

// Commits the in-progress checkbox/radio group as a field on the current step.
function flushOptionGroup(state) {
  const { optionGroup, pendingLabel, pendingDescription } = state;
  if (!optionGroup) return;
  ensureCurrentStep(state).fields.push({
    type: optionGroup.type,
    name: optionGroup.name,
    label: pendingLabel || '',
    helper: optionGroup.type === 'checkbox' ? 'Select all that apply' : 'Select one',
    description: pendingDescription || '',
    options: optionGroup.options,
    required: true,
  });
  state.optionGroup = null;
  state.pendingLabel = null;
  state.pendingDescription = null;
}

function handleHeadingRow(state, label) {
  flushOptionGroup(state);
  state.current = { title: label, fields: [] };
  state.steps.push(state.current);
}

function handleTextRow(state, row, name, label) {
  flushOptionGroup(state);
  ensureCurrentStep(state).fields.push({
    type: 'text',
    name,
    label,
    helper: row.Placeholder || (isTruthy(row.Mandatory) ? '' : 'Optional'),
    required: isTruthy(row.Mandatory),
  });
}

// Splits a "DID YOU KNOW" plaintext row's label into its heading (the
// "DID YOU KNOW?" lead-in) and body copy.
function parseDidYouKnow(label) {
  const match = /^(did you know\??)(.*)$/is.exec(label);
  return {
    heading: match ? match[1] : 'DID YOU KNOW?',
    text: match ? match[2].trim() : label,
  };
}

function handlePlaintextRow(state, label) {
  // A "DID YOU KNOW" row always belongs to whichever step is still
  // current at this point in the table (it's authored after that step's
  // Next/Back buttons, but before the next heading row).
  if (/^did you know/i.test(label)) {
    flushOptionGroup(state);
    ensureCurrentStep(state).didYouKnow = parseDidYouKnow(label);
    return;
  }

  if (!state.pendingLabel) state.pendingLabel = label;
  else state.pendingDescription = label;
}

// Supports one option per row or a comma-separated Options cell; either
// way, an authored "[icon](url)" tag is extracted into option.icon.
function optionsForRow(row, label) {
  if (row.Options) return parseOptions(row.Options);
  const { icon, text } = extractIconMarkdown(label);
  return [{ text, icon }];
}

function handleOptionRow(state, row, type, name, label) {
  const groupName = deriveGroupName(name);
  if (!state.optionGroup || state.optionGroup.name !== groupName) {
    flushOptionGroup(state);
    state.optionGroup = { type, name: groupName, options: [] };
  } else if (type === 'checkbox') {
    // Mixed group (checkboxes + a trailing exclusive radio "None of the
    // above" row) renders as a checkbox field; buildCheckboxQuestion()
    // detects the exclusive option itself via text, not via row type.
    state.optionGroup.type = 'checkbox';
  }
  state.optionGroup.options.push(...optionsForRow(row, label));
}

function handleStepRow(state, row) {
  const type = (row.Type || '').trim().toLowerCase();
  const name = (row.Name || '').trim();
  const label = (row.Label || '').trim();

  if (type === 'heading') handleHeadingRow(state, label);
  else if (type === 'text') handleTextRow(state, row, name, label);
  else if (type === 'plaintext') handlePlaintextRow(state, label);
  else if (type === 'checkbox' || type === 'radio') handleOptionRow(state, row, type, name, label);
  // 'button' rows (Next/Back) are structural only — renderStep() builds
  // its own nav buttons — so just close out whatever group preceded them.
  else if (type === 'button') flushOptionGroup(state);
}

/**
 * Groups the sheet's flat rows into the { title, fields, didYouKnow } step
 * shape decorate.js/renderStep() already know how to render.
 *
 * @param {Array<Object>} rows
 * @returns {Array<Object>} steps
 */
export function groupRowsIntoSteps(rows) {
  const state = createStepBuilderState();
  rows.forEach((row) => handleStepRow(state, row));
  flushOptionGroup(state);
  return state.steps;
}

/**
 * Fetches and parses the authored sheet's step-authoring tab into steps,
 * or returns null on any failure so the caller can fall back to
 * DEFAULT_STEPS.
 *
 * @param {string} sheetUrl
 * @returns {Promise<Array<Object>|null>}
 */
export async function fetchStepsFromSheet(sheetUrl) {
  if (!sheetUrl) return null;
  try {
    const rows = await fetchNamedSheetRows(sheetUrl, 'data');
    const steps = groupRowsIntoSteps(rows);
    return steps.length ? steps : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Doctor Discussion: failed to load sheet, falling back to defaults.', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Sheet fetch + row → Email Modal config translation (see
// doctor-discussion-email-config.js for the copy/row schema).
//
// IMPORTANT: reads a SEPARATE sheet document from the main "Doctor
// Discussion Sheet url" — see the warning above for why they can't share one.
// ---------------------------------------------------------------------------

/**
  * Fetches and parses the Email Modal sheet into a config object, or null
 * if unauthored/empty/fails, so the caller can fall back to the default.
 *
 * @param {string} emailModalSheetUrl - the "Email Modal Sheet url" config
 *                                      row (see parseDoctorDiscussionConfig()
 *                                      above) — a dedicated document, kept
 *                                      separate from "Doctor Discussion
 *                                      Sheet url".
 * @returns {Promise<Object|null>}
 */
export async function fetchEmailModalConfigFromSheet(emailModalSheetUrl) {
  if (!emailModalSheetUrl) return null;
  try {
    const rows = await fetchNamedSheetRows(emailModalSheetUrl, 'email-modal');
    return rows.length ? parseEmailModalRows(rows) : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Doctor Discussion: failed to load email-modal sheet, falling back to defaults.', error);
    return null;
  }
}