export const wikiSectionOrder = [
  'base-do-jogo',
  'ideia',
  'bts',
  'mundo',
  'bebes-bbs',
  'trilha-sonora',
  'multijogador',
  'entregas',
];

export function getOrderedWikiSections(items) {
  return wikiSectionOrder
    .map((slug) => items.find((item) => item.id === slug))
    .filter(Boolean);
}