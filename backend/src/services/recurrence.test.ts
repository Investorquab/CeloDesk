import { describe, it, expect } from 'vitest';
import { computeNextRun } from './invoiceService';

// Recurring invoices run unattended on a timer. If the date math is wrong, a
// merchant either gets double-billed clients or silently stops recurring. The
// monthly case must track the calendar month, not a flat 30 days.
describe('computeNextRun', () => {
  it('adds 7 days for WEEKLY', () => {
    const next = computeNextRun('WEEKLY', new Date('2026-01-01T00:00:00Z'));
    expect(next?.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('adds 14 days for BIWEEKLY', () => {
    const next = computeNextRun('BIWEEKLY', new Date('2026-01-01T00:00:00Z'));
    expect(next?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });

  it('advances one calendar month for MONTHLY', () => {
    const next = computeNextRun('MONTHLY', new Date('2026-01-15T00:00:00Z'));
    expect(next?.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });

  it('crosses a year boundary for MONTHLY in December', () => {
    const next = computeNextRun('MONTHLY', new Date('2026-12-10T00:00:00Z'));
    expect(next?.getUTCFullYear()).toBe(2027);
    expect(next?.getUTCMonth()).toBe(0); // January
  });

  it('returns null for NONE', () => {
    expect(computeNextRun('NONE', new Date())).toBeNull();
  });

  it('does not mutate the input date', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    computeNextRun('WEEKLY', from);
    expect(from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
