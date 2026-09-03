import {
  createEl, setAnswer, EMAIL_SUBMIT_API_URL, THANKYOU_MODAL_ID,
  setModalController, getModalController,
} from './doctor-discussion-utils.js';
import { renderInlineLinks } from './doctor-discussion-markdown.js';
import { DEFAULT_EMAIL_MODAL_CONFIG } from './doctor-discussion-email-config.js';
import createEmailModalController from './doctor-discussion-email-modal.js';
import createThankYouModalController from './doctor-discussion-thankyou-modal.js';

// ---------------------------------------------------------------------------
// Checkbox/radio exclusivity, Next-button validity, answer collection
// ---------------------------------------------------------------------------


// Unchecks every other input in the group besides the one just interacted with.
function deselectOtherInputs(inputs, input) {
  inputs.forEach((other) => {
    if (other !== input) other.checked = false;
  });
}

// Unchecks every input flagged as the group's "exclusive" option (e.g. "None of the above").
function deselectExclusiveInputs(inputs) {
  inputs.forEach((other) => {
    if (other.dataset.exclusive === 'true') other.checked = false;
  });
}

// Change handler for a single checkbox within an exclusive-aware group.
function handleExclusiveCheckboxChange(inputs, input) {
  if (input.dataset.exclusive === 'true' && input.checked) {
    deselectOtherInputs(inputs, input);
  } else if (input.checked) {
    deselectExclusiveInputs(inputs);
  }
}

// Enforces "None of the above" as mutually exclusive with the other checkboxes in its group.
export function bindExclusiveCheckboxGroup(form) {
  form.querySelectorAll('.dg-option-list:not(.dg-option-list--radio)').forEach((group) => {
    const inputs = [...group.querySelectorAll('.dg-option-input')];
    inputs.forEach((input) => {
      input.addEventListener('change', () => handleExclusiveCheckboxChange(inputs, input));
    });
  });
}

// Change handler for a single radio input within a group.
function handleRadioChange(inputs, input) {
  if (!input.checked) return;
  deselectOtherInputs(inputs, input);
}

// Ensures only one radio option per group stays selected (native radio behavior, made explicit here).
export function bindRadioGroup(form) {
  form.querySelectorAll('.dg-option-list--radio').forEach((group) => {
    const inputs = [...group.querySelectorAll('.dg-option-input[type="radio"]')];
    inputs.forEach((input) => {
      input.addEventListener('change', () => handleRadioChange(inputs, input));
    });
  });
}

// Disables the Next/Finish button until every required checkbox/radio group on the step has a selection.
export function updateNextState(form, step) {
  const nextBtn = form.querySelector('.dg-next-btn');
  const requiredGroups = step.fields.filter(
    (f) => (f.type === 'checkbox' || f.type === 'radio') && f.required,
  );

  const isValid = requiredGroups.every((f) => {
    const checked = form.querySelectorAll(`input[name="${f.name}"]:checked`);
    return checked.length > 0;
  });

  nextBtn.disabled = !isValid;
  nextBtn.classList.toggle('is-disabled', !isValid);
}

// Pull the current values out of a step's form into the shared answers store.
export function collectStepAnswers(form, step, answers) {
  step.fields.forEach((f) => {
    if (f.type === 'text') {
      const input = form.querySelector(`#${f.name}`);
      setAnswer(answers, f.name, input ? input.value : '');
    } else if (f.type === 'checkbox') {
      const checked = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)]
        .map((el) => el.value);
      setAnswer(answers, f.name, checked);
    } else if (f.type === 'radio') {
      const checked = form.querySelector(`input[name="${f.name}"]:checked`);
      setAnswer(answers, f.name, checked ? checked.value : '');
    }
  });
}

// ---------------------------------------------------------------------------
// Email modal
// ---------------------------------------------------------------------------


/**
 * Validates a field and shows the right error message (empty vs. invalid),
 * or hides it if the field is valid. Used by the input/blur listeners below.
 */
function refreshFieldValidity(input, errorEl) {
  const valid = input.checkValidity();
  input.classList.toggle('is-invalid', !valid);

  if (valid) {
    errorEl.style.display = 'none';
    return;
  }

  errorEl.textContent = input.validity.valueMissing
    ? errorEl.dataset.emptyMessage
    : errorEl.dataset.invalidMessage;
  errorEl.style.display = 'block';
}

// Builds the email modal's DOM markup. `emailUrl` is an authored endpoint
// override (defaults to EMAIL_SUBMIT_API_URL); `modalConfig` supplies the
// authorable copy, while field identity/validation stay fixed in code.
function buildEmailModalMarkup(emailUrl, modalConfig = DEFAULT_EMAIL_MODAL_CONFIG) {
  const { errors } = modalConfig;

  // Letters, spaces, apostrophes, hyphens only. NOTE: hyphen must stay
  // escaped (\\-) or it's a silent no-op under the "v"-flag regex engine.
  const NAME_PATTERN = "[A-Za-z\\s'\\-]+";

  const firstNameInput = createEl('input', {
    type: 'text', id: 'FirstName', name: 'FirstName', className: 'dg-modal-input', required: '', pattern: NAME_PATTERN,
  });
  const lastNameInput = createEl('input', {
    type: 'text', id: 'LastName', name: 'LastName', className: 'dg-modal-input', required: '', pattern: NAME_PATTERN,
  });
  // Native type="email" alone accepts junk like "r@gma.8" — this pattern
  // requires a letters-only TLD of 2+ chars (compiles under "v"-flag regex).
  const EMAIL_PATTERN = "[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}";

  const emailInput = createEl('input', {
    type: 'email', id: 'Email', name: 'Email', className: 'dg-modal-input', required: '', pattern: EMAIL_PATTERN,
  });
  const consentInput = createEl('input', {
    type: 'checkbox', id: 'Consent', name: 'Consent', className: 'dg-modal-consent-input', required: '',
  });

  // Each error element carries both messages as data attributes, so
  // refreshFieldValidity() and validateFormFields() can pick the right one.
  const firstNameError = createEl('p', {
    id: 'FirstName-error',
    className: 'dg-modal-field-error',
    style: 'display:none;',
    'data-empty-message': errors.firstNameEmpty,
    'data-invalid-message': errors.firstNameInvalid,
  }, errors.firstNameEmpty);
  const lastNameError = createEl('p', {
    id: 'LastName-error',
    className: 'dg-modal-field-error',
    style: 'display:none;',
    'data-empty-message': errors.lastNameEmpty,
    'data-invalid-message': errors.lastNameInvalid,
  }, errors.lastNameEmpty);
  const emailError = createEl('p', {
    id: 'Email-error',
    className: 'dg-modal-field-error',
    style: 'display:none;',
    'data-empty-message': errors.emailEmpty,
    'data-invalid-message': errors.emailInvalid,
  }, errors.emailEmpty);
  const consentError = createEl('p', { id: 'Consent-error', className: 'dg-modal-field-error', style: 'display:none;' }, errors.consent);

  // Validate on input AND blur, so leaving an empty field shows its
  // error immediately, without needing a submit first.
  const fieldsWithErrors = [
    [firstNameInput, firstNameError],
    [lastNameInput, lastNameError],
    [emailInput, emailError],
  ];
  fieldsWithErrors.forEach(([input, errorEl]) => {
    input.addEventListener('input', () => refreshFieldValidity(input, errorEl));
    input.addEventListener('blur', () => refreshFieldValidity(input, errorEl));
  });
  consentInput.addEventListener('change', () => {
    consentInput.classList.toggle('is-invalid', !consentInput.checked);
    if (consentInput.checked) consentError.style.display = 'none';
  });

  const submitBtn = createEl('button', { type: 'submit', className: 'dg-modal-send-btn send-email' },
    createEl('span', {}, modalConfig.sendLabel),
    createEl('span', { className: 'dg-modal-send-arrow', 'aria-hidden': 'true' }),
  );
  const closeBtn = createEl('button', { type: 'button', className: 'dg-modal-close-btn close', 'aria-label': 'Close' });

  const requiredNote = createEl('p', { className: 'dg-modal-required-note' }, modalConfig.requiredNote);

  // Each authored paragraph may contain zero or more "[label](url)" links
  // (e.g. Terms of Use / Privacy Policy) — see renderInlineLinks() in
  // doctor-discussion-markdown.js.
  const consentTextEl = createEl('span', { className: 'dg-modal-consent-text' });
  modalConfig.consentParagraphs.forEach((paragraph) => {
    consentTextEl.append(createEl(
      'span',
      { className: 'dg-modal-consent-paragraph' },
      ...renderInlineLinks(paragraph, 'dg-modal-legal-link'),
    ));
  });

  const consentRow = createEl('label', { className: 'dg-modal-consent-row', for: 'Consent' },
    consentInput,
    createEl('div', { className: 'dg-modal-consent-content' },
      consentTextEl,
      consentError,
    ),
  );

  // The email submit endpoint lives on the form as data-submit, read by the
  // modal controller at submit time. Prefers the authored da.live override
  // over the hardcoded config constant, same as Download PDF's config.pdfUrl.
  const form = createEl('form', { id: 'emailForm', className: 'dg-modal-form', 'data-submit': emailUrl || EMAIL_SUBMIT_API_URL, novalidate: '' },
    requiredNote,
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'FirstName' }, modalConfig.firstNameLabel),
      firstNameInput,
      firstNameError,
    ),
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'LastName' }, modalConfig.lastNameLabel),
      lastNameInput,
      lastNameError,
    ),
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'Email' }, modalConfig.emailLabel),
      emailInput,
      emailError,
    ),
    consentRow,
    submitBtn,
  );

  const headerTitle = createEl('h2', { className: 'header-title dg-modal-title' }, modalConfig.title);
  const errorMsg = createEl('div', { className: 'error-message d-none' }, errors.generic);
  const patientFormContainer = createEl('div', { className: 'patient-form-container' }, form);

  // No "success" view here — on submit, this modal closes and the
  // Thank You modal opens instead (see doctor-discussion-email-modal.js).
  const modalContent = createEl('div', { className: 'modal-content' },
    closeBtn, headerTitle, patientFormContainer, errorMsg,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: 'mq-modal', className: 'modal', tabindex: '-1' }, modalDialog);

  return {
    modal, form, closeBtn, submitBtn,
  };
}

/**
 * Builds the email modal (once) and returns its controller, reusing the
 * existing modal/controller across opens instead of rebuilding it each time.
 *
 * @param {Object} quizData - the already-flattened legacy payload (e.g.
 *                             { fname, q1a1, q2a1, ... }) to send alongside the
 *                             visitor's name/email/consent on submit. Callers
 *                             that already have this shape (e.g. the wizard's
 *                             own collectAnswers()) should pass it directly —
 *                             this used to be rebuilt here from steps/
 *                             nameFieldName via buildLegacyAnswersPayload(),
 *                             but callers were passing steps=[]/nameFieldName=
 *                             null, which silently produced an empty payload
 *                             (no answers, no fname) every time.
 * @param {string|null} [emailUrl] - authored "Form Submission Endpoint" override from
 *                                   da.live (see parseDoctorDiscussionConfig()); falls
 *                                   back to the hardcoded EMAIL_SUBMIT_API_URL when omitted.
 * @param {string|null} [apiUsername] - authored da.live "API Username" override (see
 *                                   parseDoctorDiscussionConfig()); forwarded to the email
 *                                   modal controller for the sendemail API's Basic Auth
 *                                   header. When either this or apiPassword is missing, no
 *                                   Authorization header is sent.
 * @param {string|null} [apiPassword] - authored da.live "API Password" override; see above.
 * @param {Object} [modalConfig] - authorable modal copy (title/labels/consent
 *                                 text/errors), from the sheet's "email-modal"
 *                                 tab via fetchEmailModalConfigFromSheet() in
 *                                 doctor-discussion-sheet.js, or
 *                                 DEFAULT_EMAIL_MODAL_CONFIG when unauthored.
 */
export function getOrCreateEmailModal(quizData, emailUrl, apiUsername, apiPassword, modalConfig) {
  const modalEl = document.getElementById('mq-modal');
  if (modalEl) return getModalController(modalEl);

  const {
    modal, closeBtn, submitBtn,
  } = buildEmailModalMarkup(emailUrl, modalConfig);
  document.body.append(modal);

  const controller = createEmailModalController({
    modalId: 'mq-modal',
    formId: 'emailForm',
    quizData,
    apiUsername,
    apiPassword,
  });

  closeBtn.addEventListener('click', () => controller.close());
  submitBtn.addEventListener('click', (e) => controller.handleSubmit(e));

  // Stash the controller so subsequent calls can find it again.
  setModalController(modal, controller);
  return controller;
}

// ---------------------------------------------------------------------------
// Thank-you modal
// ---------------------------------------------------------------------------


/**
 * @param {Element[]} nodes
 * @returns {Element[]}
 */
function splitParagraphsAtBreaks(nodes) {
  const result = [];

  nodes.forEach((node) => {
    const isSplittableParagraph = node instanceof HTMLElement
      && node.tagName.toLowerCase() === 'p'
      && node.querySelector('br');

    if (!isSplittableParagraph) {
      result.push(node);
      return;
    }

    const before = document.createElement('p');
    const after = document.createElement('p');
    let target = before;
    let brSeen = false;

    [...node.childNodes].forEach((child) => {
      if (!brSeen && child.nodeName.toLowerCase() === 'br') {
        brSeen = true;
        target = after;
        return;
      }
      target.append(child.cloneNode(true));
    });

    // Trim stray whitespace left over from formatting around the <br>.
    before.textContent = before.textContent.trim();
    after.textContent = after.textContent.trim();

    if (before.textContent) result.push(before);
    if (after.textContent) result.push(after);
  });

  return result;
}

/**
 * Auto-classifies thank-you.
 *
 * @param {Element[]} nodes
 */
function classifyThankYouContent(nodes) {
  let headingAssigned = false;

  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();

    if (tag === 'picture') {
      node.querySelector('img')?.classList.add('dg-thankyou-icon');
      return;
    }
    if (tag === 'img') {
      node.classList.add('dg-thankyou-icon');
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      node.classList.add('dg-thankyou-heading');
      headingAssigned = true;
      return;
    }
    if (tag === 'p') {
      if (!headingAssigned) {
        node.classList.add('dg-thankyou-heading');
        headingAssigned = true;
      } else {
        node.classList.add('dg-thankyou-message');
      }
    }
  });
}

/**
 * Builds the Thank You modal from the authored thank-you row content
 * 
 * @param {Element[]} thankYouContent - Nodes from the thank-you row's content cell.
 */
export function buildThankYouModal(thankYouContent = []) {
  if (!thankYouContent.length || document.getElementById(THANKYOU_MODAL_ID)) return;

  // Normalize "one paragraph with a <br>" authoring into two paragraphs
  // first, so classifyThankYouContent() can assign heading/message
  // classes to distinct elements (see splitParagraphsAtBreaks() docblock).
  const content = splitParagraphsAtBreaks(thankYouContent);
  classifyThankYouContent(content);

  const closeBtn = createEl('button', {
    type: 'button', className: 'dg-thankyou-close-btn close', 'aria-label': 'Close',
  });
  const modalContent = createEl('div', { className: 'modal-content dg-thankyou-content' },
    closeBtn,
    ...content,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: THANKYOU_MODAL_ID, className: 'modal', tabindex: '-1' }, modalDialog);
  // Explicit initial hidden state -- don't rely solely on CSS defaults.
  modal.style.display = 'none';

  document.body.append(modal);

  const controller = createThankYouModalController({ modalId: THANKYOU_MODAL_ID });
  closeBtn.addEventListener('click', () => controller.close());
  setModalController(modal, controller);
}