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
 *
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  /* ── 1. Split authored rows ─────────────────────────────────── */
  const abbreviatedRow = rows[0];
  const inlineRow = rows[1];

  /* Mark the inline row so CSS can control its visibility */
  inlineRow.classList.add('isi-inline');

  /* Split the inline copy into two groups so the layout can reorder them per
     breakpoint (matches source): APPROVED USE leads on tablet/desktop but drops
     below the safety copy on mobile. The authored cell is a flat sequence:
     [APPROVED USE h + p][IMPORTANT SAFETY h + …rest]. Everything from the second
     heading onward becomes the "safety" group; the leading heading + paragraph
     become the "approved" group. */
  const inlineCell = inlineRow.querySelector(':scope > div');
  if (inlineCell) {
    const headings = [...inlineCell.querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')];
    const safetyHeading = headings[1];
    if (safetyHeading) {
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
  }

  /* ── 2. Build the fixed bottom bar ──────────────────────────── */
  const bar = document.createElement('div');
  bar.className = 'isi-bar';
  bar.setAttribute('aria-label', 'Important Safety Information');
  /* Pin critical positioning inline so the bar is fixed the instant it enters
     the DOM — prevents a large layout shift (CLS) if the block CSS has not
     finished loading when the bar is appended to <body>. */
  bar.style.position = 'fixed';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.bottom = '0';

  /* Move the abbreviated content into the bar */
  const barContent = document.createElement('div');
  barContent.className = 'isi-bar-content';

  /* Re-parent abbreviated children into the bar content wrapper.
     The source lays this out as: [ISI intro | APPROVED USE] on the top row,
     then the rest of the ISI copy (starting at "VYEPTI may cause…") full-width
     below. The first cell holds ALL the ISI copy, so split it: heading + the
     first paragraph stay in the top-left column; everything after moves into a
     full-width block placed after the APPROVED USE column. */
  const abbrCells = [...abbreviatedRow.children];
  const [isiCell, approvedCell] = abbrCells;

  isiCell.classList.add('isi-bar-col');
  barContent.append(isiCell);

  if (approvedCell) {
    approvedCell.classList.add('isi-bar-col', 'isi-bar-col-approved');
    barContent.append(approvedCell);
  }

  /* Split the ISI column: keep heading + first paragraph, move the remainder
     into a full-width block below the two top columns. */
  if (isiCell) {
    const heading = isiCell.querySelector('h1, h2, h3, h4, h5, h6');
    const firstPara = heading
      ? heading.nextElementSibling
      : isiCell.querySelector('p');
    const fullBlock = document.createElement('div');
    fullBlock.className = 'isi-bar-col isi-bar-col-full';
    let node = firstPara ? firstPara.nextElementSibling : null;
    while (node) {
      const next = node.nextElementSibling;
      fullBlock.append(node);
      node = next;
    }
    if (fullBlock.children.length) barContent.append(fullBlock);
  }

  /* Any additional authored cells beyond the first two */
  abbrCells.slice(2).forEach((cell) => {
    cell.classList.add('isi-bar-col');
    barContent.append(cell);
  });

  /* Toggle button (+/−) */
  const toggle = document.createElement('button');
  toggle.className = 'isi-bar-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Expand safety information');
  toggle.type = 'button';
  const icon = document.createElement('span');
  icon.className = 'isi-bar-toggle-icon';
  toggle.append(icon);

  bar.append(barContent);
  bar.append(toggle);

  /* Remove the now-empty abbreviated row from the block */
  abbreviatedRow.remove();

  /* Append bar to <body> so it sits outside the page flow */
  document.body.append(bar);

  /* On mobile/tablet the expanded panel must open flush against the header
     bottom with no gap. The header height differs per breakpoint, so measure it
     and expose it as a custom property the CSS uses to cap the expanded height. */
  const updateExpandedHeight = () => {
    const header = document.querySelector('header .nav-wrapper')
      || document.querySelector('header');
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
    document.body.classList.toggle('isi-scroll-locked', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute(
      'aria-label',
      expanded ? 'Collapse safety information' : 'Expand safety information',
    );
  };

  /* ── 3. Expand / collapse toggle ────────────────────────────── */
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

  /* ── 4. IntersectionObserver – show/hide the bar ────────────── */
  const section = block.closest('.section');
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
