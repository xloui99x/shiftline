import type { ProductionLine, StaticAction } from '../data/types';
import { formatNumber } from '../ui/format';
import { SCRAP_TARGET, isRecommended, predictScrap, type ExperimentSettings } from './model';

/**
 * The next step shown to the shift lead. For lines with an experiment it is
 * computed from the current settings, so it always matches the forecast.
 */
export function recommendationFor(
  line: ProductionLine,
  settings: ExperimentSettings,
): StaticAction | null {
  if (!line.hasExperiment) return line.action;

  const predicted = formatNumber(predictScrap(settings));
  const title =
    `Lower zone 2 to ${formatNumber(settings.temperature)} °C` +
    (settings.dryResin ? ' and dry resin lot 24-118 for 2 h at 80 °C' : '');

  const text =
    predictScrap(settings) < SCRAP_TARGET
      ? `Expected effect: scrap back to about ${predicted} % within 90 minutes, as in the three earlier incidents. Check a sample at 20:30.`
      : `Expected effect: scrap only drops to about ${predicted} %, still above the ${SCRAP_TARGET} % target. Consider a lower temperature${settings.dryResin ? '' : ' or drying the resin'}.`;

  const meta = isRecommended(settings)
    ? 'Confidence: high · recommended'
    : 'Adjusted in the virtual experiment';

  return { title, text, meta };
}
