import { parseBool } from '../../scripts/config.js';

export function getApiInfo(block) {
  const form = block.querySelector('form');

  const apiKeyElement = block.querySelector('#form-apikey');
  const showInfusionCentersElement =
    block.querySelector('#form-infusion-center');
  const showHcpDataElement =
    block.querySelector('#form-hcp-data');
  const showFiltersElement =
    block.querySelector('#form-filter');

  const apiEndpoint = form?.dataset.action?.trim();

  if (!apiKeyElement || !apiEndpoint) {
    return null;
  }

  const apiKey = apiKeyElement.textContent.trim();

  // From document to pass as API paramneter
  const showInfusionCenters =
    parseBool(
      showInfusionCentersElement?.textContent,
      true,
    );

  // From document to pass as API paramneter
  const showHcpData =
    parseBool(
      showHcpDataElement?.textContent,
      false,
    );

  // From document to pass as API paramneter
  const showFilters =
    parseBool(
      showFiltersElement?.textContent,
      false,
    );

  [
    apiKeyElement,
    showInfusionCentersElement,
    showHcpDataElement,
    showFiltersElement,
  ].forEach((element) => {
    element?.closest('.field-wrapper')?.remove();
  });

  return {
    apiKey,
    apiEndpoint,
    showInfusionCenters,
    showHcpData,
    showFilters,
  };
}

export async function loadLocations(apiInfo) {
  try {
    const params = new URLSearchParams({
      actionType: 'getLocatorRecords',
      showHcp: String(apiInfo.showHcpData).toLowerCase(),
      showIC: String(apiInfo.showInfusionCenters).toLowerCase(),
    });

    const response = await fetch(
      `${apiInfo.apiEndpoint}?${params.toString()}`,
      {
        method: 'GET',
      },
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    return data.result || data.providers || data || [];
  } catch (error) {
    // Log error in development only (avoid console output in production)
    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
      /* eslint-disable-next-line no-console */
      console.error('Failed to load locator records:', error);
    }

    return [];
  }
}