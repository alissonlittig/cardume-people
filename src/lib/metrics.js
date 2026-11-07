export const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
export const months = (rows) => [...new Set(rows.map((r) => r.m))].sort();
export const pct = (n, d) => (d ? (n / d) * 100 : 0);

/** rows filtered by department ('all' or id) */
export const byDept = (rows, d) => (d === 'all' ? rows : rows.filter((r) => r.d === d));

/** one aggregate per month */
export function monthly(rows) {
  return months(rows).map((m) => {
    const r = rows.filter((x) => x.m === m);
    const hc0 = sum(r, (x) => x.hc0), hc1 = sum(r, (x) => x.hc1);
    const exits = sum(r, (x) => x.exits), abs = sum(r, (x) => x.abs);
    const avg = (hc0 + hc1) / 2;
    return {
      m, hc0, hc1, hires: sum(r, (x) => x.hires), exits, inv: sum(r, (x) => x.inv),
      turnover: pct(exits, avg),
      absence: pct(abs, sum(r, (x) => (x.hc0 + x.hc1) / 2 * x.wd)),
    };
  });
}

/** annualised turnover over a window = exits / avg headcount (sum of months) */
export const windowTurnover = (ms) => pct(sum(ms, (x) => x.exits), sum(ms, (x) => (x.hc0 + x.hc1) / 2) / ms.length);
export const windowAbsence = (rows, ms) => {
  const set = new Set(ms.map((x) => x.m));
  const r = rows.filter((x) => set.has(x.m));
  return pct(sum(r, (x) => x.abs), sum(r, (x) => (x.hc0 + x.hc1) / 2 * x.wd));
};

export function deptSummary(rows, depts, ms) {
  const set = new Set(ms.map((x) => x.m));
  return depts.map((d) => {
    const r = rows.filter((x) => x.d === d.id && set.has(x.m));
    const last = r[r.length - 1];
    const avgHc = sum(r, (x) => (x.hc0 + x.hc1) / 2) / (r.length || 1);
    return {
      ...d, hc: last ? last.hc1 : 0, hires: sum(r, (x) => x.hires), exits: sum(r, (x) => x.exits),
      turnover: pct(sum(r, (x) => x.exits), avgHc),
      absence: pct(sum(r, (x) => x.abs), sum(r, (x) => (x.hc0 + x.hc1) / 2 * x.wd)),
    };
  });
}

export function reasonTotals(rows, ms, reasons) {
  const set = new Set(ms.map((x) => x.m));
  const t = Object.fromEntries(reasons.map((r) => [r, 0]));
  rows.filter((x) => set.has(x.m)).forEach((x) => Object.entries(x.why).forEach(([k, v]) => (t[k] += v)));
  return Object.entries(t).sort((a, b) => b[1] - a[1]);
}

export function tenureTotals(rows, ms) {
  const set = new Set(ms.map((x) => x.m));
  const t = [0, 0, 0, 0];
  rows.filter((x) => set.has(x.m)).forEach((x) => x.ten.forEach((v, i) => (t[i] += v)));
  return t;
}

/** absence days by weekday share, per month (rows × 5) for the heatmap; values = days per 100 FTE */
export function weekdayHeat(rows, ms) {
  return ms.map((mo) => {
    const r = rows.filter((x) => x.m === mo.m);
    const avg = mo.hc0 / 2 + mo.hc1 / 2 || 1;
    return { m: mo.m, v: [0, 1, 2, 3, 4].map((i) => (sum(r, (x) => x.wk[i]) / avg) * 100) };
  });
}
