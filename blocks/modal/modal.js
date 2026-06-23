import { loadFragment } from '../fragment/fragment.js';
import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';

/*
  This is not a traditional block, so there is no decorate function.
  Instead, links to a /modals/ path are automatically transformed into a modal.
  Other blocks can also use the createModal() and openModal() functions.
*/

/**
 * Groups the entrance modal's decorated content into three layout zones
 * (logo, text, actions) so CSS can arrange them in a row. Structural only —
 * all copy and links remain authored in the fragment.
 * @param {HTMLElement} root The modal-content element
 */
function groupEntranceLayout(root) {
  const wrapper = root.querySelector('.default-content-wrapper') || root;
  const logo = wrapper.querySelector(':scope > p:has(picture), :scope > p:has(img)');
  const heading = wrapper.querySelector(':scope > h1, :scope > h2, :scope > h3');
  const actions = [...wrapper.querySelectorAll(':scope > .button-wrapper')];
  // body = paragraphs that are neither the logo nor a button wrapper
  const body = [...wrapper.querySelectorAll(':scope > p')]
    .filter((p) => p !== logo && !p.classList.contains('button-wrapper'));

  if (logo) logo.classList.add('modal-logo');

  if (heading || body.length) {
    const text = document.createElement('div');
    text.className = 'modal-text';
    if (heading) text.append(heading);
    body.forEach((p) => text.append(p));
    wrapper.insertBefore(text, actions[0] || null);
  }

  if (actions.length) {
    const group = document.createElement('div');
    group.className = 'modal-actions';
    actions.forEach((a) => group.append(a));
    wrapper.append(group);
  }
}

export async function createModal(contentNodes, options = {}) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  const { variant } = options;
  if (variant) dialog.classList.add(`modal-${variant}`);
  if (variant === 'entrance') groupEntranceLayout(dialogContent);

  // When dismissUrl is set, dismissing the modal (X, click-outside, Escape)
  // navigates there instead of just closing — unless already on that path,
  // in which case it closes to avoid reloading the current page.
  const { dismissUrl } = options;
  const dismiss = () => {
    if (dismissUrl
      && window.location.pathname !== new URL(dismissUrl, window.location).pathname) {
      window.location.href = dismissUrl;
    } else {
      dialog.close();
    }
  };

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  const closeIcon = document.createElement('span');
  closeIcon.className = 'icon icon-close';
  closeButton.appendChild(closeIcon);
  closeButton.addEventListener('click', dismiss);
  dialog.prepend(closeButton);

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // dismiss on Escape (native dialog 'cancel') so it follows dismissUrl too
  dialog.addEventListener('cancel', (e) => {
    if (dismissUrl) {
      e.preventDefault();
      dismiss();
    }
  });

  // close on click outside the dialog
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      dismiss();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    block.remove();
  });

  block.innerHTML = '';
  block.append(dialog);

  return {
    block,
    showModal: () => {
      dialog.showModal();
      // reset scroll position
      setTimeout(() => { dialogContent.scrollTop = 0; }, 0);
      document.body.classList.add('modal-open');
    },
  };
}

export async function openModal(fragmentUrl, options = {}) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  const { showModal } = await createModal(fragment.childNodes, options);
  showModal();
}
