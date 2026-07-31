import { lockBodyScroll, unlockBodyScroll } from './doctor-discussion-modal-utils.js';

/**
 * Initializes and manages the Email Popup Modal.
 *
 * @param {Object} config
 * @param {string} config.modalId - Modal element ID (e.g., 'mq-modal')
 * @param {string} config.formId - Form element ID (e.g., 'emailForm')
 * @param {Object} config.quizData - Quiz payload object to merge with form input
 * @returns {{ open: Function, close: Function, handleSubmit: Function }}
 */
export function createEmailModalController({ modalId = "mq-modal", formId = "emailForm", quizData = {} } = {}) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);

  // Helper to clear label focus styling on form reset.

  function clearLabelFocus(inputId) {
    const input = document.getElementById(inputId);
    if (input && input.labels && input.labels[0]) {
      input.labels[0].classList.remove("focus");
    }
  }

  // Prepares inner container states prior to opening modal.

  function resetModalState() {
    const formContainer = modal.querySelector(".patient-form-container");
    const errorMsg = modal.querySelector(".error-message");

    if (formContainer) formContainer.classList.remove("d-none");
    if (errorMsg) errorMsg.classList.add("d-none");

    const firstNameErr = document.getElementById("FirstName-error");
    const lastNameErr = document.getElementById("LastName-error");
    const emailErr = document.getElementById("Email-error");
    const consentErr = document.getElementById("Consent-error");
    if (firstNameErr) firstNameErr.style.display = "none";
    if (lastNameErr) lastNameErr.style.display = "none";
    if (emailErr) emailErr.style.display = "none";
    if (consentErr) consentErr.style.display = "none";
  }

  // Closes modal if user clicks the backdrop (the .modal wrapper itself)
  // outside the .modal-dialog content.

  function handleOutsideClick(event) {
    const modalDialog = modal.querySelector(".modal-dialog");
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  }

  // Opens modal. 

  function open() {
    if (!modal) return;

    resetModalState();

    modal.classList.add("show");
    modal.style.display = "flex";

    lockBodyScroll();

    // Listen for outside clicks
    setTimeout(() => {
      document.body.addEventListener("click", handleOutsideClick);
    }, 0);
  }

  // Closes modal, unlocks page scroll, resets form, and cleans event listeners.

  function close() {
    if (!modal) return;

    modal.classList.remove("show");
    modal.style.display = "none";

    unlockBodyScroll();

    // Reset form and focus styles
    if (form) form.reset();
    clearLabelFocus("FirstName");
    clearLabelFocus("LastName");
    clearLabelFocus("Email");

    // Cleanup click-outside listener
    document.body.removeEventListener("click", handleOutsideClick);
  }

  /**
   * Validates inputs and posts combined quiz payload + user data to API.
   *
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const firstNameInput = document.getElementById("FirstName");
    const lastNameInput = document.getElementById("LastName");
    const emailInput = document.getElementById("Email");
    const consentInput = document.getElementById("Consent");
    const errorMsg = modal.querySelector(".error-message");

    const firstNameErr = document.getElementById("FirstName-error");
    const lastNameErr = document.getElementById("LastName-error");
    const emailErr = document.getElementById("Email-error");
    const consentErr = document.getElementById("Consent-error");

    const isFirstNameValid = !!firstNameInput?.validity.valid;
    const isLastNameValid = !!lastNameInput?.validity.valid;
    const isEmailValid = !!emailInput?.validity.valid;
    const isConsentValid = !!consentInput?.checked;

    firstNameInput?.classList.toggle("is-invalid", !isFirstNameValid);
    lastNameInput?.classList.toggle("is-invalid", !isLastNameValid);
    emailInput?.classList.toggle("is-invalid", !isEmailValid);
    consentInput?.classList.toggle("is-invalid", !isConsentValid);

    if (firstNameErr) firstNameErr.style.display = isFirstNameValid ? "none" : "block";
    if (lastNameErr) lastNameErr.style.display = isLastNameValid ? "none" : "block";
    if (emailErr) emailErr.style.display = isEmailValid ? "none" : "block";
    if (consentErr) consentErr.style.display = isConsentValid ? "none" : "block";

    if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isConsentValid) return;

    // Build payload
    const payload = {
      ...quizData,
      FirstName: firstNameInput.value,
      LastName: lastNameInput.value,
      Email: emailInput.value,
      Consented: consentInput.checked,
      FormType: "mq",
    };

    // Close the email modal and hand off to the Thank You modal. 
    function handleSuccess() {
      if (errorMsg) errorMsg.classList.add("d-none");
      close();
      document.dispatchEvent(new CustomEvent("dg:email-success", {
        bubbles: true,
        detail: { quizData: payload },
      }));
    }

    const submitUrl = form.getAttribute("data-submit");

    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("API response error");

      const data = await response.json();

      if (data === true) {
        handleSuccess();
      } else {
        if (errorMsg) errorMsg.classList.remove("d-none");
      }
    } catch (err) {
      console.error("Email API failed:", err);
      if (errorMsg) errorMsg.classList.remove("d-none");
    }
  }

  return { open, close, handleSubmit };
}