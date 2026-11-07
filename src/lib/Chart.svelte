<script>
  import { Chart, registerables } from 'chart.js';
  Chart.register(...registerables);
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, "Segoe UI", sans-serif';
  Chart.defaults.color = '#4b5b5d';
  let { config, label = '' } = $props();
  let canvas;
  $effect(() => {
    const cfg = config;
    const chart = new Chart(canvas, { ...cfg, options: { responsive: true, maintainAspectRatio: false, ...cfg.options } });
    return () => chart.destroy();
  });
</script>

<div class="cv"><canvas bind:this={canvas} role="img" aria-label={label}></canvas></div>

<style>
  .cv { position: relative; height: 100%; width: 100%; }
</style>
