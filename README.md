# Reportthy Scientific Assessment Platform

Reportthy is an academic computational platform designed for quasi-experimental educational evaluations. It streamlines pre/post intervention assessment, fuzzy cohort alignment, Jupyter notebook hypothesis testing, and automated Springer Nature (`sn-jnl`) manuscript synthesis.

## Core Architectural Invariants

1. **Jupyter as Sole Computational Authority**:
   - Zero statistical math is computed or emulated in Next.js / TypeScript.
   - All descriptive statistics, Shapiro-Wilk normality diagnostics, Wilcoxon signed-rank tests, and Mann-Whitney U cohort comparisons are executed strictly in a real, unmodified JupyterLab workspace running in JupyterHub.
   - All communication occurs via the official JupyterHub REST API (`/hub/api/...`) and Jupyter Server Contents API (`/user/{user}/api/contents/...`).

2. **Unified 3-Stage Pipeline**:
   - `/upload` -> 1. Import & Clean: 2-CSV Ingestion (Pretest + Posttest), automated quarantine filter, Levenshtein fuzzy matching ($\ge 0.85$), and pre-to-post attrition audit.
   - `/lab` -> 2. Jupyter Analysis Lab: Interactive embedded JupyterLab workstation provisioned automatically via JupyterHub REST API.
   - `/paper` -> 3. Unified Paper & QA: Springer Nature manuscript markup (`sn-jnl`), QA audit summary, booktabs tables, student validation matrix (`longtable`), and data-driven hypothesis verdict.

## Quickstart with Docker Compose

Launch the full stack (Next.js web application + JupyterHub server + SciPy/NumPy environment):

```bash
docker compose up --build
```

- **Reportthy Web App**: [http://localhost:3000](http://localhost:3000)
- **JupyterHub Server**: [http://localhost:8000](http://localhost:8000)

## Environment Variables

Copy `.env.example` to `.env.local` to customize service connections:

| Variable | Description | Default |
|---|---|---|
| `JUPYTERHUB_PUBLIC_URL` | Public URL accessible from browser `<iframe>` | `http://localhost:8000` |
| `JUPYTERHUB_INTERNAL_URL` | Internal URL for Next.js to call JupyterHub REST API | `http://localhost:8000` (`http://jupyterhub:8000` in Docker) |
| `JUPYTERHUB_API_TOKEN` | Admin API token configured in JupyterHub services | `reportthy-dev-token` |
| `JUPYTERHUB_USER` | Target JupyterHub username to spawn and manage | `researcher` |
| `REPORTTHY_INTERNAL_URL` | Internal backend URL for Jupyter kernels to sync | `http://localhost:3000` (`http://web:3000` in Docker) |

## Quality Verification

```bash
npm run verify
```
Runs strict TypeScript type checking (`tsc --noEmit`), ESLint, and Vitest test suites.
