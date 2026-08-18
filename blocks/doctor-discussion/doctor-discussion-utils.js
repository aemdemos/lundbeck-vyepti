import { DOCTOR_DISCUSSION_CONFIGS } from '../../scripts/config.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default number of progress-dot segments shown when no total-steps row is authored.
export const TOTAL_STEPS_DEFAULT = 9;


export const {
  PDF_DOWNLOAD_API_URL,
  EMAIL_SUBMIT_API_URL,
  PDF_DOWNLOAD_API_USERNAME,
  PDF_DOWNLOAD_API_PASSWORD,
} = DOCTOR_DISCUSSION_CONFIGS;

export const PDF_ERROR_ELEMENT_ID = 'dg-pdf-error-msg';
export const PDF_POPUP_BLOCKED_ELEMENT_ID = 'dg-pdf-popup-blocked';
export const THANKYOU_MODAL_ID = 'dg-thankyou-modal';

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

const modalControllers = new WeakMap();

export function setModalController(modalEl, controller) {
  modalControllers.set(modalEl, controller);
}

export function getModalController(modalEl) {
  return modalControllers.get(modalEl);
}