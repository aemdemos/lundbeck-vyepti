import {
  DEFAULT_DISTANCES,
  FACILITY_TYPES,
  readConfig,
  parseBool
} from '../../scripts/config.js';
import { addMarker } from './map.js';


function getFacilityIcon(result) {
  const cominedImage = 'https://www.vyepti.com/etc.clientlibs/vyepti-picl/clientlibs/clientlib-site/resources/icons/Combined-Image.svg';
  const iconHome = 'https://www.vyepti.com/etc.clientlibs/vyepti-picl/clientlibs/clientlib-site/resources/icons/icon_home_40px.svg';
  const iconHospital = 'https://www.vyepti.com/etc.clientlibs/vyepti-picl/clientlibs/clientlib-site/resources/icons/icon_hospital_40px.svg';

  if (
    result.preferredIc === 'TRUE' &&
    result.homeInfusionFlag === 'TRUE' &&
    result.chairsFlag === 'TRUE'
  ) {
    return cominedImage;
  }
  if (
    result.preferredIc === 'TRUE' &&
    result.homeInfusionFlag === 'TRUE' &&
    result.chairsFlag === 'FALSE'
  ) {
    return iconHome;
  }
  return iconHospital;
}


/**
 * Handles the view output logic for API matches
 */
export function renderResults(results, resultsContainer, settings) {
  if (!results || results.length === 0) {
    resultsContainer.innerHTML = `
      <h2 class="locator-no-results">No results found</h2>
      <p>Try expanding your search radius or entering a different location.</p>
    `;
    return;
  }

  let html = `<div class="locator-title-wrap"><h2 class="locator-title"> Results (${results.length} total results)</h2>
  <p class="locator-result-disclaimer">Results outlined in<span class="red-color"><b> red </b></span>are part of the VYEPTI Infusion  Network. VYEPTI infusions are not limited
     to this network—patients can choose to receive their VYEPTI infusion from any provider based on convenience or insurance coverage.</p>
  </div>`;
  html += '<ul class="locator-results-list">';

  results.forEach((result, index) => {
    const name = result.name || result.facilityName || `Location ${index + 1}`;
    const address = result.address || result.streetAddress || '';
    const city = result.city || '';
    const state = result.state || '';
    const zip = result.zip || result.zipCode || '';
    const phone = result.phone || result.phoneNumber || '';
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
    const gradientClass = result.preferredIc === 'TRUE' ? 'gradientBorder' : '';
    const typeText = result.type || '';
    const miles = '';
    const website = result.website || '';

    const networkBadge = settings.showHcpData && result.inNetwork
      ? '<span class="locator-network-badge">VYEPTI Infusion Network</span>'
      : '';

    html += `
      <li class="locator-result-item ${gradientClass}">
          <div class="locator-result-item-inner ">
              <div class="locator-result-left"><span class="indexNo">${index + 1}</span></div>
              <div class="locator-result-right">
              <div class="locator-result-title"> 
                <h3>${name}</h3>
                <img src="${getFacilityIcon(result)}" alt="facilty-Icon"/>
              </div>
              
              ${networkBadge}
              <p class="typeText" >${typeText} </p>
              <p class="milesText">0.9 miles away</p>
              <p class="locator-result-address">${fullAddress}</p>
              <div class="locate-result-phone-wrap">
                ${phone ? `<p class="locator-result-phone"><a href="tel:${phone}"><span>Tel:</span>${phone}</a></p>` : ''}
                <a href="${website} target="_blank" class="weblink">Visit website</a>
              </div>
        </div>
          </div>
      </li>
    `;

    if (result.latitude && result.longitude) {
      const pos = { lat: parseFloat(result.latitude), lng: parseFloat(result.longitude) };
      addMarker(pos, name, `<strong>${name}</strong><br>${fullAddress}`);
    }
  });

  html += '</ul>';
  resultsContainer.innerHTML = html;
}