export interface Civ {
  id: string;
  name: string;
}

export interface GameMap {
  id: string;
  name: string;
}

export const CIVS: Civ[] = [
  { id: 'aoe4.AbbasidDynasty', name: 'Abbasid Dynasty' },
  { id: 'aoe4.Ayyubids', name: 'Ayyubids' },
  { id: 'aoe4.Byzantines', name: 'Byzantines' },
  { id: 'aoe4.Chinese', name: 'Chinese' },
  { id: 'aoe4.DelhiSultanate', name: 'Delhi Sultanate' },
  { id: 'aoe4.English', name: 'English' },
  { id: 'aoe4.French', name: 'French' },
  { id: 'aoe4.GoldenHorde', name: 'Golden Horde' },
  { id: 'aoe4.HolyRomanEmpire', name: 'Holy Roman Empire' },
  { id: 'aoe4.HouseOfLancaster', name: 'House of Lancaster' },
  { id: 'aoe4.Japanese', name: 'Japanese' },
  { id: 'aoe4.JeanneDArc', name: "Jeanne d'Arc" },
  { id: 'aoe4.JinDynasty', name: 'Jin Dynasty' },
  { id: 'aoe4.KnightsTemplar', name: 'Knights Templar' },
  { id: 'aoe4.MacedonianDynasty', name: 'Macedonian Dynasty' },
  { id: 'aoe4.Malians', name: 'Malians' },
  { id: 'aoe4.Mongols', name: 'Mongols' },
  { id: 'aoe4.OrderOfTheDragon', name: 'Order of the Dragon' },
  { id: 'aoe4.Ottomans', name: 'Ottomans' },
  { id: 'aoe4.Rus', name: 'Rus' },
  { id: 'aoe4.SengokuDaimyo', name: 'Sengoku Daimyo' },
  { id: 'aoe4.TughlaqDynasty', name: 'Tughlaq Dynasty' },
  { id: 'aoe4.ZhuXiLegacy', name: "Zhu Xi's Legacy" },
];

export const MAPS: GameMap[] = [
  { id: 'altai', name: 'Altai' },
  { id: 'ancient-spires', name: 'Ancient Spires' },
  { id: 'archipelago', name: 'Archipelago' },
  { id: 'atacama', name: 'Atacama' },
  { id: 'baltic', name: 'Baltic' },
  { id: 'blackforest', name: 'Blackforest' },
  { id: 'boulder-bay', name: 'Boulder Bay' },
  { id: 'continental', name: 'Continental' },
  { id: 'danube-river', name: 'Danube River' },
  { id: 'dry-arabia', name: 'Dry Arabia' },
  { id: 'four-lakes', name: 'Four Lakes' },
  { id: 'french-pass', name: 'French Pass' },
  { id: 'golden-heights', name: 'Golden Heights' },
  { id: 'hideout', name: 'Hideout' },
  { id: 'hill-and-dale', name: 'Hill and Dale' },
  { id: 'himaland', name: 'Himeyama' },
  { id: 'lipany', name: 'Lipany' },
  { id: 'megarandom', name: 'MegaRandom' },
  { id: 'mountain-pass', name: 'Mountain Pass' },
  { id: 'prairie', name: 'Prairie' },
];