# Agile Product Backlog: Reportthy Scientific Platform

## Executive Summary
Reportthy is an automated empirical analytics pipeline designed to ingest educational pre/post-intervention datasets, isolate corrupted data, compute distribution diagnostics (normality, variance shifts, attrition), compile academic LaTeX/PDF deliverables adhering to Springer Nature specifications, and facilitate exploratory hypothesis verification via an integrated Jupyter environment.

---

## User Stories & Acceptance Criteria

### HU-01: Research Workflow Stepper & Presentation Screen
**As a** researcher or pedagogical analyst,  
**I want** a clear entry dashboard showing the end-to-end scientific pipeline stages,  
**So that** I understand the status of my analysis and can navigate between quality reporting, hypothesis verification, and paper compilation.

- **Scenario 1: Stepper Mount & Progression State**
  - **Given** a user accesses the root route `/`,
  - **When** the page renders,
  - **Then** a 4-phase visual pipeline is displayed:
    1. *Data Ingestion & Sanitization* (Active)
    2. *Distribution Quality Diagnostics* (Active)
    3. *Hypothesis Testing Lab (Jupyter)* (WIP/Beta)
    4. *Springer Nature Manuscript Compilation* (WIP/Beta)
  - **And** clicking "Start Analysis" routes directly to `/upload`.

---

### HU-02: Dual-File Ingestion, Regex Normalization & Dirty-Data Sanitization
**As a** research statistician,  
**I want** to upload both Pretest and Posttest survey files with automatic schema detection and string corruption filters,  
**So that** corrupted form submissions and diacritic name variations are sanitized before computation.

- **Scenario 1: Automatic Role Identification**
  - **Given** two uploaded CSV files,
  - **When** the headers are evaluated,
  - **Then** the system automatically categorizes the file with `Score` / `Timestamp` as Pretest and the file with `Puntuación` / `Marca temporal` as Posttest.

- **Scenario 2: Corrupted Row Trapping (Anomaly Elimination)**
  - **Given** a row containing code snippets, algorithm dumps, or strings $> 80$ characters in the participant name field (e.g., Posttest Row 27 with pasted algorithm questions),
  - **When** parsing executes,
  - **Then** the row is quarantined in an "Anomalous Entries" review panel and excluded from parametric/non-parametric calculations.

- **Scenario 3: Fuzzy Identity Reconciliation**
  - **Given** minor spelling variations between pretest and posttest (e.g., `cristisn montenegro` vs `cristian montenegro`),
  - **When** participant alignment runs,
  - **Then** Levenshtein distance matches names with similarity $\ge 0.85$ and displays a pairing verification table with an editable override toggle.

---

### HU-03: Distribution & Variance Quality Diagnostics Engine
**As an** empirical researcher,  
**I want** automatic computation of sample sizes, attrition rates, dispersion metrics, and normality tests,  
**So that** I can verify whether the empirical data meets parametric or non-parametric testing assumptions.

- **Scenario 1: Baseline Statistical Output Verification**
  - **Given** the benchmark Quantum Computing Literacy dataset,
  - **When** the calculation engine executes,
  - **Then** the calculated figures must match verified baselines:
    - Pretest ($N=40$): $\bar{x} = 1.925$, $s^2 = 0.789$, $s = 0.888$, $\text{Median} = 2.0$.
    - Posttest ($N=31$ clean): $\bar{x} \approx 8.32$, $s^2 \approx 4.89$, $\text{Median} = 9.0$.
    - Attrition Rate: Accurately computed as $\Delta N / N_{\text{pre}}$.

- **Scenario 2: Normality Rejection Directive**
  - **Given** Shapiro-Wilk tests returning $p < 0.05$ (Pretest $p = 1.08 \times 10^{-4}$, Posttest $p = 7.64 \times 10^{-6}$),
  - **When** the quality report renders,
  - **Then** an explicit warning badge states "Distribution: Non-Normal" with a directive stating: *"Parametric Student's t-test invalid; Wilcoxon Signed-Rank / Mann-Whitney U mandatory."*

---

### HU-04: Springer Nature LaTeX & PDF Report Generation
**As an** academic researcher,  
**I want** to export publication-ready LaTeX tables (`sn-jnl` standard) and downloadable PDFs,  
**So that** I can directly include the statistical quality analysis into my journal manuscript.

- **Scenario 1: Client-Side LaTeX Bundle Export**
  - **Given** processed descriptive statistics,
  - **When** the user clicks "Export Springer Nature LaTeX",
  - **Then** a `.zip` archive is downloaded containing `quality_report.tex` with formal `booktabs` markup (`\toprule`, `\midrule`, `\bottomrule`) and zero vertical rules.

- **Scenario 2: In-Browser PDF Generation**
  - **Given** the report dashboard,
  - **When** the user selects "Download PDF Quality Summary",
  - **Then** a rendered PDF is compiled client-side via `@react-pdf/renderer` within $<2$ seconds.

---

### HU-05 (WIP Modular Stub): Statistical Hypothesis Testing Lab
**As an** exploratory analyst,  
**I want** an interactive, modifiable Jupyter Notebook preview interface pre-populated with Python analysis cells,  
**So that** I can inspect, edit, and download the automated Mann-Whitney and Wilcoxon test scripts.

- **Scenario 1: Pre-baked Notebook Download**
  - **Given** route `/lab`,
  - **When** the page mounts,
  - **Then** the UI shows syntax-highlighted code cells executing `scipy.stats.mannwhitneyu` and `scipy.stats.wilcoxon` on `Listado 1` vs `Listado 2`, with a 1-click "Download .ipynb" action.
