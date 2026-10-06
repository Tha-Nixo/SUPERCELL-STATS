import { describe, it, expect } from 'vitest';
import { parseTab, shareSearch, withTab } from '../tabs';

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

describe('withTab with parameters to drop', () => {
  it('drops the leaving tab\'s parameters and keeps the rest', () => {
    expect(withTab('?tab=battles&mode=ladder&result=loss&ref=share', 'deck', 'overview', ['mode', 'result'])).toBe('?tab=deck&ref=share');
    expect(withTab('?tab=battles&result=loss', 'overview', 'overview', ['mode', 'result'])).toBe('');
  });
});

describe('shareSearch', () => {
  it('writes the tab first, then the given parameters, and nothing from the address bar', () => {
    expect(shareSearch('battles', 'overview', { mode: 'ladder', result: 'loss' })).toBe('?tab=battles&mode=ladder&result=loss');
  });
  it('is canonical for the default tab and does not copy the address bar', () => {
    expect(shareSearch('overview', 'overview')).toBe('');
    expect(shareSearch('deck', 'overview')).toBe('?tab=deck');
  });
  it('skips empty values', () => {
    expect(shareSearch('battles', 'overview', { mode: '' })).toBe('?tab=battles');
  });
});
