/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rider Career Ledger:
 * - 6 progressive courier ranks backed by lifetime Career XP
 * - Dynamic ¥ -> Garage Coins exchange rate scaling with Rider Rank (5..10 Coins per ¥1)
 * - Milestone rewards unlocking exclusive vehicle liveries & the Roof Neon Lightbox
 */

import { LiveryId, PlayerProgression, RiderCareerState, RunSnapshot, TopperId } from './types';

export interface RiderRankDef {
  tier: number;
  id: string;
  minXp: number;
  exchangeRate: number; // Garage Coins per ¥1
  badge: string;
  nameZh: string;
  nameEn: string;
  accentHex: string;
}

export const RIDER_RANKS: RiderRankDef[] = [
  {
    tier: 1,
    id: 'rookie',
    minXp: 0,
    exchangeRate: 5,
    badge: '🥉',
    nameZh: '见习骑手',
    nameEn: 'Rookie Courier',
    accentHex: '#94a3b8',
  },
  {
    tier: 2,
    id: 'street',
    minXp: 150,
    exchangeRate: 6,
    badge: '🚲',
    nameZh: '街头飞手',
    nameEn: 'Street Sprinter',
    accentHex: '#22c55e',
  },
  {
    tier: 3,
    id: 'silver',
    minXp: 400,
    exchangeRate: 7,
    badge: '⚡',
    nameZh: '白银专送',
    nameEn: 'Silver Dispatch',
    accentHex: '#38bdf8',
  },
  {
    tier: 4,
    id: 'gold',
    minXp: 800,
    exchangeRate: 8,
    badge: '🏅',
    nameZh: '黄金王牌',
    nameEn: 'Gold Ace',
    accentHex: '#f59e0b',
  },
  {
    tier: 5,
    id: 'platinum',
    minXp: 1400,
    exchangeRate: 9,
    badge: '💎',
    nameZh: '铂金御风',
    nameEn: 'Platinum Wind',
    accentHex: '#a855f7',
  },
  {
    tier: 6,
    id: 'legend',
    minXp: 2200,
    exchangeRate: 10,
    badge: '👑',
    nameZh: '传奇车神',
    nameEn: 'Legend Express',
    accentHex: '#f43f5e',
  },
];

export interface LiverySpec {
  id: LiveryId;
  nameZh: string;
  nameEn: string;
  taglineZh: string;
  taglineEn: string;
  cabHex: number;
  cargoHex: number;
  stripeHex: number;
  emissiveHex?: number;
  previewHex: string;
  costCoins: number;
  milestoneOnly?: boolean;
}

export const LIVERY_SPECS: Record<LiveryId, LiverySpec> = {
  [LiveryId.Standard]: {
    id: LiveryId.Standard,
    nameZh: '原厂经典涂装',
    nameEn: 'Factory Standard',
    taglineZh: '保留各款车型原厂撞色涂装',
    taglineEn: 'Original chassis colors for each fleet model',
    cabHex: 0xf48836,
    cargoHex: 0xfff6e6,
    stripeHex: 0xffb703,
    previewHex: '#f48836',
    costCoins: 0,
  },
  [LiveryId.JadeExpress]: {
    id: LiveryId.JadeExpress,
    nameZh: '翠玉极速骑手涂装',
    nameEn: 'Jade Express Livery',
    taglineZh: '翡翠车身配琥珀流线腰条 · 职业里程碑解锁',
    taglineEn: 'Emerald sheen with amber speed stripes',
    cabHex: 0x10b981,
    cargoHex: 0xecfdf5,
    stripeHex: 0xfbbf24,
    previewHex: '#10b981',
    costCoins: 600,
    milestoneOnly: true,
  },
  [LiveryId.SakuraRush]: {
    id: LiveryId.SakuraRush,
    nameZh: '樱花漫游限定涂装',
    nameEn: 'Sakura Blossom Livery',
    taglineZh: '粉樱糖霜涂装配莓红饰条 · 街头口碑里程碑',
    taglineEn: 'Pastel sakura pink with crimson racing trim',
    cabHex: 0xf472b6,
    cargoHex: 0xfff1f2,
    stripeHex: 0xe11d48,
    previewHex: '#f472b6',
    costCoins: 900,
    milestoneOnly: true,
  },
  [LiveryId.CyberNeon]: {
    id: LiveryId.CyberNeon,
    nameZh: '幻夜霓虹王牌涂装',
    nameEn: 'Cyber Neon Night Livery',
    taglineZh: '午夜深靛配自发光青蓝霓虹边条',
    taglineEn: 'Midnight indigo wrap with glowing cyan neon trim',
    cabHex: 0x1e1b4b,
    cargoHex: 0x312e81,
    stripeHex: 0x22d3ee,
    emissiveHex: 0x06b6d4,
    previewHex: '#22d3ee',
    costCoins: 1400,
    milestoneOnly: true,
  },
  [LiveryId.GoldChampion]: {
    id: LiveryId.GoldChampion,
    nameZh: '传奇黄金殿堂涂装',
    nameEn: 'Champion Gold Livery',
    taglineZh: '冠军鎏金车厢与荣耀红纹 · 终极传奇专属',
    taglineEn: 'Gilded championship wrap with scarlet accents',
    cabHex: 0xf59e0b,
    cargoHex: 0xfef3c7,
    stripeHex: 0xdc2626,
    emissiveHex: 0xd97706,
    previewHex: '#f59e0b',
    costCoins: 2000,
    milestoneOnly: true,
  },
};

export interface CareerMilestoneDef {
  id: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
  metric: 'totalEarningsYuan' | 'totalDeliveries' | 'cleanShifts' | 'careerXp';
  target: number;
  rewardLivery?: LiveryId;
  rewardTopper?: TopperId;
  rewardCoins: number;
  icon: string;
}

export const CAREER_MILESTONES: CareerMilestoneDef[] = [
  {
    id: 'ms_jade_livery',
    titleZh: '初露锋芒 · 翠玉极速涂装',
    titleEn: 'Rising Courier · Jade Livery',
    descZh: '累计外卖净收入达到 ¥120',
    descEn: 'Earn ¥120 lifetime net delivery pay',
    metric: 'totalEarningsYuan',
    target: 120,
    rewardLivery: LiveryId.JadeExpress,
    rewardCoins: 100,
    icon: '🎨',
  },
  {
    id: 'ms_neon_lightbox',
    titleZh: '夜街灯火 · 专属霓虹灯箱',
    titleEn: 'Night Beacon · Neon Lightbox',
    descZh: '累计安全送达 18 份订单',
    descEn: 'Complete 18 lifetime parcel deliveries',
    metric: 'totalDeliveries',
    target: 18,
    rewardTopper: TopperId.NeonLightbox,
    rewardCoins: 150,
    icon: '💡',
  },
  {
    id: 'ms_sakura_livery',
    titleZh: '零违章标兵 · 樱花限定涂装',
    titleEn: 'Clean Record · Sakura Livery',
    descZh: '累计完成 3 次零罚单安全班次',
    descEn: 'Finish 3 clean shifts with 0 traffic tickets',
    metric: 'cleanShifts',
    target: 3,
    rewardLivery: LiveryId.SakuraRush,
    rewardCoins: 180,
    icon: '🌸',
  },
  {
    id: 'ms_cyber_livery',
    titleZh: '霓虹骑士 · 幻夜霓虹涂装',
    titleEn: 'Neon Knight · Cyber Neon Wrap',
    descZh: '累计职业经验达到 900 XP',
    descEn: 'Reach 900 lifetime Career XP',
    metric: 'careerXp',
    target: 900,
    rewardLivery: LiveryId.CyberNeon,
    rewardCoins: 260,
    icon: '🌃',
  },
  {
    id: 'ms_gold_livery',
    titleZh: '殿堂车神 · 传奇黄金涂装',
    titleEn: 'Legend Dispatch · Champion Gold',
    descZh: '累计外卖净收入达到 ¥800',
    descEn: 'Earn ¥800 lifetime net delivery pay',
    metric: 'totalEarningsYuan',
    target: 800,
    rewardLivery: LiveryId.GoldChampion,
    rewardCoins: 400,
    icon: '👑',
  },
];

export function createDefaultCareerState(): RiderCareerState {
  return {
    careerXp: 0,
    totalDeliveries: 0,
    totalEarningsYuan: 0,
    unconvertedYuan: 0,
    totalExchangedCoins: 0,
    shiftsCompleted: 0,
    cleanShifts: 0,
    bestPraiseRate: 100,
    claimedMilestones: [],
  };
}

export function normalizeCareerState(raw?: Partial<RiderCareerState> | null): RiderCareerState {
  const base = createDefaultCareerState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    careerXp: typeof raw.careerXp === 'number' ? Math.max(0, Math.floor(raw.careerXp)) : 0,
    totalDeliveries:
      typeof raw.totalDeliveries === 'number' ? Math.max(0, Math.floor(raw.totalDeliveries)) : 0,
    totalEarningsYuan:
      typeof raw.totalEarningsYuan === 'number'
        ? Math.max(0, Number(raw.totalEarningsYuan.toFixed(1)))
        : 0,
    unconvertedYuan:
      typeof raw.unconvertedYuan === 'number'
        ? Math.max(0, Number(raw.unconvertedYuan.toFixed(1)))
        : 0,
    totalExchangedCoins:
      typeof raw.totalExchangedCoins === 'number'
        ? Math.max(0, Math.floor(raw.totalExchangedCoins))
        : 0,
    shiftsCompleted:
      typeof raw.shiftsCompleted === 'number' ? Math.max(0, Math.floor(raw.shiftsCompleted)) : 0,
    cleanShifts:
      typeof raw.cleanShifts === 'number' ? Math.max(0, Math.floor(raw.cleanShifts)) : 0,
    bestPraiseRate:
      typeof raw.bestPraiseRate === 'number'
        ? Math.min(100, Math.max(0, Math.round(raw.bestPraiseRate)))
        : 100,
    claimedMilestones: Array.isArray(raw.claimedMilestones)
      ? raw.claimedMilestones.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

export function getRiderRankInfo(careerXp: number): {
  current: RiderRankDef;
  next: RiderRankDef | null;
  progressPct: number;
} {
  let current = RIDER_RANKS[0];
  let next: RiderRankDef | null = RIDER_RANKS[1] ?? null;

  for (let i = 0; i < RIDER_RANKS.length; i++) {
    if (careerXp >= RIDER_RANKS[i].minXp) {
      current = RIDER_RANKS[i];
      next = RIDER_RANKS[i + 1] ?? null;
    }
  }

  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((careerXp - current.minXp) / Math.max(1, next.minXp - current.minXp)) * 100),
        ),
      )
    : 100;

  return { current, next, progressPct };
}

export function computeShiftCareerXp(snap: RunSnapshot): number {
  const deliveryXp = snap.deliveredCount * 16;
  const bullseyeXp = snap.bullseyeCount * 10;
  const starXp = snap.starsEarned * 25;
  const cleanBonus = snap.ticketsCount === 0 && snap.deliveredCount > 0 ? 20 : 0;
  return deliveryXp + bullseyeXp + starXp + cleanBonus;
}

export function recordCareerShift(
  prog: PlayerProgression,
  snap: RunSnapshot,
): { next: PlayerProgression; xpGained: number; rankedUpTo: RiderRankDef | null } {
  const prevCareer = normalizeCareerState(prog.career);
  const prevRank = getRiderRankInfo(prevCareer.careerXp).current;

  const xpGained = computeShiftCareerXp(snap);
  const netYuan = Math.max(0, Number((snap.riderReceipt?.netEarningsYuan ?? 0).toFixed(1)));
  const praiseRate = snap.riderReceipt?.praiseRate ?? prevCareer.bestPraiseRate;
  const isCleanShift = snap.ticketsCount === 0 && snap.deliveredCount > 0;

  const nextCareer: RiderCareerState = {
    ...prevCareer,
    careerXp: prevCareer.careerXp + xpGained,
    totalDeliveries: prevCareer.totalDeliveries + Math.max(0, snap.deliveredCount),
    totalEarningsYuan: Number((prevCareer.totalEarningsYuan + netYuan).toFixed(1)),
    unconvertedYuan: Number((prevCareer.unconvertedYuan + netYuan).toFixed(1)),
    shiftsCompleted: prevCareer.shiftsCompleted + 1,
    cleanShifts: prevCareer.cleanShifts + (isCleanShift ? 1 : 0),
    bestPraiseRate: Math.max(prevCareer.bestPraiseRate, praiseRate),
  };

  const nextRank = getRiderRankInfo(nextCareer.careerXp).current;
  const rankedUpTo = nextRank.tier > prevRank.tier ? nextRank : null;

  return {
    next: {
      ...prog,
      career: nextCareer,
    },
    xpGained,
    rankedUpTo,
  };
}

export function exchangeEarningsToCoins(prog: PlayerProgression): {
  next: PlayerProgression;
  yuanExchanged: number;
  coinsAwarded: number;
  rateUsed: number;
} {
  const career = normalizeCareerState(prog.career);
  const yuan = Math.max(0, career.unconvertedYuan);
  if (yuan < 0.2) {
    return {
      next: prog,
      yuanExchanged: 0,
      coinsAwarded: 0,
      rateUsed: getRiderRankInfo(career.careerXp).current.exchangeRate,
    };
  }
  const rate = getRiderRankInfo(career.careerXp).current.exchangeRate;
  const coinsAwarded = Math.max(1, Math.round(yuan * rate));
  return {
    next: {
      ...prog,
      coins: prog.coins + coinsAwarded,
      career: {
        ...career,
        unconvertedYuan: 0,
        totalExchangedCoins: career.totalExchangedCoins + coinsAwarded,
      },
    },
    yuanExchanged: yuan,
    coinsAwarded,
    rateUsed: rate,
  };
}

export function getMilestoneProgressValue(
  career: RiderCareerState,
  metric: CareerMilestoneDef['metric'],
): number {
  return career[metric];
}

export function hasClaimableMilestone(prog: PlayerProgression): boolean {
  const career = normalizeCareerState(prog.career);
  return CAREER_MILESTONES.some(
    (m) =>
      !career.claimedMilestones.includes(m.id) &&
      getMilestoneProgressValue(career, m.metric) >= m.target,
  );
}

export function claimCareerMilestone(
  prog: PlayerProgression,
  milestoneId: string,
): { next: PlayerProgression; claimed: boolean } {
  const career = normalizeCareerState(prog.career);
  const def = CAREER_MILESTONES.find((m) => m.id === milestoneId);
  if (!def || career.claimedMilestones.includes(milestoneId)) {
    return { next: prog, claimed: false };
  }
  if (getMilestoneProgressValue(career, def.metric) < def.target) {
    return { next: prog, claimed: false };
  }

  const nextLiveries =
    def.rewardLivery && !prog.unlockedLiveries.includes(def.rewardLivery)
      ? [...prog.unlockedLiveries, def.rewardLivery]
      : prog.unlockedLiveries;

  const nextToppers =
    def.rewardTopper && !prog.unlockedToppers.includes(def.rewardTopper)
      ? [...prog.unlockedToppers, def.rewardTopper]
      : prog.unlockedToppers;

  return {
    next: {
      ...prog,
      coins: prog.coins + def.rewardCoins,
      unlockedLiveries: nextLiveries,
      selectedLivery: def.rewardLivery ?? prog.selectedLivery,
      unlockedToppers: nextToppers,
      selectedTopper: def.rewardTopper ?? prog.selectedTopper,
      career: {
        ...career,
        claimedMilestones: [...career.claimedMilestones, milestoneId],
      },
    },
    claimed: true,
  };
}
