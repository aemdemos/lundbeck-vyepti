import { DOCTOR_DISCUSSION_CONFIGS } from '../../scripts/config.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default number of progress-dot segments shown when no total-steps row is authored.
export const TOTAL_STEPS_DEFAULT = 9;

// API endpoints now live in scripts/config.js (DOCTOR_DISCUSSION_CONFIGS) so
// they're configured in one place instead of being hardcoded in this block.
export const {
  PDF_DOWNLOAD_API_URL,
  EMAIL_SUBMIT_API_URL,
} = DOCTOR_DISCUSSION_CONFIGS;

export const PDF_ERROR_ELEMENT_ID = 'dg-pdf-error-msg';
export const PDF_POPUP_BLOCKED_ELEMENT_ID = 'dg-pdf-popup-blocked';
export const THANKYOU_MODAL_ID = 'dg-thankyou-modal';

// Matches the wrapper EDS gives any block authored as "doctor-thankyou",
// regardless of where it sits on the page.
export const THANKYOU_BLOCK_SELECTOR = '[data-block-name="doctor-thankyou"]';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

// Blocked keys, to guard the answers store against prototype pollution.
const UNSAFE_ANSWER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Safely reads a dynamic field-name key off the shared answers object.
export function getAnswer(answers, key) {
  if (UNSAFE_ANSWER_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(answers, key)) {
    return undefined;
  }
  return Reflect.get(answers, key);
}

// Safely writes a dynamic field-name key onto the shared answers object.
export function setAnswer(answers, key, value) {
  if (UNSAFE_ANSWER_KEYS.has(key)) return;
  Object.defineProperty(answers, key, {
    value, writable: true, enumerable: true, configurable: true,
  });
}

/**
 * Create a DOM element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
export function createEl(tag, attrs = {}, ...children) {
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

// ---------------------------------------------------------------------------
// Modal-controller registry
// ---------------------------------------------------------------------------

// Maps a modal element to its controller, avoiding a custom DOM property.
// Shared by the email and thank-you modals so each modal is only ever
// built once and can be looked up again on subsequent opens.
const modalControllers = new WeakMap();

export function setModalController(modalEl, controller) {
  modalControllers.set(modalEl, controller);
}

export function getModalController(modalEl) {
  return modalControllers.get(modalEl);
}