/**
 * ISI (Important Safety Information) block.
 *
 * Authored with two rows:
 *   Row 1 – abbreviated content shown in the persistent fixed bottom bar.
 *   Row 2 – full inline content rendered in-page when the section scrolls into view.
 *
 * Behaviour:
 *   • When the ISI **section** is outside the viewport the fixed bar is visible.
 *   • Clicking the "+" expands the bar (adds `.full`); clicking "−" collapses it.
 *   • Once the section scrolls into view the bar hides and the inline content displays.
 */

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/** Move every sibling from `start` (inclusive) onward into `target`. */
function moveFrom(start, target) {
  let node = start;
  while (node) {
    const next = node.nextElementSibling;
    target.append(node);
    node = next;
  }
}

/**
 * Split the inline copy into two groups so the layout can reorder them per
 * breakpoint (matches source): APPROVED USE leads on tablet/desktop but drops
 * below the safety copy on mobile. The authored cell is a flat sequence:
 * [APPROVED USE h + p][IMPORTANT SAFETY h + …rest]. Everything from the second
 * heading onward becomes the "safety" group; the leading heading + paragraph
 * become the "approved" group.
 */
function splitInlineGroups(inlineRow) {
  inlineRow.classList.add('isi-inline');
  const inlineCell = inlineRow.querySelector(':scope > div');
  if (!inlineCell) return;

  const headings = [...inlineCell.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')];
  const safetyHeading = headings[1];
  if (!safetyHeading) return;

  const approvedGroup = document.createElement('div');
  approvedGroup.className = 'isi-inline-approved';
  const safetyGroup = document.createElement('div');
  safetyGroup.className = 'isi-inline-safety';

  /* Move the leading heading + everything up to (not including) the safety
     heading into the approved group; the rest into the safety group. */
  let node = inlineCell.firstElementChild;
  let target = approvedGroup;
  while (node) {
    const next = node.nextElementSibling;
    if (node === safetyHeading) target = safetyGroup;
    target.append(node);
    node = next;
  }
  inlineCell.append(approvedGroup, safetyGroup);
}

/**
 * Split the ISI bar column: keep heading + first paragraph in the top-left
 * column and move the remainder into a full-width block placed after the
 * APPROVED USE column (matches source layout).
 */
function splitBarIsiColumn(isiCell, barContent) {
  if (!isiCell) return;
  const heading = isiCell.querySelector(HEADING_SELECTOR);
  const firstPara = heading ? heading.nextElementSibling : isiCell.querySelector('p');
  const fullBlock = document.createElement('div');
  fullBlock.className = 'isi-bar-col isi-bar-col-full';
  moveFrom(firstPara ? firstPara.nextElementSibling : null, fullBlock);
  if (fullBlock.children.length) barContent.append(fullBlock);
}

/** Build the toggle (+/−) button. */
function buildToggle() {
  const toggle = document.createElement('button');
  toggle.className = 'isi-bar-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Expand safety information');
  toggle.type = 'button';
  const icon = document.createElement('span');
  icon.className = 'isi-bar-toggle-icon';
  toggle.append(icon);
  return toggle;
}

/**
 * Build the fixed bottom bar from the abbreviated row and return
 * { bar, toggle }. The source lays out [ISI intro | APPROVED USE] on the top
 * row, then the rest of the ISI copy full-width below.
 */
function buildBar(abbreviatedRow) {
  const bar = document.createElement('div');
  bar.className = 'isi-bar';
  bar.setAttribute('aria-label', 'Important Safety Information');
  /* Pin critical positioning AND the collapsed height inline so the bar is both
     fixed and height-capped the instant it enters the DOM — prevents a large
     layout shift (CLS up to 1.0) when the block CSS has not finished loading as
     the bar is appended to <body>. Without the height cap the bar renders at
     full content height anchored to bottom:0, filling the viewport, then snaps
     down to the collapsed bar height once isi.css loads. --isi-bar-height (118px
     mobile / 109px desktop) is the same token isi.css uses; the literal fallback
     covers the window before isi-tokens.css resolves the custom property. */
  bar.style.position = 'fixed';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.bottom = '0';
  bar.style.boxSizing = 'border-box';
  bar.style.overflow = 'hidden';
  bar.style.maxHeight = 'var(--isi-bar-height, 118px)';
  /* Hidden until its internal layout settles (revealed in decorate on the next
     frame). visibility:hidden elements are excluded from layout-shift scoring,
     so the bar's content reflow while isi.css/isi-tokens.css finish applying is
     not counted as CLS — matching the boilerplate header/footer reveal pattern. */
  bar.style.visibility = 'hidden';

  const barContent = document.createElement('div');
  barContent.className = 'isi-bar-content';

  const abbrCells = [...abbreviatedRow.children];
  const [isiCell, approvedCell] = abbrCells;

  if (isiCell) {
    isiCell.classList.add('isi-bar-col');
    barContent.append(isiCell);
  }
  if (approvedCell) {
    approvedCell.classList.add('isi-bar-col', 'isi-bar-col-approved');
    barContent.append(approvedCell);
  }

  splitBarIsiColumn(isiCell, barContent);

  /* Any additional authored cells beyond the first two */
  abbrCells.slice(2).forEach((cell) => {
    cell.classList.add('isi-bar-col');
    barContent.append(cell);
  });

  const toggle = buildToggle();
  bar.append(barContent, toggle);
  return { bar, toggle };
}

/**
 * Wire up the bar behaviour: expanded-height measurement, expand/collapse
 * toggle, click-to-expand, and the IntersectionObserver that shows/hides it.
 */
function wireBar(bar, toggle, section) {
  /* On mobile/tablet the expanded panel must open flush against the header
     bottom with no gap. The header height differs per breakpoint, so measure it
     and expose it as a custom property the CSS uses to cap the expanded height. */
  const updateExpandedHeight = () => {
    const header = document.querySelector('header .nav-wrapper') || document.querySelector('header');
    const offset = header ? Math.round(header.getBoundingClientRect().height) : 0;
    bar.style.setProperty('--isi-expanded-offset', `${offset}px`);
  };
  updateExpandedHeight();
  window.addEventListener('resize', updateExpandedHeight);

  /* Lock/unlock page scroll while the panel is open (mobile/tablet behaviour of
     the source: the page cannot scroll, only the ISI panel scrolls internally).
     Applied at all widths — harmless on desktop where the panel is short. */
  const setExpanded = (expanded) => {
    bar.classList.toggle('full', expanded);
    /* Drop the inline CLS-guard height cap (set in buildBar) so the stylesheet's
       .isi-bar / .isi-bar.full rules govern height from the first interaction —
       an inline max-height would out-specify the .full rule and block expansion.
       By the time any expand/collapse fires, isi.css has long since loaded. */
    bar.style.removeProperty('max-height');
    bar.style.removeProperty('overflow');
    document.body.classList.toggle('isi-scroll-locked', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute(
      'aria-label',
      expanded ? 'Collapse safety information' : 'Expand safety information',
    );
  };

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    updateExpandedHeight();
    setExpanded(!bar.classList.contains('full'));
  });

  /* Clicking anywhere on the collapsed bar also expands it */
  bar.addEventListener('click', () => {
    if (!bar.classList.contains('full')) {
      updateExpandedHeight();
      setExpanded(true);
    }
  });

  if (!section) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        bar.classList.add('isi-bar-hidden');
        setExpanded(false);
      } else {
        bar.classList.remove('isi-bar-hidden');
      }
    },
    { threshold: 0 },
  );
  observer.observe(section);
}

/**
 * loads and decorates the block
 * @param {HTMLElement} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  const [abbreviatedRow, inlineRow] = rows;

  /* 1. Split the inline (in-page) copy into reorderable groups. */
  splitInlineGroups(inlineRow);

  /* 2. Build the fixed bottom bar from the abbreviated row. */
  const { bar, toggle } = buildBar(abbreviatedRow);

  /* Remove the now-empty abbreviated row and append the bar outside page flow. */
  abbreviatedRow.remove();
  document.body.append(bar);

  /* 3. Wire behaviour + visibility observer. */
  wireBar(bar, toggle, block.closest('.section'));

  /* Reveal the bar once its internal layout has settled (see buildBar). Two RAFs
     ensure a full style/layout pass has run so no post-reveal reflow is scored. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.removeProperty('visibility');
    });
  });
}
