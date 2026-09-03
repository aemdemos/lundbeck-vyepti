import {
  createEl, PDF_DOWNLOAD_API_URL, capitalizeName,
} from './doctor-discussion-utils.js';
import { extractIconMarkdown } from './doctor-discussion-markdown.js';
import {
  buildResultsHeader, buildResultsActions, buildResultsTips, renderRichContent, buildRetakeButton,
  DEFAULT_RESULTS_CTA_HEADING, DEFAULT_RESULTS_TIPS_HEADING, DEFAULT_RESULTS_TIPS, DEFAULT_RETAKE_LABEL,
  DEFAULT_RESULTS_DOWNLOAD_DESCRIPTION, DEFAULT_RESULTS_NOTE,
  DEFAULT_DOWNLOAD_BUTTON_LABEL, DEFAULT_EMAIL_BUTTON_LABEL,
} from './doctor-discussion-results-builders.js';
import { getOrCreateEmailModal, buildThankYouModal } from './doctor-discussion-interactions.js';

// ---------------------------------------------------------------------------
// Classify + split form.js's raw flat output. Every step in the sheet
// starts with a `heading-wrapper` (see doctor-discussion-sheet.js grouping
// note); everything up to the next heading belongs to that step.
// ---------------------------------------------------------------------------

function classifyRaw(el) {
  if (el.classList.contains('heading-wrapper')) return 'heading';
  if (el.classList.contains('text-wrapper')) return 'text';
  if (el.classList.contains('button-wrapper')) return 'button';
  if (el.classList.contains('selection-wrapper')) return 'selection';
  if (el.classList.contains('plaintext-wrapper')) {
    return /^did you know/i.test(el.textContent.trim()) ? 'callout' : 'plaintext';
  }
  return 'other';
}

function splitRawSteps(form) {
  const steps = [];
  [...form.children].forEach((el) => {
    if (classifyRaw(el) === 'heading' || !steps.length) steps.push([]);
    steps[steps.length - 1].push(el);
  });
  return steps;
}

// ---------------------------------------------------------------------------
// Rebuilders: raw form.js field-wrapper -> the polished dg-* markup the CSS
// actually targets. Real <input>/<label> nodes are moved (not cloned) so
// their id/name/checked state — and form.elements membership — survive.
// ---------------------------------------------------------------------------

function buildHeaderWrapper(rawHeading, stepNumber, totalSteps) {
  const h2 = rawHeading.querySelector('h2, h3') || createEl('h2', {}, '');
  const header = createEl('div', { className: 'dg-header' },
    createEl('span', { className: 'dg-header-badge' }, String(stepNumber)),
    h2);
  const progress = createEl('div', { className: 'dg-progress' });
  for (let i = 0; i < totalSteps; i += 1) {
    const seg = createEl('span', { className: 'dg-progress-segment' });
    if (i < stepNumber) seg.classList.add('is-complete');
    progress.append(seg);
  }
  return createEl('div', { className: 'dg-header-wrapper' }, header, progress);
}

function buildTextField(rawText, countLabel, stepNumber) {
  const input = rawText.querySelector('input');
  const label = rawText.querySelector('label');
  input.classList.add('dg-text-input');
  label.classList.add('dg-field-label');

  const labelRow = createEl('div', { className: 'dg-field-label-row' }, label);
  if (countLabel) labelRow.append(createEl('span', { className: 'dg-field-count' }, countLabel));

  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-text` }, labelRow);
  // Reuses the input's placeholder as a helper caption (form-fields.js has
  // no separate row for it), then clears it so it doesn't render twice.
  if (input.placeholder) {
    field.append(createEl('p', { className: 'dg-field-helper' }, input.placeholder));
    input.removeAttribute('placeholder');
  }
  field.append(input);
  return field;
}

/**
 * Builds an option's icon: an authored "[icon](url)" tag renders as an
 * <img>; else falls back to legacy CSS icons for step-1 options only.
 *
 * @param {string|null} icon - authored icon URL, or null if none was authored.
 * @param {boolean} showIcon - whether this option's step falls back to the
 *                             legacy CSS icons (true only for step 1).
 * @param {number} index - 0-based index of the option within its field,
 *                          used only for the legacy CSS fallback classes.
 */
function buildOptionIconEl(icon, showIcon, index) {
  if (icon) {
    return createEl('img', { className: 'dg-option-icon', src: icon, alt: '' });
  }
  if (showIcon) {
    return createEl('span', { className: `dg-option-icon dg-step1-icon${index + 1}`, 'aria-hidden': 'true' });
  }
  return null;
}

function buildOptionLabel(rawSelection, index, showIcon) {
  const input = rawSelection.querySelector('input');
  const rawLabel = rawSelection.querySelector('label');
  const rawLabelText = rawLabel.textContent.trim();
  const { icon, text } = extractIconMarkdown(rawLabelText);
  input.classList.add('dg-option-input');
  if (/none of the above/i.test(text)) input.dataset.exclusive = 'true';

  // An un-authored radio's value defaults to the raw Label (still
  // containing "[icon](url)"); sync it to the cleaned text so field.value
  // matches what's shown on screen. Checkboxes default to "checked" instead,
  // so this never fires for them.
  if (input.value === rawLabelText) {
    input.value = text;
  }

  const optionLabel = createEl('label', { className: 'dg-option', for: input.id });
  const iconEl = buildOptionIconEl(icon, showIcon, index);
  if (iconEl) optionLabel.append(iconEl);
  optionLabel.append(
    createEl('span', { className: 'dg-option-text' }, text),
    input,
    createEl('span', { className: 'dg-option-control' }),
  );
  return optionLabel;
}

// Merges the plaintext rows preceding an option run (question label, then
// description) with the option rows themselves into one dg-field.
function buildOptionGroupField(plaintexts, selectionRaws, countLabel, stepNumber) {
  const isCheckbox = selectionRaws.some((raw) => raw.querySelector('input[type="checkbox"]'));
  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-checkbox${isCheckbox ? '' : ' dg-field-radio'}` });

  const [labelText, descText] = plaintexts.map((el) => el.textContent.trim());
  if (labelText) field.append(createEl('h3', { className: 'dg-field-label' }, labelText));

  const helperRow = createEl('div', { className: 'dg-field-helper-row' },
    createEl('span', { className: 'dg-field-helper' }, isCheckbox ? 'Select all that apply' : 'Select one'));
  if (countLabel) helperRow.append(createEl('span', { className: 'dg-field-count' }, countLabel));
  field.append(helperRow);

  if (descText) field.append(createEl('p', { className: 'dg-field-description' }, descText));

  const optionList = createEl('div', { className: `dg-option-list${isCheckbox ? '' : ' dg-option-list--radio'}` });
  const showIcon = stepNumber === 1;
  selectionRaws.forEach((raw, index) => optionList.append(buildOptionLabel(raw, index, showIcon)));
  field.append(optionList);

  return { field, isCheckbox, inputs: [...optionList.querySelectorAll('input')] };
}

const DEFAULT_BACK_LABEL = 'Back';
const DEFAULT_NEXT_LABEL = 'Next';
const DEFAULT_FINISH_LABEL = 'Finish';

// Builds a Back/Next/Finish icon: an authored icon URL renders as an
// <img>; otherwise falls back to a <span> using the existing CSS arrow
// icon on `fallbackClassName`.
function buildActionIcon(fallbackClassName, iconUrl = null) {
  if (iconUrl) {
    return createEl('img', {
      className: fallbackClassName, src: iconUrl, alt: '', 'aria-hidden': 'true',
    });
  }
  return createEl('span', { className: fallbackClassName, 'aria-hidden': 'true' });
}

// Resolves a button's icon: prefers the dedicated Placeholder-column icon
// URL (`explicitIconUrl`), falling back to a "[icon](url)" tag embedded in
// the Label text, else null (default CSS arrow).
function resolveActionIcon(explicitIconUrl, labelIcon) {
  return explicitIconUrl || labelIcon || null;
}

// `backLabelRaw`/`nextLabelRaw` are the raw authored <label> text for each
// button row (may contain a leading "[icon](url)" tag); `backIconRaw`/
// `nextIconRaw` are each row's authored Placeholder-column icon URL, or
// null when unauthored — see buildStep() below for where these are captured.
function buildActions(hasBack, isLastStep, backLabelRaw, nextLabelRaw, backIconRaw, nextIconRaw) {
  const children = [];
  let backBtn = null;

  if (hasBack) {
    const { icon: backLabelIcon, text: backText } = extractIconMarkdown(backLabelRaw || '');
    const backIcon = resolveActionIcon(backIconRaw, backLabelIcon);
    backBtn = createEl('button', { type: 'button', className: 'dg-back-btn' },
      buildActionIcon('dg-back-arrow', backIcon),
      createEl('span', {}, backText || DEFAULT_BACK_LABEL));
    children.push(backBtn);
  }

  const { icon: nextLabelIcon, text: nextText } = extractIconMarkdown(nextLabelRaw || '');
  const nextIcon = resolveActionIcon(nextIconRaw, nextLabelIcon);
  const fallbackNextLabel = isLastStep ? DEFAULT_FINISH_LABEL : DEFAULT_NEXT_LABEL;
  const nextBtn = createEl('button', { type: 'button', className: 'dg-next-btn' },
    createEl('span', {}, nextText || fallbackNextLabel),
    buildActionIcon('dg-next-arrow', nextIcon));
  children.push(nextBtn);

  return { actions: createEl('div', { className: 'dg-actions' }, ...children), backBtn, nextBtn };
}

function buildCallout(rawCallout) {
  const text = rawCallout.textContent.trim();
  const match = /^(did you know\??)(.*)$/is.exec(text);
  const heading = match ? match[1] : 'DID YOU KNOW?';
  const body = match ? match[2].trim() : text;
  return createEl('div', { className: 'dg-callout', hidden: '' },
    createEl('div', { className: 'dg-callout-wrapper' },
      createEl('span', { className: 'dg-callout-icon', 'aria-hidden': 'true' }),
      createEl('p', { className: 'dg-callout-text' },
        createEl('strong', { className: 'dg-callout-heading' }, `${heading} `),
        body)));
}

// Rebuilds one step's raw elements into { stepEl, optionFields, backBtn, nextBtn, calloutEl, hasTextField }.
function buildStep(rawEls, stepNumber, totalSteps, isLastStep) {
  const formEl = createEl('div', { className: 'dg-form' });
  const optionFields = [];
  let headerWrapper = null;
  let calloutEl = null;
  let hasBack = false;
  // Raw authored <label> text, and authored Placeholder-column icon URL,
  // for the Back / Next-or-Finish button rows on this step — captured
  // below so buildActions() can parse and apply them.
  let backLabelRaw = null;
  let nextLabelRaw = null;
  let backIconRaw = null;
  let nextIconRaw = null;
  let hasTextField = false;
  let pendingPlaintexts = [];
  let pendingSelection = [];
  let fieldCount = 0;

  function nextCountLabel() {
    const label = fieldCount === 0 ? `${stepNumber} of ${totalSteps}` : '';
    fieldCount += 1;
    return label;
  }

  function flushSelection() {
    if (!pendingSelection.length) return;
    const result = buildOptionGroupField(pendingPlaintexts, pendingSelection, nextCountLabel(), stepNumber);
    formEl.append(result.field);
    optionFields.push(result);
    pendingPlaintexts = [];
    pendingSelection = [];
  }

  rawEls.forEach((raw) => {
    const kind = classifyRaw(raw);
    if (kind === 'heading') {
      headerWrapper = buildHeaderWrapper(raw, stepNumber, totalSteps);
    } else if (kind === 'text') {
      flushSelection();
      hasTextField = true;
      formEl.append(buildTextField(raw, nextCountLabel(), stepNumber));
    } else if (kind === 'plaintext') {
      pendingPlaintexts.push(raw);
    } else if (kind === 'selection') {
      pendingSelection.push(raw);
    } else if (kind === 'callout') {
      flushSelection();
      calloutEl = buildCallout(raw);
    } else if (kind === 'button') {
      flushSelection();
      // Capture the label text and icon URL — Placeholder doubles as the
      // icon URL here since it's otherwise unused on button inputs.
      const labelText = raw.querySelector('label')?.textContent?.trim() || '';
      const iconUrl = raw.querySelector('input')?.getAttribute('placeholder')?.trim() || null;
      if (/back/i.test(labelText)) {
        hasBack = true;
        backLabelRaw = labelText;
        backIconRaw = iconUrl;
      } else if (labelText) {
        nextLabelRaw = labelText;
        nextIconRaw = iconUrl;
      }
    }
  });
  flushSelection();

  const {
    actions, backBtn, nextBtn,
  } = buildActions(hasBack, isLastStep, backLabelRaw, nextLabelRaw, backIconRaw, nextIconRaw);
  formEl.append(actions);

  const stepEl = createEl('div', { className: 'dg-step' });
  if (headerWrapper) stepEl.append(headerWrapper);
  stepEl.append(formEl);
  if (calloutEl) stepEl.append(calloutEl);

  return {
    stepEl, optionFields, backBtn, nextBtn, calloutEl, hasTextField,
  };
}

// ---------------------------------------------------------------------------
// Behavior form-fields.js doesn't implement: exclusive selection, the
// "DID YOU KNOW" reveal, disabled-until-answered Next/Finish, and
// personalizing a results question with the entered name.
// ---------------------------------------------------------------------------

function allOptionInputs(step) {
  return step.optionFields.flatMap((f) => f.inputs);
}

function optionLabelFor(input) {
  return input.closest('.dg-option')?.querySelector('.dg-option-text')?.textContent || '';
}

// Radio-style fields are single-select regardless of `name` (rows aren't
// natively grouped); checkbox fields only enforce exclusivity against/with
// the "None of the above" option.
function uncheckConflictingInputs(inputs, input, isCheckbox) {
  inputs.forEach((other) => {
    if (other === input) return;
    if (!isCheckbox || input.dataset.exclusive === 'true' || other.dataset.exclusive === 'true') {
      other.checked = false;
    }
  });
}

function handleSelectionChange(input, inputs, isCheckbox) {
  if (!input.checked) return;
  uncheckConflictingInputs(inputs, input, isCheckbox);
}

function wireSelectionBehavior(step) {
  step.optionFields.forEach(({ inputs, isCheckbox }) => {
    inputs.forEach((input) => {
      input.addEventListener('change', () => handleSelectionChange(input, inputs, isCheckbox));
    });
  });
}

function wireCallout(step) {
  if (!step.calloutEl) return;
  const inputs = allOptionInputs(step);
  const update = () => { step.calloutEl.hidden = !inputs.some((i) => i.checked); };
  inputs.forEach((i) => i.addEventListener('change', update));
}

function hasAnswer(step) {
  const inputs = allOptionInputs(step);
  return !inputs.length || inputs.some((i) => i.checked);
}

// A step is valid (Next/Finish enabled) only once every one of its option
// groups on the step has at least one selection. Groups with no inputs
// (e.g. a step that's text-only) never block progress.
function isStepValid(step) {
  return step.optionFields.every(({ inputs }) => !inputs.length || inputs.some((i) => i.checked));
}

// Keeps Next/Finish disabled until isStepValid(step), re-checking on every
// option change — mirrors updateNextState()'s rule for the other rendering path.
function wireNextButtonState(step) {
  const update = () => {
    const valid = isStepValid(step);
    step.nextBtn.disabled = !valid;
    step.nextBtn.classList.toggle('is-disabled', !valid);
  };
  allOptionInputs(step).forEach((input) => input.addEventListener('change', update));
  update(); // set the correct initial (usually disabled) state as soon as the step is built
}

// ---------------------------------------------------------------------------
// Results screen
// ---------------------------------------------------------------------------

function fieldPayloadValue(field) {
  if (field.type === 'checkbox' || field.type === 'radio') {
    if (!field.checked) return undefined;
    // Un-authored checkboxes default value to "checked"; un-authored radios
    // default to the raw Label (possibly still "[icon](url)" markdown).
    // Prefer the cleaned display text so the payload matches the screen.
    return optionLabelFor(field) || field.value;
  }
  return field.value;
}

function collectAnswers(form) {
  const nameInput = form.querySelector('input[type="text"]');

  // Built via Object.fromEntries (rather than assigning through
  // payload[field.name] = ...) so no property key ever comes from a
  // dynamic bracket-assignment on a plain object.
  const entries = [...form.elements]
    .filter((field) => field.name && !field.disabled && field.type !== 'submit' && field.type !== 'button')
    .map((field) => [field.name, fieldPayloadValue(field)])
    .filter(([, value]) => value !== undefined);
  const payload = Object.fromEntries(entries);

  if (nameInput && nameInput.value.trim()) {
    // Title-case fname before sending — the backend renders it verbatim.
    // Same capitalizeName() helper as findNameValue() keeps both in sync.
    payload.fname = capitalizeName(nameInput.value.trim());
  }

  return payload;
}

function questionTextForStep(step) {
  const label = step.stepEl.querySelector('.dg-field-checkbox .dg-field-label, .dg-field-radio .dg-field-label');
  const heading = step.stepEl.querySelector('.dg-header h2, .dg-header h3');
  return (label || heading)?.textContent.trim() || '';
}

// Index of the "My name is" text-input step, so the following step's
// question can be personalized on the results screen.
function findNameStepIndex(steps) {
  return steps.findIndex((step) => step.hasTextField);
}

// Builds the numbered "question / Your Answer" list, prefixing the
// question right after the name step with `name` (already display-cased).
function buildResultsList(steps, name) {
  const list = createEl('ol', { className: 'dg-results-list' });
  const nameStepIndex = findNameStepIndex(steps);
  const personalizeIndex = nameStepIndex === -1 ? -1 : nameStepIndex + 1;

  steps.forEach((step, index) => {
    const checked = allOptionInputs(step).filter((i) => i.checked);
    if (!checked.length) return;
    const answerText = checked.map(optionLabelFor).join(', ');
    const baseQuestion = questionTextForStep(step);
    const questionText = (name && index === personalizeIndex)
      ? `${name}... ${baseQuestion}`
      : baseQuestion;
    list.append(createEl('li', { className: 'dg-results-item' },
      createEl('p', { className: 'dg-results-question' }, questionText),
      createEl('p', { className: 'dg-results-answer' },
        createEl('span', { className: 'dg-results-answer-label' }, 'Your Answer: '),
        createEl('span', { className: 'dg-results-answer-value' }, answerText || '—'))));
  });
  return list;
}

// Returns the visitor-entered name, title-cased via capitalizeName() 
function findNameValue(form) {
  return capitalizeName(form.querySelector('input[type="text"]')?.value || '');
}

// Downloads the PDF. apiUsername/apiPassword are authored overrides — if
// either is missing, no Authorization header is sent (same as before).
async function downloadPdf(answers, pdfUrl, apiUsername, apiPassword, button) {
  button.disabled = true;
  const pdfWindow = window.open('', '_blank');
  try {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (apiUsername && apiPassword) {
      const credentials = `${apiUsername}:${apiPassword}`;
      headers.Authorization = `Basic ${btoa(credentials)}`;
    }
    const res = await fetch(pdfUrl, { method: 'POST', headers, body: new URLSearchParams(answers).toString() });
    if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (pdfWindow) pdfWindow.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Doctor Discussion: PDF download failed.', error);
    if (pdfWindow) pdfWindow.close();
  } finally {
    button.disabled = false;
  }
}

function showResults(card, form, steps, config, showStep) {
  form.style.display = 'none';
  const answers = collectAnswers(form);
  const name = findNameValue(form);

  const resultsCard = createEl('div', { className: 'dg-card dg-results-card' });
  resultsCard.append(buildResultsHeader());

  const body = createEl('div', { className: 'dg-results-body' });
  body.append(createEl('h2', { className: 'dg-results-title' },
    name ? `${name}'s personalized migraine discussion guide` : 'My personalized migraine discussion guide'));
  body.append(buildResultsList(steps, name));

  // "Download or email..." copy — authorable override, falling back to
  // hardcoded copy. No link class forced, but authored links still survive.
  body.append(createEl('p', { className: 'dg-results-download-label' },
    ...renderRichContent(config.resultsDownloadDescription || DEFAULT_RESULTS_DOWNLOAD_DESCRIPTION, null)));

  // Download/Email buttons — labels and icons are each independently
  // authorable overrides, defaulting to hardcoded text/CSS icons.
  const { wrapper: actionsWrapper, downloadBtn, emailBtn } = buildResultsActions(
    config.downloadButtonLabel || DEFAULT_DOWNLOAD_BUTTON_LABEL,
    config.emailButtonLabel || DEFAULT_EMAIL_BUTTON_LABEL,
    config.downloadButtonIcon,
    config.emailButtonIcon,
  );
  downloadBtn.addEventListener('click', () => downloadPdf(
    answers,
    config.pdfUrl || PDF_DOWNLOAD_API_URL,
    config.apiUsername,
    config.apiPassword,
    downloadBtn,
  ));
  emailBtn.addEventListener('click', () => {
    const emailModal = getOrCreateEmailModal(
      answers,
      config.emailUrl,
      config.apiUsername,
      config.apiPassword,
      config.emailModalConfig,
    );
    emailModal.open();
  });
  body.append(actionsWrapper);

  // Italic "Note: if you navigate away..." caption — authorable via the
  // "Results Note" config row. Falls back to the previously-hardcoded
  // copy when unauthored.
  body.append(createEl('p', { className: 'dg-results-note' },
    ...renderRichContent(config.resultsNote || DEFAULT_RESULTS_NOTE, null)));
  body.append(createEl('hr', { className: 'dg-results-divider' }));

  // "Talk to your doctor..." heading — authorable override (preserves any
  // authored hyperlink via renderRichContent()), falling back to hardcoded copy.
  body.append(createEl('h3', { className: 'dg-results-cta-heading' },
    ...renderRichContent(config.ctaHeading || DEFAULT_RESULTS_CTA_HEADING, 'dg-results-vyepti-link')));

  const retakeBtn = buildRetakeButton(config.retakeLabel || DEFAULT_RETAKE_LABEL, config.retakeIcon);
  retakeBtn.addEventListener('click', () => {
    form.reset();
    resultsCard.remove();
    form.style.display = '';
    // Without this, the last step (still visible from before Finish)
    // stays shown; explicitly jump to step 0 so Retake restarts the wizard.
    showStep(0);
    form.dispatchEvent(new CustomEvent('dg:retake', { bubbles: true }));
  });
  body.append(retakeBtn);

  body.append(createEl('hr', { className: 'dg-results-divider' }));

   // Closing tips callout — authorable override, falling back to
  // DEFAULT_RESULTS_TIPS 
  body.append(buildResultsTips(
    config.tipsHeading || DEFAULT_RESULTS_TIPS_HEADING,
    (config.tipsList && config.tipsList.length) ? config.tipsList : DEFAULT_RESULTS_TIPS,
  ));

  resultsCard.append(body);
  card.append(resultsCard);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Rebuilds form.js's flat output into the polished step wizard, without
 * modifying form.js/form-fields.js themselves.
 *
 * @param {HTMLElement} block
 * @param {HTMLFormElement} form - the <form> form.js just built inside block
 * @param {{
 *   pdfUrl: string|null,
 *   emailUrl: string|null,
 *   apiUsername: string|null,
 *   apiPassword: string|null,
 *   emailModalConfig: Object,
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
 * }} config
 */
export default function enhanceAsWizard(block, form, config) {
  form.setAttribute('novalidate', '');
  form.addEventListener('submit', (e) => e.preventDefault());

  const rawSteps = splitRawSteps(form);
  const totalSteps = rawSteps.length;
  const steps = rawSteps.map((raw, i) => buildStep(raw, i + 1, totalSteps, i === totalSteps - 1));

  form.textContent = '';
  const card = createEl('div', { className: 'dg-card' });
  form.before(card);
  card.append(form);
  steps.forEach((step) => form.append(step.stepEl));

  steps.forEach((step) => {
    wireSelectionBehavior(step);
    wireCallout(step);
    wireNextButtonState(step);
  });

  function showStep(index) {
    steps.forEach((step, i) => {
      step.stepEl.style.setProperty('display', i === index ? '' : 'none', i === index ? '' : 'important');
    });
  }

  steps.forEach((step, index) => {
    if (step.backBtn) step.backBtn.addEventListener('click', () => showStep(index - 1));
    step.nextBtn.addEventListener('click', () => {
      if (!hasAnswer(step)) return;
      if (index < steps.length - 1) showStep(index + 1);
      else showResults(card, form, steps, config, showStep);
    });
  });

  showStep(0);
  buildThankYouModal(config.thankYouContent);
}