import { loadScript } from '../../scripts/aem.js';
import { getSettings, DEFAULT_DISTANCES, FACILITY_TYPES, readConfig, parseBool } from '../../scripts/config.js';
import { createSearchForm, createMapContainer, renderResults, createFacilityCards } from './template.js';
import { initCustomDropdown } from './dropdwon.js';
import { initializeMap, clearMarkers, addMarker, geocodeZip } from './map.js';
import { searchLocations } from './api.js';
import { getElements } from './ui.js';
import { handleSearch } from './search.js';
import { registerEvents } from './events.js';
/* global google */
let map;
let markers = [];

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
  

  
  await initializeMap(settings.apiKey);


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
