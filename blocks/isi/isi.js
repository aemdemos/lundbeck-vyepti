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
    approvedCell.classList.add('isi-bar-col');
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

  /* ── 3. Expand / collapse toggle ────────────────────────────── */
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const expanded = bar.classList.toggle('full');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute(
      'aria-label',
      expanded ? 'Collapse safety information' : 'Expand safety information',
    );
  });

  /* Clicking anywhere on the collapsed bar also expands it */
  bar.addEventListener('click', () => {
    if (!bar.classList.contains('full')) {
      bar.classList.add('full');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Collapse safety information');
    }
  });

  /* ── 4. IntersectionObserver – show/hide the bar ────────────── */
  const section = block.closest('.section');
  if (!section) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        bar.classList.add('isi-bar-hidden');
        bar.classList.remove('full');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        bar.classList.remove('isi-bar-hidden');
      }
    },
    { threshold: 0 },
  );

  observer.observe(section);
}
