export default function createFacilityCards(settings) {
  const { heading, facilityCards } = settings;

  // Only keep enabled cards
  const enabledCards = facilityCards.filter((item) => item.enabled);

  // If no cards are enabled, don't render the section
  if (enabledCards.length === 0) {
    return document.createDocumentFragment();
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'facility-types';

  const title = document.createElement('h2');
  title.textContent = heading;

  wrapper.append(title);

  const list = document.createElement('div');
  list.className = 'facility-types-list';

  enabledCards.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'facility-card';

    const img = document.createElement('img');
    img.src = item.icon;
    img.alt = item.description;

    const text = document.createElement('span');
    text.textContent = item.description;

    card.append(img, text);
    list.append(card);
  });

  wrapper.append(list);

  return wrapper;
}