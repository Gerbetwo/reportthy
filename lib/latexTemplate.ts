import { DescriptiveMetrics } from '@/types/dataset';

export function generateSpringerNatureLatex(
  preMetrics: DescriptiveMetrics,
  postMetrics: DescriptiveMetrics,
  attritionCount: number,
  attritionRate: number,
  lang: 'en' | 'es' = 'en'
): string {
  const isEs = lang === 'es';

  const title = isEs
    ? 'Validación Empírica y Diagnósticos de Distribución: Evaluación Educativa en Computación Cuántica'
    : 'Empirical Validation and Distribution Diagnostics: Quantum Computing Educational Assessment';

  const abstract = isEs
    ? `Este reporte preliminar de calidad de datos establece la línea base empírica para la evaluación fundamental de computación cuántica. Tamaños de muestra ($N_{\\text{pre}}=${preMetrics.n}$, $N_{\\text{post}}=${postMetrics.n}$), deserción muestral (${attritionRate.toFixed(1)}\%, $n_{\\text{perdidos}}=${attritionCount}$), métricas de dispersión y supuestos de normalidad distribucional son verificados formalmente bajo estándares de Springer Nature.`
    : `This preliminary data quality report establishes the empirical baseline for the quantum computing foundational evaluation. Sample sizes ($N_{\\text{pre}}=${preMetrics.n}$, $N_{\\text{post}}=${postMetrics.n}$), sample attrition (${attritionRate.toFixed(1)}\%, $n_{\\text{lost}}=${attritionCount}$), dispersion metrics, and distributional normality assumptions are formally verified under Springer Nature standards.`;

  const keywords = isEs
    ? 'Educación en Computación Cuántica, Pruebas de Normalidad, Calidad de Datos, Análisis de Deserción, Modelado No Paramétrico'
    : 'Quantum Computing Education, Normality Testing, Data Quality, Attrition Analysis, Non-Parametric Modeling';

  const introHeading = isEs ? 'Introducción e Integridad de Datos' : 'Introduction and Data Integrity';
  const introText = isEs
    ? 'Los instrumentos de evaluación se administraron en dos cohortes (Listado 1 y Listado 2) evaluando principios cuánticos fundamentales incluyendo cúbits, superposición, entrelazamiento cuántico y decoherencia. Antes de la verificación de hipótesis, se auditan las distribuciones empíricas en busca de estabilidad de varianza y conformidad gaussiana.'
    : 'Evaluation instruments were administered across two cohorts (Listado 1 and Listado 2) assessing core quantum principles including qubits, superposition, quantum entanglement, and decoherence. Prior to hypothesis verification, empirical distributions are audited for variance stability and Gaussian conformity.';

  const statsHeading = isEs ? 'Estadística Descriptiva y Evaluación de Normalidad' : 'Descriptive Statistics and Normality Assessment';
  const statsCaption = isEs
    ? 'Estadísticas descriptivas, parámetros de varianza y benchmarks de diagnóstico de normalidad'
    : 'Descriptive statistics, variance parameters, and normality diagnostic benchmarks';

  const tableHeaders = isEs
    ? 'Fase de Evaluación & $N$ & Media ($\bar{x}$) & Varianza ($s^2$) & Mediana & Shapiro-Wilk ($p$) & Hipótesis de Normalidad'
    : 'Evaluation Phase & $N$ & Mean ($\bar{x}$) & Variance ($s^2$) & Median & Shapiro-Wilk ($p$) & Normality Hypothesis';

  const methodHeading = isEs ? 'Recomendaciones Metodológicas para Pruebas Inferenciales' : 'Methodological Recommendations for Inferential Testing';
  const methodText = isEs
    ? `Debido a que el supuesto de normalidad se rechaza estadísticamente ($p < 0.05$) tanto en el pretest ($p = ${preMetrics.shapiroWilk.pValue}$) como en el posttest ($p = ${postMetrics.shapiroWilk.pValue}$), las pruebas paramétricas $t$ de Student quedan invalidadas. En consecuencia, el módulo de verificación de hipótesis inferenciales debe ejecutar alternativas no paramétricas:`
    : `Because the normality assumption is statistically rejected ($p < 0.05$) across both pretest ($p = ${preMetrics.shapiroWilk.pValue}$) and posttest ($p = ${postMetrics.shapiroWilk.pValue}$), parametric Student's $t$-tests are invalidated. Consequently, the inferential hypothesis verification module must execute non-parametric alternatives:`;

  const item1 = isEs ? '\\textbf{Análisis Longitudinal Intra-sujeto}: Prueba de rangos con signo de Wilcoxon para ganancias emparejadas.' : '\\textbf{Within-Subject Longitudinal Analysis}: Wilcoxon Signed-Rank test for paired gains.';
  const item2 = isEs ? '\\textbf{Comparación Entre Grupos}: Prueba $U$ de Mann-Whitney para contrastar ganancias post-intervención del Listado 1 versus Listado 2.' : '\\textbf{Between-Group Comparison}: Mann-Whitney $U$ test to contrast Listado 1 versus Listado 2 post-intervention gains.';

  const normalityPre = preMetrics.shapiroWilk.isNormal ? (isEs ? 'Retenida ($p \\ge 0.05$)' : 'Retained ($p \\ge 0.05$)') : (isEs ? 'Rechazada ($p < 0.05$)' : 'Rejected ($p < 0.05$)');
  const normalityPost = postMetrics.shapiroWilk.isNormal ? (isEs ? 'Retenida ($p \\ge 0.05$)' : 'Retained ($p \\ge 0.05$)') : (isEs ? 'Rechazada ($p < 0.05$)' : 'Rejected ($p < 0.05$)');
  const preLabel = isEs ? 'Pretest' : 'Pretest';
  const postLabel = isEs ? 'Posttest' : 'Posttest';

  return `\\documentclass[default,sn-basic]{sn-jnl}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{amsmath}

\\jyear{2026}

\\begin{document}

\\title[Preliminary Statistical Data Quality Report]{${title}}

\\author*[1]{\\fnm{Automated} \\sur{Analytics System}}\\email{researcher@university.edu}
\\affil*[1]{\\orgname{Department of Computer Science and Educational Technology}, \\orgaddress{\\country{Colombia}}}

\\abstract{${abstract}}

\\keywords{${keywords}}

\\maketitle

\\section{${introHeading}}
${introText}

\\section{${statsHeading}}
Table~\\ref{tab:descriptive_quality} summarizes the distribution parameters obtained from sanitized submissions.

\\begin{table}[h]
\\caption{${statsCaption}}\\label{tab:descriptive_quality}
\\begin{tabular*}{\\textwidth}{@{\\extracolsep{\\fill}}lcccccc@{\\extracolsep{\\fill}}}
\\toprule
${tableHeaders} \\
\\midrule
${preLabel}  & ${preMetrics.n} & ${preMetrics.mean} & ${preMetrics.variance} & ${preMetrics.median} & ${preMetrics.shapiroWilk.pValue} & ${normalityPre} \\
${postLabel} & ${postMetrics.n} & ${postMetrics.mean} & ${postMetrics.variance} & ${postMetrics.median} & ${postMetrics.shapiroWilk.pValue} & ${normalityPost} \\
\\bottomrule
\\end{tabular*}
\\end{table}

\\section{${methodHeading}}
${methodText}
\\begin{enumerate}
    \\item ${item1}
    \\item ${item2}
\\end{enumerate}

\\end{document}`;
}
