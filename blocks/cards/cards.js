import { buildPictureContentFromImageCell } from '../../scripts/utils.js';
import { moveInstrumentation, getBlockId } from '../../scripts/scripts.js';
import { createCard } from '../card/card.js';

// A trailing paragraph made up only of links (Download, Email, …) — its visible text is
// exactly its links' text, ignoring icon tokens/whitespace. Distinguishes an action row
// from a body paragraph that merely contains an inline link.
function isActionParagraph(node) {
  if (!(node instanceof Element) || !node.matches('p')) return false;
  const anchors = [...node.querySelectorAll('a')];
  if (!anchors.length) return false;
  const strip = (s) => s.replace(/:icon-[a-z0-9-]+:/gi, '').replace(/\s+/g, ' ').trim();
  return strip(node.textContent) === strip(anchors.map((a) => a.textContent).join(' '));
}

// Collect the trailing run of action-link paragraphs in a resources card body into a single
// tile-link row, so the download/email links read as plain text + icon (not pill buttons).
function decorateResourcesActions(body) {
  const children = [...body.children];
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
  actions.className = 'cards-card-actions';
  actionParagraphs.forEach((paragraph) => {
    paragraph.querySelectorAll('a').forEach((anchor) => {
      anchor.classList.add('cards-action-link');
      actions.append(anchor);
    });
    paragraph.remove();
  });
  body.append(actions);
}

export default function decorate(block) {
  const blockId = getBlockId('cards');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `Cards for ${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Cards');

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    ul.append(createCard(row));
  });
  ul.querySelectorAll('.cards-card-image').forEach((imageCell) => {
    const firstImg = imageCell.querySelector('picture > img');
    imageCell.replaceChildren(
      buildPictureContentFromImageCell(imageCell, { eagerSingle: false }),
    );
    const newImg = imageCell.querySelector('picture > img');
    if (firstImg && newImg) {
      moveInstrumentation(firstImg, newImg);
    }
  });

  const cardCount = ul.children.length;
  if (cardCount === 2 || cardCount === 3) {
    block.classList.add(`cards-${cardCount}-cols`);
  }

  if (block.classList.contains('resources')) {
    ul.querySelectorAll('.cards-card-body').forEach(decorateResourcesActions);
  }

  block.textContent = '';
  block.append(ul);
}
