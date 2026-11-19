/* Chart.js setup + chart builders. Global `Chart` comes from vendor/chart.umd.min.js */
/* global Chart */

import {
  axisToClock,
  minToTime,
  clockToAxis,
  timeToMin,
  fmtDate,
  round1,
} from './ui.js?v=20261119085029';

const FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const ACCENT = '#0A84FF';
const ACCENT_HI = '#4DA3FF';
const BRAND = '#24675F';
const GREEN = '#30D158';
const ORANGE = '#FF9F0A';
const PURPLE = '#5E5CE6';
const RED = '#FF375F';
const MUTED = '#8E8E93';
const SURFACE = 'rgba(255,255,255,0.98)';
const BORDER = 'rgba(60,60,67,0.12)';
const GRID = 'rgba(60,60,67,0.08)';

const registry = [];

export function initCharts() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = FONT;
  Chart.defaults.font.size = 10.5;
  Chart.defaults.color = MUTED;
  Chart.defaults.borderColor = BORDER;
  Chart.defaults.plugins.legend.display = true;
  Chart.defaults.plugins.legend.position = 'bottom';
  Chart.defaults.plugins.legend.align = 'start';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.legend.labels.boxWidth = 6;
  Chart.defaults.plugins.legend.labels.boxHeight = 6;
  Chart.defaults.plugins.legend.labels.padding = 12;
  Chart.defaults.plugins.legend.labels.color = MUTED;
  Chart.defaults.plugins.tooltip.backgroundColor = SURFACE;
  Chart.defaults.plugins.tooltip.borderColor = BORDER;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = '#1C1C1E';
  Chart.defaults.plugins.tooltip.bodyColor = '#6C6C70';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 12;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
  Chart.defaults.animation = { duration: 500, easing: 'easeOutQuart' };
  Chart.defaults.maintainAspectRatio = false;
}

export function destroyCharts() {
  while (registry.length) {
    const chart = registry.pop();
    try {
      chart.destroy();
    } catch (_) {
      /* already gone */
    }
  }
}

function mount(canvas, config) {
  if (!canvas || typeof Chart === 'undefined') return null;
  const chart = new Chart(canvas.getContext('2d'), config);
  registry.push(chart);
  return chart;
}

function baseScales(extra = {}) {
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 7,
        padding: 6,
        font: { size: 10 },
      },
      ...(extra.x || {}),
    },
    y: {
      grid: { color: GRID, drawTicks: false },
      border: { display: false },
      ticks: { padding: 8, maxTicksLimit: 5, font: { size: 10 } },
      ...(extra.y || {}),
    },
  };
}

/* ---------------- Sleep ---------------- */
export function sleepChart(canvas, { dates, wake, bed, wakeTarget, bedTarget }) {
  const targetWake = timeToMin(wakeTarget);
  const targetBed = timeToMin(bedTarget);
  const tw = targetWake == null ? null : clockToAxis(targetWake);
  const tb = targetBed == null ? null : clockToAxis(targetBed);

  const all = [...wake, ...bed].filter((v) => v != null);
  if (tw != null) all.push(tw);
  if (tb != null) all.push(tb);
  let lo = 240;
  let hi = 900;
  if (all.length) {
    lo = Math.min(...all) - 30;
    hi = Math.max(...all) + 30;
    if (hi - lo < 120) {
      const mid = (hi + lo) / 2;
      lo = mid - 60;
      hi = mid + 60;
    }
    lo = Math.floor(lo / 30) * 30;
    hi = Math.ceil(hi / 30) * 30;
  }

  const clockTick = (v) => minToTime(axisToClock(v));
  const clockTip = (ctx) => {
    const v = ctx.parsed.y;
    return v == null ? '—' : minToTime(axisToClock(v));
  };

  return mount(canvas, {
    type: 'line',
    data: {
      labels: dates.map((d) => fmtDate(d, 'short')),
      datasets: [
        {
          label: 'Wake',
          data: wake,
          borderColor: ACCENT,
          backgroundColor: ACCENT,
          borderWidth: 2.4,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointBackgroundColor: ACCENT,
          tension: 0.35,
          spanGaps: true,
          order: 1,
        },
        {
          label: 'Bed',
          data: bed,
          borderColor: PURPLE,
          backgroundColor: PURPLE,
          borderWidth: 2.4,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointBackgroundColor: GREEN,
          tension: 0.35,
          spanGaps: true,
          order: 2,
        },
        {
          label: 'Wake goal',
          data: dates.map(() => tw),
          borderColor: 'rgba(60,60,67,0.32)',
          borderDash: [5, 5],
          borderWidth: 1.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0,
          order: 0,
        },
        {
          label: 'Bed goal',
          data: dates.map(() => tb),
          borderColor: 'rgba(94,92,230,0.42)',
          borderDash: [5, 5],
          borderWidth: 1.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: 4, right: 4 } },
      scales: baseScales({
        y: {
          suggestedMin: lo,
          suggestedMax: hi,
          ticks: {
            callback: clockTick,
            padding: 8,
            maxTicksLimit: 6,
            font: { size: 10 },
          },
        },
      }),
      plugins: {
        legend: { labels: { filter: (item) => !item.text.includes('goal') } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${clockTip(ctx)}`,
          },
        },
      },
    },
  });
}

/* ---------------- Exercise ---------------- */
function shortLabels(logs) {
  return logs.map((l) => fmtDate(l.date, 'short'));
}

function areaFill(canvas, hex) {
  try {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, hex);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    return gradient;
  } catch (_) {
    return 'rgba(10,132,255,0.08)';
  }
}

export function exerciseChart(canvas, { exercise, logs }) {
  if (!logs.length) return null;
  const labels = shortLabels(logs);

  if (exercise.kind === 'strength') {
    const top = logs.map((log) => {
      const weights = (log.sets || []).map((s) => Number(s.weight) || 0);
      return weights.length ? Math.max(...weights) : 0;
    });
    const volume = logs.map((log) =>
      round1((log.sets || []).reduce((a, s) => a + (Number(s.reps) || 0) * (Number(s.weight) || 0), 0))
    );
    return mount(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Volume (kg)',
            data: volume,
            yAxisID: 'y1',
            backgroundColor: 'rgba(36,103,95,0.13)',
            hoverBackgroundColor: 'rgba(36,103,95,0.24)',
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.75,
            order: 3,
          },
          {
            type: 'line',
            label: 'Top set (kg)',
            data: top,
            yAxisID: 'y',
            borderColor: BRAND,
            backgroundColor: BRAND,
            borderWidth: 2.4,
            pointRadius: 3,
            pointHoverRadius: 5.5,
            pointBackgroundColor: BRAND,
            tension: 0.3,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          ...baseScales(),
          y: {
            position: 'left',
            grid: { color: GRID, drawTicks: false },
            border: { display: false },
            ticks: { padding: 8, maxTicksLimit: 5, font: { size: 10 } },
            title: { display: false },
          },
          y1: {
            position: 'right',
            grid: { display: false },
            border: { display: false },
            ticks: {
              padding: 8,
              maxTicksLimit: 4,
              font: { size: 9.5 },
              color: MUTED,
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) =>
                ctx.dataset.yAxisID === 'y1'
                  ? `Volume: ${ctx.parsed.y} kg`
                  : `Top set: ${ctx.parsed.y} kg`,
            },
          },
        },
      },
    });
  }

  if (exercise.kind === 'cardio') {
    const distance = logs.map((l) => Number(l.distanceKm) || 0);
    const pace = logs.map((l) => {
      const d = Number(l.distanceKm) || 0;
      const m = Number(l.durationMin) || 0;
      return d > 0 && m > 0 ? round1(m / d) : null;
    });
    const hasDistance = distance.some((d) => d > 0);
    const hasPace = pace.some((p) => p != null);

    const datasets = [];
    if (hasDistance) {
      datasets.push({
        type: 'bar',
        label: 'Distance (km)',
        data: distance,
        backgroundColor: 'rgba(255,159,10,0.24)',
        hoverBackgroundColor: 'rgba(255,159,10,0.4)',
        borderRadius: 5,
        borderSkipped: false,
        barPercentage: 0.55,
        categoryPercentage: 0.75,
        yAxisID: 'y',
        order: 3,
      });
    }
    if (hasPace) {
      datasets.push({
        type: 'line',
        label: 'Pace (min/km)',
        data: pace,
        borderColor: BRAND,
        backgroundColor: BRAND,
        borderWidth: 2.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        spanGaps: true,
        yAxisID: hasDistance ? 'y1' : 'y',
        order: 1,
      });
    }
    if (!datasets.length) {
      datasets.push({
        type: 'line',
        label: 'Duration (min)',
        data: logs.map((l) => Number(l.durationMin) || 0),
        borderColor: BRAND,
        backgroundColor: BRAND,
        borderWidth: 2.4,
        pointRadius: 3,
        tension: 0.3,
        yAxisID: 'y',
      });
    }

    const scales = baseScales();
    if (hasDistance && hasPace) {
      scales.y1 = {
        position: 'right',
        reverse: true,
        grid: { display: false },
        border: { display: false },
        ticks: { padding: 8, maxTicksLimit: 4, font: { size: 9.5 }, color: MUTED },
      };
    }
    return mount(canvas, {
      type: hasDistance ? 'bar' : 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales,
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                if (ctx.dataset.label.startsWith('Pace')) {
                  const v = ctx.parsed.y;
                  if (v == null) return 'Pace: —';
                  const mins = Math.floor(v);
                  const secs = Math.round((v - mins) * 60);
                  return `Pace: ${mins}:${String(secs).padStart(2, '0')} /km`;
                }
                return `${ctx.dataset.label}: ${ctx.parsed.y}`;
              },
            },
          },
        },
      },
    });
  }

  if (exercise.kind === 'bodyweight') {
    return mount(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total reps',
            data: logs.map((l) => (l.sets || []).reduce((a, s) => a + (Number(s.reps) || 0), 0)),
            borderColor: GREEN,
            backgroundColor: areaFill(canvas, 'rgba(48,209,88,0.2)'),
            fill: true,
            borderWidth: 2.6,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: GREEN,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: baseScales(),
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} reps` } },
        },
      },
    });
  }

  // hold / default: duration
  return mount(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Duration (min)',
          data: logs.map((l) => Number(l.durationMin) || 0),
          borderColor: PURPLE,
          backgroundColor: areaFill(canvas, 'rgba(94,92,230,0.2)'),
          fill: true,
          borderWidth: 2.6,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: PURPLE,
          tension: 0.32,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: baseScales(),
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} min` } },
      },
    },
  });
}

/* ---------------- Body weight ---------------- */
export function weightChart(canvas, { points, goal }) {
  const dayMs = 86400000;
  const dateAt = (day) => new Date(day * dayMs).toISOString().slice(0, 10);
  const readings = points.map(({ date, weight }) => ({ x: Date.parse(date) / dayMs, y: weight }));
  const dayPadding = Math.max(1, Math.round((readings.at(-1).x - readings[0].x) * .025));
  const values = points.map((point) => point.weight);
  const all = goal > 0 ? [...values, goal] : values;
  const low = Math.floor(Math.min(...all) - 1);
  const high = Math.ceil(Math.max(...all) + 1);
  const datasets = [
    {
      label: 'Weight',
      data: readings,
      borderColor: '#24675F',
      backgroundColor: areaFill(canvas, 'rgba(36,103,95,0.18)'),
      fill: true,
      borderWidth: 2.6,
      pointRadius: (ctx) => ctx.dataIndex === points.length - 1 ? 5 : points.length > 60 ? 0 : 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#24675F',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1.5,
      cubicInterpolationMode: 'monotone',
    },
  ];
  return mount(canvas, {
    type: 'line',
    data: { datasets },
    plugins: [{
      id: 'weightGoalLine',
      afterDatasetsDraw({ ctx, scales, chartArea }) {
        if (!(goal > 0)) return;
        const y = scales.y.getPixelForValue(goal);
        if (y < chartArea.top || y > chartArea.bottom) return;
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#a67a37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
        ctx.restore();
      },
    }],
    options: {
      responsive: true,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: baseScales({
        x: {
          type: 'linear',
          min: readings[0].x - dayPadding,
          max: readings.at(-1).x + dayPadding,
          ticks: {
            color: '#596860',
            precision: 0,
            maxTicksLimit: 6,
            maxRotation: 0,
            padding: 9,
            callback: (value) => readings.length === 1 && value !== readings[0].x ? '' : fmtDate(dateAt(value), 'short'),
          },
        },
        y: {
          suggestedMin: low,
          suggestedMax: high,
          ticks: {
            precision: 1,
            padding: 8,
            maxTicksLimit: 6,
            color: '#596860',
            font: { size: 10 },
            callback: (value) => `${value}`,
          },
        },
      }),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ([entry]) => fmtDate(dateAt(entry.parsed.x), 'full'),
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} kg`,
          },
        },
      },
    },
  });
}

/* ---------------- Mobility — stretch + core ---------------- */
export function mobilityChart(canvas, { weeks }) {
  const peak = Math.max(1, ...weeks.flatMap((w) => [w.stretch, w.core]));
  return mount(canvas, {
    type: 'bar',
    data: {
      labels: weeks.map((w) => `W${w.week}`),
      datasets: [
        {
          label: 'Stretch',
          data: weeks.map((w) => w.stretch),
          backgroundColor: 'rgba(77,166,120,0.72)',
          hoverBackgroundColor: 'rgba(52,154,100,0.9)',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.72,
          maxBarThickness: 24,
        },
        {
          label: 'Core',
          data: weeks.map((w) => w.core),
          backgroundColor: 'rgba(201,162,94,0.78)',
          hoverBackgroundColor: 'rgba(183,141,71,0.92)',
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.62,
          categoryPercentage: 0.72,
          maxBarThickness: 24,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: baseScales({
        y: {
          beginAtZero: true,
          suggestedMax: peak + 1,
          ticks: { precision: 0, padding: 8, maxTicksLimit: 5, font: { size: 10 } },
        },
      }),
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${ctx.parsed.y} session${ctx.parsed.y === 1 ? '' : 's'}`,
          },
        },
      },
    },
  });
}

/* ---------------- Stretching (single track, legacy) ---------------- */
export function stretchChart(canvas, { weeks, target }) {
  return mount(canvas, {
    type: 'bar',
    data: {
      labels: weeks.map((w) => `W${w.week}`),
      datasets: [
        {
          type: 'bar',
          label: 'Sessions',
          data: weeks.map((w) => w.count),
          backgroundColor: weeks.map((w) =>
            w.count >= target ? 'rgba(52,199,89,0.72)' : 'rgba(36,103,95,0.24)'
          ),
          hoverBackgroundColor: weeks.map((w) =>
            w.count >= target ? 'rgba(52,199,89,0.9)' : 'rgba(36,103,95,0.45)'
          ),
          borderRadius: 7,
          borderSkipped: false,
          barPercentage: 0.55,
          categoryPercentage: 0.75,
          maxBarThickness: 42,
          order: 2,
        },
        {
          type: 'line',
          label: 'Target',
          data: weeks.map(() => target),
          borderColor: 'rgba(60,60,67,0.35)',
          borderDash: [5, 5],
          borderWidth: 1.4,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: baseScales({
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(target, ...weeks.map((w) => w.count), 1) + 1,
          ticks: { precision: 0, padding: 8, maxTicksLimit: 5, font: { size: 10 } },
        },
      }),
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.dataset.label === 'Target'
                ? `Target: ${target}/week`
                : `${ctx.parsed.y} session${ctx.parsed.y === 1 ? '' : 's'}`,
          },
        },
      },
    },
  });
}
