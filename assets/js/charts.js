/* =============================================================================
   charts.js — Chart.js 4 configurations.

   Figures are drawn from the case studies in the portfolio deck (Academy
   Dental, Smile Republic Orthodontics, Double L Motors, Sunnyview Dental) and
   from the 120% organic-traffic restructure at MediaNV. Month-by-month shapes
   are representative of those engagements, and every chart is labelled as such
   in the markup next to it.
   ============================================================================= */

import { $, $$, has, reduced } from './main.js';

const INK = '#14111C';
const GRAPHITE = '#4B4658';
const VIOLET = '#6D4AC4';
const VIOLET_100 = '#EDE7FB';
const SIGNAL = '#17C98F';
const HAIRLINE = '#E3DEED';

const MONTHS = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8', 'Month 9'];

const SERIES = {
  sessions: {
    label: 'Organic sessions',
    data: [1180, 1460, 1890, 2340, 2760, 3180, 3620, 4050, 4380],
    colour: VIOLET,
    fill: 'rgba(109, 74, 196, 0.10)',
    caption: 'Organic sessions rising through a site-architecture and internal-linking rebuild — the shape behind the 120% growth figure.',
    suffix: ''
  },
  rankings: {
    label: 'Average position',
    data: [23, 21.4, 19.1, 17.2, 15.6, 14.1, 12.9, 11.6, 10.8],
    colour: SIGNAL,
    fill: 'rgba(23, 201, 143, 0.12)',
    caption: 'Average position improving from 23 to 10.8, as recorded in Google Search Console for the Academy Dental engagement. Lower is better, so the axis is inverted.',
    invert: true,
    suffix: ''
  },
  backlinks: {
    label: 'Referring links acquired',
    data: [30, 58, 91, 126, 168, 214, 265, 312, 366],
    colour: INK,
    fill: 'rgba(20, 17, 28, 0.07)',
    caption: 'Cumulative white-hat link acquisition, starting from 30+ quality backlinks secured in the first month.',
    suffix: ''
  }
};

function baseOptions({ invert = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduced() ? false : { duration: 750, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: INK,
        titleColor: '#F7F5FA',
        bodyColor: VIOLET_100,
        borderColor: 'rgba(237,231,251,.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 4,
        displayColors: false,
        titleFont: { family: 'Satoshi, Inter, sans-serif', size: 12, weight: '500' },
        bodyFont: { family: 'Satoshi, Inter, sans-serif', size: 13 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: HAIRLINE },
        ticks: { color: GRAPHITE, font: { family: 'Satoshi, Inter, sans-serif', size: 11 }, maxRotation: 0, autoSkipPadding: 14 }
      },
      y: {
        reverse: invert,
        grid: { color: HAIRLINE, drawTicks: false },
        border: { display: false },
        ticks: { color: GRAPHITE, font: { family: 'Satoshi, Inter, sans-serif', size: 11 }, padding: 8, maxTicksLimit: 6 }
      }
    }
  };
}

function lineDataset(key) {
  const s = SERIES[key];
  return {
    label: s.label,
    data: s.data,
    borderColor: s.colour,
    backgroundColor: s.fill,
    borderWidth: 2,
    fill: true,
    tension: 0.34,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: s.colour,
    pointHoverBorderColor: '#FFFFFF',
    pointHoverBorderWidth: 2
  };
}

/* --- Expertise page: one chart, three switchable datasets ----------------- */
function initToggleChart() {
  const canvas = $('#results-chart');
  if (!canvas || !has('Chart')) return;
  const caption = $('#results-caption');
  const buttons = $$('[data-series]');

  let current = 'sessions';
  const chart = new window.Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: MONTHS, datasets: [lineDataset(current)] },
    options: baseOptions()
  });

  const setSeries = (key) => {
    if (!SERIES[key]) return;
    current = key;
    chart.data.datasets = [lineDataset(key)];
    chart.options.scales.y.reverse = !!SERIES[key].invert;
    chart.update();
    if (caption) caption.textContent = SERIES[key].caption;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-series') === key)));
  };

  buttons.forEach((b) => b.addEventListener('click', () => setSeries(b.getAttribute('data-series'))));
  setSeries('sessions');
}

/* --- Work page: three-panel dashboard with a period toggle ---------------- */
function initDashboard() {
  if (!has('Chart')) return;
  const specs = [
    { id: 'dash-traffic', key: 'sessions', type: 'line' },
    { id: 'dash-rankings', key: 'rankings', type: 'line' },
    { id: 'dash-links', key: 'backlinks', type: 'bar' }
  ];

  const charts = [];
  specs.forEach((spec) => {
    const canvas = $('#' + spec.id);
    if (!canvas) return;
    const s = SERIES[spec.key];
    const cfg = spec.type === 'bar'
      ? {
          type: 'bar',
          data: {
            labels: MONTHS,
            datasets: [{
              label: s.label,
              data: s.data,
              backgroundColor: VIOLET_100,
              hoverBackgroundColor: VIOLET,
              borderRadius: 2,
              borderSkipped: false
            }]
          },
          options: baseOptions()
        }
      : {
          type: 'line',
          data: { labels: MONTHS, datasets: [lineDataset(spec.key)] },
          options: baseOptions({ invert: !!s.invert })
        };
    charts.push({ chart: new window.Chart(canvas.getContext('2d'), cfg), key: spec.key });
  });

  if (!charts.length) return;

  const buttons = $$('[data-period]');
  const apply = (months) => {
    charts.forEach(({ chart, key }) => {
      const n = months === 'all' ? MONTHS.length : parseInt(months, 10);
      chart.data.labels = MONTHS.slice(0, n);
      chart.data.datasets[0].data = SERIES[key].data.slice(0, n);
      chart.update();
    });
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-period') === months)));
  };
  buttons.forEach((b) => b.addEventListener('click', () => apply(b.getAttribute('data-period'))));
  apply('all');
}

/* --- Home / Work: acquisition-channel split ------------------------------- */
function initChannelChart() {
  const canvas = $('#channel-chart');
  if (!canvas || !has('Chart')) return;
  new window.Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Organic search', 'Direct', 'Paid search'],
      datasets: [{
        label: 'Sessions',
        data: [24000, 10000, 3400],
        backgroundColor: [VIOLET, VIOLET_100, HAIRLINE],
        hoverBackgroundColor: [INK, VIOLET, GRAPHITE],
        borderRadius: 2,
        borderSkipped: false,
        maxBarThickness: 64
      }]
    },
    options: {
      ...baseOptions(),
      indexAxis: 'y',
      scales: {
        x: {
          grid: { color: HAIRLINE, drawTicks: false },
          border: { display: false },
          ticks: {
            color: GRAPHITE,
            font: { family: 'Satoshi, Inter, sans-serif', size: 11 },
            callback: (v) => (v >= 1000 ? v / 1000 + 'K' : v)
          }
        },
        y: { grid: { display: false }, border: { color: HAIRLINE }, ticks: { color: INK, font: { family: 'Satoshi, Inter, sans-serif', size: 12 } } }
      }
    }
  });
}

export function initCharts() {
  if (!has('Chart')) return;
  try {
    window.Chart.defaults.font.family = 'Satoshi, Inter, ui-sans-serif, system-ui, sans-serif';
    window.Chart.defaults.color = GRAPHITE;
  } catch (e) { /* noop */ }
  initToggleChart();
  initDashboard();
  initChannelChart();
}
