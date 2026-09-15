/* =============================================================================
   nav.js — sticky header state, scroll-progress bar, full-screen mobile menu
   ============================================================================= */

import { $, $$, has, reduced, getLenis } from './main.js';

function initHeaderState() {
  const header = $('#site-header');
  const bar = $('#scroll-progress');
  if (!header && !bar) return;

  let ticking = false;
  const update = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-stuck', y > 80);
    if (bar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, y / max) : 0;
      bar.style.transform = `scaleX(${p})`;
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}

function initMobileMenu() {
  const burger = $('#burger');
  const overlay = $('#menu-overlay');
  if (!burger || !overlay) return;

  const links = $$('a', overlay);
  const gsap = has('gsap') ? window.gsap : null;
  let open = false;
  let lastFocus = null;

  const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function setOpen(next) {
    if (next === open) return;
    open = next;
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);

    const lenis = getLenis();
    if (lenis) { open ? lenis.stop() : lenis.start(); }

    if (open) {
      lastFocus = document.activeElement;
      overlay.classList.add('is-open');
      overlay.removeAttribute('aria-hidden');
    } else {
      overlay.setAttribute('aria-hidden', 'true');
    }

    if (gsap && !reduced()) {
      if (open) {
        gsap.timeline()
          .set(overlay, { clipPath: 'inset(0 0 100% 0)' })
          .to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power3.inOut' })
          .from(links, { yPercent: 110, opacity: 0, duration: 0.55, stagger: 0.055, ease: 'power3.out' }, '-=0.25')
          .from('.menu-foot', { opacity: 0, y: 14, duration: 0.4 }, '-=0.3');
      } else {
        gsap.to(overlay, {
          clipPath: 'inset(0 0 100% 0)',
          duration: 0.5,
          ease: 'power3.inOut',
          onComplete: () => overlay.classList.remove('is-open')
        });
      }
    } else {
      overlay.style.clipPath = open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)';
      if (!open) overlay.classList.remove('is-open');
    }

    if (open) {
      setTimeout(() => { const f = overlay.querySelector(FOCUSABLE); if (f) f.focus(); }, 260);
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }

  burger.addEventListener('click', () => setOpen(!open));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key !== 'Tab') return;
    // Focus trap.
    const items = $$(FOCUSABLE, overlay).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // A resize past the desktop breakpoint should not leave the body locked.
  window.addEventListener('resize', () => {
    if (open && window.innerWidth >= 1024) setOpen(false);
  });
}

export function initNav() {
  initHeaderState();
  initMobileMenu();
}
