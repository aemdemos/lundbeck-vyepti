/**
 * Creates the small red error message element shown beneath an invalid
 * field. Starts hidden.
 * @param {string} id - Used to build the element's id (`${id}-error`).
 * @returns {Element} The error message paragraph.
 */
function createErrorMessage(id) {
  const p = document.createElement('p');
  p.className = 'field-error';
  p.id = `${id}-error`;
  p.hidden = true;
  return p;
}

/**
 * Puts a field into its error state: red border on the input/select and a
 * visible red message beneath it.
 * @param {Element} field - The input/select/checkbox to mark invalid.
 * @param {Element} errorEl - The error message element to reveal.
 * @param {string} message - The error text to display.
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
 * Clears a field's error state (red border + message).
 * @param {Element} field - The input/select/checkbox to mark valid again.
 * @param {Element} errorEl - The error message element to hide.
 */
function clearFieldError(field, errorEl) {
  field.classList.remove('error');
  field.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
}

/**
 * Hides a conditional field/container and fully resets everything inside it:
 * unchecks radios/checkboxes, clears text inputs, and recursively hides any
 * nested conditional groups so re-selecting "Yes" always starts clean.
 * @param {Element} el - The conditional field or container to hide/reset.
 */
function hideConditionalField(el) {
  if (!el) return;

  el.style.display = 'none';
  el.classList.remove('visible');

  // Uncheck any radio buttons inside (e.g. a nested toggle question)
  el.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.checked = false;
  });

  // Clear and reset any text/date inputs inside, including their error state
  el.querySelectorAll('input[type="text"], input[type="date"]').forEach((input) => {
    input.value = '';
    input.disabled = false;
    clearFieldError(input, input.errorEl);
  });

  // Reset any checkboxes inside (e.g. "Not scheduled")
  el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
  });

  // Clear error state on any toggle groups inside (e.g. a nested question)
  el.querySelectorAll('.toggle-group').forEach((group) => {
    if (group.errorEl) clearFieldError(group, group.errorEl);
  });

  // Recursively hide any nested conditional groups/fields
  el.querySelectorAll('.date-field-group, .conditional-container').forEach((nested) => {
    nested.style.display = 'none';
    nested.classList.remove('visible');
  });
}

/**
 * Creates a Yes/No toggle question. Each answer can independently reveal one
 * or more conditional elements (they don't have to sit next to the toggle in
 * the DOM — pass an array to reveal several elements at once, e.g. a field
 * placed elsewhere in the form). Adds a "Please select an option" error
 * shown when a *required* group is left unanswered.
 * @param {string} name - The input name attribute (must be unique per question).
 * @param {string} label - The question/label text.
 * @param {{yes?: Element|Element[], no?: Element|Element[]}} branches - Elements
 *   to reveal per answer. e.g. { no: dateField } shows dateField only when
 *   "No" is picked, and hides/resets it for "Yes". Use an array,
 *   e.g. { no: [dateField, otherQuestion] }, when one answer should reveal
 *   more than one element (they can live anywhere else in the form).
 * @param {boolean} [required] - Whether leaving the question unanswered shows
 *   a validation error. Set to false for optional questions.
 * @returns {Element} The toggle group wrapper element.
 */
function createToggle(name, label, branches = {}, required = true) {
  const wrapper = document.createElement('div');
  wrapper.className = 'toggle-group';

  const legend = document.createElement('p');
  legend.className = 'toggle-legend';
  legend.textContent = label;
  wrapper.append(legend);

  const options = document.createElement('div');
  options.className = 'toggle-options';

  const errorEl = required ? createErrorMessage(name) : null;

  // Whether any radio in this group is checked; used for required validation.
  // Optional questions (required === false) always pass.
  const validate = () => {
    if (!required) return true;
    const checked = options.querySelector('input[type="radio"]:checked');
    if (!checked) {
      showFieldError(wrapper, errorEl, 'Please select an option');
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

    // Whichever answer was just selected: show every element in its matching
    // branch (if any), hide/reset every element in every other branch (if
    // any), and clear this group's error.
    input.addEventListener('change', () => {
      Object.entries(branches).forEach(([branchValue, target]) => {
        const els = Array.isArray(target) ? target : [target];
        els.forEach((el) => {
          if (!el) return;
          if (branchValue === input.value) {
            el.style.display = 'block';
            el.classList.add('visible');
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

// Single shared backdrop element (dims the page behind an open popover,
// matching the reference design) — created once and reused by every
// popover this module creates, rather than one per icon.
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

/**
 * Closes every open popover and hides the shared backdrop. Safe to call
 * even when nothing is open.
 */
function closeAllPopovers() {
  document.querySelectorAll('.form-field-popover').forEach((p) => {
    p.hidden = true;
    p.parentElement.querySelector('.form-field-info-btn')?.setAttribute('aria-expanded', 'false');
  });
  if (popoverBackdrop) popoverBackdrop.hidden = true;
}

/**
 * Positions an open popover directly above (or, if there isn't room,
 * below) the icon that triggered it. The popover itself is now `position:
 * fixed` with left/right set as plain CSS margins (see the CSS), so its
 * width and horizontal placement are already handled by the stylesheet —
 * this function only has to work out the two things CSS can't know on its
 * own: how far down the page the icon is (top) and where, along the
 * popover's own width, the arrow needs to sit so it still visually points
 * at that icon (--arrow-left).
 *
 * Safe to call repeatedly (e.g. on window resize or scroll).
 * @param {Element} popover - The popover element (must not be hidden when called).
 * @param {Element} anchorButton - The "i" button that opened this popover.
 */
function positionPopover(popover, anchorButton) {
  const gap = 14; // space between icon and popover, matches the old CSS bottom offset
  const viewportMargin = 8; // never let the popover touch the very top edge
  const arrowEdgeMargin = 20; // min distance from either popover edge, so the ~20px-wide arrow never clips

  const iconRect = anchorButton.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect(); // left/right/width come from the fixed CSS margins

  const top = iconRect.top - popoverRect.height - gap;
  popover.style.top = `${Math.max(top, viewportMargin)}px`;

  // Point the arrow at the icon's horizontal center, expressed as an
  // offset from the popover's own left edge, clamped so it can't render
  // past either rounded corner.
  const iconCenterX = iconRect.left + iconRect.width / 2;
  const arrowLeft = iconCenterX - popoverRect.left;
  const clampedArrowLeft = Math.min(
    Math.max(arrowLeft, arrowEdgeMargin),
    popoverRect.width - arrowEdgeMargin,
  );
  popover.style.setProperty('--arrow-left', `${clampedArrowLeft}px`);
}

// Re-run positionPopover() for whichever popover is currently open if the
// viewport is resized or the page is scrolled (capture: true so scrolling
// inside any inner container is caught too), since position: fixed doesn't
// track the icon on its own.
function repositionOpenPopover() {
  const openPopover = document.querySelector('.form-field-popover:not([hidden])');
  if (openPopover && openPopover.anchorButton) {
    positionPopover(openPopover, openPopover.anchorButton);
  }
}
window.addEventListener('resize', repositionOpenPopover);
window.addEventListener('scroll', repositionOpenPopover, true);

/**
 * Creates a clickable "i" info icon that opens a popover with the given
 * text, plus a close (×) button. Used for Date of birth and Street
 * address 1. Click-triggered (not hover-only) so it works on touch
 * devices, matches the reference design's icon style, and only one
 * popover is open at a time across the whole page.
 * @param {string} text - The message to show inside the popover.
 * @returns {Element} A small wrapper containing the icon button + popover.
 */
function createInfoIcon(text) {
  const wrapper = document.createElement('span');
  wrapper.className = 'form-field-info';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'form-field-info-btn';
  button.setAttribute('aria-label', 'More information');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
    + 'stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.5"></circle>'
    + '<line x1="12" y1="11" x2="12" y2="16.5"></line>'
    + '<circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none"></circle></svg>';

  const popover = document.createElement('div');
  popover.className = 'form-field-popover';
  popover.setAttribute('role', 'dialog');
  popover.hidden = true;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'form-field-popover-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" '
    + 'stroke="currentColor" stroke-width="2" stroke-linecap="round">'
    + '<line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg>';

  const popoverText = document.createElement('p');
  popoverText.className = 'form-field-popover-text';
  popoverText.textContent = text;

  popover.append(closeBtn, popoverText);
  wrapper.append(button, popover);

  // Stored so the module-level resize/scroll handler (repositionOpenPopover)
  // knows which icon this popover needs to stay pointed at, without having
  // to guess or query for it.
  popover.anchorButton = button;

  const open = () => {
    // Only one popover open at a time — close any others first.
    closeAllPopovers();
    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    getPopoverBackdrop().hidden = false;
    // Runs after the popover is visible/laid out so getBoundingClientRect()
    // in positionPopover reads its real size and position, not a stale one.
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

// Close any open popover (+ backdrop) on outside click or Escape — attached
// once at module load, works across every popover this module creates.
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
 * Creates a standard text input field with a label above it, an optional
 * "(optional)" suffix and/or an "i" info icon (see createInfoIcon), and
 * required/format validation (red border + message) on blur.
 * @param {string} name - The input name and id attribute.
 * @param {string} label - The label text.
 * @param {string} type - The input type (text, email, tel, etc.).
 * @param {boolean} required - Whether the field is required.
 * @param {boolean} optional - Whether to display '(optional)' suffix.
 * @param {string|null} tooltip - Optional info-popover text shown via the "i" icon.
 * @param {string|null} requiredMessage - Custom message shown when left empty.
 * @param {number|null} maxLength - Optional max character count (letters, numbers,
 *   symbols — anything), enforced natively by the browser via maxlength.
 * @returns {Element} The form field wrapper element.
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
  input.type = type === 'tel' ? 'text' : type; // 'text' so the mask fully controls formatting
  input.name = name;
  input.id = name;

  if (maxLength) {
    input.maxLength = maxLength;
  }

  if (type === 'tel') {
    input.placeholder = '(___) ___-____';
    input.inputMode = 'numeric'; // numeric mobile keyboard
    attachPhoneMask(input);
  }

  const errorEl = createErrorMessage(name);
  const missingMessage = requiredMessage || `Please enter your ${label.toLowerCase()}`;

  // Validates this field; returns true if valid. Shows/clears the error UI.
  const validate = () => {
    const value = input.value.trim();

    if (required && !value) {
      showFieldError(input, errorEl, missingMessage);
      return false;
    }

    if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      showFieldError(input, errorEl, 'Please enter a valid email address');
      return false;
    }

    if (type === 'tel' && value && value.replace(/\D/g, '').length !== 10) {
      showFieldError(input, errorEl, 'Please enter a valid 10-digit phone number');
      return false;
    }

    clearFieldError(input, errorEl);
    return true;
  };

  input.addEventListener('blur', validate);
  input.validate = validate;
  input.errorEl = errorEl;

  wrapper.append(labelRow, input, errorEl);
  return wrapper;
}

/**
 * Creates a dropdown select field with a label above it, a visible chevron
 * indicator, and required validation (red border + message) on blur/change.
 *
 * The chevron is a real inline <svg> element layered on top of the select
 * (not a CSS background-image data URI) — some sites' Content-Security-
 * Policy blocks data: URIs in background images, which silently drops a
 * CSS-only chevron while leaving the rest of the styling intact. An inline
 * SVG element in the DOM isn't subject to that restriction.
 * @param {string} name - The input name and id attribute.
 * @param {string} label - The label text.
 * @param {Array<{value: string, text: string}>} options - Array of option objects.
 * @param {string|null} requiredMessage - Custom message shown when left unselected.
 * @returns {Element} The select field wrapper element.
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
  // to the select without affecting the rest of the form's layout.
  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'select-wrapper';

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
  arrow.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" '
    + 'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
    + 'stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

  selectWrapper.append(select, arrow);

  const errorEl = createErrorMessage(name);
  const missingMessage = requiredMessage || `Please select a ${label.toLowerCase()}`;

  const validate = () => {
    if (!select.value) {
      showFieldError(select, errorEl, missingMessage);
      return false;
    }
    clearFieldError(select, errorEl);
    return true;
  };

  select.addEventListener('blur', validate);
  select.addEventListener('change', validate);
  select.validate = validate;
  select.errorEl = errorEl;

  wrapper.append(labelRow, selectWrapper, errorEl);
  return wrapper;
}

/**
 * Validates a date string as MM/DD/YYYY with proper date ranges.
 * @param {string} dateStr - The date string to validate (format: MM/DD/YYYY).
 * @returns {boolean} True if it's a valid MM/DD/YYYY date.
 */
function isValidDateFormat(dateStr) {
  const pattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
  if (!pattern.test(dateStr)) return false;

  const [month, day, year] = dateStr.split('/');
  const dateObj = new Date(`${year}-${month}-${day}`);

  if (Number.isNaN(dateObj.getTime())) return false;
  if (dateObj.getMonth() + 1 !== parseInt(month, 10)) return false;
  if (dateObj.getDate() !== parseInt(day, 10)) return false;

  return true;
}

/**
 * Attaches "numbers only, max 10 digits" masking behavior to a text input
 * as the person types, formatting it as (XXX) XXX-XXXX. Validation itself is
 * handled by the field's own `validate()` (see createTextField).
 * @param {HTMLInputElement} input - The input element to mask.
 */
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

/**
 * Attaches "numbers only, auto-formatted as MM/DD/YYYY" masking behavior to
 * a text input as the person types. Validation itself is handled by the
 * field's own `validate()` (see createDobField / createDateField).
 * @param {HTMLInputElement} input - The input element to mask.
 */
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

/**
 * Creates the "Date of birth" field: MM/DD/YYYY masked input, a visible
 * "18+" hint, a click-triggered info popover (see createInfoIcon), and
 * validation on blur (required, format, and age).
 * @returns {Element} The date-of-birth field wrapper.
 */
function createDobField() {
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

  // Visible hint text (not just the popover) — matches the reference
  // design, which shows the requirement inline next to the label.
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

  const validate = () => {
    const value = input.value.trim();

    if (!value) {
      showFieldError(input, errorEl, 'Please enter your date of birth');
      return false;
    }

    if (!isValidDateFormat(value)) {
      showFieldError(input, errorEl, 'Please enter a valid calendar date');
      return false;
    }

    // Must be at least 18 years old to register
    const [month, day, year] = value.split('/').map(Number);
    const dob = new Date(year, month - 1, day);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    if (dob > eighteenYearsAgo) {
      showFieldError(input, errorEl, 'You must be 18 years or older to register');
      return false;
    }

    clearFieldError(input, errorEl);
    return true;
  };

  input.addEventListener('blur', validate);
  input.validate = validate;
  input.errorEl = errorEl;

  wrapper.append(labelRow, input, errorEl);
  return wrapper;
}

/**
 * Creates a date field with MM/DD/YYYY masking/validation and a
 * "Not scheduled" checkbox that disables and clears the date input (which
 * also lifts the requirement). Used for "Next doctor's appointment" and
 * "First infusion date". Hidden by default; shown via the parent toggle's
 * conditional logic.
 * @param {string} name - The input name and id attribute.
 * @param {string} label - The label text (rendered as a small heading).
 * @param {string} [requiredMessage] - Message shown when empty/invalid.
 * @returns {Element} The date field wrapper with checkbox.
 */
function createDateField(name, label, requiredMessage = 'Please enter a valid calendar date') {
  const wrapper = document.createElement('div');
  wrapper.className = 'date-field-group';
  wrapper.style.display = 'none'; // hidden until revealed by its toggle

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
  dateInput.inputMode = 'numeric'; // numeric mobile keyboard

  attachDateMask(dateInput);

  const errorEl = createErrorMessage(name);

  // Required unless the "Not scheduled" checkbox is checked (dateInput.disabled)
  const validate = () => {
    if (dateInput.disabled) {
      clearFieldError(dateInput, errorEl);
      return true;
    }

    const value = dateInput.value.trim();
    if (!value || !isValidDateFormat(value)) {
      showFieldError(dateInput, errorEl, requiredMessage);
      return false;
    }

    clearFieldError(dateInput, errorEl);
    return true;
  };

  dateInput.addEventListener('blur', validate);
  dateInput.validate = validate;
  dateInput.errorEl = errorEl;

  dateFieldWrapper.append(dateLabel, dateInput, errorEl);

  // "Not scheduled" checkbox: disables + clears the date field (and its
  // error) when checked, since the field is no longer required in that case.
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
      clearFieldError(dateInput, errorEl);
    } else {
      dateInput.disabled = false;
    }
  });

  const checkboxText = document.createElement('span');
  checkboxText.textContent = 'Not scheduled';

  checkboxLabel.append(checkbox, checkboxText);
  checkboxWrapper.append(checkboxLabel);

  wrapper.append(dateFieldWrapper, checkboxWrapper);
  return wrapper;
}

/**
 * Builds the complete signup form with all fields, conditional logic, and
 * validation wiring.
 * @returns {Element} The form element.
 */
function buildForm() {
  const form = document.createElement('form');
  form.className = 'signup-form-fields';
  form.noValidate = true; // we render our own error messages instead of native browser ones

  // --------------------------------------------------------------------
  // Question 1: "Have you been prescribed VYEPTI?" — REQUIRED toggle
  // (the only "prescribed" question — it does not repeat itself).
  //  - No  -> reveals "Next doctor's appointment" date field (required
  //           unless "Not scheduled" is checked).
  //  - Yes -> reveals Question 2, a DIFFERENT question:
  //           "Have you had your first VYEPTI infusion?"
  // --------------------------------------------------------------------

  // Date field revealed by "No" above. Required unless "Not scheduled" is
  // checked (see createDateField — the checkbox lifts the requirement).
  const nextDoctorAppointmentField = createDateField(
    'next-doctor-appointment',
    "Next doctor's appointment",
  );

  // Optional follow-up question, also revealed by "No" — but it's rendered
  // further down the form (after ZIP code), not next to the toggle. It's
  // marked (optional) in its own label, so no required-selection validation.
  const migraineDaysToggle = createToggle(
    'migraine-days',
    'Do you have 4 or more migraine days a month? (optional)',
    {},
    false,
  );
  migraineDaysToggle.style.display = 'none'; // hidden until revealed by the "No" branch below

  // Question 2: "Have you had your first VYEPTI infusion?" — REQUIRED
  // toggle, only shown when Question 1 = "Yes".
  //  - Yes -> nothing happens beyond the radio being highlighted.
  //  - No  -> reveals "First infusion date" (required, MM/DD/YYYY).
  const firstInfusionDateField = createDateField('first-infusion-date', 'First infusion date');
  const firstInfusionToggle = createToggle(
    'first-infusion',
    'Have you had your first VYEPTI infusion?',
    { no: firstInfusionDateField },
  );

  // Container groups Question 2 + its date field so Question 1's "Yes"
  // branch can show/hide (and fully reset) both together.
  const firstInfusionContainer = document.createElement('div');
  firstInfusionContainer.className = 'conditional-container';
  firstInfusionContainer.style.display = 'none';
  firstInfusionContainer.append(firstInfusionToggle, firstInfusionDateField);

  const prescribedToggle = createToggle(
    'prescribed',
    'Have you been prescribed VYEPTI?',
    { yes: firstInfusionContainer, no: [nextDoctorAppointmentField, migraineDaysToggle] },
  );

  form.append(prescribedToggle);
  form.append(firstInfusionContainer);
  form.append(nextDoctorAppointmentField);

  // Consent block (checkbox + legal disclaimer, built further down in this
  // function) starts hidden and only appears once the person has answered
  // "Have you been prescribed VYEPTI?" — either Yes or No. Created here,
  // ahead of its contents, so the toggle's own radios can be wired to it
  // right away; the actual checkbox/legal elements get appended into it
  // later, once they exist.
  const consentContainer = document.createElement('div');
  consentContainer.className = 'conditional-container';
  consentContainer.style.display = 'none';

  prescribedToggle.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      consentContainer.style.display = 'block';
      consentContainer.classList.add('visible');
    });
  });

  // --------------------------------------------------------------------
  // Personal info fields (single column, per design)
  // Every field below is REQUIRED unless the call explicitly passes
  // `false` for the `required` argument or `true` for `optional`.
  // --------------------------------------------------------------------

  // Date of birth — required, MM/DD/YYYY format, must be 18+ (see
  // createDobField for the age check).
  form.append(createDobField());

  // First / last name — required, plain text, no special formatting.
  form.append(createTextField('first-name', 'First name'));
  form.append(createTextField('last-name', 'Last name'));

  // Email — required, validated against a basic email pattern on blur.
  form.append(createTextField('email', 'Email address', 'email'));

  // Mobile phone — required, auto-formatted as (XXX) XXX-XXXX while
  // typing, must resolve to exactly 10 digits.
  form.append(createTextField('phone', 'Mobile phone number', 'tel'));

  // Street address 1 — required, info popover now uses the same message
  // as Date of birth (explicitly requested), instead of its own text.
  form.append(
    createTextField(
      'address1',
      'Street address 1',
      'text',
      true,
      false,
      'Providing this information helps make sure you get useful information '
        + 'during your migraine treatment experience.',
    ),
  );

  // Street address 2 — OPTIONAL (apartment/suite/unit etc).
  form.append(createTextField('address2', 'Street address 2', 'text', false, true));

  // City — required, plain text.
  form.append(createTextField('city', 'City'));

  // State — required dropdown, all 50 states.
  form.append(
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
    ]),
  );
  // ZIP code — required, plain text (no format check beyond "not empty"),
  // capped at 10 characters (letters, numbers, or symbols all count).
  form.append(createTextField('zip', 'ZIP code', 'text', true, false, null, null, 10));

  // "4+ migraine days" toggle — OPTIONAL question. Only revealed when
  // "Have you been prescribed VYEPTI?" = "No" (wired up above), but it's
  // positioned here, below ZIP code, per the reference design.
  form.append(migraineDaysToggle);

  // --------------------------------------------------------------------
  // Consent + submit
  // --------------------------------------------------------------------

  // Consent checkbox — required. Must be checked before the form can be
  // submitted; unchecked shows a red error like every other field.
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
      showFieldError(consentInput, consentError, 'Please confirm you agree to receive email updates');
      return false;
    }
    clearFieldError(consentInput, consentError);
    return true;
  };
  consentInput.addEventListener('change', validateConsent);
  consentInput.validate = validateConsent;
  consentInput.errorEl = consentError;

  // Legal disclaimer shown below the checkbox, with Terms of Use and Privacy
  // Policy as links (not required/validated - informational text only).
  const consentLegal = document.createElement('p');
  consentLegal.className = 'form-consent-legal';
  consentLegal.innerHTML = `
    Lundbeck will not sell your provided data to any third party, at any time. By clicking
    "Submit," you signify that you have read and agree to our
    <a href="https://www.lundbeck.com/us/terms-of-use" target="_blank" rel="noopener noreferrer">Terms of Use</a>
    and
    <a href="https://www.lundbeck.com/us/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy.</a>
  `;

  consentContainer.append(consent, consentError, consentLegal);
  form.append(consentContainer);

  // Submit button — actual submission (fetch to an API) happens in the
  // form's 'submit' listener below, after every visible field passes
  // validation.
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'form-submit';
  submit.innerHTML = 'Submit <span aria-hidden="true">&rarr;</span>';
  form.append(submit);

  // ----------------------------------------------------------------------
  // Full-form validation on submit: runs every field's validate(), skipping
  // fields currently hidden by conditional logic (offsetParent is null when
  // display: none is set anywhere up the tree). Focuses the first invalid
  // field found so the person can fix it immediately.
  // ----------------------------------------------------------------------
  form.addEventListener('submit', (e) => {
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

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // TODO: wire to your actual submission endpoint (e.g. fetch POST)
    form.closest('.signup-form').classList.add('submitted');
  });

  return form;
}

export default function decorate(block) {
  // Expected authored rows: intro (used in the info callout)
  const rows = [...block.children];
  const [introRow] = rows;

  const intro = introRow?.textContent.trim();

  block.innerHTML = '';

  // ----- Content: info callout, required-fields note, and the form -----
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

  content.append(info, requiredNote, buildForm());

  block.append(content);
}