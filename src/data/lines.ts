import type { ProductionLine } from './types';

/** Reading timestamps of the current shift (every 20 minutes). */
export const SHIFT_TIMES = [
  '14:00', '14:20', '14:40', '15:00', '15:20', '15:40', '16:00', '16:20',
  '16:40', '17:00', '17:20', '17:40', '18:00', '18:20', '18:40',
] as const; // prettier-ignore

/** Forecast timestamps after "now". */
export const FORECAST_TIMES = ['19:00', '19:20', '19:40', '20:00', '20:20', '20:40'] as const;

export const SHIFT_CLOCK = 'Shift B · Fri 16 Oct, 18:40';

/**
 * Fictional plant. Values are invented but kept realistic for an extrusion,
 * a packaging and an injection-molding line.
 */
export const LINES: readonly ProductionLine[] = [
  {
    id: 'L3',
    name: 'Line 3 · Extrusion',
    product: 'Gasket profile EP-220',
    severity: 'crit',
    statusLabel: 'Out of control',
    headline: 'Scrap on Line 3 has tripled since 16:40',
    summary:
      'The rate left its normal range after a resin lot change. The main driver is a temperature drift in barrel zone 2.',
    metricLabel: 'Scrap rate',
    kpis: [
      {
        label: 'Scrap rate',
        value: '4.8 %',
        delta: '+3.3 pts vs. last 5 shifts',
        severity: 'crit',
      },
      {
        label: 'First-pass yield',
        value: '93.1 %',
        delta: '−3.9 pts vs. last 5 shifts',
        severity: 'crit',
      },
      {
        label: 'Parts lost this shift',
        value: '1,240',
        delta: '≈ CHF 3,100 material',
        severity: 'warn',
      },
    ],
    mean: 1.5,
    sigma: 0.42,
    readings: [1.4, 1.6, 1.3, 1.5, 1.7, 1.4, 1.6, 1.9, 2.6, 3.4, 3.9, 4.4, 4.6, 4.9, 4.8],
    causes: [
      {
        name: 'Barrel zone 2 temperature drift',
        detail: '219.2 °C, setpoint 215 °C',
        share: 71,
        evidence: [
          'Drift starts at 16:25, 15 minutes before scrap rises',
          'Same pattern in 3 earlier incidents on this line (Mar, Jun, Sep)',
          'Zones 1 and 3 stay within ±0.5 °C',
        ],
      },
      {
        name: 'Resin lot change to 24-118',
        detail: 'Moisture 0.08 %, spec ≤ 0.05 %',
        share: 19,
        evidence: [
          'Lot switched at 16:10',
          'Moisture value from incoming inspection on 12 Oct',
          'Wetter resin makes the melt more sensitive to temperature',
        ],
      },
      {
        name: 'Screw speed variance',
        detail: '±2.1 rpm, normal ±0.8 rpm',
        share: 6,
        evidence: [
          'Follows the melt change, so it is a symptom rather than a cause',
          'Keep watching, no action needed',
        ],
      },
    ],
    graph: {
      nodes: [
        { id: 'm', x: 20, y: 20, title: 'Resin moisture', value: '0.08 % · spec ≤ 0.05' },
        { id: 'z', x: 20, y: 170, title: 'Zone 2 temperature', value: '219.2 °C · set 215' },
        { id: 'v', x: 250, y: 95, title: 'Melt viscosity', value: '−6 % vs. normal' },
        { id: 's', x: 480, y: 95, title: 'Scrap rate', value: '4.8 %', isOutcome: true },
        {
          id: 'sp',
          x: 480,
          y: 190,
          title: 'Screw speed variance',
          value: '±2.1 rpm',
          isSymptom: true,
        },
      ],
      edges: [
        ['m', 'v', 19],
        ['z', 'v', 71],
        ['v', 's', 90],
        ['v', 'sp', 0],
      ],
    },
    hasExperiment: true,
    action: null,
  },
  {
    id: 'L2',
    name: 'Line 2 · Packaging',
    product: 'Blister pack BP-14',
    severity: 'warn',
    statusLabel: 'Watch',
    headline: 'Label rejects on Line 2 are trending upward',
    summary:
      'Still inside the control limits, but rising for five readings in a row. Plan a fix, no urgent action needed.',
    metricLabel: 'Label rejects',
    kpis: [
      {
        label: 'Reject rate',
        value: '1.3 %',
        delta: '+0.5 pts vs. last 5 shifts',
        severity: 'warn',
      },
      {
        label: 'First-pass yield',
        value: '98.4 %',
        delta: '−0.5 pts vs. last 5 shifts',
        severity: 'warn',
      },
      { label: 'Parts lost this shift', value: '310', delta: '≈ CHF 180 material', severity: 'ok' },
    ],
    mean: 0.8,
    sigma: 0.18,
    readings: [0.7, 0.8, 0.6, 0.8, 0.9, 0.7, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.3],
    causes: [
      {
        name: 'Label roll near the end of the spool',
        detail: 'Tension below 35 % of roll',
        share: 58,
        evidence: [
          'Same rise at the end of the previous two rolls',
          'Next roll change planned for 19:30',
        ],
      },
      {
        name: 'Camera 2 calibration age',
        detail: '9 days, target 7',
        share: 24,
        evidence: ['Small offset on the left edge only'],
      },
    ],
    graph: {
      nodes: [
        { id: 'r', x: 20, y: 20, title: 'Label roll tension', value: 'below 35 %' },
        { id: 'c', x: 20, y: 170, title: 'Camera 2 calibration', value: '9 days old' },
        { id: 'p', x: 250, y: 95, title: 'Label placement', value: '+0.6 mm offset' },
        { id: 'j', x: 480, y: 95, title: 'Reject rate', value: '1.3 %', isOutcome: true },
      ],
      edges: [
        ['r', 'p', 58],
        ['c', 'p', 24],
        ['p', 'j', 82],
      ],
    },
    hasExperiment: false,
    action: {
      title: 'Change the label roll at 19:30 as planned, then recalibrate camera 2',
      text: 'Expected effect: reject rate back to about 0.8 %. Low urgency, fits the planned roll change.',
      meta: 'Confidence: medium',
    },
  },
  {
    id: 'L1',
    name: 'Line 1 · Injection molding',
    product: 'Housing HM-08',
    severity: 'ok',
    statusLabel: 'Stable',
    headline: 'Line 1 is running within its normal range',
    summary: 'No deviations this shift. All monitored parameters are inside their limits.',
    metricLabel: 'Scrap rate',
    kpis: [
      { label: 'Scrap rate', value: '0.9 %', delta: '−0.1 pts vs. last 5 shifts', severity: 'ok' },
      {
        label: 'First-pass yield',
        value: '99.0 %',
        delta: '+0.2 pts vs. last 5 shifts',
        severity: 'ok',
      },
      { label: 'Parts lost this shift', value: '95', delta: '≈ CHF 60 material', severity: 'ok' },
    ],
    mean: 1.0,
    sigma: 0.2,
    readings: [1.0, 0.9, 1.1, 0.9, 1.0, 0.8, 1.0, 1.1, 0.9, 0.9, 1.0, 0.8, 0.9, 1.0, 0.9],
    causes: [],
    graph: null,
    hasExperiment: false,
    action: null,
  },
];
