import { describe, expect, it } from 'vitest';
import {
  BASE_SCRAP,
  OPTIMAL_TEMPERATURE,
  RECOMMENDED,
  WET_RESIN_PENALTY,
  controlLimits,
  forecast,
  isRecommended,
  predictScrap,
  savingsUntilShiftEnd,
} from './model';

describe('predictScrap', () => {
  it('is lowest at the optimal temperature with dry resin', () => {
    expect(predictScrap({ temperature: OPTIMAL_TEMPERATURE, dryResin: true })).toBe(BASE_SCRAP);
  });

  it('rises symmetrically on both sides of the optimum', () => {
    const below = predictScrap({ temperature: OPTIMAL_TEMPERATURE - 2, dryResin: true });
    const above = predictScrap({ temperature: OPTIMAL_TEMPERATURE + 2, dryResin: true });
    expect(below).toBeCloseTo(above);
    expect(below).toBeGreaterThan(BASE_SCRAP);
  });

  it('adds a penalty for wet resin', () => {
    const dry = predictScrap({ temperature: 214, dryResin: true });
    const wet = predictScrap({ temperature: 214, dryResin: false });
    expect(wet - dry).toBeCloseTo(WET_RESIN_PENALTY);
  });

  it('reproduces the current scrap level at the drifted temperature', () => {
    // Line 3 runs at 219.2 °C with wet resin and shows 4.8 % scrap.
    expect(predictScrap({ temperature: 219.2, dryResin: false })).toBeCloseTo(4.9, 1);
  });

  it('brings scrap under the 2 % target with the recommended settings', () => {
    expect(predictScrap(RECOMMENDED)).toBeLessThan(2);
  });
});

describe('forecast', () => {
  it('moves monotonically from the last reading towards the target', () => {
    const values = forecast(4.8, 1.2, 6);
    expect(values).toHaveLength(6);
    values.reduce((previous, value) => {
      expect(value).toBeLessThan(previous);
      expect(value).toBeGreaterThan(1.2);
      return value;
    }, 4.8);
    expect(values.at(-1)).toBeCloseTo(1.2, 0);
  });

  it('stays flat when already at the target', () => {
    expect(forecast(2, 2, 3)).toEqual([2, 2, 2]);
  });
});

describe('savingsUntilShiftEnd', () => {
  it('converts the scrap reduction into parts and material', () => {
    // 9,500 parts/h × 3⅓ h × 3.6 pts = 1,140 parts, × CHF 2.50
    expect(savingsUntilShiftEnd(4.8, 1.2)).toEqual({ parts: 1140, chf: 2850 });
  });

  it('never reports negative savings', () => {
    expect(savingsUntilShiftEnd(1.2, 4.8)).toEqual({ parts: 0, chf: 0 });
  });
});

describe('controlLimits', () => {
  it('uses ±3σ around the mean', () => {
    expect(controlLimits(1.5, 0.42)).toEqual({ upper: 1.5 + 1.26, lower: 1.5 - 1.26 });
  });

  it('clamps the lower limit at zero', () => {
    expect(controlLimits(0.5, 0.3).lower).toBe(0);
  });
});

describe('isRecommended', () => {
  it('recognizes the recommended settings only', () => {
    expect(isRecommended(RECOMMENDED)).toBe(true);
    expect(isRecommended({ ...RECOMMENDED, temperature: 214 })).toBe(false);
    expect(isRecommended({ ...RECOMMENDED, dryResin: false })).toBe(false);
  });
});
