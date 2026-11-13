/**
 * src/game/rules.ts
 *
 * Public surface of the delivery-simulation layer. The implementation now lives in
 * src/game/sim/*, split by responsibility; this file keeps the historical import
 * path (`from './rules'`) and name set intact for existing callers.
 */

export * from './sim/geometry';
export * from './sim/truck';
export * from './sim/collision';
export * from './sim/traffic';
export * from './sim/pedestrians';
export * from './sim/hazards';
export * from './sim/delivery';
export * from './sim/scoring';
export * from './sim/countdown';
export * from './sim/cargo';

// Tuning values are owned by src/config/balance.ts and re-exported for compatibility.
export {
  AUTO_DROP_RADIUS,
  BOOST_COOLDOWN_MAX_SEC,
  BULLSEYE_PAD_RADIUS,
  COMBO_WINDOW_SEC,
  EXPRESS_TOSS_RADIUS,
  FEVER_COMBO_THRESHOLD,
  LARGE_MAX_UNLOAD_SPEED,
  LARGE_UNLOAD_RADIUS,
  MAX_CONCURRENT_SCOOTER_ATTACKS,
  ROCKET_START_BOOST_SEC,
  ROCKET_START_POINTS,
  RUSH_PROMISE_COIN_BONUS,
  RUSH_PROMISE_POINT_MULT,
  RUSH_PROMISE_WINDOW_SEC,
  SMALL_TOSS_RADIUS,
  TRUCK_BOOST_SPEED,
  TRUCK_MAX_SPEED,
  TRUCK_RADIUS,
  WRONG_WAY_LIMIT_SEC,
} from '../config/balance';
