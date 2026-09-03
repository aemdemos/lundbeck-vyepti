// ---------------------------------------------------------------------------
// Doctor Discussion — authorable Email Modal content
// ---------------------------------------------------------------------------

export const DEFAULT_EMAIL_MODAL_CONFIG = {
  title: 'Email me this information',
  requiredNote: 'All fields are required',
  firstNameLabel: 'First Name',
  lastNameLabel: 'Last Name',
  emailLabel: 'Email address',
  consentParagraphs: [
    'By submitting this form, I agree to receive email updates about migraine and migraine treatment with VYEPTI. '
      + 'I authorize Lundbeck, its affiliates, its employees, and its agents to use the information I am providing in order to enroll me in the email program.',
    'Lundbeck will not sell your provided data to any third party, at any time. By clicking "Send," you signify that you have read and agree to our '
      + '[Terms of Use](https://www.lundbeck.com/us/terms-of-use) and [Privacy Policy](https://www.lundbeck.com/us/privacy-policy).',
  ],
  sendLabel: 'Send',
  errors: {
    firstNameEmpty: 'Please enter your first name',
    firstNameInvalid: 'Please enter a valid first name',
    lastNameEmpty: 'Please enter your last name',
    lastNameInvalid: 'Please enter a valid last name',
    emailEmpty: 'Please enter your email address',
    emailInvalid: 'Please enter a valid email address',
    consent: 'Please check the box',
    generic: 'Something went wrong. Please try again.',
  },
};

// Name -> setter writing that row's Label onto a known config field
// (heading/plaintext rows, identified by Name only). Whitelists writes to
// literal properties instead of config[dynamicKey].
const SIMPLE_FIELD_SETTERS = new Map([
  ['modal-title', (config, label) => { config.title = label; }],
  ['required-note', (config, label) => { config.requiredNote = label; }],
]);

// Name -> setter writing Label ("empty" message) and, if present,
// Placeholder ("invalid" message) onto config.errors. Some rows ignore Placeholder.
const ERROR_FIELD_SETTERS = new Map([
  ['firstname-error', (errors, label, placeholder) => {
    errors.firstNameEmpty = label;
    if (placeholder) errors.firstNameInvalid = placeholder;
  }],
  ['lastname-error', (errors, label, placeholder) => {
    errors.lastNameEmpty = label;
    if (placeholder) errors.lastNameInvalid = placeholder;
  }],
  ['email-error', (errors, label, placeholder) => {
    errors.emailEmpty = label;
    if (placeholder) errors.emailInvalid = placeholder;
  }],
  ['consent-error', (errors, label) => { errors.consent = label; }],
  ['generic-error', (errors, label) => { errors.generic = label; }],
]);

// Name (lowercased) -> setter that writes that row's Label onto the right
// real field's on-screen Label, for 'text' rows.
const FIELD_LABEL_SETTERS = new Map([
  ['firstname', (config, label) => { config.firstNameLabel = label; }],
  ['lastname', (config, label) => { config.lastNameLabel = label; }],
  ['email', (config, label) => { config.emailLabel = label; }],
]);

/**
 * Parses "email-modal" rows into a config object, falling back field-by-
 * field to defaults. Unrecognized rows are silently ignored, not errored.
 *
 * @param {Array<Object>} rows - raw sheet rows (Type/Name/Label/Placeholder columns).
 * @returns {Object} config in the same shape as DEFAULT_EMAIL_MODAL_CONFIG
 */
export function parseEmailModalRows(rows) {
  const config = {
    ...DEFAULT_EMAIL_MODAL_CONFIG,
    errors: { ...DEFAULT_EMAIL_MODAL_CONFIG.errors },
  };
  const consentParagraphs = [];

  (rows || []).forEach((row) => {
    const type = (row.Type || '').trim().toLowerCase();
    const nameKey = (row.Name || '').trim().toLowerCase();
    const label = (row.Label || '').trim();
    const placeholder = (row.Placeholder || '').trim();
    if (!label) return;

    if (type === 'button' && nameKey === 'send') {
      config.sendLabel = label;
      return;
    }

    if (type === 'text' && FIELD_LABEL_SETTERS.has(nameKey)) {
      FIELD_LABEL_SETTERS.get(nameKey)(config, label);
      return;
    }

    if (type === 'checkbox' && nameKey === 'consent') {
      consentParagraphs.push(label); // 1st consent paragraph
      return;
    }

    if (SIMPLE_FIELD_SETTERS.has(nameKey)) {
      SIMPLE_FIELD_SETTERS.get(nameKey)(config, label);
      return;
    }

    if (ERROR_FIELD_SETTERS.has(nameKey)) {
      ERROR_FIELD_SETTERS.get(nameKey)(config.errors, label, placeholder);
      return;
    }

    if (nameKey.startsWith('consent-paragraph')) {
      consentParagraphs.push(label);
    }
  });

  config.consentParagraphs = consentParagraphs.length
    ? consentParagraphs
    : DEFAULT_EMAIL_MODAL_CONFIG.consentParagraphs;

  return config;
}