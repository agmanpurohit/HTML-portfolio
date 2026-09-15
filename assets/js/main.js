/* =============================================================================
   main.js — entry point
   Owns: environment detection, font fallback, Lenis smooth scroll, preloader,
   custom cursor, page transitions, and the degradation watchdog.

   Every library is optional. If a CDN fails, this file still runs, the
   watchdog reveals all content, and the page stays completely usable.
   ============================================================================= */

import { initNav } from './nav.js';
import { initAnimations } from './animations.js';
import { initComponents } from './components.js';
import { initCharts } from './charts.js';
import { initForm } from './form.js';

/* --- Environment ---------------------------------------------------------- */

export const reduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () =>
  window.matchMedia('(pointer: coarse)').matches || !window.matchMedia('(hover: hover)').matches;

export const isLowPower = () =>
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
  (navigator.deviceMemory && navigator.deviceMemory <= 4);

export const has = (name) => typeof window[name] !== 'undefined';

/** Query helper that never throws on a page where the element is absent. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

let lenis = null;
export const getLenis = () => lenis;

/** Scroll to a target through Lenis when available, natively otherwise. */
export function scrollTo(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { duration: 1.1, ...opts });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: reduced() ? 'auto' : 'smooth' });
  else if (target) target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
}

/* --- Fonts ----------------------------------------------------------------
   Fontshare is the primary source. If it is blocked (corporate proxy, region)
   the Google Fonts fallback is injected — and only then, so the happy path
   never pays for two font services.
   ------------------------------------------------------------------------- */
function fontFallback() {
  if (!document.fonts || !document.fonts.ready) return;
  document.fonts.ready.then(() => {
    const ok = document.fonts.check('600 1rem "Clash Display"') &&
               document.fonts.check('400 1rem "Satoshi"');
    if (ok) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600&family=Inter:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }).catch(() => {});
}

/* --- Preloader ------------------------------------------------------------ */
function preloader() {
  const el = $('#preloader');
  if (!el) return Promise.resolve();
  if (document.documentElement.classList.contains('no-preloader')) {
    el.remove();
    return Promise.resolve();
  }

  const out = $('.preloader-count', el);
  let done = false;

  const finish = () => {
    if (done) return;
    done = true;
    try { sessionStorage.setItem('ar-preloaded', '1'); } catch (e) { /* private mode */ }
    document.body.classList.remove('is-locked');
    if (has('gsap')) {
      window.gsap.to(el, {
        yPercent: -100,
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => el.remove()
      });
    } else {
      el.remove();
    }
  };

  document.body.classList.add('is-locked');

  // Counter 0 -> 100.
  let n = 0;
  const tick = setInterval(() => {
    n = Math.min(100, n + Math.ceil(Math.random() * 9));
    if (out) out.textContent = String(n).padStart(3, '0');
    if (n >= 100) clearInterval(tick);
  }, 90);

  // Hard guarantee: dismisses at 2.5s whatever happens to the assets.
  const hardStop = setTimeout(finish, 2500);

  return new Promise((resolve) => {
    const go = () => { clearTimeout(hardStop); clearInterval(tick); if (out) out.textContent = '100'; setTimeout(() => { finish(); resolve(); }, 260); };
    if (document.readyState === 'complete') setTimeout(go, 700);
    else window.addEventListener('load', () => setTimeout(go, 500), { once: true });
    setTimeout(resolve, 2500);
  });
}

/* --- Smooth scroll -------------------------------------------------------- */
function initLenis() {
  if (reduced() || !has('Lenis') || !has('gsap')) return;
  const gsap = window.gsap;
  lenis = new window.Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6
  });
  lenis.on('scroll', () => {
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* --- Custom cursor -------------------------------------------------------- */
function initCursor() {
  if (isTouch() || reduced() || !has('gsap')) return;
  const dot = $('#cursor-dot');
  const ring = $('#cursor-ring');
  if (!dot || !ring) return;

  const gsap = window.gsap;
  const label = $('.cursor-label', ring);

  const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3.out' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3.out' });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3.out' });

  /* The invariant that matters: `cursor-on` hides the native cursor, so it may
     only ever be set while the custom cursor is actually painted. Tying both to
     one pair of functions means there is no state where the native cursor is
     hidden and nothing has replaced it — which is what produced the invisible
     cursor on load and after the pointer re-entered the window. */
  let shown = false;

  function showCursor() {
    if (shown) return;
    shown = true;
    document.body.classList.add('cursor-on');
    gsap.to([dot, ring], { opacity: 1, duration: 0.3, overwrite: 'auto' });
  }

  function hideCursor() {
    if (!shown) return;
    shown = false;
    document.body.classList.remove('cursor-on');
    gsap.to([dot, ring], { opacity: 0, duration: 0.2, overwrite: 'auto' });
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    // Place the cursor before revealing it, so it never flashes in from 0,0.
    if (!shown) {
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      gsap.set(ring, { x: e.clientX, y: e.clientY });
      showCursor();
    }
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
  }, { passive: true });

  // Leaving the window restores the native cursor; re-entry is handled by the
  // next pointermove, which fires immediately on return.
  document.documentElement.addEventListener('mouseleave', hideCursor);
  window.addEventListener('blur', hideCursor);

  // A tab restored from bfcache re-runs no scripts, so reset explicitly.
  window.addEventListener('pageshow', (e) => { if (e.persisted) hideCursor(); });

  // If a touch or pen is used on a hybrid device, stand down entirely.
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') hideCursor();
  }, { passive: true });

  const INTERACTIVE = 'a, button, input, select, textarea, [role="button"], [data-cursor]';
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest && e.target.closest(INTERACTIVE);
    if (!t) return;
    const text = t.getAttribute('data-cursor');
    gsap.to(ring, { scale: text ? 2.1 : 1.55, duration: 0.35, ease: 'power2.inOut' });
    gsap.to(dot, { scale: text ? 0 : 0.4, duration: 0.3 });
    if (text && label) {
      label.textContent = text === 'drag' ? 'Drag' : text;
      gsap.to(label, { opacity: 1, scale: 1, duration: 0.3 });
    }
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest(INTERACTIVE);
    if (!t) return;
    gsap.to(ring, { scale: 1, duration: 0.35, ease: 'power2.inOut' });
    gsap.to(dot, { scale: 1, duration: 0.3 });
    if (label) gsap.to(label, { opacity: 0, scale: 0.6, duration: 0.2 });
  });
}

/* --- Site-wide aurora background -------------------------------------------
   The layer animates entirely in CSS, so this only adds two enhancements:
   pointer parallax. It writes a CSS custom property rather than styles, so
   nothing here is required for the background to work — if this function never runs, the aurora still drifts.
   --------------------------------------------------------------------------- */
function initAurora() {
  const bg = $('#site-bg');
  if (!bg || reduced()) return;

  // Halve the composited layer count on weak hardware. CSS does the rest.
  if (isLowPower()) document.documentElement.classList.add('low-power');

  // Pointer parallax: fine pointers only. On touch there is no hover position
  // to track, and the layer already moves on its own.
  if (!isTouch() && !isLowPower()) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const RANGE = 42; // px of travel at the screen edges

    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      bg.style.setProperty('--mx', cx.toFixed(2) + 'px');
      bg.style.setProperty('--my', cy.toFixed(2) + 'px');
      raf = (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1)
        ? requestAnimationFrame(loop) : null;
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = ((e.clientX / window.innerWidth) - 0.5) * 2 * RANGE;
      ty = ((e.clientY / window.innerHeight) - 0.5) * 2 * RANGE;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }

}

/* --- Page transitions ----------------------------------------------------- */
function initTransitions() {
  const curtain = $('#curtain');
  if (!curtain || reduced() || !has('gsap')) return;
  const gsap = window.gsap;

  // Curtain in on arrival (it sits below the viewport by default, so this is
  // only used when returning via bfcache).
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) gsap.set(curtain, { yPercent: 100 });
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition !== undefined) return;
    if (a.origin !== window.location.origin) return;
    if (a.pathname === window.location.pathname) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();
    gsap.set(curtain, { yPercent: 100 });
    gsap.to(curtain, {
      yPercent: 0,
      duration: 0.55,
      ease: 'power3.inOut',
      onComplete: () => { window.location.href = a.href; }
    });
    // Never strand the user if navigation is slow to start.
    setTimeout(() => { window.location.href = a.href; }, 900);
  });
}

/* --- Degradation watchdog -------------------------------------------------
   Anything that animations.js did not claim within 3s gets revealed.
   ------------------------------------------------------------------------- */
function watchdog() {
  if (!has('gsap')) {
    document.documentElement.classList.remove('js');
    return;
  }
  setTimeout(() => {
    $$('[data-reveal], [data-split]').forEach((el) => {
      if (!el.hasAttribute('data-anim-bound')) el.classList.add('is-revealed');
    });
  }, 3000);
}

/* --- Footer year + back to top -------------------------------------------- */
function initFooter() {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  const top = $('#back-to-top');
  if (top) {
    top.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo(0);
    });
  }

  // In-page anchors route through Lenis too.
  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href');
    if (!id || id === '#' || id === '#main') return;
    a.addEventListener('click', (e) => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      scrollTo(target, { offset: -80 });
    });
  });
}

/* --- Icons ---------------------------------------------------------------- */
function initIcons() {
  if (has('lucide') && window.lucide.createIcons) {
    try { window.lucide.createIcons(); } catch (e) { /* non-fatal */ }
  }
}

/* --- Boot ----------------------------------------------------------------- */
function boot() {
  fontFallback();
  initIcons();
  watchdog();

  if (has('gsap') && has('ScrollTrigger')) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  initLenis();
  initNav();
  initFooter();
  initComponents();
  initCharts();
  initForm();
  initCursor();
  initAurora();
  initTransitions();

  preloader().then(() => initAnimations());

  // ScrollTrigger needs a refresh once fonts have settled, or pinned sections
  // measure against fallback metrics and the case track ends up short.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }).catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
