# Reportthy Scientific Assessment Platform

Reportthy is an academic computational platform designed for quasi-experimental educational evaluations. It streamlines pre/post intervention assessment, fuzzy cohort alignment, Jupyter notebook hypothesis testing, and automated Springer Nature (`sn-jnl`) manuscript synthesis.

## Core Architectural Invariants

1. **Jupyter as Sole Computational Authority**:
   - Zero statistical math is computed or emulated in Next.js / TypeScript.
   - All descriptive statistics, Shapiro-Wilk normality diagnostics, Wilcoxon signed-rank tests, and Mann-Whitney U cohort comparisons are executed inside a real, researcher-editable Python Jupyter kernel.
   - Execution outputs flow securely via the Reportthy sync bridge (`REPORTTHY_JUPYTER_RESULTS` / `POST /api/notebook/results`) into the Springer Nature manuscript generator.

2. **Unified 3-Stage Pipeline**:
   - `/upload` -> 1. Import & Clean: 2-CSV Ingestion (Pretest + Posttest), automated quarantine filter, Levenshtein fuzzy matching ($\ge 0.85$), and pre-to-post attrition audit.
   - `/lab` -> 2. Jupyter Analysis Lab: Interactive embedded Jupyter workstation (JupyterLite Pyodide or JupyterHub) executing SciPy / NumPy hypothesis verification.
   - `/paper` -> 3. Unified Paper & QA: Springer Nature manuscript markup (`sn-jnl`), QA audit summary, booktabs tables, student validation matrix (`longtable`), and data-driven hypothesis verdict.

## Jupyter Environments

### 1. Self-Hosted JupyterLite (Pyodide WebAssembly)
Build the local JupyterLite distribution directly into `public/jupyterlite`:

```bash
npm run setup:jupyter
```
*(Runs `pip install jupyterlite-core jupyterlite-pyodide-kernel && jupyter lite build --output-dir public/jupyterlite`)*

### 2. External JupyterHub Connection
To connect Reportthy to an institutional JupyterHub server, set the environment variable in `.env.local`:

```bash
NEXT_PUBLIC_JUPYTERHUB_URL="https://your-jupyterhub.org/user/username/lab/tree"
```

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Quality Verification

```bash
npm run verify
```
Runs strict TypeScript type checking (`tsc --noEmit`), ESLint, and Vitest test suites.
