import { describe, it, expect } from 'vitest';
import { Artifact } from './Artifact.js';

describe('Artifact', () => {
  it('stores id, name, effect, isActive', () => {
    const effect = { multiplier: 2 };
    const a = new Artifact('artifact-1', 'Lucky Crystal', effect, true);
    expect(a.id).toBe('artifact-1');
    expect(a.name).toBe('Lucky Crystal');
    expect(a.effect).toBe(effect);
    expect(a.isActive).toBe(true);
  });

  it('allows inactive artifact', () => {
    const a = new Artifact('a', 'Inactive', null, false);
    expect(a.isActive).toBe(false);
  });
});
