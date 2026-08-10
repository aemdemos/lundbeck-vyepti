
// Function for the brightcove script tag integration for the video rendering
export default function getBrightcoveScriptTag(accountId, playerId) {
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${accountId}/${playerId}_default/index.min.js`;
  script.async = true;
  document.body.append(script);
}

// Doctor Discussion Guide API Configuration
export const DOCTOR_DISCUSSION_CONFIGS = {
  // Real API endpoint used to generate and download the guide as a PDF.
  PDF_DOWNLOAD_API_URL: 'https://vyepti-stage.d.lundbeckus.com/api/doctordiscussionguide',
  // Real API endpoint used to email the guide to the patient.
  EMAIL_SUBMIT_API_URL: 'https://vyepti-stage.d.lundbeckus.com/api/doctordiscussionguide',
};
