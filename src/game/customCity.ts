/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CityArchetype,
  CustomCityMetadata,
  LevelConfig,
  ShiftAtmosphere,
} from './types';

export interface CityPreset {
  id: string;
  nameZh: string;
  nameEn: string;
  districtZh: string;
  districtEn: string;
  region: string;
  lat: number;
  lng: number;
  archetype: CityArchetype;
  defaultAtmosphere: ShiftAtmosphere;
  descriptionZh: string;
  descriptionEn: string;
  specialtiesZh: string[];
  specialtiesEn: string[];
  streetsZh?: string[];
  streetsEn?: string[];
}

export const REAL_CITY_STREETS: Record<string, string[]> = {
  beijing: ['长安街', '王府井大街', '朝阳门外大街', '西单北大街', '南锣鼓巷', '平安里西大街', '地安门东大街', '前门大街', '东直门内大街', '三里屯路'],
  shanghai: ['南京东路', '淮海中路', '西藏中路', '延安高架路', '武康路', '世纪大道', '愚园路', '北京西路', '陆家嘴环路', '衡山路'],
  hangzhou: ['延安路', '西湖大道', '南山路', '文三路', '庆春路', '凤起路', '湖滨路', '天目山路', '北山街', '虎跑路'],
  guangzhou: ['北京路', '天河路', '中山大道', '上下九步行街', '东风西路', '环市东路', '江南大道', '沿江中路', '花城大道', '宝华路'],
  shenzhen: ['深南大道', '科技南路', '华强北路', '滨海大道', '益田路', '后海大道', '红荔路', '侨香路', '金田路', '民治大道'],
  chengdu: ['春熙路', '天府大道', '人民南路', '锦里西路', '宽窄巷子', '蜀都大道', '一环路南四段', '建设北路', '东大街', '太古里街'],
  wuhan: ['江汉路', '中山大道', '武珞路', '光谷大道', '解放大道', '建设大道', '雄楚大道', '黄鹤楼东路', '沿江大道', '中南路'],
  hongkong: ['弥敦道', '皇后大道中', '轩尼诗道', '德辅道中', '广东道', '告士打道', '梳士巴利道', '荷李活道', '骆克道', '亚皆老街'],
  taipei: ['忠孝东路', '信义路', '敦化南路', '南京东路', '中山北路', '和平东路', '八德路', '仁爱路', '基隆路', '士林大东路'],
  tokyo: ['银座中央通', '表参道', '秋叶原中央通', '涩谷道玄坂', '新宿靖国通', '六本木通', '浅草雷门通', '晴海通'],
  paris: ['香榭丽舍大街', '圣日耳曼大道', '里沃利街', '圣米歇尔大道', '歌剧院大街', '蒙田大道', '拉斯帕伊大道'],
  newyork: ['第五大道 5th Ave', '百老汇大道 Broadway', '第七大道 7th Ave', '华尔街 Wall St', '时代广场42街', '麦迪逊大道 Madison Ave'],
};

export function getRealStreetsForCity(cityName: string): string[] {
  const lower = cityName.toLowerCase();
  for (const [key, streets] of Object.entries(REAL_CITY_STREETS)) {
    if (lower.includes(key)) return streets;
  }
  for (const preset of PRESET_CITIES) {
    if (lower.includes(preset.nameZh) || lower.includes(preset.nameEn.toLowerCase())) {
      const matchKey = preset.id;
      if (REAL_CITY_STREETS[matchKey]) return REAL_CITY_STREETS[matchKey];
    }
  }

  // Synthesize realistic regional streets if custom or not in direct dictionary
  const cleanName = cityName.replace(/[市区县镇街道]/g, '');
  const prefix = cleanName.slice(0, 2) || '中央';
  return [
    `${prefix}大道`,
    `${prefix}东路`,
    `${prefix}西路`,
    '人民南路',
    '解放中路',
    '建设大道',
    '文化街',
    '商业步行街',
    '滨江路',
    '幸福大道',
  ];
}

export const PRESET_CITIES: CityPreset[] = [
  {
    id: 'beijing',
    nameZh: '北京',
    nameEn: 'Beijing',
    districtZh: '故宫护城河与二环主路',
    districtEn: 'Forbidden City Moat & 2nd Ring',
    region: '中国 · 华北',
    lat: 39.9042,
    lng: 116.4074,
    archetype: CityArchetype.DowntownMoatRing,
    defaultAtmosphere: ShiftAtmosphere.GoldenSunset,
    descriptionZh: '宏伟方正的护城河内城环线，古典红墙与繁华大道交织。',
    descriptionEn: 'Historic imperial moat ring with wide radial avenues.',
    specialtiesZh: ['全聚德挂炉烤鸭特急件', '稻香村京八件糕点盒', '故宫琉璃文创印玺'],
    specialtiesEn: ['Peking Roast Duck Express', 'Classic Daoxiangcun Pastry Box', 'Palace Jade Seal'],
  },
  {
    id: 'shanghai',
    nameZh: '上海',
    nameEn: 'Shanghai',
    districtZh: '黄浦江两岸与外滩金融岛',
    districtEn: 'Huangpu River & Bund Archipelago',
    region: '中国 · 华东',
    lat: 31.2304,
    lng: 121.4737,
    archetype: CityArchetype.TwinRiverArchipelago,
    defaultAtmosphere: ShiftAtmosphere.TwilightNeon,
    descriptionZh: '跨越黄浦江两岸的多岛江景网络，霓虹闪烁的现代摩登都会。',
    descriptionEn: 'Vibrant river archipelago connecting the Bund & futuristic towers.',
    specialtiesZh: ['南翔现蒸鲜肉小笼汤包', '外滩复古黑胶留声机', '陆家嘴精品冷萃咖啡豆'],
    specialtiesEn: ['Nanxiang Steamed Soup Dumplings', 'Vintage Bund Turntable Crate', 'Lujiazui Cold Brew Beans'],
  },
  {
    id: 'hangzhou',
    nameZh: '杭州',
    nameEn: 'Hangzhou',
    districtZh: '西湖断桥与水乡绿波岛屿',
    districtEn: 'West Lake Bridges & Canal Quay',
    region: '中国 · 浙江',
    lat: 30.2741,
    lng: 120.1551,
    archetype: CityArchetype.WindingCanalHarbor,
    defaultAtmosphere: ShiftAtmosphere.SunnyHarbor,
    descriptionZh: '清波荡漾的西湖水道，古色古香的木桥与江南园林绿道。',
    descriptionEn: 'Scenic stepped canals and wooden bridges winding past lotus shores.',
    specialtiesZh: ['西湖明前特级龙井新茶', '楼外楼现炸西湖醋鱼', '丝绸手作刺绣团扇礼盒'],
    specialtiesEn: ['West Lake First-Flush Longjing Tea', 'Crispy Sweet West Lake Fish', 'Handmade Silk Embroidered Fan'],
  },
  {
    id: 'guangzhou',
    nameZh: '广州',
    nameEn: 'Guangzhou',
    districtZh: '珠江水网与越秀骑楼街巷',
    districtEn: 'Pearl River Canals & Historic Arcade',
    region: '中国 · 华南',
    lat: 23.1291,
    lng: 113.2644,
    archetype: CityArchetype.WindingCanalHarbor,
    defaultAtmosphere: ShiftAtmosphere.GoldenSunset,
    descriptionZh: '珠江水系交错的千年商都，茶楼骑楼林立的岭南水乡。',
    descriptionEn: 'Intertwined Pearl River waterways with bustling arcade promenades.',
    specialtiesZh: ['陶陶居晶莹鲜虾饺皇盒', '老字号顺德姜汁双皮奶', '荔湾手工广彩瓷器瓶'],
    specialtiesEn: ['Taotaoju Crystal Shrimp Dumpling Box', 'Smooth Ginger Milk Custard', 'Canton Hand-Painted Porcelain'],
  },
  {
    id: 'shenzhen',
    nameZh: '深圳',
    nameEn: 'Shenzhen',
    districtZh: '科技湾区与沿海高新干线',
    districtEn: 'Tech Bay & Coastal Expressways',
    region: '中国 · 广东',
    lat: 22.5431,
    lng: 114.0579,
    archetype: CityArchetype.SerpentinePortMaze,
    defaultAtmosphere: ShiftAtmosphere.TwilightNeon,
    descriptionZh: '南山科技园与深圳湾大桥畔的高速环岛，极客创新与快节奏街道。',
    descriptionEn: 'Modern coastal grid with fast boulevards and high-tech ports.',
    specialtiesZh: ['华强北高精度微型芯片', '智能自动巡航无人机', '海滨现调鲜榨椰椰咖啡'],
    specialtiesEn: ['High-Precision Microchip Crate', 'Smart Autonomous Drone Core', 'Coastal Iced Coconut Espresso'],
  },
  {
    id: 'chengdu',
    nameZh: '成都',
    nameEn: 'Chengdu',
    districtZh: '锦里宽窄水巷与天府环线',
    districtEn: 'Jinli Historic Plazas & Tianfu Ring',
    region: '中国 · 四川',
    lat: 30.5728,
    lng: 104.0668,
    archetype: CityArchetype.DowntownMoatRing,
    defaultAtmosphere: ShiftAtmosphere.SunnyHarbor,
    descriptionZh: '锦江环绕的天府之国，悠闲茶馆与麻辣飘香的宽窄巷弄。',
    descriptionEn: 'Lush circular plazas with cozy teahouses and vibrant spicy aromas.',
    specialtiesZh: ['蜀九香老火锅麻辣底料', '大熊猫基地高山鲜笋筐', '手工川剧变脸微缩泥塑'],
    specialtiesEn: ['Sizzling Sichuan Mala Hotpot Broth', 'Panda Base Mountain Bamboo Basket', 'Sichuan Opera Mask Sculpture'],
  },
  {
    id: 'chongqing',
    nameZh: '重庆',
    nameEn: 'Chongqing',
    districtZh: '山城跨江大桥与立体港湾',
    districtEn: 'Mountain Bridges & Yangtze Confluence',
    region: '中国 · 西南',
    lat: 29.5630,
    lng: 106.5516,
    archetype: CityArchetype.TwinRiverArchipelago,
    defaultAtmosphere: ShiftAtmosphere.TwilightNeon,
    descriptionZh: '长江嘉陵江汇流的魔幻立体山城，飞跃大桥的奇幻货运挑战。',
    descriptionEn: 'Multilevel bridges spanning misty river channels and neon cliffs.',
    specialtiesZh: ['九宫格牛油老火锅料罐', '磁器口现炸麻辣陈麻花', '三峡原产手工竹编果盘'],
    specialtiesEn: ['Nine-Grid Tallow Hotpot Spices', 'Spicy Crispy Mahua Twisted Treats', 'Three Gorges Hand-Woven Basket'],
  },
  {
    id: 'wuhan',
    nameZh: '武汉',
    nameEn: 'Wuhan',
    districtZh: '江城两江三镇与大桥干线',
    districtEn: 'Yangtze River Crossings & Yellow Crane',
    region: '中国 · 湖北',
    lat: 30.5928,
    lng: 114.3055,
    archetype: CityArchetype.TwinRiverArchipelago,
    defaultAtmosphere: ShiftAtmosphere.GoldenSunset,
    descriptionZh: '长江大桥横跨长江与汉江，九省通衢的枢纽货运街道。',
    descriptionEn: 'Historic confluence connecting three iconic riverside towns.',
    specialtiesZh: ['蔡林记秘制浓香热干面', '精武绝味鸭脖特产礼盒', '黄鹤楼紫铜纪念浮雕盘'],
    specialtiesEn: ['Hot Dry Sesame Noodles', 'Spicy Braised Duck Delicacies', 'Yellow Crane Tower Copper Relief'],
  },
  {
    id: 'hongkong',
    nameZh: '香港',
    nameEn: 'Hong Kong',
    districtZh: '维多利亚港湾与离岛穿梭',
    districtEn: 'Victoria Harbor & Island Straights',
    region: '中国 · 香港',
    lat: 22.3193,
    lng: 114.1694,
    archetype: CityArchetype.SerpentinePortMaze,
    defaultAtmosphere: ShiftAtmosphere.TwilightNeon,
    descriptionZh: '天星小轮与摩天大楼林立的深水港湾，叮叮车穿梭的霓虹夜景。',
    descriptionEn: 'Dense harbor waterfront with ferry canals and bustling docks.',
    specialtiesZh: ['兰芳园丝袜奶茶伴手礼', '半岛酒店手工流心月饼', '维港深海航行镀金罗盘'],
    specialtiesEn: ['Classic Silk Stocking Milk Tea', 'Peninsula Handcrafted Mooncakes', 'Harbor Brass Navigational Compass'],
  },
  {
    id: 'taipei',
    nameZh: '台北',
    nameEn: 'Taipei',
    districtZh: '淡水河滨与士林夜市街区',
    districtEn: 'Tamsui Riverside & Shilin Nightways',
    region: '中国 · 台湾',
    lat: 25.0330,
    lng: 121.5654,
    archetype: CityArchetype.WindingCanalHarbor,
    defaultAtmosphere: ShiftAtmosphere.GoldenSunset,
    descriptionZh: '依山傍水的盆地水道，夜市红灯笼与机车穿梭的热闹小巷。',
    descriptionEn: 'Riverside basin district with bustling street market lanes.',
    specialtiesZh: ['正宗黑糖珍珠鲜奶茶', '微热山丘土凤梨酥礼盒', '手工香煎豪大大鸡排'],
    specialtiesEn: ['Brown Sugar Boba Milk Tea', 'SunnyHills Golden Pineapple Cakes', 'Crispy Jumbo Fried Cutlet'],
  },
  {
    id: 'tokyo',
    nameZh: '东京',
    nameEn: 'Tokyo',
    districtZh: '隅田川水上大桥与银座干线',
    districtEn: 'Sumida River Bridges & Ginza Avenues',
    region: '日本 · 关东',
    lat: 35.6762,
    lng: 139.6503,
    archetype: CityArchetype.SerpentinePortMaze,
    defaultAtmosphere: ShiftAtmosphere.TwilightNeon,
    descriptionZh: '东京湾水上运河与银座繁华大道，精致整洁的城中回环。',
    descriptionEn: 'Coastal harbor maze with illuminated bridges and canal boats.',
    specialtiesZh: ['宇治抹茶生八桥和果子', '筑地现切极上金枪鱼便当', '浅草寺手工江户切子琉璃杯'],
    specialtiesEn: ['Uji Matcha Wagashi Sweets', 'Tsukiji Fresh Bluefin Sashimi Bento', 'Edo Kiriko Cut-Glass Tumbler'],
  },
  {
    id: 'paris',
    nameZh: '巴黎',
    nameEn: 'Paris',
    districtZh: '塞纳河两岸与西岱岛古桥',
    districtEn: 'Seine River & Île de la Cité Bridges',
    region: '法国 · 法兰西',
    lat: 48.8566,
    lng: 2.3522,
    archetype: CityArchetype.DowntownMoatRing,
    defaultAtmosphere: ShiftAtmosphere.GoldenSunset,
    descriptionZh: '塞纳河蜿蜒流经西岱岛与左岸咖啡馆，浪漫林荫大道环绕。',
    descriptionEn: 'Romantic river moat circling central heritage islands and cafes.',
    specialtiesZh: ['新鲜现烘法式杏仁可颂', '波尔多名庄醇厚红葡萄酒', '凡尔赛玫瑰香氛水晶瓶'],
    specialtiesEn: ['Freshly Baked Almond Croissant', 'Vintage Bordeaux Wine Reserve', 'Versailles Rose Crystal Flask'],
  },
];

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0);
}

export function buildCustomCitySeed(
  cityName: string,
  lat: number = 0,
  lng: number = 0,
): number {
  const coordPart = Math.round(Math.abs(lat) * 1000 + Math.abs(lng) * 1000);
  return (hashString(cityName) + coordPart * 9173 + 214747) >>> 0;
}

export interface CustomCityOptions {
  cityName: string;
  districtName?: string;
  lat?: number;
  lng?: number;
  archetype?: CityArchetype;
  atmosphere?: ShiftAtmosphere;
  gridSize?: 15 | 17 | 19;
  stopCount?: number;
  trafficDensity?: 'low' | 'med' | 'high';
  addressDetails?: string;
  streets?: string[];
}

export function synthesizeCustomCityConfig(options: CustomCityOptions): LevelConfig {
  const {
    cityName,
    lat = 30.0,
    lng = 120.0,
    addressDetails,
  } = options;

  // Determine intelligent archetype if not manually selected
  let archetype = options.archetype;
  if (!archetype) {
    const lower = cityName.toLowerCase();
    if (
      lower.includes('lake') ||
      lower.includes('river') ||
      lower.includes('canal') ||
      lower.includes('water') ||
      lower.includes('湖') ||
      lower.includes('江') ||
      lower.includes('河') ||
      lower.includes('水') ||
      lower.includes('杭州') ||
      lower.includes('苏州') ||
      lower.includes('武汉') ||
      lower.includes('广州')
    ) {
      archetype = CityArchetype.TwinRiverArchipelago;
    } else if (
      lower.includes('bay') ||
      lower.includes('harbor') ||
      lower.includes('port') ||
      lower.includes('coast') ||
      lower.includes('海') ||
      lower.includes('港') ||
      lower.includes('湾') ||
      lower.includes('深圳') ||
      lower.includes('香港') ||
      lower.includes('青岛') ||
      lower.includes('厦门')
    ) {
      archetype = CityArchetype.SerpentinePortMaze;
    } else if (
      lower.includes('ring') ||
      lower.includes('circle') ||
      lower.includes('moat') ||
      lower.includes('环') ||
      lower.includes('城') ||
      lower.includes('北京') ||
      lower.includes('西安') ||
      lower.includes('成都')
    ) {
      archetype = CityArchetype.DowntownMoatRing;
    } else {
      archetype = CityArchetype.WindingCanalHarbor;
    }
  }

  const atmosphere = options.atmosphere ?? ShiftAtmosphere.GoldenSunset;
  const gridSize = options.gridSize ?? 17;
  const stopCount = Math.max(3, Math.min(9, options.stopCount ?? (gridSize === 15 ? 4 : gridSize === 17 ? 6 : 8)));
  const density = options.trafficDensity ?? 'med';

  const cruiserCount = density === 'low' ? 4 : density === 'med' ? 7 : 10;
  const scooterCount = density === 'low' ? 1 : density === 'med' ? 3 : 5;
  const bridgeGateCount = density === 'low' ? 0 : density === 'med' ? 2 : 3;
  const boostPadCount = gridSize === 15 ? 3 : gridSize === 17 ? 5 : 6;
  const signalCount = density === 'low' ? 4 : density === 'med' ? 6 : 8;

  const baseTime = 75 + stopCount * 9;
  const streets = options.streets && options.streets.length > 0 ? options.streets : getRealStreetsForCity(cityName);

  const customMeta: CustomCityMetadata = {
    cityName,
    districtName: options.districtName || `${cityName} · 定制专属街区`,
    lat,
    lng,
    isCustom: true,
    addressDetails,
    streets,
  };

  return {
    level: 99, // Custom map marker
    districtName: customMeta.districtName,
    archetype,
    atmosphere,
    hasSunshower: false,
    gridSize,
    stopCount,
    timeLimitSec: Math.max(70, baseTime),
    cruiserCount,
    scooterCount,
    bridgeGateCount,
    boostPadCount,
    signalCount,
    customCity: customMeta,
  };
}

export interface GeocodedLocation {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

export async function searchCities(query: string): Promise<GeocodedLocation[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check matching presets first for near-instant zero-latency response!
  const matchedPresets: GeocodedLocation[] = PRESET_CITIES.filter((p) => {
    return (
      p.nameZh.includes(trimmed) ||
      p.nameEn.toLowerCase().includes(trimmed.toLowerCase()) ||
      p.districtZh.includes(trimmed) ||
      p.region.includes(trimmed)
    );
  }).map((p) => ({
    name: p.nameZh,
    displayName: `${p.nameZh} (${p.nameEn}) · ${p.region} · ${p.districtZh}`,
    lat: p.lat,
    lng: p.lng,
  }));

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2800);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed,
      )}&limit=5&addressdetails=1`,
      {
        signal: ctrl.signal,
        headers: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      },
    );
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const fetched: GeocodedLocation[] = data.map((item: any) => ({
          name:
            item.address?.city ||
            item.address?.town ||
            item.address?.county ||
            item.address?.state ||
            item.name ||
            trimmed,
          displayName: item.display_name || trimmed,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type,
        }));

        // Deduplicate with matchedPresets
        const combined = [...matchedPresets];
        for (const f of fetched) {
          if (!combined.some((c) => Math.abs(c.lat - f.lat) < 0.05 && Math.abs(c.lng - f.lng) < 0.05)) {
            combined.push(f);
          }
        }
        return combined.slice(0, 6);
      }
    }
  } catch {
    // If network fails or timeout occurs, return matched presets or synthetically generate
  }

  if (matchedPresets.length > 0) return matchedPresets;

  // Fallback: generate realistic coordinate for the query
  const seed = hashString(trimmed);
  const fallbackLat = 22 + (seed % 3000) / 100;
  const fallbackLng = 100 + ((seed >> 4) % 3000) / 100;
  return [
    {
      name: trimmed,
      displayName: `${trimmed} (定制区域) · [${fallbackLat.toFixed(2)}°N, ${fallbackLng.toFixed(2)}°E]`,
      lat: fallbackLat,
      lng: fallbackLng,
    },
  ];
}

export async function reverseGeocodeGps(
  lat: number,
  lng: number,
): Promise<{ cityName: string; displayName: string }> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        signal: ctrl.signal,
        headers: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      },
    );
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.district ||
        addr.county ||
        addr.state ||
        '我的所在城市';
      const district = addr.suburb || addr.quarter || addr.neighbourhood || addr.road || '';
      const fullDisplay = district ? `${city} · ${district}` : data.display_name || city;
      return { cityName: city, displayName: fullDisplay };
    }
  } catch {
    // Fallback
  }
  return {
    cityName: '当前所在城市',
    displayName: `当前GPS位置 (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`,
  };
}

const streetCache = new Map<string, string[]>();

/**
 * Fetches real nearby street/road names around (lat, lng) using OpenStreetMap Overpass API,
 * gracefully falling back to our curated city street atlas when offline or throttled.
 */
export async function fetchRealStreetsOverpass(
  lat: number,
  lng: number,
  cityName: string,
): Promise<string[]> {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = streetCache.get(cacheKey);
  if (cached && cached.length > 0) return cached;

  const fallback = getRealStreetsForCity(cityName);
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);
    const query = `[out:json][timeout:3];way["highway"~"primary|secondary|tertiary|residential|pedestrian"]["name"](around:800,${lat.toFixed(5)},${lng.toFixed(5)});out tags 35;`;
    const resp = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const json = await resp.json();
      if (Array.isArray(json?.elements)) {
        const unique = new Set<string>();
        for (const el of json.elements) {
          const name = el?.tags?.['name:zh'] || el?.tags?.name;
          if (typeof name === 'string') {
            const clean = name.trim();
            if (clean.length >= 2 && clean.length <= 16) {
              unique.add(clean);
            }
          }
          if (unique.size >= 12) break;
        }
        const collected = Array.from(unique);
        if (collected.length >= 4) {
          streetCache.set(cacheKey, collected);
          return collected;
        }
        if (collected.length > 0) {
          const merged = Array.from(new Set([...collected, ...fallback])).slice(0, 12);
          streetCache.set(cacheKey, merged);
          return merged;
        }
      }
    }
  } catch {
    // Offline or timeout: use curated real streets fallback seamlessly
  }
  streetCache.set(cacheKey, fallback);
  return fallback;
}


/**
 * Romanised/English counterparts for REAL_CITY_STREETS so the HUD can stay in
 * one language. Indexes line up 1:1 with the Zh table above.
 */
export const REAL_CITY_STREETS_EN: Record<string, string[]> = {
  beijing: ["Chang'an Ave", 'Wangfujing St', 'Chaoyangmenwai Ave', 'Xidan North Ave', 'Nanluoguxiang', "Ping'anli West Ave", "Di'anmen East Ave", 'Qianmen Ave', 'Dongzhimennei Ave', 'Sanlitun Rd'],
  shanghai: ['Nanjing East Rd', 'Huaihai Middle Rd', 'Xizang Middle Rd', "Yan'an Elevated Rd", 'Wukang Rd', 'Century Ave', 'Yuyuan Rd', 'Beijing West Rd', 'Lujiazui Ring Rd', 'Hengshan Rd'],
  hangzhou: ["Yan'an Rd", 'West Lake Ave', 'Nanshan Rd', 'Wensan Rd', 'Qingchun Rd', 'Fengqi Rd', 'Hubin Rd', 'Tianmushan Rd', 'Beishan St', 'Hupao Rd'],
  guangzhou: ['Beijing Rd', 'Tianhe Rd', 'Zhongshan Ave', 'Shangxiajiu Walking St', 'Dongfeng West Rd', 'Huanshi East Rd', 'Jiangnan Ave', 'Yanjiang Middle Rd', 'Huacheng Ave', 'Baohua Rd'],
  shenzhen: ['Shennan Ave', 'Keji South Rd', 'Huaqiang North Rd', 'Binhai Ave', 'Yitian Rd', 'Houhai Ave', 'Hongli Rd', 'Qiaoxiang Rd', 'Jintian Rd', 'Minzhi Ave'],
  chengdu: ['Chunxi Rd', 'Tianfu Ave', 'Renmin South Rd', 'Jinli West Rd', 'Kuanzhai Alley', 'Shudu Ave', 'First Ring Rd Sec 4', 'Jianshe North Rd', 'Dongda St', 'Taikoo Li'],
  wuhan: ['Jianghan Rd', 'Zhongshan Ave', 'Wuluo Rd', 'Guanggu Ave', 'Jiefang Ave', 'Jianshe Ave', 'Xiongchu Ave', 'Yellow Crane Tower East Rd', 'Yanjiang Ave', 'Zhongnan Rd'],
  hongkong: ['Nathan Rd', "Queen's Rd Central", 'Hennessy Rd', 'Des Voeux Rd Central', 'Canton Rd', 'Gloucester Rd', 'Salisbury Rd', 'Hollywood Rd', 'Lockhart Rd', 'Argyle St'],
  taipei: ['Zhongxiao East Rd', 'Xinyi Rd', 'Dunhua South Rd', 'Nanjing East Rd', 'Zhongshan North Rd', 'Heping East Rd', 'Bade Rd', "Ren'ai Rd", 'Keelung Rd', 'Shilin East Rd'],
  tokyo: ['Ginza Chuo-dori', 'Omotesando', 'Akihabara Chuo-dori', 'Shibuya Dogenzaka', 'Shinjuku Yasukuni-dori', 'Roppongi-dori', 'Asakusa Kaminarimon-dori', 'Harumi-dori'],
  paris: ['Champs-Elysees', 'Boulevard Saint-Germain', 'Rue de Rivoli', 'Boulevard Saint-Michel', "Avenue de l'Opera", 'Avenue Montaigne', 'Boulevard Raspail'],
  newyork: ['5th Avenue', 'Broadway', '7th Avenue', 'Wall St', '42nd St Times Square', 'Madison Ave'],
};

/** English twin of getRealStreetsForCity: same lookup, English strings. */
export function getRealStreetsEnForCity(cityName: string): string[] {
  const lower = cityName.toLowerCase();
  for (const [key, streets] of Object.entries(REAL_CITY_STREETS_EN)) {
    if (lower.includes(key)) return streets;
  }
  for (const preset of PRESET_CITIES) {
    if (lower.includes(preset.nameZh) || lower.includes(preset.nameEn.toLowerCase())) {
      if (REAL_CITY_STREETS_EN[preset.id]) return REAL_CITY_STREETS_EN[preset.id];
    }
  }
  const cleanName = cityName.replace(/[市区县镇街道]/g, '');
  const prefix = cleanName.slice(0, 2) || 'Central';
  return [
    `${prefix} Ave`,
    `${prefix} East Rd`,
    `${prefix} West Rd`,
    'Renmin South Rd',
    'Jiefang Middle Rd',
    'Jianshe Ave',
    'Culture St',
    'Commerce Walking St',
  ];
}
