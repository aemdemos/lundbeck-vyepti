// ui.js

export function getElements(locator) {
  return {
    searchBtn: locator.querySelector('.locator-search-btn'),
    zipInput: locator.querySelector('#locator-zip'),
    resultsContainer: locator.querySelector('.locator-results'),
    zipLabel: locator.querySelector('label[for="locator-zip"]'),
    mileBlock: locator.querySelector('.mile-block'),
    filterBlock: locator.querySelector('.filter-block'),
    errorLabel: locator.querySelector('.error.selectHide')
  };
}