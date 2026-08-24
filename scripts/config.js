// Function for the brightcove script tag integration for the video rendering
export function getBrightcoveScriptTag(accountId, playerId) {
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
  EMAIL_SUBMIT_API_URL: 'https://vyepti-stage.d.lundbeckus.com/api/sendemail',
  // Basic Auth credentials required by the stage API.
  // NOTE: known stage-only credential, intentionally committed here for now.
  // Follow-up: move Basic Auth to a server-side proxy and drop this from the
  // client bundle entirely (tracked separately) — do not treat this value as
  // a production secret; rotate before promoting to prod, and rotate sooner
  // if this repo is or becomes public, since it's now committed to history.
  PDF_DOWNLOAD_API_USERNAME: 'lundbeck-admin',
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords, secure-coding/no-hardcoded-credentials
  PDF_DOWNLOAD_API_PASSWORD: 'pH6Uuj5k9w8i',
  // Static values the sendemail API expects on every request.
  EMAIL_FORM_TYPE: 'ddg',
  EMAIL_JOBCODE: 'EPT-B-101058',
};
// Code Starts for locator block configuration

/**
* Parses a table/div-based DOM structure into a configuration object.
*/
export function readConfig(block) {
  const rows = block.querySelectorAll(':scope > div');
  const config = {};

  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');

    if (cells.length < 2) return;

    const key = cells[0].textContent
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    const value = cells[1];
    const image = value.querySelector('img');

    config[key] = image
      ? image.src
      : value.textContent.trim();
  });

  return config;
}

/**
* Evaluates truthy string configurations into booleans.
*/
export function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return /^(true|yes|1|on)$/i.test(value);
}
// Code Ends for locator block configuration

export const DEFAULT_DISTANCES = ['5', '10', '25', '50','100', '200', '400'];

export function getSettings(locator) {
  const config = readConfig(locator);

  return {
    apiKey: config['google-maps-api-key'],

    distances: config.distances
      ? config.distances.split(',').map((d) => d.trim())
      : DEFAULT_DISTANCES,
  };
}

// UGC Form Configurations
export const UGC_CONFIGS = {
  UGC_GREY_CAPTCHA_KEY: '6Lc7d2QkAAAAAP71NP_FtK8GM-YfsGIwzM7MRlIj',
  UGC_GOOGLE_RECAPTCHA_SCRIPT: 'https://www.google.com/recaptcha/api.js?render=6Lc7d2QkAAAAAP71NP_FtK8GM-YfsGIwzM7MRlIj',
  UGC_TMSDK_SCRIPT: 'https://d1v58eqpqo0kww.cloudfront.net/assets/sdk/2.35.11/tmsdk.min.js',
  UGC_EMBED_SCRIPT: 'https://d1v58eqpqo0kww.cloudfront.net/assets/sdk/2.35.11/embed.min.js',
};


 


