const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Section entrances: once, never leaving content hidden. */
(() => {
  const els = document.querySelectorAll('[data-reveal], [data-reveal-self]');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  els.forEach((e) => io.observe(e));
  addEventListener('load', () => setTimeout(() => els.forEach((e) => {
    const r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) e.classList.add('is-in');
  }), 2500));
})();

/* The rail: paper-coloured over the pictures, page-coloured once they have passed. */
(() => {
  const rail = document.querySelector('[data-rail]');
  if (!rail) return;
  const detail = document.querySelector('.hero-detail');
  const update = () => {
    if (!detail) { rail.classList.add('is-light'); return; }
    const end = detail.getBoundingClientRect().bottom;
    rail.classList.toggle('is-light', end <= rail.offsetHeight);
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
  const toggle = rail.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = rail.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    rail.querySelectorAll('.rail-nav a').forEach((a) => a.addEventListener('click', () => {
      rail.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu';
    }));
  }
})();

/* Signature move: the hero photograph slowly changes, like light shifting in a room. */
(() => {
  const box = document.querySelector('[data-crossfade]');
  if (!box || reduce) return;
  const imgs = [...box.querySelectorAll('img')];
  imgs.slice(1).forEach((i) => { i.loading = 'eager'; });
  let k = 0, timer;
  const step = () => {
    imgs[k].classList.remove('is-on');
    k = (k + 1) % imgs.length;
    const next = imgs[k];
    next.classList.remove('is-on'); void next.offsetWidth; next.classList.add('is-on');
  };
  const start = () => { clearInterval(timer); timer = setInterval(step, 6200); };
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
  start();
})();

/* Ledger: hovering or focusing a row shows its figure beside the list, level with the row. */
(() => {
  const list = document.querySelector('[data-ledger]');
  const box = document.querySelector('[data-preview-box]');
  if (!list || !box) return;
  const figs = [...box.children];
  const section = box.parentElement;
  const show = (row) => {
    const i = Number(row.dataset.preview);
    if (Number.isNaN(i)) return;
    figs.forEach((f, j) => f.classList.toggle('is-on', j === i));
    const top = row.getBoundingClientRect().top - section.getBoundingClientRect().top;
    box.style.transform = `translateY(${Math.max(0, top - 8)}px)`;
  };
  list.querySelectorAll('[data-preview]').forEach((row) => {
    row.addEventListener('mouseenter', () => show(row));
    row.addEventListener('focus', () => show(row));
  });
  const first = list.querySelector('[data-preview]');
  const place = () => first && show(first);
  addEventListener('load', place); place();
})();

/* Live scorer: load the real model only when the scorer comes near the screen. */
(() => {
  const forms = document.querySelectorAll('[data-scorer]');
  if (!forms.length) return;
  const root = document.querySelector('meta[name="site-root"]')?.content || '';
  const boot = async (form) => {
    const { mountScorer } = await import('./scorer.js');
    mountScorer(form, `${root}data/loan-model.json`);
  };
  if (!('IntersectionObserver' in window)) { forms.forEach(boot); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); boot(e.target); }
  }, { rootMargin: '600px 0px' });
  forms.forEach((f) => io.observe(f));
})();
