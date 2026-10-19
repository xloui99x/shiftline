import { describe, expect, it } from 'vitest';
import { LINES } from '../data/lines';
import { RECOMMENDED } from './model';
import { recommendationFor } from './recommendation';

const [line3, line2, line1] = LINES;

describe('recommendationFor', () => {
  it('recommends the tested settings with high confidence', () => {
    const action = recommendationFor(line3!, RECOMMENDED);
    expect(action?.title).toBe(
      'Lower zone 2 to 213.0 °C and dry resin lot 24-118 for 2 h at 80 °C',
    );
    expect(action?.text).toContain('scrap back to about 1.2 %');
    expect(action?.meta).toBe('Confidence: high · recommended');
  });

  it('warns when the adjusted settings miss the target', () => {
    const action = recommendationFor(line3!, { temperature: 218, dryResin: false });
    expect(action?.title).toBe('Lower zone 2 to 218.0 °C');
    expect(action?.text).toContain('still above the 2 % target');
    expect(action?.text).toContain('or drying the resin');
    expect(action?.meta).toBe('Adjusted in the virtual experiment');
  });

  it('uses the fixed action for lines without an experiment', () => {
    expect(recommendationFor(line2!, RECOMMENDED)).toBe(line2!.action);
    expect(recommendationFor(line1!, RECOMMENDED)).toBeNull();
  });
});
