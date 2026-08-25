import { getSettings } from '../../scripts/config.js';
import  createLayout  from './layout.js';
import { initializeMap , initializeAutocomplete } from './map.js';
import { getApiInfo, loadLocations } from './api.js';
import registerEvents from './events.js';
import { initCustomDropdown } from './dropdown.js';
import getElements from './ui.js';


async function renderForm(block) {
  const formModule = await import('../form/form.js');
  await formModule.default(block);
}

function initializeDropdowns(ui) {
  ui.distanceDropdown = initCustomDropdown(
    ui.mileBlock,
    'select',
  );
}



export default async function decorate(block) {
  /*
   * 1. Render form
   */
  await renderForm(block);

  /*
   * 2. Get API information
   */
  const apiInfo = getApiInfo(block);

  if (!apiInfo) {
  /* eslint-disable-next-line no-console */
  console.error('API configuration is missing');
  return;
  }

   /*
   * 3. Get settings
   */
  const settings = getSettings(block);


   /*
   * 5. Create layout
   */
  await createLayout(block);


/*
   * 6. Initialize map
   */
  await initializeMap(
    apiInfo.apiKey,
  );

/*
 * 7. Initialize ZIP autocomplete
 */
  const zipInput = block.querySelector('#form-zipcode');
  initializeAutocomplete(zipInput);


  /*
 * 8. Get UI elements
   */
  const ui = getElements(block);

  
  /*
   * 8. Initialize dropdowns
   */
  initializeDropdowns(ui);

  let allLocationsPromise;
  const loadAllLocations = () => {
  if (!allLocationsPromise) {
    allLocationsPromise = loadLocations(apiInfo);
  }

  return allLocationsPromise;
};

  registerEvents({
    block,
    ui,
    settings,
    apiInfo,
    loadAllLocations,
  });
}




