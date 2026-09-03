import {
  createEl, getAnswer, capitalizeName, PDF_ERROR_ELEMENT_ID, PDF_POPUP_BLOCKED_ELEMENT_ID,
} from './doctor-discussion-utils.js';
import { renderInlineLinks } from './doctor-discussion-markdown.js';

// ---------------------------------------------------------------------------
// Results-screen CTA/tips/actions defaults, used when unauthored (see
// parseDoctorDiscussionConfig()/showResults()) — same fallback pattern as
// pdfUrl/emailUrl. Entries may carry a "[label](url)" link (see
// renderInlineLinks())
// ---------------------------------------------------------------------------

export const DEFAULT_RESULTS_CTA_HEADING = 'Talk to your doctor and see if VYEPTI might be right for you';

export const DEFAULT_RESULTS_TIPS_HEADING = "You're ready to talk with your doctor about migraine. Here are some tips for your next appointment";

export const DEFAULT_RESULTS_TIPS = [
  'Bring a printout or email of this guide',
  'Bring a list of your past and current medications',
  'Consider tracking the frequency of your migraine attacks',
  'If you and your doctor think VYEPTI may be right for you, ask about insurance coverage and [VYEPTI CONNECT®](https://www.vyepti.com/financial-assistance)',
];

// The copy line shown above the Download/Email buttons.
export const DEFAULT_RESULTS_DOWNLOAD_DESCRIPTION = 'Download or email doctor discussion guide.';

// The italic caption shown below the Download/Email buttons.
export const DEFAULT_RESULTS_NOTE = 'Note: if you navigate away from this screen before downloading, you will lose your results.';

export const DEFAULT_DOWNLOAD_BUTTON_LABEL = 'Download';
export const DEFAULT_EMAIL_BUTTON_LABEL = 'Email';

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

// Builds "{Name}'s personalized..." heading, falling back to "My..." if
// no name entered. Name is title-cased for display via capitalizeName().
export function formatResultsHeading(answers, nameFieldName) {
  const name = nameFieldName ? capitalizeName(getAnswer(answers, nameFieldName)) : '';
  return name ? `${name}'s personalized migraine discussion guide` : 'My personalized migraine discussion guide';
}

// Prefixes a question with the entered name 
// when the field is flagged for it and a name was given. Uses the same
// display-only capitalization as formatResultsHeading() above.
export function personalizeResultsLabel(fieldDef, answers, nameFieldName) {
  if (!fieldDef.personalizeWithName || !nameFieldName) return fieldDef.resultsLabel;
  const name = capitalizeName(getAnswer(answers, nameFieldName));
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

// ---------------------------------------------------------------------------
// Button icon helper — shared by the results Download/Email buttons and
// the Retake button below.
// ---------------------------------------------------------------------------

/**
 * Builds a button's icon: an authored URL renders as an <img>, otherwise
 * falls back to a <span> using the existing CSS icon on `fallbackClassName`.
 *
 * @param {string} fallbackClassName - CSS class carrying the default
 *                                     background-image icon.
 * @param {string|null} [iconUrl] - authored icon URL, or null/omitted.
 * @returns {HTMLElement}
 */
function buildButtonIcon(fallbackClassName, iconUrl = null) {
  if (iconUrl) {
    return createEl('img', {
      className: fallbackClassName, src: iconUrl, alt: '', 'aria-hidden': 'true',
    });
  }
  return createEl('span', { className: fallbackClassName, 'aria-hidden': 'true' });
}

// Builds the Download/Email buttons plus hidden error/popup-blocked
// messages. Labels/icons are authored overrides, defaulting to hardcoded
// text/CSS icons when unauthored.
//
// @param {string} [downloadLabel]
// @param {string} [emailLabel]
// @param {string|null} [downloadIconUrl]
// @param {string|null} [emailIconUrl]
export function buildResultsActions(
  downloadLabel = DEFAULT_DOWNLOAD_BUTTON_LABEL,
  emailLabel = DEFAULT_EMAIL_BUTTON_LABEL,
  downloadIconUrl = null,
  emailIconUrl = null,
) {
  const downloadBtn = createEl('button', { type: 'button', className: 'dg-results-download-btn' },
    createEl('span', {}, downloadLabel),
    buildButtonIcon('dg-download-icon', downloadIconUrl),
  );
  const emailBtn = createEl('button', { type: 'button', className: 'dg-results-email-btn' },
    createEl('span', {}, emailLabel),
    buildButtonIcon('dg-email-icon', emailIconUrl),
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

// Renders an authored value (Node[] from parseRichText()/parseTipsList(),
// or a markdown string) into DOM nodes, adding target/rel (and an optional
// class) to any link — used across all results-screen authorable fields.
//
// @param {Node[]|string} content
// @param {string} [linkClassName]
// @returns {Node[]}
export function renderRichContent(content, linkClassName) {
  if (Array.isArray(content)) {
    content.forEach((node) => {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'a') {
        if (linkClassName) node.classList.add(linkClassName);
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
    });
    return content;
  }
  return renderInlineLinks(content, linkClassName);
}

export const DEFAULT_RETAKE_LABEL = 'Retake';

/**
 * Builds the Retake button's icon via the shared buildButtonIcon() helper —
 * an authored URL renders as an <img>, else falls back to the CSS icon.
 *
 * @param {string|null} [iconUrl]
 * @returns {HTMLElement}
 */
export function buildRetakeIcon(iconUrl = null) {
  return buildButtonIcon('dg-retake-icon', iconUrl);
}

/**
 * Builds the Retake button's markup; `label`/`iconUrl` are authored
 * overrides, defaulting to hardcoded text/CSS icon. Caller wires the click.
 *
 * @param {string} [label]
 * @param {string|null} [iconUrl]
 * @returns {HTMLButtonElement}
 */
export function buildRetakeButton(label = DEFAULT_RETAKE_LABEL, iconUrl = null) {
  return createEl('button', { type: 'button', className: 'dg-results-retake-btn' },
    createEl('span', {}, label),
    buildRetakeIcon(iconUrl));
}

// Builds the closing tips callout. `tipsHeading`/`tips` are authored
// overrides (default to DEFAULT_RESULTS_*); each tip is a Node[] or
// markdown string, rendered via renderRichContent() to preserve links.
//
// @param {Node[]|string} [tipsHeading]
// @param {(Node[]|string)[]} [tips]
export function buildResultsTips(tipsHeading = DEFAULT_RESULTS_TIPS_HEADING, tips = DEFAULT_RESULTS_TIPS) {
  return createEl('div', { className: 'dg-results-tips' },
    createEl('p', { className: 'dg-results-tips-heading' },
      ...renderRichContent(tipsHeading, 'dg-results-vyepti-link')),
    createEl('ul', { className: 'dg-results-tips-list' },
      ...tips.map((tip) => createEl(
        'li',
        {},
        ...renderRichContent(tip, 'dg-results-vyepti-link'),
      )),
    ),
  );
}