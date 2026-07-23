import { loadScript } from '../../scripts/aem.js';

export async function initializeMap(apiKey) {

  await loadScript(
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  );

  if (!window.google?.maps) {
    throw new Error('Google Maps failed to load');
  }

  return new google.maps.Map(
    document.getElementById('locator-map'),
    {
      center: { lat: 37.09, lng: -95.71 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      zoomControl: true,
    },
  );

  return map;
}

export function clearMarkers() {
  markers.forEach((m) => m.setMap(null));
  markers = [];
}

export function addMarker(location, title, info) {
  const marker = new google.maps.Marker({ position: location, map, title });
  const infoWindow = new google.maps.InfoWindow({ content: info });
  marker.addListener('click', () => infoWindow.open(map, marker));
  markers.push(marker);
}

export async function geocodeZip(zip) {
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
