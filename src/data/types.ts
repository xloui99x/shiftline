export type Severity = 'ok' | 'warn' | 'crit';

export interface Kpi {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly severity: Severity;
}

export interface Cause {
  readonly name: string;
  readonly detail: string;
  /** Contribution to the deviation in percent. */
  readonly share: number;
  readonly evidence: readonly string[];
}

export interface GraphNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly value: string;
  /** The observed outcome (drawn highlighted). */
  readonly isOutcome?: boolean;
  /** A symptom rather than a cause (drawn dimmed). */
  readonly isSymptom?: boolean;
}

/** [from, to, share in %]; a share of 0 marks a non-causal (dashed) link. */
export type GraphEdge = readonly [from: string, to: string, share: number];

export interface CausalGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

export interface StaticAction {
  readonly title: string;
  readonly text: string;
  readonly meta: string;
}

export interface ProductionLine {
  readonly id: string;
  readonly name: string;
  readonly product: string;
  readonly severity: Severity;
  readonly statusLabel: string;
  readonly headline: string;
  readonly summary: string;
  readonly metricLabel: string;
  readonly kpis: readonly Kpi[];
  /** Long-run process mean and standard deviation, in %. */
  readonly mean: number;
  readonly sigma: number;
  /** One reading per 20 minutes this shift, in %. */
  readonly readings: readonly number[];
  readonly causes: readonly Cause[];
  readonly graph: CausalGraph | null;
  /**
   * Lines with a tunable process parameter get a virtual experiment and a
   * computed recommendation; the others carry a fixed action (or none).
   */
  readonly hasExperiment: boolean;
  readonly action: StaticAction | null;
}
