import { describe, expect, it } from 'vitest';

import { getAreaName, getDocArea } from '@/lib/docAreas.js';

describe('getDocArea', () => {
  it('uses the top-level folder of nested pages', () => {
    expect(getDocArea('Diagnostics/Individual-results/Score.md')).toBe('Diagnostics');
  });

  it('puts a root page in the same area as its folder', () => {
    expect(getDocArea('Diagnostics.md')).toBe('Diagnostics');
    expect(getDocArea('ECC.md')).toBe('ECC');
  });
});

describe('getAreaName', () => {
  it('decodes wiki names', () => {
    expect(getAreaName('Breakthrough-Execution-Software')).toBe('Breakthrough Execution Software');
    expect(getAreaName('Individual-%2D-Mane-Z')).toBe('Individual - Mane Z');
  });
});
