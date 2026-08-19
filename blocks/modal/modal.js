import { loadFragment } from '../fragment/fragment.js';
import {
  buildBlock, decorateBlock, loadBlock, loadCSS,
} from '../../scripts/aem.js';

/*
  This is not a traditional block, so there is no decorate function.
  Instead, links to a /modals/ path are automatically transformed into a modal.
  Other blocks can also use the createModal() and openModal() functions.
*/

/*
  The entrance gate ("Have you been prescribed VYEPTI?") records the visitor's
  Yep/Nope choice as a session cookie (cleared when the browser closes), so the
  index page can redirect straight to /index-y or /index-n on a later visit
  instead of showing the modal again. Closing the modal via the X sets no
  cookie, so the gate reappears next time.
*/
const GATE_COOKIE = 'prescriptionStatus';
const GATE_REDIRECTS = new Map([['true', '/index-y'], ['false', '/index-n']]);

function storedGateChoice() {
  const entry = document.cookie.split('; ').find((c) => c.startsWith(`${GATE_COOKIE}=`));
  return entry ? entry.slice(GATE_COOKIE.length + 1) : '';
}

function gateChoiceFromHref(href) {
  if (href.includes('/index-y')) return 'true';
  if (href.includes('/index-n')) return 'false';
  return '';
}

function rememberGateChoice(choice) {
  if (choice) document.cookie = `${GATE_COOKIE}=${choice}; path=/; SameSite=Lax; Secure`;
}

/** Redirect target for the stored gate choice, or '' if none is stored. */
export function getGateRedirectTarget() {
  return GATE_REDIRECTS.get(storedGateChoice()) || '';
}

export async function createModal(contentNodes, { gate = false } = {}) {
  await loadCSS(`${window.hlx.codeBasePath}/blocks/modal/modal.css`);
  const dialog = document.createElement('dialog');
  const dialogContent = document.createElement('div');
  dialogContent.classList.add('modal-content');
  dialogContent.append(...contentNodes);
  dialog.append(dialogContent);

  const closeButton = document.createElement('button');
  closeButton.classList.add('close-button');
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.type = 'button';
  const closeIcon = document.createElement('span');
  closeIcon.className = 'icon icon-close';
  closeButton.appendChild(closeIcon);
  closeButton.addEventListener('click', () => dialog.close());
  dialog.prepend(closeButton);

  // record the visitor's Yep/Nope choice before the browser navigates to index-y/index-n
  if (gate) {
    dialogContent.querySelectorAll('.modal-buttons a').forEach((link) => {
      link.addEventListener('click', () => {
        rememberGateChoice(gateChoiceFromHref(link.getAttribute('href') || ''));
      });
    });
  }

  const block = buildBlock('modal', '');
  document.querySelector('main').append(block);
  decorateBlock(block);
  await loadBlock(block);

  // close on click outside the dialog
  dialog.addEventListener('click', (e) => {
    const {
      left, right, top, bottom,
    } = dialog.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
      dialog.close();
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

export async function openModal(fragmentUrl, { targetUrl, gate } = {}) {
  const path = fragmentUrl.startsWith('http')
    ? new URL(fragmentUrl, window.location).pathname
    : fragmentUrl;

  const fragment = await loadFragment(path);
  const { block, showModal } = await createModal(fragment.childNodes, { gate });

  // interstitial: wire the Ok/Cancel actions to the outgoing link
  if (targetUrl) {
    block.classList.add('exit');
    const dialog = block.querySelector('dialog');
    const actionWrappers = [];
    block.querySelectorAll('.modal-content a').forEach((a) => {
      const label = (a.title || a.textContent).trim().toLowerCase();
      a.classList.remove('primary', 'secondary', 'accent');
      if (label === 'ok') {
        a.classList.add('ok');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.addEventListener('click', () => dialog.close());
        actionWrappers.push(a.closest('.button-wrapper') || a);
      } else if (label === 'cancel') {
        a.classList.add('cancel');
        a.addEventListener('click', (e) => {
          e.preventDefault();
          dialog.close();
        });
        actionWrappers.push(a.closest('.button-wrapper') || a);
      }
    });

    // group Ok/Cancel into a centered action row
    if (actionWrappers.length) {
      const actions = document.createElement('div');
      actions.className = 'modal-actions';
      actionWrappers[0].before(actions);
      actions.append(...actionWrappers);
    }
  }

  showModal();
}
