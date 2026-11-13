/**
 * src/config/balance.ts
 *
 * Single source of truth for gameplay tuning values.
 *
 * Rules:
 *  - Numbers only. No imports from `src/game/*` (keeps this module acyclic).
 *  - Every value here was extracted verbatim from the pre-refactor source;
 *    changing one is a *gameplay* change, so update `rules.test.ts` alongside it.
 *  - Consumers keep importing from their historical path (e.g. `game/rules`)
 *    because those modules re-export from here. New code should import from
 *    `@/config/balance` directly.
 */

/** World units per city grid tile. */
export const TILE_SIZE = 2.6;

/** Lateral offset of the right-hand lane from tile center, in world units. */
export const RIGHT_LANE_OFFSET = 0.44;

/** Vehicle motion & collision. */
export const TRUCK_MAX_SPEED = 8.6;
export const TRUCK_BOOST_SPEED = 13.4;
export const TRUCK_RADIUS = 0.46;

/** Parcel pickup / unload radii. */
export const AUTO_DROP_RADIUS = 1.6;
export const BULLSEYE_PAD_RADIUS = 1.05;
export const EXPRESS_TOSS_RADIUS = 4.2;
export const SMALL_TOSS_RADIUS = 5.3;
export const LARGE_UNLOAD_RADIUS = 2.45;
export const LARGE_MAX_UNLOAD_SPEED = 3.1;

/** Combo / fever scoring. */
export const COMBO_WINDOW_SEC = 8.0;
export const FEVER_COMBO_THRESHOLD = 4;

/** Hazards & traffic law. */
export const MAX_CONCURRENT_SCOOTER_ATTACKS = 2;
export const WRONG_WAY_LIMIT_SEC = 1.75;
export const BOOST_COOLDOWN_MAX_SEC = 3.2;

/** Rocket start (countdown timing window). */
export const ROCKET_START_POINTS = 75;
export const ROCKET_START_BOOST_SEC = 1.55;

/** Pedestrian capsule radius. */
export const PEDESTRIAN_RADIUS = 0.22;

/** Progression economy. */
export const SPIN_COST_COINS = 200;

/** Autopilot showcase length. */
export const DEMO_DURATION_SEC = 45;

/** Level curve — consumed by `getLevelConfig()` in `game/proceduralCity.ts`. */
export const LEVEL = {
  gridSizeSmall: 15,
  gridSizeMedium: 17,
  gridSizeLarge: 19,
  stopsBase: 3,
  stopsMax: 9,
  timeBaseSec: 78,
  timePerStopSec: 9,
  timeShortenMaxSec: 22,
  timeShortenPerLevelSec: 3,
  timeMinSec: 60,
  cruisersBase: 5,
  cruisersMax: 10,
  scootersMax: 5,
  bridgeGatesMax: 3,
  boostPadsBase: 3,
  boostPadsMax: 6,
  signalsBase: 4,
  signalsMax: 8,
} as const;

/** Chase camera. */
export const CAMERA = {
  baseFov: 30,
  lookAhead: 4.8,
  backDist: 21.5,
  upHeight: 26.0,
} as const;

/** Fixed-size object pools sized for the render loop. */
export const POOLS = {
  particles: 96,
  breadcrumbs: 42,
  flyingParcels: 4,
  flyingCoins: 8,
  crashBursts: 6,
} as const;

/**
 * Rush promise ("加急承诺"): the player gambles that the current parcel lands
 * within the window. Success multiplies the points and adds a coin bonus;
 * failure costs time, the combo and a slice of review score.
 */
export const RUSH_PROMISE_WINDOW_SEC = 9.0;
export const RUSH_PROMISE_POINT_MULT = 1.3;
export const RUSH_PROMISE_COIN_BONUS = 25;
export const RUSH_PROMISE_FAIL_TIME_PENALTY_SEC = 5.0;
export const RUSH_PROMISE_FAIL_REVIEW_PENALTY = 0.1;

/** 2-Stage Drift Mini-Turbo thresholds & boost durations. */
export const DRIFT_TIER1_SEC = 0.55;
export const DRIFT_TIER2_SEC = 1.25;
export const DRIFT_BOOST_TIER1_SEC = 0.52;
export const DRIFT_BOOST_TIER2_SEC = 0.85;

/** World-unit proximity radius to trigger landmark discovery. */
export const LANDMARK_DISCOVERY_RADIUS = 3.4;
