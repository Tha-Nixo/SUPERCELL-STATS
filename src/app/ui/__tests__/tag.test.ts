import { describe, it, expect } from 'vitest';
import { isPlausibleTag, tagSlug } from '../tag';
import { isValidTag, normalizeTag } from '../../services/supercellService';

const SAMPLES = ['#2PP', '2pp', '  #o2pp ', 'PCQRQ0LQ', '#ABC', '#2P', '#' + '2'.repeat(14), '#' + '2'.repeat(15), '', '#', 'yy-yy', '#PYLQGRJC'];

describe('tag helpers', () => {
  it.each(SAMPLES)('agree with the API service for %j', (input) => {
    expect('#' + tagSlug(input)).toBe(normalizeTag(input));
    expect(isPlausibleTag(input)).toBe(isValidTag(input));
  });

  it('builds the bare URL slug', () => {
    expect(tagSlug('  #o2pp ')).toBe('02PP');
  });
});
