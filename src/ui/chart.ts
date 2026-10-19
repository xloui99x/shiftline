import { controlLimits } from '../domain/model';
import { escapeHtml, formatNumber } from './format';

export const CHART_WIDTH = 720;
export const CHART_HEIGHT = 270;
const MARGIN = { left: 46, right: 18, top: 22, bottom: 30 } as const;
const MONO = 'font-family="IBM Plex Mono, monospace"';

export interface ChartInput {
  readonly readings: readonly number[];
  readonly labels: readonly string[];
  readonly mean: number;
  readonly sigma: number;
  /** Forecast after "now", appended to the readings; labels must cover both. */
  readonly forecast?: readonly number[] | undefined;
}

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  readonly label: string;
  readonly isForecast: boolean;
  readonly isOutOfControl: boolean;
}

export interface ChartModel {
  readonly svg: string;
  readonly points: readonly ChartPoint[];
}

/**
 * Control chart (Shewhart): readings, ±3σ limits, the out-of-control span
 * as a band and an optional dashed forecast. Returns SVG markup plus the
 * point geometry for tooltips.
 */
export function buildControlChart({
  readings,
  labels,
  mean,
  sigma,
  forecast = [],
}: ChartInput): ChartModel {
  const values = [...readings, ...forecast];
  const { upper, lower } = controlLimits(mean, sigma);
  const maxValue = Math.max(upper, ...values) * 1.15;

  const plotWidth = CHART_WIDTH - MARGIN.left - MARGIN.right;
  const plotBottom = CHART_HEIGHT - MARGIN.bottom;
  const plotHeight = plotBottom - MARGIN.top;
  const x = (index: number) => MARGIN.left + (index * plotWidth) / Math.max(1, values.length - 1);
  const y = (value: number) => plotBottom - (value / maxValue) * plotHeight;
  const lastReading = readings.length - 1;

  const parts: string[] = [];

  // Grid and axes
  const step = gridStep(maxValue);
  for (let value = 0; value <= maxValue + 1e-9; value += step) {
    const v = Number(value.toFixed(2));
    parts.push(
      `<line x1="${MARGIN.left}" x2="${CHART_WIDTH - MARGIN.right}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>`,
      `<text x="${MARGIN.left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" ${MONO}>${v}%</text>`,
    );
  }
  labels.slice(0, values.length).forEach((label, index) => {
    if (index % 2 === 0) {
      parts.push(
        `<text x="${x(index)}" y="${CHART_HEIGHT - 8}" text-anchor="middle" font-size="11" fill="var(--muted)" ${MONO}>${escapeHtml(label)}</text>`,
      );
    }
  });

  // Out-of-control band, from the first to the last reading above the limit
  const outOfControl = readings.flatMap((value, index) => (value > upper ? [index] : []));
  const first = outOfControl[0];
  const last = outOfControl.at(-1);
  if (first !== undefined && last !== undefined) {
    const left = x(first) - 10;
    parts.push(
      `<rect class="band" x="${left}" y="${MARGIN.top}" width="${x(last) + 10 - left}" height="${plotHeight}" fill="var(--crit-soft)"/>`,
    );
  }

  if (forecast.length) {
    const nowX = x(lastReading);
    parts.push(
      `<line x1="${nowX}" x2="${nowX}" y1="${MARGIN.top - 6}" y2="${plotBottom}" stroke="var(--muted)" stroke-width="1"/>`,
      `<text x="${nowX + 6}" y="${MARGIN.top + 4}" font-size="11" fill="var(--muted)" ${MONO}>now</text>`,
    );
  }

  // Control limits
  parts.push(
    `<line class="ucl" x1="${MARGIN.left}" x2="${CHART_WIDTH - MARGIN.right}" y1="${y(upper)}" y2="${y(upper)}" stroke="var(--muted)" stroke-dasharray="5 4"/>`,
    `<text x="${MARGIN.left + 6}" y="${y(upper) - 6}" font-size="10" fill="var(--muted)" ${MONO}>UCL ${upper.toFixed(2)} %</text>`,
  );
  if (lower > 0) {
    parts.push(
      `<line class="lcl" x1="${MARGIN.left}" x2="${CHART_WIDTH - MARGIN.right}" y1="${y(lower)}" y2="${y(lower)}" stroke="var(--muted)" stroke-dasharray="5 4"/>`,
    );
  }

  // Measured series with area
  const measured = readings.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  parts.push(
    `<polygon points="${x(0)},${y(0)} ${measured} ${x(lastReading)},${y(0)}" fill="var(--accent-soft)" opacity=".65"/>`,
    `<polyline class="measured" points="${measured}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`,
  );

  // Forecast series, starting at the latest reading
  if (forecast.length) {
    const lastValue = readings[lastReading] ?? 0;
    const path = [
      `${x(lastReading)},${y(lastValue)}`,
      ...forecast.map((value, k) => `${x(lastReading + k + 1)},${y(value)}`),
    ].join(' ');
    parts.push(
      `<polyline class="forecast" points="${path}" fill="none" stroke="var(--ok)" stroke-width="2.5" stroke-dasharray="6 5" stroke-linejoin="round"/>`,
      ...forecast.map(
        (value, k) =>
          `<circle cx="${x(lastReading + k + 1)}" cy="${y(value)}" r="3" fill="var(--surface)" stroke="var(--ok)" stroke-width="2"/>`,
      ),
    );
  }

  // Markers: out-of-control readings in red, the latest one larger
  readings.forEach((value, index) => {
    const bad = value > upper;
    const isLast = index === lastReading;
    parts.push(
      `<circle cx="${x(index)}" cy="${y(value)}" r="${isLast ? 5.5 : bad ? 4.5 : 3}" fill="${bad ? 'var(--crit)' : 'var(--accent)'}" stroke="var(--surface)" stroke-width="${isLast ? 2 : 0}"/>`,
    );
  });

  // Invisible hit areas for tooltips
  values.forEach((_, index) => {
    parts.push(
      `<rect class="hit" data-index="${index}" x="${x(index) - 14}" y="${MARGIN.top}" width="28" height="${plotHeight}" fill="transparent"/>`,
    );
  });

  const points = values.map<ChartPoint>((value, index) => ({
    x: x(index),
    y: y(value),
    value,
    label: labels[index] ?? '',
    isForecast: index > lastReading,
    isOutOfControl: index <= lastReading && value > upper,
  }));

  return { svg: parts.join(''), points };
}

export function tooltipText(point: ChartPoint): string {
  const suffix = point.isForecast ? ' · forecast' : point.isOutOfControl ? ' · above limit' : '';
  return `${point.label} · ${formatNumber(point.value)} %${suffix}`;
}

function gridStep(maxValue: number): number {
  if (maxValue > 3) return 1;
  if (maxValue > 1.5) return 0.5;
  return 0.25;
}
