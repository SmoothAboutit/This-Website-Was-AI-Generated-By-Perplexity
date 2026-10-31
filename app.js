/* ============================================================
   SAGARMATHA — interactions
   1. Interactive elevation profile (inline SVG)
   2. Scroll reveals + stat count-up
   ============================================================ */

(function () {
  'use strict';

  /* ---------------- Waypoint data ---------------- */

  const WAYPOINTS = [
    {
      name: 'Base Camp',
      elev: 5364,
      x: 0,
      desc: 'A tent city carved into the rubble of the Khumbu Glacier: bakeries, helicopter pads, a stone-chip hospital. Every one of the thousands of summits in Everest\u2019s history began as a walk through this village of nylon.',
    },
    {
      name: 'Khumbu Icefall',
      elev: 5800,
      x: 0.07,
      desc: 'Two kilometres of shattered glacier between Base Camp and Camp I. Climbers cross on aluminium ladders before dawn, while the cold still holds the seracs in place.',
    },
    {
      name: 'Camp I',
      elev: 6065,
      x: 0.16,
      desc: 'The mouth of the Western Cwm \u2014 a corridor of ice walls that funnels the sun\u2019s heat. Tents sit on the flat ice of a glacier that swallows a few of them every season.',
    },
    {
      name: 'Camp II',
      elev: 6400,
      x: 0.3,
      desc: 'Advance Base at the foot of the Lhotse Face \u2014 the logistical heart of the route, where Sherpa teams stage oxygen and supplies for everything above.',
    },
    {
      name: 'Camp III',
      elev: 7162,
      x: 0.44,
      desc: 'A city of tents clipped to a 40-degree wall of blue ice. Sleep is fiction here; climbers doze upright between loads.',
    },
    {
      name: 'South Col',
      elev: 7906,
      x: 0.55,
      desc: 'A windswept saddle of shattered rock between Everest and Lhotse \u2014 the last flat ground, and the door to the death zone. Summit bids launch from here around midnight.',
    },
    {
      name: 'The Balcony',
      elev: 8400,
      x: 0.68,
      desc: 'A small ledge where the Southeast Ridge meets the upper mountain \u2014 the traditional spot to swap oxygen bottles and look, for the first time, down the other side of the world.',
    },
    {
      name: 'South Summit',
      elev: 8749,
      x: 0.78,
      desc: 'A false summit. From here the route turns onto the knife-edge traverse, with the Hillary Step still standing between you and the top.',
    },
    {
      name: 'Hillary Step',
      elev: 8790,
      x: 0.86,
      desc: 'The famous 12-metre rock wall that Edmund Hillary first lay full-length upon in 1953. On busy mornings a queue of climbers used to form here, two hours deep.',
    },
    {
      name: 'The Summit',
      elev: 8848.86,
      x: 1,
      desc: '8,848.86 metres \u2014 29,032 feet \u2014 the highest point on Earth. Prayer flags, the curve of the planet on the horizon, and perhaps twenty minutes before the descent begins.',
    },
  ];

  const CHART_LABELS = {
    'Base Camp': 'Base Camp',
    'Khumbu Icefall': 'Icefall',
    'Camp I': 'Camp I',
    'Camp II': 'Camp II',
    'Camp III': 'Camp III',
    'South Col': 'S. Col',
    'The Balcony': 'Balcony',
    'South Summit': 'S. Summit',
    'Hillary Step': 'Hillary Step',
    'The Summit': 'Summit',
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const W = 1000;
  const H = 470;
  const PAD = { top: 34, right: 26, bottom: 58, left: 66 };
  const Y_MIN = 5200;
  const Y_MAX = 9000;

  const plotLeft = PAD.left;
  const plotRight = W - PAD.right;
  const plotW = plotRight - plotLeft;
  const plotBottom = H - PAD.bottom;
  const plotTop = PAD.top;
  const plotH = plotBottom - plotTop;

  const xOf = (f) => plotLeft + f * plotW;
  const yOf = (elev) => plotBottom - ((elev - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  function el(tag, attrs, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (text != null) node.textContent = text;
    return node;
  }

  /* Smooth path through waypoints (Catmull-Rom -> cubic bezier) */
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  const fmtElev = (e) => e.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' m';

  /* ---------------- Build the chart ---------------- */

  const chartRoot = document.getElementById('climb-chart');
  const wpElev = document.getElementById('wp-elev');
  const wpName = document.getElementById('wp-name');
  const wpDesc = document.getElementById('wp-desc');
  const wpMeter = document.getElementById('wp-meter');

  let selectedIndex = 0;

  function selectWaypoint(i) {
    selectedIndex = i;
    const wp = WAYPOINTS[i];
    wpElev.textContent = fmtElev(wp.elev);
    wpName.textContent = wp.name;
    wpDesc.textContent = wp.desc;
    const pct = Math.round(((wp.elev - 5364) / (8848.86 - 5364)) * 100);
    wpMeter.style.width = Math.max(0, Math.min(100, pct)) + '%';
    document.querySelectorAll('#climb-chart .wp-dot').forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === i);
    });
  }

  function buildChart() {
    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'Elevation profile of the Everest Southeast Ridge from Base Camp at 5,364 metres to the summit at 8,848.86 metres',
    });

    /* defs: gradient for the area fill */
    const defs = el('defs', {});
    const grad = el('linearGradient', { id: 'areaGradient', x1: 0, y1: 0, x2: 0, y2: 1 });
    const stop1 = el('stop', { offset: '0%', 'stop-color': '#e8a852', 'stop-opacity': 0.28 });
    const stop2 = el('stop', { offset: '100%', 'stop-color': '#e8a852', 'stop-opacity': 0.02 });
    grad.append(stop1, stop2);
    defs.append(grad);
    svg.append(defs);

    /* gridlines + labels */
    [6000, 7000, 8000, 9000].forEach((line) => {
      const y = yOf(line);
      svg.append(el('line', { x1: plotLeft, x2: plotRight, y1: y, y2: y, class: 'grid-line' }));
      svg.append(el('text', { x: plotLeft - 10, y: y + 4, 'text-anchor': 'end', class: 'grid-label' }, line.toLocaleString('en-US')));
    });

    /* death zone line at 8,000 m */
    const dzY = yOf(8000);
    svg.append(el('line', { x1: plotLeft, x2: plotRight, y1: dzY, y2: dzY, class: 'death-zone-line' }));
    svg.append(
      el(
        'text',
        { x: plotRight, y: dzY - 8, 'text-anchor': 'end', class: 'death-zone-label' },
        'DEATH ZONE \u00B7 8,000 M'
      )
    );

    /* area + route path */
    const pts = WAYPOINTS.map((wp) => [xOf(wp.x), yOf(wp.elev)]);
    const route = smoothPath(pts);
    svg.append(el('path', { d: `${route} L ${plotRight} ${plotBottom} L ${plotLeft} ${plotBottom} Z`, class: 'route-area' }));
    svg.append(el('path', { d: route, class: 'route-path' }));

    /* waypoints */
    WAYPOINTS.forEach((wp, i) => {
      const cx = xOf(wp.x);
      const cy = yOf(wp.elev);
      const g = el('g', {
        class: 'waypoint-g',
        tabindex: '0',
        role: 'button',
        'aria-label': `${wp.name}, ${fmtElev(wp.elev)}`,
      });

      const hit = el('circle', { cx, cy, r: 22, class: 'wp-hit' });
      const dot = el('circle', { cx, cy, r: 6, class: 'wp-dot' });
      dot.dataset.index = i;

      const label = el(
        'text',
        {
          x: Math.min(cx, plotRight - 8),
          y: cy + 26,
          'text-anchor': i === 0 ? 'start' : i === WAYPOINTS.length - 1 ? 'end' : 'middle',
          class: 'wp-label',
        },
        CHART_LABELS[wp.name]
      );

      g.append(hit, dot, label);

      const activate = () => {
        selectWaypoint(i);
      };
      g.addEventListener('pointerenter', activate);
      g.addEventListener('click', activate);
      g.addEventListener('focus', activate);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const next = g.nextElementSibling;
          if (next) next.focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prev = g.previousElementSibling;
          if (prev) prev.focus();
        }
      });

      svg.append(g);
    });

    chartRoot.append(svg);
    selectWaypoint(0);
  }

  if (chartRoot) buildChart();

  /* ---------------- Scroll reveal + count-up ---------------- */

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countUp(node) {
    const target = parseFloat(node.dataset.count);
    if (!isFinite(target)) return;
    const decimals = parseInt(node.dataset.decimals || '0', 10);
    const suffix = node.dataset.suffix || '';
    const duration = 1400;
    const t0 = performance.now();

    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = target * eased;
      node.textContent =
        value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        if (!reduceMotion) {
          entry.target.querySelectorAll('[data-count]').forEach(countUp);
        }
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  const revealAll = () =>
    document.querySelectorAll('.reveal').forEach((n) => observer.observe(n));

  /* Entry gate: reveal content only once the gate is dismissed */
  const gate = document.querySelector('[data-entry-gate]');
  const enterButton = gate && gate.querySelector('[data-gate-enter]');

  if (gate && enterButton) {
    enterButton.focus();
    const dismissGate = () => {
      document.documentElement.removeAttribute('data-gate-closed');
      gate.setAttribute('data-hidden', '');
      window.setTimeout(() => gate.remove(), 520);
      revealAll();
    };
    enterButton.addEventListener('click', dismissGate, { once: true });
  } else {
    revealAll();
  }
})();
