import renderDescription from "./regex.js";

function createErrorMessage() {
  const error = document.createElement('p');

  error.className = 'error select-hide';
  error.textContent = 'Please enter a valid city, state, or ZIP code, and try again.';

  return error;
}

// Legend
export default function createLegend(form) {

const legend = document.createElement('div');
  legend.className = 'locator-legend';

const legendTitleWrap = document.createElement('div');
legendTitleWrap.className = "legend-title-wrap";
legend.append(legendTitleWrap);

const legendTitle = form.querySelector('#form-legendtitle')?.closest('.field-wrapper');
legendTitle.className = "legend-title";
legendTitleWrap.append(legendTitle);
 
const selectIcon = document.createElement('span');
selectIcon.className = 'select-icon';

legendTitleWrap.append(selectIcon);

const legendcardswrap = document.createElement('div');
legendcardswrap.className = 'legendcardswrap mobile-hide';
legend.append(legendcardswrap);

  [
    form.querySelector('#form-infusion')?.closest('.field-wrapper'),
    form.querySelector('#form-home')?.closest('.field-wrapper'),
    form.querySelector('#form-network')?.closest('.field-wrapper'),
  ].forEach((el) => {
    if (el) {
      // eslint-disable-next-line browser-security/no-innerhtml
      el.innerHTML = renderDescription(el.textContent)
      legendcardswrap.append(el);
    }
  });



  
if (selectIcon && legendcardswrap) {
  selectIcon.addEventListener('click', () => {
    legendcardswrap.classList.toggle('mobile-hide');
  });
}

  const error = createErrorMessage();
  
  legend.append(error);

  return legend;
}