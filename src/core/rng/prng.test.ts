import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed } from './prng';
import { deriveStream } from './hash';

describe('mulberry32', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('is stable and distinguishes strings', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('deriveStream firewall', () => {
  it('gives identical streams for the same (seed, salt)', () => {
    const a = deriveStream('SEED', 'outcome');
    const b = deriveStream('SEED', 'outcome');
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('gives independent streams for different salts', () => {
    const outcome = deriveStream('SEED', 'outcome');
    const viz = deriveStream('SEED', 'viz');
    let anyDifferent = false;
    for (let i = 0; i < 20; i++) {
      if (outcome() !== viz()) anyDifferent = true;
    }
    expect(anyDifferent).toBe(true);
  });
});
