/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SupportedLanguage = 'zh' | 'en';

const LANG_STORAGE_KEY = 'courier_field_lang';

export function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'zh';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
    // Default to Chinese for Chinese locale users, else Chinese as requested
    const navLang = window.navigator.language?.toLowerCase() ?? '';
    return navLang.startsWith('zh') ? 'zh' : 'zh';
  } catch {
    return 'zh';
  }
}

export function saveLanguagePreference(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage issues
  }
}

export const I18N = {
  zh: {
    // Branding & Header
    gameTitle: '极速派送快递',
    gameSubtitle: '欢迎来到快递乐园！',
    pitchText: '跳上你的小黄车，与时间赛跑，让全城每个街区的居民都洋溢欢笑！',
    tagline: '3D 城市俯视角极速包裹派送',

    // Language toggle
    langToggle: 'EN / 中文',
    currentLangLabel: '简体中文',

    // Title Screen Cards
    card1Title: '准时送达包裹！',
    card1Desc: '跟随道路导航箭头与信号灯，将包裹精准投掷进顾客的金色收件圈！',
    card2Title: '挑战高分狂热！',
    card2Desc: '命中正中靶心触发 2x 连击，积攒金币在车库改装座驾与萌趣车顶！',
    card3Title: '解锁全新街区！',
    card3Desc: '在倒计时耗尽前完成全部派送，赚取三星评级，打卡更多水岸岛屿！',

    // Controls
    controlsTouch: '触屏按键：左下虚拟踏板驾驶转向 · 右下轻触投掷包裹',
    controlsDesktopDrive: '前进',
    controlsDesktopBrake: '减速刹车',
    controlsDesktopTurn: '转向',
    controlsDesktopDrop: '投掷',
    controlsDesktopBoost: '氮气冲刺',
    controlsDesktopHorn: '喇叭',
    controlsDesktopPause: '暂停',

    // Buttons
    startGame: '开始游戏',
    customMapBtn: '定制城市地图',
    selectLevel: '选择关卡',
    stageLabel: '第 {level} 关',
    locked: '未解锁',

    // HUD
    stage: '第 {level} 关',
    timeRemaining: '剩余时间',
    speedUnit: 'km/h',
    delivered: '已送达',
    target: '目标',
    combo: '连击',
    fever: '狂热冲刺',
    hullHp: '货箱耐久',
    shieldActive: '护盾已装载',
    greenWave: '绿波畅行',
    boostReady: '冲刺就绪',
    boostCharging: '充能中',
    wrongWayWarning: '逆行警告！',
    redLightWarning: '红灯违章！',
    tickets: '违章',
    allDelivered: '全城已送达！',
    routeComplete: '派送路线结束',

    // Delivery prompts
    tossReady: '轻触投掷！',
    tossBullseye: '精准正中靶心！',
    expressToss: '疾速飞掷！',
    slowDownCrate: '大件包裹：请减速停车',
    hotThermal: '热食保温',
    fragileCrate: '易碎物品',

    // Countdown & Rocket start
    go: '冲！',
    shiftStarted: '发车开始！',
    turboRocket: '火箭弹射起步！',
    rocketReady: '锁定路线 · 准备发车！',
    rocketCharged: '火箭起步已就绪！继续按住！',
    rocketTooEarly: '起步过早！松开并在“1”时按住！',
    rocketPromptDesktop: '倒计时为 1 时按住 [W / ↑] 触发弹射起步！',
    rocketPromptMobile: '倒计时为 1 时按住屏幕触发弹射起步！',
    spotRoute: '锁定路线 · 准备发车！',

    // Pause & Modals
    pausedTitle: '中途休息与派送指南',
    resume: '继续派送',
    restart: '重试本关',
    retry: '重试',
    garage: '车库',
    languageSwitch: '切换语言',
    garageShop: '车库改装',
    quests: '任务与规则',
    welcomeScreen: '返回主界面',
    nextStage: '前往下一关',
    tryAgain: '重新挑战',

    // Result Titles
    victoryTitle: '全城包裹派送完成！',
    breakdownTitle: '车辆碰撞损毁，需要拖车！',
    timeUpTitle: '今日派送时间耗尽！',

    // Result Stats
    finalScore: '最终得分',
    bestScore: '历史最佳',
    coinsEarned: '获得金币',
    starsEarned: '星级评定',
    deliveredStops: '完成站点',
    bullseyesHit: '完美正中',
    maxComboCount: '最高连击',
    timeBonus: '剩余时间奖励',
    cleanRecord: '零违章好评',

    // Garage
    garageTitle: '特工车库 & 改装工坊',
    vehicleTab: '配送载具',
    topperTab: '车顶饰品',
    paintTab: '专属涂装',
    wheelTab: '幸运转盘',
    equipped: '已出战',
    equip: '装备出发',
    buyFor: '金币购买',
    owned: '已拥有',
    freeSpin: '免费抽奖！',
    spinCost: '{cost} 金币抽奖',
    spinTokens: '抽奖券',
    walletCoins: '金币余额',

    // Vehicle Stats
    statTopSpeed: '最高车速',
    statHandling: '漂移转向',
    statAccel: '起步加速',
    statArmor: '车身护甲',
    statTossReach: '投掷射程',
    shockAbsorber: '装载易碎品避震器',

    // Custom City Generator
    customCityTitle: '定制所在城市与地区地图',
    customCitySubtitle:
      '输入你所在的城市或区域名称，或获取当前GPS位置，为你生成独一无二的3D街区派送地图！',
    searchCityPlaceholder: '搜索城市、区县（如：北京市朝阳区、上海、广州、成都、杭州...）',
    useCurrentLocation: '📍 获取当前GPS位置',
    locating: '正在定位中...',
    locationSuccess: '已定位到当前城市：',
    locationError: '无法获取GPS位置，请直接在上方搜索城市名称',
    presetCities: '快速精选城市：',
    citySettings: '地图生成参数配置',
    mapSizeLabel: '街区规模',
    mapSmall: '紧凑街区 (15x15)',
    mapMedium: '繁华中心 (17x17)',
    mapLarge: '宏大都会 (19x19)',
    atmosphereLabel: '时间氛围',
    atmoSunny: '晴朗清晨',
    atmoSunset: '金色夕阳',
    atmoNeon: '霓虹夜市',
    stopsCountLabel: '派送站点数',
    stopsCountValue: '{count} 个站点',
    trafficDensityLabel: '车流密度',
    trafficLow: '轻松郊区',
    trafficMed: '适中车流',
    trafficHigh: '早晚高峰',
    mapPreviewTitle: '城市街道微缩全景预览',
    coordinatesLabel: '地理经纬度',
    playCustomCity: '🚗 进入定制城市派送！',
    customDistrictBadge: '定制专属街区',
    loadingSearch: '正在搜索真实地图信息...',

    // World Tour, Almanac & Cultural Discovery Modal
    worldTourBtn: '🌍 环游世界 20 城',
    almanacBtn: '📖 环球风物图鉴',
    worldTourTitle: '环球快递世界巡回赛 · 20 大都市',
    worldTourSubtitle: '横跨六大洲，20 座真实名城 × 10 个渐进区域。累积星级解锁更多大洲与名城！',
    allContinents: '全部大洲',
    continentAsia: '亚洲',
    continentEurope: '欧洲',
    continentNorthAmerica: '北美洲',
    continentSouthAmerica: '南美洲',
    continentOceania: '大洋洲',
    continentAfrica: '非洲',
    totalWorldStars: '世界总星数',
    unlockNeedStars: '需 {stars}★ 解锁',
    cityUnlocked: '已解锁',
    selectDistrictStage: '选择 {city} 派送区域 (1-10)',
    stageCleared: '已通关',
    playWorldStage: '🚀 出发派送该区域！',
    signatureDishes: '代表美食与特产',
    cityLandmarks: '城市地标建筑',
    discoveryNewBadge: '首次图鉴收录！',
    discoveryAlreadyKnown: '风物档案记录',
    discoveryCategoryDish: '地道风味美食',
    discoveryCategoryLandmark: '城市历史地标',
    discoveryMerchantLabel: '出发商户',
    discoveryTipLabel: '骑手派送小贴士',
    discoveryDeliverBtn: '📦 确认信息并继续派送',
    discoveryLandmarkBtn: '🏛️ 记住地标并继续',
    discoveryPauseNote: '游戏已贴心暂停，方便你阅读城市文化百科',
    discoveryAutoShowToggle: '仅首次收录时弹窗（之后可在图鉴随时翻阅）',
    almanacTitle: '环球风物与地标图鉴',
    almanacSubtitle: '收齐 20 座名城的特色美食与历史建筑档案',
    almanacCollected: '已收录 {count} / {total}',
    almanacLockedHint: '前往该城市派送或路过地标即可解锁！',
    closeModal: '关闭',
    driftSparkT1: '蓝色涡轮蓄力!',
    driftSparkT2: '黄金极速蓄满!',
    careerLedgerBtn: '📒 骑手职业账本',
    careerLedgerTitle: '骑手职业账本 · 成长与兑换',
    rankLabel: '当前段位',
    exchangeCounterTitle: '外卖收入汇率兑换柜台',
    exchangeCta: '按当前汇率兑换金币',
    milestonesTitle: '职业里程碑专属解锁',
    bronzeMedal: '铜牌',
    silverMedal: '银牌',
    goldMedal: '金牌',
    checkInBtn: '立即签到领奖',
    checkedInToday: '今日已签到',
    streakDaysLabel: '连胜签到',
  },
  en: {
    // Branding & Header
    gameTitle: 'Poko Parcel Express',
    gameSubtitle: 'Welcome to Courier Field!',
    pitchText:
      'Hop in your courier van, race the shift clock, and keep the whole island smiling!',
    tagline: 'Isometric 3D Procedural Delivery Adventure',

    // Language toggle
    langToggle: '中文 / EN',
    currentLangLabel: 'English',

    // Title Screen Cards
    card1Title: 'Deliver Packages!',
    card1Desc:
      'Follow road arrows, obey signals, and toss parcels into customer rings!',
    card2Title: 'Score Big Points!',
    card2Desc:
      'Hit bullseyes for 2x Fever combos and collect coins for new vans & toppers!',
    card3Title: 'Unlock New Levels!',
    card3Desc:
      'Finish every stop before time runs out to earn 3 stars and reach new islands!',

    // Controls
    controlsTouch:
      'Touch Pedals Drive, Turn & Brake · Tap Parcel Drop!',
    controlsDesktopDrive: 'Drive',
    controlsDesktopBrake: 'Brake',
    controlsDesktopTurn: 'Turn',
    controlsDesktopDrop: 'Drop',
    controlsDesktopBoost: 'Boost',
    controlsDesktopHorn: 'Horn',
    controlsDesktopPause: 'Pause',

    // Buttons
    startGame: 'START GAME',
    customMapBtn: 'CUSTOM CITY MAP',
    selectLevel: 'Select Level',
    stageLabel: 'Stage {level}',
    locked: 'Locked',

    // HUD
    stage: 'STAGE {level}',
    timeRemaining: 'TIME LEFT',
    speedUnit: 'km/h',
    delivered: 'DELIVERED',
    target: 'TARGET',
    combo: 'COMBO',
    fever: 'FEVER DRIFT',
    hullHp: 'VAN HULL',
    shieldActive: 'BUMPER SHIELD',
    greenWave: 'GREEN WAVE',
    boostReady: 'BOOST READY',
    boostCharging: 'CHARGING',
    wrongWayWarning: 'WRONG WAY!',
    redLightWarning: 'RED LIGHT!',
    tickets: 'TICKETS',
    allDelivered: 'ALL DELIVERED!',
    routeComplete: 'Route Complete',

    // Delivery prompts
    tossReady: 'TAP TO DROP!',
    tossBullseye: 'BULLSEYE CENTER!',
    expressToss: 'EXPRESS TOSS!',
    slowDownCrate: 'LARGE CRATE: BRAKE TO STOP',
    hotThermal: 'HOT THERMAL',
    fragileCrate: 'FRAGILE',

    // Countdown & Rocket start
    go: 'GO!',
    shiftStarted: 'SHIFT STARTED!',
    turboRocket: 'TURBO ROCKET LAUNCH!',
    rocketReady: 'SPOT YOUR ROUTE · READY ON 1!',
    rocketCharged: 'ROCKET START CHARGED! KEEP HOLDING!',
    rocketTooEarly: 'TOO EARLY! RELEASE & HOLD ON 1!',
    rocketPromptDesktop: 'HOLD GAS [W / ▲] NOW FOR ROCKET START!',
    rocketPromptMobile: 'HOLD SCREEN NOW FOR ROCKET START!',
    spotRoute: 'SPOT YOUR ROUTE · READY ON 1!',

    // Pause & Modals
    pausedTitle: 'Coffee Break & Rules',
    resume: 'RESUME ROUTE',
    restart: 'RESTART STAGE',
    retry: 'RETRY',
    garage: 'GARAGE',
    languageSwitch: 'Switch Language',
    garageShop: 'GARAGE SHOP',
    quests: 'QUESTS & RULES',
    welcomeScreen: 'WELCOME SCREEN',
    nextStage: 'NEXT STAGE',
    tryAgain: 'TRY AGAIN',

    // Result Titles
    victoryTitle: 'ALL PARCELS DELIVERED!',
    breakdownTitle: 'VAN NEEDS REPAIRS!',
    timeUpTitle: 'SHIFT TIME UP!',

    // Result Stats
    finalScore: 'Final Score',
    bestScore: 'Best Score',
    coinsEarned: 'Coins Earned',
    starsEarned: 'Stars Earned',
    deliveredStops: 'Stops Delivered',
    bullseyesHit: 'Bullseyes Hit',
    maxComboCount: 'Max Combo',
    timeBonus: 'Time Remaining Bonus',
    cleanRecord: 'Zero-Ticket Bonus',

    // Garage
    garageTitle: 'Courier Garage & Mod Shop',
    vehicleTab: 'Vans',
    topperTab: 'Toppers',
    paintTab: 'Paint',
    wheelTab: 'Spin',
    equipped: 'EQUIPPED',
    equip: 'EQUIP',
    buyFor: 'BUY',
    owned: 'OWNED',
    freeSpin: 'FREE SPIN!',
    spinCost: '{cost} COINS',
    spinTokens: 'Tokens',
    walletCoins: 'Coins',

    // Vehicle Stats
    statTopSpeed: 'Top Speed',
    statHandling: 'Handling',
    statAccel: 'Acceleration',
    statArmor: 'Armor HP',
    statTossReach: 'Toss Reach',
    shockAbsorber: 'Equipped with Fragile Shock Absorber',

    // Custom City Generator
    customCityTitle: 'Custom City & Region Map',
    customCitySubtitle:
      'Enter your city or region name, or use GPS to generate a unique 3D delivery map based on real places!',
    searchCityPlaceholder: 'Search city or district (e.g., Beijing, Shanghai, Tokyo, Paris, New York...)',
    useCurrentLocation: '📍 Use Current GPS Location',
    locating: 'Locating...',
    locationSuccess: 'Location detected: ',
    locationError: 'Could not access GPS. Please search for your city above.',
    presetCities: 'Popular Preset Cities:',
    citySettings: 'City Map Parameters',
    mapSizeLabel: 'District Size',
    mapSmall: 'Compact Island (15x15)',
    mapMedium: 'Vibrant Core (17x17)',
    mapLarge: 'Grand Metropolis (19x19)',
    atmosphereLabel: 'Time of Day',
    atmoSunny: 'Sunny Harbor',
    atmoSunset: 'Golden Sunset',
    atmoNeon: 'Twilight Neon',
    stopsCountLabel: 'Delivery Stops',
    stopsCountValue: '{count} Stops',
    trafficDensityLabel: 'Traffic Density',
    trafficLow: 'Quiet Suburb',
    trafficMed: 'Normal Flow',
    trafficHigh: 'Rush Hour',
    mapPreviewTitle: 'Live 3D City Diorama Preview',
    coordinatesLabel: 'Coordinates',
    playCustomCity: '🚗 Deliver in Custom City!',
    customDistrictBadge: 'Custom City Map',
    loadingSearch: 'Searching real-world locations...',

    // World Tour, Almanac & Cultural Discovery Modal
    worldTourBtn: '🌍 WORLD TOUR (20 CITIES)',
    almanacBtn: '📖 CULTURAL ALMANAC',
    worldTourTitle: 'World Tour · 20 Iconic Cities',
    worldTourSubtitle: 'Across 6 continents: 20 real cities × 10 progressive districts. Earn stars to unlock new destinations!',
    allContinents: 'All Continents',
    continentAsia: 'Asia',
    continentEurope: 'Europe',
    continentNorthAmerica: 'North America',
    continentSouthAmerica: 'South America',
    continentOceania: 'Oceania',
    continentAfrica: 'Africa',
    totalWorldStars: 'World Stars',
    unlockNeedStars: 'Need {stars}★',
    cityUnlocked: 'Unlocked',
    selectDistrictStage: 'Choose {city} District (Stage 1–10)',
    stageCleared: 'Cleared',
    playWorldStage: '🚀 Launch District Route!',
    signatureDishes: 'Local Specialties',
    cityLandmarks: 'City Landmarks',
    discoveryNewBadge: 'FIRST DISCOVERY!',
    discoveryAlreadyKnown: 'CITY LORE FILE',
    discoveryCategoryDish: 'Local Culinary Dish',
    discoveryCategoryLandmark: 'Historic Landmark',
    discoveryMerchantLabel: 'Merchant',
    discoveryTipLabel: 'Courier Delivery Tip',
    discoveryDeliverBtn: '📦 Confirm & Deliver!',
    discoveryLandmarkBtn: '🏛️ Got It & Keep Driving!',
    discoveryPauseNote: 'Shift timer paused while you read',
    discoveryAutoShowToggle: 'Auto-open only on first discovery (review anytime in Almanac)',
    almanacTitle: 'World Culinary & Landmark Almanac',
    almanacSubtitle: 'Collect signature dishes & monuments across all 20 global cities',
    almanacCollected: 'Collected {count} / {total}',
    almanacLockedHint: 'Deliver in this city or pass this landmark to unlock!',
    closeModal: 'Close',
    driftSparkT1: 'CYAN MINI-TURBO!',
    driftSparkT2: 'GOLD SUPER-TURBO!',
    careerLedgerBtn: '📒 CAREER LEDGER',
    careerLedgerTitle: 'Rider Career Ledger & Perks',
    rankLabel: 'Current Rank',
    exchangeCounterTitle: '¥ Earnings → Coins Exchange Counter',
    exchangeCta: 'Convert Earnings to Coins',
    milestonesTitle: 'Career Milestone Unlocks',
    bronzeMedal: 'Bronze',
    silverMedal: 'Silver',
    goldMedal: 'Gold',
    checkInBtn: 'Daily Check-In',
    checkedInToday: 'Checked In Today',
    streakDaysLabel: 'Streak',
  },
};
