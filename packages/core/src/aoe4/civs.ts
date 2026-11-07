export interface Civ {
  /** aoe2cm-compatible id; matches games.player1_civ_id / player2_civ_id. */
  id: string;
  /** Display name, e.g. 'French'. */
  name: string;
  /**
   * Compact display name for tight layouts, e.g. 'HRE' or 'OotD'. Shown only
   * where there is room for it without squeezing or clipping; the full name
   * stays in the flag's alt and title text everywhere.
   */
  short: string;
  /** URL-safe asset slug; files live at web /assets/civs/{slug}.png. */
  slug: string;
}

export const CIVS: readonly Civ[] = [
  { id: 'aoe4.AbbasidDynasty',    name: 'Abbasid Dynasty',     short: 'Abbasid',    slug: 'abbasid-dynasty' },
  { id: 'aoe4.Ayyubids',          name: 'Ayyubids',            short: 'Ayyubids',   slug: 'ayyubids' },
  { id: 'aoe4.Byzantines',        name: 'Byzantines',          short: 'Byzantines', slug: 'byzantines' },
  { id: 'aoe4.Chinese',           name: 'Chinese',             short: 'Chinese',    slug: 'chinese' },
  { id: 'aoe4.DelhiSultanate',    name: 'Delhi Sultanate',     short: 'Delhi',      slug: 'delhi-sultanate' },
  { id: 'aoe4.English',           name: 'English',             short: 'English',    slug: 'english' },
  { id: 'aoe4.French',            name: 'French',              short: 'French',     slug: 'french' },
  { id: 'aoe4.GoldenHorde',       name: 'Golden Horde',        short: 'GH',         slug: 'golden-horde' },
  { id: 'aoe4.HolyRomanEmpire',   name: 'Holy Roman Empire',   short: 'HRE',        slug: 'holy-roman-empire' },
  { id: 'aoe4.HouseOfLancaster',  name: 'House of Lancaster',  short: 'Lancaster',  slug: 'house-of-lancaster' },
  { id: 'aoe4.Japanese',          name: 'Japanese',            short: 'Japanese',   slug: 'japanese' },
  { id: 'aoe4.JeanneDArc',        name: "Jeanne d'Arc",        short: 'Jeanne',     slug: 'jeanne-darc' },
  { id: 'aoe4.JinDynasty',        name: 'Jin Dynasty',         short: 'Jin',        slug: 'jin-dynasty' },
  { id: 'aoe4.KnightsTemplar',    name: 'Knights Templar',     short: 'Templar',    slug: 'knights-templar' },
  { id: 'aoe4.MacedonianDynasty', name: 'Macedonian Dynasty',  short: 'Macedonian', slug: 'macedonian-dynasty' },
  { id: 'aoe4.Malians',           name: 'Malians',             short: 'Malians',    slug: 'malians' },
  { id: 'aoe4.Mongols',           name: 'Mongols',             short: 'Mongols',    slug: 'mongols' },
  { id: 'aoe4.OrderOfTheDragon',  name: 'Order of the Dragon', short: 'OotD',       slug: 'order-of-the-dragon' },
  { id: 'aoe4.Ottomans',          name: 'Ottomans',            short: 'Ottomans',   slug: 'ottomans' },
  { id: 'aoe4.Rus',               name: 'Rus',                 short: 'Rus',        slug: 'rus' },
  { id: 'aoe4.Scots',             name: 'Scots',               short: 'Scots',      slug: 'scots' },
  { id: 'aoe4.SengokuDaimyo',     name: 'Sengoku Daimyo',      short: 'Sengoku',    slug: 'sengoku-daimyo' },
  { id: 'aoe4.TughlaqDynasty',    name: 'Tughlaq Dynasty',     short: 'Tughlaq',    slug: 'tughlaq-dynasty' },
  { id: 'aoe4.Vikings',           name: 'Vikings',             short: 'Vikings',    slug: 'vikings' },
  { id: 'aoe4.ZhuXiLegacy',       name: "Zhu Xi's Legacy",     short: 'ZXL',        slug: 'zhu-xi-legacy' },
];

const CIV_BY_ID: ReadonlyMap<string, Civ> = new Map(CIVS.map((c) => [c.id, c]));

/** Look up a civ by its aoe2cm id (null-safe for optional game fields). */
export function civById(id: string | null | undefined): Civ | undefined {
  return id ? CIV_BY_ID.get(id) : undefined;
}