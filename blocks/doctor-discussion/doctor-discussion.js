import { createEmailModalController } from './doctor-discussion-email-modal.js';
import { createPdfDownloadController } from './doctor-discussion-download-pdf.js';
import { createThankYouModalController } from './doctor-discussion-thankyou-modal.js';

// Default number of progress-dot segments shown when no total-steps row is authored.
const TOTAL_STEPS_DEFAULT = 9;
// Real API endpoint used to generate and download the guide as a PDF.
const PDF_DOWNLOAD_API_URL = 'https://vyepti-stage.d.lundbeckus.com/api/doctordiscussionguide';
// Real API endpoint used to email the guide to the patient.
const EMAIL_SUBMIT_API_URL = 'https://vyepti-stage.d.lundbeckus.com/api/doctordiscussionguide';
const PDF_ERROR_ELEMENT_ID = 'dg-pdf-error-msg';
const PDF_POPUP_BLOCKED_ELEMENT_ID = 'dg-pdf-popup-blocked';
const THANKYOU_MODAL_ID = 'dg-thankyou-modal';
// Matches the wrapper EDS gives any block authored as "doctor-thankyou",
// regardless of where it sits on the page.
const THANKYOU_BLOCK_SELECTOR = '[data-block-name="doctor-thankyou"]';

/**
 * Create a DOM element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  children.forEach((child) => {
    if (child === undefined || child === null) return;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return el;
}

// Build the header bar with step number, title and progress dots.
function buildHeader(stepNumber, totalSteps, title) {
  const header = createEl('div', { className: 'dg-header' },
    createEl('span', { className: 'dg-header-badge' }, String(stepNumber)),
    createEl('h2', { className: 'dg-header-title' }, title),
  );

  // One progress segment per step; segments up to the current step are marked complete.
  const progress = createEl('div', { className: 'dg-progress' });
  for (let i = 0; i < totalSteps; i += 1) {
    const seg = createEl('span', { className: 'dg-progress-segment' });
    if (i < stepNumber) seg.classList.add('is-complete');
    progress.append(seg);
  }

  return createEl('div', { className: 'dg-header-wrapper' }, header, progress);
}

// Build a free-text 

function buildTextQuestion(fieldDef, countLabel, savedValue) {
  const { name, label, helper } = fieldDef;
  const field = createEl('div', { className: 'dg-field dg-field-text' });

  const labelRowChildren = [createEl('h3', { className: 'dg-field-label' }, label)];
  if (countLabel) {
    labelRowChildren.push(createEl('span', { className: 'dg-field-count' }, countLabel));
  }
  field.append(createEl('div', { className: 'dg-field-label-row' }, ...labelRowChildren));

  if (helper) {
    field.append(createEl('p', { className: 'dg-field-helper' }, helper));
  }

  const input = createEl('input', {
    type: 'text',
    id: name,
    name,
    className: 'dg-text-input',
  });
  // Re-populate from a previous visit to this step (e.g. after clicking Back).
  if (savedValue) input.value = savedValue;

  field.append(input);
  return field;
}

/**
 * Build the visual control 
 * @param {'checkbox'|'radio'} inputType
 */
function buildOptionControl(inputType) {
  return createEl('span', { className: `dg-option-control dg-option-control--${inputType}` });
}

/**
 * Build the icon element shown at the start of an option row. - Step 1

 * @param {number} stepNumber 1-based step number the option belongs to.
 * @param {number} optionIndex 0-based index of the option within its field.
 * @returns {HTMLElement|null}
 */
function buildOptionIcon(stepNumber, optionIndex) {
  // Decorative option icons are only used on Step 1's options.
  if (stepNumber !== 1) return null;
  return createEl('span', {
    className: `dg-option-icon dg-step1-icon${optionIndex + 1}`,
    'aria-hidden': 'true',
  });
}

// Build a "select all that apply" 

function buildCheckboxQuestion(fieldDef, countLabel, savedValues, stepNumber) {
  const {
    name, label, helper, description, options,
  } = fieldDef;
  const field = createEl('div', { className: 'dg-field dg-field-checkbox' });

  if (label) {
    field.append(createEl('h3', { className: 'dg-field-label' }, label));
  }

  if (helper || countLabel) {
    const helperRowChildren = [createEl('span', { className: 'dg-field-helper' }, helper || '')];
    if (countLabel) {
      helperRowChildren.push(createEl('span', { className: 'dg-field-count' }, countLabel));
    }
    field.append(createEl('div', { className: 'dg-field-helper-row' }, ...helperRowChildren));
  }

  if (description) {
    field.append(createEl('p', { className: 'dg-field-description' }, description));
  }

  const optionList = createEl('div', { className: 'dg-option-list' });
  const selected = new Set(savedValues || []);

  options.forEach(({ text }, index) => {
    const optionId = `${name}-${index}`;
    // "None of the above" is rendered as a radio so it auto-clears the other checkboxes.
    const isExclusive = /none of the above/i.test(text);

    const input = createEl('input', {
      type: isExclusive ? 'radio' : 'checkbox',
      id: optionId,
      name,
      value: text,
      className: 'dg-option-input',
      ...(isExclusive ? { 'data-exclusive': 'true' } : {}),
    });
    if (selected.has(text)) input.checked = true;

    const optionLabel = createEl('label', {
      className: `dg-option ${isExclusive ? 'dg-option--radio' : 'dg-option--checkbox'}`,
      for: optionId,
    },
      buildOptionIcon(stepNumber, index),
      createEl('span', { className: 'dg-option-text' }, text),
      input,
      buildOptionControl(isExclusive ? 'radio' : 'checkbox'),
    );

    optionList.append(optionLabel);
  });

  field.append(optionList);
  return field;
}

// Build a "select one" 

function buildRadioQuestion(fieldDef, countLabel, savedValue, stepNumber) {
  const {
    name, label, helper, description, options,
  } = fieldDef;
  const field = createEl('div', { className: 'dg-field dg-field-checkbox dg-field-radio' });

  if (label) {
    field.append(createEl('h3', { className: 'dg-field-label' }, label));
  }

  if (helper || countLabel) {
    const helperRowChildren = [createEl('span', { className: 'dg-field-helper' }, helper || '')];
    if (countLabel) {
      helperRowChildren.push(createEl('span', { className: 'dg-field-count' }, countLabel));
    }
    field.append(createEl('div', { className: 'dg-field-helper-row' }, ...helperRowChildren));
  }

  if (description) {
    field.append(createEl('p', { className: 'dg-field-description' }, description));
  }

  const optionList = createEl('div', { className: 'dg-option-list dg-option-list--radio' });

  options.forEach(({ text }, index) => {
    const optionId = `${name}-${index}`;

    const input = createEl('input', {
      type: 'radio',
      id: optionId,
      name,
      value: text,
      className: 'dg-option-input',
    });
    if (savedValue === text) input.checked = true;

    const optionLabel = createEl('label', { className: 'dg-option dg-option--radio', for: optionId },
      buildOptionIcon(stepNumber, index),
      createEl('span', { className: 'dg-option-text' }, text),
      input,
      buildOptionControl('radio'),
    );

    optionList.append(optionLabel);
  });

  field.append(optionList);
  return field;
}

// Build the "DID YOU KNOW?" callout. 

function buildDidYouKnow(fieldDef) {
  const { heading, text } = fieldDef;
  // Starts hidden; updateCalloutVisibility() reveals it once the user answers the step's question.
  return createEl('div', { className: 'dg-callout', hidden: '' },
    createEl('div', { className: 'dg-callout-wrapper' },
      createEl('span', { className: 'dg-callout-icon', 'aria-hidden': 'true' }),
      createEl('p', { className: 'dg-callout-text' },
        createEl('strong', { className: 'dg-callout-heading' }, heading ? `${heading} ` : ''),
        text || '',
      ),
    ),
  );
}

// Build the plain "Results" banner 

function buildResultsHeader() {
  return createEl('div', { className: 'dg-header-wrapper dg-results-header-wrapper' },
    createEl('div', { className: 'dg-header dg-results-header' },
      createEl('h2', { className: 'dg-header-title dg-results-header-title' }, 'Results'),
    ),
  );
}

/**
 * Collect every checkbox/radio field across every step, in order, paired
 * with the display text to use as its results-screen question.
 */
function getResultsQuestions(steps) {
  const questions = [];
  steps.forEach((step) => {
    step.fields.forEach((f) => {
      if (f.type === 'checkbox' || f.type === 'radio') {
        questions.push({ ...f, resultsLabel: f.label || step.title });
      }
    });
  });
  return questions;
}

// Format a single field's stored answer as display text. 

function formatAnswer(fieldDef, answers) {
  if (fieldDef.type === 'checkbox') {
    return (answers[fieldDef.name] || []).join(', ');
  }
  return answers[fieldDef.name] || '';
}

// Builds "{Name}'s personalized migraine discussion guide", falling back to "My..." when no name was entered.
function formatResultsHeading(answers, nameFieldName) {
  const name = nameFieldName ? (answers[nameFieldName] || '').trim() : '';
  return name ? `${name}'s personalized migraine discussion guide` : 'My personalized migraine discussion guide';
}

// Prefixes a question with the entered name (e.g. "Rohan... How does...") when the field is flagged for it and a name was given.
function personalizeResultsLabel(fieldDef, answers, nameFieldName) {
  if (!fieldDef.personalizeWithName || !nameFieldName) return fieldDef.resultsLabel;
  const name = (answers[nameFieldName] || '').trim();
  return name ? `${name}... ${fieldDef.resultsLabel}` : fieldDef.resultsLabel;
}

// Build the numbered "question / Your Answer" list shown on the results screen.

function buildResultsList(steps, answers, nameFieldName) {
  const questions = getResultsQuestions(steps);
  const list = createEl('ol', { className: 'dg-results-list' });

  questions.forEach((f) => {
    const value = formatAnswer(f, answers);
    const questionLabel = personalizeResultsLabel(f, answers, nameFieldName);
    list.append(
      createEl('li', { className: 'dg-results-item' },
        createEl('p', { className: 'dg-results-question' }, questionLabel),
        createEl('p', { className: 'dg-results-answer' },
          createEl('span', { className: 'dg-results-answer-label' }, 'Your Answer: '),
          createEl('span', { className: 'dg-results-answer-value' }, value || '—'),
        ),
      ),
    );
  });

  return list;
}

// Build the DOM markup the email modal controller

function buildEmailModalMarkup() {
  const firstNameInput = createEl('input', {
    type: 'text', id: 'FirstName', name: 'FirstName', className: 'dg-modal-input', required: '',
  });
  const lastNameInput = createEl('input', {
    type: 'text', id: 'LastName', name: 'LastName', className: 'dg-modal-input', required: '',
  });
  const emailInput = createEl('input', {
    type: 'email', id: 'Email', name: 'Email', className: 'dg-modal-input', required: '',
  });
  const consentInput = createEl('input', {
    type: 'checkbox', id: 'Consent', name: 'Consent', className: 'dg-modal-consent-input', required: '',
  });

  const firstNameError = createEl('p', { id: 'FirstName-error', className: 'dg-modal-field-error', style: 'display:none;' }, 'Please enter your first name');
  const lastNameError = createEl('p', { id: 'LastName-error', className: 'dg-modal-field-error', style: 'display:none;' }, 'Please enter your last name');
  const emailError = createEl('p', { id: 'Email-error', className: 'dg-modal-field-error', style: 'display:none;' }, 'Please enter a valid email address');
  const consentError = createEl('p', { id: 'Consent-error', className: 'dg-modal-field-error', style: 'display:none;' }, 'Please check the box');

  // Live-validate each field as the user types, clearing its error once it becomes valid.
  const fieldsWithErrors = [
    [firstNameInput, firstNameError],
    [lastNameInput, lastNameError],
    [emailInput, emailError],
  ];
  fieldsWithErrors.forEach(([input, errorEl]) => {
    input.addEventListener('input', () => {
      const valid = input.checkValidity();
      input.classList.toggle('is-invalid', !valid);
      if (valid) errorEl.style.display = 'none';
    });
  });
  consentInput.addEventListener('change', () => {
    consentInput.classList.toggle('is-invalid', !consentInput.checked);
    if (consentInput.checked) consentError.style.display = 'none';
  });

  const submitBtn = createEl('button', { type: 'submit', className: 'dg-modal-send-btn send-email' },
    createEl('span', {}, 'Send'),
    createEl('span', { className: 'dg-modal-send-arrow', 'aria-hidden': 'true' }),
  );
  const closeBtn = createEl('button', { type: 'button', className: 'dg-modal-close-btn close', 'aria-label': 'Close' });

  const requiredNote = createEl('p', { className: 'dg-modal-required-note' }, 'All fields are required');

  const consentRow = createEl('label', { className: 'dg-modal-consent-row', for: 'Consent' },
    consentInput,
    createEl('div', { className: 'dg-modal-consent-content' },
      createEl('span', { className: 'dg-modal-consent-text' },
        createEl('span', { className: 'dg-modal-consent-paragraph' },
          'By submitting this form, I agree to receive email updates about migraine and migraine treatment with VYEPTI. I authorize Lundbeck, its affiliates, its employees, and its agents to use the information I am providing in order to enroll me in the email program.',
        ),
        createEl('span', { className: 'dg-modal-consent-paragraph' },
          'Lundbeck will not sell your provided data to any third party, at any time. By clicking "Send," you signify that you have read and agree to our ',
          createEl('a', {
            href: 'https://www.vyepti.com/terms-of-use',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'dg-modal-legal-link',
          }, 'Terms of Use'),
          ' and ',
          createEl('a', {
            href: 'https://www.vyepti.com/privacy-policy',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'dg-modal-legal-link',
          }, 'Privacy Policy'),
          '.',
        ),
      ),
      consentError,
    ),
  );

  // The email submit endpoint lives on the form as data-submit, read by the modal controller at submit time.
  const form = createEl('form', { id: 'emailForm', className: 'dg-modal-form', 'data-submit': EMAIL_SUBMIT_API_URL, novalidate: '' },
    requiredNote,
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'FirstName' }, 'First Name'),
      firstNameInput,
      firstNameError,
    ),
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'LastName' }, 'Last Name'),
      lastNameInput,
      lastNameError,
    ),
    createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: 'Email' }, 'Email address'),
      emailInput,
      emailError,
    ),
    consentRow,
    submitBtn,
  );

  const headerTitle = createEl('h2', { className: 'header-title dg-modal-title' }, 'Email me this information');
  const errorMsg = createEl('div', { className: 'error-message d-none' }, 'Something went wrong. Please try again.');
  const patientFormContainer = createEl('div', { className: 'patient-form-container' }, form);

  // Note: there is intentionally no "success" view built here. On a
  // successful submission the email modal simply closes itself and the
  // Thank You modal (built from the authored doctor-thankyou block, see
  // doctor-thankyou.js) opens in its place — see
  // doctor-discussion-email-modal.js's handleSubmit().
  const modalContent = createEl('div', { className: 'modal-content' },
    closeBtn, headerTitle, patientFormContainer, errorMsg,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: 'mq-modal', className: 'modal', tabindex: '-1' }, modalDialog);

  return {
    modal, form, closeBtn, submitBtn,
  };
}

// Builds the email modal 
function getOrCreateEmailModal(answers) {
  // Reuse the existing modal/controller across opens instead of rebuilding it each time.
  let modalEl = document.getElementById('mq-modal');
  if (modalEl) return modalEl.__dgController;

  const {
    modal, closeBtn, submitBtn,
  } = buildEmailModalMarkup();
  document.body.append(modal);

  const controller = createEmailModalController({
    modalId: 'mq-modal',
    formId: 'emailForm',
    quizData: answers,
  });

  closeBtn.addEventListener('click', () => controller.close());
  submitBtn.addEventListener('click', (e) => controller.handleSubmit(e));

  // Stash the controller on the element so subsequent calls can find it again.
  modal.__dgController = controller;
  return controller;
}

/**
 * Finds the separately-authored "doctor-thankyou" block anywhere on the
 * page, moves its content — exactly as authored, nothing hardcoded here —
 * into a modal appended to <body>, and removes the original placeholder
 * from the page flow so it never renders inline.
 *
 * This intentionally lives here in doctor-discussion.js/folder rather than
 * a blocks/doctor-thankyou/ module: the "doctor-thankyou" block's only job
 * is to supply content for this modal, so doctor-discussion.js just reaches
 * out and claims it. By the time this runs, EDS has already converted the
 * authored table into plain DOM for every block on the page (that happens
 * before any block's custom JS executes), so the content is there to grab.
 */
function buildThankYouModal() {
  const thankYouBlock = document.querySelector(THANKYOU_BLOCK_SELECTOR);
  if (!thankYouBlock || document.getElementById(THANKYOU_MODAL_ID)) return;

  const authoredContent = [...thankYouBlock.children];

  const closeBtn = createEl('button', {
    type: 'button', className: 'dg-thankyou-close-btn close', 'aria-label': 'Close',
  });
  const modalContent = createEl('div', { className: 'modal-content dg-thankyou-content' },
    closeBtn,
    ...authoredContent,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: THANKYOU_MODAL_ID, className: 'modal', tabindex: '-1' }, modalDialog);
  // Explicit initial hidden state -- don't rely solely on CSS defaults.
  modal.style.display = 'none';

  document.body.append(modal);
  // The authored placeholder's job is done once its content has been
  // moved into the modal; remove it so nothing renders in its original spot.
  thankYouBlock.remove();

  const controller = createThankYouModalController({ modalId: THANKYOU_MODAL_ID });
  closeBtn.addEventListener('click', () => controller.close());
  modal.__dgController = controller;
}

/**
 * Build the Download / Email action buttons, plus a hidden error message
 * for the PDF download controller to reveal on failure, and a hidden
 * "popup blocked" fallback link the controller reveals when the browser
 * blocks the auto-opened PDF tab (see doctor-discussion-download-pdf.js).
 */

function buildResultsActions() {
  const downloadBtn = createEl('button', { type: 'button', className: 'dg-results-download-btn' },
    createEl('span', {}, 'Download'),
    createEl('span', { className: 'dg-download-icon', 'aria-hidden': 'true' }),
  );
  const emailBtn = createEl('button', { type: 'button', className: 'dg-results-email-btn' },
    createEl('span', {}, 'Email'),
    createEl('span', { className: 'dg-email-icon', 'aria-hidden': 'true' }),
  );
  const pdfErrorMsg = createEl('p', {
    id: PDF_ERROR_ELEMENT_ID,
    className: 'dg-pdf-error-msg d-none',
    role: 'alert',
  }, 'Something went wrong generating your PDF. Please try again.');

  // Shown instead of a silent failure when the browser blocks the
  // auto-opened tab (e.g. Safari's "Block Pop-ups" setting). The anchor's
  // href/download attrs are set by the PDF controller once the blob is
  // ready; clicking it is a real user gesture, so it always works.
  const popupBlockedLink = createEl('a', {
    href: '#',
    className: 'dg-pdf-popup-blocked-link',
  }, 'Your PDF is ready — tap here to open it');
  const popupBlockedMsg = createEl('div', {
    id: PDF_POPUP_BLOCKED_ELEMENT_ID,
    className: 'dg-pdf-popup-blocked d-none',
    role: 'status',
  },
    createEl('p', { className: 'dg-pdf-popup-blocked-text' },
      "Your browser blocked the automatic download. Your PDF is ready — use the link below to open it:"),
    popupBlockedLink,
  );

  const wrapper = createEl('div', { className: 'dg-results-actions' },
    downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg);
  return {
    wrapper, downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg,
  };
}

// Build the closing "tips for your next appointment" callout, including the VYEPTI CONNECT link in the last bullet.

function buildResultsTips() {
  return createEl('div', { className: 'dg-results-tips' },
    createEl('p', { className: 'dg-results-tips-heading' },
      "You're ready to talk with your doctor about migraine. Here are some tips for your next appointment"),
    createEl('ul', { className: 'dg-results-tips-list' },
      createEl('li', {}, 'Bring a printout or email of this guide'),
      createEl('li', {}, 'Bring a list of your past and current medications'),
      createEl('li', {}, 'Consider tracking the frequency of your migraine attacks'),
      createEl('li', {},
        'If you and your doctor think VYEPTI may be right for you, ask about insurance coverage and ',
        createEl('a', {
          href: 'https://www.vyepti.com/financial-assistance',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'dg-results-vyepti-link',
        }, 'VYEPTI CONNECT®'),
      ),
    ),
  );
}

// Enforces "None of the above" as mutually exclusive with the other checkboxes in its group.
function bindExclusiveCheckboxGroup(form) {
  form.querySelectorAll('.dg-option-list:not(.dg-option-list--radio)').forEach((group) => {
    const inputs = [...group.querySelectorAll('.dg-option-input')];
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (input.dataset.exclusive === 'true' && input.checked) {
          inputs.forEach((other) => {
            if (other !== input) other.checked = false;
          });
        } else if (input.checked) {
          inputs.forEach((other) => {
            if (other.dataset.exclusive === 'true') other.checked = false;
          });
        }
      });
    });
  });
}

// Ensures only one radio option per group stays selected (native radio behavior, made explicit here).
function bindRadioGroup(form) {
  form.querySelectorAll('.dg-option-list--radio').forEach((group) => {
    const inputs = [...group.querySelectorAll('.dg-option-input[type="radio"]')];
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        inputs.forEach((other) => {
          if (other !== input) other.checked = false;
        });
      });
    });
  });
}

// Splits an authored comma-separated options cell into individual option objects.
function parseOptions(raw) {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => ({ text: entry }));
}

// Reads the authored EDS table rows and converts them into the steps/fields data structure the UI renders from.
function parseSteps(block) {
  const rows = [...block.children];
  let totalSteps = TOTAL_STEPS_DEFAULT;
  const steps = [];
  let current = null;
  let fieldIndex = 0;

  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent?.trim().toLowerCase();
    const rest = cells.slice(1).map((c) => c.textContent.trim());

    // Each row's first cell is a type key that determines how the rest of the row is parsed.
    switch (key) {
      case 'step-title':
        current = { title: rest[0] || '', fields: [] };
        steps.push(current);
        fieldIndex = 0;
        break;
      case 'step-number':
        // Explicit step-number rows are no longer required (steps are
        // numbered by their position), but keep parsing harmless if authored.
        break;
      case 'total-steps':
        totalSteps = Number(rest[0]) || totalSteps;
        break;
      case 'did-you-know':
        if (!current) {
          current = { title: '', fields: [] };
          steps.push(current);
        }
        // rest[0] (icon column) is intentionally ignored — the callout
        // icon is supplied entirely by CSS against `.dg-callout-icon` now.
        current.didYouKnow = {
          heading: rest[1] || 'DID YOU KNOW?',
          text: rest[2] || '',
        };
        break;
      case 'text-question':
        if (!current) {
          current = { title: '', fields: [] };
          steps.push(current);
        }
        current.fields.push({
          type: 'text',
          name: `dg-text-${steps.length}-${fieldIndex}`,
          label: rest[0] || '',
          helper: rest[1] ?? '',
          required: false,
        });
        fieldIndex += 1;
        break;
      case 'checkbox-question':
        if (!current) {
          current = { title: '', fields: [] };
          steps.push(current);
        }
        current.fields.push({
          type: 'checkbox',
          name: `dg-checkbox-${steps.length}-${fieldIndex}`,
          label: rest[0] || '',
          helper: rest[1] ?? '',
          description: rest[2] ?? '',
          options: rest[3] ? parseOptions(rest[3]) : [],
          required: true,
        });
        fieldIndex += 1;
        break;
      case 'radio-question':
        if (!current) {
          current = { title: '', fields: [] };
          steps.push(current);
        }
        current.fields.push({
          type: 'radio',
          name: `dg-radio-${steps.length}-${fieldIndex}`,
          label: rest[0] || '',
          helper: rest[1] ?? 'Select one',
          description: rest[2] ?? '',
          options: rest[3] ? parseOptions(rest[3]) : [],
          required: true,
        });
        fieldIndex += 1;
        break;
      default:
        break;
    }
  });

  return { steps, totalSteps: totalSteps || steps.length };
}

// Disables the Next/Finish button until every required checkbox/radio group on the step has a selection.
function updateNextState(form, step) {
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

function collectStepAnswers(form, step, answers) {
  step.fields.forEach((f) => {
    if (f.type === 'text') {
      const input = form.querySelector(`#${f.name}`);
      answers[f.name] = input ? input.value : '';
    } else if (f.type === 'checkbox') {
      const checked = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)]
        .map((el) => el.value);
      answers[f.name] = checked;
    } else if (f.type === 'radio') {
      const checked = form.querySelector(`input[name="${f.name}"]:checked`);
      answers[f.name] = checked ? checked.value : '';
    }
  });
}

// Fallback content used when the block is placed on a page with no authored table rows.
const DEFAULT_STEPS = [

  // Step 1 - code starts here
  {
    title: 'Start your Doctor Discussion Guide',
    fields: [
      { type: 'text', name: 'dg-name', label: 'My name is', helper: 'Optional', required: false },
      {
        type: 'checkbox',
        name: 'dg-activities',
        label: 'What types of activities or events are impacted by migraine?',
        helper: 'Select all that apply',
        description: "This might include events or activities you miss because of migraine or times that you participate but don't feel like yourself because of migraine.",
        options: [
          { text: 'Social events with friends/family' },
          { text: 'Work/school' },
          { text: 'Daily life/household activities' },
          { text: 'Exercise or being active' },
          { text: "I can't make plans" },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'For more than 90% of those affected, migraine interferes with education, career, or social activities.',
    },
  },

  // Step 2 - code starts here
  {
    title: 'How does living with migraine make you feel?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-feelings',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Defeated' },
          { text: 'Frustrated' },
          { text: 'On edge' },
          { text: 'Stuck' },
          { text: 'Desperate' },
          { text: 'Isolated' },
          { text: 'Not my best' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'Patients with migraine are at least 3 times more likely to suffer from insomnia, depression, or anxiety than those without migraine. Migraine sufferers also may have increased feelings of isolation.',
    },
  },

  // Step 3 - code starts here
  {
    title: 'How many days a month are "crystal clear" and not impacted by migraine in any way?',
    fields: [
      {
        type: 'radio',
        name: 'dg-clear-days',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: '0–5 days a month' },
          { text: '6–10 days a month' },
          { text: '11–15 days a month' },
          { text: '16–20 days a month' },
          { text: '21+ days a month' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: '77% of people in a survey of 1,100 people with migraine (who also had a mental health condition) worried about the stigma of migraine and mental health. In fact, many were hesitant to discuss the issue with their doctor.',
    },
  },

  // Step 4 - code starts here
  {
    title: 'In the last 3 months, have you been having more migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-more-attacks',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
  },

  // Step 5 - code starts here
  {
    title: 'In the last 3 months, have you been taking more medication to stop migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-more-medication',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'In one study, over 70% of patients reported that using a migraine diary helped communication with their doctor and increased their level of satisfaction with migraine treatment.',
    },
  },

  // Step 6 - code starts here
  {
    title: 'In the last 3 months, how have you tried to address migraine?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-treatments-tried',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Over-the-counter relief medication' },
          { text: 'Prescription relief medication' },
          { text: 'Preventive treatment medication' },
          { text: 'Medical devices' },
          { text: 'Changes in lifestyle, diet, or exercise' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'Migraine impacts 39 million people in the US, and one study showed that 97% take medication for relief.',
    },
  },

  // Step 7 - code starts here
  {
    title: 'Are you satisfied with your current preventive treatment?',
    fields: [
      {
        type: 'radio',
        name: 'dg-preventive-satisfaction',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
          { text: 'Not currently on a preventive treatment' },
        ],
        required: true,
      },
    ],
  },

  // Step 8 - code starts here
  {
    title: 'What are you hoping to find in a preventive migraine treatment?',
    fields: [
      {
        type: 'checkbox',
        name: 'dg-preventive-goals',
        label: '',
        helper: 'Select all that apply',
        description: '',
        options: [
          { text: 'Gives me more migraine-free days' },
          { text: 'Works fast and lasts between scheduled doses' },
          { text: 'Reduces the use of rescue medications' },
          { text: 'Provides results with fewer doses' },
          { text: 'None of the above' },
        ],
        required: true,
      },
    ],
  },

  // Step 9 - code starts here
  {
    title: 'Are you open to trying an IV infusion treatment given 4x/year to help prevent migraine attacks?',
    fields: [
      {
        type: 'radio',
        name: 'dg-iv-infusion',
        label: '',
        helper: 'Select one',
        description: '',
        options: [
          { text: 'Yes' },
          { text: 'No' },
          { text: 'Not sure' },
        ],
        required: true,
      },
    ],
    didYouKnow: {
      heading: 'DID YOU KNOW?',
      text: 'An IV infusion delivers 100% of the medication into your bloodstream, which means it is available to start working right away.',
    },
  },

];

// Common code continues here

// EDS entry point: parses the authored block and renders the multi-step guide into it.
export default function decorate(block) {
  const parsed = parseSteps(block);
  // Fall back to the default step content when nothing is authored in
  // the document. This is decorate()'s call, not parseSteps()'s — it
  // keeps parseSteps a pure parser with no knowledge of DEFAULT_STEPS.
  const steps = parsed.steps.length ? parsed.steps : DEFAULT_STEPS;
  const totalSteps = parsed.steps.length ? parsed.totalSteps : TOTAL_STEPS_DEFAULT;
  // Answers persist across steps (and survive Back navigation) in this single shared object.
  const answers = {};
  let currentIndex = 0;

  // The optional "My name is" text field on step 1 — used to personalize step 2's question on the results screen.
  const nameFieldDef = steps[0]?.fields.find((f) => f.type === 'text');
  const nameFieldName = nameFieldDef ? nameFieldDef.name : null;
  // Flag step 2's first checkbox/radio question so buildResultsList() prefixes it with the entered name.
  const step2NameableField = steps[1]?.fields.find((f) => f.type === 'checkbox' || f.type === 'radio');
  if (nameFieldName && step2NameableField) {
    step2NameableField.personalizeWithName = true;
  }

  // Clear authored content, rebuild as a proper multi-step form.
  block.textContent = '';
  const card = createEl('div', { className: 'dg-card' });
  block.append(card);

  // Renders a single step (header, fields, callout, nav buttons) into the card, replacing whatever was there before.
  function renderStep(index) {
    const step = steps[index];
    const stepNumber = index + 1;

    card.textContent = '';
    card.append(buildHeader(stepNumber, totalSteps, step.title));

    let calloutEl = null;
    if (step.didYouKnow) {
      calloutEl = buildDidYouKnow(step.didYouKnow);
    }

    const form = createEl('form', { className: 'dg-form', novalidate: '' });

    step.fields.forEach((fieldDef, i) => {
      const countLabel = i === 0 ? `${stepNumber} of ${totalSteps}` : '';
      if (fieldDef.type === 'text') {
        form.append(buildTextQuestion(fieldDef, countLabel, answers[fieldDef.name]));
      } else if (fieldDef.type === 'checkbox') {
        form.append(buildCheckboxQuestion(fieldDef, countLabel, answers[fieldDef.name], stepNumber));
      } else if (fieldDef.type === 'radio') {
        form.append(buildRadioQuestion(fieldDef, countLabel, answers[fieldDef.name], stepNumber));
      }
    });

    // Back button only appears after the first step.
    const actionChildren = [];
    if (index > 0) {
      const backBtn = createEl('button', { type: 'button', className: 'dg-back-btn' },
        createEl('span', { className: 'dg-back-arrow', 'aria-hidden': 'true' }),
        createEl('span', {}, 'Back'),
      );
      backBtn.addEventListener('click', () => {
        collectStepAnswers(form, step, answers);
        currentIndex -= 1;
        renderStep(currentIndex);
        block.dispatchEvent(new CustomEvent('dg:back', { bubbles: true, detail: { stepIndex: currentIndex } }));
      });
      actionChildren.push(backBtn);
    }

    // Final step's submit button reads "Finish" instead of "Next".
    const isLastStep = index === steps.length - 1;
    const nextBtn = createEl('button', { type: 'submit', className: 'dg-next-btn' },
      createEl('span', {}, isLastStep ? 'Finish' : 'Next'),
      createEl('span', { className: 'dg-next-arrow', 'aria-hidden': 'true' }),
    );
    actionChildren.push(nextBtn);

    form.append(createEl('div', { className: 'dg-actions' }, ...actionChildren));

    // Shows the "DID YOU KNOW?" callout only once the user has answered this step's question.
    function updateCalloutVisibility() {
      if (!calloutEl) return;
      const anySelected = step.fields.some((f) => {
        if (f.type !== 'checkbox' && f.type !== 'radio') return false;
        return form.querySelectorAll(`input[name="${f.name}"]:checked`).length > 0;
      });
      calloutEl.hidden = !anySelected;
    }

    bindExclusiveCheckboxGroup(form);
    bindRadioGroup(form);
    updateNextState(form, step);
    updateCalloutVisibility();
    form.addEventListener('change', () => {
      updateNextState(form, step);
      updateCalloutVisibility();
    });
    form.addEventListener('input', () => updateNextState(form, step));

    // Advances to the next step, or shows results if this was the last one.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (nextBtn.disabled) return;

      collectStepAnswers(form, step, answers);

      if (currentIndex < steps.length - 1) {
        currentIndex += 1;
        renderStep(currentIndex);
        block.dispatchEvent(new CustomEvent('dg:next', {
          bubbles: true,
          detail: { stepIndex: currentIndex, answers },
        }));
      } else {
        block.dispatchEvent(new CustomEvent('dg:complete', { bubbles: true, detail: { answers } }));
        renderResults();
      }
    });

    card.append(form);
    if (calloutEl) {
      card.append(calloutEl);
    }
  }

  // Renders the final results screen: answer summary plus Download/Email/Retake actions.
  function renderResults() {
    card.textContent = '';
    card.classList.add('dg-results-card');
    card.append(buildResultsHeader());

    const body = createEl('div', { className: 'dg-results-body' });
    body.append(createEl('h2', { className: 'dg-results-title' }, formatResultsHeading(answers, nameFieldName)));
    body.append(buildResultsList(steps, answers, nameFieldName));
    body.append(createEl('p', { className: 'dg-results-download-label' }, 'Download or email doctor discussion guide.'));

    const {
      wrapper: actionsWrapper, downloadBtn, emailBtn,
    } = buildResultsActions();

    const pdfController = createPdfDownloadController({
      apiUrl: PDF_DOWNLOAD_API_URL,
      button: downloadBtn,
      errorElementId: PDF_ERROR_ELEMENT_ID,
      popupBlockedElementId: PDF_POPUP_BLOCKED_ELEMENT_ID,
    });

    downloadBtn.addEventListener('click', () => pdfController.download(answers));
    emailBtn.addEventListener('click', () => {
      const emailModal = getOrCreateEmailModal(answers);
      emailModal.open();
    });
    body.append(actionsWrapper);

    body.append(createEl('p', { className: 'dg-results-note' },
      'Note: if you navigate away from this screen before downloading, you will lose your results.'));

    body.append(createEl('hr', { className: 'dg-results-divider' }));
    body.append(createEl('h3', { className: 'dg-results-cta-heading' }, 'Talk to your doctor and see if VYEPTI might be right for you'));

    // Wipes all stored answers and restarts the guide from Step 1.
    const retakeBtn = createEl('button', { type: 'button', className: 'dg-results-retake-btn' },
      createEl('span', {}, 'Retake'),
      createEl('span', { className: 'dg-retake-icon', 'aria-hidden': 'true' }),
    );
    retakeBtn.addEventListener('click', () => {
      Object.keys(answers).forEach((key) => delete answers[key]);
      currentIndex = 0;
      card.classList.remove('dg-results-card');
      renderStep(currentIndex);
      block.dispatchEvent(new CustomEvent('dg:retake', { bubbles: true }));
    });
    body.append(retakeBtn);

    body.append(createEl('hr', { className: 'dg-results-divider' }));
    body.append(buildResultsTips());

    card.append(body);
  }

  // Kick off the guide at step 1, then wire up the (separately authored) Thank You modal.
  renderStep(currentIndex);
  buildThankYouModal();
}