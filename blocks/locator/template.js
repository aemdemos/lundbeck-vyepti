import {
  DEFAULT_DISTANCES,
  FACILITY_TYPES,
  readConfig,
  parseBool
} from '../../scripts/config.js';

export function createSearchForm(settings) {
  const form = document.createElement('div');
  form.className = 'locator-search';

  const distanceOptions = settings.distances
    .map((d) => {
      const isDefault = String(d) === '25' ? ' selectedMiles' : '';
      return `<div data-value="${d}" class="item${isDefault}">${d} miles</div>`;
    })
    .join('');

  let filtersHtml = '';
  if (!settings.showFilters) {
    filtersHtml = `
      <div class="custom-dropdown filter-block">
        <div class="select">Show only: <span class="select-icon"></span></div>
        <div class="dropdown-items selectHide">
          ${FACILITY_TYPES.map((f) => `
            <div class="item">
              <input type="checkbox" name="${f.key}" value="${f.key}">
              <span class="label-text">${f.label}</span>
              <span class="child-info">${f.description}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  form.innerHTML = `
    <p class="locator-required">*Required field</p>
    <div class="locator-form">
      <div class="locator-input-group">
        <label for="locator-zip">From city, state, or ZIP code*</label>
        <input type="text" id="locator-zip" placeholder="" required>
      </div>
      <div class="locator-select-group mile-block" data-value="25">
        <div class="select">25 miles <span class="select-arrow"></span></div>
        <div id="locator-distance" class="dropdown-items selectHide">${distanceOptions}</div>
      </div>
      ${filtersHtml}
      <button class="locator-search-btn" type="button">SEARCH</button>
    </div>
    <p class="error selectHide">Please enter a valid city, state, or ZIP code, and try again.</p>
  `;
  return form;
}

export function createFacilityCards(settings) {
  const { heading, facilityCards } = settings;

   // Only keep enabled cards
  const enabledCards = facilityCards.filter((item) => item.enabled);

  // If no cards are enabled, don't render the section
  if (enabledCards.length === 0) {
    return document.createDocumentFragment();
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'facility-types';

  const title = document.createElement('h2');
  title.textContent = heading;

  wrapper.append(title);

  const list = document.createElement('div');
  list.className = 'facility-types-list';

  enabledCards.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'facility-card';

    card.innerHTML = `
      <img src="${item.icon}" alt="${item.description}">
      <span>${item.description}</span>
    `;

    list.append(card);
  });

  wrapper.append(list);

  return wrapper;
}

export function createMapContainer() {
  const container = document.createElement('div');
  container.className = 'locator-map-results';
  container.innerHTML = `
    <div class="locator-map" id="locator-map"></div>
    <div class="locator-results">
      <h2 class="locator-welcome-title">Welcome</h2>
      <p class="locator-welcome-text">Please enter your information to begin your search.</p>
    </div>
  `;
  return container;
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

  let html = `<h2 class="locator-results-title">${results.length} location${results.length !== 1 ? 's' : ''} found</h2>`;
  html += '<ul class="locator-results-list">';

  results.forEach((result, index) => {
    const name = result.name || result.facilityName || `Location ${index + 1}`;
    const address = result.address || result.streetAddress || '';
    const city = result.city || '';
    const state = result.state || '';
    const zip = result.zip || result.zipCode || '';
    const phone = result.phone || result.phoneNumber || '';
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');

    const networkBadge = settings.showHcpData && result.inNetwork
      ? '<span class="locator-network-badge">VYEPTI Infusion Network</span>'
      : '';

    html += `
      <li class="locator-result-item">
        <h3>${name}</h3>
        ${networkBadge}
        <p class="locator-result-address">${fullAddress}</p>
        ${phone ? `<p class="locator-result-phone"><a href="tel:${phone}">${phone}</a></p>` : ''}
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