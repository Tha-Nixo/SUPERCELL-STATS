import { describe, it, expect } from 'vitest';
import { isPlausibleTag, tagProblem, tagSlug, TAG_HINT, TAG_LENGTH_HINT } from '../tag';
import { isValidTag, normalizeTag } from '../../services/supercellService';

const SAMPLES = ['#2PP', '2pp', '  #o2pp ', 'PCQRQ0LQ', '#ABC', '#2P', '#' + '2'.repeat(14), '#' + '2'.repeat(15), '', '#', 'yy-yy', '#PYLQGRJC'];

const ALLOWED = [...'0289PYLQGRJCUV'];
const EXCLUDED = [...'ABDEFHIKMNSTWXZ134567'];

describe('tag helpers', () => {
  it.each([...SAMPLES, ...ALLOWED.map((c) => `#22${c}`), ...EXCLUDED.map((c) => `#22${c}`), '#22o', '#22O', '#o2pp', '#22p'])(
    'agree with the API service on every charset letter: %j',
    (input) => {
      expect('#' + tagSlug(input)).toBe(normalizeTag(input));
      expect(isPlausibleTag(input)).toBe(isValidTag(input));
    },
  );

  it('accepts exactly the allowed charset', () => {
    for (const c of ALLOWED) expect(isValidTag(`#22${c}`)).toBe(true);
    for (const c of EXCLUDED) expect(isValidTag(`#22${c}`)).toBe(false);
    expect(isValidTag('#22o')).toBe(true);
    expect(isValidTag('#22p')).toBe(true);
  });

  it.each(SAMPLES)('agree with the API service for %j', (input) => {
    expect('#' + tagSlug(input)).toBe(normalizeTag(input));
    expect(isPlausibleTag(input)).toBe(isValidTag(input));
  });

  it('builds the bare URL slug', () => {
    expect(tagSlug('  #o2pp ')).toBe('02PP');
  });

  it('explains length separately from characters', () => {
    expect(tagProblem('#2PP')).toBeNull();
    expect(tagProblem('#2P')).toBe(TAG_LENGTH_HINT);
    expect(tagProblem('#' + '2'.repeat(15))).toBe(TAG_LENGTH_HINT);
    expect(tagProblem('#ABC')).toBe(TAG_HINT);
    expect(tagProblem('#AB')).toBe(TAG_HINT);
  });
});
