import { describe, it, expect } from 'vitest';
import { formatTokenAmount } from './tokens';

// What a merchant actually reads on the invoice, bot and MCP. A LatAm token
// must render in its own currency; anything unknown must degrade gracefully
// rather than throw or show a blank.
describe('formatTokenAmount', () => {
  it('formats a wFIAT token in its local currency', () => {
    const out = formatTokenAmount('wBRL', 1500);
    // Robust across ICU builds: it contains the amount and is not the plain
    // "<amount> <symbol>" fallback.
    expect(out).toMatch(/1.?500/);
    expect(out).not.toBe('1500 wBRL');
  });

  it('falls back to "<amount> <symbol>" for an unknown token', () => {
    expect(formatTokenAmount('NOPE', 10)).toBe('10 NOPE');
  });

  it('falls back when the amount is not a finite number', () => {
    expect(formatTokenAmount('wBRL', 'not-a-number')).toBe('not-a-number wBRL');
  });

  it('accepts a string amount', () => {
    const out = formatTokenAmount('wBRL', '1500');
    expect(out).toMatch(/1.?500/);
  });
});
