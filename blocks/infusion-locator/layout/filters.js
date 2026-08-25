function createFilterItem(
  form,
  sourceCheckboxId,
  sourceLabelId,
  descriptionId,
  itemClass = '',
) {
  const sourceCheckbox = form.querySelector(`#${sourceCheckboxId}`);
  const sourceLabel = form.querySelector(`#${sourceLabelId}`);
  const sourceDescription = form.querySelector(`#${descriptionId}`);

  if (!sourceCheckbox) {
    return null;
  }

  const item = document.createElement('div');
  item.className = `item ${itemClass}`.trim();

  // Label
  const label = document.createElement('label');
  label.htmlFor = `${sourceCheckboxId}-dropdown`;

  // New checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `${sourceCheckboxId}-dropdown`;
  checkbox.className = 'filter-checkbox';
  checkbox.checked = sourceCheckbox.checked;

  // Checkmark
  const checkmark = document.createElement('span');
  checkmark.className = 'checkmark';

  // Label text
  const labelText = document.createElement('span');
  labelText.className = 'label-text';

  if (sourceLabel) {
    labelText.textContent = sourceLabel.textContent.trim();
    const infoIcon = labelText.querySelector('img');

    if (infoIcon) {
      infoIcon.className = 'info-icon';
    }
  }

  label.append(
    checkbox,
    checkmark,
    labelText,
  );

  // Description
  const childInfo = document.createElement('span');
  childInfo.className = 'child-info';

  if (sourceDescription) {
    childInfo.textContent =  sourceDescription.textContent.trim()
  }

  item.append(
    label,
    childInfo,
  );

  /*
   * Keep the original EDS checkbox.
   * Only sync the custom checkbox with it.
   */
  checkbox.addEventListener('change', () => {
    sourceCheckbox.checked = checkbox.checked;

    sourceCheckbox.dispatchEvent(
      new Event('change', {
        bubbles: true,
      }),
    );
  });

  /*
   * If something else changes the original checkbox,
   * update our dropdown checkbox as well.
   */
  sourceCheckbox.addEventListener('change', () => {
    checkbox.checked = sourceCheckbox.checked;
  });

  return item;
}

function createDropdown() {
  const filterBlock = document.createElement('div');
  filterBlock.className = 'filter-block';

  const customDropdown = document.createElement('div');
  customDropdown.className = 'custom-dropdown';

  const select = document.createElement('div');
  select.className = 'select';

  select.append('Show only :');

  const selectIcon = document.createElement('span');
  selectIcon.className = 'select-icon';

  select.append(selectIcon);

  const dropdownItems = document.createElement('div');
  dropdownItems.className = 'dropdown-items select-hide';

  select.addEventListener('click', () => {
    select.classList.toggle('open');
    dropdownItems.classList.toggle('select-hide');
  });

  customDropdown.append(
    select,
    dropdownItems,
  );

  filterBlock.append(customDropdown);

  return {
    filterBlock,
    dropdownItems,
  };
}

export default function createFilters(form) {
  const filters = document.createElement('div');
  filters.className = 'locator-filters';

  const {
    filterBlock,
    dropdownItems,
  } = createDropdown();

  const networkItem = createFilterItem(
    form,
    'form-networkonly',
    'form-networkonly-label',
    'form-filter-description',
  );

  const hospitalItem = createFilterItem(
    form,
    'form-hidehospital',
    'form-hidehospital-label',
    'form-child-info',
    'mt-2',
  );

   const homeItem = createFilterItem(
    form,
    'form-homeinfusion',
    'form-homeinfusion-label',
    'form-homeinfusiontext-label',
    'mt-2',
  );

  if (networkItem) {
    dropdownItems.append(networkItem);
  }

  if (hospitalItem) {
    dropdownItems.append(hospitalItem);
  }

  if (homeItem) {
    dropdownItems.append(homeItem)
  }

  filters.append(filterBlock);

  return filters;
}