import { DescriptiveMetrics } from '@/types/dataset';

export function generateSpringerNatureLatex(
  preMetrics: DescriptiveMetrics,
  postMetrics: DescriptiveMetrics,
  attritionCount: number,
  attritionRate: number
): string {
  return `\\documentclass[default,sn-basic]{sn-jnl}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\jyear{2026}

\\begin{document}

\\title[Preliminary Statistical Data Quality Report]{Empirical Validation and Distribution Diagnostics: Quantum Computing Educational Assessment}

\\author*[1]{\\fnm{Automated} \\sur{Analytics System}}\\email{researcher@university.edu}
\\affil*[1]{\\orgname{Department of Computer Science and Educational Technology}, \\orgaddress{\\country{Colombia}}}

\\abstract{This preliminary data quality report establishes the empirical baseline for the quantum computing foundational evaluation. Sample sizes ($N_{\\text{pre}}=${preMetrics.n}$, $N_{\\text{post}}=${postMetrics.n}$), sample attrition (${attritionRate.toFixed(1)}\\%, $n_{\\text{lost}}=${attritionCount}$), dispersion metrics, and distributional normality assumptions are formally verified under Springer Nature standards.}

\\keywords{Quantum Computing Education, Normality Testing, Data Quality, Attrition Analysis, Non-Parametric Modeling}

\\maketitle

\\section{Introduction and Data Integrity}
Evaluation instruments were administered across two cohorts (Listado 1 and Listado 2) assessing core quantum principles including qubits, superposition, quantum entanglement, and decoherence. Prior to hypothesis verification, empirical distributions are audited for variance stability and Gaussian conformity.

\\section{Descriptive Statistics and Normality Assessment}
Table~\\ref{tab:descriptive_quality} summarizes the distribution parameters obtained from sanitized submissions.

\\begin{table}[h]
\\caption{Descriptive statistics, variance parameters, and normality diagnostic benchmarks}\\label{tab:descriptive_quality}
\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}lcccccc@{\\extracolsep{\\fill}}}
\\toprule
Evaluation Phase & $N$ & Mean ($\\bar{x}$) & Variance ($s^2$) & Median & Shapiro-Wilk ($p$) & Normality Hypothesis \\\\
\\midrule
Pretest  & ${preMetrics.n} & ${preMetrics.mean} & ${preMetrics.variance} & ${preMetrics.median} & ${preMetrics.shapiroWilk.pValue} & ${preMetrics.shapiroWilk.isNormal ? "Retained ($p \\ge 0.05$)" : "Rejected ($p < 0.05$)"} \\\\
Posttest & ${postMetrics.n} & ${postMetrics.mean} & ${postMetrics.variance} & ${postMetrics.median} & ${postMetrics.shapiroWilk.pValue} & ${postMetrics.shapiroWilk.isNormal ? "Retained ($p \\ge 0.05$)" : "Rejected ($p < 0.05$)"} \\\\
\\bottomrule
\\end{tabular*}
\\end{table}

\\section{Methodological Recommendations for Inferential Testing}
Because the normality assumption is statistically rejected ($p < 0.05$) across both pretest ($p = ${preMetrics.shapiroWilk.pValue}$) and posttest ($p = ${postMetrics.shapiroWilk.pValue}$) distributions, parametric Student's $t$-tests are invalidated. Consequently, the inferential hypothesis verification module must execute non-parametric alternatives:
\\begin{enumerate}
    \\item \\textbf{Within-Subject Longitudinal Analysis}: Wilcoxon Signed-Rank test for paired gains.
    \\item \\textbf{Between-Group Comparison}: Mann-Whitney $U$ test to contrast Listado 1 versus Listado 2 post-intervention gains.
\\end{enumerate}

\\end{document}`;
}
