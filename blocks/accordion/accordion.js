import { moveInstrumentation } from '../../scripts/scripts.js';

// transcript variant expand/collapse icons
const ASSET_BASE = 'https://www.assets.lundbeck-tools.com/content/dam/lundbeck/vyepti';
const TRANSCRIPT_EXPAND_ICON = `${ASSET_BASE}/overhaul/images/expand-22-desktop.svg`;
const TRANSCRIPT_COLLAPSE_ICON = `${ASSET_BASE}/overhaul/images/collapse-22-desktop.svg`;

function getScrollOffset() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--accordion-scroll-offset')
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 40;
}

function getScrollDuration() {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--accordion-scroll-duration')
    .trim();
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 500;
}

function scrollAccordionItemIntoView(item) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offset = getScrollOffset();
  const scrollTarget = () => item.getBoundingClientRect().top + window.scrollY - offset;

  if (reduce) {
    window.scrollTo({ top: scrollTarget(), behavior: 'auto' });
    return;
  }

  const duration = getScrollDuration();
  const start = window.scrollY;
  const target = scrollTarget();
  const distance = target - start;

  if (Math.abs(distance) < 1) {
    return;
  }

  let startTime;
  const step = (timestamp) => {
    if (startTime === undefined) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
    window.scrollTo({ top: start + distance * eased, behavior: 'auto' });
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };

  window.requestAnimationFrame(step);
}

// transcript variant: icon + "Open/Close transcript" label that swap on toggle
function decorateTranscriptLabel(label) {
  const textEl = label.querySelector('p') || label;
  const openText = textEl.textContent.trim() || 'Open transcript';
  const closeText = openText.replace(/^open\b/i, (m) => (m === 'OPEN' ? 'CLOSE' : 'Close'));

  const icon = document.createElement('img');
  icon.className = 'accordion-transcript-icon';
  icon.src = TRANSCRIPT_EXPAND_ICON;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');
  icon.loading = 'lazy';
  label.prepend(icon);

  return (isActive) => {
    icon.src = isActive ? TRANSCRIPT_COLLAPSE_ICON : TRANSCRIPT_EXPAND_ICON;
    textEl.textContent = isActive ? closeText : openText;
  };
}

// split each transcript line's leading "M:SS" timestamp into its own column
function splitTranscriptTimestamps(body) {
  body.querySelectorAll(':scope > p').forEach((p) => {
    const match = p.textContent.match(/^\s*(\d+:\d{2})(.*)$/s);
    if (!match) return;
    const [, time] = match;
    const rest = match[2].replace(/^\s+/, '');
    p.textContent = '';
    const num = document.createElement('span');
    num.className = 'accordion-transcript-number';
    num.textContent = time;
    const text = document.createElement('span');
    text.className = 'accordion-transcript-text';
    text.textContent = rest;
    p.append(num, text);
  });
}

// Author marks the lead/detail split by bolding the lead phrase or a line
// break between the two. Detail is collapsed on mobile, revealed from tablet up.
function decorateFaqLabel(label) {
  const labelText = label.querySelector('p, h1, h2, h3, h4, h5, h6') || label;
  const lead = labelText.querySelector(':scope > strong, :scope > b');
  const lineBreak = labelText.querySelector(':scope > br');
  const detailStart = (lead && lead.nextSibling) ? lead.nextSibling : lineBreak;
  if (!detailStart) return;

  const detail = document.createElement('span');
  detail.className = 'accordion-item-label-detail';
  let node = detailStart;
  while (node) {
    const next = node.nextSibling;
    detail.append(node);
    node = next;
  }
  if (detail.textContent.trim()) labelText.append(detail);
}

function buildLabel(label, isTranscript) {
  if (label === null || label === undefined) return undefined;
  label.className = 'accordion-item-label';
  if (isTranscript) return decorateTranscriptLabel(label);
  decorateFaqLabel(label);
  return undefined;
}

function buildBody(body, isTranscript) {
  if (body === null || body === undefined) return;
  body.className = 'accordion-item-body';
  if (isTranscript) splitTranscriptTimestamps(body);
}

// The whole card toggles the item; clicks inside the open body are ignored
// so links stay clickable and body text stays selectable.
// Single expansion: opening one item closes the others (matches vyepti.com/vyepti-faq).
function attachToggleHandler(li, ul, body, isTranscript, updateTranscriptLabel) {
  li.addEventListener('click', (e) => {
    if (body && body.contains(e.target)) return;
    const wasActive = li.classList.contains('active');
    ul.querySelectorAll('.accordion-item.active').forEach((item) => {
      item.classList.remove('active');
    });
    if (!wasActive) li.classList.add('active');
    if (updateTranscriptLabel) updateTranscriptLabel(!wasActive);
    // transcript grows in place; only the FAQ scrolls into view
    if (!isTranscript) {
      window.requestAnimationFrame(() => scrollAccordionItemIntoView(li));
    }
  });
}

function buildAccordionItem(row, ul, isTranscript) {
  const li = document.createElement('li');
  li.className = 'accordion-item';
  moveInstrumentation(row, li);
  while (row.firstElementChild) li.append(row.firstElementChild);

  const [label, body] = [...li.children];
  const updateTranscriptLabel = buildLabel(label, isTranscript);
  buildBody(body, isTranscript);
  attachToggleHandler(li, ul, body, isTranscript, updateTranscriptLabel);

  ul.append(li);
}

export default function decorate(block) {
  const isTranscript = !!block.closest('.section.video-accent');
  if (isTranscript) block.classList.add('transcript');

  const ul = document.createElement('ul');
  [...block.children].forEach((row) => buildAccordionItem(row, ul, isTranscript));

  block.textContent = '';
  block.append(ul);
}
