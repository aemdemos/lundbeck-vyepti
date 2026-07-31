import { lockBodyScroll, unlockBodyScroll } from './doctor-discussion-modal-utils.js';

/**
 * Initializes and manages the Thank You modal.
 *
 * @param {Object} config
 * @param {string} [config.modalId='dg-thankyou-modal']
 * @param {string} [config.openEventName='dg:email-success']
 * @returns {{ open: Function, close: Function }}
 */
export function createThankYouModalController({
  modalId = 'dg-thankyou-modal',
  openEventName = 'dg:email-success',
} = {}) {
  const modal = document.getElementById(modalId);

  // Closes modal if user clicks the backdrop (the .modal wrapper itself)
  // outside the .modal-dialog content.
  function handleOutsideClick(event) {
    const modalDialog = modal.querySelector('.modal-dialog');
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  }
  function handleEscape(event) {
    if (event.key === 'Escape') close();
  }

  // Opens modal. 
  function open() {
    if (!modal) return;
    modal.classList.add('show');
    modal.style.display = 'flex';

    lockBodyScroll();

    setTimeout(() => {
      document.body.addEventListener('click', handleOutsideClick);
    }, 0);
    document.addEventListener('keydown', handleEscape);
  }

  // Closes modal and unlocks page scroll.
  function close() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.style.display = 'none';

    unlockBodyScroll();

    document.body.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscape);
  }

  // The only way this modal ever opens: a successful email submission.
  document.addEventListener(openEventName, open);
  return { open, close };
}