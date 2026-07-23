import { loadFragment } from '../fragment/fragment.js';

const BRIGHTCOVE_ACCOUNT = '4804905851001';
const BRIGHTCOVE_PLAYER = 'BN991zH3Xh';

const ASSET_BASE = 'https://www.assets.lundbeck-tools.com/content/dam/lundbeck/vyepti';
const QUOTE_ICON = `${ASSET_BASE}/2024-dot-03/svg/desktop/icon-quote-coral-60-desktop.svg`;
const PLAY_ICON = `${ASSET_BASE}/overhaul/images/play-blue-30-mobile.svg`;
const EXPAND_ICON = `${ASSET_BASE}/overhaul/images/expand-22-desktop.svg`;
const COLLAPSE_ICON = `${ASSET_BASE}/overhaul/images/collapse-22-desktop.svg`;
const STAR_ICON = `${ASSET_BASE}/overhaul/images/mvp-indicator-20-mobile.svg`;

// Builds the fragment path for a story relative to the CURRENT page path, so it
// resolves on any host (local dev serves under /content/…, the deployed host serves
// a clean path). The fragment basename equals the source assetId, which also
// preserves the original site's shareable ?assetId deep-links.
function fragmentPathFor(assetId) {
  const base = window.location.pathname.replace(/\/$/, '').replace(/\.[^/.]+$/, '');
  return `${base}/fragments/${assetId}`;
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

// Collapsible "Open transcript" control for video stories, matching the source.
// The transcript body is authored in the fragment under a heading whose text is
// "Transcript" (everything after that heading). When absent, the toggle still
// renders (transcript can be authored later) but stays empty.
function buildTranscript(transcriptNodes) {
  const wrap = document.createElement('div');
  wrap.className = 'patient-stories-transcript';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'patient-stories-transcript-toggle';
  const icon = document.createElement('img');
  icon.src = EXPAND_ICON;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.textContent = 'Open transcript';
  toggle.append(icon, label);
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'patient-stories-transcript-body';
  panel.hidden = true;
  transcriptNodes.forEach((n) => panel.append(n));

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
    icon.src = open ? EXPAND_ICON : COLLAPSE_ICON;
    label.textContent = open ? 'Open transcript' : 'Close transcript';
  });

  wrap.append(toggle, panel);
  return wrap;
}

// Turns a loaded fragment into the detail-panel body. Order matches the source:
//  - text story:  title → quote/description paragraphs → patient photo
//  - video story: Brightcove player → title → description → Open-transcript toggle
function buildDetailBody(fragment) {
  const body = document.createElement('div');
  body.className = 'patient-stories-detail-body';

  const heading = fragment.querySelector('h1, h2, h3, h4, h5, h6');
  const bcLink = [...fragment.querySelectorAll('a')]
    .find((a) => a.href.includes('players.brightcove.net'));
  const pictureEl = fragment.querySelector('picture');
  const isVideo = !!bcLink;

  // Transcript content is authored under a heading whose text is "Transcript";
  // collect that heading's following siblings as the transcript body.
  const transcriptHeading = [...fragment.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .find((h) => /^transcript$/i.test(h.textContent.trim()));
  const transcriptNodes = [];
  if (transcriptHeading) {
    let node = transcriptHeading.nextElementSibling;
    while (node) { const next = node.nextElementSibling; transcriptNodes.push(node); node = next; }
    transcriptHeading.remove();
  }

  const paragraphs = [...fragment.querySelectorAll('p')]
    .filter((p) => p.textContent.trim()
      && !p.querySelector('picture, a[href*="players.brightcove.net"]')
      && !transcriptNodes.includes(p) && !transcriptNodes.some((t) => t.contains(p)));

  if (isVideo) {
    // Video panel differs from text: it spans the full content column (wider than
    // the 702px text column) and orders title → description → player → transcript.
    body.classList.add('patient-stories-detail-body-video');
    const videoId = new URL(bcLink.href).searchParams.get('videoId');
    if (heading) body.append(heading);
    paragraphs.forEach((p) => body.append(p));
    if (videoId) body.append(buildBrightcovePlayer(videoId));
    // Only show the Open-transcript toggle when a transcript was authored; videos
    // without one (matching the source) get no toggle.
    if (transcriptNodes.length) body.append(buildTranscript(transcriptNodes));
  } else {
    if (heading) body.append(heading);
    paragraphs.forEach((p) => body.append(p));
    if (pictureEl) body.append(pictureEl);
  }

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
  detail.innerHTML = '<div class="patient-stories-detail-inner"></div>';
  const inner = detail.querySelector('.patient-stories-detail-inner');

  // Position matches the source, which differs by breakpoint:
  //  - mobile (<600px): the clicked card is hidden and the full-width detail takes
  //    its place in-flow (no duplicate collapsed card left behind).
  //  - tablet/desktop (>=600px): the detail opens full-width at the TOP of the grid,
  //    above all cards (the clicked card stays collapsed in place).
  const wide = window.matchMedia('(min-width: 600px)').matches;
  if (wide) {
    block.prepend(detail);
  } else {
    card.after(detail);
  }

  const fragment = await loadFragment(card.dataset.fragment);
  if (fragment) inner.append(buildDetailBody(fragment));

  const url = new URL(window.location);
  url.searchParams.set('assetId', card.dataset.assetId);
  window.history.replaceState({}, '', url);

  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export default async function decorate(block) {
  const rows = [...block.children];
  const cards = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const picture = cells[0]?.querySelector('picture');
    const title = (cells[1]?.textContent || '').trim();
    const preview = (cells[2]?.textContent || '').trim();
    const assetId = (cells[3]?.textContent || '').trim();
    const duration = (cells[4]?.textContent || '').trim();
    const paid = !!(cells[5]?.textContent || '').trim();
    if (!assetId) return;
    const isVideo = !!duration;
    const fragmentPath = fragmentPathFor(assetId);

    const card = document.createElement('article');
    card.className = 'patient-stories-card';
    card.classList.add(isVideo ? 'patient-stories-card-video' : 'patient-stories-card-text');
    card.dataset.fragment = fragmentPath;
    card.dataset.assetId = assetId;
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
    // star badge (top-left) marks a compensated patient ambassador
    if (paid) {
      const star = document.createElement('img');
      star.className = 'patient-stories-card-star';
      star.src = STAR_ICON;
      star.alt = 'Patient was compensated for their time';
      star.loading = 'lazy';
      media.append(star);
    }
    // overlay icon: rose quote-bubble on text cards, teal play-circle on videos
    const overlay = document.createElement('img');
    overlay.className = 'patient-stories-card-icon';
    overlay.src = isVideo ? PLAY_ICON : QUOTE_ICON;
    overlay.alt = '';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.loading = 'lazy';
    media.append(overlay);

    const body = document.createElement('div');
    body.className = 'patient-stories-card-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'patient-stories-card-title';
    titleEl.textContent = title;
    body.append(titleEl);

    if (preview) {
      const previewEl = document.createElement('div');
      previewEl.className = 'patient-stories-card-preview';
      previewEl.textContent = preview;
      body.append(previewEl);
    }

    const plus = document.createElement('span');
    plus.className = 'patient-stories-card-plus';
    plus.setAttribute('aria-hidden', 'true');
    plus.textContent = '+';
    body.append(plus);

    card.append(media, body);
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
