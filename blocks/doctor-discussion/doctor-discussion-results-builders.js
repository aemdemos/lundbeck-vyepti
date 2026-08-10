import {
  createEl, getAnswer, PDF_ERROR_ELEMENT_ID, PDF_POPUP_BLOCKED_ELEMENT_ID,
} from './doctor-discussion-utils.js';

// Build the plain "Results" banner header.
export function buildResultsHeader() {
  return createEl('div', { className: 'dg-header-wrapper dg-results-header-wrapper' },
    createEl('div', { className: 'dg-header dg-results-header' },
      createEl('h2', { className: 'dg-header-title dg-results-header-title' }, 'Results'),
    ),
  );
}

/**
 * Collect every checkbox/radio field across every step, in order, paired
 * with the display text to use as its results-screen question.
 */
export function getResultsQuestions(steps) {
  const questions = [];
  steps.forEach((step) => {
    step.fields.forEach((f) => {
      if (f.type === 'checkbox' || f.type === 'radio') {
        questions.push({ ...f, resultsLabel: f.label || step.title });
      }
    });
  });
  return questions;
}

// Format a single field's stored answer as display text.
export function formatAnswer(fieldDef, answers) {
  if (fieldDef.type === 'checkbox') {
    return (getAnswer(answers, fieldDef.name) || []).join(', ');
  }
  return getAnswer(answers, fieldDef.name) || '';
}

// Builds "{Name}'s personalized migraine discussion guide", falling back to "My..." when no name was entered.
export function formatResultsHeading(answers, nameFieldName) {
  const name = nameFieldName ? (getAnswer(answers, nameFieldName) || '').trim() : '';
  return name ? `${name}'s personalized migraine discussion guide` : 'My personalized migraine discussion guide';
}

// Prefixes a question with the entered name (e.g. "Rohan... How does...") when the field is flagged for it and a name was given.
export function personalizeResultsLabel(fieldDef, answers, nameFieldName) {
  if (!fieldDef.personalizeWithName || !nameFieldName) return fieldDef.resultsLabel;
  const name = (getAnswer(answers, nameFieldName) || '').trim();
  return name ? `${name}... ${fieldDef.resultsLabel}` : fieldDef.resultsLabel;
}

// Build the numbered "question / Your Answer" list shown on the results screen.
export function buildResultsList(steps, answers, nameFieldName) {
  const questions = getResultsQuestions(steps);
  const list = createEl('ol', { className: 'dg-results-list' });

  questions.forEach((f) => {
    const value = formatAnswer(f, answers);
    const questionLabel = personalizeResultsLabel(f, answers, nameFieldName);
    list.append(
      createEl('li', { className: 'dg-results-item' },
        createEl('p', { className: 'dg-results-question' }, questionLabel),
        createEl('p', { className: 'dg-results-answer' },
          createEl('span', { className: 'dg-results-answer-label' }, 'Your Answer: '),
          createEl('span', { className: 'dg-results-answer-value' }, value || '—'),
        ),
      ),
    );
  });

  return list;
}

// Build the Download/Email buttons, plus hidden error and popup-blocked fallback messages.
export function buildResultsActions() {
  const downloadBtn = createEl('button', { type: 'button', className: 'dg-results-download-btn' },
    createEl('span', {}, 'Download'),
    createEl('span', { className: 'dg-download-icon', 'aria-hidden': 'true' }),
  );
  const emailBtn = createEl('button', { type: 'button', className: 'dg-results-email-btn' },
    createEl('span', {}, 'Email'),
    createEl('span', { className: 'dg-email-icon', 'aria-hidden': 'true' }),
  );
  const pdfErrorMsg = createEl('p', {
    id: PDF_ERROR_ELEMENT_ID,
    className: 'dg-pdf-error-msg d-none',
    role: 'alert',
  }, 'Something went wrong generating your PDF. Please try again.');

  // Shown if the browser blocks the auto-opened tab. href/download are
  // set by the PDF controller; clicking is a real gesture, so it works.
  const popupBlockedLink = createEl('a', {
    href: '#',
    className: 'dg-pdf-popup-blocked-link',
  }, 'Your PDF is ready — tap here to open it');
  const popupBlockedMsg = createEl('div', {
    id: PDF_POPUP_BLOCKED_ELEMENT_ID,
    className: 'dg-pdf-popup-blocked d-none',
    role: 'status',
  },
    createEl('p', { className: 'dg-pdf-popup-blocked-text' },
      "Your browser blocked the automatic download. Your PDF is ready — use the link below to open it:"),
    popupBlockedLink,
  );

  const wrapper = createEl('div', { className: 'dg-results-actions' },
    downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg);
  return {
    wrapper, downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg,
  };
}

// Build the closing "tips for your next appointment" callout, including the VYEPTI CONNECT link in the last bullet.
export function buildResultsTips() {
  return createEl('div', { className: 'dg-results-tips' },
    createEl('p', { className: 'dg-results-tips-heading' },
      "You're ready to talk with your doctor about migraine. Here are some tips for your next appointment"),
    createEl('ul', { className: 'dg-results-tips-list' },
      createEl('li', {}, 'Bring a printout or email of this guide'),
      createEl('li', {}, 'Bring a list of your past and current medications'),
      createEl('li', {}, 'Consider tracking the frequency of your migraine attacks'),
      createEl('li', {},
        'If you and your doctor think VYEPTI may be right for you, ask about insurance coverage and ',
        createEl('a', {
          href: 'https://www.vyepti.com/financial-assistance',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'dg-results-vyepti-link',
        }, 'VYEPTI CONNECT®'),
      ),
    ),
  );
}