

export default function createMapContainer() {
  const container = document.createElement('div');
  container.className = 'locator-map-results';
  const map = document.createElement('div');
  map.className = 'locator-map';
  map.id = 'locator-map';

  const results = document.createElement('div');
  results.className = 'locator-results';

  const title = document.createElement('h2');
  title.className = 'locator-welcome-title';
  title.textContent = 'Welcome';

  const text = document.createElement('p');
  text.className = 'locator-welcome-text';
  text.textContent = 'Please enter your information to begin your search.';

  results.append(title, text);
  container.append(map, results);
  return container;
}