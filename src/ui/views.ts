import type { Cause, Kpi, ProductionLine, StaticAction } from '../data/types';
import { savingsUntilShiftEnd, TEMPERATURE_RANGE, type ExperimentSettings } from '../domain/model';
import { escapeHtml as e, formatNumber } from './format';

/** HTML for the line selector on the left. */
export function railMarkup(lines: readonly ProductionLine[], selectedId: string): string {
  return lines
    .map(
      (line) =>
        `<button class="linebtn" role="tab" data-line="${e(line.id)}" aria-selected="${line.id === selectedId}">` +
        `<b>${e(line.name)}</b><span class="pill ${line.severity}">${e(line.statusLabel)}</span>` +
        `<small>${e(line.product)}</small></button>`,
    )
    .join('');
}

export function kpiMarkup(kpis: readonly Kpi[]): string {
  return kpis
    .map(
      (kpi) =>
        `<div class="kpi ${kpi.severity}"><label>${e(kpi.label)}</label>` +
        `<div class="v">${e(kpi.value)}</div><div class="d">${e(kpi.delta)}</div></div>`,
    )
    .join('');
}

export function causesMarkup(causes: readonly Cause[]): string {
  if (!causes.length) return '<p class="empty">No deviation to explain on this line right now.</p>';
  return causes
    .map((cause, index) => {
      const open = index === 0;
      return (
        `<div class="cause"><button aria-expanded="${open}" aria-controls="ev${index}" data-cause="${index}">` +
        `<span class="rank">#${index + 1}</span>` +
        `<span class="cname">${e(cause.name)}<small>${e(cause.detail)}</small></span>` +
        `<span class="pct">${cause.share} %</span><span></span>` +
        `<span class="bar"><div data-width="${cause.share}"></div></span></button>` +
        `<div class="evidence" id="ev${index}"${open ? '' : ' hidden'}><ul>` +
        cause.evidence.map((item) => `<li>${e(item)}</li>`).join('') +
        '</ul></div></div>'
      );
    })
    .join('');
}

export function experimentMarkup(line: ProductionLine, settings: ExperimentSettings): string {
  if (!line.hasExperiment) {
    const reason =
      line.severity === 'ok'
        ? `Nothing to test on ${line.name.split(' · ')[0] ?? 'this line'}. The process is stable.`
        : 'This deviation is fixed by a planned maintenance step, so there is no setpoint to test.';
    return `<p class="empty">${e(reason)}</p>`;
  }
  const { min, max, step, current } = TEMPERATURE_RANGE;
  return `<div class="exp">
    <div class="field">
      <div class="row"><label for="tempR">Zone 2 melt temperature</label><output id="tempO" for="tempR"></output></div>
      <input type="range" id="tempR" min="${min}" max="${max}" step="${step}" value="${settings.temperature}">
      <div class="scale"><span>${min} °C</span><span>now ${current} °C</span></div>
      <label class="chk" for="dryC"><input type="checkbox" id="dryC"${settings.dryResin ? ' checked' : ''}>
        <span>Dry resin lot 24-118 for 2 h at 80 °C<br><small style="color:var(--muted)">Brings moisture back under 0.05 %</small></span></label>
      <button class="linkbtn" id="resetExp" type="button">Reset to the recommended settings</button>
    </div>
    <div>
      <div class="results" id="results"></div>
      <p class="fine">Estimate from a causal model fitted on this line's last 90 days. The forecast in the chart and the recommendation below follow these settings. Fictional data.</p>
    </div></div>`;
}

export function resultsMarkup(currentScrap: number, predictedScrap: number): string {
  const { parts, chf } = savingsUntilShiftEnd(currentScrap, predictedScrap);
  const quality = predictedScrap < 2 ? 'good' : predictedScrap > 3 ? 'bad' : '';
  return (
    `<div class="res ${quality}"><label>Predicted scrap</label><div class="v">${formatNumber(predictedScrap)} %</div></div>` +
    `<div class="res"><label>Parts saved by 22:00</label><div class="v">${parts.toLocaleString('en-US')}</div></div>` +
    `<div class="res"><label>Material saved</label><div class="v">CHF ${chf.toLocaleString('en-US')}</div></div>`
  );
}

export interface ActionView {
  readonly action: StaticAction | null;
  readonly line: ProductionLine;
  readonly approved: boolean;
  readonly showWhy: boolean;
}

export function actionMarkup({ action, line, approved, showWhy }: ActionView): string {
  if (!action) {
    return `<p class="empty">Nothing to do on ${e(line.name.split(' · ')[0] ?? 'this line')}. Shiftline flags it here if a parameter starts to drift.</p>`;
  }
  if (approved) {
    return (
      `<div class="action"><h4>${e(action.title)}</h4>` +
      `<p class="done">Approved. The ${e(line.name.split(' · ')[0] ?? '')} crew has the instruction, and Shiftline will check the result at 20:30.</p>` +
      '<div class="btns"><button class="btn" data-action="undo">Undo approval</button></div></div>'
    );
  }
  return (
    `<div class="action"><h4>${e(action.title)}</h4><p>${e(action.text)}</p>` +
    '<div class="btns"><button class="btn primary" data-action="approve">Approve change</button>' +
    '<button class="btn" data-action="dismiss">Dismiss</button>' +
    (showWhy ? '<button class="linkbtn" data-action="why">See why</button>' : '') +
    '</div>' +
    '<div class="dismiss" id="whyNot" hidden><label for="reason">Why not?</label>' +
    '<select id="reason"><option>Already handled on the line</option><option>The cause looks wrong</option>' +
    '<option>Not possible during this shift</option></select>' +
    '<button class="btn" data-action="confirm-dismiss">Confirm dismiss</button></div></div>'
  );
}
