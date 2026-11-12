# amirrezaww.github.io

Personal portfolio of Amirreza (Amir) Amini, ML engineer in London.

Plain HTML, CSS and JavaScript. No build step: GitHub Pages serves the folder as it is.

## Pages
- `index.html` home
- `work/rag.html`, `work/finsentinel.html`, `work/loan-default.html` case studies
- `credits.html` image credits

## Live demos (all in the browser, no server)
- `data/loan-model.json` is the tuned XGBoost from Loan_default_risk_predictor (388 trees), evaluated by `js/models.js`. Matches Python `predict_proba` to 2e-6 on 300 random applicants.
- `data/finsentinel-baseline.json` is the TF-IDF + logistic regression baseline from FinSentinel. Matches scikit-learn on all 190 test sentences.
- `data/rag-traces.json` holds the three committed rows of `rag_evaluation_results.csv`.

## Run locally
    python -m http.server 8000
then open http://localhost:8000 (the demos fetch JSON, so opening the file directly will not load them).

## Deploy
Push this folder to a public repository named `amirrezaww.github.io`, then Settings, Pages, Deploy from branch `main`, folder `/`.
