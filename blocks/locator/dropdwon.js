
/**
 * Reusable Custom Dropdown Component Initializer
 */
export function initCustomDropdown(dropdownContainer, type = 'select', onSelectCallback = null) {
  if (!dropdownContainer) return null;

  const selectTrigger = dropdownContainer.querySelector('.select');
  const itemsContainer = dropdownContainer.querySelector('.dropdown-items');

  if (!selectTrigger || !itemsContainer) return null;

  // Click handler to open/close menu options panels
  selectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    itemsContainer.classList.toggle('selectHide');
    selectTrigger.classList.toggle('active');
  });

  // Inner elements selection behavior routing logic
  itemsContainer.addEventListener('click', (e) => {
    e.stopPropagation();

    if (type === 'select') {
      const targetItem = e.target.closest('.item');
      if (!targetItem) return;

      itemsContainer.querySelectorAll('.item').forEach((item) => item.classList.remove('selectedMiles'));
      targetItem.classList.add('selectedMiles');

      const textValue = targetItem.textContent;
      const dataValue = targetItem.getAttribute('data-value');

      selectTrigger.innerHTML = `${textValue} <span class="select-arrow"></span>`;
      dropdownContainer.setAttribute('data-value', dataValue);

      itemsContainer.classList.add('selectHide');
      selectTrigger.classList.remove('active');

      if (onSelectCallback) onSelectCallback(dataValue);
    }
    else if (type === 'checkbox') {
      const isCheckbox = e.target.matches('input[type="checkbox"]');
      const isLabel = e.target.matches('.label-text');

      if (!isCheckbox && !isLabel) return;

      const itemRow = e.target.closest('.item');
      const checkbox = itemRow?.querySelector('input[type="checkbox"]');

      if (isLabel && checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Interface utility signature for cleaner execution closures
  return {
    close: () => {
      itemsContainer.classList.add('selectHide');
      selectTrigger.classList.remove('active');
    }
  };
}