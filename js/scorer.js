import { LoanModel } from './models.js';

let modelPromise;
const getModel = (url) => (modelPromise ||= fetch(url).then((r) => r.json()).then((spec) => new LoanModel(spec)));

const pct = (p) => `${(p * 100).toFixed(1)}%`;
const money = (v) => `£${Math.round(v).toLocaleString('en-GB')}`;

/* Inputs follow the Hugging Face Space defaults; the form only overrides what it exposes. */
function readInput(form) {
  const v = (name, fallback) => {
    const el = form.querySelector(`[data-field="${name}"]`);
    if (!el) return fallback;
    return el.tagName === 'SELECT' ? el.value : Number(el.value);
  };
  const employed = v('employed', 'yes');
  const years = v('emp', 5);
  const age = v('age', 35);
  const income = v('income', 135000);
  const credit = v('credit', 500000);
  const annuity = v('annuity', 25000);
  return {
    EXT_SOURCE_2: v('ext2', 0.5),
    EXT_SOURCE_3: v('ext3', 0.5),
    DAYS_BIRTH: -(age * 365),
    DAYS_EMPLOYED: employed === 'no' ? 365243 : -(years * 365),
    AMT_INCOME_TOTAL: income,
    AMT_CREDIT: credit,
    AMT_ANNUITY: annuity,
    AMT_GOODS_PRICE: credit * 0.9,
    NAME_INCOME_TYPE: employed === 'no' ? 'Pensioner' : v('incomeType', 'Working'),
    NAME_EDUCATION_TYPE: v('education', 'Secondary / secondary special'),
    NAME_CONTRACT_TYPE: 'Cash loans',
  };
}

export async function mountScorer(form, url) {
  const out = (k) => form.querySelector(`[data-out="${k}"]`);
  let model;
  try { model = await getModel(url); } catch (e) {
    out('prob').textContent = 'n/a';
    form.querySelector('.foot').textContent = 'The model file could not be loaded here. The figures beside it come from the notebook.';
    return;
  }
  form.dataset.state = 'ready';
  const thr = form.querySelector('[data-field="thr"]');

  const render = () => {
    form.querySelectorAll('input[type="range"]').forEach((el) => {
      const o = form.querySelector(`[data-out="${el.dataset.field}"]`);
      if (!o) return;
      const n = Number(el.value);
      const f = el.dataset.format;
      o.textContent = f === 'money' ? money(n) : f === 'int' || Number.isInteger(n) && el.step === '1' ? String(n) : n.toFixed(2);
    });
    const empSel = form.querySelector('[data-field="employed"]');
    const empRange = form.querySelector('[data-field="emp"]');
    if (empSel && empRange) empRange.disabled = empSel.value === 'no';

    const p = model.probability(readInput(form));
    out('prob').textContent = pct(p);
    out('fill').style.width = `${Math.min(100, p * 100)}%`;
    const verdict = (t) => (p >= t ? 'flag for review' : 'approve');
    const d50 = out('d50'), d18 = out('d18');
    d50.textContent = verdict(0.5); d50.classList.toggle('flag', p >= 0.5);
    d18.textContent = verdict(0.18); d18.classList.toggle('flag', p >= 0.18);
    if (thr) {
      const t = Number(thr.value);
      const dt = out('dt');
      dt.textContent = verdict(t); dt.classList.toggle('flag', p >= t);
      out('tlabel').textContent = t.toFixed(2);
      const tick = form.querySelector('[data-tick="user"]');
      if (tick) { tick.style.left = `${t * 100}%`; }
    }
  };
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
}
