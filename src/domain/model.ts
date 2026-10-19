/**
 * Process model for the Line 3 virtual experiment.
 *
 * Stands in for a causal model fitted on 90 days of line data: scrap is
 * lowest around the optimal melt temperature and rises quadratically on both
 * sides; wet resin adds a constant offset. Fictional, but shaped like the real
 * relationship.
 */

export const OPTIMAL_TEMPERATURE = 212.5; // °C
export const BASE_SCRAP = 1.2; // % at the optimum with dry resin
export const TEMPERATURE_SENSITIVITY = 0.075; // % per °C²
export const WET_RESIN_PENALTY = 0.35; // % when the resin is not dried
export const SCRAP_TARGET = 2; // %, above this the recommendation warns

/** Parts per hour, material value per part and hours left in the shift (18:40 → 22:00). */
export const LINE_RATE = 9500;
export const PART_VALUE_CHF = 2.5;
export const HOURS_LEFT = 10 / 3;

/** Forecast settles with this time constant (in readings of 20 minutes). */
const SETTLING_READINGS = 1.6;

export interface ExperimentSettings {
  /** Zone 2 melt temperature in °C. */
  readonly temperature: number;
  /** Dry the resin lot before continuing. */
  readonly dryResin: boolean;
}

export const RECOMMENDED: ExperimentSettings = { temperature: 213, dryResin: true };

export const TEMPERATURE_RANGE = { min: 211, max: 219.5, step: 0.5, current: 219.2 } as const;

export function predictScrap({ temperature, dryResin }: ExperimentSettings): number {
  const deviation = temperature - OPTIMAL_TEMPERATURE;
  return BASE_SCRAP + TEMPERATURE_SENSITIVITY * deviation ** 2 + (dryResin ? 0 : WET_RESIN_PENALTY);
}

/**
 * Expected readings after the change: an exponential approach from the
 * latest reading to the predicted steady state.
 */
export function forecast(lastReading: number, target: number, steps: number): number[] {
  return Array.from({ length: steps }, (_, index) => {
    const value = target + (lastReading - target) * Math.exp(-(index + 1) / SETTLING_READINGS);
    return Math.round(value * 100) / 100;
  });
}

export interface Savings {
  readonly parts: number;
  readonly chf: number;
}

/** Parts and material saved until the end of the shift, rounded to tens. */
export function savingsUntilShiftEnd(currentScrap: number, predictedScrap: number): Savings {
  const partsLeft = LINE_RATE * HOURS_LEFT;
  const parts = Math.max(0, roundTo((partsLeft * (currentScrap - predictedScrap)) / 100, 10));
  return { parts, chf: roundTo(parts * PART_VALUE_CHF, 10) };
}

export function isRecommended(settings: ExperimentSettings): boolean {
  return (
    settings.temperature === RECOMMENDED.temperature && settings.dryResin === RECOMMENDED.dryResin
  );
}

export interface ControlLimits {
  readonly upper: number;
  readonly lower: number;
}

/** Shewhart ±3σ limits; the lower limit cannot be negative for a rate. */
export function controlLimits(mean: number, sigma: number): ControlLimits {
  return { upper: mean + 3 * sigma, lower: Math.max(0, mean - 3 * sigma) };
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
