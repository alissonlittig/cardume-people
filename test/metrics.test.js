import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { monthly, windowTurnover, deptSummary, byDept, reasonTotals, tenureTotals } from '../src/lib/metrics.js';

const data = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url)));
describe('dataset', () => {
  it('has 36 months x 6 departments', () => {
    expect(data.rows.length).toBe(216);
    expect(monthly(data.rows).length).toBe(36);
  });
  it('headcount rolls forward: hc0 of month n+1 == hc1 of month n', () => {
    const m = monthly(data.rows);
    for (let i = 1; i < m.length; i++) expect(m[i].hc0).toBe(m[i - 1].hc1);
  });
  it('hc1 = hc0 + hires - exits', () => {
    for (const r of data.rows) expect(r.hc1).toBe(r.hc0 + r.hires - r.exits);
  });
});
describe('metrics', () => {
  it('turnover math on a tiny sample', () => {
    const rows = [{ m: '2026-01', d: 'a', hc0: 100, hc1: 100, hires: 5, exits: 5, inv: 0, abs: 200, wd: 20, wk: [0, 0, 0, 0, 0], why: {}, ten: [0, 0, 0, 0] }];
    const [x] = monthly(rows);
    expect(x.turnover).toBeCloseTo(5);
    expect(x.absence).toBeCloseTo(10);
    expect(windowTurnover([x])).toBeCloseTo(5);
  });
  it('department filter and summaries are consistent', () => {
    const ms = monthly(data.rows).slice(-12);
    const s = deptSummary(data.rows, data.depts, ms);
    expect(s.length).toBe(6);
    expect(s.reduce((a, d) => a + d.exits, 0)).toBe(ms.reduce((a, m) => a + m.exits, 0));
    expect(byDept(data.rows, 'ops').every((r) => r.d === 'ops')).toBe(true);
  });
  it('reason and tenure totals equal total exits', () => {
    const ms = monthly(data.rows);
    const tot = ms.reduce((a, m) => a + m.exits, 0);
    expect(reasonTotals(data.rows, ms, data.reasons).reduce((a, [, v]) => a + v, 0)).toBe(tot);
    expect(tenureTotals(data.rows, ms).reduce((a, v) => a + v, 0)).toBe(tot);
  });
});
