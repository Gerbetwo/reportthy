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
- **Jupyter as Sole Computational Authority**: ZERO statistical calculations or hypothesis verifications are computed or emulated in Next.js / TypeScript. All descriptive statistics, normality diagnostics, Wilcoxon signed-rank tests, and Mann-Whitney U tests are executed strictly in a real Jupyter environment (official JupyterHub service running real JupyterLab and communicating via JupyterHub & Jupyter Server REST APIs).
- **Zero Server Overhead for Data Cleaning**: Ingestion, regex cleaning, Levenshtein reconciliation, and LaTeX/PDF generation execute purely client-side.
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
   - Executed strictly via `scipy.stats.shapiro` in Python. Never assume Gaussian distribution.
   - If $p < 0.05$, systematically display the non-parametric directive.
   - Retain 3 decimal places for mean, variance, and standard deviation.

## 4. Route Structure
- `/` -> Presentation & Pipeline Stepper (HU-01)
- `/upload` -> 1. Import & Clean: Dual CSV Ingestion (Pretest + Posttest only), Anomaly Quarantine, Fuzzy Matcher & Pre-vs-Post Attrition Audit (HU-02) -> proceeds to `/lab`
- `/lab` -> 2. Jupyter Analysis Lab: Genuine embedded JupyterLab backed by JupyterHub, communicating via official JupyterHub & Contents REST APIs (HU-05) -> proceeds to `/paper`
- `/paper` -> 3. Unified Paper & QA: Requires verified Jupyter execution; QA & Hypothesis Verdict banner plus the single Springer Nature manuscript (data quality audit, booktabs descriptive & hypothesis tables, longtable student matrix, code cell audit drawer, data-driven verdict) with LaTeX/PDF export (HU-03, HU-04)
- The legacy `/report` route and `lib/latexTemplate.ts` have been removed; `lib/paperLatexTemplate.ts` is the sole LaTeX generator.
- **2-CSV Ingestion Only**: There is no Excel/`.xlsx` master roster (the `xlsx` dependency is removed). Longitudinal pairing and attrition are computed exclusively by contrasting the Pretest CSV against the Posttest CSV in `pairPreAndPost` (`attritionCount` = unmatched pretest respondents, `attritionRate` = `attritionCount / preCount * 100`).

## 5. Internationalization & Localization (i18n) Mandate
- **Bilingual Architecture Requirement**: The application supports full real-time bilingual switching (**English & Spanish**) managed client-side via `@/lib/LanguageContext.tsx`.
- **Zero Hardcoded Strings in Components**:
  - NEVER hardcode user-facing UI text inside components (`.tsx`).
  - ALWAYS consume translations using the `useTranslation()` hook: `const { lang, t } = useTranslation();`.
  - ALWAYS declare new text keys symmetrically in both `@/locales/en.ts` and `@/locales/es.ts`.
  - `@/locales/en.ts` serves as the TypeScript contract (`export type Translations = typeof en;`). `@/locales/es.ts` must strictly conform to this interface type.
- **Dynamic Springer Nature LaTeX Translation**:
  - The LaTeX compilation function (`generateFullPaperLatex` in `@/lib/paperLatexTemplate.ts`) accepts `jupyterResults: JupyterExecutionResult`, `pairedData: PairedParticipant[]`, `lang: 'en' | 'es'`.
  - LaTeX section headings, abstracts, captions, methodology notes, and non-parametric rejection mandates must render dynamically in the active document language.
- **Template Literal Escaping in Automation Scripts**:
  - When writing Node.js / TypeScript code generator scripts that emit TypeScript files containing template literals (e.g., `${variable}`), ALWAYS escape runtime interpolations as `\${variable}` to prevent premature script-time evaluation.
