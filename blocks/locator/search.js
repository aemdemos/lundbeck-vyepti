// search.js

export async function handleSearch({
  locator,
  ui,
  settings,
}) {
  const { searchBtn, zipInput, mileBlock, resultsContainer } = ui;

  const zip = zipInput.value.trim();
  if (!zip) {
    ui.errorLabel.classList.remove('selectHide');
    return;
  } else {
    ui.errorLabel.classList.add('selectHide');
  }

  searchBtn.textContent = 'SEARCHING...';
  searchBtn.disabled = true;

  clearMarkers();

  const filters = Array.from(
    locator.querySelectorAll('.dropdown-items input:checked'),
  ).map((cb) => cb.value);

  const distance = mileBlock.dataset.value || '25';

  try {
    const results = await searchLocations(
      zip,
      distance,
      settings,
      filters,
    );

    renderResults(results, resultsContainer, settings);
  } finally {
    searchBtn.textContent = 'SEARCH';
    searchBtn.disabled = false;
  }
}