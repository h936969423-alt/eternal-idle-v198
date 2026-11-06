import raw from './gamedata.json';

export const SPEAKING_SCROLL = 'scroll_speaking';
const items = raw.items as Record<string, unknown>;
items[SPEAKING_SCROLL] = {
  n: '說話的卷軸', type: 'scroll', eff: 'speaking_scroll', req: 'all',
  p: 0, weight: 0, gachaWeight: 0, tradable: false, noSell: true, noWh: true,
  d: '開啟地區傳送清單。重量 0，可重複使用，一般地圖傳送免費。',
  sourceIcon: '/assets/icons/items/瞬間移動卷軸.png',
};

const categories = raw.mapCategories as Record<string, {v:string;t:string}[]>;
const sequence = (prefix: string, first: number, last: number) =>
  Array.from({length: last-first+1}, (_, index) => prefix + (first+index));
const zones = (first: number, last: number) =>
  sequence('zone_', first, last).map(id => id.replace(/_(\d)$/, '_0$1'));
const destinations = [...categories.village, ...categories.wild, ...categories.dungeon];
const groups: [string, string[]][] = [
  ['村莊區', categories.village.map(row => row.v)],
  ['新手區', ['training']],
  ['說話之島區', ['talking_island', 'talking_island_port', ...zones(13,14)]],
  ['銀騎士區', [...zones(15,17), 'silver_knight']],
  ['古魯丁區', ['gludio', ...zones(6,12)]],
  ['妖精森林區', ['zone_01', 'elf_forest']],
  ['肯特區', ['kent']],
  ['風木區', [...zones(22,25), 'windwood', 'desert', ...zones(32,33)]],
  ['奇岩區', ['giran', ...zones(18,21)]],
  ['海音區', ['heine', 'eva_kingdom']],
  ['歐瑞區', [...zones(2,5), ...sequence('crystal_cave',1,3)]],
  ['象牙塔區', zones(37,41)],
  ['龍之谷區', ['dragon_valley', ...zones(26,31)]],
  ['火山區', ['fire_dragon']],
  ['亞丁區', ['mirror_forest']],
  ['黃昏區', ['twilight_mt']],
  ['風龍區', []],
  ['傲慢之塔區', sequence('pride_f',1,19)],
  ['夢幻之島區', ['dream_island']],
  ['遺忘之島區', ['oblivion_island']],
  ['暗影神殿區', []],
  ['拉斯塔巴德區', categories.dungeon.filter(row => /^(rastabad_|dark_magic_lab$|necro_training$|elder_room$)/.test(row.v)).map(row => row.v)],
  ['特殊區', zones(34,36)],
  ['強大怪物區', []],
];

export const scrollRegions = groups.map(([name, ids]) => ({
  name,
  maps: ids.flatMap(id => {
    const row = destinations.find(entry => entry.v === id);
    if (row) return [{id, name:row.t, exists:true}];
    return id.startsWith('pride_f') ? [{id, name:`傲慢之塔${id.slice(7)}樓`, exists:false}] : [];
  }),
}));
