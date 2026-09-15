/* =============================================================================
   components.js — interactive parts.
   Accordions, expandable rows, tabs, filters (manual FLIP), modal with focus
   trap, marquee, counters, Swiper, before/after slider, tilt, sortable table.

   Every initialiser returns early when its root element is missing, so the
   same bundle runs on all seven pages without throwing.
   ============================================================================= */

import { $, $$, has, reduced, isTouch, getLenis } from './main.js';

/* --- Manual FLIP ----------------------------------------------------------
   GSAP's Flip plugin is outside the agreed dependency list, so this is a
   hand-rolled first/last/invert/play over the same gsap timeline.
   ------------------------------------------------------------------------- */
function flip(items, mutate) {
  if (!has('gsap') || reduced()) { mutate(); return; }
  const gsap = window.gsap;
  const first = new Map();
  items.forEach((el) => { if (el.offsetParent !== null) first.set(el, el.getBoundingClientRect()); });

  mutate();

  items.forEach((el) => {
    const prev = first.get(el);
    if (el.offsetParent === null) return;
    const now = el.getBoundingClientRect();
    if (!prev) {
      gsap.fromTo(el, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
      return;
    }
    const dx = prev.left - now.left;
    const dy = prev.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    gsap.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.55, ease: 'power3.out' });
  });
}

/* --- Accessible accordion -------------------------------------------------
   Works for the FAQ, the expertise rows and the process steps. `single` keeps
   one panel open at a time.
   ------------------------------------------------------------------------- */
function accordion(root, { single = true } = {}) {
  if (!root) return;
  const buttons = $$('[data-acc-btn]', root);
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

    const setOpen = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      panel.toggleAttribute('inert', !open);
      const step = btn.closest('.step');
      if (step) step.classList.toggle('is-open', open);
    };

    setOpen(btn.getAttribute('aria-expanded') === 'true');

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (single && !open) {
        buttons.forEach((other) => {
          if (other === btn) return;
          const p = document.getElementById(other.getAttribute('aria-controls'));
          other.setAttribute('aria-expanded', 'false');
          if (p) { p.classList.remove('is-open'); p.setAttribute('inert', ''); }
          const s = other.closest('.step');
          if (s) s.classList.remove('is-open');
        });
      }
      setOpen(!open);
      if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 520);
    });
  });

  // Roving arrow-key navigation between headers.
  root.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const i = buttons.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    let next = i;
    if (e.key === 'ArrowDown') next = (i + 1) % buttons.length;
    if (e.key === 'ArrowUp') next = (i - 1 + buttons.length) % buttons.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    buttons[next].focus();
  });
}

function initAccordions() {
  $$('[data-accordion]').forEach((root) => {
    accordion(root, { single: root.getAttribute('data-accordion') !== 'multi' });
  });
}

/* --- Counters ------------------------------------------------------------- */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;

  const run = (el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const end = parseFloat(el.getAttribute('data-count'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';

    if (reduced() || !has('countUp')) {
      el.textContent = prefix + end.toLocaleString('en-US', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals
      }) + suffix;
      return;
    }
    try {
      const c = new window.countUp.CountUp(el, end, {
        duration: 1.8, decimalPlaces: decimals, prefix, suffix, enableScrollSpy: false
      });
      if (c.error) { el.textContent = prefix + end + suffix; return; }
      c.start();
    } catch (e) {
      el.textContent = prefix + end + suffix;
    }
  };

  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      run(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.35 });
  els.forEach((el) => io.observe(el));
}

/* --- Marquee --------------------------------------------------------------
   Content is duplicated once in markup; the tween travels exactly half the
   width so the loop is seamless at any speed.
   ------------------------------------------------------------------------- */
function initMarquee() {
  const rows = $$('[data-marquee]');
  if (!rows.length) return;

  rows.forEach((row) => {
    const dir = row.getAttribute('data-marquee') === 'reverse' ? 1 : -1;
    const speed = parseFloat(row.getAttribute('data-speed') || '38');

    if (reduced() || !has('gsap')) return;
    const gsap = window.gsap;
    const half = () => row.scrollWidth / 2;

    gsap.set(row, { x: dir === -1 ? 0 : -half() });
    const tween = gsap.to(row, {
      x: dir === -1 ? () => -half() : 0,
      duration: speed,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: (x) => {
          const h = half();
          let v = parseFloat(x);
          v = v % h;
          if (v > 0) v -= h;
          return v + 'px';
        }
      }
    });

    const wrap = row.parentElement;
    wrap.addEventListener('pointerenter', () => tween.timeScale(0.15));
    wrap.addEventListener('pointerleave', () => tween.timeScale(1));
    wrap.addEventListener('focusin', () => tween.timeScale(0));
    wrap.addEventListener('focusout', () => tween.timeScale(1));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { e[0].isIntersecting ? tween.play() : tween.pause(); })
        .observe(wrap);
    }
  });
}

/* --- Tabs / chip filter (About skills matrix) ----------------------------- */
function initChipFilter() {
  const root = $('#skills-matrix');
  if (!root) return;
  const tabs = $$('[data-skill-tab]', root);
  const chips = $$('[data-skill-group]', root);
  const live = $('#skills-status');
  if (!tabs.length) return;

  const apply = (key) => {
    flip(chips, () => {
      chips.forEach((c) => {
        const match = key === 'all' || c.getAttribute('data-skill-group') === key;
        c.hidden = !match;
      });
    });
    tabs.forEach((t) => {
      const on = t.getAttribute('data-skill-tab') === key;
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    if (live) {
      const n = chips.filter((c) => !c.hidden).length;
      live.textContent = `${n} skill${n === 1 ? '' : 's'} shown.`;
    }
  };

  tabs.forEach((t) => t.addEventListener('click', () => apply(t.getAttribute('data-skill-tab'))));

  root.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = tabs.length - 1;
    tabs[n].focus();
    apply(tabs[n].getAttribute('data-skill-tab'));
  });

  apply('all');
}

/* --- Case study filter (Work page) ---------------------------------------- */
function initCaseFilter() {
  const root = $('#case-filter');
  const grid = $('#case-grid');
  if (!root || !grid) return;
  const buttons = $$('[data-filter]', root);
  const cards = $$('[data-tags]', grid);
  const live = $('#case-status');

  const apply = (key) => {
    flip(cards, () => {
      cards.forEach((c) => {
        const tags = (c.getAttribute('data-tags') || '').split(/\s+/);
        c.hidden = !(key === 'all' || tags.includes(key));
      });
    });
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === key)));
    if (live) {
      const n = cards.filter((c) => !c.hidden).length;
      live.textContent = `${n} case stud${n === 1 ? 'y' : 'ies'} shown.`;
    }
    if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 600);
  };

  buttons.forEach((b) => b.addEventListener('click', () => apply(b.getAttribute('data-filter'))));
  apply('all');
}

/* --- Modal with focus trap ------------------------------------------------ */
function initModal() {
  const modal = $('#case-modal');
  if (!modal) return;
  const panel = $('.modal-panel-body', modal);
  const closeBtn = $('.modal-close', modal);
  const backdrop = $('.modal-backdrop', modal);
  let lastFocus = null;

  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function open(id) {
    const src = document.getElementById(id);
    if (!src || !panel) return;
    panel.innerHTML = src.innerHTML;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-locked');
    const lenis = getLenis();
    if (lenis) lenis.stop();
    if (has('lucide')) { try { window.lucide.createIcons(); } catch (e) { /* noop */ } }
    if (has('gsap') && !reduced()) {
      window.gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      window.gsap.fromTo($('.modal-panel', modal), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    }
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('is-locked');
    const lenis = getLenis();
    if (lenis) lenis.start();
    if (panel) panel.innerHTML = '';
    if (lastFocus) lastFocus.focus();
  }

  $$('[data-case-open]').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.getAttribute('data-case-open')));
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, modal).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* --- Testimonials slider -------------------------------------------------- */
function initSwiper() {
  const el = $('#testimonial-swiper');
  if (!el || !has('Swiper')) return;
  const bullets = $$('#testimonial-pagination .sw-bullet');

  const paint = (index) => {
    bullets.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.classList.toggle('is-done', i < index);
      b.setAttribute('aria-current', i === index ? 'true' : 'false');
      if (i !== index) b.style.removeProperty('--p');
    });
  };

  const sw = new window.Swiper(el, {
    slidesPerView: 1,
    spaceBetween: 24,
    grabCursor: true,
    a11y: { enabled: true, prevSlideMessage: 'Previous testimonial', nextSlideMessage: 'Next testimonial' },
    keyboard: { enabled: true },
    autoplay: reduced() ? false : { delay: 5200, disableOnInteraction: false },
    speed: 620,
    breakpoints: { 768: { slidesPerView: 2 }, 1280: { slidesPerView: 2.4 } },
    on: {
      init() { paint(this.realIndex); },
      slideChange() { paint(this.realIndex); },
      autoplayTimeLeft(s, time, progress) {
        const b = bullets[s.realIndex];
        if (b) b.style.setProperty('--p', String(1 - progress));
      }
    }
  });

  bullets.forEach((b, i) => b.addEventListener('click', () => sw.slideTo(i)));

  if (!reduced()) {
    el.addEventListener('pointerenter', () => sw.autoplay && sw.autoplay.stop());
    el.addEventListener('pointerleave', () => sw.autoplay && sw.autoplay.start());
  }
}

/* --- Before / after comparison -------------------------------------------- */
function initBeforeAfter() {
  const root = $('#ba');
  if (!root) return;
  const after = $('.ba-after', root);
  const handle = $('.ba-handle', root);
  const grip = $('.ba-grip', root);
  if (!after || !handle || !grip) return;

  let value = 50;
  const set = (v) => {
    value = Math.max(0, Math.min(100, v));
    after.style.clipPath = `inset(0 0 0 ${value}%)`;
    handle.style.left = `${value}%`;
    grip.setAttribute('aria-valuenow', String(Math.round(value)));
  };

  const fromEvent = (e) => {
    const r = root.getBoundingClientRect();
    set(((e.clientX - r.left) / r.width) * 100);
  };

  let dragging = false;
  root.addEventListener('pointerdown', (e) => {
    dragging = true;
    root.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  root.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
  const stop = (e) => {
    dragging = false;
    try { root.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
  };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);

  grip.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') { e.preventDefault(); set(value - step); }
    if (e.key === 'ArrowRight') { e.preventDefault(); set(value + step); }
    if (e.key === 'Home') { e.preventDefault(); set(0); }
    if (e.key === 'End') { e.preventDefault(); set(100); }
  });

  set(50);
}

/* --- Tilt (certifications only, 6 degrees) -------------------------------- */
function initTilt() {
  if (isTouch() || reduced() || !has('VanillaTilt')) return;
  const els = $$('[data-tilt-card]');
  if (!els.length) return;
  window.VanillaTilt.init(els, {
    max: 6, speed: 500, glare: false, scale: 1.01, perspective: 1200, gyroscope: false
  });
}

/* --- Flip cards (About values) -------------------------------------------- */
function initFlipCards() {
  $$('.flip-card').forEach((card) => {
    const toggle = () => {
      const on = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', String(!on));
      const front = $('.flip-front', card);
      const back = $('.flip-back', card);
      if (front) front.toggleAttribute('inert', !on === true ? true : false);
      if (back) back.toggleAttribute('inert', !on === true ? false : true);
    };
    card.setAttribute('aria-pressed', 'false');
    const back = $('.flip-back', card);
    if (back) back.setAttribute('inert', '');
    card.addEventListener('click', toggle);
  });
}

/* --- Sortable / filterable deliverables table ----------------------------- */
function initTable() {
  const table = $('#deliverables');
  if (!table) return;
  const tbody = $('tbody', table);
  const headers = $$('.th-sort', table);
  const filters = $$('[data-table-filter]');
  const live = $('#table-status');
  let activeFilter = 'all';

  const rows = () => Array.from(tbody.rows);

  const applyFilter = () => {
    rows().forEach((r) => {
      r.hidden = !(activeFilter === 'all' || r.getAttribute('data-cat') === activeFilter);
    });
    if (live) {
      const n = rows().filter((r) => !r.hidden).length;
      live.textContent = `${n} deliverable${n === 1 ? '' : 's'} shown.`;
    }
  };

  filters.forEach((b) => {
    b.addEventListener('click', () => {
      activeFilter = b.getAttribute('data-table-filter');
      filters.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      applyFilter();
    });
  });

  headers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-col'), 10);
      const dir = btn.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      headers.forEach((h) => h.setAttribute('aria-sort', 'none'));
      btn.setAttribute('aria-sort', dir);
      const sorted = rows().sort((a, b2) => {
        const x = a.cells[idx].textContent.trim().toLowerCase();
        const y = b2.cells[idx].textContent.trim().toLowerCase();
        return dir === 'ascending' ? x.localeCompare(y) : y.localeCompare(x);
      });
      sorted.forEach((r) => tbody.appendChild(r));
      if (live) live.textContent = `Sorted by ${btn.textContent.trim()}, ${dir}.`;
    });
  });

  applyFilter();
}

/* --- Deliverable checklists tick in on hover / focus ---------------------- */
function initChecklists() {
  $$('[data-checklist]').forEach((list) => {
    const items = $$('li', list);
    const play = () => {
      if (list.dataset.played) return;
      list.dataset.played = '1';
      items.forEach((li, i) => setTimeout(() => li.classList.add('is-ticked'), reduced() ? 0 : i * 90));
    };
    const block = list.closest('[data-service-block]') || list;
    block.addEventListener('pointerenter', play);
    block.addEventListener('focusin', play);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { if (e[0].isIntersecting && reduced()) play(); }, { threshold: 0.4 }).observe(list);
    }
  });
}

/* --- Read more expansion (About story) ------------------------------------ */
function initReadMore() {
  $$('[data-readmore]').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    panel.setAttribute('inert', '');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.classList.toggle('is-open', !open);
      panel.toggleAttribute('inert', open);
      const label = $('.rm-label', btn);
      if (label) label.textContent = open ? 'Read the longer version' : 'Show less';
    });
  });
}

/* --- CV download micro-animation ------------------------------------------ */
function initDownload() {
  $$('[data-download-anim]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.busy) return;
      btn.dataset.busy = '1';
      const label = $('.dl-label', btn);
      const prev = label ? label.textContent : '';
      if (label) label.textContent = 'Downloading';
      btn.classList.add('is-busy');
      setTimeout(() => {
        btn.classList.remove('is-busy');
        if (label) label.textContent = prev;
        delete btn.dataset.busy;
      }, 1600);
    });
  });
}

export function initComponents() {
  initAccordions();
  initCounters();
  initMarquee();
  initChipFilter();
  initCaseFilter();
  initModal();
  initSwiper();
  initBeforeAfter();
  initTilt();
  initFlipCards();
  initTable();
  initChecklists();
  initReadMore();
  initDownload();
}