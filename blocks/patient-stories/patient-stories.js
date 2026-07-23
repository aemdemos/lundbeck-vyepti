import { loadFragment } from '../fragment/fragment.js';

const BRIGHTCOVE_ACCOUNT = '4804905851001';
const BRIGHTCOVE_PLAYER = 'BN991zH3Xh';

// Reads the story slug used for the ?assetId deep-link from a fragment path
// (the fragment's basename is authored to equal the source assetId, preserving
// shareable links from the original site).
function assetIdFromPath(path) {
  return path.split('/').filter(Boolean).pop();
}

function buildBrightcovePlayer(videoId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'patient-stories-video';
  const iframe = document.createElement('iframe');
  iframe.src = `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}_default/index.html?videoId=${videoId}`;
  iframe.allow = 'encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.title = 'Video player';
  wrapper.append(iframe);
  return wrapper;
}

// Turns a loaded fragment into the detail-panel body. Video stories are authored
// with a Brightcove player link (…/index.html?videoId=…); everything else renders
// as-is (patient photo + quote paragraphs).
function buildDetailBody(fragment) {
  const body = document.createElement('div');
  body.className = 'patient-stories-detail-body';

  const bcLink = [...fragment.querySelectorAll('a')]
    .find((a) => a.href.includes('players.brightcove.net'));

  if (bcLink) {
    const videoId = new URL(bcLink.href).searchParams.get('videoId');
    if (videoId) body.append(buildBrightcovePlayer(videoId));
    bcLink.closest('p')?.remove();
  }

  [...fragment.children].forEach((section) => {
    [...section.children].forEach((wrapper) => body.append(wrapper));
  });

  return body;
}

function closeDetail(block) {
  const open = block.querySelector('.patient-stories-detail');
  if (open) open.remove();
  block.querySelectorAll('.patient-stories-card.is-open')
    .forEach((c) => c.classList.remove('is-open'));
}

async function openDetail(block, card) {
  closeDetail(block);
  card.classList.add('is-open');

  const detail = document.createElement('div');
  detail.className = 'patient-stories-detail';
  detail.innerHTML = '<div class="patient-stories-detail-inner"><button type="button" class="patient-stories-detail-close" aria-label="Close">×</button></div>';
  const inner = detail.querySelector('.patient-stories-detail-inner');
  inner.querySelector('.patient-stories-detail-close')
    .addEventListener('click', () => {
      closeDetail(block);
      const url = new URL(window.location);
      url.searchParams.delete('assetId');
      window.history.replaceState({}, '', url);
    });

  block.prepend(detail);

  const fragment = await loadFragment(card.dataset.fragment);
  if (fragment) inner.append(buildDetailBody(fragment));

  const url = new URL(window.location);
  url.searchParams.set('assetId', card.dataset.assetId);
  window.history.replaceState({}, '', url);

  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default async function decorate(block) {
  const rows = [...block.children];
  const cards = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const picture = cells[0]?.querySelector('picture');
    const title = (cells[1]?.textContent || '').trim();
    const fragmentPath = (cells[2]?.textContent || '').trim();
    const duration = (cells[3]?.textContent || '').trim();
    if (!fragmentPath) return;

    const card = document.createElement('article');
    card.className = 'patient-stories-card';
    card.classList.add(duration ? 'patient-stories-card-video' : 'patient-stories-card-text');
    card.dataset.fragment = fragmentPath;
    card.dataset.assetId = assetIdFromPath(fragmentPath);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', title);

    const media = document.createElement('div');
    media.className = 'patient-stories-card-media';
    if (picture) media.append(picture);
    if (duration) {
      const badge = document.createElement('span');
      badge.className = 'patient-stories-card-duration';
      badge.textContent = duration;
      media.append(badge);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'patient-stories-card-title';
    titleEl.textContent = title;

    const plus = document.createElement('span');
    plus.className = 'patient-stories-card-plus';
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+';

    card.append(media, titleEl, plus);
    card.addEventListener('click', () => openDetail(block, card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(block, card); }
    });

    cards.push(card);
    row.replaceWith(card);
  });

  const requested = new URL(window.location).searchParams.get('assetId');
  if (requested) {
    const match = cards.find((c) => c.dataset.assetId === requested);
    if (match) openDetail(block, match);
  }
}
