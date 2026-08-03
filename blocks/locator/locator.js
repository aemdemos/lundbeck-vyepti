import { getSettings } from '../../scripts/config.js';
import createSearchForm from './createTemplate/searchForm.js';
import createFacilityCards from './createTemplate/facilityCards.js';
import createMapContainer from './createTemplate/mapContainer.js';
import  initCustomDropdown from './dropdwon.js';
import { initializeMap } from './map.js';
import  getElements  from './ui.js';
import  registerEvents  from './events.js';

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
