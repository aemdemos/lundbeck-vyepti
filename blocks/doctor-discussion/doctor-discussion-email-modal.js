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
export default function createEmailModalController({ modalId = "mq-modal", formId = "emailForm", quizData = {} } = {}) {
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

  // Forward-declared: close() and handleOutsideClick() call each other, so
  // close() needs this before handleOutsideClick is assigned below.
  let handleOutsideClick;

  // Closes modal, unlocks scroll, resets form, cleans up listeners.
  // Defined above handleOutsideClick since the two reference each other.

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

  // Closes modal if user clicks the backdrop (the .modal wrapper itself)
  // outside the .modal-dialog content.

  handleOutsideClick = (event) => {
    const modalDialog = modal.querySelector(".modal-dialog");
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  };

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

  /**
   * Validates form fields and toggles invalid styling/error messages.
   * Extracted from handleSubmit to keep its complexity low.
   *
   * @returns {{ isValid: boolean, firstNameInput: Element, lastNameInput: Element,
   *             emailInput: Element, consentInput: Element }}
   */
  function validateFormFields() {
    const firstNameInput = document.getElementById("FirstName");
    const lastNameInput = document.getElementById("LastName");
    const emailInput = document.getElementById("Email");
    const consentInput = document.getElementById("Consent");

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

    const isValid = isFirstNameValid && isLastNameValid && isEmailValid && isConsentValid;

    return {
      isValid, firstNameInput, lastNameInput, emailInput, consentInput,
    };
  }

  /**
   * Validates inputs and posts combined quiz payload + user data to API.
   *
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const errorMsg = modal.querySelector(".error-message");
    const {
      isValid, firstNameInput, lastNameInput, emailInput, consentInput,
    } = validateFormFields();

    if (!isValid) return;

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
      } else if (errorMsg) {
        errorMsg.classList.remove("d-none");
      }
      } catch (err) {
        document.dispatchEvent(new CustomEvent("dg:email-error", { bubbles: true, detail: { error: err } }));
        if (errorMsg) errorMsg.classList.remove("d-none");
      }
  }

  return { open, close, handleSubmit };
}