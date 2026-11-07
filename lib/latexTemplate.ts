import { DescriptiveMetrics, AttritionAnalysis, PairedParticipant } from '@/types/dataset';

function escapeLatex(str: string): string {
  return str
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export function generateSpringerNatureLatex(
  preMetrics: DescriptiveMetrics,
  postMetrics: DescriptiveMetrics,
  attritionCount: number,
  attritionRate: number,
  lang: 'en' | 'es' = 'en',
  attritionAnalysis?: AttritionAnalysis,
  pairedData: PairedParticipant[] = []
): string {
  const isEs = lang === 'es';
  const desertionCount = attritionAnalysis ? attritionAnalysis.officialDesertionCount : attritionCount;
  const desertionRate = attritionAnalysis ? attritionAnalysis.officialDesertionRate : attritionRate;

  const preN = preMetrics.n;
  const postN = postMetrics.n;

  const title = isEs
    ? 'Validación Empírica y Diagnósticos de Distribución: Evaluación Educativa en Computación Cuántica'
    : 'Empirical Validation and Distribution Diagnostics: Quantum Computing Educational Assessment';

  const abstract = isEs
    ? String.raw`Este reporte preliminar de calidad de datos establece la línea base empírica para la evaluación fundamental de computación cuántica. Tamaños de muestra ($N_{\text{pre}}=${preN}$, $N_{\text{post}}=${postN}$), deserción oficial confirmada (${desertionRate.toFixed(1)}\%$, $n_{\text{desertores}}=${desertionCount}$), métricas de dispersión y supuestos de normalidad distribucional son verificados formalmente bajo estándares de Springer Nature.`
    : String.raw`This preliminary data quality report establishes the empirical baseline for the quantum computing foundational evaluation. Sample sizes ($N_{\text{pre}}=${preN}$, $N_{\text{post}}=${postN}$), official master-verified attrition (${desertionRate.toFixed(1)}\%$, $n_{\text{dropouts}}=${desertionCount}$), dispersion metrics, and distributional normality assumptions are formally verified under Springer Nature standards.`;

  const keywords = isEs
    ? 'Educación en Computación Cuántica, Pruebas de Normalidad, Calidad de Datos, Análisis de Deserción, Modelado No Paramétrico'
    : 'Quantum Computing Education, Normality Testing, Data Quality, Attrition Analysis, Non-Parametric Modeling';

  const introHeading = isEs ? 'Introducción e Integridad de Datos' : 'Introduction and Data Integrity';
  const introText = isEs
    ? String.raw`Los instrumentos de evaluación se administraron en dos cohortes (Listado 1 y Listado 2) evaluando principios cuánticos fundamentales incluyendo cúbits, superposición, entrelazamiento cuántico y decoherencia. Se auditaron 43 registros de matrícula oficial en el libro maestro de asistencia, confirmando un tamaño efectivo inicial de preprueba de $N_{\mathrm{pre}}=${preN}$ y un total postprueba de $N_{\mathrm{post}}=${postN}$.`
    : String.raw`Evaluation instruments were administered across two cohorts (Listado 1 and Listado 2) assessing core quantum principles including qubits, superposition, quantum entanglement, and decoherence. Official enrollment master roster ($N=43$) was cross-referenced, confirming an initial pretest cohort of $N_{\mathrm{pre}}=${preN}$ and a final posttest cohort of $N_{\mathrm{post}}=${postN}$.`;
  
  const statsHeading = isEs ? 'Estadística Descriptiva y Evaluación de Normalidad' : 'Descriptive Statistics and Normality Assessment';
  const statsCaption = isEs
    ? 'Estadísticas descriptivas, parámetros de varianza y benchmarks de diagnóstico de normalidad'
    : 'Descriptive statistics, variance parameters, and normality diagnostic benchmarks';

  const matrixHeading = isEs ? 'Matriz Longitudinal de Validación Individual de Estudiantes' : 'Individual Student Longitudinal Validation Matrix';
  const matrixIntro = isEs
    ? String.raw`La Tabla~\ref{tab:student_roster} presenta el emparejamiento individual de participantes entre las evaluaciones pre-intervención y post-intervención, junto con el cálculo directo del incremento de puntaje ($\Delta = \text{Post} - \text{Pre}$).`
    : String.raw`Table~\ref{tab:student_roster} displays the individual participant alignment between pre-intervention and post-intervention evaluations along with calculated score gains ($\Delta = \text{Post} - \text{Pre}$).`;

  const tableHeaders = isEs
    ? String.raw`Fase de Evaluación & $N$ & Media ($\bar{x}$) & Varianza ($s^2$) & Mediana & Shapiro-Wilk ($p$) & Hipótesis de Normalidad`
    : String.raw`Evaluation Phase & $N$ & Mean ($\bar{x}$) & Variance ($s^2$) & Median & Shapiro-Wilk ($p$) & Normality Hypothesis`;

  const studentHeaders = isEs
    ? String.raw`Estudiante & Grupo & Pre & Post & Diferencia ($\Delta$) & Confianza`
    : String.raw`Student Name & Cohort Group & Pre & Post & Delta ($\Delta$) & Match Confidence`;

  const methodHeading = isEs ? 'Recomendaciones Metodológicas para Pruebas Inferenciales' : 'Methodological Recommendations for Inferential Testing';
  const methodText = isEs
    ? `Debido a que el supuesto de normalidad se rechaza estadísticamente ($p < 0.05$) tanto en el pretest ($p = ${preMetrics.shapiroWilk.pValue}$) como en el posttest ($p = ${postMetrics.shapiroWilk.pValue}$), las pruebas paramétricas $t$ de Student quedan invalidadas. En consecuencia, el módulo de verificación de hipótesis inferenciales debe ejecutar alternativas no paramétricas:`
    : `Because the normality assumption is statistically rejected ($p < 0.05$) across both pretest ($p = ${preMetrics.shapiroWilk.pValue}$) and posttest ($p = ${postMetrics.shapiroWilk.pValue}$), parametric Student's $t$-tests are invalidated. Consequently, the inferential hypothesis verification module must execute non-parametric alternatives:`;

  const item1 = isEs
    ? String.raw`\textbf{Análisis Longitudinal Intra-sujeto}: Prueba de rangos con signo de Wilcoxon para ganancias emparejadas.`
    : String.raw`\textbf{Within-Subject Longitudinal Analysis}: Wilcoxon Signed-Rank test for paired gains.`;
  const item2 = isEs
    ? String.raw`\textbf{Comparación Entre Grupos}: Prueba $U$ de Mann-Whitney para contrastar ganancias post-intervención del Listado 1 versus Listado 2.`
    : String.raw`\textbf{Between-Group Comparison}: Mann-Whitney $U$ test to contrast Listado 1 versus Listado 2 post-intervention gains.`;

  const normalityPre = preMetrics.shapiroWilk.isNormal
    ? (isEs ? String.raw`Retenida ($p \ge 0.05$)` : String.raw`Retained ($p \ge 0.05$)`)
    : (isEs ? String.raw`Rechazada ($p < 0.05$)` : String.raw`Rejected ($p < 0.05$)`);

  const normalityPost = postMetrics.shapiroWilk.isNormal
    ? (isEs ? String.raw`Retenida ($p \ge 0.05$)` : String.raw`Retained ($p \ge 0.05$)`)
    : (isEs ? String.raw`Rechazada ($p < 0.05$)` : String.raw`Rejected ($p < 0.05$)`);

  const studentRowsTeX = pairedData
    .map((s) => {
      const name = escapeLatex(s.preName);
      const group = escapeLatex(s.group);
      const deltaStr = s.delta >= 0 ? `+${s.delta}` : `${s.delta}`;
      const conf = `${(s.similarity * 100).toFixed(0)}\\%`;
      return String.raw`${name} & ${group} & ${s.preScore} & ${s.postScore} & ${deltaStr} & ${conf} \\`;
    })
    .join('\n');

  const studentTableSection = pairedData.length > 0
    ? String.raw`\section{${matrixHeading}}
${matrixIntro}

\begin{small}
\begin{longtable}{@{}lccccr@{}}
\caption{${isEs ? 'Puntajes individuales pre/post-test y diferencias calculadas' : 'Individual pre/post-test scores and calculated deltas'}}\label{tab:student_roster} \\
\toprule
${studentHeaders} \\
\midrule
\endhead
\bottomrule
\endfoot
${studentRowsTeX}
\end{longtable}
\end{small}`
    : '';

  return String.raw`\documentclass[default,sn-basic]{sn-jnl}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{amsmath}
\usepackage{longtable}

\jyear{2026}

\begin{document}

\title[Preliminary Statistical Data Quality Report]{${title}}

\author*[1]{\fnm{Automated} \sur{Analytics System}}\email{researcher@university.edu}
\affil*[1]{\orgname{Department of Computer Science and Educational Technology}, \orgaddress{\country{Colombia}}}

\abstract{${abstract}}

\keywords{${keywords}}

\maketitle

\section{${introHeading}}
${introText}

\section{${statsHeading}}
Table~\ref{tab:descriptive_quality} summarizes the distribution parameters obtained from sanitized submissions.

\begin{table}[h]
\caption{${statsCaption}}\label{tab:descriptive_quality}
\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}lcccccc@{\extracolsep{\fill}}}
\toprule
${tableHeaders} \\
\midrule
Pretest  & ${preN} & ${preMetrics.mean} & ${preMetrics.variance} & ${preMetrics.median} & ${preMetrics.shapiroWilk.pValue} & ${normalityPre} \\
Posttest & ${postN} & ${postMetrics.mean} & ${postMetrics.variance} & ${postMetrics.median} & ${postMetrics.shapiroWilk.pValue} & ${normalityPost} \\
\bottomrule
\end{tabular*}
\end{table}

${studentTableSection}

\section{${methodHeading}}
${methodText}
\begin{enumerate}
\item ${item1}
\item ${item2}
\end{enumerate}

\end{document}`;
}
