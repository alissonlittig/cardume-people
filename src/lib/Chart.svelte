<script>
  import { Chart, LineController, BarController, DoughnutController, LineElement, BarElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend } from 'chart.js';
  Chart.register(LineController, BarController, DoughnutController, LineElement, BarElement, PointElement, ArcElement, CategoryScale, LinearScale, Filler, Tooltip, Legend);
  Chart.defaults.animation = false;
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, "Segoe UI", sans-serif';
  Chart.defaults.color = '#4b5b5d';
  let { config, label = '' } = $props();
  let canvas;
  let box;
  let visible = $state(false);

  // Render only once the chart is near the viewport: keeps first load light.
  $effect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { visible = true; io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(box);
    return () => io.disconnect();
  });

  $effect(() => {
    if (!visible) return;
    const cfg = config;
    const chart = new Chart(canvas, { ...cfg, options: { responsive: true, maintainAspectRatio: false, ...cfg.options } });
    return () => chart.destroy();
  });
</script>

<div class="cv" bind:this={box}><canvas bind:this={canvas} role="img" aria-label={label}></canvas></div>

<style>
  .cv { position: relative; height: 100%; width: 100%; }
</style>
