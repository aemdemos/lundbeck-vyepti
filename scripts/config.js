
// Function for the brightcove script tag integration for the video rendering
export function getBrightcoveScriptTag(accountId, playerId) {
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${accountId}/${playerId}_default/index.min.js`;
  script.async = true;
  document.body.append(script);
}

//Code Starts for locator block configuration
export const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyC9EwXy0QjV2u1LR0PrKNNR_lMJHr4dTGI';
export const DEFAULT_API_ENDPOINT = 'https://www.vyepti.com/api/picllocator';
export const DEFAULT_DISTANCES = ['5', '10', '25', '50','100', '200', '400'];
 
export const FACILITY_TYPES = [
  { key: 'infusionNetwork', label: 'VYEPTI Infusion Network', description: 'Filter by providers in the VYEPTI Infusion Network. These providers have partnered with Lundbeck to enhance the VYEPTI infusion experience by providing patient support, educational information, and coverage assistance.' },
  { key: 'nonHospital', label: 'Non–hospital-based locations', description: 'Remove hospital-based locations from search results. These locations can also include facilities associated with a hospital but located off-site.' },
  { key: 'homeInfusion', label: 'Home Infusion', description: 'A service provider who can facilitate infusions outside of the clinic, such as home or work.' },
];
 
/**
* Parses a table/div-based DOM structure into a configuration object.
*/
export function readConfig(block) {
  const rows = block.querySelectorAll(':scope > div');
  const config = {};
  rows.forEach((row) => {
    const cells = row.querySelectorAll(':scope > div');
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase().replace(/\s+/g, '-');
      const value = cells[1].textContent.trim();
      if (key && value) config[key] = value;
    }
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
//Code Ends for locator block configuration