import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

const SCROLL_OFFSET_TOKEN = 'accordion-cards-scroll-offset';
const SCROLL_DURATION_TOKEN = 'accordion-cards-scroll-duration';
const SCROLL_OFFSET_FALLBACK = 40;
const SCROLL_DURATION_FALLBACK = 500;

function optimizeCardImage(imageCol) {
  const img = imageCol.querySelector('img');
  if (!(img instanceof HTMLImageElement) || !img.src) return;
  const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]);
  const optimizedImg = optimizedPic.querySelector('img');
  if (optimizedImg instanceof HTMLImageElement) moveInstrumentation(img, optimizedImg);
  img.closest('picture')?.replaceWith(optimizedPic);
}

function isActionText(text) {
  const normalized = text.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
  return normalized.length <= 40
    && /^(download|email|sign up|signup|find a location)\b/i.test(normalized);
}

function isActionParagraph(node) {
  if (!(node instanceof Element) || !node.matches('p')) return false;
  if (node.querySelector('.icon, span[class*="icon-"]')) return true;
  if (/:icon-[a-z0-9-]+:/i.test(node.textContent)) return true;
  if (node.querySelector('picture, img')) return false;
  const text = node.textContent.replace(/\s+/g, ' ').trim();
  if (isActionText(text)) return true;
  return false;
}

function getFollowingIcon(anchor) {
  let node = anchor.nextSibling;
  while (node) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
      node = node.nextSibling;
    } else if (node instanceof Element && node.matches('.icon, span[class*="icon-"]')) {
      return node;
    } else {
      break;
    }
  }
  return null;
}

function getActionLinkLabel(anchor) {
  return anchor.textContent.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
}

function isDownloadActionLink(anchor) {
  const label = getActionLinkLabel(anchor);
  if (/^download$/i.test(label)) return true;
  try {
    const { pathname } = new URL(anchor.href, window.location.href);
    return /\.pdf$/i.test(pathname);
  } catch {
    return false;
  }
}

// Returns the fragment path an email/form link points at, or null. The author wires
// the Email link to a fragment (e.g. /modals/email); that fragment holds the
// form-email block revealed inline. Both relative (/modals/email) and full
// (https://…/modals/email) hrefs are accepted; only the pathname is used.
function getEmailFragmentPath(anchor) {
  try {
    const { pathname } = new URL(anchor.href, window.location.href);
    return /^\/modals?\//i.test(pathname) ? pathname.replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

// The email action is any non-download link that points at a /modals/ fragment. This
// keeps the visible label free-form (it need not say "Email") — the fragment href is
// what marks it as the inline-form trigger. Real navigation links (sign-up,
// find-a-location) point elsewhere and are left as normal links.
function isEmailActionLink(anchor) {
  return !isDownloadActionLink(anchor) && getEmailFragmentPath(anchor) !== null;
}

function buildActionLink(anchor) {
  anchor.classList.add('accordion-cards-action-link');

  const iconInAnchor = anchor.querySelector('.icon, span[class*="icon-"]');
  if (!iconInAnchor) {
    const icon = getFollowingIcon(anchor);
    if (icon) anchor.append(icon);
  }

  if (isDownloadActionLink(anchor)) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  } else {
    const fragmentPath = isEmailActionLink(anchor) ? getEmailFragmentPath(anchor) : null;
    if (fragmentPath) {
      anchor.dataset.emailFragment = fragmentPath;
      anchor.setAttribute('href', '#');
      anchor.setAttribute('role', 'button');
      anchor.classList.add('accordion-cards-action-email');
    }
  }

  return anchor;
}

function paragraphHasActionContent(paragraph) {
  if (paragraph.querySelector('a')) return true;
  return /:icon-[a-z0-9-]+:/i.test(paragraph.textContent);
}

function getActionHrefFromGroup(paragraphs) {
  const anchor = paragraphs.flatMap((p) => [...p.querySelectorAll('a[href]')])[0];
  return anchor instanceof HTMLAnchorElement ? anchor.href : null;
}

function wrapParagraphInActionLink(paragraph, href) {
  const anchor = document.createElement('a');
  if (href) anchor.href = href;
  while (paragraph.firstChild) anchor.append(paragraph.firstChild);
  return buildActionLink(anchor);
}

function normalizeActionLinks(contentCol) {
  const groups = [];
  let current = [];

  [...contentCol.children].forEach((child) => {
    if (child.matches('p') && isActionParagraph(child)) {
      current.push(child);
    } else if (current.length) {
      groups.push(current);
      current = [];
    }
  });

  if (current.length) groups.push(current);

  groups.forEach((paragraphs) => {
    const tileLink = document.createElement('div');
    tileLink.className = 'accordion-cards-card-actions';
    const groupHref = getActionHrefFromGroup(paragraphs);

    paragraphs.forEach((paragraph) => {
      const anchors = [...paragraph.querySelectorAll('a')];
      if (anchors.length) {
        anchors.forEach((anchor) => tileLink.append(buildActionLink(anchor)));
        return;
      }

      const icon = paragraph.querySelector('.icon, span[class*="icon-"]');
      const lastLink = tileLink.querySelector('.accordion-cards-action-link:last-child');
      if (icon && lastLink && !lastLink.querySelector('.icon, span[class*="icon-"]')) {
        lastLink.append(icon);
        return;
      }

      if (paragraphHasActionContent(paragraph) || isActionText(paragraph.textContent)) {
        tileLink.append(wrapParagraphInActionLink(paragraph, groupHref));
      } else if (icon) {
        const anchor = document.createElement('a');
        if (groupHref) anchor.href = groupHref;
        anchor.append(icon);
        tileLink.append(buildActionLink(anchor));
      }
    });

    paragraphs[0].replaceWith(tileLink);
    paragraphs.slice(1).forEach((paragraph) => paragraph.remove());
  });
}

function styleCardContent(contentCol) {
  contentCol.classList.add('accordion-cards-card-content');
  contentCol.querySelectorAll('h3, h4').forEach((heading) => {
    if (!heading.querySelector('picture, img')) {
      heading.classList.add('accordion-cards-card-title');
    }
  });
  normalizeActionLinks(contentCol);
}

function isIconImage(img) {
  return img instanceof HTMLImageElement && !!img.closest('.icon, span[class*="icon-"]');
}

function hasCardMedia(node) {
  if (!(node instanceof Element)) return false;
  if (isActionParagraph(node)) return false;
  if (node.querySelector('picture')) return true;
  return [...node.querySelectorAll('img')].some((img) => !isIconImage(img));
}

function isImageOnlyNode(node) {
  if (!(node instanceof Element)) return false;
  if (!hasCardMedia(node)) return false;
  const text = node.textContent.replace(/\s+/g, '');
  return text.length === 0 || (node.matches('h3, h4, p') && !node.querySelector('a') && text.length < 4);
}

function startsNewCard(node, currentGroup) {
  if (!(node instanceof Element) || !currentGroup.length) return false;
  if (node.matches('p') && hasCardMedia(node)) return true;
  if (node.matches('h3, h4') && hasCardMedia(node) && currentGroup.some((el) => !isImageOnlyNode(el))) {
    return true;
  }
  return false;
}

function groupColumnNodes(columnEl) {
  const nodes = [...columnEl.children].filter((child) => child instanceof Element);
  if (!nodes.length) return [];

  if (nodes.length === 1) return groupColumnNodes(nodes[0]);

  // Explicit two-column card: image div | content div
  if (nodes.length === 2 && hasCardMedia(nodes[0])) {
    return [columnEl];
  }

  const groups = [];
  let group = [];

  nodes.forEach((node) => {
    if (startsNewCard(node, group)) {
      groups.push(group);
      group = [node];
    } else {
      group.push(node);
    }
  });

  if (group.length) groups.push(group);
  if (groups.length <= 1) return [columnEl];

  return groups.map((items) => {
    const wrapper = document.createElement('div');
    items.forEach((item) => wrapper.append(item));
    return wrapper;
  });
}

function getCardRows(columnEl) {
  if (!(columnEl instanceof Element)) return [];
  return groupColumnNodes(columnEl);
}

function findMediaNode(card) {
  const children = [...card.children].filter((child) => child instanceof Element);
  const mediaParagraph = children.find((child) => child.matches('p') && hasCardMedia(child));
  if (mediaParagraph) return mediaParagraph;

  const mediaHeading = children.find((child) => child.matches('h3, h4') && isImageOnlyNode(child));
  if (mediaHeading) return mediaHeading;

  return children.find((child) => child.matches('picture') || hasCardMedia(child));
}

function structureSplitCard(card) {
  const children = [...card.children].filter((child) => child instanceof Element);
  if (children.length !== 2) return false;
  if (!hasCardMedia(children[0])) return false;

  children[0].className = 'accordion-cards-card-image';
  optimizeCardImage(children[0]);
  children[1].className = 'accordion-cards-card-content';
  styleCardContent(children[1]);
  return true;
}

function structureFlatCard(card) {
  const mediaNode = findMediaNode(card);
  if (mediaNode instanceof Element) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'accordion-cards-card-image';
    imageWrap.append(mediaNode);
    card.prepend(imageWrap);
    optimizeCardImage(imageWrap);
  }

  const contentWrap = document.createElement('div');
  contentWrap.className = 'accordion-cards-card-content';
  [...card.children]
    .filter((child) => !child.classList.contains('accordion-cards-card-image'))
    .forEach((child) => contentWrap.append(child));
  card.append(contentWrap);
  styleCardContent(contentWrap);
}

function decorateCard(cardRow) {
  const card = document.createElement('article');
  card.className = 'accordion-cards-card';
  moveInstrumentation(cardRow, card);
  while (cardRow.firstElementChild) card.append(cardRow.firstElementChild);

  if (!structureSplitCard(card)) {
    structureFlatCard(card);
  }

  return card;
}

function decorateColumn(columnEl, side) {
  const column = document.createElement('div');
  column.className = `accordion-cards-column accordion-cards-column-${side}`;

  getCardRows(columnEl).forEach((row) => {
    column.append(decorateCard(row));
  });

  return column;
}

function buildPanel(introCol, leftCol, rightCol, panelId) {
  const panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'accordion-cards-item-panel';
  panel.setAttribute('role', 'region');

  if (introCol instanceof Element && introCol.textContent.trim()) {
    introCol.className = 'accordion-cards-item-intro';
    panel.append(introCol);
  }

  const columns = document.createElement('div');
  columns.className = 'accordion-cards-columns';

  if (leftCol instanceof Element && leftCol.children.length) {
    columns.append(decorateColumn(leftCol, 'left'));
  }
  if (rightCol instanceof Element && rightCol.children.length) {
    columns.append(decorateColumn(rightCol, 'right'));
  }

  if (columns.children.length) panel.append(columns);
  return panel;
}

function createSectionHeader(labelCol, panelId) {
  const header = document.createElement('div');
  header.className = 'accordion-cards-item-header';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'accordion-cards-item-trigger';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', panelId);

  const title = document.createElement('span');
  title.className = 'accordion-cards-item-title';
  const titleSource = labelCol.querySelector('h3, h4, p, strong') || labelCol;
  [...titleSource.childNodes].forEach((node) => title.append(node));

  const icon = document.createElement('span');
  icon.className = 'accordion-cards-item-icon';
  icon.setAttribute('aria-hidden', 'true');

  button.append(title, icon);
  header.append(button);
  return header;
}

function setSectionExpanded(section, expanded) {
  section.classList.toggle('is-expanded', expanded);
  const button = section.querySelector('.accordion-cards-item-trigger');
  if (button instanceof HTMLButtonElement) {
    button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
}

function getTokenPx(tokenName, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${tokenName}`)
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function animateScrollTo(top, duration) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    window.scrollTo({ top });
    return;
  }

  const start = window.scrollY;
  const change = top - start;
  if (change === 0) return;

  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - ((-2 * progress + 2) ** 2) / 2;
    window.scrollTo(0, start + change * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function scrollAccordionCardsHeaderIntoView(header) {
  if (!(header instanceof Element)) return;
  const top = header.getBoundingClientRect().top
    + window.scrollY
    - getTokenPx(SCROLL_OFFSET_TOKEN, SCROLL_OFFSET_FALLBACK);
  animateScrollTo(top, getTokenPx(SCROLL_DURATION_TOKEN, SCROLL_DURATION_FALLBACK));
}

function scheduleAccordionCardsScroll(header) {
  // measure after expand/collapse reflow (matches live jQuery handler timing)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollAccordionCardsHeaderIntoView(header);
    });
  });
}

/* eslint-disable secure-coding/no-hardcoded-credentials -- 'email' class names and labels, not secrets */
// Loads the authored fragment at `path` and returns its decorated .form-email element.
// loadFragment fetches + decorates on each call, so every card gets a working form
// (with its own submit listener) rather than a listener-less clone.
async function loadEmailForm(path) {
  const fragment = await loadFragment(path);
  if (!(fragment instanceof Element)) return null;
  return fragment.querySelector('.form-email');
}

// Reveals (or toggles) an inline form-email beneath the card whose Email link was
// clicked. The fragment path comes from the author-supplied href (data-email-fragment).
// The form is loaded lazily on first open and cached on the card.
function toggleCardEmailForm(card, link) {
  let panel = card.querySelector(':scope > .accordion-cards-email-panel');

  if (panel) {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    link.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    return;
  }

  const fragmentPath = link.dataset.emailFragment;
  if (!fragmentPath) return;

  panel = document.createElement('div');
  panel.className = 'accordion-cards-email-panel';
  card.append(panel);
  link.setAttribute('aria-expanded', 'true');

  loadEmailForm(fragmentPath).then((form) => {
    if (form instanceof Element) {
      panel.append(form);
    } else {
      panel.remove();
      link.setAttribute('aria-expanded', 'false');
    }
  });
}

function setupAccordionCardsEmailForm(block) {
  block.addEventListener('click', (event) => {
    const link = event.target.closest('.accordion-cards-action-email');
    if (!(link instanceof HTMLAnchorElement)) return;

    event.preventDefault();
    const card = link.closest('.accordion-cards-card');
    if (!(card instanceof Element)) return;

    toggleCardEmailForm(card, link);
  });
}
/* eslint-enable secure-coding/no-hardcoded-credentials */

export default function decorate(block) {
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-cards-sections';

  [...block.children].forEach((row, index) => {
    const section = document.createElement('section');
    section.className = 'accordion-cards-item';
    moveInstrumentation(row, section);
    while (row.firstElementChild) section.append(row.firstElementChild);

    const panelId = `accordion-cards-panel-${index}`;
    const [
      headingCol,
      introCol,
      leftCol,
      rightCol,
    ] = [...section.children];

    if (headingCol instanceof Element) {
      section.prepend(createSectionHeader(headingCol, panelId));
      headingCol.remove();
    }

    section.append(buildPanel(introCol, leftCol, rightCol, panelId));

    if (leftCol instanceof Element) leftCol.remove();
    if (rightCol instanceof Element) rightCol.remove();

    const button = section.querySelector('.accordion-cards-item-trigger');
    if (button instanceof HTMLButtonElement) {
      button.addEventListener('click', () => {
        setSectionExpanded(section, !section.classList.contains('is-expanded'));
        scheduleAccordionCardsScroll(section.querySelector('.accordion-cards-item-header'));
      });
    }

    if (index === 0) setSectionExpanded(section, true);
    wrapper.append(section);
  });

  block.textContent = '';
  block.append(wrapper);
  setupAccordionCardsEmailForm(block);
}
