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
  const { pathname } = window.location;
  const base = pathname.replace(/\/$/, '').replace(/\.[^/.]+$/, '');
  return `${base}/fragments/${assetId}`;
}

function buildBrightcoveIframe(videoId) {
  const iframe = document.createElement('iframe');
  iframe.src = `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}_default/index.html?videoId=${videoId}`;
  iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.loading = 'lazy';
  iframe.title = 'Video player';
  return iframe;
}

// Loads the Brightcove Player script once (per account+player) and resolves the
// global `bc` initializer. The script auto-registers a global used to turn a
// <video-js> element into a full player in the SAME document — unlike an iframe,
// this lets us call play() within the click gesture so playback starts on the
// first click (no second Brightcove play button).
let bcScriptPromise;
function loadBrightcoveScript() {
  if (window.bc) return Promise.resolve(window.bc);
  if (!bcScriptPromise) {
    bcScriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://players.brightcove.net/${BRIGHTCOVE_ACCOUNT}/${BRIGHTCOVE_PLAYER}_default/index.min.js`;
      s.onload = () => resolve(window.bc);
      s.onerror = reject;
      document.head.append(s);
    });
  }
  return bcScriptPromise;
}

// Mounts an in-page Brightcove player and starts playback, keeping the teal
// facade on top until the video actually starts playing — so Brightcove's own
// grey poster + white play button never flash during initialization.
async function playInPage(wrapper, facade, videoId) {
  const video = document.createElement('video-js');
  video.setAttribute('data-account', BRIGHTCOVE_ACCOUNT);
  video.setAttribute('data-player', BRIGHTCOVE_PLAYER);
  video.setAttribute('data-embed', 'default');
  video.setAttribute('data-video-id', videoId);
  video.setAttribute('controls', '');
  video.classList.add('vjs-fluid');
  // Insert the player behind the still-visible facade (facade stays last child).
  wrapper.insertBefore(video, facade);

  try {
    const bc = await loadBrightcoveScript();
    const player = bc(video);
    player.ready(() => {
      // Remove our facade only once real playback begins.
      player.one('playing', () => facade.remove());
      const p = player.play();
      if (p && p.catch) p.catch(() => facade.remove());
    });
  } catch {
    // If the player script fails to load, fall back to the iframe embed.
    wrapper.replaceChildren(buildBrightcoveIframe(videoId));
  }
}

// Builds the video area. When a poster thumbnail is available we render a
// facade with the site's teal play circle (matching the card thumbnails, not
// Brightcove's default grey button); clicking it loads the in-page player and
// plays immediately.
function buildBrightcovePlayer(videoId, poster) {
  const wrapper = document.createElement('div');
  wrapper.className = 'patient-stories-video';

  if (!poster) {
    wrapper.append(buildBrightcoveIframe(videoId));
    return wrapper;
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'patient-stories-video-facade';
  button.setAttribute('aria-label', 'Play video');
  button.append(poster);
  const play = document.createElement('img');
  play.className = 'patient-stories-video-play';
  play.src = PLAY_ICON;
  play.alt = '';
  play.setAttribute('aria-hidden', 'true');
  button.append(play);

  button.addEventListener('click', () => {
    button.disabled = true;
    playInPage(wrapper, button, videoId);
  });

  wrapper.append(button);
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
function buildDetailBody(fragment, posterFallback) {
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
    // Video panel orders title → description → player → transcript, and its text
    // spans the full (wider) video column rather than the narrow text column.
    body.classList.add('patient-stories-detail-body-video');
    const videoId = new URL(bcLink.href).searchParams.get('videoId');
    if (heading) body.append(heading);
    paragraphs.forEach((p) => body.append(p));
    if (videoId) body.append(buildBrightcovePlayer(videoId, pictureEl || posterFallback));
    // Only show the Open-transcript toggle when a transcript was authored; videos
    // without one (matching the source) get no toggle.
    if (transcriptNodes.length) body.append(buildTranscript(transcriptNodes));
  } else {
    if (heading) body.append(heading);
    paragraphs.forEach((p) => body.append(p));
    // Photo with the coral quote-bubble overlay in the bottom-right corner,
    // matching the collapsed card and the source's expanded detail.
    if (pictureEl) {
      const media = document.createElement('div');
      media.className = 'patient-stories-detail-media';
      const overlay = document.createElement('img');
      overlay.className = 'patient-stories-card-icon';
      overlay.src = QUOTE_ICON;
      overlay.alt = '';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.loading = 'lazy';
      media.append(pictureEl, overlay);
      body.append(media);
    }
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

  // Video fragments have no poster image, so fall back to the card's thumbnail
  // (cloned) as the facade poster behind the teal play button.
  const cardThumb = card.querySelector('.patient-stories-card-media picture');
  const posterFallback = cardThumb ? cardThumb.cloneNode(true) : null;

  const fragment = await loadFragment(card.dataset.fragment);
  if (fragment) inner.append(buildDetailBody(fragment, posterFallback));

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
      const pressed = e.key;
      if (pressed === 'Enter' || pressed === ' ') { e.preventDefault(); openDetail(block, card); }
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
