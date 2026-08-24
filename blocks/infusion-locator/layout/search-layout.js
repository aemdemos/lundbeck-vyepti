import { createDropdown } from "../dropdown.js";
import createFilters from "./filters.js";

// Filters
function removeRadiusField(form) {
  form.querySelector('#form-radius')?.remove();
  form.querySelector('#form-radius-label')?.remove();
}

function convertSearchInputToButton(form) {
  const input = form.querySelector('#form-zipcodesubmit');

  if (!input) {
    return;
  }

  // Already converted
  if (input.tagName.toLowerCase() === 'button') {
    return;
  }

  // Create the new button
  const button = document.createElement('button');

  // Copy existing attributes
  Array.from(input.attributes).forEach((attribute) => {
    if (attribute.name !== 'value' && attribute.name !== 'type') {
      button.setAttribute(attribute.name, attribute.value);
    }
  });

  button.type = 'button';

  // Text
  const buttonText = document.createElement('span');
  buttonText.className = 'btn-text';
  buttonText.textContent = input.value || 'SEARCH';

  // Icon
  const buttonIcon = document.createElement('span');
  buttonIcon.className = 'btn-icon';
  buttonIcon.setAttribute('aria-hidden', 'true');

  button.append(
    buttonText,
    buttonIcon,
  );

  // Replace the original input
  input.replaceWith(button);
}

export default function createSearch(block, form) {
  const search = document.createElement('div');
  search.className = 'locator-search';

  const mileBlock = document.createElement('div');

  createDropdown(block, mileBlock);

  removeRadiusField(form);

  const filters = createFilters(form);

  // Convert EDS input into button
  convertSearchInputToButton(form);

  const searchFields = [
    form.querySelector('#form-zipcode')?.closest('.field-wrapper'),
    mileBlock,
    filters,
    form.querySelector('#form-zipcodesubmit')?.closest('.field-wrapper'),
  ];

  form.querySelector('#form-zipcodesubmit-label')?.remove();

  searchFields.forEach((field) => {
    if (field) {
      search.append(field);
    }
  });

  return search;
}