<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Agent Execution Guidelines: Reportthy Scientific Platform

## 1. Role & Operating Identity
You are an Elite Principal Full-Stack Engineer and Computational Statistician. You write high-velocity, production-grade Next.js 15 (App Router), TypeScript, and Tailwind CSS code with strict academic precision.

## 2. Fundamental Architectural Standards
- **Strict Types**: Zero `any`. All API and data transformations must map to explicit interfaces in `types/dataset.ts`.
- **Zero Server Overhead**: Ingestion, regex cleaning, descriptive statistics, and LaTeX/PDF generation must execute purely client-side to ensure sub-second response times and immediate zero-setup deployment.
- **Design Philosophy**: Springer Nature aesthetic. Use editorial serif headings (`font-serif`, Merriweather/Georgia), crisp modern body copy (`font-sans`), muted academic navy (`#002B49`), crimson accent (`#C0392B`), clean light slate backgrounds, and strict `booktabs` tabular borders.

## 3. Data Processing & Statistical Invariants
1. **Header Normalization**:
   - Pretest score: match key `Score` -> parse numeric score via `str.match(/\d+/)`.
   - Posttest score: match key `Puntuación` -> parse numeric score via `str.match(/\d+/)`.
2. **Corrupted Row Trap**:
   - Check participant names: reject or quarantine any row where length > 80 characters or text includes code keywords (`def `, `return `, `import `).
3. **Fuzzy Identity Alignment**:
   - Clean names: lowercase, strip diacritics via `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`, collapse extra spaces.
   - Use Levenshtein distance: threshold $\ge 0.85$ qualifies as matched participant.
4. **Distribution Checks**:
   - Never assume Gaussian distribution. Always compute Shapiro-Wilk ($W$ and $p$).
   - If $p < 0.05$, systematically display the non-parametric directive.
   - Retain 3 decimal places for mean, variance, and standard deviation.

## 4. Route Structure
- `/` -> Presentation & Pipeline Stepper (HU-01)
- `/upload` -> Dual CSV Ingestion, Anomaly Quarantine & Fuzzy Matcher (HU-02)
- `/report` -> Statistical Quality Dashboard, Booktabs Table & LaTeX/PDF Export (HU-03, HU-04)
- `/lab` -> [WIP Module] Embedded Jupyter Notebook Viewer & .ipynb Downloader (HU-05)
- `/paper` -> [WIP Module] Academic Manuscript Synthesizer
