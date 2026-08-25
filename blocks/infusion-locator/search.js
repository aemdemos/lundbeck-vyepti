import {
  clearMarkers,
  geocodeZip,
  centerMap,
  renderMarkers,
  centerMapOnMarker
} from './map.js';

import  getMiles  from './distance.js';

import renderResults from './template.js';

import { downloadResultsPdf } from './layout/pdf.js';




/**
 * Apply the same filtering behaviour as the live site.
 */
function applyFilters(results, filters) {

  let filteredResults = [...results];

  /*
   * Network Only
   */
  if (filters.networkOnly) {
    filteredResults = filteredResults.filter(
      (facility) =>
        String(facility.preferredIc)
          .trim()
          .toUpperCase() === 'TRUE',
    );
  }

  /*
   * Hide Hospital Based Locations
   */
  if (filters.hideHospital) {
    filteredResults = filteredResults.filter(
      (facility) =>
        String(facility.locationType)
          .trim()
          .toUpperCase() !== 'HOSPITAL',
    );
  }

    /*
   * Home Infusion
   *
   * Only show locations where
   * homeInfusionFlag is TRUE.
   */
  if (filters.homeInfusion) {
    filteredResults = filteredResults.filter(
      (facility) =>
        String(facility.homeInfusionFlag)
          .trim()
          .toUpperCase() === 'TRUE',
    );
  }

  return filteredResults;
}

export default async function handleSearch({
  block,
  ui,
  settings,
  allLocations,
}) {
  const {
    zipInput,
    mileBlock,
    resultsContainer,
  } = ui;

  const zip = zipInput.value.trim();

  if (!zip) {
    ui.errorLabel.classList.remove(
      'select-hide',
    );

    return;
  }

  ui.errorLabel.classList.add(
    'select-hide',
  );

  clearMarkers();

  /*
   * Get currently selected filters.
   */
 const filters = {
  networkOnly: block.querySelector(
    '#form-networkonly-dropdown',
  )?.checked ?? false,

  hideHospital: block.querySelector(
    '#form-hidehospital-dropdown',
  )?.checked ?? false,

  homeInfusion: block.querySelector(
    '#form-homeinfusion-dropdown',
  )?.checked ?? false,
};


  const radius = Number(
    mileBlock.dataset.value || 25,
  );





  try {
    /*
     * 1. Convert ZIP → latitude/longitude
     */
    const userLocation = await geocodeZip(zip);
    
    /*
     * 2. Use facility data loaded during page load.
    */
    const results = Array.isArray(allLocations)
      ? allLocations
      : [];
    
    /*
     * 3. Calculate distance.
     */
    const resultsWithMiles = results
      .map((facility) => ({
        ...facility,

        miles: getMiles(
          userLocation.lat,
          userLocation.lng,
          Number(facility.latitude),
          Number(facility.longitude),
        ),
      }))
      .filter(
        (facility) =>
          facility.miles !== null
          && facility.miles <= radius,
      );


    /*
     * 4. Apply checkbox filters.
     */
    const filteredResults = applyFilters(
      resultsWithMiles,
      filters,
    );

    /*
     * 5. Sort by distance.
     */
    filteredResults.sort(
      (a, b) =>
        a.miles - b.miles,
    );

    /*
     * 6. Render markers.
     */
    renderMarkers(filteredResults);

    /*
     * 7. Center map.
     */
    centerMap(userLocation);


   /*
     * 8. Render result cards.
     */
    renderResults(
      filteredResults,
      resultsContainer,
      settings,
    );

    /*
     * Center map when a result card is clicked.
     */
    resultsContainer.addEventListener('click', (event) => {
      const card = event.target.closest('.result-card');

      if (!card) {
        return;
      }

      const index = Number(card.dataset.index);

      centerMapOnMarker(index);
    });


    /*
     * 9. Print Results.
     */
    const existingPrint =
      document.querySelector(
        '.print-result-btn',
      );

    /*
     * Don't create duplicate Print Results
     * links when another search is performed.
     */
    if (existingPrint) {
      existingPrint.remove();
    }


    const printElement =
      document.createElement('div');

    printElement.className =
      'print-result-btn';

    const printTag =
      document.createElement('a');

    printTag.className =
      'print-results';

    printTag.textContent =
      'Print Results';

    printTag.href = '#';

    printElement.append(
      printTag,
    );


    const headerElement =
      document.querySelector(
        '.locator-title-wrap',
      );

    if (headerElement) {
      headerElement.prepend(
        printElement,
      );
    }

    /*
     * Print click event.
     */
    printTag.addEventListener(
      'click',
      async (event) => {
        event.preventDefault();

        await downloadResultsPdf(
          filteredResults,
          {
            pdfTitle:
              'Infusion Service Providers in your area',

            disclaimerText:
              'The VYEPTI Infusion Locator is provided for informational purposes only. '
              + 'This database includes infusion service providers compiled by Lundbeck '
              + 'that are known to have experience with VYEPTI. '
              + 'The results shown may not be inclusive of all providers who may have '
              + 'experience with VYEPTI in your area. Lundbeck does not guarantee the '
              + 'accuracy or completeness of any information provided herein. '
              + 'Users should contact providers directly with all medication, insurance '
              + 'coverage, facility, and other site-specific inquiries. '
              + 'No fees or other remuneration have been or will be exchanged for an '
              + 'infusion service provider\'s inclusion in this database. '
              + 'Unless otherwise stated, Lundbeck is not affiliated with, and inclusion '
              + 'in this list does not represent an endorsement of or referral to the '
              + 'providers contained in this database; nor does it represent an '
              + 'endorsement of any Lundbeck product by any provider listed. '
              + 'Users are responsible for compliance with state and federal laws '
              + 'regulating physician referrals, including state professional practice '
              + 'restrictions. '
              + 'Lundbeck and its affiliates hereby disclaim any liability arising from '
              + 'your use of and/or reliance on the information contained in this '
              + 'VYEPTI Infusion Locator.',

            copyrightText:
              '© 2023 Lundbeck. All rights reserved. '
              + 'VYEPTI and VYEPTI GO are registered trademarks, '
              + 'and VYEPTI CONNECT and Migraine Victors Program '
              + 'are trademarks of Lundbeck Seattle BioPharmaceuticals, Inc. '
              + 'EPT-B-100298v8',
          },
        );
      },
    );

  } finally {
    // searchBtn.textContent = 'SEARCH';
    // searchBtn.disabled = false;
  }
}