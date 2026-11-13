/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CityArchetype,
  LevelConfig,
  ParcelKind,
  PlayerProgression,
  ShiftAtmosphere,
} from './types';
import type { LandmarkKind } from './meshes';

export type ContinentId =
  | 'asia'
  | 'europe'
  | 'north_america'
  | 'south_america'
  | 'oceania'
  | 'africa';

export interface WorldDishEntry {
  loreId: string;
  nameZh: string;
  nameEn: string;
  merchantZh: string;
  merchantEn: string;
  categoryZh: string;
  categoryEn: string;
  factZh: string;
  factEn: string;
  tipZh: string;
  tipEn: string;
  icon: string;
  kind: ParcelKind;
}

export interface WorldLandmarkDef {
  loreId: string;
  kind: LandmarkKind;
  nameZh: string;
  nameEn: string;
  eraZh: string;
  eraEn: string;
  factZh: string;
  factEn: string;
  icon: string;
}

export interface WorldStageDef {
  stage: number; // 1..10
  districtZh: string;
  districtEn: string;
  archetype: CityArchetype;
  atmosphere: ShiftAtmosphere;
  gridSize: 15 | 17 | 19;
  stopCount: number;
  timeLimitSec: number;
  cruiserCount: number;
  scooterCount: number;
  bridgeGateCount: number;
  signalCount: number;
}

export interface WorldCityDef {
  id: string;
  continent: ContinentId;
  nameZh: string;
  nameEn: string;
  countryZh: string;
  countryEn: string;
  taglineZh: string;
  taglineEn: string;
  lat: number;
  lng: number;
  accentHex: string;
  unlockStarsRequired: number;
  streetsZh: string[];
  streetsEn: string[];
  dishes: WorldDishEntry[];
  landmarks: [WorldLandmarkDef, WorldLandmarkDef];
  stages: WorldStageDef[];
}

export const CONTINENTS: { id: ContinentId; nameZh: string; nameEn: string; icon: string }[] = [
  { id: 'asia', nameZh: '亚洲', nameEn: 'Asia', icon: '🏮' },
  { id: 'europe', nameZh: '欧洲', nameEn: 'Europe', icon: '🏰' },
  { id: 'north_america', nameZh: '北美洲', nameEn: 'N. America', icon: '🗽' },
  { id: 'south_america', nameZh: '南美洲', nameEn: 'S. America', icon: '🎭' },
  { id: 'oceania', nameZh: '大洋洲', nameEn: 'Oceania', icon: '⛵' },
  { id: 'africa', nameZh: '非洲', nameEn: 'Africa', icon: '🏺' },
];

type RawStageTuple = [string, string, CityArchetype, ShiftAtmosphere];

function buildStages(rows: RawStageTuple[]): WorldStageDef[] {
  return rows.map(([districtZh, districtEn, archetype, atmosphere], idx) => {
    const stage = idx + 1;
    const gridSize: 15 | 17 | 19 = stage <= 3 ? 15 : stage <= 7 ? 17 : 19;
    const stopCount = Math.min(8, 3 + Math.floor(stage / 2));
    return {
      stage,
      districtZh,
      districtEn,
      archetype,
      atmosphere,
      gridSize,
      stopCount,
      timeLimitSec: Math.max(76, 86 + stopCount * 8 - Math.floor(stage * 1.2)),
      cruiserCount: 4 + Math.floor(stage * 0.7),
      scooterCount: 1 + Math.floor(stage * 0.45),
      bridgeGateCount: stage <= 2 ? 0 : stage <= 6 ? 1 : 2,
      signalCount: 3 + Math.floor(stage * 0.5),
    };
  });
}

function dish(
  id: string,
  nameZh: string,
  nameEn: string,
  merchantZh: string,
  merchantEn: string,
  categoryZh: string,
  categoryEn: string,
  factZh: string,
  factEn: string,
  tipZh: string,
  tipEn: string,
  icon: string,
  kind: ParcelKind,
): WorldDishEntry {
  return { loreId: id, nameZh, nameEn, merchantZh, merchantEn, categoryZh, categoryEn, factZh, factEn, tipZh, tipEn, icon, kind };
}

const A = CityArchetype;
const S = ShiftAtmosphere;
const P = ParcelKind;

export const WORLD_CITIES: WorldCityDef[] = [
  {
    id: 'beijing',
    continent: 'asia',
    nameZh: '北京',
    nameEn: 'Beijing',
    countryZh: '中国',
    countryEn: 'China',
    taglineZh: '中轴古城与胡同烟火',
    taglineEn: 'Imperial Axis & Hutong Lanes',
    lat: 39.9042,
    lng: 116.4074,
    accentHex: '#ef4444',
    unlockStarsRequired: 0,
    streetsZh: ['长安街', '王府井大街', '南锣鼓巷', '前门大街', '三里屯路', '西单北大街', '平安里大街', '鼓楼东大街'],
    streetsEn: ["Chang'an Ave", 'Wangfujing St', 'Nanluoguxiang', 'Qianmen Ave', 'Sanlitun Rd', 'Xidan North Ave', "Ping'anli Ave", 'Gulou East St'],
    dishes: [
      dish('bj_duck', '全聚德挂炉烤鸭', 'Peking Roast Duck', '前门烤鸭老铺', 'Qianmen Roast House', '宫廷名菜', 'Imperial Dish', '明代宫廷御膳流传至今，枣木果香烤制百分钟，皮酥肉嫩配荷叶饼。', 'Crisp jujube-wood roasted duck carved thin with pancakes and sweet bean sauce.', '热食保温：尽快送达防止鸭皮回软', 'Hot Thermal: deliver swiftly to keep skin crisp', '🦆', P.HotExpress),
      dish('bj_noodles', '老北京炸酱面', 'Beijing Zhajiangmian', '胡同手擀面坊', 'Hutong Noodle Stall', '京味面点', 'Local Noodle', '干黄酱与五花肉丁小火慢熬，搭配七色菜码，夏日过水冬季热拌。', 'Hand-pulled noodles tossed with slow-simmered pork soybean paste and crisp julienned veggies.', '稳健驾驶：汤卤防洒', 'Smooth driving keeps sauce inside', '🍜', P.Small),
      dish('bj_tanghulu', '冰糖葫芦礼串', 'Candied Hawthorn', '鼓楼糖画铺', 'Gulou Sugar Stall', '传统小吃', 'Street Sweet', '山楂去核熬冰糖挂壳，清脆酸甜，冬季庙会最受欢迎的街头零嘴。', 'Skewered hawthorn berries dipped in crackling caramelized sugar syrup.', '易碎糖壳：注意避让路边设施', 'Fragile glaze: avoid bumps', '🍡', P.Fragile),
      dish('bj_pastry', '京八件御点礼盒', 'Imperial Pastry Box', '稻香村老铺', 'Daoxiangcun Bakery', '传统糕点', 'Heritage Pastry', '枣花酥、牛舌饼等八款传统酥皮点心，象征福禄寿喜的京城伴手礼。', 'Eight auspicious flaky pastries stamped with floral motifs for festive gifting.', '大件礼盒：投掷圈内减速', 'Large box: brake inside ring', '🥮', P.Large),
      dish('bj_hotpot', '铜锅涮肉鲜切套餐', 'Copper Hotpot Lamb', '东来顺分店', 'Donglaishun Grill', '京味火锅', 'Hotpot Feast', '讲究清水清汤、手切鲜羊上脑，配麻酱韭菜花与糖蒜，暖胃十足。', 'Paper-thin hand-sliced lamb paired with roasted sesame sauce and pickled garlic.', '热食急送', 'Hot Express priority', '🍲', P.HotExpress),
      dish('bj_porcelain', '景泰蓝手工赏瓶', 'Cloisonné Enamel Vase', '琉璃厂非遗坊', 'Liulichang Craft', '非遗工艺', 'Heritage Craft', '以铜丝掐花填釉烧制而成，色泽雍容，是老北京燕京八绝工艺代表。', 'Intricate copper-wire filigree fused with cobalt and turquoise mineral enamels.', '易碎珍品：严禁磕碰', 'Fragile art: handle gently', '🏺', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_bj_gate', kind: 'palace-gate', nameZh: '正阳门古城楼', nameEn: 'Zhengyangmen Gate', eraZh: '明永乐十七年 · 1419年', eraEn: 'Ming Dynasty · 1419', factZh: '北京内城正南门，曾是皇城最宏伟的城门建筑，如今见证中轴线千年古今变迁。', factEn: 'The grand southern gate of Beijing inner city guarding the historic central axis for six centuries.', icon: '🏯' },
      { loreId: 'lm_bj_arch', kind: 'grand-arch', nameZh: '前门五牌楼', nameEn: 'Qianmen Ceremonial Arch', eraZh: '明清古商业街区', eraEn: 'Historic Civic Arch', factZh: '五间六柱冲天式木牌楼横跨前门大街北端，是京城繁华市井与老字号的象征。', factEn: 'Five-bay ceremonial timber archway welcoming merchants and travelers into bustling Qianmen.', icon: '⛩️' },
    ],
    stages: buildStages([
      ['前门胡同街', 'Qianmen Hutongs', A.DowntownMoatRing, S.SunnyHarbor],
      ['王府井金街', 'Wangfujing Blvd', A.WindingCanalHarbor, S.GoldenSunset],
      ['南锣鼓巷坊', 'Nanluoguxiang', A.DowntownMoatRing, S.SunnyHarbor],
      ['什刹海荷花', 'Shichahai Lakes', A.WindingCanalHarbor, S.GoldenSunset],
      ['三里屯光影', 'Sanlitun Neon', A.SerpentinePortMaze, S.TwilightNeon],
      ['西单商业区', 'Xidan Hub', A.DowntownMoatRing, S.SunnyHarbor],
      ['国贸双子路', 'Guomao CBD', A.TwinRiverArchipelago, S.TwilightNeon],
      ['鼓楼钟鸣巷', 'Gulou Bell Quarter', A.DowntownMoatRing, S.GoldenSunset],
      ['亮马河水岸', 'Liangma Canal', A.TwinRiverArchipelago, S.TwilightNeon],
      ['奥森中轴环', 'Olympic Central Ring', A.SerpentinePortMaze, S.GoldenSunset],
    ]),
  },
  {
    id: 'shanghai',
    continent: 'asia',
    nameZh: '上海',
    nameEn: 'Shanghai',
    countryZh: '中国',
    countryEn: 'China',
    taglineZh: '十里洋场与霓虹江湾',
    taglineEn: 'Bund Heritage & Skyline Neon',
    lat: 31.2304,
    lng: 121.4737,
    accentHex: '#0ea5e9',
    unlockStarsRequired: 0,
    streetsZh: ['南京东路', '淮海中路', '武康路', '陆家嘴环路', '愚园路', '世纪大道', '外滩中山东一路', '衡山路'],
    streetsEn: ['Nanjing East Rd', 'Huaihai Rd', 'Wukang Rd', 'Lujiazui Ring', 'Yuyuan Rd', 'Century Ave', 'The Bund', 'Hengshan Rd'],
    dishes: [
      dish('sh_xlb', '南翔鲜肉小笼包', 'Steamed Soup Dumplings', '豫园老茶楼', 'Yuyuan Teahouse', '本帮点心', 'Dim Sum', '皮薄十八褶、鲜肉冻化作滚烫高汤，轻提慢咬蘸姜丝香醋最地道。', 'Delicate 18-pleat dumplings filled with savory pork broth, best dipped in ginger vinegar.', '热食保温：汤汁极烫请快送', 'Hot Thermal: keep piping hot', '🥟', P.HotExpress),
      dish('sh_sjb', '阿娘脆底生煎包', 'Crispy Pan-Fried Buns', '黄河路美食铺', 'Huanghe Rd Kitchen', '街头名点', 'Street Bite', '铁锅水油焖煎至底部金黄焦脆，撒上白芝麻与青葱花，满口鲜香。', 'Iron-skillet buns seared golden crisp underneath and topped with sesame and scallions.', '迅速派送保持酥脆', 'Deliver hot for crispy bottom', '🫓', P.HotExpress),
      dish('sh_noodle', '葱油拌面配熏鱼', 'Scallion Oil Noodles', '弄堂面馆', 'Lane Noodle House', '海派面食', 'Noodle', '小葱慢火熬制焦香黑葱油，拌匀劲道细面再配甜咸酥脆爆鱼块。', 'Springy noodles coated in slow-caramelized scallion oil alongside sweet glazed fish.', '小件稳送', 'Compact bowl', '🍝', P.Small),
      dish('sh_butterfly', '国际饭店蝴蝶酥', 'Palmier Butterfly Pastry', '外滩西饼屋', 'Bund Patisserie', '海派烘焙', 'Patisserie', '层层叠叠的黄油酥皮烤至蜂窝金黄，上海人排队也要带回家的甜蜜记忆。', 'Flaky caramelized puff-pastry hearts baked in classic Shanghai Art Deco tradition.', '酥皮易碎：平稳转弯', 'Fragile layers: smooth turns', '🥐', P.Fragile),
      dish('sh_vinyl', '百代复古黑胶箱', 'Vintage Jazz Vinyl Crate', '法租界唱片行', 'Concession Records', '海派文创', 'Cultural Crate', '收录老上海爵士乐与摩登曲目的复刻黑胶唱片套装，极具收藏价值。', 'Collector vinyl box set celebrating 1930s Shanghai swing and modern fusion.', '大件箱包：停稳后投掷', 'Large crate: brake to unload', '💿', P.Large),
      dish('sh_coffee', '武康路手冲冷萃杯', 'Wukang Pour-Over Coffee', '梧桐咖啡馆', 'Plane Tree Cafe', '都市咖啡', 'Cafe Craft', '上海每万人咖啡馆密度居世界前列，花香柑橘调精品手冲深受白领喜爱。', 'Single-origin floral pour-over brewed beneath Wukang Road plane trees.', '杯装防洒', 'Prevent spills', '☕', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_sh_pearl', kind: 'pearl-tower', nameZh: '东方明珠广播塔', nameEn: 'Oriental Pearl Tower', eraZh: '现代浦东地标 · 1994年', eraEn: 'Pudong Skyline · 1994', factZh: '十一颗大小不一的球体串联成“大珠小珠落玉盘”的奇观，点亮黄浦江夜空。', factEn: 'Eleven luminous spheres suspended along tripod columns overlooking the Huangpu River.', icon: '🗼' },
      { loreId: 'lm_sh_clock', kind: 'clock-tower', nameZh: '外滩海关大楼钟楼', nameEn: 'Bund Customs Clock Tower', eraZh: '新古典主义 · 1927年', eraEn: 'Neoclassical · 1927', factZh: '被誉为“亚洲第一大钟”，近百年来每逢整点报时声传遍外滩万国建筑群。', factEn: 'Historic four-faced clock tower chiming across the Bund waterfront since 1927.', icon: '🕰️' },
    ],
    stages: buildStages([
      ['武康路梧桐街', 'Wukang Plane Trees', A.WindingCanalHarbor, S.SunnyHarbor],
      ['豫园九曲城隍', 'Yu Garden Pavilion', A.DowntownMoatRing, S.GoldenSunset],
      ['南京路步行街', 'Nanjing Pedestrian', A.SerpentinePortMaze, S.TwilightNeon],
      ['外滩万国码头', 'Bund Waterfront', A.TwinRiverArchipelago, S.GoldenSunset],
      ['陆家嘴天际环', 'Lujiazui Skyline', A.TwinRiverArchipelago, S.TwilightNeon],
      ['静安寺金顶区', 'Jing An Temple', A.DowntownMoatRing, S.SunnyHarbor],
      ['田子坊石库门', 'Tianzifang Lanes', A.WindingCanalHarbor, S.GoldenSunset],
      ['徐汇滨江艺术', 'West Bund Art', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['苏州河老仓库', 'Suzhou Creek Bridges', A.WindingCanalHarbor, S.TwilightNeon],
      ['虹桥国际枢纽', 'Hongqiao Express', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'hangzhou',
    continent: 'asia',
    nameZh: '杭州',
    nameEn: 'Hangzhou',
    countryZh: '中国',
    countryEn: 'China',
    taglineZh: '西湖烟柳与江南水巷',
    taglineEn: 'West Lake Lotus & Canal Bridges',
    lat: 30.2741,
    lng: 120.1551,
    accentHex: '#10b981',
    unlockStarsRequired: 2,
    streetsZh: ['南山路', '湖滨路', '延安路', '北山街', '河坊街', '庆春路', '西湖大道', '曙光路'],
    streetsEn: ['Nanshan Rd', 'Hubin Rd', "Yan'an Rd", 'Beishan St', 'Hefang St', 'Qingchun Rd', 'West Lake Ave', 'Shuguang Rd'],
    dishes: [
      dish('hz_fish', '楼外楼西湖醋鱼', 'West Lake Vinegar Fish', '孤山老字号', 'Gushan Heritage House', '杭帮名菜', 'Hangzhou Classic', '选用鲜活草鱼烫熟淋上糖醋勾芡，肉质如蟹肉般鲜嫩酸甜。', 'Poached grass carp glazed in fragrant rice-vinegar caramel sauce.', '热食保温', 'Hot Thermal', '🐟', P.HotExpress),
      dish('hz_pork', '东坡焖肉砂锅', 'Dongpo Braised Pork', '苏堤茶宴馆', 'Sudi Banquet', '宋韵名菜', 'Song Classic', '五花肉以黄酒冰糖小火慢焖三小时，肥而不腻、入口即化。', 'Slow-braised pork belly simmered in Shaoxing wine and rock sugar until melt-in-mouth.', '热汤防烫', 'Hot claypot express', '🍖', P.HotExpress),
      dish('hz_tea', '明前特级龙井罐', 'First-Flush Longjing Tea', '梅家坞茶庄', 'Meijiawu Tea Manor', '西湖名茶', 'Artisan Tea', '清明前采摘的嫩芽炒制出栗香豆香，是中国十大名茶之首。', 'Hand-roasted tender spring tea buds famed for chestnut aroma and jade liquor.', '茶罐防潮防撞', 'Fragile tin', '🍵', P.Fragile),
      dish('hz_fan', '王星记檀香折扇', 'Sandalwood Folding Fan', '清河坊手艺坊', 'Qinghefang Crafts', '江南雅物', 'Silk & Wood Craft', '天然檀香木拉花扇骨，轻摇即散淡雅幽香，百年非遗精品。', 'Delicately pierced sandalwood fan releasing subtle botanical fragrance with every breeze.', '小件精美礼盒', 'Compact gift sleeve', '🪭', P.Small),
      dish('hz_shrimp', '龙井茶香河虾仁', 'Longjing Tea Shrimp', '湖滨雅厨', 'Hubin Kitchen', '时令佳肴', 'Seasonal Dish', '手剥淡水河虾仁与龙井茶芽同炒，清鲜弹牙，色如白玉点翠。', 'Plump river shrimp wok-tossed rapidly with freshly steeped Longjing tea leaves.', '热菜快送', 'Hot dish', '🍤', P.HotExpress),
      dish('hz_silk', '江南真丝刺绣礼匣', 'Silk Embroidery Chest', '丝绸博物馆坊', 'Silk Atelier', '丝绸文化', 'Silk Heritage', '杭州素有丝绸之府美誉，双面苏杭绣工细腻温润如画卷。', 'Double-sided silk embroidery woven in Hangzhou historic silk-capital tradition.', '大件礼箱', 'Large chest', '🎁', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_hz_gate', kind: 'palace-gate', nameZh: '清河坊鼓楼城阁', nameEn: 'Hefang Drum Tower', eraZh: '南宋御街遗韵', eraEn: 'Southern Song Heritage', factZh: '重檐歇山顶飞檐高挑，立于南宋御街入口，俯瞰杭城千年烟火与运河帆影。', factEn: 'Multi-eave timber tower marking the historic Imperial Street of the Southern Song capital.', icon: '🏯' },
      { loreId: 'lm_hz_clock', kind: 'clock-tower', nameZh: '六和文化观澜塔', nameEn: 'Six Harmonies Spire', eraZh: '北宋 · 970年始建', eraEn: 'Northern Song · 970', factZh: '镇守钱塘江畔的古塔意象，曾作江船航行灯塔，登顶可望钱塘大潮奔涌。', factEn: 'Riverside beacon tower guiding Qiantang River vessels past surging tidal bores.', icon: '🗼' },
    ],
    stages: buildStages([
      ['断桥残雪岸', 'Broken Bridge Shore', A.WindingCanalHarbor, S.SunnyHarbor],
      ['湖滨音乐喷泉', 'Hubin Fountain', A.WindingCanalHarbor, S.GoldenSunset],
      ['河坊南宋御街', 'Hefang Imperial St', A.DowntownMoatRing, S.GoldenSunset],
      ['拱宸京杭运河', 'Grand Canal Arch', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['灵隐禅意竹径', 'Lingyin Bamboo Trail', A.WindingCanalHarbor, S.SunnyHarbor],
      ['西溪湿地水网', 'Xixi Wetland', A.SerpentinePortMaze, S.GoldenSunset],
      ['钱江新城灯秀', 'Qianjiang Lights', A.TwinRiverArchipelago, S.TwilightNeon],
      ['武林广场商圈', 'Wulin Hub', A.DowntownMoatRing, S.TwilightNeon],
      ['湘湖荷塘月色', 'Xianghu Lotus', A.WindingCanalHarbor, S.TwilightNeon],
      ['滨江数字硅谷', 'Binjiang Tech Bay', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'chengdu',
    continent: 'asia',
    nameZh: '成都',
    nameEn: 'Chengdu',
    countryZh: '中国',
    countryEn: 'China',
    taglineZh: '巴蜀茶馆与麻辣欢歌',
    taglineEn: 'Teahouses & Fiery Spice',
    lat: 30.5728,
    lng: 104.0668,
    accentHex: '#f97316',
    unlockStarsRequired: 3,
    streetsZh: ['春熙路', '锦里古街', '宽窄巷子', '天府大道', '人民南路', '蜀都大道', '琴台路', '玉林西路'],
    streetsEn: ['Chunxi Rd', 'Jinli Ancient St', 'Kuanzhai Alley', 'Tianfu Ave', 'Renmin South Rd', 'Shudu Ave', 'Qintai Rd', 'Yulin West Rd'],
    dishes: [
      dish('cd_hotpot', '九宫格老火锅底料', 'Sichuan Mala Hotpot', '玉林老灶坊', 'Yulin Old Stove', '川味之魂', 'Sichuan Icon', '牛油花椒与二荆条辣椒慢火炒香，麻而不苦、辣而不燥的天府风味。', 'Aromatic beef tallow simmered with numbing Sichuan peppercorns and fiery chilies.', '大件调料箱', 'Large spice box', '🥘', P.Large),
      dish('cd_tofu', '陈麻婆鲜香豆腐', 'Mapo Tofu Bowl', '西玉龙老店', 'Chen Mapo Kitchen', '经典川菜', 'Classic Sichuan', '讲究“麻、辣、烫、嫩、酥、香、鲜”，一勺红油拌饭令人欲罢不能。', 'Silky tofu cubes braised in fermented broad-bean chili oil and fragrant ground beef.', '热食急送防凉', 'Hot Thermal bowl', '🫕', P.HotExpress),
      dish('cd_noodle', '红油脆哨担担面', 'Dandan Sesame Noodles', '宽窄面铺', 'Kuanzhai Noodles', '市井小吃', 'Street Favorite', '手工细面铺上芽菜肉臊、芝麻酱与秘制红油，昔日挑担沿街叫卖的美味。', 'Savory minced pork, preserved mustard greens, and chili-sesame sauce over noodles.', '小份快捷', 'Fast small order', '🍜', P.Small),
      dish('cd_panda', '大熊猫基地竹笋礼', 'Panda Bamboo Bento', '熊猫文创园', 'Panda Sanctuary Shop', '萌趣文创', 'City Souvenir', '附带毛绒熊猫挂件的高山嫩笋礼盒，治愈每一位收件人的心。', 'Tender mountain bamboo delicacy paired with an adorable plush panda keepsake.', '大件礼盒', 'Large gift crate', '🐼', P.Large),
      dish('cd_tea', '盖碗茉莉飘雪茶', 'Jasmine Gaiwan Tea', '人民公园茶社', 'People Park Teahouse', '巴蜀茶道', 'Tea Culture', '四川双花窨制，杯盖微倾茶香扑鼻，配一盘瓜子便是成都慢生活。', 'Fragrant snow-bud green tea scented repeatedly with fresh night-blooming jasmine.', '易碎盖碗瓷杯', 'Fragile porcelain', '🍵', P.Fragile),
      dish('cd_mask', '川剧变脸漆器微雕', 'Sichuan Opera Mask', '锦里戏曲坊', 'Jinli Opera Studio', '非遗绝活', 'Heritage Art', '展现巴蜀川剧绝活“瞬息变脸”的精细彩绘漆器面具藏品。', 'Hand-lacquered miniature celebrating Sichuan Opera legendary rapid face-changing art.', '易碎工艺品', 'Fragile collectible', '🎭', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_cd_gate', kind: 'palace-gate', nameZh: '锦里武侯红墙阁', nameEn: 'Jinli Crimson Pavilion', eraZh: '三国蜀汉遗风', eraEn: 'Three Kingdoms Heritage', factZh: '红墙竹影与飞檐斗拱相连，展现巴蜀古街“拜水都江堰，问道青城山”的人文底蕴。', factEn: 'Crimson timber corridors and bamboo shadows echoing Three Kingdoms folklore.', icon: '🏮' },
      { loreId: 'lm_cd_tower', kind: 'radio-mast', nameZh: '天府锦绣广播塔', nameEn: 'Tianfu Broadcast Tower', eraZh: '现代天府地标 · 339米', eraEn: 'Modern Landmark · 339m', factZh: '中国西部最高电视塔之一，俯瞰锦江夜景与悠闲茶馆灯光。', factEn: 'Soaring 339-meter broadcast spire lighting up the Jinjiang riverfront.', icon: '📡' },
    ],
    stages: buildStages([
      ['宽窄巷子茶院', 'Kuanzhai Courtyards', A.DowntownMoatRing, S.SunnyHarbor],
      ['锦里红灯长廊', 'Jinli Lantern Lane', A.WindingCanalHarbor, S.GoldenSunset],
      ['春熙太古潮街', 'Taikoo Li Plaza', A.DowntownMoatRing, S.TwilightNeon],
      ['玉林小酒馆区', 'Yulin Music Quarter', A.WindingCanalHarbor, S.GoldenSunset],
      ['武侯祠红墙路', 'Wuhou Red Walls', A.DowntownMoatRing, S.SunnyHarbor],
      ['锦江夜游水岸', 'Jinjiang Night Quay', A.TwinRiverArchipelago, S.TwilightNeon],
      ['大熊猫竹林谷', 'Panda Bamboo Valley', A.WindingCanalHarbor, S.SunnyHarbor],
      ['东郊记忆工业', 'East Suburb Art', A.SerpentinePortMaze, S.GoldenSunset],
      ['都江堰分水桥', 'Dujiangyan Bridges', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['天府金融双塔', 'Tianfu Twin Towers', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'tokyo',
    continent: 'asia',
    nameZh: '东京',
    nameEn: 'Tokyo',
    countryZh: '日本',
    countryEn: 'Japan',
    taglineZh: '江户老街与二次元霓虹',
    taglineEn: 'Edo Shrines & Shibuya Neon',
    lat: 35.6762,
    lng: 139.6503,
    accentHex: '#ec4899',
    unlockStarsRequired: 5,
    streetsZh: ['银座中央通', '表参道', '秋叶原中央通', '涩谷道玄坂', '浅草雷门通', '新宿靖国通', '晴海通', '六本木通'],
    streetsEn: ['Ginza Chuo-dori', 'Omotesando', 'Akihabara Chuo', 'Shibuya Dogenzaka', 'Asakusa Kaminarimon', 'Shinjuku Yasukuni', 'Harumi-dori', 'Roppongi-dori'],
    dishes: [
      dish('tk_sushi', '筑地极上蓝鳍寿司', 'Tsukiji Bluefin Sushi', '丰洲鲜鱼亭', 'Toyosu Sushi Bar', '江户前寿司', 'Edomae Sushi', '新鲜直送的大腹金枪鱼配温热赤醋舍利，刀工细腻、入口即化。', 'Melt-in-mouth bluefin otoro nigiri crafted over seasoned warm akazu vinegar rice.', '保鲜小盒快送', 'Fresh compact box', '🍣', P.Small),
      dish('tk_ramen', '新宿豚骨叉烧拉面', 'Tonkotsu Ramen Bowl', '新宿深夜屋台', 'Shinjuku Ramen Stall', '国民面食', 'Comfort Food', '猪骨大火熬制十二小时呈乳白浓汤，配半熟溏心蛋与厚切炙烤叉烧。', 'Rich 12-hour simmered pork bone broth topped with chashu and soft-boiled ajitama egg.', '热汤急送防坨', 'Hot Thermal: keep broth hot', '🍜', P.HotExpress),
      dish('tk_matcha', '宇治抹茶生八桥礼盒', 'Matcha Wagashi Box', '浅草老铺甘味', 'Asakusa Sweet Shop', '传统和果子', 'Traditional Sweet', '细腻糯米皮包裹石磨宇治抹茶馅，清苦回甘，配煎茶最佳。', 'Silky mochi triangles dusted in stone-milled Uji matcha with sweet red bean.', '小件伴手礼', 'Gift sweet box', '🍡', P.Small),
      dish('tk_glass', '江户切子琉璃对杯', 'Edo Kiriko Cut Glass', '墨田工艺馆', 'Sumida Glass Studio', '传统工艺', 'Artisan Glass', '色泽深邃的双层玻璃手工雕出菊花与麻叶几何纹样，晶莹夺目。', 'Hand-faceted cobalt and crimson crystal glassware bearing centuries-old geometric motifs.', '极度易碎：零碰撞护送', 'Fragile crystal: zero bumps!', '🥃', P.Fragile),
      dish('tk_arcade', '秋叶原限定街机板', 'Akihabara Retro Box', '电器街模型店', 'Akihabara Hobby', '潮流科技', 'Pop Culture', '充满怀旧像素回忆的限定收藏模型礼盒，二次元爱好者必抢单品。', 'Collector retro console and figure crate straight from Electric Town.', '大件宅急便箱', 'Large collector box', '🕹️', P.Large),
      dish('tk_tempura', '金黄海老天妇罗便当', 'Crispy Shrimp Tempura', '银座天ぷら老店', 'Ginza Tempura', '江户料理', 'Edo Cuisine', '冰水调制的极薄面衣瞬时油炸锁住鲜虾甜汁，外酥里嫩。', 'Airy lace-battered tiger prawns fried crisp in sesame oil over steamed Koshihikari rice.', '热食保温', 'Hot Thermal', '🍤', P.HotExpress),
    ],
    landmarks: [
      { loreId: 'lm_tk_tower', kind: 'radio-mast', nameZh: '东京芝公园铁塔', nameEn: 'Tokyo Tower', eraZh: '昭和象征 · 1958年', eraEn: 'Showa Icon · 1958', factZh: '红白相间的铁塔高332.9米，半个多世纪以来守护东京湾天际线。', factEn: 'International orange-and-white lattice spire standing 333m above Shiba Park.', icon: '🗼' },
      { loreId: 'lm_tk_gate', kind: 'palace-gate', nameZh: '浅草雷门大红灯笼', nameEn: 'Kaminarimon Gate', eraZh: '千年浅草寺正门', eraEn: 'Sensoji Temple Gate', factZh: '重达700公斤的巨型红灯笼悬于门下，是东京最著名的江户风情门户。', factEn: 'Iconic thunder gate holding a giant 700kg crimson paper lantern over Nakamise.', icon: '🏮' },
    ],
    stages: buildStages([
      ['浅草雷门参道', 'Asakusa Temple St', A.WindingCanalHarbor, S.SunnyHarbor],
      ['上野樱花公园', 'Ueno Cherry Park', A.DowntownMoatRing, S.SunnyHarbor],
      ['秋叶原电器街', 'Akihabara Electric', A.SerpentinePortMaze, S.TwilightNeon],
      ['银座四丁目角', 'Ginza 4-Chome', A.DowntownMoatRing, S.GoldenSunset],
      ['筑地海鲜码头', 'Tsukiji Harbor', A.WindingCanalHarbor, S.SunnyHarbor],
      ['涩谷全向路口', 'Shibuya Scramble', A.SerpentinePortMaze, S.TwilightNeon],
      ['表参道林荫道', 'Omotesando Blvd', A.DowntownMoatRing, S.GoldenSunset],
      ['台场彩虹海湾', 'Odaiba Bay Bridge', A.TwinRiverArchipelago, S.TwilightNeon],
      ['新宿歌舞伎町', 'Shinjuku Neon', A.SerpentinePortMaze, S.TwilightNeon],
      ['隅田川夜游桥', 'Sumida River Bridges', A.TwinRiverArchipelago, S.GoldenSunset],
    ]),
  },
  {
    id: 'seoul',
    continent: 'asia',
    nameZh: '首尔',
    nameEn: 'Seoul',
    countryZh: '韩国',
    countryEn: 'South Korea',
    taglineZh: '汉江桥影与韩屋咖啡',
    taglineEn: 'Han River Bridges & Hanok Cafes',
    lat: 37.5665,
    lng: 126.978,
    accentHex: '#6366f1',
    unlockStarsRequired: 7,
    streetsZh: ['明洞中央街', '江南大道', '弘大红路', '仁寺洞文化街', '圣水咖啡街', '清溪川路', '汝矣岛公园路', '梨泰院大道'],
    streetsEn: ['Myeongdong St', 'Gangnam Blvd', 'Hongdae St', 'Insadong Way', 'Seongsu Cafe St', 'Cheonggyecheon Rd', 'Yeouido Park Rd', 'Itaewon Blvd'],
    dishes: [
      dish('kr_bibim', '全州石锅拌饭', 'Sizzling Bibimbap', '北村韩屋食堂', 'Bukchon Kitchen', '传统韩食', 'Korean Classic', '五色时蔬、牛肉丝与流心太阳蛋铺在滚烫石锅饭上，拌入韩式辣酱锅巴焦香。', 'Colorful seasoned veggies, beef, and egg sizzling over crisp rice with gochujang.', '热锅保温急送', 'Hot Thermal stone bowl', '🥘', P.HotExpress),
      dish('kr_chicken', '弘大蜂蜜蒜香炸鸡', 'Crispy Korean Chicken', '弘大炸鸡屋', 'Hongdae Fried Chicken', '潮流美食', 'Street Favorite', '双重油炸锁住脆壳，裹上甜辣或蜂蜜蒜香酱汁，配爽口萝卜丁。', 'Double-fried ultra-crisp chicken glazed in honey garlic soy with pickled radish.', '热食快送', 'Hot Thermal', '🍗', P.HotExpress),
      dish('kr_tea', '青瓷传统茶具礼盒', 'Goryeo Celadon Tea Set', '仁寺洞窑坊', 'Insadong Kiln', '东方陶瓷', 'Ceramic Craft', '翡翠般温润的高丽青瓷釉色，是韩国千年陶瓷艺术的代表。', 'Jade-green glazed celadon teapot and cups crafted in Goryeo kiln heritage.', '极易碎瓷器', 'Fragile ceramic', '🫖', P.Fragile),
      dish('kr_tteok', '明洞芝士辣炒年糕', 'Cheese Tteokbokki', '明洞夜市摊', 'Myeongdong Stall', '街头小吃', 'Night Market', '软糯弹牙的条状年糕裹满浓稠甜辣酱汁与拉丝马苏里拉芝士。', 'Chewy rice cakes simmered in spicy-sweet gochujang broth under melted mozzarella.', '小份热送', 'Small hot cup', '🍢', P.Small),
      dish('kr_coffee', '圣水洞精品冷萃礼箱', 'Seongsu Coffee Crate', '圣水烘焙厂', 'Seongsu Roastery', '咖啡文化', 'Roastery Box', '旧工厂改造的潮流咖啡街区出品，包含多款手冲挂耳与玻璃分享壶。', 'Artisan coffee tasting box from Seongsu converted brick warehouse roasteries.', '大件易搬礼箱', 'Large box', '☕', P.Large),
      dish('kr_soup', '高丽参鸡汤滋补煲', 'Ginseng Chicken Soup', '景福宫老店', 'Gyeongbok Soup', '养生名汤', 'Heritage Soup', '整只童子鸡肚内填满糯米红枣与六年根人参，文火炖至汤白肉烂。', 'Whole young chicken stuffed with glutinous rice, jujube, and Korean ginseng.', '热汤防凉', 'Hot Thermal', '🍲', P.HotExpress),
    ],
    landmarks: [
      { loreId: 'lm_kr_tower', kind: 'radio-mast', nameZh: 'N首尔南山塔', nameEn: 'N Seoul Tower', eraZh: '南山山巅 · 1975年', eraEn: 'Namsan Peak · 1975', factZh: '矗立在南山之巅的观景通信塔，夜晚灯光颜色还会实时提示首尔空气质量。', factEn: 'Hilltop observation spire overlooking the Han River and glowing with air-quality colors.', icon: '🗼' },
      { loreId: 'lm_kr_gate', kind: 'palace-gate', nameZh: '光化古门正殿门', nameEn: 'Gwanghwamun Gate', eraZh: '朝鲜王宫正门 · 1395年', eraEn: 'Royal Gate · 1395', factZh: '景福宫的南正门，三道石拱门与重檐木阁庄重典雅，连接首尔历史中轴。', factEn: 'Grand stone-arched main gate of Gyeongbokgung Palace framing Mt. Bugaksan.', icon: '🏯' },
    ],
    stages: buildStages([
      ['北村韩屋石巷', 'Bukchon Hanok', A.DowntownMoatRing, S.SunnyHarbor],
      ['清溪川夜灯溪', 'Cheonggyecheon', A.WindingCanalHarbor, S.TwilightNeon],
      ['明洞潮流商圈', 'Myeongdong Hub', A.SerpentinePortMaze, S.TwilightNeon],
      ['仁寺洞古玩街', 'Insadong Craft', A.DowntownMoatRing, S.GoldenSunset],
      ['弘大街头艺术', 'Hongdae Music', A.SerpentinePortMaze, S.TwilightNeon],
      ['圣水红砖咖啡', 'Seongsu Lofts', A.WindingCanalHarbor, S.GoldenSunset],
      ['汝矣岛汉江桥', 'Yeouido Han River', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['江南时尚大道', 'Gangnam Boulevard', A.DowntownMoatRing, S.TwilightNeon],
      ['蚕室水岸乐园', 'Jamsil Lakeside', A.TwinRiverArchipelago, S.GoldenSunset],
      ['南山盘山松林', 'Namsan Pine Ridge', A.WindingCanalHarbor, S.GoldenSunset],
    ]),
  },
  {
    id: 'singapore',
    continent: 'asia',
    nameZh: '新加坡',
    nameEn: 'Singapore',
    countryZh: '新加坡',
    countryEn: 'Singapore',
    taglineZh: '花园狮城与南洋风味',
    taglineEn: 'Garden Island & Spice Markets',
    lat: 1.3521,
    lng: 103.8198,
    accentHex: '#14b8a6',
    unlockStarsRequired: 8,
    streetsZh: ['乌节路', '牛车水宝塔街', '克拉码头路', '滨海湾大道', '小印度实龙岗路', '哈芝巷', '武吉士街', '东海岸路'],
    streetsEn: ['Orchard Rd', 'Pagoda St Chinatown', 'Clarke Quay', 'Marina Bay Ave', 'Serangoon Rd', 'Haji Lane', 'Bugis St', 'East Coast Rd'],
    dishes: [
      dish('sg_chicken', '海南鸡饭经典盒', 'Hainanese Chicken Rice', '麦士威老档口', 'Maxwell Hawker', '国菜名点', 'National Dish', '鸡汤焖煮的油香丝苗米搭配白切嫩鸡、姜蓉与辣椒蒜蓉酱。', 'Silky poached chicken over fragrant chicken-broth rice with ginger-scallion and chili.', '热食快送', 'Hot Thermal', '🍗', P.HotExpress),
      dish('sg_crab', '辣椒螃蟹配黄金馒头', 'Chilli Crab Crate', '东海岸海鲜楼', 'East Coast Seafood', '南洋名菜', 'Seafood Icon', '酸甜微辣的番茄蛋花辣椒汁包裹肥美青蟹，配炸馒头蘸汁一绝。', 'Wok-tossed mud crab in glossy sweet-savory chili egg sauce with golden fried mantou.', '大件海鲜礼盒', 'Large feast crate', '🦀', P.Large),
      dish('sg_laksa', '加东椰香叻沙面', 'Katong Coconut Laksa', '加东老店', 'Katong Laksa', '娘惹美食', 'Peranakan', '浓醇椰浆、虾米与南姜香茅熬出红亮汤底，粗米粉剪短用勺吃更地道。', 'Creamy coconut curry noodle soup rich with dried shrimp, cockles, and laksa leaf.', '热汤急送', 'Hot Thermal', '🍲', P.HotExpress),
      dish('sg_kaya', '南洋咖椰吐司咖啡', 'Kaya Toast & Kopi', '亚坤南洋茶室', 'Heritage Kopitiam', '国民早餐', 'Kopitiam Set', '炭烤酥脆吐司夹入斑兰叶椰奶酱与厚切冷黄油，搭配炼乳黑咖啡。', 'Charcoal-toasted bread layered with pandan coconut jam and cold butter beside dark kopi.', '小件早茶包', 'Compact breakfast', '🥪', P.Small),
      dish('sg_orchid', '胡姬花水晶香氛瓶', 'Orchid Crystal Flask', '植物园精品店', 'Botanic Gift Shop', '狮城国花', 'Botanical Gift', '萃取新加坡国花卓锦万代兰淡雅芬芳的手工水晶扩香瓶。', 'Hand-blown crystal diffuser infused with Singapore national Vanda Miss Joaquim orchid.', '易碎玻璃瓶', 'Fragile glass', '🌺', P.Fragile),
      dish('sg_tile', '土生华人娘惹彩瓷', 'Peranakan Ceramic Tiles', '如切老街坊', 'Joo Chiat Atelier', '南洋非遗', 'Heritage Tile', '色彩绚丽的彩釉花砖，融合中华吉祥纹样与马来热带植物美学。', 'Vibrant hand-glazed floral porcelain tiles celebrating Straits Chinese Peranakan heritage.', '易碎瓷片盒', 'Fragile ceramic', '🎨', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_sg_opera', kind: 'sail-opera', nameZh: '滨海榴莲艺术馆', nameEn: 'Esplanade Twin Shells', eraZh: '滨海湾文化地标 · 2002年', eraEn: 'Marina Bay · 2002', factZh: '受热带水果榴莲灵感启发的铝制遮阳穹顶，既能遮挡赤道骄阳又如两颗璀璨宝石。', factEn: 'Twin geodesic sun-shaded performance domes inspired by tropical durian shells.', icon: '🎭' },
      { loreId: 'lm_sg_tower', kind: 'pearl-tower', nameZh: '滨海晴空观景塔', nameEn: 'Marina Sky Spire', eraZh: '花园城市天际线', eraEn: 'Garden City Skyline', factZh: '矗立在填海新区的摩天观景明珠，将马六甲海峡千帆竞渡尽收眼底。', factEn: 'Futuristic waterfront spire overlooking the busy Singapore Strait anchorage.', icon: '🏙️' },
    ],
    stages: buildStages([
      ['牛车水灯笼巷', 'Chinatown Pagoda', A.DowntownMoatRing, S.GoldenSunset],
      ['克拉码头水岸', 'Clarke Quay Canals', A.WindingCanalHarbor, S.TwilightNeon],
      ['哈芝巷彩虹街', 'Haji Lane Art', A.SerpentinePortMaze, S.SunnyHarbor],
      ['小印度香料坊', 'Little India Spice', A.DowntownMoatRing, S.GoldenSunset],
      ['乌节林荫购物', 'Orchard Boulevard', A.SerpentinePortMaze, S.SunnyHarbor],
      ['如切娘惹花屋', 'Joo Chiat Pastel', A.WindingCanalHarbor, S.SunnyHarbor],
      ['滨海湾花园岛', 'Marina Bay Gardens', A.TwinRiverArchipelago, S.TwilightNeon],
      ['东海岸椰风桥', 'East Coast Pier', A.WindingCanalHarbor, S.GoldenSunset],
      ['圣淘沙海湾环', 'Sentosa Cove', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['樟宜星耀之环', 'Jewel Dome Ring', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'paris',
    continent: 'europe',
    nameZh: '巴黎',
    nameEn: 'Paris',
    countryZh: '法国',
    countryEn: 'France',
    taglineZh: '塞纳左岸与浪漫烘焙',
    taglineEn: 'Seine Bridges & Artisan Cafes',
    lat: 48.8566,
    lng: 2.3522,
    accentHex: '#f43f5e',
    unlockStarsRequired: 0,
    streetsZh: ['香榭丽舍大街', '圣日耳曼大道', '里沃利街', '圣米歇尔大道', '歌剧院大街', '蒙田大道', '红磨坊街', '圣马丁运河路'],
    streetsEn: ['Champs-Elysées', 'Boul. St-Germain', 'Rue de Rivoli', 'Boul. St-Michel', "Ave de l'Opéra", 'Ave Montaigne', 'Rue Lepic', 'Canal St-Martin'],
    dishes: [
      dish('fr_croissant', '现烤法式黄油可颂', 'Butter Almond Croissant', '蒙马特面包坊', 'Montmartre Boulangerie', '法式烘焙', 'Boulangerie', '采用AOP诺曼底黄油折叠27层酥皮，咬下时酥屑纷飞、奶香四溢。', 'Twenty-seven flaky layers laminated with Normandy butter, golden and fragrant.', '热烘酥皮：轻拿轻放', 'Hot Thermal & delicate', '🥐', P.HotExpress),
      dish('fr_macaron', '马卡龙彩虹礼盒', 'Parisian Macaron Tin', '香街甜点屋', 'Champs Patisserie', '精致甜点', 'Patisserie', '杏仁蛋白霜外脆内软，夹入覆盆子、开心果与香草甘纳许。', 'Crisp almond-meringue shells filled with pistachio, raspberry, and vanilla ganache.', '易碎甜点盒', 'Fragile pastry box', '🍬', P.Fragile),
      dish('fr_beef', '勃艮第红酒炖牛肉', 'Beef Bourguignon', '左岸老餐馆', 'Left Bank Bistro', '法式经典', 'French Classic', '牛腩在红酒、百里香与珍珠洋葱中慢炖数小时，浓稠醇厚。', 'Slow-braised beef simmered in Burgundy Pinot Noir with pearl onions and mushrooms.', '热食保温煲', 'Hot Thermal', '🍲', P.HotExpress),
      dish('fr_wine', '波尔多名庄陈酿木箱', 'Bordeaux Vintage Crate', '圣日耳曼酒窖', 'Saint-Germain Cave', '佳酿典藏', 'Wine Reserve', '产自加龙河左岸的橡木桶陈酿佳酿，附带精美木箱与开瓶侍酒器。', 'Oak-aged Bordeaux grand cru packed in an engraved wooden collector crate.', '大件易碎酒箱：谨慎驾驶', 'Large & careful', '🍷', P.Large),
      dish('fr_perfume', '普罗旺斯薰衣草香氛', 'Lavender Perfume Vial', '玛黑区香水坊', 'Marais Parfumerie', '香氛艺术', 'Perfumery', '传承格拉斯百年调香工艺，前调柑橘明亮、尾调温柔木香。', 'Crafted in Grasse tradition blending Mediterranean bergamot with wild lavender.', '易碎水晶瓶', 'Fragile glass vial', '💐', P.Fragile),
      dish('fr_art', '塞纳河水彩画卷', 'Seine Watercolor Folio', '西岱岛画摊', 'Bouquinistes Stand', '左岸艺术', 'River Art', '塞纳河畔绿铁皮书摊手绘的巴黎古桥风景水彩画。', 'Original ink-and-watercolor sketch sold by historic green bookstalls along the Seine.', '小件画筒', 'Compact scroll', '🎨', P.Small),
    ],
    landmarks: [
      { loreId: 'lm_fr_tower', kind: 'radio-mast', nameZh: '埃菲尔铁塔', nameEn: 'Eiffel Tower', eraZh: '1889年世界博览会', eraEn: 'Expo Universelle · 1889', factZh: '由18038个金属构件铆接而成的“铁娘子”，整点时分两万盏闪烁灯光点亮巴黎。', factEn: 'Iconic 330m wrought-iron lattice tower sparkling hourly above the Champ de Mars.', icon: '🗼' },
      { loreId: 'lm_fr_arch', kind: 'grand-arch', nameZh: '星形广场凯旋门', nameEn: 'Arc de Triomphe', eraZh: '新古典主义 · 1836年', eraEn: 'Neoclassical · 1836', factZh: '十二条放射状林荫大道以此为中心向全巴黎延伸，巍峨庄严。', factEn: 'Monumental triumphal arch standing at the center of twelve radiating Parisian avenues.', icon: '🏛️' },
    ],
    stages: buildStages([
      ['西岱岛圣母桥', 'Île de la Cité', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['圣日耳曼咖啡', 'St-Germain Cafes', A.DowntownMoatRing, S.GoldenSunset],
      ['玛黑区艺术巷', 'Le Marais Lanes', A.WindingCanalHarbor, S.SunnyHarbor],
      ['卢浮宫玻璃阶', 'Louvre Rivoli', A.DowntownMoatRing, S.GoldenSunset],
      ['蒙马特高地巷', 'Montmartre Hill', A.SerpentinePortMaze, S.GoldenSunset],
      ['香榭丽舍星环', 'Champs-Élysées', A.DowntownMoatRing, S.TwilightNeon],
      ['圣马丁古运河', 'Canal St-Martin', A.WindingCanalHarbor, S.SunnyHarbor],
      ['歌剧院金色穹', 'Opéra Garnier', A.SerpentinePortMaze, S.TwilightNeon],
      ['左岸拉丁书街', 'Latin Quarter', A.TwinRiverArchipelago, S.GoldenSunset],
      ['拉德芳斯新门', 'La Défense Neon', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'london',
    continent: 'europe',
    nameZh: '伦敦',
    nameEn: 'London',
    countryZh: '英国',
    countryEn: 'United Kingdom',
    taglineZh: '泰晤士雾霭与红色巴士',
    taglineEn: 'Thames Bridges & Classic Pubs',
    lat: 51.5074,
    lng: -0.1278,
    accentHex: '#dc2626',
    unlockStarsRequired: 4,
    streetsZh: ['牛津街', '摄政街', '贝克街', '舰队街', '科芬园广场', '阿比路', '泰晤士南岸路', '卡纳比街'],
    streetsEn: ['Oxford St', 'Regent St', 'Baker St', 'Fleet St', 'Covent Garden', 'Abbey Rd', 'South Bank', 'Carnaby St'],
    dishes: [
      dish('uk_fish', '金黄炸鱼薯条包', 'Classic Fish & Chips', '泰晤士老酒馆', 'Thames Tavern', '英伦经典', 'British Classic', '新鲜鳕鱼裹啤酒面糊炸至金黄酥脆，撒麦芽醋配厚切薯条与青豆泥。', 'Crispy beer-battered Atlantic cod with thick-cut chips, mushy peas, and malt vinegar.', '热食保温袋', 'Hot Thermal pack', '🍟', P.HotExpress),
      dish('uk_scone', '皇家下午茶司康盒', 'Afternoon Tea Scones', '梅菲尔茶室', 'Mayfair Tearoom', '下午茶点', 'High Tea', '现烤葡萄干司康配德文郡浓缩奶油与草莓果酱，英伦优雅时光。', 'Warm buttermilk scones served with rich Devonshire clotted cream and berry jam.', '易碎甜点层架', 'Fragile tier box', '🧁', P.Fragile),
      dish('uk_beef', '威灵顿酥皮牛排', 'Beef Wellington', '西区料理亭', 'West End Dining', '英式名菜', 'Signature Dish', '菲力牛排涂抹菌菇泥，外裹火腿与金黄酥皮烘烤，切开汁水丰盈。', 'Tender beef fillet wrapped in wild mushroom duxelles, prosciutto, and golden pastry.', '大件精品餐盒', 'Large feast box', '🥩', P.Large),
      dish('uk_tea', '伯爵佛手柑红茶罐', 'Earl Grey Reserve Tin', '皮卡迪利茶行', 'Piccadilly Tea', '英伦茶香', 'Heritage Tea', '锡兰红茶融入地中海佛手柑精油，香气清新典雅。', 'Bergamot-scented black tea leaves sealed in a gilded commemorative caddy.', '小件茶罐', 'Compact tea tin', '🫖', P.Small),
      dish('uk_vinyl', '阿比路经典黑胶盘', 'Abbey Rd Vinyl LP', '苏豪唱片行', 'Soho Record Shop', '摇滚传奇', 'Music Culture', '承载英伦摇滚黄金时代的经典专辑唱片，音质温暖醇厚。', 'Remastered 180g vinyl pressing straight from London historic studio district.', '易碎黑胶盘', 'Fragile vinyl', '💿', P.Fragile),
      dish('uk_watch', '大本钟黄铜怀表盒', 'Big Ben Brass Watch', '威斯敏斯特表行', 'Westminster Clocks', '精密计时', 'Horology', '刻有哥特式表盘纹样的精密黄铜机械怀表。', 'Mechanical brass pocket watch engraved with Palace of Westminster Gothic tracery.', '小件精密表盒', 'Compact watch box', '🕰️', P.Small),
    ],
    landmarks: [
      { loreId: 'lm_uk_bigben', kind: 'clock-tower', nameZh: '威斯敏斯特大本钟', nameEn: 'Elizabeth Tower (Big Ben)', eraZh: '哥特复兴 · 1859年', eraEn: 'Gothic Revival · 1859', factZh: '四面直径7米的乳白玻璃钟盘在泰晤士河畔矗立，13.5吨重的大钟敲响英伦经典旋律。', factEn: '96-meter Neo-Gothic clock tower chiming Westminster Quarters over the Thames.', icon: '🕰️' },
      { loreId: 'lm_uk_shard', kind: 'pearl-tower', nameZh: '泰晤士碎片大厦', nameEn: 'The Shard Spire', eraZh: '现代玻璃塔 · 2012年', eraEn: 'Modern Glass · 2012', factZh: '由一万一千片倾斜玻璃幕墙组成的水晶尖塔，是西欧最高的摩天建筑之一。', factEn: 'Crystalline glass pyramid spire rising 310 meters above London Bridge.', icon: '🏙️' },
    ],
    stages: buildStages([
      ['科芬园街头艺', 'Covent Garden', A.DowntownMoatRing, S.SunnyHarbor],
      ['苏豪霓虹小巷', 'Soho Neon Lanes', A.SerpentinePortMaze, S.TwilightNeon],
      ['威斯敏斯特桥', 'Westminster Bridge', A.TwinRiverArchipelago, S.GoldenSunset],
      ['诺丁山彩色屋', 'Notting Hill Pastel', A.WindingCanalHarbor, S.SunnyHarbor],
      ['博罗美食市集', 'Borough Market', A.DowntownMoatRing, S.GoldenSunset],
      ['卡姆登运河闸', 'Camden Canal Locks', A.WindingCanalHarbor, S.SunnyHarbor],
      ['南岸泰晤士廊', 'South Bank Walk', A.TwinRiverArchipelago, S.GoldenSunset],
      ['肖迪奇涂鸦街', 'Shoreditch Art', A.SerpentinePortMaze, S.TwilightNeon],
      ['金丝雀金融岛', 'Canary Wharf', A.TwinRiverArchipelago, S.TwilightNeon],
      ['格林威治码头', 'Greenwich Pier', A.WindingCanalHarbor, S.GoldenSunset],
    ]),
  },
  {
    id: 'rome',
    continent: 'europe',
    nameZh: '罗马',
    nameEn: 'Rome',
    countryZh: '意大利',
    countryEn: 'Italy',
    taglineZh: '永恒之城与意面浓香',
    taglineEn: 'Eternal Ruins & Gelato Scooters',
    lat: 41.9028,
    lng: 12.4964,
    accentHex: '#d97706',
    unlockStarsRequired: 6,
    streetsZh: ['科尔索大道', '帝国广场大道', '孔多蒂街', '特拉斯提弗列街', '威尼托大道', '纳沃纳广场路', '台伯河畔路', '许愿池小巷'],
    streetsEn: ['Via del Corso', 'Via dei Fori', 'Via Condotti', 'Trastevere Way', 'Via Veneto', 'Piazza Navona', 'Lungotevere', 'Via di Trevi'],
    dishes: [
      dish('it_pizza', '窑烤玛格丽特披萨', 'Wood-Fired Margherita', '老城石窑坊', 'Centro Wood Oven', '意大利国宝', 'Italian Classic', '水牛马苏里拉、圣马扎诺番茄与罗勒叶，在480度石窑中90秒烤成红白绿三色。', 'Blistered crust topped with San Marzano tomatoes, fior di latte mozzarella, and sweet basil.', '大件扁盒热送', 'Large hot pizza box', '🍕', P.Large),
      dish('it_pasta', '培根蛋酱意面', 'Roman Carbonara', '特拉斯小馆', 'Trastevere Trattoria', '罗马名面', 'Roman Classic', '严格采用佩科里诺羊奶酪、蛋黄与脆猪颊肉乳化，绝不加奶油的罗马正宗做法。', 'Al dente pasta emulsified in Pecorino Romano, egg yolk, black pepper, and crispy guanciale.', '热食保温', 'Hot Thermal', '🍝', P.HotExpress),
      dish('it_gelato', '开心果手工意式冰淇淋', 'Artisanal Pistachio Gelato', '纳沃纳冰室', 'Navona Gelateria', '意式甜品', 'Artisan Sweet', '西西里布朗特开心果研磨制成，空气含量低、口感如天鹅绒般绵密。', 'Velvety Sicilian Bronte pistachio gelato churned fresh every morning.', '易化快送', 'Quick compact cup', '🍨', P.Small),
      dish('it_tiramisu', '经典咖啡提拉米苏', 'Espresso Tiramisu Tray', '万神殿咖啡店', 'Pantheon Caffè', '罗马甜点', 'Cafe Dessert', '意式浓缩浸透手指饼干，层叠马斯卡彭芝士奶油，“带我走”的甜蜜浪漫。', 'Ladyfingers soaked in espresso layered under whipped mascarpone and dark cocoa.', '易碎托盘防晃', 'Fragile tray', '🍰', P.Fragile),
      dish('it_oil', '托斯卡纳特级橄榄油', 'Extra Virgin Olive Amphora', '台伯庄园铺', 'Tiber Estate', '地中海风味', 'Pantry Gold', '冷榨初熟绿橄榄装入陶瓶，带有新鲜青草与微辣果香。', 'Cold-pressed Tuscan olive oil sealed in a traditional terracotta amphora.', '易碎陶罐', 'Fragile terracotta', '🫒', P.Fragile),
      dish('it_cheese', '整块帕玛森陈年干酪', 'Parmigiano Cheese Wheel', '鲜食市集', 'Campo Market', '美食之王', 'Aged Cheese', '经过24个月以上自然陈化的意大利“奶酪之王”，结晶咸香浓郁。', '24-month aged Parmigiano Reggiano wedge packed straight from the market cellar.', '大件重箱', 'Large heavy wheel', '🧀', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_it_colosseum', kind: 'colosseum-ring', nameZh: '罗马大角斗场', nameEn: 'Roman Colosseum', eraZh: '古罗马帝国 · 公元80年', eraEn: 'Roman Empire · 80 AD', factZh: '世界上现存最大的古罗马圆形露天剧场，三层石拱券柱至今雄伟震撼。', factEn: 'Monumental elliptical stone amphitheater featuring tiered classical travertine arches.', icon: '🏟️' },
      { loreId: 'lm_it_arch', kind: 'grand-arch', nameZh: '君士坦丁凯旋门', nameEn: 'Arch of Constantine', eraZh: '公元315年石拱门', eraEn: 'Triumphal Arch · 315 AD', factZh: '保存最完好的古罗马三孔凯旋门，精美的浮雕见证千年地中海历史。', factEn: 'Three-bay marble triumphal arch standing beside the Colosseum piazza.', icon: '🏛️' },
    ],
    stages: buildStages([
      ['特拉斯提弗列', 'Trastevere Alley', A.WindingCanalHarbor, S.GoldenSunset],
      ['纳沃纳喷泉环', 'Piazza Navona', A.DowntownMoatRing, S.SunnyHarbor],
      ['许愿池巴洛克', 'Trevi Fountain', A.SerpentinePortMaze, S.TwilightNeon],
      ['万神殿古穹顶', 'Pantheon Quarter', A.DowntownMoatRing, S.SunnyHarbor],
      ['西班牙台阶街', 'Spanish Steps', A.WindingCanalHarbor, S.GoldenSunset],
      ['蒙蒂复古市集', 'Monti Vintage', A.SerpentinePortMaze, S.GoldenSunset],
      ['台伯河古石桥', 'Tiber Island Bridges', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['斗兽场帝国路', 'Colosseum Forum', A.DowntownMoatRing, S.TwilightNeon],
      ['圣彼得广场环', 'Borgo Vatican Way', A.DowntownMoatRing, S.GoldenSunset],
      ['特斯塔乔夜摊', 'Testaccio Night', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'barcelona',
    continent: 'europe',
    nameZh: '巴塞罗那',
    nameEn: 'Barcelona',
    countryZh: '西班牙',
    countryEn: 'Spain',
    taglineZh: '高迪马赛克与地中海阳光',
    taglineEn: 'Gaudí Mosaics & Sea Breeze',
    lat: 41.3851,
    lng: 2.1734,
    accentHex: '#f59e0b',
    unlockStarsRequired: 9,
    streetsZh: ['兰布拉大道', '格拉西亚大道', '哥特大教堂街', '巴塞罗那海滨路', '对角线大道', '波盖利亚市场巷', '圣家堂广场路', '奥林匹克港路'],
    streetsEn: ['La Rambla', 'Passeig de Gràcia', 'Carrer del Bisbe', 'Barceloneta Walk', 'Ave Diagonal', 'Boqueria Alley', 'Sagrada Pl.', 'Port Olímpic'],
    dishes: [
      dish('es_paella', '地中海海鲜铁锅饭', 'Seafood Paella Pan', '海滨渔人屋', 'Port Seafood Grill', '加泰名菜', 'Spanish Classic', '藏红花染成金黄的瓦伦西亚短粒米，铺满大虾、青口贝与鲜鱿鱼。', 'Saffron-infused bomba rice simmered in a shallow pan with king prawns and mussels.', '大件铁锅热送', 'Large hot pan', '🥘', P.Large),
      dish('es_churros', '吉事果配浓热巧克力', 'Churros & Chocolate', '哥特区老甜品店', 'Gothic Xurreria', '街角美味', 'Street Sweet', '星形挤花面条现炸至外脆里松，蘸上如布丁般浓稠的热黑巧克力。', 'Crisp ridged pastry sticks dusted in cinnamon sugar for dipping into thick hot chocolate.', '热食脆口快送', 'Hot Thermal', '🥨', P.HotExpress),
      dish('es_bravas', '香辣番茄脆炸薯角', 'Patatas Bravas', '波恩Tapas小馆', 'El Born Tapas', '国民小食', 'Tapas Favorite', '双色香蒜蛋黄酱与烟熏甜辣红椒酱淋在金黄土豆块上，夜宵绝配。', 'Crispy cubed potatoes drizzled with smoky paprika brava sauce and garlic aioli.', '小份热餐', 'Compact hot tapa', '🥔', P.Small),
      dish('es_mosaic', '高迪破碎瓷砖拼贴盒', 'Gaudí Mosaic Box', '奎尔艺术店', 'Park Güell Studio', '现代主义', 'Modernisme Art', '致敬“碎瓷片拼贴法”Trencadís的缤纷马赛克艺术摆件。', 'Colorful glazed ceramic shards arranged in Gaudí iconic curving trencadís style.', '易碎瓷片画框', 'Fragile mosaic', '🎨', P.Fragile),
      dish('es_cava', '加泰罗尼亚卡瓦起泡酒', 'Catalan Cava Brut', '格拉西亚酒庄', 'Gràcia Cellar', '庆典佳酿', 'Sparkling Wine', '采用传统香槟法瓶内二次发酵，气泡绵密带着青苹果与烤面包香。', 'Crisp traditional-method sparkling wine fermented in Penedès limestone cellars.', '易碎瓶装', 'Fragile bottle', '🍾', P.Fragile),
      dish('es_ham', '伊比利亚橡果火腿拼盘', 'Jamón Ibérico Platter', '波盖利亚市场', 'La Boqueria Deli', '西班牙瑰宝', 'Gourmet Deli', '橡果散养黑毛猪历经36个月风干，片如蝉翼的大理石雪花纹理鲜香迷人。', 'Hand-carved 36-month acorn-fed Iberian ham sliced paper-thin to melt on the tongue.', '大件礼盘', 'Large platter', '🥓', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_es_sagrada', kind: 'clock-tower', nameZh: '圣家族高迪尖塔', nameEn: 'Sagrada Spire', eraZh: '高迪杰作 · 1882年起建', eraEn: 'Gaudí Basilica · 1882', factZh: '自然主义曲线与高耸尖塔如森林枝干直冲云霄，已持续建造逾百四十年。', factEn: 'Organic soaring stone spires sculpted after tree canopies and sea shells.', icon: '⛪' },
      { loreId: 'lm_es_arena', kind: 'colosseum-ring', nameZh: '西班牙广场环形廊', nameEn: 'Plaça Espanya Arena', eraZh: '加泰圆形红砖地标', eraEn: 'Historic Rotunda', factZh: '宏伟的圆形红砖拱廊建筑俯瞰蒙特惠奇喷泉大道，视野极为壮观。', factEn: 'Grand circular brick arcade overlooking Montjuïc fountains and sunlit avenues.', icon: '🏟️' },
    ],
    stages: buildStages([
      ['哥特石拱迷宫', 'Gothic Quarter', A.DowntownMoatRing, S.SunnyHarbor],
      ['波恩复古小巷', 'El Born Alleys', A.WindingCanalHarbor, S.GoldenSunset],
      ['兰布拉鲜花道', 'La Rambla Walk', A.SerpentinePortMaze, S.SunnyHarbor],
      ['海滨渔人码头', 'Barceloneta Beach', A.TwinRiverArchipelago, S.GoldenSunset],
      ['扩展区八角格', 'Eixample Octagons', A.DowntownMoatRing, S.SunnyHarbor],
      ['格拉西亚村庄', 'Gràcia Village', A.WindingCanalHarbor, S.GoldenSunset],
      ['圣家堂朝阳街', 'Sagrada District', A.DowntownMoatRing, S.SunnyHarbor],
      ['波布雷诺海港', 'Poblenou Tech', A.SerpentinePortMaze, S.TwilightNeon],
      ['奥林匹克海湾', 'Port Olímpic', A.TwinRiverArchipelago, S.TwilightNeon],
      ['蒙特惠奇山环', 'Montjuïc Crest', A.SerpentinePortMaze, S.GoldenSunset],
    ]),
  },
  {
    id: 'amsterdam',
    continent: 'europe',
    nameZh: '阿姆斯特丹',
    nameEn: 'Amsterdam',
    countryZh: '荷兰',
    countryEn: 'Netherlands',
    taglineZh: '百桥运河与山墙风车',
    taglineEn: 'Canal Rings & Gabled Windmills',
    lat: 52.3676,
    lng: 4.9041,
    accentHex: '#fb923c',
    unlockStarsRequired: 10,
    streetsZh: ['王子运河街', '皇帝运河街', '绅士运河街', '水坝广场路', '九小街', '博物馆大道', '约旦区花街', '中央车站湾路'],
    streetsEn: ['Prinsengracht', 'Keizersgracht', 'Herengracht', 'Dam Square', 'De Negen Straatjes', 'Museumplein', 'Jordaan Canals', 'IJ Waterfront'],
    dishes: [
      dish('nl_waffle', '焦糖热压华夫饼罐', 'Warm Stroopwafel Tin', '约旦集市摊', 'Jordaan Market', '荷兰国民点心', 'Dutch Classic', '两片格纹薄脆饼夹入肉桂焦糖浆，趁热盖在热茶杯口烤软香气扑鼻。', 'Thin toasted waffle wafers sandwiched around warm cinnamon caramel syrup.', '热食香甜快送', 'Hot Thermal', '🧇', P.HotExpress),
      dish('nl_cheese', '黄金高达陈年奶酪', 'Dutch Gouda Wheel', '运河奶酪坊', 'Canal Cheese House', '乳品王国', 'Dairy Icon', '色泽金黄的蜡封圆形奶酪，奶香醇厚微带坚果焦糖脆粒。', 'Wax-sealed Dutch farmstead Gouda aged for nutty caramel richness.', '大件圆奶酪', 'Large cheese wheel', '🧀', P.Large),
      dish('nl_fish', '金黄香酥鳕鱼块', 'Crispy Kibbeling Cod', '北海鱼摊', 'North Sea Fish Cart', '海港小吃', 'Harbor Bite', '北海新鲜鳕鱼切块裹香料炸脆，配塔塔酱与柠檬角。', 'Golden-fried battered North Sea cod bites served with herbed garlic remoulade.', '小份热食', 'Small hot snack', '🐟', P.Small),
      dish('nl_delft', '代尔夫特蓝白瓷瓶', 'Delft Blue Vase', '博物馆艺术坊', 'Museum Craft Shop', '荷兰国宝', 'Ceramics', '受中国青花瓷启发发展出的荷兰传统蓝白手绘釉下彩陶器。', 'Hand-painted cobalt-on-white tin-glazed earthenware inspired by Golden Age trade.', '极度易碎瓷器', 'Fragile porcelain', '🏺', P.Fragile),
      dish('nl_tulip', '库肯霍夫郁金香花箱', 'Tulip Bulb Gift Box', '辛格水上花市', 'Floating Flower Market', '郁金香之国', 'Floral Heritage', '水上花市精选的多彩郁金香切花与球根礼箱。', 'Vibrant spring tulips bundled fresh from the historic Singel floating flower market.', '易碎鲜花礼盒', 'Fragile blooms', '🌷', P.Fragile),
      dish('nl_pancake', '黄油糖粉松饼盘', 'Poffertjes Pancakes', '风车小木屋', 'Windmill Bakery', '节庆甜点', 'Festival Treat', '用铸铁凹盘烤出的迷你蓬松小圆松饼，浇融化黄油与白糖粉。', 'Fluffy bite-sized buckwheat pancakes dusted in powdered sugar and melted butter.', '热餐急送', 'Hot Thermal', '🥞', P.HotExpress),
    ],
    landmarks: [
      { loreId: 'lm_nl_mill', kind: 'windmill-gable', nameZh: '阿姆斯特尔古风车', nameEn: 'De Gooyer Windmill', eraZh: '荷兰黄金时代风车', eraEn: 'Historic Smock Mill', factZh: '木质八角塔身搭配旋转风帆，曾是荷兰排涝磨坊与城市天际线的标志。', factEn: 'Traditional octagonal wooden smock windmill turning tall canvas sails over the canal.', icon: '🌾' },
      { loreId: 'lm_nl_clock', kind: 'clock-tower', nameZh: '西教堂皇冠钟楼', nameEn: 'Westerkerk Crown Spire', eraZh: '文艺复兴 · 1631年', eraEn: 'Dutch Renaissance · 1631', factZh: '阿姆斯特丹最高的教堂钟楼，塔尖佩戴着象征城市荣耀的蓝色皇冠。', factEn: 'Amsterdam tallest church tower crowned by the colorful imperial crest above Prinsengracht.', icon: '🕰️' },
    ],
    stages: buildStages([
      ['约旦运河桥区', 'Jordaan Canals', A.WindingCanalHarbor, S.SunnyHarbor],
      ['九小街精品桥', 'Nine Streets', A.WindingCanalHarbor, S.GoldenSunset],
      ['辛格水上花市', 'Singel Flower Quay', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['水坝广场石路', 'Dam Square', A.DowntownMoatRing, S.GoldenSunset],
      ['博物馆绿地环', 'Museumplein', A.DowntownMoatRing, S.SunnyHarbor],
      ['德派普早市街', 'De Pijp Market', A.SerpentinePortMaze, S.GoldenSunset],
      ['东方船坞岛群', 'Eastern Docklands', A.TwinRiverArchipelago, S.TwilightNeon],
      ['北部旧船厂湾', 'NDSM Wharf', A.SerpentinePortMaze, S.TwilightNeon],
      ['阿姆斯特尔弯', 'Amstel River Bend', A.WindingCanalHarbor, S.GoldenSunset],
      ['南轴科技新区', 'Zuidas Neon Grid', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'newyork',
    continent: 'north_america',
    nameZh: '纽约',
    nameEn: 'New York',
    countryZh: '美国',
    countryEn: 'USA',
    taglineZh: '曼哈顿霓虹与不夜街头',
    taglineEn: 'Manhattan Grids & Broadway Lights',
    lat: 40.7128,
    lng: -74.006,
    accentHex: '#3b82f6',
    unlockStarsRequired: 2,
    streetsZh: ['第五大道', '百老汇大道', '华尔街', '时代广场42街', '麦迪逊大道', '布利克街', '苏豪王子街', '布鲁克林大桥路'],
    streetsEn: ['5th Avenue', 'Broadway', 'Wall Street', 'Times Sq 42nd St', 'Madison Ave', 'Bleecker St', 'Prince St SoHo', 'DUMBO Bridge'],
    dishes: [
      dish('ny_pizza', '纽约意式辣肠大披萨', 'NY Pepperoni Slice Box', '布利克老披萨', 'Bleecker St Pizza', '纽约灵魂', 'NYC Icon', '薄脆韧性十足的手抛大饼，涂满罗勒番茄酱、浓郁芝士与卷边脆肠片。', 'Wide foldable hand-tossed thin crust blistering with cheese and curled spicy pepperoni.', '大件热披萨盒', 'Large hot box', '🍕', P.Large),
      dish('ny_bagel', '烟熏三文鱼贝果', 'Smoked Salmon Bagel', '下东区熟食铺', 'Lower East Deli', '早午餐经典', 'Brunch Classic', '纽约软水煮后烘烤的劲道贝果，厚涂奶油奶酪配大西洋熏三文鱼与酸豆。', 'Kettle-boiled poppy bagel loaded with cream cheese, silky lox, capers, and red onion.', '小件美味包', 'Compact order', '🥯', P.Small),
      dish('ny_cheesecake', '曼哈顿重芝士蛋糕', 'NY Cheesecake Box', '百老汇甜品屋', 'Broadway Bakery', '甜点传奇', 'Dessert Legend', '全脂奶油奶酪与酸奶油烤出厚实绵密的纯正乳酪滋味。', 'Dense, velvety cream-cheese cake baked over a crisp graham cracker crust.', '易碎蛋糕盒', 'Fragile pastry box', '🍰', P.Fragile),
      dish('ny_pastrami', '卡茨秘制熏牛肉三明治', 'Pastrami on Rye Deli', '休斯顿街老店', 'Houston St Deli', '百年老店', 'Deli Heritage', '烟熏黑胡椒牛胸肉堆叠如小山，夹入黑麦面包涂上黄芥末。', 'Towering hand-carved peppered beef pastrami piled between seeded rye bread.', '热食保温', 'Hot Thermal', '🥪', P.HotExpress),
      dish('ny_jazz', '格林威治爵士黑胶箱', 'Village Jazz Crate', '蓝调唱片店', 'Blue Note Shop', '文化传奇', 'Music Heritage', '记录格林威治村地下爵士俱乐部黄金夜晚的限量唱片礼盒。', 'Collector vinyl anthology from legendary Greenwich Village basement jazz clubs.', '大件易损箱', 'Large crate', '🎷', P.Large),
      dish('ny_coffee', '布鲁克林精品冷萃杯', 'Brooklyn Cold Brew', '丹波烘焙工坊', 'DUMBO Roasters', '潮流咖啡', 'Coffee Culture', '18小时冰滴慢萃呈现黑巧克力与焦糖坚果余韵。', '18-hour slow-steeped craft cold brew with dark cocoa notes.', '杯装防震', 'Fragile cup', '☕', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_ny_liberty', kind: 'liberty-spire', nameZh: '自由女神火炬像', nameEn: 'Statue of Liberty Spire', eraZh: '纽约港门户 · 1886年', eraEn: 'Harbor Icon · 1886', factZh: '铜绿色的自由火炬迎着大西洋海风高举，百余年来守望哈德逊河口来往船只。', factEn: 'Patina-green copper monument holding a gilded torch high over New York Harbor.', icon: '🗽' },
      { loreId: 'lm_ny_empire', kind: 'pearl-tower', nameZh: '帝国大厦观景塔', nameEn: 'Empire State Spire', eraZh: '装饰艺术 · 1931年', eraEn: 'Art Deco · 1931', factZh: '410天建成102层的传奇摩天大楼，塔尖灯光会随节庆变换璀璨色彩。', factEn: '102-story Art Deco limestone skyscraper crowned by an illuminated broadcast spire.', icon: '🏙️' },
    ],
    stages: buildStages([
      ['格林威治爵士', 'Greenwich Village', A.DowntownMoatRing, S.GoldenSunset],
      ['苏豪铸铁老街', 'SoHo Cast Iron', A.SerpentinePortMaze, S.SunnyHarbor],
      ['曼哈顿中国城', 'Chinatown Lanes', A.WindingCanalHarbor, S.TwilightNeon],
      ['小意大利节街', 'Little Italy', A.DowntownMoatRing, S.GoldenSunset],
      ['切尔西高线园', 'Chelsea High Line', A.SerpentinePortMaze, S.SunnyHarbor],
      ['时代广场霓虹', 'Times Square', A.SerpentinePortMaze, S.TwilightNeon],
      ['上东区博物馆', 'Upper East Side', A.DowntownMoatRing, S.SunnyHarbor],
      ['威廉斯堡东河', 'Williamsburg', A.TwinRiverArchipelago, S.GoldenSunset],
      ['布鲁克林大桥', 'Brooklyn DUMBO', A.TwinRiverArchipelago, S.TwilightNeon],
      ['华尔街金融湾', 'Wall St Harbor', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'sanfrancisco',
    continent: 'north_america',
    nameZh: '旧金山',
    nameEn: 'San Francisco',
    countryZh: '美国',
    countryEn: 'USA',
    taglineZh: '金门海雾与叮当电车',
    taglineEn: 'Golden Fog & Cable Car Hills',
    lat: 37.7749,
    lng: -122.4194,
    accentHex: '#0284c7',
    unlockStarsRequired: 8,
    streetsZh: ['伦巴底九曲花街', '市场街', '渔人码头39街', '都板街中国城', '哥伦布大道', '海特阿什伯里', '海滨大道', '教会区瓦伦西亚街'],
    streetsEn: ['Lombard St', 'Market St', 'Pier 39 Wharf', 'Grant Ave', 'Columbus Ave', 'Haight St', 'Embarcadero', 'Valencia St'],
    dishes: [
      dish('sf_chowder', '酸面包碗蛤蜊浓汤', 'Sourdough Clam Chowder', '渔人码头老铺', 'Wharf Bread Bowl', '海湾必吃', 'Bay Icon', '旧金山天然酵母酸面包掏空盛入滚烫奶油蛤蜊汤，鲜咸浓稠。', 'Creamy New England clam chowder ladled inside a freshly baked tangy sourdough bowl.', '热汤急送', 'Hot Thermal', '🥣', P.HotExpress),
      dish('sf_burrito', '教会区超级卷饼', 'Mission Super Burrito', '瓦伦西亚玉米饼', 'Valencia Taqueria', '加州风味', 'Local Legend', '温热面饼紧实包裹烤肉、牛油果酱、黑豆与莎莎辣酱，分量十足。', 'Foil-wrapped flour tortilla packed with carne asada, rice, beans, and fresh guacamole.', '小份热餐', 'Compact hot wrap', '🌯', P.Small),
      dish('sf_crab', '珍宝蟹海鲜礼筐', 'Dungeness Crab Crate', '海湾渔市', 'Bay Fishery', '太平洋鲜味', 'Harbor Feast', '肉质清甜饱满的太平洋珍宝蟹，配大蒜黄油与柠檬块。', 'Sweet Pacific Dungeness crab cracked fresh on ice with roasted garlic butter.', '大件冰鲜箱', 'Large seafood crate', '🦀', P.Large),
      dish('sf_choc', '吉拉德利广场巧克力', 'Ghirardelli Chocolate Tin', '海港可可坊', 'Square Chocolatier', '百年甜品', 'Sweet Heritage', '焦糖海盐黑巧礼盒，旧金山1852年传承至今的甜蜜名片。', 'Silky sea-salt caramel dark chocolate squares crafted at historic Aquatic Park.', '易化脆盒', 'Fragile sweets', '🍫', P.Fragile),
      dish('sf_wine', '纳帕谷黑皮诺干红', 'Napa Pinot Noir', '海湾酒廊', 'Bay Wine Bar', '加州名酿', 'Wine Country', '产自旧金山湾北侧雾气缭绕的纳帕河谷，果香优雅平衡。', 'Velvety coastal-fog Pinot Noir harvested from nearby Napa Valley hillsides.', '易碎酒瓶', 'Fragile bottle', '🍷', P.Fragile),
      dish('sf_cable', '手工木制叮当车模', 'Cable Car Model', '鲍威尔电车坊', 'Powell Turnaround', '城市标志', 'Iconic Craft', '微缩还原仍在手动转向盘调头的百年旧金山缆车。', 'Hand-painted wooden replica of San Francisco classic Powell-Mason street cable car.', '大件礼盒', 'Large keepsake', '🚋', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_sf_pyramid', kind: 'liberty-spire', nameZh: '泛美金字塔尖厦', nameEn: 'Transamerica Spire', eraZh: '未来主义 · 1972年', eraEn: 'Futurist · 1972', factZh: '48层白色石英斜坡尖塔刺破海雾，两侧长有标志性的“电梯翼楼”。', factEn: '48-story tapered white quartz pyramid piercing San Francisco famous ocean fog.', icon: '🗼' },
      { loreId: 'lm_sf_sutro', kind: 'radio-mast', nameZh: '苏特罗三叉电波塔', nameEn: 'Sutro Signal Tower', eraZh: '城市天际线 · 1973年', eraEn: 'City Crest · 1973', factZh: '伫立于双子峰旁的红白巨塔常年在海雾上方露面，宛如漂浮天空船桅。', factEn: 'Three-legged hilltop steel mast rising proudly above the rolling Golden Gate fog.', icon: '📡' },
    ],
    stages: buildStages([
      ['唐人街红灯坡', 'Chinatown Grant', A.DowntownMoatRing, S.GoldenSunset],
      ['北滩意式咖啡', 'North Beach', A.WindingCanalHarbor, S.SunnyHarbor],
      ['渔人码头海狮', 'Fisherman Wharf', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['教会区壁画巷', 'Mission Murals', A.SerpentinePortMaze, S.GoldenSunset],
      ['海特嬉皮彩屋', 'Haight-Ashbury', A.WindingCanalHarbor, S.SunnyHarbor],
      ['九曲花街陡坡', 'Lombard Curves', A.SerpentinePortMaze, S.GoldenSunset],
      ['渡轮大厦港岸', 'Embarcadero Pier', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['南市场科技谷', 'SoMa Tech Hub', A.DowntownMoatRing, S.TwilightNeon],
      ['玛丽娜帆船湾', 'Marina Presidio', A.WindingCanalHarbor, S.GoldenSunset],
      ['金融区金字塔', 'Financial Spire', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'mexico_city',
    continent: 'north_america',
    nameZh: '墨西哥城',
    nameEn: 'Mexico City',
    countryZh: '墨西哥',
    countryEn: 'Mexico',
    taglineZh: '阿兹特克古城与色彩街区',
    taglineEn: 'Aztec Heritage & Vibrant Plazas',
    lat: 19.4326,
    lng: -99.1332,
    accentHex: '#e11d48',
    unlockStarsRequired: 10,
    streetsZh: ['改革大道', '马德罗步行街', '罗马阿姆斯特丹路', '科约阿坎林荫路', '波兰科马萨里克', '宪法广场路', '霍奇米尔科水街', '索纳罗萨街'],
    streetsEn: ['Paseo Reforma', 'Calle Madero', 'Calle Amsterdam', 'Coyoacán Way', 'Ave Masaryk', 'Zócalo Plaza', 'Xochimilco Way', 'Zona Rosa'],
    dishes: [
      dish('mx_tacos', '炙烤菠萝牧羊人塔可', 'Tacos al Pastor Box', '罗马夜摊', 'Roma Taco Stand', '国民小吃', 'Street Icon', '竖直烤肉架炙烤的腌猪肉配清甜凤梨、香菜洋葱，夹入热玉米饼。', 'Spit-roasted achiote pork shaved thin onto warm corn tortillas with sweet pineapple.', '热食急送', 'Hot Thermal', '🌮', P.HotExpress),
      dish('mx_pozole', '传统玉米肉汤煲', 'Warm Pozole Rojo Bowl', '科约阿坎老灶', 'Coyoacán Kitchen', '古文明名汤', 'Heritage Soup', '饱含古代祭典文化的大粒白玉米与红辣椒慢炖浓汤，配脆萝卜片。', 'Hearty hominy corn stew simmered in mild roasted guajillo chilies with crisp radishes.', '热汤保温', 'Hot Thermal', '🍲', P.HotExpress),
      dish('mx_tamales', '芭蕉叶蒸玉米粽', 'Steamed Tamales', '市场早餐摊', 'Merced Market', '传统点心', 'Street Breakfast', '用玉米壳或芭蕉叶包裹调味玉米面团与辣酱鸡肉蒸熟，软糯飘香。', 'Savory masa dough filled with spiced salsa verde wrapped and steamed in corn husks.', '小份美味', 'Compact bundle', '🫔', P.Small),
      dish('mx_pottery', '塔拉维拉蓝彩陶器', 'Talavera Painted Pottery', '圣安赫尔工艺', 'San Ángel Crafts', '非遗彩陶', 'Artisan Pottery', '十六世纪传承的手工锡釉彩绘陶器，蓝黄花纹明艳夺目。', 'Hand-thrown tin-glazed ceramic platter painted in vivid cobalt and marigold motifs.', '极度易碎陶器', 'Fragile pottery', '🏺', P.Fragile),
      dish('mx_print', '蓝屋艺术版画卷', 'Casa Azul Art Folio', '科约阿坎画廊', 'Coyoacán Gallery', '拉美艺术', 'Fine Art', '致敬墨西哥壁画与超现实主义色彩美学的限量收藏版画集。', 'Vibrant archival print portfolio celebrating Mexican muralism and folk color.', '大件画框箱', 'Large art crate', '🖼️', P.Large),
      dish('mx_coffee', '恰帕斯高地精品咖啡', 'Chiapas Coffee Beans', '康德萨烘豆馆', 'Condesa Roastery', '拉美产区', 'Coffee Craft', '产自南部云雾山脉的高海拔单品豆，带着黑巧与柑橘酸甜。', 'High-altitude organic Arabica roasted fresh in Condesa tree-lined cafes.', '防潮易碎罐', 'Fragile jar', '☕', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_mx_pyramid', kind: 'pyramid', nameZh: '大神庙阶梯金字塔', nameEn: 'Templo Mayor Pyramid', eraZh: '阿兹特克文明 · 14世纪', eraEn: 'Aztec Capital · 1325', factZh: '层层叠起的中美洲阶梯石塔，矗立于宪法广场心脏地带，述说特诺奇蒂特兰传奇。', factEn: 'Stepped stone temple pyramid anchoring the ancient heart of Tenochtitlan.', icon: '🛕' },
      { loreId: 'lm_mx_angel', kind: 'liberty-spire', nameZh: '独立天使金色纪念柱', nameEn: 'El Ángel Column', eraZh: '改革大道 · 1910年', eraEn: 'Reforma · 1910', factZh: '45米高大理石圆柱顶端矗立着金箔翅膀的胜利女神，是全城最著名的庆典地标。', factEn: 'Gilded winged Victory statue atop a 45m marble column along Paseo de la Reforma.', icon: '🗽' },
    ],
    stages: buildStages([
      ['科约阿坎彩墙', 'Coyoacán Plazas', A.DowntownMoatRing, S.SunnyHarbor],
      ['罗马区绿荫环', 'Roma Norte Trees', A.WindingCanalHarbor, S.SunnyHarbor],
      ['康德萨椭圆路', 'Condesa Ellipse', A.DowntownMoatRing, S.GoldenSunset],
      ['宪法历史中心', 'Centro Zócalo', A.SerpentinePortMaze, S.GoldenSunset],
      ['霍奇米尔科船', 'Xochimilco Canals', A.WindingCanalHarbor, S.SunnyHarbor],
      ['波兰科艺廊街', 'Polanco Galleries', A.DowntownMoatRing, S.TwilightNeon],
      ['索纳罗萨霓虹', 'Zona Rosa Neon', A.SerpentinePortMaze, S.TwilightNeon],
      ['查普尔特佩克', 'Chapultepec Park', A.WindingCanalHarbor, S.GoldenSunset],
      ['华雷斯改革道', 'Juárez Reforma', A.TwinRiverArchipelago, S.TwilightNeon],
      ['圣菲现代天际', 'Santa Fe Skyway', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'rio',
    continent: 'south_america',
    nameZh: '里约热内卢',
    nameEn: 'Rio de Janeiro',
    countryZh: '巴西',
    countryEn: 'Brazil',
    taglineZh: '狂欢桑巴与海湾拱桥',
    taglineEn: 'Carnival Arches & Golden Beaches',
    lat: -22.9068,
    lng: -43.1729,
    accentHex: '#22c55e',
    unlockStarsRequired: 5,
    streetsZh: ['科帕卡巴纳海滨路', '伊帕内玛海滩道', '拉帕拱桥街', '圣特蕾莎坡路', '里约布兰科大道', '博塔弗戈湾路', '弗拉门戈公园路', '拉戈阿环湖路'],
    streetsEn: ['Av. Atlântica', 'Ipanema Beach', 'Arcos da Lapa', 'Santa Teresa', 'Av. Rio Branco', 'Botafogo Bay', 'Flamengo Park', 'Lagoa Loop'],
    dishes: [
      dish('br_feijoada', '巴西黑豆炖肉砂锅', 'Feijoada Black Bean Pot', '拉帕老餐馆', 'Lapa Kitchen', '巴西国菜', 'National Dish', '黑豆、熏香肠与猪肋排小火慢炖，搭配橙片、烤木薯粉与米饭，浓郁醇香。', 'Slow-simmered black bean and smoked pork stew served with toasted cassava and fresh orange.', '热锅保温急送', 'Hot Thermal', '🍲', P.HotExpress),
      dish('br_cheese', '现烤木薯奶酪球', 'Pão de Queijo Bread', '圣特蕾莎咖啡', 'Santa Teresa Cafe', '巴西国民点心', 'Classic Snack', '木薯淀粉与米纳斯奶酪烤出外脆内Q弹软糯的小圆球。', 'Golden gluten-free cheese puffs baked crisp outside with chewy melted Minas cheese inside.', '小份热食', 'Compact warm treat', '🥐', P.Small),
      dish('br_acai', '亚马逊巴西莓冰沙碗', 'Açaí Berry Cold Bowl', '伊帕内玛果汁摊', 'Ipanema Juice Bar', '海滩能量', 'Beach Fuel', '浓郁紫红色巴西莓果泥铺满新鲜香蕉切片、燕麦脆片与蜂蜜。', 'Chilled Amazonian purple açaí sorbet crowned with granola, banana, and wildflower honey.', '低温速达', 'Fast delivery', '🥣', P.Small),
      dish('br_picanha', '炭火巴西烤肉牛排盒', 'Grilled Picanha Skewers', '博塔弗戈烤肉屋', 'Botafogo Churrasco', '烤肉传奇', 'Churrascaria', '仅用海盐调味的三角牛臀肉在炭火上滋滋冒油，锁住原始肉香。', 'Coarse sea-salted prime top sirloin cap fire-roasted over glowing hardwood embers.', '大件热餐箱', 'Large hot crate', '🥩', P.Large),
      dish('br_mask', '狂欢节羽毛艺术面具', 'Carnival Feather Mask', '桑巴工坊', 'Samba Workshop', '节庆瑰宝', 'Festival Art', '镶嵌璀璨亮片与彩色羽毛的手工嘉年华面具，充满南美热情。', 'Hand-beaded carnival headpiece crowned with brilliant emerald and gold plumes.', '易碎羽毛饰品', 'Fragile art', '🎭', P.Fragile),
      dish('br_coffee', '桑托斯波旁精品豆', 'Santos Arabica Crate', '中心咖啡所', 'Centro Roasters', '咖啡王国', 'Coffee Empire', '巴西作为全球最大咖啡产地精选的坚果巧克力风味日晒阿拉比卡。', 'Sun-dried Brazilian Bourbon beans carrying smooth roasted hazelnut sweetness.', '大件豆箱', 'Large crate', '☕', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_br_lapa', kind: 'grand-arch', nameZh: '拉帕白色双层石拱', nameEn: 'Lapa Aqueduct Arches', eraZh: '殖民时期引水渠 · 1750年', eraEn: 'Historic Aqueduct · 1750', factZh: '42座罗马式白色高架拱券连绵跨越山谷，如今黄色复古有轨电车从桥顶驶过。', factEn: '42 gleaming white stone arches now carrying nostalgic yellow trams above bustling Lapa.', icon: '🌉' },
      { loreId: 'lm_br_christ', kind: 'liberty-spire', nameZh: '科科瓦多山巅瞻礼塔', nameEn: 'Corcovado Summit Spire', eraZh: '世界新七大奇迹', eraEn: 'Summit Monument', factZh: '矗立在710米科科瓦多花岗岩山巅，张开双臂拥抱瓜纳巴拉湾与全城海滩。', factEn: 'Towering hilltop summit monument overlooking Guanabara Bay and Sugarloaf peaks.', icon: '⛰️' },
    ],
    stages: buildStages([
      ['圣特蕾莎黄车', 'Santa Teresa Trams', A.SerpentinePortMaze, S.SunnyHarbor],
      ['拉帕双层拱门', 'Lapa Arches', A.DowntownMoatRing, S.TwilightNeon],
      ['科帕卡巴纳波', 'Copacabana Wave', A.WindingCanalHarbor, S.SunnyHarbor],
      ['伊帕内玛夕阳', 'Ipanema Sunset', A.WindingCanalHarbor, S.GoldenSunset],
      ['博塔弗戈帆湾', 'Botafogo Bay', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['弗拉门戈棕榈', 'Flamengo Palms', A.DowntownMoatRing, S.GoldenSunset],
      ['市中心桑巴大道', 'Centro Sambadrome', A.SerpentinePortMaze, S.TwilightNeon],
      ['拉戈阿翡翠湖', 'Lagoa Lagoon', A.WindingCanalHarbor, S.GoldenSunset],
      ['巴拉海滨长廊', 'Barra Waterfront', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['明日港湾夜港', 'Porto Maravilha', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'buenos_aires',
    continent: 'south_america',
    nameZh: '布宜诺斯艾利斯',
    nameEn: 'Buenos Aires',
    countryZh: '阿根廷',
    countryEn: 'Argentina',
    taglineZh: '探戈广场与彩色博卡区',
    taglineEn: 'Tango Plazas & La Boca Colors',
    lat: -34.6037,
    lng: -58.3816,
    accentHex: '#38bdf8',
    unlockStarsRequired: 10,
    streetsZh: ['七月九日大道', '卡米尼托彩屋街', '佛罗里达步行街', '圣特尔莫防务街', '巴勒莫塞拉诺街', '玛德罗港步道', '五月大道', '科连特斯剧院街'],
    streetsEn: ['Av. 9 de Julio', 'El Caminito', 'Calle Florida', 'Defensa St', 'Plaza Serrano', 'Puerto Madero', 'Av. de Mayo', 'Av. Corrientes'],
    dishes: [
      dish('ar_empanada', '手工捏边牛肉馅饼盒', 'Beef Empanadas Box', '圣特尔莫烤饼屋', 'San Telmo Oven', '南美名点', 'Argentine Classic', '金黄酥皮捏出十八道花边，包入孜然鲜牛肉丁、橄榄与水煮蛋。', 'Hand-crimped pastry pockets stuffed with spiced beef, green olives, and sweet onions.', '热食脆皮快送', 'Hot Thermal', '🥟', P.HotExpress),
      dish('ar_alfajor', '焦糖牛奶夹心饼干', 'Dulce de Leche Alfajores', '五月大道甜品', 'Avenida Pastry', '国民甜点', 'Sweet Icon', '两片入口即化的黄油饼干夹入浓稠阿根廷焦糖牛奶酱并裹上黑巧。', 'Tender shortbread rounds sandwiched with thick caramel dulce de leche and dark chocolate.', '小件礼盒', 'Compact gift box', '🍪', P.Small),
      dish('ar_chori', '碳烤香肠配青酱堡', 'Choripán Chimichurri', '巴勒莫街头摊', 'Palermo Grill', '街头绝配', 'Street Favorite', '木炭烤猪牛肉香肠对半剖开夹入脆法棍，淋满欧芹大蒜青酱。', 'Wood-grilled pork sausage tucked into crusty bread with zesty parsley-garlic chimichurri.', '热食快送', 'Hot Thermal', '🌭', P.HotExpress),
      dish('ar_mate', '银饰雕刻马黛茶葫芦', 'Yerba Mate Gourd Set', '复古市集摊', 'Dorrego Market', '阿根廷灵魂', 'Cultural Icon', '附带镂空银吸管 bombilla 的传统雕刻葫芦茶具，共享友谊的象征。', 'Hand-carved calabash gourd and silver bombilla straw for sharing warm yerba mate.', '易碎银饰礼盒', 'Fragile keepsake', '🧉', P.Fragile),
      dish('ar_wine', '门多萨马尔贝克佳酿', 'Mendoza Malbec Crate', '马德罗酒馆', 'Madero Cellar', '安第斯佳酿', 'Andes Vintage', '安第斯山麓高海拔阳光孕育出深紫红李子与紫罗兰芬芳的顶级红酒。', 'Full-bodied high-altitude Mendoza Malbec rich with dark plum and cocoa oak.', '大件木箱', 'Large wine crate', '🍷', P.Large),
      dish('ar_tango', '班多钮手风琴探戈乐谱', 'Tango Bandoneon Crate', '博卡艺术坊', 'La Boca Atelier', '探戈文化', 'Music Heritage', '记录布宜诺斯艾利斯百年探戈舞魂的精美精装乐谱与黑胶套装。', 'Collector tango sheet music folio and vinyl from colorful La Boca.', '大件收藏箱', 'Large box', '🪗', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_ar_obelisk', kind: 'liberty-spire', nameZh: '七月九日白色方尖碑', nameEn: 'Buenos Aires Obelisk', eraZh: '共和广场 · 1936年', eraEn: 'Republic Plaza · 1936', factZh: '矗立在世界最宽阔大道交汇处的67.5米白色方尖碑，城市庆典与足球欢呼中心。', factEn: '67.5-meter limestone obelisk standing proudly at the heart of Avenida 9 de Julio.', icon: '🗼' },
      { loreId: 'lm_ar_tower', kind: 'clock-tower', nameZh: '雷科莱塔红砖钟塔', nameEn: 'Torre Monumental', eraZh: '爱德华风格 · 1916年', eraEn: 'Monumental Tower · 1916', factZh: '红砖与白色石雕交错的精巧钟楼，每逢整点敲响如威斯敏斯特般的悠扬钟声。', factEn: 'Red-brick and white-stone clock tower chiming across lush Retiro plazas.', icon: '🕰️' },
    ],
    stages: buildStages([
      ['博卡彩色铁皮屋', 'La Boca Colors', A.WindingCanalHarbor, S.SunnyHarbor],
      ['圣特尔莫古董街', 'San Telmo Market', A.DowntownMoatRing, S.GoldenSunset],
      ['巴勒莫潮店广场', 'Palermo Soho', A.SerpentinePortMaze, S.GoldenSunset],
      ['玛德罗红砖港口', 'Puerto Madero', A.TwinRiverArchipelago, S.TwilightNeon],
      ['七月九日广场环', '9 de Julio Ring', A.DowntownMoatRing, S.TwilightNeon],
      ['雷科莱塔林荫园', 'Recoleta Gardens', A.WindingCanalHarbor, S.SunnyHarbor],
      ['科连特斯剧院街', 'Corrientes Lights', A.SerpentinePortMaze, S.TwilightNeon],
      ['贝尔格拉诺花径', 'Belgrano Lanes', A.DowntownMoatRing, S.SunnyHarbor],
      ['新港运河游艇桥', 'Madero Bridges', A.TwinRiverArchipelago, S.GoldenSunset],
      ['努涅斯体育湾', 'Nuñez Waterfront', A.SerpentinePortMaze, S.GoldenSunset],
    ]),
  },
  {
    id: 'sydney',
    continent: 'oceania',
    nameZh: '悉尼',
    nameEn: 'Sydney',
    countryZh: '澳大利亚',
    countryEn: 'Australia',
    taglineZh: '白帆海港与邦迪浪花',
    taglineEn: 'Opera Sails & Pacific Surf',
    lat: -33.8688,
    lng: 151.2093,
    accentHex: '#06b6d4',
    unlockStarsRequired: 6,
    streetsZh: ['乔治街', '环形码头大道', '岩石区鹅卵石街', '牛津街', '邦迪坎贝尔大道', '达令港海滨路', '萨里山皇冠街', '曼利海滨步道'],
    streetsEn: ['George St', 'Circular Quay', 'The Rocks Way', 'Oxford St', 'Campbell Pde Bondi', 'Darling Harbour', 'Crown St Surry', 'Manly Corso'],
    dishes: [
      dish('au_oyster', '悉尼岩蚝冰鲜礼盒', 'Sydney Rock Oysters', '渔市场鲜摊', 'Fish Market Quay', '南半球珍馐', 'Harbor Delicacy', '海水清甜鲜脆、回味带着矿物质青瓜清香的澳洲原生岩蚝。', 'Briny mineral-sweet native rock oysters shucked to order with lemon cheeks.', '易碎冰鲜盒', 'Fragile chilled tray', '🦪', P.Fragile),
      dish('au_flatwhite', '萨里山澳白精品咖啡', 'Surry Hills Flat White', '皇冠街烘豆房', 'Crown St Roaster', '澳式咖啡魂', 'Coffee Culture', '澳大利亚发明的标志性咖啡：双份浓缩融入极细微奶泡，丝滑浓郁。', 'Velvety micro-foam poured smoothly over double ristretto espresso.', '小杯防洒', 'Compact coffee', '☕', P.Small),
      dish('au_pavlova', '帕夫洛娃鲜果蛋白塔', 'Pavlova Berry Tart', '帕丁顿饼屋', 'Paddington Bakery', '大洋洲国甜', 'Aussie Dessert', '外脆内如棉花糖般柔嫩的蛋白霜蛋糕，铺满百香果、猕猴桃与草莓。', 'Crisp meringue cloud filled with whipped cream, passionfruit pulp, and fresh berries.', '极易碎蛋糕', 'Fragile meringue', '🍰', P.Fragile),
      dish('au_fish', '香酥澳洲肺鱼配薯条', 'Crispy Barramundi', '达令港海鲜吧', 'Darling Grill', '海港美食', 'Coastal Bite', '澳洲本土海鲜明星肺鱼现炸至金黄酥脆，配青柠蛋黄酱。', 'Flaky wild-caught barramundi fillet fried golden beside sea-salted chips.', '热食急送', 'Hot Thermal', '🐟', P.HotExpress),
      dish('au_shiraz', '猎人谷设拉子红酒箱', 'Hunter Valley Shiraz', '岩石区酒廊', 'The Rocks Cellar', '葡萄美酒', 'Wine Crate', '澳洲最古老产区出品，浓郁黑莓与黑胡椒香料风味。', 'Velvety Australian Shiraz bursting with dark blackberry and toasted spice.', '大件酒箱', 'Large wine crate', '🍷', P.Large),
      dish('au_surf', '邦迪海滩手工冲浪蜡箱', 'Bondi Surf Crate', '邦迪海滨店', 'Bondi Surf Shop', '海洋文化', 'Coastal Gear', '包含天然蜂蜡、防晒霜与防水袋的冲浪客海滩补给箱。', 'Ocean-ready gear crate stocked with coconut surf wax and beach essentials.', '大件补给箱', 'Large beach crate', '🏄', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_au_opera', kind: 'sail-opera', nameZh: '悉尼白帆歌剧院', nameEn: 'Sydney Opera Sails', eraZh: '世界文化遗产 · 1973年', eraEn: 'UNESCO Icon · 1973', factZh: '由一百万片瑞典白釉瓷砖拼贴而成的三组巨型贝壳穹顶，扬帆于碧波之上。', factEn: 'Sculptural interlocking white concrete shells gleaming over Bennelong Point.', icon: '⛵' },
      { loreId: 'lm_au_townhall', kind: 'clock-tower', nameZh: '悉尼维多利亚钟塔', nameEn: 'Sydney Town Hall Tower', eraZh: '维多利亚砂岩 · 1889年', eraEn: 'Sandstone Civic · 1889', factZh: '蜂蜜色悉尼砂岩雕刻而成的宏伟市政钟楼，连接港湾历史与现代都会。', factEn: 'Ornate honey-sandstone Victorian clock tower anchoring central George Street.', icon: '🕰️' },
    ],
    stages: buildStages([
      ['岩石区古老湾', 'The Rocks Cove', A.WindingCanalHarbor, S.SunnyHarbor],
      ['环形码头白帆', 'Circular Quay', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['达令港夕照桥', 'Darling Harbour', A.TwinRiverArchipelago, S.GoldenSunset],
      ['萨里山咖啡街', 'Surry Hills Cafes', A.DowntownMoatRing, S.SunnyHarbor],
      ['牛津街彩虹城', 'Oxford Neon Way', A.SerpentinePortMaze, S.TwilightNeon],
      ['帕丁顿铁艺巷', 'Paddington Terrace', A.WindingCanalHarbor, S.GoldenSunset],
      ['邦迪海滩浪湾', 'Bondi Surf Bay', A.WindingCanalHarbor, S.SunnyHarbor],
      ['曼利渡轮海峡', 'Manly Wharf', A.TwinRiverArchipelago, S.GoldenSunset],
      ['巴兰加鲁新港', 'Barangaroo Neon', A.SerpentinePortMaze, S.TwilightNeon],
      ['皮尔蒙特海岬', 'Pyrmont Peninsula', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'cairo',
    continent: 'africa',
    nameZh: '开罗',
    nameEn: 'Cairo',
    countryZh: '埃及',
    countryEn: 'Egypt',
    taglineZh: '尼罗河帆影与千年金字塔',
    taglineEn: 'Nile Feluccas & Ancient Pyramids',
    lat: 30.0444,
    lng: 31.2357,
    accentHex: '#eab308',
    unlockStarsRequired: 8,
    streetsZh: ['解放广场大道', '汗哈利利集市街', '扎马雷克岛环路', '尼罗河滨海路', '金字塔大道', '花园城弧线街', '萨拉丁堡垒路', '马阿迪林荫路'],
    streetsEn: ['Tahrir Square', 'Khan el-Khalili', 'Zamalek Island', 'Nile Corniche', 'Pyramids Ave', 'Garden City', 'Citadel Way', 'Maadi Green'],
    dishes: [
      dish('eg_koshari', '埃及国民库沙里碗', 'Koshari Lentil Bowl', '市中心老铺', 'Downtown Koshari', '开罗国民菜', 'National Dish', '米饭、小扁豆、通心粉、鹰嘴豆层层叠放，浇香辣番茄汁与酥脆炸洋葱。', 'Hearty layered rice, lentils, pasta, and chickpeas crowned with spiced tomato sauce and crisp onions.', '热食快送', 'Hot Thermal', '🍲', P.HotExpress),
      dish('eg_falafel', '酥炸蚕豆鹰嘴豆饼', 'Taameya & Tahini Pita', '集市早餐摊', 'Market Breakfast', '尼罗河早点', 'Street Classic', '埃及用鲜嫩绿蚕豆泥加入欧芹芫荽现炸，外脆内绿香嫩配芝麻酱皮塔饼。', 'Crisp herb-green fava bean patties tucked inside warm pita with creamy tahini.', '小份热餐', 'Compact warm pita', '🥙', P.Small),
      dish('eg_kunafa', '蜂蜜开心果库纳法', 'Honey Kunafa Pastry', '扎马雷克甜坊', 'Zamalek Sweets', '中东名甜', 'Artisan Sweet', '细如发丝的酥面烤出金黄脆壳，夹入融化奶酪淋橙花蜂蜜与碎开心果。', 'Shredded filo pastry baked golden over sweet cheese, soaked in orange-blossom honey.', '易碎酥甜盒', 'Fragile sweet tray', '🍯', P.Fragile),
      dish('eg_tea', '冰镇洛神花薄荷茶', 'Mint Karkadeh Tea', '尼罗河茶座', 'Nile Tea Terrace', '千年饮品', 'Heritage Drink', '红宝石般绚丽的洛神花干花瓣加新鲜薄荷熬煮，消暑生津。', 'Ruby-red steeped hibiscus blossoms brightened with fresh crushed garden mint.', '防洒瓶装', 'Fragile glass', '🌺', P.Fragile),
      dish('eg_papyrus', '手绘莎草纸古画箱', 'Papyrus Scroll Chest', '吉萨工艺馆', 'Giza Craft House', '古文明瑰宝', 'Ancient Craft', '沿袭法老时代压制尼罗河芦苇工艺制成的永恒画卷与香料匣。', 'Authentic Nile-reed papyrus artwork hand-painted in mineral gold and lapis.', '大件藏品匣', 'Large crate', '📜', P.Large),
      dish('eg_lantern', '铜镂空星月提灯箱', 'Brass Bazaar Lantern', '汗哈利利铜匠', 'Bazaar Coppersmith', '手工艺品', 'Bazaar Craft', '手工凿刻星月镂空花纹的黄铜与彩绘玻璃提灯，光影迷离。', 'Pierced brass and jewel-toned glass fanous lantern crafted in old bazaar alleys.', '大件易碎箱', 'Large lantern box', '🏮', P.Large),
    ],
    landmarks: [
      { loreId: 'lm_eg_pyramid', kind: 'pyramid', nameZh: '吉萨黄金大金字塔', nameEn: 'Great Pyramid of Giza', eraZh: '古埃及第四王朝 · 前2560年', eraEn: 'Old Kingdom · 2560 BC', factZh: '古代世界七大奇迹中唯一留存至今的宏伟巨构，由230万块巨石严丝合缝堆砌而成。', factEn: 'Oldest and last standing Wonder of the Ancient World, capped in sunlit golden limestone.', icon: '🔺' },
      { loreId: 'lm_eg_citadel', kind: 'clock-tower', nameZh: '萨拉丁城堡古钟塔', nameEn: 'Citadel Clock Tower', eraZh: '19世纪城堡遗迹', eraEn: 'Historic Citadel', factZh: '高踞穆卡塔姆山巅俯瞰开罗万千尖塔与尼罗河三角洲，极具传奇色彩。', factEn: 'Ornate copper-clad clock tower crowning the hilltop Citadel above the Nile skyline.', icon: '🕰️' },
    ],
    stages: buildStages([
      ['扎马雷克河岛', 'Zamalek Island', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['汗哈利利铜市', 'Khan el-Khalili', A.SerpentinePortMaze, S.GoldenSunset],
      ['花园城弯月巷', 'Garden City Curves', A.DowntownMoatRing, S.SunnyHarbor],
      ['解放广场中轴', 'Tahrir Axis', A.DowntownMoatRing, S.GoldenSunset],
      ['马阿迪绿荫路', 'Maadi Boulevards', A.WindingCanalHarbor, S.SunnyHarbor],
      ['尼罗河滨海岸', 'Nile Corniche', A.TwinRiverArchipelago, S.GoldenSunset],
      ['多基大学桥区', 'Dokki Nile Bank', A.WindingCanalHarbor, S.TwilightNeon],
      ['吉萨金字塔缘', 'Giza Plateau', A.DowntownMoatRing, S.GoldenSunset],
      ['赫利奥波利斯', 'Heliopolis Arches', A.SerpentinePortMaze, S.TwilightNeon],
      ['新开罗星夜环', 'New Cairo Neon', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
  {
    id: 'cape_town',
    continent: 'africa',
    nameZh: '开普敦',
    nameEn: 'Cape Town',
    countryZh: '南非',
    countryEn: 'South Africa',
    taglineZh: '好望角海风与彩色马来屋',
    taglineEn: 'Table Bay & Bo-Kaap Pastels',
    lat: -33.9249,
    lng: 18.4241,
    accentHex: '#10b981',
    unlockStarsRequired: 12,
    streetsZh: ['博卡普彩色街', '长街维多利亚路', 'V&A海滨码头路', '海点长廊大道', '坎普斯湾棕榈道', '绿点海岸大道', '花园克洛夫街', '卡尔克湾渔港路'],
    streetsEn: ['Wale St Bo-Kaap', 'Long St', 'V&A Waterfront', 'Sea Point Prom.', 'Camps Bay Dr', 'Green Point Way', 'Kloof St Gardens', 'Kalk Bay Harbour'],
    dishes: [
      dish('za_bobotie', '开普马来香料焗肉派', 'Cape Malay Bobotie', '博卡普彩屋灶', 'Bo-Kaap Kitchen', '南非国菜', 'National Dish', '咖喱香料牛肉拌入杏干与扁桃仁，盖上金黄蛋奶烤至浓郁飘香。', 'Fragrant curried minced beef baked beneath a golden savory egg-custard topping with dried apricot.', '热食急送', 'Hot Thermal', '🥘', P.HotExpress),
      dish('za_gatsby', '开普超级潜艇三明治', 'Gatsby Deli Sandwich', '码头熟食铺', 'Harbour Deli', '街头传奇', 'Street Legend', '长达一尺的松软长面包塞满香辣牛排、薯条与秘制番茄酱，分享快乐。', 'Foot-long crusty roll packed generously with spiced steak, crispy fries, and masala sauce.', '大件长盒', 'Large share box', '🥖', P.Large),
      dish('za_koeksister', '糖浆麻花脆甜圈', 'Koeksisters Syrup Twists', '花园饼房', 'Kloof Patisserie', '国民甜点', 'Sweet Classic', '金黄编织麻花炸脆后瞬间浸入冰镇柠檬生姜糖浆，外脆爆浆。', 'Braided golden dough fried crisp and plunged instantly into chilled spiced ginger syrup.', '小份甜点', 'Compact sweet', '🥨', P.Small),
      dish('za_rooibos', '南非博士茶香草礼盒', 'Rooibos Vanilla Tea', '好望角植物园', 'Cape Botanicals', '非洲奇珍', 'Native Tea', '仅产自南非赛德伯格山脉的无咖啡因红茶，带有天然焦糖香草甘甜。', 'Caffeine-free scarlet mountain bush tea blended with smooth Madagascar vanilla bean.', '易碎茶罐', 'Fragile tin', '🍵', P.Fragile),
      dish('za_wine', '斯泰伦博斯庄园佳酿', 'Stellenbosch Reserve', '维多利亚酒廊', 'V&A Wine Shop', '好望角名酒', 'Cape Vintage', '南非拥有三百余年酿酒史的品洛塔吉红酒，果香浓郁饱满。', 'Estate-bottled Pinotage crafted in sunny Stellenbosch valleys beneath granite peaks.', '大件酒箱', 'Large wine crate', '🍷', P.Large),
      dish('za_protea', '帝王花与皂石香薰匣', 'Protea & Soapstone', '绿点手工艺集', 'Green Point Market', '彩虹之国', 'Artisan Gift', '南非国花帝王花干花搭配手工雕刻天然皂石香薰盒。', 'South Africa royal King Protea botanicals paired with a hand-carved soapstone holder.', '易碎手作', 'Fragile stone', '🌸', P.Fragile),
    ],
    landmarks: [
      { loreId: 'lm_za_mill', kind: 'windmill-gable', nameZh: '莫斯特历史石风车', nameEn: 'Mostert Heritage Mill', eraZh: '开普敦 · 1796年', eraEn: 'Cape Heritage · 1796', factZh: '南非现存最古老的完整运营风车磨坊，白墙茅草顶与桌山云海相映成趣。', factEn: 'South Africa oldest surviving working windmill turning white sails beneath Table Mountain.', icon: '🌾' },
      { loreId: 'lm_za_stadium', kind: 'colosseum-ring', nameZh: '绿点大西洋海岸馆', nameEn: 'Green Point Coastal Bowl', eraZh: '大西洋海湾地标', eraEn: 'Atlantic Bay Bowl', factZh: '宛如洁白海贝壳般的现代化环形海岸体育馆，迎着好望角双洋交汇的海风。', factEn: 'Luminous coastal stadium overlooking Robben Island and Atlantic breakers.', icon: '🏟️' },
    ],
    stages: buildStages([
      ['博卡普糖果屋', 'Bo-Kaap Pastels', A.DowntownMoatRing, S.SunnyHarbor],
      ['维多利亚水岸', 'V&A Waterfront', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['海点海滨长廊', 'Sea Point Walk', A.WindingCanalHarbor, S.GoldenSunset],
      ['克洛夫咖啡林', 'Kloof Gardens', A.DowntownMoatRing, S.SunnyHarbor],
      ['伍德斯托克艺', 'Woodstock Murals', A.SerpentinePortMaze, S.GoldenSunset],
      ['绿点大西洋湾', 'Green Point Bay', A.TwinRiverArchipelago, S.TwilightNeon],
      ['天文台河畔区', 'Observatory Quarter', A.WindingCanalHarbor, S.GoldenSunset],
      ['坎普斯湾棕榈', 'Camps Bay Palms', A.WindingCanalHarbor, S.GoldenSunset],
      ['卡尔克湾渔港', 'Kalk Bay Harbour', A.TwinRiverArchipelago, S.SunnyHarbor],
      ['世纪城运河环', 'Century Canals', A.SerpentinePortMaze, S.TwilightNeon],
    ]),
  },
];

export function getWorldCityById(cityId: string): WorldCityDef | undefined {
  return WORLD_CITIES.find((c) => c.id === cityId);
}

export function getCityEarnedStars(
  cityId: string,
  progression: PlayerProgression | Record<string, number>,
): number {
  const map =
    'worldCityStars' in progression
      ? (progression.worldCityStars as Record<string, number>)
      : (progression as Record<string, number>);
  const prefix = `${cityId}:`;
  let sum = 0;
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith(prefix)) {
      sum += v;
    }
  }
  return sum;
}

export function getTotalWorldStars(
  progression: PlayerProgression | Record<string, number>,
): number {
  const map =
    'worldCityStars' in progression
      ? (progression.worldCityStars as Record<string, number>)
      : (progression as Record<string, number>);
  let total = 0;
  for (const s of Object.values(map)) {
    total += s;
  }
  return total;
}

export function isWorldCityUnlocked(
  city: WorldCityDef,
  progression: PlayerProgression,
): boolean {
  if (city.unlockStarsRequired <= 0) return true;
  if (progression.unlockedWorldCities.includes(city.id)) return true;
  return getTotalWorldStars(progression) >= city.unlockStarsRequired;
}

export function buildWorldCityLevelConfig(city: WorldCityDef, stageNumber: number): LevelConfig {
  const st = city.stages[Math.max(0, Math.min(city.stages.length - 1, stageNumber - 1))];
  return {
    level: st.stage,
    districtName: `${city.nameZh} · ${st.districtZh}`,
    archetype: st.archetype,
    atmosphere: st.atmosphere,
    hasSunshower: st.stage % 4 === 0,
    gridSize: st.gridSize,
    stopCount: st.stopCount,
    timeLimitSec: st.timeLimitSec,
    cruiserCount: st.cruiserCount,
    scooterCount: st.scooterCount,
    bridgeGateCount: st.bridgeGateCount,
    boostPadCount: st.gridSize === 15 ? 3 : st.gridSize === 17 ? 5 : 6,
    signalCount: st.signalCount,
    customCity: {
      cityName: city.nameZh,
      cityNameEn: city.nameEn,
      districtName: `${city.nameZh} · ${st.districtZh}`,
      districtNameEn: `${city.nameEn} · ${st.districtEn}`,
      lat: city.lat,
      lng: city.lng,
      isCustom: true,
      streets: city.streetsZh,
      streetsEn: city.streetsEn,
      worldCityId: city.id,
      worldStage: st.stage,
    },
  };
}
