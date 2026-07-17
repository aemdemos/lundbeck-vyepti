import { getBlockId } from '../../scripts/scripts.js';
import {
  decorateCellClass,
  buildPictureContentFromImageCell,
  createArtDirectionPicture,
} from '../../scripts/utils.js';

/** A direct child that is (or wraps) a single <picture> responsive variant. */
function isImageVariantChild(child) {
  return child.tagName === 'PICTURE'
    || (child.tagName === 'P'
      && child.children.length === 1
      && child.firstElementChild.tagName === 'PICTURE');
}

export default function decorate(block) {
  decorateCellClass(block);

  const blockId = getBlockId('columns');
  block.setAttribute('id', blockId);
  block.setAttribute('aria-label', `columns-${blockId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Columns');

  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      if (!col.querySelector('picture')) return;

      const imageChildren = [...col.children].filter(isImageVariantChild);

      if (col.children.length === 1) {
        // picture is only content in column
        col.classList.add('columns-img-col');
      } else if (
        imageChildren.length === col.children.length
        && imageChildren.length >= 2
        && imageChildren.length <= 5
      ) {
        // whole cell is 2-5 picture variants → one art-direction <picture> per breakpoint
        const built = buildPictureContentFromImageCell(col);
        col.replaceChildren(built);
        col.classList.add('columns-img-col');
      } else if (imageChildren.length >= 2 && imageChildren.length <= 5) {
        // 2-5 picture variants mixed with text in the same cell: collapse just the
        // image variants into a single art-direction <picture> (so only the
        // breakpoint-appropriate rendition loads), preserving the sibling text.
        const sources = imageChildren
          .map((child) => {
            const img = child.querySelector('img[src]');
            return img ? { src: img.src, alt: img.getAttribute('alt') ?? '' } : null;
          })
          .filter(Boolean);
        if (sources.length >= 2) {
          const picture = createArtDirectionPicture(sources, true);
          const wrapper = document.createElement('p');
          wrapper.append(picture);
          imageChildren[0].replaceWith(wrapper);
          imageChildren.slice(1).forEach((child) => child.remove());
        }
      }
    });
  });
}
