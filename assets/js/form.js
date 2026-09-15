/* =============================================================================
   form.js — contact form: floating labels, specific inline validation,
   character counter, loading state, success state.

   SUBMIT HANDLER IS A STUB. Nothing is sent anywhere. To go live, replace the
   body of `send()` below with a Formspree / EmailJS / your-own-backend call —
   see README.md, "Wiring the contact form".
   ============================================================================= */

import { $, $$, has, reduced } from './main.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX = 1200;

/* Specific messages. Never "invalid input". */
const RULES = {
  name(v) {
    if (!v.trim()) return 'Please add your name so I know who I am replying to.';
    if (v.trim().length < 2) return 'That looks a little short — please enter your full name.';
    return '';
  },
  email(v) {
    if (!v.trim()) return 'I need an email address to reply to.';
    if (!v.includes('@')) return 'An email address needs an @ — for example name@company.com.';
    if (!EMAIL_RE.test(v.trim())) return 'That address is not quite right. Check the part after the @, like company.com.';
    return '';
  },
  company(v) {
    if (v.trim() && v.trim().length < 2) return 'Please enter the full company name, or leave this blank.';
    return '';
  },
  service(v) {
    if (!v) return 'Pick the area you want help with so I can come back with something useful.';
    return '';
  },
  message(v) {
    if (!v.trim()) return 'Tell me a little about the site and what you are trying to fix.';
    if (v.trim().length < 20) return `A few more details would help — ${20 - v.trim().length} more character${20 - v.trim().length === 1 ? '' : 's'} to go.`;
    if (v.length > MAX) return `That is ${v.length - MAX} characters over the ${MAX} limit.`;
    return '';
  }
};

function floatLabels(form) {
  $$('.field', form).forEach((field) => {
    const input = $('input, textarea, select', field);
    if (!input) return;
    const sync = () => field.classList.toggle('is-filled', !!input.value);
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    input.addEventListener('blur', sync);
    sync();
  });
}

function counter(form) {
  const ta = $('#message', form);
  const out = $('#message-counter', form);
  if (!ta || !out) return;
  ta.setAttribute('maxlength', String(MAX + 200)); // allow overflow so the error can explain it
  const sync = () => {
    const n = ta.value.length;
    out.textContent = `${n} / ${MAX}`;
    out.classList.toggle('is-over', n > MAX);
  };
  ta.addEventListener('input', sync);
  sync();
}

function validateField(input) {
  const field = input.closest('.field');
  const rule = RULES[input.name];
  if (!field || !rule) return true;
  const msg = rule(input.value);
  const out = $('.field-error', field);
  field.classList.toggle('is-error', !!msg);
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (out) out.textContent = msg;
  return !msg;
}

/* STUB — replace with a real transport. Resolves after a short delay so the
   loading and success states are demonstrable. */
function send(payload) {
  return new Promise((resolve) => {
    // eslint-disable-next-line no-console
    console.info('[contact form stub] would send:', payload);
    setTimeout(resolve, 1100);
  });
}

export function initForm() {
  const form = $('#contact-form');
  if (!form) return;

  const submit = $('#contact-submit', form);
  const status = $('#form-status');
  const success = $('#form-success');

  floatLabels(form);
  counter(form);

  $$('input, textarea, select', form).forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('is-error')) validateField(input);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // never reloads the page

    const inputs = $$('input, textarea, select', form);
    let firstBad = null;
    inputs.forEach((input) => {
      const ok = validateField(input);
      if (!ok && !firstBad) firstBad = input;
    });

    if (firstBad) {
      if (status) status.textContent = 'Some details need another look before this can be sent.';
      firstBad.focus();
      return;
    }

    if (status) status.textContent = 'Sending your message.';
    if (submit) {
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      const label = $('.btn-label', submit);
      if (label) label.textContent = 'Sending';
    }

    const payload = Object.fromEntries(new FormData(form).entries());

    try {
      await send(payload);
      if (status) status.textContent = 'Message sent. I will reply within one business day.';
      if (success && has('gsap') && !reduced()) {
        window.gsap.to(form, {
          opacity: 0,
          y: -12,
          duration: 0.4,
          ease: 'power2.inOut',
          onComplete: () => {
            form.hidden = true;
            success.hidden = false;
            window.gsap.fromTo(success, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
            const h = $('h3, [tabindex]', success);
            if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
          }
        });
      } else if (success) {
        form.hidden = true;
        success.hidden = false;
        const h = $('h3', success);
        if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      }
    } catch (err) {
      if (status) status.textContent = 'That did not send. Email agmanpurohit@gmail.com directly and I will pick it up.';
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        const label = $('.btn-label', submit);
        if (label) label.textContent = 'Send message';
      }
    }
  });

  const reset = $('#form-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      form.style.opacity = '1';
      form.style.transform = 'none';
      if (success) success.hidden = true;
      if (submit) {
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        const label = $('.btn-label', submit);
        if (label) label.textContent = 'Send message';
      }
      $$('.field', form).forEach((f) => f.classList.remove('is-error', 'is-filled'));
      $$('.field-error', form).forEach((f) => { f.textContent = ''; });
      if (status) status.textContent = '';
    });
  }
}
