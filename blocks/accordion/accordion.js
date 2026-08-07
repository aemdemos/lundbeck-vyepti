import { moveInstrumentation } from '../../scripts/scripts.js';

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

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'accordion-item';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);

    const [label, body] = [...li.children];
    if (label) {
      label.className = 'accordion-item-label';

      // The label splits into a lead phrase and a trailing "detail". Authors mark
      // the split one of two ways: bolding the lead phrase, or a line break between
      // the two phrases. The detail is collapsed on mobile and revealed from tablet up.
      const labelText = label.querySelector('p, h1, h2, h3, h4, h5, h6') || label;
      const lead = labelText.querySelector(':scope > strong, :scope > b');
      const lineBreak = labelText.querySelector(':scope > br');
      // Detail begins after the bold lead, or at the line break itself (the <br> is
      // kept inside the detail so CSS controls the wrap: hidden on mobile, its own
      // line on tablet, folded onto one line on desktop).
      const detailStart = (lead && lead.nextSibling) ? lead.nextSibling : lineBreak;
      if (detailStart) {
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
    }
    if (body) body.className = 'accordion-item-body';

    // The whole card toggles the item; clicks inside the open body are ignored
    // so links stay clickable and body text stays selectable.
    // Single expansion: opening one item closes the others (matches vyepti.com/vyepti-faq).
    li.addEventListener('click', (e) => {
      if (body && body.contains(e.target)) return;
      const wasActive = li.classList.contains('active');
      ul.querySelectorAll('.accordion-item.active').forEach((item) => {
        item.classList.remove('active');
      });
      if (!wasActive) li.classList.add('active');
      window.requestAnimationFrame(() => scrollAccordionItemIntoView(li));
    });

    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
