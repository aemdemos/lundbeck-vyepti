import { handleSearch } from './search.js';
export function registerEvents({
  locator,
  ui,
  settings,
  dropdowns,
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

  // Unified global event handling listener closure
  document.addEventListener('click', () => {
    dropdowns.distance?.close();
    dropdowns.filter?.close();
  });

  ui.searchBtn.addEventListener(
    'click',
    () => handleSearch({
      locator,
      ui,
      settings,
    }),
  );

  ui.zipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleSearch({
        locator,
        ui,
        settings,
      });
    }
  });
}