export interface Civ {
  /** aoe2cm-compatible id; matches games.player1_civ_id / player2_civ_id. */
  id: string;
  /** Display name, e.g. 'French'. */
  name: string;
  /** URL-safe asset slug; files live at web /assets/civs/{slug}.png. */
  slug: string;
}

export const CIVS: readonly Civ[] = [
  { id: 'aoe4.AbbasidDynasty',    name: 'Abbasid Dynasty',     slug: 'abbasid-dynasty' },
  { id: 'aoe4.Ayyubids',          name: 'Ayyubids',            slug: 'ayyubids' },
  { id: 'aoe4.Byzantines',        name: 'Byzantines',          slug: 'byzantines' },
  { id: 'aoe4.Chinese',           name: 'Chinese',             slug: 'chinese' },
  { id: 'aoe4.DelhiSultanate',    name: 'Delhi Sultanate',     slug: 'delhi-sultanate' },
  { id: 'aoe4.English',           name: 'English',             slug: 'english' },
  { id: 'aoe4.French',            name: 'French',              slug: 'french' },
  { id: 'aoe4.GoldenHorde',       name: 'Golden Horde',        slug: 'golden-horde' },
  { id: 'aoe4.HolyRomanEmpire',   name: 'Holy Roman Empire',   slug: 'holy-roman-empire' },
  { id: 'aoe4.HouseOfLancaster',  name: 'House of Lancaster',  slug: 'house-of-lancaster' },
  { id: 'aoe4.Japanese',          name: 'Japanese',            slug: 'japanese' },
  { id: 'aoe4.JeanneDArc',        name: "Jeanne d'Arc",        slug: 'jeanne-darc' },
  { id: 'aoe4.JinDynasty',        name: 'Jin Dynasty',         slug: 'jin-dynasty' },
  { id: 'aoe4.KnightsTemplar',    name: 'Knights Templar',     slug: 'knights-templar' },
  { id: 'aoe4.MacedonianDynasty', name: 'Macedonian Dynasty',  slug: 'macedonian-dynasty' },
  { id: 'aoe4.Malians',           name: 'Malians',             slug: 'malians' },
  { id: 'aoe4.Mongols',           name: 'Mongols',             slug: 'mongols' },
  { id: 'aoe4.OrderOfTheDragon',  name: 'Order of the Dragon', slug: 'order-of-the-dragon' },
  { id: 'aoe4.Ottomans',          name: 'Ottomans',            slug: 'ottomans' },
  { id: 'aoe4.Rus',               name: 'Rus',                 slug: 'rus' },
  { id: 'aoe4.SengokuDaimyo',     name: 'Sengoku Daimyo',      slug: 'sengoku-daimyo' },
  { id: 'aoe4.TughlaqDynasty',    name: 'Tughlaq Dynasty',     slug: 'tughlaq-dynasty' },
  { id: 'aoe4.ZhuXiLegacy',       name: "Zhu Xi's Legacy",     slug: 'zhu-xi-legacy' },
];

const CIV_BY_ID: ReadonlyMap<string, Civ> = new Map(CIVS.map((c) => [c.id, c]));

/** Look up a civ by its aoe2cm id (null-safe for optional game fields). */
export function civById(id: string | null | undefined): Civ | undefined {
  return id ? CIV_BY_ID.get(id) : undefined;
}