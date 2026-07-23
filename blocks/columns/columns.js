import { getBlockId } from '../../scripts/scripts.js';
import { decorateCellClass, buildPictureContentFromImageCell } from '../../scripts/utils.js';

export default function decorate(block) {
  decorateCellClass(block);

  const blockId = getBlockId('columns');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `columns-${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Columns');

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // a child is image-only if it is a bare <picture> or a <p> whose sole content
  // is one or more <picture> elements (no text) — used to tell an art-direction
  // image cell apart from a mixed image+text cell.
  const isImageOnlyChild = (el) => {
    if (el.tagName === 'PICTURE') return true;
    if (el.tagName === 'P' && el.textContent.trim() === '') {
      const kids = [...el.children];
      return kids.length > 0 && kids.every((k) => k.tagName === 'PICTURE');
    }
    return false;
  };

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      if (col.querySelector('picture')) {
        const children = [...col.children];
        if (children.length === 1) {
          // picture is only content in column
          col.classList.add('columns-img-col');
        } else if (
          children.length >= 2 && children.length <= 5
          && children.every(isImageOnlyChild)
        ) {
          // 2-5 picture variants (bare <picture> or p:has(picture)) for art-direction per breakpoint
          const built = buildPictureContentFromImageCell(col);
          col.replaceChildren(built);
          col.classList.add('columns-img-col');
        }
      }
    });
  });
}
