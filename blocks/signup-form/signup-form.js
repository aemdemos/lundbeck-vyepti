// Google API Key link
function loadGooglePlacesApi(apiKey, callback) {
  if (window.google?.maps?.places?.AutocompleteSuggestion) {
    callback();
    return;
  }

  // Google's "callback" URL param is invoked by Google's own loader once

  // eslint-disable-next-line sonarjs/pseudo-random -- used only to build a unique, non-secret global callback name, not for anything security-sensitive
  const callbackName = `__loadGooglePlacesApiCallback_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  // eslint-disable-next-line secure-coding/detect-object-injection -- callbackName is a locally generated, non-user-controlled string, not user input
  window[callbackName] = () => {
    // eslint-disable-next-line secure-coding/detect-object-injection -- same locally generated key as above
    delete window[callbackName];
    if (window.google?.maps?.places?.AutocompleteSuggestion) {
      callback();
    } else {
      // eslint-disable-next-line no-console
      console.error('Google Places library failed to load. Check your Maps configuration.');
    }
  };

  const script = document.createElement('script');
  const mapsScriptUrl = new URL('https://maps.googleapis.com/maps/api/js');
  mapsScriptUrl.searchParams.set('key', apiKey);
  mapsScriptUrl.searchParams.set('libraries', 'places');
  mapsScriptUrl.searchParams.set('loading', 'async');
  mapsScriptUrl.searchParams.set('callback', callbackName);
  script.src = mapsScriptUrl.toString();
  script.async = true;
  script.defer = true;

  script.onerror = () => {
    // eslint-disable-next-line secure-coding/detect-object-injection -- callbackName is a locally generated, non-user-controlled string, not user input
    delete window[callbackName];
    // eslint-disable-next-line no-console
    console.error('Failed to load Google Maps script.');
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
  invalidAddress: 'Please enter a valid address',
  server: 'Something went wrong submitting your information. Please try again.',

};


function createErrorMessage(id) {
  const p = document.createElement('p');
  p.className = 'field-error';
  p.id = `${id}-error`;
  p.hidden = true;
  return p;
}


function showFieldError(field, errorEl, message) {
  field.classList.add('error');
  field.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
    field.setAttribute('aria-describedby', errorEl.id);
  }
}


function clearFieldError(field, errorEl) {
  field.classList.remove('error');
  field.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
}


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



const REVEAL_DURATION_MS = 600;
const REVEAL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function buildRevealTransition(durationMs) {
  // Opacity finishes a bit before max-height so the fade doesn't look like
  // it's dragging behind the height change.
  const opacityMs = Math.round(durationMs * 0.7);
  return `max-height ${durationMs}ms ${REVEAL_EASING}, opacity ${opacityMs}ms ease-out`;
}



function slideDown(el, durationMs = REVEAL_DURATION_MS) {
  el.style.transition = 'none';
  el.style.display = 'block';
  el.classList.add('visible');
  el.style.overflow = 'hidden';
  el.style.maxHeight = '0px';
  el.style.opacity = '0';


  el.getBoundingClientRect();

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


function slideUp(el, onComplete, durationMs = REVEAL_DURATION_MS) {
  const startHeight = el.scrollHeight;
  el.style.transition = 'none';
  el.style.overflow = 'hidden';
  el.style.maxHeight = `${startHeight}px`;

  // Force a reflow — same reason as in slideDown() above.
  el.getBoundingClientRect();

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


function applyToggleBranches(branches, selectedValue) {
  Object.entries(branches).forEach(([branchValue, target]) => {
    const els = Array.isArray(target) ? target : [target];
    els.forEach((el) => {
      if (!el) return;
      if (branchValue === selectedValue) {
        slideDown(el);
      } else {
        hideConditionalField(el);
      }
    });
  });
}


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
    // eslint-disable-next-line secure-coding/no-ldap-injection
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
      applyToggleBranches(branches, input.value);
      validate();
    });
  });

  wrapper.append(options);
  if (errorEl) wrapper.append(errorEl);
  wrapper.validate = validate;
  wrapper.errorEl = errorEl;
  return wrapper;
}

let popoverBackdrop = null;


function closeAllPopovers() {
  document.querySelectorAll('.form-field-popover').forEach((p) => {
    p.hidden = true;
    p.parentElement.querySelector('.form-field-info-btn')?.setAttribute('aria-expanded', 'false');
  });
  if (popoverBackdrop) popoverBackdrop.hidden = true;
}

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

function repositionOpenPopover() {
  const openPopover = document.querySelector('.form-field-popover:not([hidden])');
  if (openPopover && openPopover.anchorButton) {
    positionPopover(openPopover, openPopover.anchorButton);
  }
}
window.addEventListener('resize', repositionOpenPopover);
window.addEventListener('scroll', repositionOpenPopover, true);


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
  // eslint-disable-next-line secure-coding/no-insecure-comparison
  if (e.key !== 'Escape') return;
  closeAllPopovers();
});



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

  const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

  const validate = () => {
    const value = input.value.trim();

    if (required && !value) {
      showFieldError(input, errorEl, missingMessage);
      return false;
    }

    if (type === 'email' && value && !EMAIL_REGEX.test(value)) {
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


function createSelectField(name, label, options, requiredMessage = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-field';

  const labelRow = document.createElement('div');
  labelRow.className = 'form-field-label-row';

  const labelEl = document.createElement('label');
  labelEl.setAttribute('for', name);
  labelEl.textContent = label;
  labelRow.append(labelEl);



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

  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
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

function matchesDatePattern(dateStr) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
}

function isValidDateFormat(dateStr) {
  if (!matchesDatePattern(dateStr)) return false;

  const [month, day, year] = dateStr.split('/');
  const dateObj = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
  );

  if (Number.isNaN(dateObj.getTime())) return false;
  if (dateObj.getMonth() + 1 !== parseInt(month, 10)) return false;
  if (dateObj.getDate() !== parseInt(day, 10)) return false;

  return true;
}

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
  let touched = false;


  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = `${name}-not-scheduled`;
  checkbox.id = `${name}-not-scheduled`;

  const validate = () => {
    if (dateInput.disabled) {
      clearFieldError(dateInput, errorEl);
      return true;
    }

    const value = dateInput.value.trim();

    checkboxErrorEl.hidden = true;

    if (!value && !checkbox.checked && !touched) {
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


function applyPrescribedAnswerState({
  isYes,
  isNo,
  firstInfusionContainer,
  nextDoctorAppointmentField,
  migraineDaysToggle,
  consentContainer,
}) {
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
}

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
    ], DEFAULT_MESSAGES.state),
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

  // Built with DOM nodes instead of innerHTML — same rendered markup/design,
  // but avoids assigning an interpolated template literal to innerHTML.
  const consentLegal = document.createElement('p');
  consentLegal.className = 'form-consent-legal';
  consentLegal.append(
    document.createTextNode(
      'Lundbeck will not sell your provided data to any third party, at any time. By clicking '
        + '"Submit," you signify that you have read and agree to our ',
    ),
  );
  const termsLink = document.createElement('a');
  termsLink.href = 'https://www.lundbeck.com/us/terms-of-use';
  termsLink.target = '_blank';
  termsLink.rel = 'noopener noreferrer';
  termsLink.textContent = 'Terms of Use';
  const privacyLink = document.createElement('a');
  privacyLink.href = 'https://www.lundbeck.com/us/privacy-policy';
  privacyLink.target = '_blank';
  privacyLink.rel = 'noopener noreferrer';
  privacyLink.textContent = 'Privacy Policy.';
  consentLegal.append(termsLink, document.createTextNode(' and '), privacyLink);

  consentContainer.append(consent, consentLegal, consentError);

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

  prescribedToggle.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const isYes = radio.checked && radio.value === 'yes';
      const isNo = radio.checked && radio.value === 'no';

      replayDropdown(belowPrescribedWrapper, () => applyPrescribedAnswerState({
        isYes,
        isNo,
        firstInfusionContainer,
        nextDoctorAppointmentField,
        migraineDaysToggle,
        consentContainer,
      }));
    });
  });

  const serverError = document.createElement('p');
  serverError.className = 'field-error form-server-error';
  serverError.id = 'server-error';
  serverError.hidden = true;
  serverError.setAttribute('role', 'alert');
  form.append(serverError);

  // Submit button — actual submission (fetch to an API). Built from DOM
  // nodes (label span + arrow span) rather than an innerHTML string, so the
  // "Submitting…" state swap below never touches innerHTML.
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'form-submit';

  const submitLabel = document.createElement('span');
  submitLabel.textContent = 'Submit';

  const submitArrow = document.createElement('span');
  submitArrow.setAttribute('aria-hidden', 'true');
  submitArrow.textContent = '\u2192'; // →

  submit.append(submitLabel, submitArrow);
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
    submitLabel.textContent = 'Submitting…';
    submitArrow.hidden = true;

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
        // eslint-disable-next-line no-console
        console.debug('Response body was not JSON:', parseError);
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
      // eslint-disable-next-line no-console
      console.error('Form submission error:', error);
      showFieldError(serverError, serverError, DEFAULT_MESSAGES.server);
      serverError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submit.disabled = false;
      submit.classList.remove('is-submitting');
      submitLabel.textContent = 'Submit';
      submitArrow.hidden = false;
    }
  });

  return form;
}


function applyPlaceToAddressFields(place, { addressInput, cityInput, stateSelect, zipInput }) {
  if (!place.addressComponents) {
    showFieldError(addressInput, addressInput.errorEl, DEFAULT_MESSAGES.invalidAddress);
    return false;
  }

  let countryCode = '';
  place.addressComponents.forEach((component) => {
    if (component.types.includes('country')) {
      countryCode = component.shortText;
    }
  });

  if (countryCode !== 'US') {
    addressInput.value = '';
    if (cityInput) cityInput.value = '';
    if (zipInput) zipInput.value = '';
    if (stateSelect) {
      stateSelect.value = '';
      stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    showFieldError(addressInput, addressInput.errorEl, 'Please enter a valid address');
    return false;
  }

  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';

  place.addressComponents.forEach((component) => {
    const type = component.types[0];

    if (type === 'street_number') streetNumber = component.longText;
    if (type === 'route') route = component.longText;
    if (type === 'locality' || (type === 'sublocality_level_1' && !city)) city = component.longText;
    if (type === 'administrative_area_level_1') state = component.shortText;
    if (type === 'postal_code') zip = component.longText;
  });

  if (!streetNumber && !route && !city) {
    showFieldError(addressInput, addressInput.errorEl, DEFAULT_MESSAGES.invalidAddress);
    return false;
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
    stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return true;
}



function createSuggestionItem(placePrediction, index) {
  const item = document.createElement('li');
  item.className = 'address-suggestion';
  item.id = `address1-suggestion-${index}`;
  item.setAttribute('role', 'option');
  item.setAttribute('aria-selected', 'false');

  const icon = document.createElement('span');
  icon.className = 'address-suggestion-icon';
  icon.setAttribute('aria-hidden', 'true');

  const textWrap = document.createElement('span');
  textWrap.className = 'address-suggestion-text';

  const main = document.createElement('span');
  main.className = 'address-suggestion-main';
  main.textContent = (placePrediction.mainText && placePrediction.mainText.text)
    || placePrediction.text.text;

  const secondary = document.createElement('span');
  secondary.className = 'address-suggestion-secondary';
  secondary.textContent = (placePrediction.secondaryText && placePrediction.secondaryText.text) || '';

  textWrap.append(main, secondary);
  item.append(icon, textWrap);
  return item;
}


function initializeAddressAutocomplete() {
  const addressInput = document.getElementById('address1');
  const cityInput = document.getElementById('city');
  const stateSelect = document.getElementById('state');
  const zipInput = document.getElementById('zip');

  if (!addressInput) return;

  if (!window.google?.maps?.places?.AutocompleteSuggestion) {
    // eslint-disable-next-line no-console
    console.error('Google Places Autocomplete Data API failed to load — check your Maps configuration.');
    return;
  }

  const { AutocompleteSuggestion, AutocompleteSessionToken } = window.google.maps.places;


  const wrapper = document.createElement('div');
  wrapper.className = 'address-autocomplete-wrapper';
  addressInput.insertAdjacentElement('beforebegin', wrapper);
  wrapper.append(addressInput);

  addressInput.autocomplete = 'off';
  addressInput.setAttribute('role', 'combobox');
  addressInput.setAttribute('aria-autocomplete', 'list');
  addressInput.setAttribute('aria-expanded', 'false');

  const list = document.createElement('ul');
  list.className = 'address-suggestions';
  list.id = 'address1-suggestions';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrapper.append(list);
  addressInput.setAttribute('aria-controls', list.id);


  let sessionToken = new AutocompleteSessionToken();
  let currentSuggestions = [];
  let activeIndex = -1;
  let debounceTimer = null;
  let requestId = 0;

  const closeList = () => {
    list.hidden = true;
    list.replaceChildren();
    currentSuggestions = [];
    activeIndex = -1;
    addressInput.setAttribute('aria-expanded', 'false');
    addressInput.removeAttribute('aria-activedescendant');
  };

  const setActive = (index) => {
    const items = list.querySelectorAll('.address-suggestion');
    items.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
      item.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
    activeIndex = index;
    if (index >= 0 && items[index]) {
      addressInput.setAttribute('aria-activedescendant', items[index].id);
      items[index].scrollIntoView({ block: 'nearest' });
    } else {
      addressInput.removeAttribute('aria-activedescendant');
    }
  };

  const selectSuggestion = async (placePrediction) => {
    const place = placePrediction.toPlace();

    try {
      await place.fetchFields({ fields: ['addressComponents'] });
    } catch (fetchError) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch place details:', fetchError);
      showFieldError(addressInput, addressInput.errorEl, DEFAULT_MESSAGES.invalidAddress);
      closeList();
      sessionToken = new AutocompleteSessionToken();
      return;
    }

    applyPlaceToAddressFields(place, {
      addressInput, cityInput, stateSelect, zipInput,
    });

    closeList();
    addressInput.focus();
    sessionToken = new AutocompleteSessionToken();
  };

  const renderSuggestions = (suggestions) => {
    list.replaceChildren();
    currentSuggestions = suggestions;
    activeIndex = -1;

    if (!suggestions.length) {
      closeList();
      return;
    }

    suggestions.forEach((suggestion, index) => {
      const { placePrediction } = suggestion;
      const item = createSuggestionItem(placePrediction, index);


      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectSuggestion(placePrediction);
      });
      item.addEventListener('mouseenter', () => setActive(index));

      list.append(item);
    });

    list.hidden = false;
    addressInput.setAttribute('aria-expanded', 'true');
  };

  const fetchSuggestions = async (query) => {
    requestId += 1;
    const thisRequestId = requestId;

    if (!query) {
      closeList();
      return;
    }

    try {
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken,
        includedRegionCodes: ['us'],
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      });

      if (thisRequestId !== requestId) return; // superseded by a newer keystroke
      renderSuggestions(suggestions);
    } catch (fetchError) {
      if (thisRequestId !== requestId) return;
      // eslint-disable-next-line no-console
      console.error('Failed to fetch address suggestions:', fetchError);
      closeList();
    }
  };

  addressInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const { value } = addressInput;
    debounceTimer = setTimeout(() => fetchSuggestions(value.trim()), 200);
  });

  addressInput.addEventListener('keydown', (e) => {
    if (list.hidden || !currentSuggestions.length) return;

    // eslint-disable-next-line secure-coding/no-insecure-comparison -- comparing a keyboard event key name, not a secret
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, currentSuggestions.length - 1));
      // eslint-disable-next-line secure-coding/no-insecure-comparison -- comparing a keyboard event key name, not a secret
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
      // eslint-disable-next-line secure-coding/no-insecure-comparison -- comparing a keyboard event key name, not a secret
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      // eslint-disable-next-line secure-coding/detect-object-injection -- activeIndex is a bounds-checked numeric index, not user-controlled input
      selectSuggestion(currentSuggestions[activeIndex].placePrediction);
      // eslint-disable-next-line secure-coding/no-insecure-comparison -- comparing a keyboard event key name, not a secret
    } else if (e.key === 'Escape') {
      closeList();
    }
  });


  addressInput.addEventListener('blur', () => {
    setTimeout(closeList, 100);
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) closeList();
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
// eslint-disable-next-line secure-coding/no-insecure-comparison
      if (label === 'Google Maps API Key') {
        googleApiKey = value;
      }


      if (label === 'API Endpoint') {
        apiEndpoint = value;
      }
    }
  });

  block.innerHTML = '';


  const content = document.createElement('div');
  content.className = 'signup-form-content';

  // Built with DOM nodes rather than an innerHTML template literal.
  const info = document.createElement('div');
  info.className = 'signup-form-info';
  const infoInner = document.createElement('div');
  const infoHeading = document.createElement('p');
  infoHeading.className = 'signup-form-info-heading';
  infoHeading.textContent = 'Being informed starts here';
  const infoText = document.createElement('p');
  infoText.className = 'signup-form-info-text';
  infoInner.append(infoHeading, infoText);
  info.append(infoInner);

  const requiredNote = document.createElement('p');
  requiredNote.className = 'signup-form-required-note';
  requiredNote.textContent = 'All fields are required unless marked optional';

  content.append(info, requiredNote, buildForm(apiEndpoint));

  block.append(content);

  const carousel = document.querySelector('.carousel');
  const columnsCta = document.querySelector('.columns-cta');

  carousel?.classList.add('confirmation-hidden');
  columnsCta?.classList.add('confirmation-hidden');

  loadGooglePlacesApi(googleApiKey, () => {
    initializeAddressAutocomplete();
  });
}
