<script>
  import Chart from './lib/Chart.svelte';
  import { monthly, byDept, windowTurnover, windowAbsence, deptSummary, reasonTotals, tenureTotals, weekdayHeat, sum } from './lib/metrics.js';

  let data = $state(null);
  let dept = $state('all');
  let span = $state(12);
  let err = $state('');
  fetch('./data.json').then((r) => r.json()).then((d) => (data = d)).catch((e) => (err = String(e)));

  const PAL = ['#1f7a74', '#e4572e', '#f2b84b', '#3b5b92', '#8a6fb0', '#7a8f3a'];
  const fmt = new Intl.NumberFormat('en-US');
  const f1 = (n) => n.toFixed(1);
  const lab = (m) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

  const rows = $derived(data ? byDept(data.rows, dept) : []);
  const allM = $derived(monthly(rows));
  const ms = $derived(allM.slice(-span));
  const prev = $derived(allM.slice(-span * 2, -span));
  const cur = $derived(ms[ms.length - 1]);
  const hcDelta = $derived(cur ? cur.hc1 - ms[0].hc0 : 0);
  const to = $derived(windowTurnover(ms));
  const toPrev = $derived(prev.length === span ? windowTurnover(prev) : null);
  const ab = $derived(windowAbsence(rows, ms));
  const abPrev = $derived(prev.length === span ? windowAbsence(rows, prev) : null);
  const tenure = $derived(tenureTotals(rows, ms));
  const reasons = $derived(data ? reasonTotals(rows, ms, data.reasons) : []);
  const summary = $derived(data ? deptSummary(data.rows, data.depts, ms) : []);
  const heat = $derived(weekdayHeat(rows, ms.slice(-12)));
  const heatMax = $derived(Math.max(1, ...heat.flatMap((h) => h.v)));
  const hires = $derived(sum(ms, (x) => x.hires));
  const exits = $derived(sum(ms, (x) => x.exits));
  const earlyShare = $derived(exits ? (tenure[0] / exits) * 100 : 0);
  const worst = $derived([...summary].sort((a, b) => b.turnover - a.turnover)[0]);
  const worstAbs = $derived([...summary].sort((a, b) => b.absence - a.absence)[0]);
  const deptName = $derived(dept === 'all' || !data ? 'all departments' : data.depts.find((d) => d.id === dept).name);

  const grid = { color: 'rgba(15,42,46,.07)' };
  const base = { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } } };

  const hcCfg = $derived({
    type: 'line',
    data: { labels: ms.map((x) => lab(x.m)), datasets: [{ label: 'Headcount', data: ms.map((x) => x.hc1), borderColor: '#0f2a2e', backgroundColor: 'rgba(31,122,116,.16)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5 }] },
    options: { plugins: { legend: { display: false } }, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { grid, ticks: { maxTicksLimit: 5 } } } },
  });
  const flowCfg = $derived({
    type: 'bar',
    data: { labels: ms.map((x) => lab(x.m)), datasets: [
      { type: 'bar', label: 'Hires', data: ms.map((x) => x.hires), backgroundColor: '#1f7a74', borderRadius: 3, yAxisID: 'y', order: 2 },
      { type: 'bar', label: 'Exits', data: ms.map((x) => -x.exits), backgroundColor: '#e4572e', borderRadius: 3, yAxisID: 'y', order: 2 },
      { type: 'line', label: 'Monthly turnover %', data: ms.map((x) => +x.turnover.toFixed(2)), borderColor: '#0f2a2e', pointRadius: 0, borderWidth: 2, tension: 0.3, yAxisID: 'y1', order: 1 },
    ] },
    options: { ...base, interaction: { mode: 'index', intersect: false }, scales: { x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { stacked: true, grid, ticks: { maxTicksLimit: 5 } }, y1: { position: 'right', grid: { display: false }, ticks: { callback: (v) => v + '%', maxTicksLimit: 5 }, min: 0 } } },
  });
  const absCfg = $derived({
    type: 'bar',
    data: { labels: summary.map((d) => d.name), datasets: [{ label: 'Absenteeism %', data: summary.map((d) => +d.absence.toFixed(2)), backgroundColor: summary.map((d) => (dept === 'all' || d.id === dept ? '#3b5b92' : 'rgba(59,91,146,.25)')), borderRadius: 4 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid, ticks: { callback: (v) => v + '%', maxTicksLimit: 5 } }, y: { grid: { display: false } } } },
  });
  const absTrendCfg = $derived({
    type: 'line',
    data: { labels: ms.map((x) => lab(x.m)), datasets: [{ label: 'Absenteeism %', data: ms.map((x) => +x.absence.toFixed(2)), borderColor: '#3b5b92', backgroundColor: 'rgba(59,91,146,.12)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2.5 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { grid, ticks: { callback: (v) => v + '%', maxTicksLimit: 5 } } } },
  });
  const reasonCfg = $derived({
    type: 'doughnut',
    data: { labels: reasons.map((r) => r[0]), datasets: [{ data: reasons.map((r) => r[1]), backgroundColor: ['#0f2a2e', '#1f7a74', '#e4572e', '#f2b84b', '#3b5b92', '#8a6fb0', '#7a8f3a', '#b9c3c0'], borderWidth: 2, borderColor: '#fffdf8' }] },
    options: { cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } } },
  });
  const tenureCfg = $derived({
    type: 'bar',
    data: { labels: data ? data.buckets : [], datasets: [{ label: 'Exits', data: tenure, backgroundColor: ['#e4572e', '#f2b84b', '#1f7a74', '#0f2a2e'], borderRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid, ticks: { maxTicksLimit: 5 } } } },
  });
  const heatBg = (v) => `rgba(228,87,46,${(0.08 + (v / heatMax) * 0.85).toFixed(2)})`;
  const arrow = (a, b) => (b == null ? '' : a > b ? '▲' : '▼');
  const delta = (a, b) => (b == null ? 'no prior period' : `${a > b ? '+' : ''}${(a - b).toFixed(1)} pts vs prior ${span} mo`);
  const pick = (id) => (dept = dept === id ? 'all' : id);
</script>

<a class="skip" href="#main">Skip to dashboard</a>
<header class="top">
  <div class="brand">
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0f2a2e" /><path d="M6 17c4-7 9-7 13 0-4 7-9 7-13 0zm14 0l6-5v10z" fill="#f2b84b" /></svg>
    <div><b>Cardume</b><span>People Analytics</span></div>
  </div>
  <div class="filters">
    <label>Department
      <select bind:value={dept}>
        <option value="all">All departments</option>
        {#if data}{#each data.depts as d}<option value={d.id}>{d.name}</option>{/each}{/if}
      </select>
    </label>
    <div class="seg" role="group" aria-label="Period">
      {#each [6, 12, 24] as n}<button class:on={span === n} aria-pressed={span === n} onclick={() => (span = n)}>{n} mo</button>{/each}
    </div>
  </div>
</header>

<main id="main">
  <section class="hero">
    <p class="eyebrow">Marenco Logística · fictional company · synthetic data</p>
    <h1>Who we are, who stays, and who is out.</h1>
    {#if cur}<p class="lede">{fmt.format(cur.hc1)} people today ({deptName}). Over the last {span} months we hired {hires} and lost {exits}; {f1(earlyShare)}% of exits had under a year of tenure. {worst.name} has the highest turnover ({f1(worst.turnover)}%), {worstAbs.name} the highest absenteeism ({f1(worstAbs.absence)}%).</p>{/if}
  </section>

  {#if err}
    <p class="card">Could not load data: {err}</p>
  {:else if !data}
    <p class="card">Loading…</p>
  {:else}
    <section class="kpis" aria-label="Key figures">
      <article class="kpi"><h2>Headcount</h2><p class="big">{fmt.format(cur.hc1)}</p><p class="sub {hcDelta >= 0 ? 'up' : 'dn'}">{hcDelta >= 0 ? '▲ +' : '▼ '}{hcDelta} over {span} mo</p></article>
      <article class="kpi"><h2>Turnover ({span} mo)</h2><p class="big">{f1(to)}%</p><p class="sub {toPrev != null && to > toPrev ? 'dn' : 'up'}">{arrow(to, toPrev)} {delta(to, toPrev)}</p></article>
      <article class="kpi"><h2>Absenteeism</h2><p class="big">{f1(ab)}%</p><p class="sub {abPrev != null && ab > abPrev ? 'dn' : 'up'}">{arrow(ab, abPrev)} {delta(ab, abPrev)}</p></article>
      <article class="kpi"><h2>Net hires</h2><p class="big">{hires - exits >= 0 ? '+' : ''}{hires - exits}</p><p class="sub">{hires} in · {exits} out</p></article>
    </section>

    <section class="grid">
      <article class="card"><h2>Headcount</h2><p class="hint">End of month · {deptName}</p><div class="ch"><Chart config={hcCfg} label="Headcount over time" /></div></article>
      <article class="card"><h2>Hires, exits and turnover</h2><p class="hint">Bars: people in / out. Line: monthly turnover rate.</p><div class="ch"><Chart config={flowCfg} label="Hires, exits and turnover" /></div></article>
      <article class="card"><h2>Absenteeism trend</h2><p class="hint">Absence days ÷ scheduled workdays</p><div class="ch s"><Chart config={absTrendCfg} label="Absenteeism trend" /></div></article>
      <article class="card"><h2>Absenteeism by department</h2><p class="hint">Selected period</p><div class="ch s"><Chart config={absCfg} label="Absenteeism by department" /></div></article>
      <article class="card"><h2>Why people leave</h2><p class="hint">Recorded exit reasons</p><div class="ch s"><Chart config={reasonCfg} label="Exit reasons" /></div></article>
      <article class="card"><h2>Tenure at exit</h2><p class="hint">Early attrition is the costly kind</p><div class="ch s"><Chart config={tenureCfg} label="Exits by tenure" /></div></article>

      <article class="card">
        <h2>When people are out</h2>
        <p class="hint">Absence days per 100 employees, by weekday (last {heat.length} months). Darker = more.</p>
        <div class="scroll">
          <table class="heat">
            <thead><tr><th></th>{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as d}<th>{d}</th>{/each}</tr></thead>
            <tbody>{#each heat as h}<tr><th scope="row">{lab(h.m)}</th>{#each h.v as v}<td style="background:{heatBg(v)}" class:dk={v / heatMax > 0.6}>{v.toFixed(0)}</td>{/each}</tr>{/each}</tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h2>Departments</h2>
        <p class="hint">Selected period · click a row to filter</p>
        <div class="scroll">
          <table class="tbl">
            <thead><tr><th>Department</th><th>HC</th><th>Hires</th><th>Exits</th><th>Turnover</th><th>Absence</th></tr></thead>
            <tbody>
              {#each summary as d, i}
                <tr class:sel={dept === d.id} onclick={() => pick(d.id)} tabindex="0" onkeydown={(e) => e.key === 'Enter' && pick(d.id)}>
                  <th scope="row"><i style="background:{PAL[i]}"></i>{d.name}</th><td>{d.hc}</td><td>{d.hires}</td><td>{d.exits}</td><td>{f1(d.turnover)}%</td><td>{f1(d.absence)}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  {/if}
</main>
<footer>All figures come from a generated dataset for a fictional company — no real employees. Built with Svelte and Chart.js. <a href="https://github.com/alissonlittig/cardume-people">Source code</a></footer>
