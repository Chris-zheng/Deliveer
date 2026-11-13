/**
 * src/game/archetypes.ts
 *
 * Customer personality archetypes. Every stop carries one deterministic
 * archetype (no extra RNG draws, so city layout stays identical) which nudges
 * the reward math in `sim/scoring.ts`:
 *
 *  - chill     : baseline customer, no modifier
 *  - impatient : wants it now — one second less time bonus, but a bigger tip
 *  - picky     : only tips on a bullseye pad drop, otherwise tips are voided
 *  - generous  : flat extra tip, no conditions
 */
import type { CustomerArchetype } from './types';

export const ARCHETYPE_CYCLE: CustomerArchetype[] = [
  'chill',
  'impatient',
  'picky',
  'generous',
];

export interface ArchetypeRule {
  /** Added to the parcel time bonus (negative = customer is impatient). */
  timeBonusDeltaSec: number;
  /** Extra tip in ¥ when the customer is satisfied. */
  extraTipYuan: number;
  /** When true the customer voids every tip unless it was a bullseye drop. */
  requiresBullseyeTip: boolean;
}

export const ARCHETYPE_RULES: Record<CustomerArchetype, ArchetypeRule> = {
  chill: { timeBonusDeltaSec: 0, extraTipYuan: 0, requiresBullseyeTip: false },
  impatient: { timeBonusDeltaSec: -1, extraTipYuan: 1.5, requiresBullseyeTip: false },
  picky: { timeBonusDeltaSec: 0, extraTipYuan: 2.0, requiresBullseyeTip: true },
  generous: { timeBonusDeltaSec: 0, extraTipYuan: 2.0, requiresBullseyeTip: false },
};

export function pickArchetype(stopIndex: number, level: number): CustomerArchetype {
  return ARCHETYPE_CYCLE[(stopIndex + level) % ARCHETYPE_CYCLE.length];
}

export function archetypeLabel(
  archetype: CustomerArchetype,
  lang: 'zh' | 'en',
): string {
  if (lang === 'zh') {
    switch (archetype) {
      case 'impatient':
        return '急躁';
      case 'picky':
        return '挑剔';
      case 'generous':
        return '大方';
      default:
        return '随和';
    }
  }
  switch (archetype) {
    case 'impatient':
      return 'Impatient';
    case 'picky':
      return 'Picky';
    case 'generous':
      return 'Generous';
    default:
      return 'Chill';
  }
}
