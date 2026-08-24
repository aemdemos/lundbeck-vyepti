import createHeader from './layout/header.js';
import  createSearch  from "./layout/search-layout.js";

import createMain from './layout/main.js';
import createLegend from './layout/legend.js';
      



export default function createLayout(block) {
  const form = block.querySelector('form');

  if (!form) return;

 
  

  // Header Section Creation
  const header = createHeader(form);

  // Search Section Creation
  const search = createSearch(block, form);



  const legends = createLegend(form)


  // Main
  const mainLayout = createMain(form);

  // Removal of form filters

  function removeOriginFilters() {
  const originFilters = [
    '#form-networkonly',
    '#form-hidehospital',
    '#form-filter-description',
    '#form-child-info',
    '#form-homeinfusion-label',
    '#form-homeinfusiontext-label',
  ];

  originFilters.forEach((selector) => {
    const field = form.querySelector(selector);

    if (field) {
      field.closest('.field-wrapper')?.remove();
    }
  });
}

  removeOriginFilters();

  // Append in order
  form.append(
    header,
    search,
    legends,
    mainLayout.main,
  );
}