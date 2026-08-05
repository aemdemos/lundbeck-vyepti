import { decorateIcons } from '../../scripts/aem.js';
import {
  fetchData,
  filterData,
  findNextHeading,
  renderResult as renderSearchResult,
} from '../search/search.js';

const searchParams = new URLSearchParams(window.location.search);

// Vyepti source uses ?searchText=<query>&p=<page>&rp=<results-per-page>.
const PARAM_QUERY = 'searchText';
const PARAM_PAGE = 'p';
const PARAM_PER_PAGE = 'rp';
const DEFAULT_PER_PAGE = 10;

// CSS class names for this block's result markup (passed to the shared
// renderResult so the DOM is styled by search-results.css, not search.css).
const RESULT_CLASSES = {
  image: 'search-results-result-image',
  title: 'search-results-result-title',
};

function renderResult(result, searchTerms, titleTag) {
  return renderSearchResult(result, searchTerms, titleTag, RESULT_CLASSES);
}

function getPage() {
  const raw = parseInt(searchParams.get(PARAM_PAGE), 10);
  return Number.isNaN(raw) || raw < 1 ? 1 : raw;
}

function getPerPage() {
  const raw = parseInt(searchParams.get(PARAM_PER_PAGE), 10);
  return Number.isNaN(raw) || raw < 1 ? DEFAULT_PER_PAGE : raw;
}

/**
 * Builds the "N result(s) found" summary line.
 */
function renderCount(block, total) {
  let count = block.querySelector('.search-results-count');
  if (!count) {
    count = document.createElement('p');
    count.className = 'search-results-count';
    block.querySelector('.search-results-list').before(count);
  }
  const label = total === 1 ? 'result found' : 'results found';
  count.textContent = `${total} ${label}`;
}

/**
 * Switches to the given page: keeps the ?p= param in the URL in sync (so the
 * page is shareable/bookmarkable) and re-renders the already-fetched results
 * in place — no full-page reload.
 */
function goToPage(block, filteredData, searchTerms, page) {
  searchParams.set(PARAM_PAGE, page);
  if (window.history.replaceState) {
    const url = new URL(window.location.href);
    url.search = searchParams.toString();
    window.history.replaceState({}, '', url.toString());
  }
  // eslint-disable-next-line no-use-before-define
  renderResults(block, filteredData, searchTerms);
  block.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Renders pagination controls. Only shown when results exceed one page,
 * matching the source (fewer than rp results → no pagination).
 */
function renderPagination(block, filteredData, searchTerms, perPage, currentPage) {
  const existing = block.querySelector('.search-results-pagination');
  if (existing) existing.remove();

  const totalPages = Math.ceil(filteredData.length / perPage);
  if (totalPages <= 1) return;

  const nav = document.createElement('nav');
  nav.className = 'search-results-pagination';
  nav.setAttribute('aria-label', 'Search results pages');

  const makeButton = (label, page, { disabled = false, current = false } = {}) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-results-page';
    btn.textContent = label;
    if (current) {
      btn.classList.add('is-current');
      btn.setAttribute('aria-current', 'page');
    }
    if (disabled) {
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => goToPage(block, filteredData, searchTerms, page));
    }
    return btn;
  };

  // Windowed page numbers: show a bounded range around the current page so the
  // control stays compact (and the loop is bounded) regardless of result count.
  const WINDOW = 5;
  let firstPage = Math.max(1, currentPage - Math.floor(WINDOW / 2));
  const lastPage = Math.min(totalPages, firstPage + WINDOW - 1);
  firstPage = Math.max(1, lastPage - WINDOW + 1);

  nav.append(makeButton('Previous', currentPage - 1, { disabled: currentPage <= 1 }));
  for (let page = firstPage; page <= lastPage; page += 1) {
    nav.append(makeButton(String(page), page, { current: page === currentPage }));
  }
  nav.append(makeButton('Next', currentPage + 1, { disabled: currentPage >= totalPages }));

  block.append(nav);
}

function renderResults(block, filteredData, searchTerms) {
  const searchResults = block.querySelector('.search-results-list');
  searchResults.innerHTML = '';
  const headingTag = searchResults.dataset.h;

  renderCount(block, filteredData.length);

  if (filteredData.length) {
    searchResults.classList.remove('no-results');
    const perPage = getPerPage();
    const totalPages = Math.ceil(filteredData.length / perPage);
    const currentPage = Math.min(getPage(), totalPages);
    const start = (currentPage - 1) * perPage;
    const pageItems = filteredData.slice(start, start + perPage);

    pageItems.forEach((result) => {
      const li = renderResult(result, searchTerms, headingTag);
      searchResults.append(li);
    });

    renderPagination(block, filteredData, searchTerms, perPage, currentPage);
  } else {
    const existing = block.querySelector('.search-results-pagination');
    if (existing) existing.remove();
    const noResultsMessage = document.createElement('li');
    searchResults.classList.add('no-results');
    noResultsMessage.textContent = 'No results found.';
    searchResults.append(noResultsMessage);
  }
}

function searchResultsContainer(block) {
  const results = document.createElement('ul');
  results.className = 'search-results-list';
  results.dataset.h = findNextHeading(block);
  return results;
}

export default async function decorate(block) {
  const source = block.querySelector('a[href]')?.href || `${window.hlx.codeBasePath}/query-index.json`;
  block.innerHTML = '';

  block.append(searchResultsContainer(block));

  const searchValue = searchParams.get(PARAM_QUERY);
  if (searchValue) {
    const searchTerms = searchValue.toLowerCase().split(/\s+/).filter((term) => !!term);
    const data = await fetchData(source);
    const filteredData = filterData(searchTerms, data || []);
    renderResults(block, filteredData, searchTerms);
  } else {
    renderCount(block, 0);
    block.querySelector('.search-results-list').classList.add('no-results');
  }

  decorateIcons(block);
}
