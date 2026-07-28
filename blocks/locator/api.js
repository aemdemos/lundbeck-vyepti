import { geocodeZip, centerMap } from "./map.js";
const USE_MOCK_DATA = true;
import { mockdata } from "./mockData.js";
export async function searchLocations(
  zip,
  distance,
  settings,
  activeFilters = [],
) {
  const coords = await geocodeZip(zip);
  centerMap(coords, 10);

  if (USE_MOCK_DATA) {
    return mockdata.result;
    // return [
    //   {
    //     name: "Northside Infusion Center",
    //     address: "123 Main Street",
    //     city: "Chicago",
    //     state: "IL",
    //     zip: "60601",
    //     phone: "(312) 555-0101",
    //     latitude: "41.8781",
    //     longitude: "-87.6298",
    //     inNetwork: true,
    //   },
    //   {
    //     name: "Downtown Neurology Infusion",
    //     address: "101 Michigan Avenue",
    //     city: "Chicago",
    //     state: "IL",
    //     zip: "60611",
    //     phone: "(312) 555-0222",
    //     latitude: "41.8967",
    //     longitude: "-87.6243",
    //     inNetwork: true,
    //   },
    //   {
    //     name: "Lakeside Specialty Care",
    //     address: "789 Lake Drive",
    //     city: "Evanston",
    //     state: "IL",
    //     zip: "60201",
    //     phone: "(847) 555-0199",
    //     latitude: "42.0451",
    //     longitude: "-87.6877",
    //     inNetwork: false,
    //   },
    // ];
  }

  try {
    const params = new URLSearchParams({
      latitude: coords.lat,
      longitude: coords.lng,
      radius: distance,
      showIC: settings.showInfusionCenters,
      showHCPData: settings.showHcpData,
    });

    activeFilters.forEach((filter) => {
      params.append("filter", filter);
    });

    const response = await fetch(`${settings.apiEndpoint}?${params}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    return data.results || data.providers || data || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}