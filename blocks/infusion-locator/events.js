import handleSearch from './search.js';

export default function registerEvents({
  block,
  ui,
  settings,
  apiInfo,
  loadAllLocations,
}) {
  // Handle CSS class toggles on floating element input labels
  if (ui.zipInput && ui.zipLabel) {
    ui.zipInput.addEventListener('focus', () => {
      ui.zipLabel.classList.add('focus');
    });

    ui.zipInput.addEventListener('blur', () => {
      if (!ui.zipInput.value.trim()) {
        ui.zipLabel.classList.remove('focus');
      }
    });
  }

  if (ui.infoIcon) {
    ui.infoIcon.addEventListener('click', (el) => {
      el.preventDefault();
      ui.filterDescpTwo.classList.toggle('select-hide');
      ui.filterDescpOne.classList.toggle('select-hide');
    });
  }

  /*
   * Search button
   */
  ui.searchBtn.addEventListener('click', async () => {
    const allLocations = await loadAllLocations();

    handleSearch({
      block,
      ui,
      settings,
      apiInfo,
      allLocations,
    });
  });

  /*
   * Search when pressing Enter
   */
  const ENTER_KEYS = new Set(['Enter']);

  const doSearch = async () => {
    const allLocations = await loadAllLocations();

    handleSearch({
      block,
      ui,
      settings,
      apiInfo,
      allLocations,
    });
  };

  ui.zipInput.addEventListener('keydown', (event) => {
    if (ENTER_KEYS.has(event.key)) {
      doSearch();
    }
  });
}