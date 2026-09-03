import { parseDoctorDiscussionConfig, fetchEmailModalConfigFromSheet } from './doctor-discussion-sheet.js';
import { DEFAULT_EMAIL_MODAL_CONFIG } from './doctor-discussion-email-config.js';
import enhanceAsWizard from './doctor-discussion-form-wizard.js';

// EDS entry point: reads block config (endpoints, thank-you content), then layers
// step-paging/exclusivity/results on top of form.js's rendered <form> — no core edits.
export default async function decorate(block) {
  const config = parseDoctorDiscussionConfig(block);

 // Email Modal copy is authored via a SEPARATE "Email Modal Sheet url" doc (see
// fetchEmailModalConfigFromSheet()); falls back to defaults if unauthored/missing.
// Must stay separate from "Doctor Discussion Sheet url": form.js's createForm()
// fetches that URL as-is (must end in ".json", no query params) to build fields,
// so merging the two would require editing form.js, which is out of scope.
  config.emailModalConfig = (await fetchEmailModalConfigFromSheet(config.emailModalSheetUrl)) || DEFAULT_EMAIL_MODAL_CONFIG;

  try {
    const module = await import('../form/form.js');
    if (typeof module.default === 'function') {
      await module.default(block);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load form block:', error);
    return;
  }

  const form = block.querySelector('form');
  if (!form) return;

  enhanceAsWizard(block, form, config);
}