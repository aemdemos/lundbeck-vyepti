import { loadScript } from '../../scripts/aem.js';
import { getSettings } from '../../scripts/config.js';
import { createSearchForm, createMapContainer, createFacilityCards } from './template.js';
import { initCustomDropdown } from './dropdwon.js';
import { initializeMap, clearMarkers, addMarker, geocodeZip } from './map.js';
import { searchLocations } from './api.js';
import { getElements } from './ui.js';
import { registerEvents } from './events.js';
/* global google */
// export let map;
// export let markers = [];

/**
 * Default Component Export Definition Core Function
 */
export default async function decorate(locator) {
  const settings = getSettings(locator);

  locator.replaceChildren(
    createSearchForm(settings),
    createFacilityCards(settings),
    createMapContainer(),
  );
  
  // Initialize Google Map
  await initializeMap(settings.apiKey);

  // Get All UI elements targeted
  const ui = getElements(locator);

  // Initialize Custom Dropdowns cleanly using the shared logic engine
   const dropdowns = {
    distance: initCustomDropdown(ui.mileBlock, 'select'),
    filter: initCustomDropdown(ui.filterBlock, 'checkbox'),
  };

  registerEvents({
    locator,
    ui,
    settings,
    dropdowns,
  });
}
