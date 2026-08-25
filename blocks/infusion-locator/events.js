import handleSearch from './search.js';

export default function registerEvents({
  block,
  ui,
  settings,
  apiInfo,
  allLocations,
}) {

  // Handle CSS class toggles on floating element input labels
  if (ui.zipInput && ui.zipLabel) {
    ui.zipInput.addEventListener('focus', () => ui.zipLabel.classList.add('focus'));

    ui.zipInput.addEventListener('blur', () => {
      if (!ui.zipInput.value.trim()) {
        ui.zipLabel.classList.remove('focus');
      }
    });

  }

  if (ui.infoIcon) {
    ui.infoIcon.addEventListener('click', (el) => {
      el.preventDefault();
      ui.filterDescpTwo.classList.toggle('selectHide');
      ui.filterDescpOne.classList.toggle('selectHide');
    });
  }

  /*
   * Search button
   */
  ui.searchBtn.addEventListener(
    'click',
    (el) => {
      el.preventDefault();
      handleSearch({
        block,
        ui,
        settings,
        apiInfo,
        allLocations,
      });
    }
  );

  /*
   * Search when pressing Enter
   */
  const ENTER_KEYS = new Set(['Enter']);
  const doSearch = () => {
    handleSearch({
      block,
      ui,
      settings,
      apiInfo,
      allLocations,
    });
  };

  ui.zipInput.addEventListener('keydown', (event) => {
    const { key } = event;
    if (ENTER_KEYS.has(key)) {
      doSearch();
    }
  });
}