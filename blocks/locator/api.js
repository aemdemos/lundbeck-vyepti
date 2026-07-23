export async function searchLocations(zip, distance, settings, activeFilters) {
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