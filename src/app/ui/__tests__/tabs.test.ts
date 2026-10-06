import { describe, it, expect } from 'vitest';
import { parseTab, withTab } from '../tabs';

const IDS = ['overview', 'cards', 'deck', 'battles', 'towers'] as const;

describe('parseTab', () => {
  it('returns a valid ?tab id', () => {
    expect(parseTab('?tab=battles', IDS, 'overview')).toBe('battles');
  });
  it('falls back when ?tab is missing, empty or unknown', () => {
    expect(parseTab('', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=brawlers', IDS, 'overview')).toBe('overview');
    expect(parseTab('?tab=%3Cscript%3E', IDS, 'overview')).toBe('overview');
  });
  it('ignores case and surrounding spaces', () => {
    expect(parseTab('?tab=%20Battles%20', IDS, 'overview')).toBe('battles');
  });
  it('reads ?tab among other parameters and takes the first one', () => {
    expect(parseTab('?ref=share&tab=deck&tab=cards', IDS, 'overview')).toBe('deck');
  });
});

describe('withTab', () => {
  it('sets the tab', () => {
    expect(withTab('', 'battles', 'overview')).toBe('?tab=battles');
  });
  it('drops the parameter for the default tab', () => {
    expect(withTab('?tab=battles', 'overview', 'overview')).toBe('');
  });
  it('keeps other parameters', () => {
    expect(withTab('?ref=share&tab=deck', 'cards', 'overview')).toBe('?ref=share&tab=cards');
    expect(withTab('?ref=share&tab=deck', 'overview', 'overview')).toBe('?ref=share');
  });
});
