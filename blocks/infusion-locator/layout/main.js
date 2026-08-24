export default function createMain() {
  const main = document.createElement('div');
  main.className = 'locator-main';

  const map = document.createElement('div');
  map.className = 'locator-map';

  const resultsWrap = document.createElement('div');
  resultsWrap.className = 'locator-results-wrap';

  const results = document.createElement('div');
  results.className = 'locator-results';

  // Welcome message
  const resultTitle = document.createElement('h2');
  resultTitle.className = 'locator-welcome-title';
  resultTitle.textContent = 'Welcome';

  const text = document.createElement('p');
  text.className = 'locator-welcome-text';
  text.textContent = 'Please enter your information to begin your search.';

  results.append(
    resultTitle,
    text,
  );

  resultsWrap.append(
    results,
  );

  main.append(
    map,
    resultsWrap,
  );

  return {
    main,
    map,
    resultsWrap,
    results,
  };
}