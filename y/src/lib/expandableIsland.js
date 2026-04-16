export const sectionIcons = {
  'base-do-jogo': 'ᖭ༏ᖫ',
  ideia: '📖',
  bts: '💀',
  mundo: '🌍',
  'bebes-bbs': '👶',
  'trilha-sonora': '🎵',
  multijogador: '🌐',
  entregas: '📦',
};

const defaultModel = {
  title: 'Death Stranding Sam Standing',
  src: 'https://sketchfab.com/models/05836e1c71bb4ff3a423f59825c1764d/embed?autospin=1&autostart=1&preload=1&transparent=1',
  label: 'Death Stranding Sam Standing',
  author: 'FacFox',
  authorUrl: 'https://sketchfab.com/michaeledi?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d',
  modelUrl: 'https://sketchfab.com/3d-models/death-stranding-sam-standing-05836e1c71bb4ff3a423f59825c1764d?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d',
};

const btsModel = {
  title: 'Death Stranding Sam',
  src: 'https://sketchfab.com/models/e38963c8dfed48a6bfad2effa41ae3ff/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_hint=0',
  label: 'Death Stranding Sam',
  author: 'Justiniano Filipe Terroso',
  authorUrl: 'https://sketchfab.com/justin_phillips?utm_medium=embed&utm_campaign=share-popup&utm_content=e38963c8dfed48a6bfad2effa41ae3ff',
  modelUrl: 'https://sketchfab.com/3d-models/death-stranding-sam-e38963c8dfed48a6bfad2effa41ae3ff?utm_medium=embed&utm_campaign=share-popup&utm_content=e38963c8dfed48a6bfad2effa41ae3ff',
};

export function getIslandModel(activeSectionId) {
  return activeSectionId === 'bts' ? btsModel : defaultModel;
}