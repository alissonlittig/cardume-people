// Synthetic HR dataset for the fictional company "Marenco Logística". No real people.
import { writeFileSync } from 'node:fs';
let s = 20261107;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const depts = [
  { id: 'ops', name: 'Operations', start: 150, attr: 0.020, abs: 0.046 },
  { id: 'cs', name: 'Customer Care', start: 70, attr: 0.026, abs: 0.052 },
  { id: 'tech', name: 'Technology', start: 40, attr: 0.014, abs: 0.021 },
  { id: 'sales', name: 'Sales', start: 45, attr: 0.022, abs: 0.027 },
  { id: 'fin', name: 'Finance', start: 22, attr: 0.008, abs: 0.024 },
  { id: 'people', name: 'People & Culture', start: 14, attr: 0.010, abs: 0.022 },
];
const reasons = ['Better offer', 'Career growth', 'Relocation', 'Management', 'Workload', 'Personal', 'Performance', 'Restructuring'];
const involuntary = new Set(['Performance', 'Restructuring']);
const start = new Date(Date.UTC(2023, 11, 1)); // 36 months: Dec 2023 .. Nov 2026
const months = Array.from({ length: 36 }, (_, i) => new Date(Date.UTC(2023, 11 + i, 1)));
const ym = (d) => d.toISOString().slice(0, 7);
const workdays = (d) => { let n = 0; const m = d.getUTCMonth(), y = d.getUTCFullYear();
  for (let x = 1; x <= 31; x++) { const t = new Date(Date.UTC(y, m, x)); if (t.getUTCMonth() !== m) break; if (t.getUTCDay() % 6) n++; } return n; };
const buckets = ['<1y', '1-2y', '2-5y', '5y+'];
const bucket = (t) => (t < 12 ? 0 : t < 24 ? 1 : t < 60 ? 2 : 3);
// employees: tenure (months) per person, per dept
const people = [];
for (const d of depts) for (let i = 0; i < d.start; i++) people.push({ d: d.id, ten: Math.floor(rnd() * rnd() * 90) + 1 });
const rows = [];
const season = (m) => [1.1, 0.9, 0.95, 0.9, 0.95, 1, 1.05, 1.0, 1.0, 1.1, 1.25, 1.35][m]; // flu & year-end peaks
const target = { ops: 1.0008, cs: 1.0, tech: 1.0125, sales: 1.004, fin: 1.002, people: 1.006 };
months.forEach((m, mi) => {
  const wd = workdays(m);
  for (const d of depts) {
    const mine = people.filter((p) => p.d === d.id);
    const hc0 = mine.length;
    const drift = 1 + (mi > 22 && d.id === 'cs' ? 0.012 : 0) + (mi > 28 && d.id === 'ops' ? 0.006 : 0);
    const exits = []; const keep = [];
    for (const p of mine) {
      const prob = d.attr * drift * (p.ten < 12 ? 1.8 : p.ten > 60 ? 0.5 : 1) * (m.getUTCMonth() === 0 || m.getUTCMonth() === 6 ? 1.4 : 1);
      if (rnd() < prob) exits.push(p); else keep.push(p);
    }
    const exitReasons = {}; const tb = [0, 0, 0, 0]; let inv = 0;
    for (const p of exits) {
      const r = d.id === 'cs' && rnd() < 0.3 ? 'Workload' : mi === 20 && d.id === 'sales' && rnd() < 0.6 ? 'Restructuring' : pick(reasons);
      exitReasons[r] = (exitReasons[r] || 0) + 1; tb[bucket(p.ten)]++; if (involuntary.has(r)) inv++;
    }
    const wantHc = Math.round(hc0 * target[d.id]);
    const hires = Math.max(0, wantHc - keep.length + Math.floor(rnd() * 2));
    for (const p of keep) p.ten++;
    for (let i = 0; i < hires; i++) keep.push({ d: d.id, ten: 0 });
    people.splice(0, people.length, ...people.filter((p) => p.d !== d.id), ...keep);
    const hc1 = keep.length;
    const avg = (hc0 + hc1) / 2;
    const absDays = Math.round(avg * wd * d.abs * season(m.getUTCMonth()) * (0.9 + rnd() * 0.2));
    const w = [1.25, 0.9, 0.85, 0.9, 1.1].map((x) => x * (0.9 + rnd() * 0.2)); const ws = w.reduce((a, b) => a + b);
    rows.push({ m: ym(m), d: d.id, hc0, hc1, hires, exits: exits.length, inv, abs: absDays, wd, wk: w.map((x) => Math.round((absDays * x) / ws)), why: exitReasons, ten: tb });
  }
});
writeFileSync(new URL('../public/data.json', import.meta.url), JSON.stringify({ company: 'Marenco Logística (fictional)', buckets, depts: depts.map(({ id, name }) => ({ id, name })), reasons, rows }));
console.log('rows', rows.length, 'final hc', rows.filter((r) => r.m === '2026-11').reduce((a, r) => a + r.hc1, 0));
