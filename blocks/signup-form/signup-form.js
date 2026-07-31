// Google API Key link
function loadGooglePlacesApi(apiKey, callback) {
  
  if (window.google?.maps?.places?.Autocomplete) {
    
  callback();
  return;
}


  const script = document.createElement('script');
  script.src =
  `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
  script.async = true;
  script.defer = true;

  script.onload = () => {
  if (window.google?.maps?.places?.Autocomplete) {
    callback();
  } else {
    console.error(
      'Google Places library failed to load. Check your API key and requested libraries.'
    );
  }
};

script.onerror = () => {
  console.error('Failed to load Google Maps API.');
};

  document.head.appendChild(script);
}




/* EDITABLE ERROR / VALIDATION MESSAGES */
const DEFAULT_MESSAGES = {
  toggleRequired: 'Please choose Yes or No',
  dob: {
    required: 'Please enter your date of birth',
    format: 'Please enter date in MM/DD/YYYY format (eg, 05/05/2000)',
    invalidDate: 'Please enter a valid calendar date',
    underage: 'You must be 18 years or older to register',
  },
  date: {
    format: 'Please enter date in MM/DD/YYYY format (eg, 05/05/2000)',
    invalidDate: 'Please enter a valid calendar date',
  },
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid 10-digit phone number',
  consent: 'Your agreement is required in order to submit',
  
 address1: 'Please enter your address',
  state: 'Please select your state',
  invalidAddress: 'We couldn\'t verify that address. Please select an address from the suggestions list.',
  server: 'Something went wrong submitting your information. Please try again.',

};

/**
 * Error message for invalid fields
 * @param {string} id 
 * @returns {Element} 
 */
function createErrorMessage(id) {
  const p = document.createElement('p');
  p.className = 'field-error';
  p.id = `${id}-error`;
  p.hidden = true;
  return p;
}

/**
 * Puts a field into its error state:
 * @param {Element} field 
 * @param {Element} errorEl 
 * @param {string} message 
 */
function showFieldError(field, errorEl, message) {
  field.classList.add('error');
  field.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    field.setAttribute('aria-describedby', errorEl.id);
  }
}

/**
 * Clears a field's error
 * @param {Element} field 
 * @param {Element} errorEl 
 */
function clearFieldError(field, errorEl) {
  field.classList.remove('error');
  field.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
}


/* REVEAL / COLLAPSE ANIMATION */
const REVEAL_DURATION_MS = 600;
const REVEAL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function buildRevealTransition(durationMs) {
  // Opacity finishes a bit before max-height so the fade doesn't look like
  // it's dragging behind the height change.
  const opacityMs = Math.round(durationMs * 0.7);
  return `max-height ${durationMs}ms ${REVEAL_EASING}, opacity ${opacityMs}ms ease-out`;
}


/* Animates an element open with a "slide down" effect */
function slideDown(el, durationMs = REVEAL_DURATION_MS) {
  el.style.transition = 'none';
  el.style.display = 'block';
  el.classList.add('visible');
  el.style.overflow = 'hidden';
  el.style.maxHeight = '0px';
  el.style.opacity = '0';

  void el.offsetHeight;

  const targetHeight = el.scrollHeight;
  el.style.transition = buildRevealTransition(durationMs);
  el.style.maxHeight = `${targetHeight}px`;
  el.style.opacity = '1';

  const onEnd = (e) => {
    if (e.target !== el || e.propertyName !== 'max-height') return;
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.removeEventListener('transitionend', onEnd);
  };
  el.addEventListener('transitionend', onEnd);
}

/**
 * Animates an element closed with a "slide up" effect,
 */
function slideUp(el, onComplete, durationMs = REVEAL_DURATION_MS) {
  const startHeight = el.scrollHeight;
  el.style.transition = 'none';
  el.style.overflow = 'hidden';
  el.style.maxHeight = `${startHeight}px`;

  void el.offsetHeight; 

  el.style.transition = buildRevealTransition(durationMs);
  el.style.maxHeight = '0px';
  el.style.opacity = '0';

  const onEnd = (e) => {
  if (e.target !== el || e.propertyName !== 'max-height') return;


  if (el.dataset.replaying === 'cancelled') {
    el.dataset.replaying = '';
    el.removeEventListener('transitionend', onEnd);
    return;
  }
    el.style.display = 'none';
    el.classList.remove('visible');
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.opacity = '';
    el.style.transition = '';
    el.removeEventListener('transitionend', onEnd);
    if (onComplete) onComplete();
  };
  el.addEventListener('transitionend', onEnd);
}

/**
 * Plays the visible "dropdown replay" — collapses, optionally swaps
 * contents while fully hidden, then reopens.
 * @param {Element} el
 * @param {Function} [beforeReopen] - runs once the element is fully
 *   collapsed, e.g. to swap which conditional pieces are visible so the
 *   reopen height reflects the NEW state instead of flashing the old one
 */
function replayDropdown(el, beforeReopen) {
  if (!el) return;
  const halfDuration = REVEAL_DURATION_MS / 2;

  if (el.dataset.replaying === 'true') {
    el.dataset.replaying = 'cancelled';
  }
  el.dataset.replaying = 'true';

  slideUp(el, () => {
    if (el.dataset.replaying === 'cancelled') {
      el.dataset.replaying = '';
      return;
    }
    if (beforeReopen) beforeReopen(); // content swap happens here, while el is invisible at 0 height
    slideDown(el, halfDuration);
    el.dataset.replaying = '';
  }, halfDuration);
}

/**
 * Resets everything inside a conditional field/container: unchecks
 */
function resetConditionalFieldContents(el) {
  if (!el) return;

  
  el.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.checked = false;
  });

 
  el.querySelectorAll('input[type="text"], input[type="date"]').forEach((input) => {
    input.value = '';
    input.disabled = false;
    clearFieldError(input, input.errorEl);
  });

  
  el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });

 
  el.querySelectorAll('.toggle-group').forEach((group) => {
    if (group.errorEl) clearFieldError(group, group.errorEl);
  });

 
  el.querySelectorAll('.date-field-group, .conditional-container').forEach((nested) => {
    nested.style.display = 'none';
    nested.classList.remove('visible');
  });
}

/**
 * Hides a conditional field/container 
 */
function hideConditionalField(el) {
  if (!el) return;

  const isCurrentlyVisible = el.style.display === 'block' || el.classList.contains('visible');
  if (!isCurrentlyVisible) {
    el.style.display = 'none';
    el.classList.remove('visible');
    resetConditionalFieldContents(el);
    return;
  }

  slideUp(el, () => resetConditionalFieldContents(el));
}

/**
 * Creates a Yes/No toggle question. Each answer can independently reveal one
 */
function createToggle(
  name,
  label,
  branches = {},
  required = true,
  errorMessage = DEFAULT_MESSAGES.toggleRequired,
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'toggle-group';

  const legend = document.createElement('p');
  legend.className = 'toggle-legend';
  legend.textContent = label;
  wrapper.append(legend);

  const options = document.createElement('div');
  options.className = 'toggle-options';

  const errorEl = required ? createErrorMessage(name) : null;

  const validate = () => {
    if (!required) return true;
    const checked = options.querySelector('input[type="radio"]:checked');
    if (!checked) {
      showFieldError(wrapper, errorEl, errorMessage);
      return false;
    }
    clearFieldError(wrapper, errorEl);
    return true;
  };

  ['Yes', 'No'].forEach((val) => {
    const id = `${name}-${val.toLowerCase()}`;
    const optWrap = document.createElement('label');
    optWrap.className = 'toggle-option';
    optWrap.setAttribute('for', id);

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.id = id;
    input.value = val.toLowerCase();

    const span = document.createElement('span');
    span.textContent = val;

    optWrap.append(input, span);
    options.append(optWrap);

    
    input.addEventListener('change', () => {
      Object.entries(branches).forEach(([branchValue, target]) => {
        const els = Array.isArray(target) ? target : [target];
        els.forEach((el) => {
          if (!el) return;
          if (branchValue === input.value) {
            slideDown(el);
          } else {
            hideConditionalField(el);
          }
        });
      });
      validate();
    });
  });

  wrapper.append(options);
  if (errorEl) wrapper.append(errorEl);
  wrapper.validate = validate;
  wrapper.errorEl = errorEl;
  return wrapper;
}

// Single shared backdrop element 
let popoverBackdrop = null;
function getPopoverBackdrop() {
  if (!popoverBackdrop) {
    popoverBackdrop = document.createElement('div');
    popoverBackdrop.className = 'form-field-popover-backdrop';
    popoverBackdrop.hidden = true;
    popoverBackdrop.addEventListener('click', closeAllPopovers);
    document.body.append(popoverBackdrop);
  }
  return popoverBackdrop;
}


function closeAllPopovers() {
  document.querySelectorAll('.form-field-popover').forEach((p) => {
    p.hidden = true;
    p.parentElement.querySelector('.form-field-info-btn')?.setAttribute('aria-expanded', 'false');
  });
  if (popoverBackdrop) popoverBackdrop.hidden = true;
}

/**
 * Positions an open popover directly above
 */
function positionPopover(popover, anchorButton) {
  const gap = 14; // space between icon and popover, matches the old CSS bottom offset
  const viewportMargin = 8; // never let the popover touch the very top edge
  const arrowEdgeMargin = 20; // min distance from either popover edge, so the ~20px-wide arrow never clips

  const iconRect = anchorButton.getBoundingClientRect();
const popoverRect = popover.getBoundingClientRect();

const canFitAbove =
  iconRect.top > (popoverRect.height + gap + viewportMargin);

let top;

if (canFitAbove) {
 
  top = iconRect.top - popoverRect.height - gap;
  popover.classList.remove('popover-below');
  popover.classList.add('popover-above');
} else {
  // Show below icon
  top = iconRect.bottom + gap;
  popover.classList.remove('popover-above');
  popover.classList.add('popover-below');
}

popover.style.top = `${top}px`;

  
  const iconCenterX = iconRect.left + iconRect.width / 2;
  const arrowLeft = iconCenterX - popoverRect.left;
  const clampedArrowLeft = Math.min(
    Math.max(arrowLeft, arrowEdgeMargin),
    popoverRect.width - arrowEdgeMargin,
  );
  popover.style.setProperty('--arrow-left', `${clampedArrowLeft}px`);
}

// Re-run positionPopover() for whichever popover is currently open if the

function repositionOpenPopover() {
  console.log('scrolling');
  const openPopover = document.querySelector('.form-field-popover:not([hidden])');
  if (openPopover && openPopover.anchorButton) {
    positionPopover(openPopover, openPopover.anchorButton);
  }
}
window.addEventListener('resize', repositionOpenPopover);
window.addEventListener('scroll', repositionOpenPopover, true);

/**
 * Creates a clickable "i" info icon 
 */
function createInfoIcon(text) {
  const wrapper = document.createElement('span');
  wrapper.className = 'form-field-info';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'form-field-info-btn';
  button.setAttribute('aria-label', 'More information');
  button.setAttribute('aria-expanded', 'false');
  button.append(document.createElement('span'));  /* Info icon */

  const popover = document.createElement('div');
  popover.className = 'form-field-popover';
  popover.setAttribute('role', 'dialog');
  popover.hidden = true;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'form-field-popover-close';
  closeBtn.setAttribute('aria-label', 'Close');

  const popoverText = document.createElement('p');
  popoverText.className = 'form-field-popover-text';
  popoverText.textContent = text;

  popover.append(closeBtn, popoverText);
  wrapper.append(button, popover);

  
  popover.anchorButton = button;

  const open = () => {
    
    closeAllPopovers();
    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    getPopoverBackdrop().hidden = false;
    requestAnimationFrame(() => positionPopover(popover, button));
  };

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popover.hidden) open(); else closeAllPopovers();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllPopovers();
  });

  return wrapper;
}


document.addEventListener('click', (e) => {
  document.querySelectorAll('.form-field-popover').forEach((p) => {
    if (!p.hidden && !p.parentElement.contains(e.target)) {
      closeAllPopovers();
    }
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeAllPopovers();
});


/**
 * Creates a standard text input field with a label above it
 */
function createTextField(
  name,
  label,
  type = 'text',
  required = true,
  optional = false,
  tooltip = null,
  requiredMessage = null,
  maxLength = null,
  formatMessage = null,
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelRow = document.createElement('div');
  labelRow.className = 'form-field-label-row';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', name);
  labelEl.textContent = optional ? `${label} (optional)` : label;
  labelRow.append(labelEl);

  if (tooltip) {
    labelRow.append(createInfoIcon(tooltip));
  }

  const input = document.createElement('input');
  input.type = type === 'tel' ? 'text' : type; 
  input.name = name;
  input.id = name;

  if (maxLength) {
    input.maxLength = maxLength;
  }

  if (type === 'tel') {
    input.placeholder = '_ _ _ - _ _ _ - _ _ _ _';
    input.inputMode = 'numeric'; 
    attachPhoneMask(input);
  }

  const errorEl = createErrorMessage(name);
  const missingMessage = requiredMessage || `Please enter your ${label.toLowerCase()}`;
  const defaultFormatMessage = type === 'email' ? DEFAULT_MESSAGES.email : DEFAULT_MESSAGES.phone;
  const invalidFormatMessage = formatMessage || defaultFormatMessage;
  let touched = false;

  
  const validate = () => {
    const value = input.value.trim();

    if (required && !value) {
      showFieldError(input, errorEl, missingMessage);
      return false;
    }

    if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showFieldError(input, errorEl, invalidFormatMessage);
      return false;
    }

    if (type === 'tel' && value && value.replace(/\D/g, '').length !== 10) {
      showFieldError(input, errorEl, invalidFormatMessage);
      return false;
    }

    clearFieldError(input, errorEl);
    return true;
  };

  // Errors are only shown once the person has actually typed in this field
  input.addEventListener('blur', () => {
    if (touched) validate();
  });
  input.addEventListener('input', () => {
    touched = true;
    if (!errorEl.hidden) validate();
  });
  input.validate = validate;
  input.errorEl = errorEl;

  wrapper.append(labelRow, input, errorEl);
  return wrapper;
}

/**
 * Creates a dropdown select field with a label above it
 */
function createSelectField(name, label, options, requiredMessage = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelRow = document.createElement('div');
  labelRow.className = 'form-field-label-row';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', name);
  labelEl.textContent = label;
  labelRow.append(labelEl);

  

  // Wraps the select + arrow icon so the arrow can be positioned relative
  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'select-wrapper';
  selectWrapper.id = `${name}-wrapper`;

  const select = document.createElement('select');
  select.name = name;
  select.id = name;

  const placeholderOpt = document.createElement('option');
  placeholderOpt.value = '';
  placeholderOpt.selected = true;
  placeholderOpt.disabled = true;
  select.append(placeholderOpt);

  options.forEach((opt) => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.text;
    select.append(o);
  });

  // Real DOM element, not a CSS background-image — see function comment.
  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = ''; // select arrow
  selectWrapper.append(select, arrow);

  const errorEl = createErrorMessage(name);
  const missingMessage = requiredMessage || `Please select a ${label.toLowerCase()}`;
  let touched = false;

  const validate = () => {
    if (!select.value) {
      showFieldError(select, errorEl, missingMessage);
      return false;
    }
    clearFieldError(select, errorEl);
    return true;
  };

 
  select.addEventListener('change', () => {
    touched = true;
    validate();
  });
  select.addEventListener('blur', () => {
    if (touched) validate();
  });
  select.validate = validate;
  select.errorEl = errorEl;

  wrapper.append(labelRow, selectWrapper, errorEl);
  return wrapper;
}

/* Checks whether a string matches the MM/DD/YYYY */
function matchesDatePattern(dateStr) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
}

/* Validates a date string as MM/DD/YYYY with proper date ranges */
function isValidDateFormat(dateStr) {
  if (!matchesDatePattern(dateStr)) return false;

  const [month, day, year] = dateStr.split('/');
  const dateObj = new Date(
  parseInt(year, 10),
  parseInt(month, 10) - 1,
  parseInt(day, 10)
);

  if (Number.isNaN(dateObj.getTime())) return false;
  if (dateObj.getMonth() + 1 !== parseInt(month, 10)) return false;
  if (dateObj.getDate() !== parseInt(day, 10)) return false;

  return true;
}

/* Attaches "numbers only, max 10 digits" */
function attachPhoneMask(input) {
  input.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // strip everything but digits
    value = value.slice(0, 10); // cap at 10 digits

    if (value.length > 6) {
      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    e.target.value = value;
  });
}

/* Attaches "numbers only, auto-formatted as MM/DD/YYYY" */
function attachDateMask(input) {
  input.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // strip everything but digits
    if (value.length >= 5) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
    } else if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    e.target.value = value;
  });
}

/* Creates the "Date of birth" field: MM/DD/YYYY masked input */
function createDobField(messages = {}) {
  const msg = { ...DEFAULT_MESSAGES.dob, ...messages };

  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelRow = document.createElement('div');
  labelRow.className = 'form-field-label-row';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', 'dob');
  labelEl.textContent = 'Date of birth';

  const infoIcon = createInfoIcon(
    'Providing this information helps make sure you get useful information '
      + 'during your migraine treatment experience.',
  );

  const hint = document.createElement('span');
  hint.className = 'form-field-hint';
  hint.textContent = 'Must be 18+ years old to register';

  labelRow.append(labelEl, infoIcon, hint);

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'dob';
  input.id = 'dob';
  input.placeholder = 'MM/DD/YYYY';
  input.inputMode = 'numeric';

  attachDateMask(input);

  const errorEl = createErrorMessage('dob');
  let touched = false;


  const validate = () => {
    const value = input.value.trim();

    if (!value) {
      showFieldError(input, errorEl, msg.required);
      return false;
    }

    if (!matchesDatePattern(value)) {
      showFieldError(input, errorEl, msg.format);
      return false;
    }

    if (!isValidDateFormat(value)) {
      showFieldError(input, errorEl, msg.invalidDate);
      return false;
    }

    // Must be at least 18 years old to register
    const [month, day, year] = value.split('/').map(Number);
    const dob = new Date(year, month - 1, day);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    if (dob > eighteenYearsAgo) {
      showFieldError(input, errorEl, msg.underage);
      return false;
    }

    clearFieldError(input, errorEl);
    return true;
  };

 
  input.addEventListener('blur', () => {
    if (!touched) return;
    validate();
  });
  input.addEventListener('input', () => {
    touched = true;
    if (!errorEl.hidden) validate();
  });
  input.validate = validate;
  input.errorEl = errorEl;

  wrapper.append(labelRow, input, errorEl);
  return wrapper;
}

/* Creates a date field with MM/DD/YYYY masking/validation and a"Not scheduled" checkbox */
function createDateField(name, label, messages = {}) {
  const msg = {
    required: 'Please enter a valid calendar date',
    ...DEFAULT_MESSAGES.date,
    ...messages,
  };

  const wrapper = document.createElement('div');
  wrapper.className = 'date-field-group';
  wrapper.style.display = 'none'; 

  const dateFieldWrapper = document.createElement('div');
  dateFieldWrapper.className = 'form-field';

  const dateLabel = document.createElement('label');
  dateLabel.className = 'date-field-label';
  dateLabel.setAttribute('for', name);
  dateLabel.textContent = label;

  const dateInput = document.createElement('input');
  dateInput.type = 'text';
  dateInput.name = name;
  dateInput.id = name;
  dateInput.placeholder = 'MM/DD/YYYY';
  dateInput.pattern = '\\d{2}/\\d{2}/\\d{4}';
  dateInput.inputMode = 'numeric'; 

  attachDateMask(dateInput);

  const errorEl = createErrorMessage(name);
  const checkboxErrorEl = createErrorMessage(`${name}-checkbox`);
  // dateFieldWrapper.append(dateLabel, dateInput, errorEl);
  let touched = false;
  let checkboxErrorShown = false;

  const validate = () => {
    if (dateInput.disabled) {
      clearFieldError(dateInput, errorEl);
      return true;
    }

    const value = dateInput.value.trim();

    checkboxErrorEl.hidden = true;

    if (!value && !checkbox.checked && !touched) {
  checkboxErrorShown = true;

  checkboxErrorEl.hidden = false;

  checkboxErrorEl.textContent =
    name === 'first-infusion-date'
      ? 'Please enter infusion date or select "Not scheduled"'
      : 'Please enter appointment date or select "Not scheduled"';

  return false;
}

if (!value && touched) {
  showFieldError(dateInput, errorEl, msg.format);
  return false;
}

    if (!matchesDatePattern(value)) {
      showFieldError(dateInput, errorEl, msg.format);
      return false;
    }

    if (!isValidDateFormat(value)) {
      showFieldError(dateInput, errorEl, msg.invalidDate);
      return false;
    }

    clearFieldError(dateInput, errorEl);
    return true;
  };

 
  dateInput.addEventListener('blur', () => {
    if (!touched) return;
    validate();
  });

  dateInput.addEventListener('input', () => {
  touched = true;

  checkboxErrorEl.hidden = true;

  validate();
});

  dateInput.validate = validate;
  dateInput.errorEl = errorEl;

  dateFieldWrapper.append(dateLabel, dateInput, errorEl);

  const checkboxWrapper = document.createElement('div');
  checkboxWrapper.className = 'date-not-scheduled-wrapper';

  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'date-not-scheduled-label';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = `${name}-not-scheduled`;
  checkbox.id = `${name}-not-scheduled`;

  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      
      dateInput.disabled = true;
      dateInput.value = '';
      checkboxErrorEl.hidden = true;
      clearFieldError(dateInput, errorEl);
    } else {
      dateInput.disabled = false;
    }
  });

  const checkboxText = document.createElement('span');
  checkboxText.textContent = 'Not scheduled';

  checkboxLabel.append(checkbox, checkboxText);
  checkboxWrapper.append(checkboxLabel);

  wrapper.append(
  dateFieldWrapper,
  checkboxWrapper,
  checkboxErrorEl,
);
  return wrapper;
}

/* Builds the complete signup form with all fields, conditional logic, and validation wiring. */
function buildForm(apiEndpoint) {
  const form = document.createElement('form');
  form.className = 'signup-form-fields';
  form.noValidate = true; // we render our own error messages instead of native browser ones

  const nextDoctorAppointmentField = createDateField(
    'next-doctor-appointment',
    "Next doctor's appointment",
  );

  const migraineDaysToggle = createToggle(
    'migraine-days',
    'Do you have 4 or more migraine days a month? (optional)',
    {},
    false,
  );
  migraineDaysToggle.style.display = 'none'; // hidden until "No" is selected on the prescribed question

  const firstInfusionDateField = createDateField('first-infusion-date', 'First infusion date');
  const firstInfusionToggle = createToggle(
    'first-infusion',
    'Have you had your first VYEPTI infusion?',
    { no: firstInfusionDateField }, // separate nested question — keeps its own independent slide animation
  );

  const firstInfusionContainer = document.createElement('div');
  firstInfusionContainer.className = 'conditional-container';
  firstInfusionContainer.style.display = 'none';
  firstInfusionContainer.append(firstInfusionToggle, firstInfusionDateField);

  // branches left empty on purpose — visibility for "prescribed" is now driven manually below so everything animates as one synced block
  const prescribedToggle = createToggle(
    'prescribed',
    'Have you been prescribed VYEPTI?',
    {},
  );

  const personalInfoContainer = document.createElement('div');
  personalInfoContainer.className = 'personal-info-container';

  
  personalInfoContainer.append(createDobField());

  
  personalInfoContainer.append(createTextField('first-name', 'First name'));
  personalInfoContainer.append(createTextField('last-name', 'Last name'));

  
  personalInfoContainer.append(createTextField('email', 'Email address', 'email'));

  
personalInfoContainer.append(
  createTextField(
    'phone',
    'Mobile phone number',
    'tel',
    true,
    false,
    null,
    'Please enter your 10-digit phone number',
  ),
);

  
  personalInfoContainer.append(
    createTextField(
      'address1',
      'Street address 1',
      'text',
      true,
      false,
      'Providing this information helps make sure you get useful information '
        + 'during your migraine treatment experience.',
        DEFAULT_MESSAGES.address1,
    ),
  );

  
  personalInfoContainer.append(createTextField('address2', 'Street address 2', 'text', false, true));


  personalInfoContainer.append(createTextField('city', 'City'));

  
  personalInfoContainer.append(
    createSelectField('state', 'State', [
      { value: 'AL', text: 'Alabama (AL)' },
      { value: 'AK', text: 'Alaska (AK)' },
      { value: 'AZ', text: 'Arizona (AZ)' },
      { value: 'AR', text: 'Arkansas (AR)' },
      { value: 'CA', text: 'California (CA)' },
      { value: 'CO', text: 'Colorado (CO)' },
      { value: 'CT', text: 'Connecticut (CT)' },
      { value: 'DE', text: 'Delaware (DE)' },
      { value: 'FL', text: 'Florida (FL)' },
      { value: 'GA', text: 'Georgia (GA)' },
      { value: 'HI', text: 'Hawaii (HI)' },
      { value: 'ID', text: 'Idaho (ID)' },
      { value: 'IL', text: 'Illinois (IL)' },
      { value: 'IN', text: 'Indiana (IN)' },
      { value: 'IA', text: 'Iowa (IA)' },
      { value: 'KS', text: 'Kansas (KS)' },
      { value: 'KY', text: 'Kentucky (KY)' },
      { value: 'LA', text: 'Louisiana (LA)' },
      { value: 'ME', text: 'Maine (ME)' },
      { value: 'MD', text: 'Maryland (MD)' },
      { value: 'MA', text: 'Massachusetts (MA)' },
      { value: 'MI', text: 'Michigan (MI)' },
      { value: 'MN', text: 'Minnesota (MN)' },
      { value: 'MS', text: 'Mississippi (MS)' },
      { value: 'MO', text: 'Missouri (MO)' },
      { value: 'MT', text: 'Montana (MT)' },
      { value: 'NE', text: 'Nebraska (NE)' },
      { value: 'NV', text: 'Nevada (NV)' },
      { value: 'NH', text: 'New Hampshire (NH)' },
      { value: 'NJ', text: 'New Jersey (NJ)' },
      { value: 'NM', text: 'New Mexico (NM)' },
      { value: 'NY', text: 'New York (NY)' },
      { value: 'NC', text: 'North Carolina (NC)' },
      { value: 'ND', text: 'North Dakota (ND)' },
      { value: 'OH', text: 'Ohio (OH)' },
      { value: 'OK', text: 'Oklahoma (OK)' },
      { value: 'OR', text: 'Oregon (OR)' },
      { value: 'PA', text: 'Pennsylvania (PA)' },
      { value: 'RI', text: 'Rhode Island (RI)' },
      { value: 'SC', text: 'South Carolina (SC)' },
      { value: 'SD', text: 'South Dakota (SD)' },
      { value: 'TN', text: 'Tennessee (TN)' },
      { value: 'TX', text: 'Texas (TX)' },
      { value: 'UT', text: 'Utah (UT)' },
      { value: 'VT', text: 'Vermont (VT)' },
      { value: 'VA', text: 'Virginia (VA)' },
      { value: 'WA', text: 'Washington (WA)' },
      { value: 'WV', text: 'West Virginia (WV)' },
      { value: 'WI', text: 'Wisconsin (WI)' },
      { value: 'WY', text: 'Wyoming (WY)' },
    ], DEFAULT_MESSAGES.state,),
  );


 
  personalInfoContainer.append(
  createTextField(
    'zip',
    'ZIP code',
    'text',
    true,
    false,
    null,
    'Please enter your ZIP code',
    10,
  ),
);

  // Consent block
  const consentContainer = document.createElement('div');
  consentContainer.className = 'conditional-container';
  consentContainer.style.display = 'none';

  
  const consent = document.createElement('label');
  consent.className = 'form-consent';
  const consentInput = document.createElement('input');
  consentInput.type = 'checkbox';
  consentInput.name = 'consent';
  consent.append(
    consentInput,
    document.createTextNode(
      ' By submitting this form, I agree to receive email updates about migraine and migraine '
        + 'treatment with VYEPTI. I authorize Lundbeck, its affiliates, its employees, and its '
        + 'agents to use the information I am providing in order to enroll me in the email program.',
    ),
  );

  const consentError = createErrorMessage('consent');
  const validateConsent = () => {
    if (!consentInput.checked) {
      showFieldError(consentInput, consentError, DEFAULT_MESSAGES.consent);
      return false;
    }
    clearFieldError(consentInput, consentError);
    return true;
  };
  consentInput.addEventListener('change', validateConsent);
  consentInput.validate = validateConsent;
  consentInput.errorEl = consentError;


  const consentLegal = document.createElement('p');
  consentLegal.className = 'form-consent-legal';
  consentLegal.innerHTML = `
    Lundbeck will not sell your provided data to any third party, at any time. By clicking
    "Submit," you signify that you have read and agree to our
    <a href="https://www.lundbeck.com/us/terms-of-use" target="_blank" rel="noopener noreferrer">Terms of Use</a>
    and
    <a href="https://www.lundbeck.com/us/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy.</a>
  `;

  consentContainer.append(consent, consentLegal, consentError);

  // Wrapper holds everything that should react together when "prescribed" is answered, so it's one animation instead of several out-of-sync ones
  const belowPrescribedWrapper = document.createElement('div');
  belowPrescribedWrapper.className = 'below-prescribed-wrapper';
  belowPrescribedWrapper.classList.add('visible'); // personal info is shown from page load, so treat the wrapper as already open
  belowPrescribedWrapper.append(
    firstInfusionContainer,
    nextDoctorAppointmentField,
    migraineDaysToggle,
    personalInfoContainer,
    consentContainer,
  );

  form.append(prescribedToggle, belowPrescribedWrapper);

  // One listener now drives every conditional piece plus the single shared animation
  prescribedToggle.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isYes = radio.checked && radio.value === 'yes';
      const isNo = radio.checked && radio.value === 'no';

      replayDropdown(belowPrescribedWrapper, () => {
        // runs only once the wrapper is fully collapsed, so the swap below never flashes on screen
        if (isYes) {
          firstInfusionContainer.style.display = 'block';
          firstInfusionContainer.classList.add('visible');
        } else {
          firstInfusionContainer.style.display = 'none';
          firstInfusionContainer.classList.remove('visible');
          resetConditionalFieldContents(firstInfusionContainer); // clear any leftover "yes" branch answers
        }

        if (isNo) {
          nextDoctorAppointmentField.style.display = 'block';
          nextDoctorAppointmentField.classList.add('visible');
          migraineDaysToggle.style.display = 'block';
        } else {
          nextDoctorAppointmentField.style.display = 'none';
          nextDoctorAppointmentField.classList.remove('visible');
          migraineDaysToggle.style.display = 'none';
          resetConditionalFieldContents(nextDoctorAppointmentField); // clear the date/checkbox if switching away from "no"
        }

        if (!consentContainer.classList.contains('visible')) {
          consentContainer.style.display = 'block';
          consentContainer.classList.add('visible'); // shown from the first answer onward, either yes or no
        }
      });
    });
  });

  // Server-side / network error message — shown above the submit button
  const serverError = document.createElement('p');
  serverError.className = 'field-error form-server-error';
  serverError.id = 'server-error';
  serverError.hidden = true;
  serverError.setAttribute('role', 'alert');
  form.append(serverError);

  // Submit button — actual submission (fetch to an API) 
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'form-submit';
  submit.innerHTML = 'Submit <span aria-hidden="true">&rarr;</span>';
  form.append(submit);

 
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const validatable = [...form.querySelectorAll('input, select')].filter(
      (el) => typeof el.validate === 'function',
    );
    // Toggle groups validate as a whole unit rather than per-radio.
    const toggleGroups = [...form.querySelectorAll('.toggle-group')].filter(
      (el) => typeof el.validate === 'function',
    );

    let firstInvalid = null;

    validatable.forEach((el) => {
      const isVisible = el.offsetParent !== null;
      if (!isVisible) {
        clearFieldError(el, el.errorEl);
        return;
      }
      const valid = el.validate();
      if (!valid && !firstInvalid) firstInvalid = el;
    });

    toggleGroups.forEach((group) => {
      const isVisible = group.offsetParent !== null;
      if (!isVisible) {
        clearFieldError(group, group.errorEl);
        return;
      }
      const valid = group.validate();
      if (!valid && !firstInvalid) firstInvalid = group.querySelector('input[type="radio"]');
    });

  
    clearFieldError(serverError, serverError);

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      return;
    }

    const formData = new FormData(form);

    submit.disabled = true;
    submit.classList.add('is-submitting');
    const originalSubmitLabel = submit.innerHTML;
    submit.innerHTML = 'Submitting…';

    try {
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      // Try to read a JSON body regardless of status 
      let payload = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        payload = null;
      }

      const succeeded = response.ok && (payload === null || payload.success !== false);

      if (!succeeded) {
        const serverMessage = (payload && (payload.message || payload.error))
          || DEFAULT_MESSAGES.server;
        showFieldError(serverError, serverError, serverMessage);
        serverError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const signupForm = form.closest('.signup-form');

if (signupForm) {
  signupForm.classList.add('submitted');
}

showConfirmationContent();
    } catch (error) {
      console.error('Form submission error:', error);
      showFieldError(serverError, serverError, DEFAULT_MESSAGES.server);
      serverError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submit.disabled = false;
      submit.classList.remove('is-submitting');
      submit.innerHTML = originalSubmitLabel;
    }
  });

  return form;
}



function showConfirmationContent() {
  const carousel = document.querySelector('.carousel');
  const columnsCta = document.querySelector('.columns-cta');

  if (carousel) {
    carousel.classList.remove('confirmation-hidden');
  }

  if (columnsCta) {
    columnsCta.classList.remove('confirmation-hidden');
  }

  carousel?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}


export default function decorate(block) {

  const rows = [...block.children];

  let googleApiKey = '';
  let apiEndpoint = '';

  rows.forEach((row) => {
    const cols = [...row.children];

    if (cols.length === 2) {
      const label = cols[0].textContent.trim();
      const value = cols[1].textContent.trim();

      if (label === 'Google Maps API Key') {
        googleApiKey = value;
      }

      if (label === 'API Endpoint') {
        apiEndpoint = value;
      }
      

    }
  });

  const intro = '';

  block.innerHTML = '';

  
  const content = document.createElement('div');
  content.className = 'signup-form-content';

  const info = document.createElement('div');
  info.className = 'signup-form-info';
  info.innerHTML = `
    <div>
      <p class="signup-form-info-heading">Being informed starts here</p>
      <p class="signup-form-info-text">${intro || ''}</p>
    </div>
  `;

  const requiredNote = document.createElement('p');
  requiredNote.className = 'signup-form-required-note';
  requiredNote.textContent = 'All fields are required unless marked optional';

  content.append(info, requiredNote, buildForm(apiEndpoint));


function initializeAddressAutocomplete() {
  const addressInput = document.getElementById('address1');
  const cityInput = document.getElementById('city');
  const stateSelect = document.getElementById('state');
  const zipInput = document.getElementById('zip');

  if (!addressInput) return;

  if (!window.google?.maps?.places?.Autocomplete) {
    console.error('Google Places Autocomplete failed to load — check API key/console errors.');
    return;
  }

  const autocomplete = new google.maps.places.Autocomplete(
    addressInput,
    {
      types: ['address'],
      componentRestrictions: {
        country: 'us',
      },
    },
  );

  
  autocomplete.setFields(['address_components']);

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();

    if (!place || !place.address_components) {
      
      showFieldError(addressInput, addressInput.errorEl, DEFAULT_MESSAGES.invalidAddress);
      return;
    }

    let streetNumber = '';
    let route = '';
    let city = '';
    let state = '';
    let zip = '';

    place.address_components.forEach((component) => {
      const type = component.types[0];

      if (type === 'street_number') {
        streetNumber = component.long_name;
      }

      if (type === 'route') {
        route = component.long_name;
      }

      if (type === 'locality' || (type === 'sublocality_level_1' && !city)) {
        city = component.long_name;
      }

      if (type === 'administrative_area_level_1') {
        state = component.short_name;
      }

      if (type === 'postal_code') {
        zip = component.long_name;
      }
    });

    if (!zip) {
      showFieldError(addressInput, addressInput.errorEl, DEFAULT_MESSAGES.invalidAddress);
      return;
    }

    clearFieldError(addressInput, addressInput.errorEl);

    const streetOnly = [streetNumber, route].filter(Boolean).join(' ');
    addressInput.value = streetOnly || addressInput.value;

    if (cityInput) {
      cityInput.value = city;
      clearFieldError(cityInput, cityInput.errorEl);
    }
    if (zipInput) {
      zipInput.value = zip;
      clearFieldError(zipInput, zipInput.errorEl);
    }

    if (stateSelect) {
      stateSelect.value = state;
      stateSelect.dispatchEvent(new Event('change', {
        bubbles: true,
      }));
    }
  });
}

  block.append(content);

  const carousel = document.querySelector('.carousel');
const columnsCta = document.querySelector('.columns-cta');

carousel?.classList.add('confirmation-hidden');
columnsCta?.classList.add('confirmation-hidden');


console.log({ googleApiKey, apiEndpoint });

  loadGooglePlacesApi(googleApiKey, () => {
  initializeAddressAutocomplete();
});
}