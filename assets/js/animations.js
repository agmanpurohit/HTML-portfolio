/* =============================================================================
   animations.js — every GSAP timeline and ScrollTrigger on the site.

   Reveal grammar deliberately varies per section: character stagger, hairline
   draw, line mask, rule extension, horizontal scrub, spine fill, crossfade.
   Nothing here is required for the page to be readable — see the watchdog in
   main.js.
   ============================================================================= */

import { $, $$, has, reduced, isTouch, isLowPower, getLenis } from './main.js';

const bind = (el) => { if (el) el.setAttribute('data-anim-bound', ''); return el; };
const bindAll = (els) => { els.forEach(bind); return els; };

/* --- Headline splitting ---------------------------------------------------
   SplitType when present; a word-level fallback otherwise so the stagger
   still reads even if that one CDN is down.
   ------------------------------------------------------------------------- */
function split(el, kind) {
  if (has('SplitType')) {
    try {
      const s = new window.SplitType(el, { types: kind === 'chars' ? 'chars' : 'lines,words', tagName: 'span' });
      return kind === 'chars' ? s.chars : (kind === 'lines' ? s.lines : s.words);
    } catch (e) { /* fall through */ }
  }
  const text = el.textContent;
  const parts = text.split(/(\s+)/);
  el.textContent = '';
  const out = [];
  parts.forEach((p) => {
    if (/^\s+$/.test(p)) { el.appendChild(document.createTextNode(p)); return; }
    const s = document.createElement('span');
    s.style.display = 'inline-block';
    s.textContent = p;
    el.appendChild(s);
    out.push(s);
  });
  return out;
}

/* --- Generic reveals ------------------------------------------------------ */
function genericReveals(gsap) {
  $$('[data-reveal]').forEach((el) => {
    if (el.hasAttribute('data-anim-bound')) return;
    bind(el);
    const kind = el.getAttribute('data-reveal');
    const delay = parseFloat(el.getAttribute('data-delay') || '0');
    const from = { opacity: 0 };
    const to = { opacity: 1, duration: 0.75, ease: 'power3.out', delay };

    /* Below the md breakpoint every grid child is full-width, so a horizontal
       entrance translates the element past the viewport edge and creates real
       horizontal overflow for the duration of the tween. Fall back to the
       vertical reveal there rather than masking it with a clip on <body>. */
    const sideways = window.matchMedia('(min-width: 768px)').matches;

    if (kind === 'up') { from.y = 26; to.y = 0; }
    else if (kind === 'left') {
      if (sideways) { from.x = -26; to.x = 0; } else { from.y = 26; to.y = 0; }
    } else if (kind === 'right') {
      if (sideways) { from.x = 26; to.x = 0; } else { from.y = 26; to.y = 0; }
    }
    else if (kind === 'scale') { from.scale = 0.96; to.scale = 1; }
    else if (kind === 'clip') { from.opacity = 1; from.clipPath = 'inset(100% 0 0 0)'; to.clipPath = 'inset(0% 0 0 0)'; to.duration = 0.9; }
    else if (kind === 'draw') { from.opacity = 1; from.scaleX = 0; to.scaleX = 1; to.duration = 0.9; }

    gsap.fromTo(el, from, {
      ...to,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onComplete: () => el.classList.add('is-revealed')
    });
  });
}

/* --- Line-by-line text reveals -------------------------------------------- */
function lineReveals(gsap) {
  $$('[data-split="lines"]').forEach((el) => {
    bind(el);
    const lines = split(el, 'lines');
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(lines, { yPercent: 105, opacity: 0 }, {
      yPercent: 0,
      opacity: 1,
      duration: 0.85,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      onComplete: () => el.classList.add('is-revealed')
    });
    if (has('SplitType')) $$('.line', el).forEach((l) => { l.style.overflow = 'hidden'; });
  });

  $$('[data-split="words"]').forEach((el) => {
    bind(el);
    const words = split(el, 'words');
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(words, { yPercent: 60, opacity: 0 }, {
      yPercent: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.035,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onComplete: () => el.classList.add('is-revealed')
    });
  });
}

/* --- Home hero ------------------------------------------------------------ */
function heroTimeline(gsap) {
  const hero = $('#hero');
  if (!hero) return;

  const name = $('[data-hero-name]', hero);
  const role = $('[data-hero-role]', hero);
  const portrait = $('[data-hero-portrait]', hero);
  const rest = bindAll($$('[data-hero-item]', hero));
  [name, role, portrait].forEach(bind);

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (name) {
    const chars = split(name, 'chars');
    gsap.set(name, { opacity: 1 });
    tl.fromTo(chars, { yPercent: 110, opacity: 0 }, {
      yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.022
    }, 0);
  }
  if (role) {
    gsap.set(role, { opacity: 1 });
    tl.fromTo(role, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.8 }, 0.25);
  }
  if (portrait) {
    tl.fromTo(portrait, { clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0% 0 0 0)', duration: 1.05 }, 0.15);
  }
  if (rest.length) {
    tl.fromTo(rest, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.07 }, 0.4);
  }
  tl.eventCallback('onComplete', () => {
    [name, role, portrait, ...rest].forEach((el) => el && el.classList.add('is-revealed'));
  });

  // Portrait parallax, capped at 40px as specified.
  const media = $('.portrait-media img', hero);
  if (media && !reduced()) {
    gsap.to(media, {
      y: -40,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
  }
}

/* --- Rotating specialism line --------------------------------------------- */
function rotator(gsap) {
  const box = $('#hero-rotator');
  if (!box) return;
  const items = $$('span', box);
  if (items.length < 2) return;

  if (reduced()) {
    items.forEach((s, i) => { s.style.opacity = i === 0 ? '1' : '0'; });
    return;
  }

  gsap.set(items, { yPercent: 100, opacity: 0 });
  gsap.set(items[0], { yPercent: 0, opacity: 1 });

  let i = 0;
  const next = () => {
    const cur = items[i];
    i = (i + 1) % items.length;
    const nxt = items[i];
    gsap.to(cur, { yPercent: -100, opacity: 0, duration: 0.55, ease: 'power2.inOut' });
    gsap.fromTo(nxt, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: 'power2.inOut' });
  };
  const id = setInterval(next, 2600);
  window.addEventListener('pagehide', () => clearInterval(id));
}

/* --- Hero crawl graph -----------------------------------------------------
   A light <canvas> of connected nodes that repels from the pointer. Capped at
   60 nodes, paused by IntersectionObserver, skipped entirely on touch,
   reduced motion, or low-end hardware.
   ------------------------------------------------------------------------- */
function crawlGraph() {
  const canvas = $('#crawl-canvas');
  if (!canvas) return;
  if (reduced() || isTouch() || isLowPower()) { canvas.remove(); return; }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) { canvas.remove(); return; }

  const COUNT = 60;
  const LINK = 132;
  let w = 0, h = 0, dpr = 1, raf = 0, running = false;
  const nodes = [];
  const pointer = { x: -9999, y: -9999 };

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    nodes.length = 0;
    for (let i = 0; i < COUNT; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.9
      });
    }
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;

      // Repulsion.
      const dx = n.x - pointer.x;
      const dy = n.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 16000 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (126 - d) / 126 * 1.7;
        n.x += (dx / d) * f;
        n.y += (dy / d) * f;
      }

      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const lx = n.x - m.x, ly = n.y - m.y;
        const ld = Math.sqrt(lx * lx + ly * ly);
        if (ld < LINK) {
          ctx.globalAlpha = (1 - ld / LINK) * 0.2;
          ctx.strokeStyle = '#6D4AC4';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.42;
      ctx.fillStyle = '#6D4AC4';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize(); seed();

  window.addEventListener('resize', () => { resize(); seed(); }, { passive: true });
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries[0].isIntersecting ? start() : stop();
    }, { threshold: 0.02 }).observe(canvas);
  } else {
    start();
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
}

/* --- Expertise rows: stagger in from the left, rule extends on hover ------ */
function expertiseRows(gsap) {
  const rows = $$('[data-xrow]');
  if (!rows.length) return;
  bindAll(rows);
  gsap.fromTo(rows, { x: -34, opacity: 0 }, {
    x: 0,
    opacity: 1,
    duration: 0.75,
    stagger: 0.11,
    ease: 'power3.out',
    scrollTrigger: { trigger: rows[0].parentElement, start: 'top 82%', once: true },
    onComplete: () => rows.forEach((r) => r.classList.add('is-revealed'))
  });

  // Icon stroke draw on entry.
  $$('[data-xrow] .xrow-icon svg path, [data-xrow] .xrow-icon svg line, [data-xrow] .xrow-icon svg circle').forEach((p) => {
    try {
      const len = p.getTotalLength ? p.getTotalLength() : 60;
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, {
        strokeDashoffset: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: { trigger: p.closest('[data-xrow]'), start: 'top 82%', once: true }
      });
    } catch (e) { /* non-path icons */ }
  });
}

/* --- Case track: pinned horizontal scrub + pointer drag ------------------- */
// function caseTrack(gsap) {
//   const section = $('#case-scroll');
//   const track = $('#case-track');
//   if (!section || !track) return;
//   const viewport = track.parentElement;

//   const canPin = () => window.matchMedia('(min-width: 1024px)').matches && !isTouch() && !reduced();
//   if (!canPin()) return;

//   const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

//   gsap.to(track, {
//     x: () => -distance(),
//     ease: 'none',
//     scrollTrigger: {
//       trigger: section,
//       start: 'top top+=' + 72,
//       end: () => '+=' + distance(),
//       pin: viewport,
//       pinSpacing: true,
//       scrub: 1,
//       anticipatePin: 1,
//       invalidateOnRefresh: true
//     }
//   });

//   // Drag the track to drive the scrub.
//   let dragging = false;
//   let lastX = 0;
//   viewport.addEventListener('pointerdown', (e) => {
//     if (e.pointerType === 'touch') return;
//     dragging = true;
//     lastX = e.clientX;
//     viewport.setPointerCapture(e.pointerId);
//   });
//   viewport.addEventListener('pointermove', (e) => {
//     if (!dragging) return;
//     const dx = e.clientX - lastX;
//     lastX = e.clientX;
//     const lenis = getLenis();
//     const target = window.scrollY - dx * 1.4;
//     if (lenis) lenis.scrollTo(target, { immediate: true });
//     else window.scrollTo(0, target);
//   });
//   const end = (e) => {
//     if (!dragging) return;
//     dragging = false;
//     try { viewport.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
//   };
//   viewport.addEventListener('pointerup', end);
//   viewport.addEventListener('pointercancel', end);
// }

/* --- Process spine -------------------------------------------------------- */
function processSpine(gsap) {
  const spine = $('#process-spine');
  if (!spine) return;
  const fill = $('.spine-fill', spine);
  const steps = $$('.step', spine);

  if (fill && !reduced()) {
    gsap.fromTo(fill, { height: 0 }, {
      height: () => spine.clientHeight - 16,
      ease: 'none',
      scrollTrigger: { trigger: spine, start: 'top 72%', end: 'bottom 78%', scrub: 0.4, invalidateOnRefresh: true }
    });
  } else if (fill) {
    fill.style.height = '100%';
  }

  steps.forEach((s) => {
    window.ScrollTrigger.create({
      trigger: s,
      start: 'top 72%',
      onEnter: () => s.classList.add('is-active'),
      onLeaveBack: () => s.classList.remove('is-active')
    });
  });
}

/* --- Hairline draw on the metric strip ------------------------------------ */
function metricRule(gsap) {
  const rule = $('#metric-rule');
  if (!rule) return;
  bind(rule);
  gsap.fromTo(rule, { scaleX: 0 }, {
    scaleX: 1,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: { trigger: rule, start: 'top 92%', once: true },
    onComplete: () => rule.classList.add('is-revealed')
  });
}

/* --- CTA band: canvas -> ink as it enters --------------------------------- */
function ctaBand(gsap) {
  const band = $('#cta-band');
  if (!band) return;

  if (reduced()) {
    band.style.backgroundColor = '#14111C';
    band.classList.add('on-ink');
    return;
  }

  gsap.fromTo(band, { backgroundColor: '#F7F5FA' }, {
    backgroundColor: '#14111C',
    ease: 'none',
    scrollTrigger: {
      trigger: band,
      start: 'top 88%',
      end: 'top 42%',
      scrub: true,
      onEnter: () => band.classList.add('on-ink'),
      onLeaveBack: () => band.classList.remove('on-ink')
    }
  });
}

/* --- Magnetic buttons ----------------------------------------------------- */
function magnetic(gsap) {
  if (isTouch() || reduced()) return;
  $$('[data-magnetic]').forEach((wrap) => {
    const target = wrap.firstElementChild || wrap;
    const R = 70;
    const xTo = gsap.quickTo(target, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(target, 'y', { duration: 0.5, ease: 'power3.out' });

    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(Math.max(-R, Math.min(R, dx * 0.35)));
      yTo(Math.max(-R, Math.min(R, dy * 0.45)));
    });
    wrap.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* --- About: portrait frame follows the pointer (max 12px) ----------------- */
function portraitShift(gsap) {
  const el = $('[data-portrait-shift]');
  if (!el || isTouch() || reduced()) return;
  const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    xTo(nx * 12);
    yTo(ny * 12);
  }, { passive: true });
}

/* --- Scroll cue fades on first scroll ------------------------------------- */
function scrollCue(gsap) {
  const cue = $('[data-scroll-cue]');
  if (!cue) return;
  const hide = () => {
    gsap.to(cue, { opacity: 0, y: 10, duration: 0.4, ease: 'power2.inOut' });
    window.removeEventListener('scroll', hide);
  };
  window.addEventListener('scroll', hide, { passive: true, once: true });
}

/* --- Entry ---------------------------------------------------------------- */
export function initAnimations() {
  if (!has('gsap')) {
    document.documentElement.classList.remove('js');
    crawlGraph();
    return;
  }
  const gsap = window.gsap;

  if (reduced()) {
    // Snap everything to its final state; no scrubs, no pins, no loops.
    $$('[data-reveal], [data-split], [data-hero-name], [data-hero-role], [data-hero-portrait], [data-hero-item], [data-xrow]')
      .forEach((el) => { bind(el); el.classList.add('is-revealed'); });
    ctaBand(gsap);
    rotator(gsap);
    const fill = $('.spine-fill');
    if (fill) fill.style.height = '100%';
    $$('.step').forEach((s) => s.classList.add('is-active'));
    return;
  }

  heroTimeline(gsap);
  rotator(gsap);
  crawlGraph();
  metricRule(gsap);
  lineReveals(gsap);
  expertiseRows(gsap);
  // caseTrack(gsap);
  processSpine(gsap);
  ctaBand(gsap);
  magnetic(gsap);
  portraitShift(gsap);
  scrollCue(gsap);
  genericReveals(gsap);

  if (window.ScrollTrigger) {
    window.ScrollTrigger.refresh();
    // Pinned sections must re-measure when the viewport crosses the breakpoint.
    let last = window.innerWidth;
    window.addEventListener('resize', () => {
      if (Math.abs(window.innerWidth - last) < 60) return;
      last = window.innerWidth;
      window.ScrollTrigger.refresh();
    }, { passive: true });
  }
}