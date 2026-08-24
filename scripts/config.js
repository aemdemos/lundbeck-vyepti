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


 
