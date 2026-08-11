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

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      if (!col.querySelector('picture')) return;
      const pictureCells = [...col.children].filter(
        (child) => child.matches('picture') || child.querySelector('picture'),
      );
      // Count the actual picture variants, not just the cells holding them: the
      // backend delivers art-direction variants either as sibling cells OR all nested
      // in a single <p> wrapper. In the wrapped case pictureCells.length is 1, so a
      // cell-count check would skip the merge and leave all N pictures stacked — they
      // render full-height then collapse as they load, causing a large CLS.
      const pictureCount = col.querySelectorAll('picture').length;

      if (pictureCount >= 2 && pictureCount <= 5) {
        // 2-5 picture variants (bare <picture>, p:has(picture), or several pictures in
        // one <p>) for art-direction per breakpoint; merge only the picture-bearing
        // cells so any other content (e.g. a caption) stays put. buildPictureContent…
        // walks the merged wrapper recursively, so a single multi-picture <p> collapses
        // to one consolidated <picture> too.
        const placeholder = document.createComment('');
        pictureCells[0].before(placeholder);
        const temp = document.createElement('div');
        temp.append(...pictureCells);
        placeholder.replaceWith(buildPictureContentFromImageCell(temp));
      }
      if (col.children.length === 1) {
        // picture (single or merged art-direction) is the only content in column
        col.classList.add('columns-img-col');
      }
    });
  });
}
