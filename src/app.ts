import { FORECAST_TIMES, LINES, SHIFT_TIMES } from './data/lines';
import type { ProductionLine } from './data/types';
import { RECOMMENDED, forecast, predictScrap, type ExperimentSettings } from './domain/model';
import { recommendationFor } from './domain/recommendation';
import { buildCausalGraph } from './ui/causalGraph';
import {
  CHART_HEIGHT,
  CHART_WIDTH,
  buildControlChart,
  tooltipText,
  type ChartPoint,
} from './ui/chart';
import { formatNumber } from './ui/format';
import {
  actionMarkup,
  causesMarkup,
  experimentMarkup,
  kpiMarkup,
  railMarkup,
  resultsMarkup,
} from './ui/views';

export type Role = 'frontline' | 'expert';

interface State {
  line: ProductionLine;
  role: Role;
  settings: ExperimentSettings;
  /** Approval per line id, reset whenever the settings change. */
  approved: Record<string, boolean>;
  notesVisible: boolean;
}

export interface AppOptions {
  /** Disable animations (tests, reduced motion). */
  readonly reduceMotion?: boolean;
  readonly lines?: readonly ProductionLine[];
}

/**
 * Mounts Shiftline into the markup of index.html.
 * Returns a small handle so tests can drive and inspect the app.
 */
export function mountApp(root: HTMLElement, options: AppOptions = {}) {
  const lines = options.lines ?? LINES;
  const firstLine = lines[0];
  if (!firstLine) throw new Error('Shiftline needs at least one production line');

  const reduceMotion =
    options.reduceMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state: State = {
    line: firstLine,
    role: 'frontline',
    settings: { ...RECOMMENDED },
    approved: {},
    notesVisible: false,
  };

  const doc = root.ownerDocument;
  const $ = (selector: string): HTMLElement => {
    const element = doc.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing element ${selector}`);
    return element;
  };
  const $svg = (selector: string): SVGSVGElement => {
    const element = doc.querySelector<SVGSVGElement>(selector);
    if (!element) throw new Error(`Missing element ${selector}`);
    return element;
  };

  let chartPoints: readonly ChartPoint[] = [];
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  // ── Rendering ───────────────────────────────────────────────────────────

  function currentForecast(): number[] | undefined {
    if (!state.line.hasExperiment) return undefined;
    const last = state.line.readings.at(-1) ?? 0;
    return forecast(last, predictScrap(state.settings), FORECAST_TIMES.length);
  }

  function renderRail() {
    $('#lines').innerHTML = railMarkup(lines, state.line.id);
  }

  function renderHeadline() {
    $('#headline').textContent = state.line.headline;
    $('#sub').textContent = state.line.summary;
    $('#kpis').innerHTML = kpiMarkup(state.line.kpis);
    $('#chartTitle').textContent = `${state.line.metricLabel} this shift`;
  }

  function renderChart(animate: boolean) {
    const projected = currentForecast();
    $('#lg-proj').hidden = !projected;
    const chart = buildControlChart({
      readings: state.line.readings,
      labels: [...SHIFT_TIMES, ...FORECAST_TIMES],
      mean: state.line.mean,
      sigma: state.line.sigma,
      forecast: projected,
    });
    chartPoints = chart.points;
    const svg = $svg('#chart');
    svg.innerHTML = chart.svg;

    const line = svg.querySelector<SVGPolylineElement>('.measured');
    if (animate && !reduceMotion && line && typeof line.getTotalLength === 'function') {
      const length = line.getTotalLength();
      line.style.strokeDasharray = String(length);
      line.style.strokeDashoffset = String(length);
      line.getBoundingClientRect(); // force layout so the transition starts from the hidden state
      line.style.transition = 'stroke-dashoffset .9s ease-out';
      line.style.strokeDashoffset = '0';
    }
  }

  function renderCauses() {
    const causes = $('#causes');
    causes.innerHTML = causesMarkup(state.line.causes);
    const graph = state.line.graph;
    $('#graphbox').hidden = !graph;
    $('#graph').innerHTML = graph ? buildCausalGraph(graph) : '';
    // Animate the contribution bars from 0 on the next frame.
    requestAnimationFrame(() => {
      causes.querySelectorAll<HTMLElement>('.bar div').forEach((bar) => {
        bar.style.width = `${bar.dataset.width ?? '0'}%`;
      });
    });
  }

  function renderExperiment() {
    $('#expMeta').textContent = state.line.hasExperiment
      ? 'Test a change before it reaches the line'
      : '';
    $('#exp').innerHTML = experimentMarkup(state.line, state.settings);
    renderResults();
  }

  function renderResults() {
    if (!state.line.hasExperiment) return;
    $('#tempO').textContent = `${formatNumber(state.settings.temperature)} °C`;
    $('#results').innerHTML = resultsMarkup(
      state.line.readings.at(-1) ?? 0,
      predictScrap(state.settings),
    );
  }

  function renderAction() {
    const action = recommendationFor(state.line, state.settings);
    $('#actionMeta').textContent = action?.meta ?? '';
    $('#action').innerHTML = actionMarkup({
      action,
      line: state.line,
      approved: state.approved[state.line.id] === true,
      showWhy: state.role === 'frontline' && state.line.hasExperiment,
    });
  }

  function renderRole() {
    const app = $('#app');
    app.classList.toggle('expert', state.role === 'expert');
    app.classList.toggle('frontline', state.role === 'frontline');
    $('#r-front').setAttribute('aria-pressed', String(state.role === 'frontline'));
    $('#r-exp').setAttribute('aria-pressed', String(state.role === 'expert'));
  }

  function renderAll() {
    renderRail();
    renderHeadline();
    renderChart(true);
    renderCauses();
    renderExperiment();
    renderAction();
    renderRole();
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  function selectLine(id: string) {
    const next = lines.find((line) => line.id === id);
    if (!next || next === state.line) return;
    state.line = next;
    renderAll();
  }

  function setRole(role: Role) {
    state.role = role;
    renderRole();
    renderAction();
  }

  function updateSettings(settings: ExperimentSettings) {
    state.settings = settings;
    state.approved[state.line.id] = false;
    renderResults();
    renderChart(false);
    renderAction();
  }

  function toast(message: string) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2600);
  }

  // ── Events (delegated, so re-rendered markup needs no re-binding) ───────

  $('#lines').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-line]');
    if (button?.dataset.line) selectLine(button.dataset.line);
  });

  $('#r-front').addEventListener('click', () => setRole('frontline'));
  $('#r-exp').addEventListener('click', () => setRole('expert'));

  $('#notesBtn').addEventListener('click', (event) => {
    state.notesVisible = !state.notesVisible;
    $('#app').classList.toggle('notes-on', state.notesVisible);
    const button = event.currentTarget as HTMLElement;
    button.setAttribute('aria-pressed', String(state.notesVisible));
    button.textContent = state.notesVisible ? 'Hide design notes' : 'Show design notes';
  });

  $('#causes').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-cause]');
    if (!button) return;
    const evidence = doc.getElementById(button.getAttribute('aria-controls') ?? '');
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    if (evidence) evidence.hidden = open;
  });

  const experiment = $('#exp');
  experiment.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.id === 'tempR') {
      updateSettings({ ...state.settings, temperature: Number(target.value) });
    }
  });
  experiment.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.id === 'dryC') updateSettings({ ...state.settings, dryResin: target.checked });
  });
  experiment.addEventListener('click', (event) => {
    if ((event.target as Element).closest('#resetExp')) {
      state.settings = { ...RECOMMENDED };
      renderExperiment();
      updateSettings(state.settings);
    }
  });

  $('#action').addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLElement>('[data-action]');
    switch (button?.dataset.action) {
      case 'approve':
        state.approved[state.line.id] = true;
        renderAction();
        toast('Change approved');
        break;
      case 'undo':
        state.approved[state.line.id] = false;
        renderAction();
        break;
      case 'dismiss':
        $('#whyNot').hidden = false;
        break;
      case 'confirm-dismiss':
        $('#whyNot').hidden = true;
        toast('Dismissed. Your reason improves future recommendations');
        break;
      case 'why':
        setRole('expert');
        break;
    }
  });

  // Tooltip on the chart
  const svg = $svg('#chart');
  const tip = $('#tip');
  const box = $('#chartbox');
  svg.addEventListener('mouseover', (event) => {
    const hit = (event.target as Element).closest<SVGRectElement>('.hit');
    const point = hit ? chartPoints[Number(hit.dataset.index)] : undefined;
    if (!point) return;
    const svgRect = svg.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    tip.textContent = tooltipText(point);
    tip.style.left = `${svgRect.left - boxRect.left + box.scrollLeft + (point.x * svgRect.width) / CHART_WIDTH}px`;
    tip.style.top = `${(point.y * svgRect.height) / CHART_HEIGHT}px`;
    tip.hidden = false;
  });
  svg.addEventListener('mouseleave', () => {
    tip.hidden = true;
  });

  renderAll();

  return {
    get state(): Readonly<State> {
      return state;
    },
    selectLine,
    setRole,
  };
}
