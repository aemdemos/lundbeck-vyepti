// Function for the brightcove script tag integration for the video rendering
export function getBrightcoveScriptTag(accountId, playerId) {
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${accountId}/${playerId}_default/index.min.js`;
  script.async = true;
  document.body.append(script);
}

// Code Starts for locator block configuration

/**
* Parses a table/div-based DOM structure into a configuration object.
*/
export function readConfig(block) {
  const rows = block.querySelectorAll(':scope > div');
  // Use a plain dictionary with no prototype to reduce prototype pollution risks
  const config = Object.create(null);
  // Explicit whitelist of acceptable configuration keys to prevent object injection
  const ALLOWED_KEYS = new Set([
    'google-maps-api-key',
    'distances',
  ]);
  // Explicit blacklist of dangerous keys to avoid prototype pollution attacks
  const DISALLOWED_KEYS = new Set(['__proto__', 'constructor']);

  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');

    if (cells.length < 2) return;

    const key = cells[0].textContent
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-');

    // Reject keys that are not in the explicit whitelist
    if (!ALLOWED_KEYS.has(key)) return;

    // Additional sanity check: Only accept simple hyphenated alphanumerics starting with a letter
    // and ensure the key is not one of the dangerous keys
    if (!/^[a-z][a-z0-9-]*$/.test(key) || DISALLOWED_KEYS.has(key)) return;

    const value = cells[1];
    const image = value.querySelector('img');

    // Prefer single-line conditional to avoid unexpected multiline parsing
    config[key] = image ? image.src : value.textContent.trim();
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

export const UGC_CONFIGS = Object.freeze({
  UGC_GREY_CAPTCHA_KEY: '',
  UGC_GOOGLE_RECAPTCHA_SCRIPT: 'https://www.google.com/recaptcha/api.js',
  UGC_TMSDK_SCRIPT: '',
  UGC_EMBED_SCRIPT: '',
});

export function getSettings(locator) {
  const config = readConfig(locator);

  return {
    apiKey: config['google-maps-api-key'],

    distances: config.distances
      ? config.distances.split(',').map((d) => d.trim())
      : DEFAULT_DISTANCES,
  };
}


 
