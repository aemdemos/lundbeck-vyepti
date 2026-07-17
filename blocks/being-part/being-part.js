/*
 * being-part block
 * Authored content: an icon image, a heading, and body copy.
 * We search the whole block for these (rather than indexing fixed
 * rows/columns) since da.live's authored DOM structure can vary; the
 * heading is looked up by tag (h1-h6) first, falling back to treating the
 * first paragraph as the heading if no heading tag is present.
 *
 * Renders as an icon beside a text block, heading forced to <h2>.
 */

export default function decorate(block) {
  const picture = block.querySelector('picture');
  const headingEl = block.querySelector('h1, h2, h3, h4, h5, h6');
  const paragraphs = [...block.querySelectorAll('p')]
    .map((p) => p.textContent.trim())
    .filter(Boolean);

  let headingText = headingEl?.textContent.trim();
  let bodyParagraphs = paragraphs;
  if (!headingText) {
    [headingText, ...bodyParagraphs] = paragraphs;
  }

  block.innerHTML = '';

  // ----- Icon -----
  const iconWrapper = document.createElement('div');
  iconWrapper.className = 'being-part-icon';
  if (picture) {
    iconWrapper.append(picture);
  }

  // ----- Text content -----
  const content = document.createElement('div');
  content.className = 'being-part-content';

  const heading = document.createElement('h2');
  heading.className = 'being-part-heading';
  heading.textContent = headingText || '';
  content.append(heading);

  bodyParagraphs.forEach((text) => {
    const p = document.createElement('p');
    p.className = 'being-part-text';
    p.textContent = text;
    content.append(p);
  });

  block.append(iconWrapper, content);
}