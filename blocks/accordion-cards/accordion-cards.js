import { moveInstrumentation, decorateButtons } from '../../scripts/scripts.js';

function getScrollOffset() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--accordion-cards-scroll-offset')
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 40;
}

function getScrollDuration() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--accordion-cards-scroll-duration')
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 500;
}

// An action paragraph is a trailing paragraph made up only of links (Download, Email,
// etc.) — its visible text is exactly its links' text, ignoring icon tokens/whitespace.
// This distinguishes an action row from a body paragraph that merely contains an inline
// link (e.g. the "Doctor Discussion Guide" sentence).
function isActionParagraph(node) {
  if (!(node instanceof Element) || !node.matches('p')) return false;
  const anchors = [...node.querySelectorAll('a')];
  if (!anchors.length) return false;
  const strip = (s) => s.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
  return strip(node.textContent) === strip(anchors.map((a) => a.textContent).join(' '));
}

// Collects the trailing run of action-link paragraphs into a single actions row. When a
// link is authored as bold, decorateButtons (invoked early in decorate) has already given
// it the .button class; here we only tag it as an action link. An authored /modals/… link
// is still auto-opened as a modal by the global autolinkModals handler; the button chrome
// is overridden to the plain text-link + icon style in CSS.
function normalizeActionLinks(bodyCol) {
  const children = [...bodyCol.children];
  const actionParagraphs = [];
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (isActionParagraph(child)) {
      actionParagraphs.unshift(child);
    } else if (actionParagraphs.length) {
      break;
    }
  }
  if (!actionParagraphs.length) return;

  const actions = document.createElement('div');
  actions.className = 'accordion-cards-card-actions';
  actionParagraphs.forEach((paragraph) => {
    paragraph.querySelectorAll('a').forEach((anchor) => {
      anchor.classList.add('accordion-cards-action-link');
      actions.append(anchor);
    });
  });
  bodyCol.append(actions);
  actionParagraphs.forEach((paragraph) => paragraph.remove());
}

function styleCardBody(bodyCol) {
  bodyCol.classList.add('accordion-cards-card-body');
  bodyCol.querySelectorAll('h3, h4').forEach((heading) => {
    if (!heading.querySelector('picture, img')) {
      heading.classList.add('accordion-cards-card-title');
    }
  });
  normalizeActionLinks(bodyCol);
}

// A row is a single card: [heading, intro, image, body]. The image column becomes the
// card's media, the body column its content. Both are re-used in place.
function buildCard(imageCol, bodyCol) {
  const card = document.createElement('article');
  card.className = 'accordion-cards-card';

  const image = document.createElement('div');
  image.className = 'accordion-cards-card-image';
  if (imageCol instanceof Element) {
    while (imageCol.firstElementChild) image.append(imageCol.firstElementChild);
  }

  const body = document.createElement('div');
  if (bodyCol instanceof Element) {
    // The loop removes one child per iteration and is therefore finite.
    // eslint-disable-next-line secure-coding/no-unchecked-loop-condition
    while (bodyCol.firstElementChild) body.append(bodyCol.firstElementChild);
  }
  styleCardBody(body);

  card.append(image, body);
  return card;
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
    - getScrollOffset();
  animateScrollTo(top, getScrollDuration());
}

function scheduleAccordionCardsScroll(header) {
  // measure after expand/collapse reflow (matches live jQuery handler timing)
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollAccordionCardsHeaderIntoView(header);
    });
  });
}

function createSection(headingCol, introCol, panelId) {
  const section = document.createElement('section');
  section.className = 'accordion-cards-item';
  section.append(createSectionHeader(headingCol, panelId));

  const panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'accordion-cards-item-panel';
  panel.setAttribute('role', 'region');

  if (introCol instanceof Element && introCol.textContent.trim()) {
    introCol.className = 'accordion-cards-item-intro';
    panel.append(introCol);
  }

  const cards = document.createElement('div');
  cards.className = 'accordion-cards-columns';
  panel.append(cards);
  section.append(panel);

  const button = section.querySelector('.accordion-cards-item-trigger');
  if (button instanceof HTMLButtonElement) {
    button.addEventListener('click', () => {
      setSectionExpanded(section, !section.classList.contains('is-expanded'));
      scheduleAccordionCardsScroll(section.querySelector('.accordion-cards-item-header'));
    });
  }

  return section;
}

export default function decorate(block) {
  // Buttonize authored links up front: a bold action link already carries the .button
  // class after this, so normalizeActionLinks only needs to tag and collect them.
  // Idempotent, and also covers the Universal Editor re-decoration path.
  decorateButtons(block);

  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-cards-sections';

  let currentCards = null;
  let sectionIndex = -1;

  // Each row is one card: [heading, intro, image, body]. A non-empty heading starts a new
  // accordion panel; an empty heading appends the row's card to the previous panel.
  [...block.children].forEach((row) => {
    const [headingCol, introCol, imageCol, bodyCol] = [...row.children];
    const hasHeading = headingCol instanceof Element && headingCol.textContent.trim();

    if (hasHeading) {
      sectionIndex += 1;
      const section = createSection(headingCol, introCol, `accordion-cards-panel-${sectionIndex}`);
      wrapper.append(section);
      currentCards = section.querySelector('.accordion-cards-columns');
      if (sectionIndex === 0) setSectionExpanded(section, true);
    }

    if (!currentCards) return;

    const card = buildCard(imageCol, bodyCol);
    moveInstrumentation(row, card);
    currentCards.append(card);
  });

  block.textContent = '';
  block.append(wrapper);
}
