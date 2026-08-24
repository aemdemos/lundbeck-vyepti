export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-cta-${cols.length}-cols`);

  // Single-column variant renders as a horizontal band on desktop (text left,
  // CTA button right). Group the text content (everything except the trailing
  // CTA paragraph) into a wrapper so it can flex independently of the button.
  if (cols.length === 1) {
    const card = cols[0];
    const ctaPara = [...card.children].reverse().find((el) => el.querySelector('a[href]'));
    const textEls = [...card.children].filter((el) => el !== ctaPara);
    if (ctaPara && textEls.length) {
      const textWrapper = document.createElement('div');
      textWrapper.className = 'columns-cta-text';
      textEls.forEach((el) => textWrapper.append(el));
      card.prepend(textWrapper);
    }
  }

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-cta-img-col');
        }
      }
    });
  });

  // CTA buttons open in a new tab (matches decorateExternalLinks attributes)
  block.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}
