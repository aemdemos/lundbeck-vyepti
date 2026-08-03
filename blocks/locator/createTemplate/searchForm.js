import {
  FACILITY_TYPES,
} from '../../../scripts/config.js';

export default function createSearchForm(settings) {
    const form = document.createElement('div');
    form.className = 'locator-search';

    const required = document.createElement('p');
    required.className = 'locator-required';
    required.textContent = '*Required field';

    const locatorForm = document.createElement('div');
    locatorForm.className = 'locator-form';

    // Input group
    const inputGroup = document.createElement('div');
    inputGroup.className = 'locator-input-group';

    const label = document.createElement('label');
    label.setAttribute('for', 'locator-zip');
    label.textContent = 'From city, state, or ZIP code*';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'locator-zip';
    input.placeholder = '';
    input.required = true;

    inputGroup.append(label, input);

    // Distance dropdown
    const mileBlock = document.createElement('div');
    mileBlock.className = 'locator-select-group mile-block';
    mileBlock.dataset.value = '25';

    const selected = document.createElement('div');
    selected.className = 'select';
    selected.append('25 miles ');

    const arrow = document.createElement('span');
    arrow.className = 'select-arrow';
    selected.append(arrow);

    const dropdown = document.createElement('div');
    dropdown.id = 'locator-distance';
    dropdown.className = 'dropdown-items selectHide';

    settings.distances.forEach((distance) => {
        const item = document.createElement('div');
        item.className = 'item';

        if (String(distance) === '25') {
            item.classList.add('selectedMiles');
        }

        item.dataset.value = distance;
        item.textContent = `${distance} miles`;

        dropdown.append(item);
    });

    mileBlock.append(selected, dropdown);

    locatorForm.append(inputGroup, mileBlock);

    // Filters
    if (!settings.showFilters) {
        const filterBlock = document.createElement('div');
        filterBlock.className = 'custom-dropdown filter-block';

        const filterSelect = document.createElement('div');
        filterSelect.className = 'select';
        filterSelect.append('Show only: ');

        const selectIcon = document.createElement('span');
        selectIcon.className = 'select-icon';
        filterSelect.append(selectIcon);

        const filterItems = document.createElement('div');
        filterItems.className = 'dropdown-items selectHide';

        FACILITY_TYPES.forEach((facility) => {
            const item = document.createElement('div');
            item.className = 'item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = facility.key;
            checkbox.value = facility.key;

            const labelText = document.createElement('span');
            labelText.className = 'label-text';
            labelText.textContent = facility.label;

            const childInfo = document.createElement('span');
            childInfo.className = 'child-info';
            childInfo.textContent = facility.description;

            item.append(checkbox, labelText, childInfo);
            filterItems.append(item);
        });

        filterBlock.append(filterSelect, filterItems);
        locatorForm.append(filterBlock);
    }

    // Search button
    const button = document.createElement('button');
    button.className = 'locator-search-btn';
    button.type = 'button';
    button.textContent = 'SEARCH';

    locatorForm.append(button);

    // Error message
    const error = document.createElement('p');
    error.className = 'error selectHide';
    error.textContent = 'Please enter a valid city, state, or ZIP code, and try again.';

    form.append(required, locatorForm, error);

    return form;
}