import { describe, expect, it } from 'vitest';
import { FORECAST_TIMES, LINES, SHIFT_TIMES } from '../data/lines';
import { buildCausalGraph } from './causalGraph';
import { buildControlChart, tooltipText } from './chart';
import { escapeHtml, formatNumber } from './format';

const line3 = LINES[0]!;
const line1 = LINES[2]!;
const labels = [...SHIFT_TIMES, ...FORECAST_TIMES];

function parse(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    'image/svg+xml',
  );
  return doc.documentElement as unknown as SVGSVGElement;
}

describe('buildControlChart', () => {
  it('marks the out-of-control span of a drifting line', () => {
    const chart = buildControlChart({ ...line3, labels, forecast: undefined });
    const outOfControl = chart.points.filter((point) => point.isOutOfControl);
    // UCL is 2.76 %: the drift starts at 16:40 (2.6 %) and crosses the limit at 17:00
    expect(outOfControl.map((point) => point.label)[0]).toBe('17:00');
    expect(outOfControl).toHaveLength(6);
    expect(parse(chart.svg).querySelectorAll('.band')).toHaveLength(1);
  });

  it('draws no band for a stable line', () => {
    const chart = buildControlChart({ ...line1, labels });
    expect(parse(chart.svg).querySelector('.band')).toBeNull();
    expect(chart.points.some((point) => point.isOutOfControl)).toBe(false);
  });

  it('appends the forecast after the last reading', () => {
    const chart = buildControlChart({ ...line3, labels, forecast: [3, 2, 1.5] });
    const svg = parse(chart.svg);
    expect(svg.querySelector('.forecast')).not.toBeNull();
    expect(chart.points).toHaveLength(line3.readings.length + 3);
    expect(chart.points.at(-1)).toMatchObject({ isForecast: true, label: '19:40', value: 1.5 });
    expect(svg.querySelectorAll('.hit')).toHaveLength(chart.points.length);
  });

  it('describes points for the tooltip', () => {
    const chart = buildControlChart({ ...line3, labels, forecast: [3] });
    expect(tooltipText(chart.points[14]!)).toBe('18:40 · 4.8 % · above limit');
    expect(tooltipText(chart.points[15]!)).toBe('19:00 · 3.0 % · forecast');
    expect(tooltipText(chart.points[0]!)).toBe('14:00 · 1.4 %');
  });
});

describe('buildCausalGraph', () => {
  it('draws every node and edge, with the outcome highlighted', () => {
    const svg = parse(buildCausalGraph(line3.graph!));
    expect(svg.querySelectorAll('.node')).toHaveLength(5);
    expect(svg.querySelectorAll('.edge')).toHaveLength(4);
    const outcome = [...svg.querySelectorAll('.node')].find(
      (node) => node.getAttribute('stroke') === 'var(--crit)',
    );
    expect(outcome).toBeDefined();
  });

  it('dashes links that carry no causal share', () => {
    const svg = parse(buildCausalGraph(line3.graph!));
    const dashed = [...svg.querySelectorAll('.edge')].filter((edge) =>
      edge.hasAttribute('stroke-dasharray'),
    );
    expect(dashed).toHaveLength(1);
  });

  it('rejects edges to unknown nodes', () => {
    expect(() => buildCausalGraph({ nodes: [], edges: [['a', 'b', 10]] })).toThrow(/Unknown node/);
  });
});

describe('format helpers', () => {
  it('formats numbers with fixed decimals', () => {
    expect(formatNumber(4.8)).toBe('4.8');
    expect(formatNumber(1240, 0)).toBe('1,240');
  });

  it('escapes markup', () => {
    expect(escapeHtml(`<b class="x">'&'</b>`)).toBe(
      '&lt;b class=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;',
    );
  });
});
