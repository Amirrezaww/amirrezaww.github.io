/* Real models, run in the browser.
   LoanModel: Amir's tuned XGBoost (388 trees) exported from xgb_model_tuned.json.
   Baseline: the TF-IDF + logistic regression baseline from FinSentinel. */

const f32 = Math.fround;

export class LoanModel {
  constructor(spec) {
    this.spec = spec;
    this.index = Object.fromEntries(spec.features.map((f, i) => [f, i]));
  }

  static DEFAULTS = {
    FLAG_MOBIL: 1, FLAG_WORK_PHONE: 0, FLAG_CONT_MOBILE: 1, FLAG_EMAIL: 0,
    HOUR_APPR_PROCESS_START: 12, REG_REGION_NOT_LIVE_REGION: 0,
    REG_REGION_NOT_WORK_REGION: 0, LIVE_REGION_NOT_WORK_REGION: 0,
    AMT_REQ_CREDIT_BUREAU_HOUR: 0, AMT_REQ_CREDIT_BUREAU_DAY: 0,
    AMT_REQ_CREDIT_BUREAU_WEEK: 0, AMT_REQ_CREDIT_BUREAU_MON: 0,
    NAME_TYPE_SUITE: 'Unaccompanied', NAME_HOUSING_TYPE: 'House / apartment',
    DAYS_REGISTRATION: -5000, DAYS_ID_PUBLISH: -3000, FLAG_EMP_PHONE: 1,
    FLAG_PHONE: 0, FLAG_DOCUMENT_3: 1, AMT_REQ_CREDIT_BUREAU_YEAR: 1,
    AMT_REQ_CREDIT_BUREAU_QRT: 0, REGION_POPULATION_RELATIVE: 0.02,
    WEEKDAY_APPR_PROCESS_START: 'MONDAY', DEF_30_CNT_SOCIAL_CIRCLE: 0,
    OBS_30_CNT_SOCIAL_CIRCLE: 0, OBS_60_CNT_SOCIAL_CIRCLE: 0,
    DEF_60_CNT_SOCIAL_CIRCLE: 0, DAYS_LAST_PHONE_CHANGE: -1000,
    LIVE_CITY_NOT_WORK_CITY: 0, REG_CITY_NOT_LIVE_CITY: 0, REG_CITY_NOT_WORK_CITY: 0,
    NAME_CONTRACT_TYPE: 'Cash loans', CODE_GENDER: 'F', FLAG_OWN_CAR: 'N',
    FLAG_OWN_REALTY: 'Y', CNT_CHILDREN: 0, CNT_FAM_MEMBERS: 2,
    NAME_FAMILY_STATUS: 'Married', OCCUPATION_TYPE: 'Laborers',
    ORGANIZATION_TYPE: 'Business Entity Type 3', REGION_RATING_CLIENT: 2,
    REGION_RATING_CLIENT_W_CITY: 2,
  };

  /* Mirrors engineer_features() and the payload in the Hugging Face Space app. */
  vector(input) {
    const p = { ...LoanModel.DEFAULTS, ...input };
    for (let k = 2; k <= 21; k++) if (k !== 3 && p[`FLAG_DOCUMENT_${k}`] === undefined) p[`FLAG_DOCUMENT_${k}`] = 0;
    p.CREDIT_INCOME_RATIO = p.AMT_CREDIT / p.AMT_INCOME_TOTAL;
    p.ANNUITY_INCOME_RATIO = p.AMT_ANNUITY / p.AMT_INCOME_TOTAL;
    p.CREDIT_TERM = p.AMT_CREDIT / p.AMT_ANNUITY;
    p.AGE_YEARS = Math.abs(p.DAYS_BIRTH) / 365;
    p.YEARS_EMPLOYED = Math.abs(p.DAYS_EMPLOYED) / 365;
    p.DAYS_EMPLOYED_ANOMALY = p.DAYS_EMPLOYED === 365243 ? 1 : 0;
    p.HAS_CAR = p.FLAG_OWN_CAR === 'Y' ? 1 : 0;
    const cats = this.spec.cats;
    return this.spec.features.map((f) => {
      const v = p[f];
      if (cats[f]) {
        const i = cats[f].indexOf(String(v));
        if (i < 0) throw new Error(`Unknown category ${v} for ${f}`);
        return i;
      }
      return v;
    });
  }

  margin(x) {
    let sum = 0;
    for (const nodes of this.spec.trees) {
      let n = 0;
      for (;;) {
        const node = nodes[n];
        if (node[0] === -1) { sum += node[1]; break; }
        const v = x[node[2]];
        if (v === null || v === undefined || Number.isNaN(v)) n = node[4] ? node[0] : node[1];
        else n = f32(v) < f32(node[3]) ? node[0] : node[1];
      }
    }
    return sum;
  }

  probability(input) {
    const m = this.margin(this.vector(input));
    return 1 / (1 + Math.exp(-m));
  }
}

/* sklearn TfidfVectorizer(strip_accents='unicode', lowercase, ngram (1,2), sublinear_tf, l2)
   followed by LogisticRegression (multinomial). */
export class Baseline {
  constructor(spec) {
    this.spec = spec;
    this.vocab = new Map(spec.terms.map((t, i) => [t, i]));
    this.re = /\b[a-zA-Z][a-zA-Z0-9]*\b/g;
  }

  tokens(text) {
    const clean = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return clean.match(this.re) || [];
  }

  features(text) {
    const toks = this.tokens(text);
    const grams = [...toks];
    for (let i = 0; i < toks.length - 1; i++) grams.push(`${toks[i]} ${toks[i + 1]}`);
    const tf = new Map();
    for (const g of grams) {
      const j = this.vocab.get(g);
      if (j !== undefined) tf.set(j, (tf.get(j) || 0) + 1);
    }
    let norm = 0;
    const w = new Map();
    for (const [j, c] of tf) {
      const v = (1 + Math.log(c)) * this.spec.idf[j];
      w.set(j, v);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [j, v] of w) w.set(j, v / norm);
    return w;
  }

  predict(text) {
    const w = this.features(text);
    const { coef, intercept, classes, terms } = this.spec;
    const z = intercept.map((b, k) => {
      let s = b;
      for (const [j, v] of w) s += coef[k][j] * v;
      return s;
    });
    const mx = Math.max(...z);
    const e = z.map((v) => Math.exp(v - mx));
    const tot = e.reduce((a, b) => a + b, 0);
    const probs = e.map((v) => v / tot);
    const best = probs.indexOf(Math.max(...probs));
    /* contribution of each known term toward the predicted class */
    const drivers = [...w].map(([j, v]) => ({ term: terms[j], weight: coef[best][j] * v }))
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    return { label: classes[best], probs: Object.fromEntries(classes.map((c, k) => [c, probs[k]])), drivers, known: w.size };
  }
}
