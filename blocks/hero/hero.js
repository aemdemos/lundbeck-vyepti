import { buildPictureContentFromImageCell } from '../../scripts/utils.js';

/**
 * Collects the caption nodes inside a hero image column: the text and inline
 * elements that carry the caption copy, skipping <picture>/<img> entirely. Descends
 * into picture-bearing wrappers (the backend often nests the caption in the same
 * <p> as the last <picture>), and returns the caption's own inline nodes in document
 * order so their structure and any raw `[[class]text]` span-tag syntax are preserved.
 * @param {Element} root the image cell/column
 * @returns {ChildNode[]}
 */
function collectCaptionNodes(root) {
  const out = [];
  const visit = (parent) => {
    parent.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue.trim()) out.push(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches('picture, img')) return; // the image itself — never the caption
        if (node.querySelector('picture, img')) {
          visit(node); // wrapper holding a picture (and maybe the caption) — descend
        } else {
          out.push(node); // inline caption element (<em>/<strong>/<span>/<a>/<sup>…)
        }
      }
    });
  };
  visit(root);
  return out;
}

/**
 * Finds an author-entered caption inside a hero image column and returns it as a
 * <p> (or null). Phrase-independent — any copy works. Two delivered shapes are
 * handled: (1) a dedicated <p> with visible text and no image/link, and (2) caption
 * content sitting beside (or nested in the same wrapper as) the <picture> stack —
 * text and/or inline elements the backend did not give its own <p>. In case (2) the
 * caption nodes are MOVED — preserving their inline structure
 * (<em>/<strong>/<span>/<a>/<br>/<sup>) and any raw `[[class]text]` span-tag syntax —
 * into a fresh <p> so author emphasis survives and the global decorateSpanTags pass
 * (which runs after this block decorator) can resolve span tags on the caption.
 * @param {Element} imageCol the image cell/column
 * @returns {HTMLParagraphElement|null}
 */
function findCaptionParagraph(imageCol) {
  if (!imageCol) return null;

  // (1) An explicit caption paragraph — visible text, no image/link.
  const paragraphs = [...imageCol.querySelectorAll('p')];
  const para = paragraphs.find((p) => p.textContent.trim()
    && !p.querySelector('picture, img, a'));
  if (para) return para;

  // (2) Caption content among the pictures (loose, or nested in a picture wrapper).
  // Move the collected nodes as-is — flattening to textContent would drop author
  // <em>/<strong> and split-boundary span-tag markup.
  const captionNodes = collectCaptionNodes(imageCol);
  if (!captionNodes.length) return null;
  const p = document.createElement('p');
  p.append(...captionNodes);
  imageCol.append(p);
  return p;
}

/**
 * Applies the caption treatment: the shared .hero-caption positioning/shadow hook,
 * then relocates it to the caption slot (`target`). Inline `[[class]text]` styling is
 * left to the global decorateSpanTags pass, which runs after this block decorator, so
 * the caption's raw bracket text must survive intact here.
 * @param {HTMLParagraphElement} caption
 * @param {Element} target element to append the caption into
 */
function placeCaption(caption, target) {
  caption.classList.add('hero-caption');
  target.appendChild(caption);
}

function applyAccentColor(block) {
  block.querySelectorAll('h1 strong, h2 strong, h3 strong, p strong').forEach((strong) => {
    // Leave caption content alone: author-applied bold in the caption must not be
    // rewritten into the heading accent-color span (caption styling is author-driven
    // via span-tags / inline emphasis, resolved by the global decorateSpanTags pass).
    if (strong.closest('.hero-caption')) return;
    const span = document.createElement('span');
    span.className = 'accent-color';
    span.textContent = strong.textContent;
    strong.replaceWith(span);
  });
}

function decorateSinglePanel(block) {
  block.classList.add('single');

  // Caption is authored in the image column (first cell); relocate it to the
  // block-level caption slot for absolute bottom-right positioning. Do this before
  // applyAccentColor so the .hero-caption class exists and its guard fires — author
  // bold in the caption must stay <strong>, not become the heading accent-color span.
  const imageCol = block.querySelector(':scope > div:first-child > div')
    || block.querySelector(':scope > div:first-child');
  const caption = findCaptionParagraph(imageCol);
  if (caption) placeCaption(caption, block);

  applyAccentColor(block);
}

function decorateDualPanel(block, rows) {
  const panels = [];

  rows.forEach((row, index) => {
    const cells = [...row.children];
    const panel = document.createElement('div');
    panel.className = `hero-panel hero-panel-${index === 0 ? 'dark' : 'light'}`;

    // First cell: image (background). Capture the author-entered caption before
    // the image cell is consumed, then relocate it to panel level for positioning.
    const imgCell = cells[0];
    if (imgCell) {
      const caption = findCaptionParagraph(imgCell);
      const bgDiv = document.createElement('div');
      bgDiv.className = 'hero-panel-bg';
      const bgContent = buildPictureContentFromImageCell(imgCell);
      imgCell.replaceChildren();
      bgDiv.append(bgContent);
      panel.appendChild(bgDiv);
      if (caption) placeCaption(caption, panel);
    }

    // Second cell: text content overlay
    const textCell = cells[1];
    if (textCell) {
      const contentDiv = document.createElement('div');
      contentDiv.className = 'hero-panel-content';
      contentDiv.append(...textCell.childNodes);

      // CTA row: sole link in a paragraph — matches vyepti split-banner absolute CTA band
      contentDiv.querySelectorAll('p').forEach((p) => {
        const a = p.querySelector(':scope > a[href]');
        if (a && p.childElementCount === 1 && p.firstElementChild === a) {
          p.classList.add('hero-panel-cta-wrap');
        }
      });

      // Group headline/body copy for vyepti-style margin-left/right at wide breakpoints
      const toWrap = [...contentDiv.children].filter(
        (el) => !el.classList.contains('hero-panel-cta-wrap'),
      );
      if (toWrap.length) {
        const desc = document.createElement('div');
        desc.className = 'hero-panel-description';
        toWrap.forEach((el) => desc.append(el));
        contentDiv.prepend(desc);
      }

      panel.appendChild(contentDiv);
    }

    panels.push(panel);
  });

  block.textContent = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'hero-panels';
  panels.forEach((p) => wrapper.appendChild(p));
  block.appendChild(wrapper);

  applyAccentColor(block);
}

/**
 * Section-metadata styles single-light / single-dark force the single full-bleed
 * panel layout regardless of how the hero cells are authored.
 * @param {Element} block
 * @returns {boolean} true if a single-* section style is present
 */
function hasSingleSectionStyle(block) {
  const section = block.closest('.section');
  return !!section && (section.classList.contains('single-light')
    || section.classList.contains('single-dark'));
}

/**
 * Flattens an authored [image cell, text cell] row into sibling rows, each
 * wrapping its original cell, so decorateSinglePanel's DOM contract
 * (row > cell > content) holds and instrumentation on cells is preserved.
 * @param {Element} block
 */
function flattenToSinglePanelRows(block) {
  const cells = [...block.children].flatMap((row) => [...row.children]);
  if (cells.length < 2) return;
  block.textContent = '';
  cells.forEach((cell) => {
    const row = document.createElement('div');
    row.append(cell);
    block.append(row);
  });
}

/**
 * Collapses the multiple responsive &lt;picture&gt; variants in the image row into a
 * single art-direction &lt;picture&gt; (swaps asset per viewport), matching the
 * dual-panel behaviour. Without this only the first picture is ever shown.
 * @param {Element} block
 */
function consolidateSinglePanelImage(block) {
  const imageRow = block.querySelector(':scope > div:first-child');
  const imageCell = imageRow?.firstElementChild;
  if (!imageCell) return;
  // Preserve the author-entered caption paragraph: replaceChildren() below would
  // otherwise wipe it (buildPictureContentFromImageCell returns only the picture),
  // leaving decorateSinglePanel nothing to relocate.
  const caption = findCaptionParagraph(imageCell);
  const built = buildPictureContentFromImageCell(imageCell);
  imageCell.replaceChildren(built);
  if (caption) imageCell.append(caption);
}

export default function decorate(block) {
  const rows = [...block.children];

  // Section style single-light / single-dark always renders as a single panel
  if (hasSingleSectionStyle(block)) {
    const isMultiCell = rows.some((row) => row.children.length >= 2);
    if (isMultiCell) flattenToSinglePanelRows(block);
    consolidateSinglePanelImage(block);
    decorateSinglePanel(block);
    return;
  }

  // Detect mode: if any row has 2 cells (image + text), it's dual-panel
  const isDual = rows.some((row) => row.children.length >= 2);

  if (!isDual) {
    decorateSinglePanel(block);
    return;
  }

  // Dual-panel: each row has [image cell, text cell]
  decorateDualPanel(block, rows);
}
