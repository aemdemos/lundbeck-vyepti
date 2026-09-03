import { createEl } from './doctor-discussion-utils.js';

// Build the header bar with step number, title and progress dots.
export function buildHeader(stepNumber, totalSteps, title) {
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

// Build a free-text question field.
export function buildTextQuestion(fieldDef, countLabel, savedValue, stepNumber) {
  const { name, label, helper } = fieldDef;
  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-text` });

  const labelRowChildren = [createEl('label', { className: 'dg-field-label', for: name }, label)];
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
 * Build the visual control (the fake checkbox/radio square/circle).
 * @param {'checkbox'|'radio'} inputType
 */
export function buildOptionControl(inputType) {
  return createEl('span', { className: `dg-option-control dg-option-control--${inputType}` });
}

/**
 * Builds an option's leading icon: an authored icon URL (option.icon)
 * renders as an <img>; else falls back to legacy CSS icons for Step 1 only.
 *
 * @param {number} stepNumber 1-based step number the option belongs to.
 * @param {number} optionIndex 0-based index of the option within its field.
 * @param {string|null} [icon] Authored icon URL for this option, if any.
 * @returns {HTMLElement|null}
 */
export function buildOptionIcon(stepNumber, optionIndex, icon = null) {
  if (icon) {
    return createEl('img', { className: 'dg-option-icon', src: icon, alt: '' });
  }
  // Legacy fallback is only used for Step 1's un-authored options.
  if (stepNumber !== 1) return null;
  return createEl('span', {
    className: `dg-option-icon dg-step1-icon${optionIndex + 1}`,
    'aria-hidden': 'true',
  });
}

// Build a "select all that apply" checkbox field.
export function buildCheckboxQuestion(fieldDef, countLabel, savedValues, stepNumber) {
  const {
    name, label, helper, description, options,
  } = fieldDef;
  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-checkbox` });

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

  options.forEach(({ text, icon }, index) => {
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
      buildOptionIcon(stepNumber, index, icon),
      createEl('span', { className: 'dg-option-text' }, text),
      input,
      buildOptionControl(isExclusive ? 'radio' : 'checkbox'),
    );

    optionList.append(optionLabel);
  });

  field.append(optionList);
  return field;
}

// Build a "select one" radio field.
export function buildRadioQuestion(fieldDef, countLabel, savedValue, stepNumber) {
  const {
    name, label, helper, description, options,
  } = fieldDef;
  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-checkbox dg-field-radio` });

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

  options.forEach(({ text, icon }, index) => {
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
      buildOptionIcon(stepNumber, index, icon),
      createEl('span', { className: 'dg-option-text' }, text),
      input,
      buildOptionControl('radio'),
    );

    optionList.append(optionLabel);
  });

  field.append(optionList);
  return field;
}

// Build the "DID YOU KNOW?" callout. Starts hidden; the caller reveals it
// once the user answers the step's question (see updateCalloutVisibility in decorate.js).
export function buildDidYouKnow(fieldDef) {
  const { heading, text } = fieldDef;
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