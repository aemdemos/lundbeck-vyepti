/* global google */
import { loadScript } from '../../scripts/aem.js';
import { 
  DEFAULT_DISTANCES, 
  FACILITY_TYPES, 
  readConfig, 
  parseBool 
} from '../../scripts/config.js';

let map;
let markers = [];

/**
 * Renders the HTML templates for the search fields and form items
 */
function createSearchForm(settings) {
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
  `;
  return form;
}

function createMapContainer() {
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

function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}

function addMarker(location, title, info) {
  const marker = new google.maps.Marker({ position: location, map, title });
  const infoWindow = new google.maps.InfoWindow({ content: info });
  marker.addListener('click', () => infoWindow.open(map, marker));
  markers.push(marker);
}

/**
 * Handles the view output logic for API matches
 */
function renderResults(results, resultsContainer, settings) {
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

async function geocodeZip(zip) {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: zip }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        reject(new Error(`Geocode failed: ${status}`));
      }
    });
  });
}

async function searchLocations(zip, distance, settings, activeFilters) {
  const coords = await geocodeZip(zip);
  map.setCenter(coords);
  map.setZoom(10);

  try {
    const params = new URLSearchParams({
      latitude: coords.lat,
      longitude: coords.lng,
      radius: distance,
      showIC: settings.showInfusionCenters,
      showHCPData: settings.showHcpData,
    });
    activeFilters.forEach((f) => params.append('filter', f));

    const response = await fetch(`${settings.apiEndpoint}?${params}`);
    if (response.ok) {
      const data = await response.json();
      return data.results || data.providers || data || [];
    }
  } catch (e) {
    console.warn('Locator API call failed:', e);
  }

  return [];
}

/**
 * Reusable Custom Dropdown Component Initializer
 */
function initCustomDropdown(dropdownContainer, type = 'select', onSelectCallback = null) {
  if (!dropdownContainer) return null;

  const selectTrigger = dropdownContainer.querySelector('.select');
  const itemsContainer = dropdownContainer.querySelector('.dropdown-items');

  if (!selectTrigger || !itemsContainer) return null;

  // Click handler to open/close menu options panels
  selectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    itemsContainer.classList.toggle('selectHide');
    selectTrigger.classList.toggle('active');
  });

  // Inner elements selection behavior routing logic
  itemsContainer.addEventListener('click', (e) => {
    e.stopPropagation();

    if (type === 'select') {
      const targetItem = e.target.closest('.item');
      if (!targetItem) return;

      itemsContainer.querySelectorAll('.item').forEach((item) => item.classList.remove('selectedMiles'));
      targetItem.classList.add('selectedMiles');

      const textValue = targetItem.textContent;
      const dataValue = targetItem.getAttribute('data-value');

      selectTrigger.innerHTML = `${textValue} <span class="select-arrow"></span>`;
      dropdownContainer.setAttribute('data-value', dataValue);

      itemsContainer.classList.add('selectHide');
      selectTrigger.classList.remove('active');

      if (onSelectCallback) onSelectCallback(dataValue);
    } 
    else if (type === 'checkbox') {
      const isCheckbox = e.target.matches('input[type="checkbox"]');
      const isLabel = e.target.matches('.label-text');

      if (!isCheckbox && !isLabel) return;

      const itemRow = e.target.closest('.item');
      const checkbox = itemRow?.querySelector('input[type="checkbox"]');

      if (isLabel && checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Interface utility signature for cleaner execution closures
  return {
    close: () => {
      itemsContainer.classList.add('selectHide');
      selectTrigger.classList.remove('active');
    }
  };
}

/**
 * Default Component Export Definition Core Function
 */
export default async function decorate(block) {
  const config = readConfig(block);

  const settings = {
    apiKey: config['google-maps-api-key'] || DEFAULT_GOOGLE_MAPS_API_KEY,
    apiEndpoint: config['api-endpoint'] || DEFAULT_API_ENDPOINT,
    showInfusionCenters: parseBool(config['show-infusion-centers'], true),
    showHcpData: parseBool(config['show-hcp-data'], false),
    showFilters: parseBool(config['show-filters'], false),
    distances: config.distances
      ? config.distances.split(',').map((d) => d.trim()).filter(Boolean)
      : DEFAULT_DISTANCES,
  };

  block.textContent = '';
  block.append(createSearchForm(settings));
  block.append(createMapContainer());

  await loadScript(`https://maps.googleapis.com/maps/api/js?key=${settings.apiKey}&libraries=places`);

  map = new google.maps.Map(document.getElementById('locator-map'), {
    center: { lat: 37.09, lng: -95.71 },
    zoom: 4,
    mapTypeControl: false,
    streetViewControl: false,
    zoomControl: true, 
  });

  const searchBtn = block.querySelector('.locator-search-btn');
  const zipInput = block.querySelector('#locator-zip');
  const resultsContainer = block.querySelector('.locator-results');
  const zipLabel = block.querySelector('label[for="locator-zip"]');
  const mileBlock = block.querySelector('.mile-block');
  const filterBlock = block.querySelector('.filter-block');

  // Initialize Custom Dropdowns cleanly using the shared logic engine
  const distanceDropdownManager = initCustomDropdown(mileBlock, 'select');
  const filterDropdownManager = initCustomDropdown(filterBlock, 'checkbox');

  async function handleSearch() {
    const zip = zipInput.value.trim();
    if (!zip) return;

    searchBtn.textContent = 'SEARCHING...';
    searchBtn.disabled = true;
    clearMarkers();

    const activeFilters = Array.from(block.querySelectorAll('.dropdown-items input:checked'))
      .map((cb) => cb.value);

    const selectedDistance = mileBlock?.getAttribute('data-value') || '25';

    try {
      const results = await searchLocations(zip, selectedDistance, settings, activeFilters);
      renderResults(results, resultsContainer, settings);
    } catch (e) {
      resultsContainer.innerHTML = '<p class="locator-error">Unable to search. Please check your input and try again.</p>';
    }

    searchBtn.textContent = 'SEARCH';
    searchBtn.disabled = false;
  }

  // Handle CSS class toggles on floating element input labels
  if (zipInput && zipLabel) {
    zipInput.addEventListener('focus', () => zipLabel.classList.add('focus'));
    zipInput.addEventListener('blur', () => {
      if (!zipInput.value.trim()) zipLabel.classList.remove('focus');
    });
  }

  // Unified global event handling listener closure
  const handleGlobalOutsideClick = () => {
    distanceDropdownManager?.close();
    filterDropdownManager?.close();
  };
  document.addEventListener('click', handleGlobalOutsideClick);

  // Core Event Registration Triggers
  searchBtn.addEventListener('click', handleSearch);
  zipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
}