import {
  PairedParticipant,
  CleanedParticipant,
  AttritionAnalysis,
  JupyterExecutionResult,
  DescriptiveMetrics,
  HypothesisTestResult,
  StudyMetadata,
} from '@/types/dataset';

export function escapeLatex(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\u0000')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\u0000/g, '\\textbackslash{}');
}

const f3 = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : '0.000');
const fp = (p: number): string => (Number.isFinite(p) ? (p < 0.001 ? '< 0.001' : `= ${p.toFixed(3)}`) : '= 1.000');
const fpCell = (p: number): string => (Number.isFinite(p) ? (p < 0.001 ? '$<0.001$' : p.toFixed(3)) : '1.000');

export function generateFullPaperLatex(
  jupyterResults: JupyterExecutionResult,
  pairedData: PairedParticipant[],
  lang: 'en' | 'es' = 'en',
  attritionAnalysis?: AttritionAnalysis | null,
  quarantined: CleanedParticipant[] = [],
  studyMetadata?: StudyMetadata
): string {
  const isEs = lang === 'es';
  const tr = (en: string, es: string): string => (isEs ? es : en);

  const {
    preMetrics,
    postMetrics,
    wilcoxon,
    mannWhitney,
    alpha,
    wilcoxonAlternative,
    kernelInfo,
    executedAt,
    hypothesisConfirmed
  } = jupyterResults;

  // ---------- Derived QA & inferential facts ----------
  const preNormal = preMetrics.shapiroWilk.isNormal;
  const postNormal = postMetrics.shapiroWilk.isNormal;
  const anyNonNormal = !preNormal || !postNormal;
  const pairedN = pairedData.length;
  const quarantineCount = quarantined.length;
  const cleanCount = preMetrics.n + postMetrics.n;
  const reasons = Array.from(
    new Set(quarantined.map(q => (q.corruptionReason ?? '').trim()).filter(r => r.length > 0))
  );
  const desertionCount = attritionAnalysis?.attritionCount ?? Math.max(preMetrics.n - postMetrics.n, 0);
  const desertionRate = attritionAnalysis?.attritionRate
    ?? (preMetrics.n > 0 ? (Math.max(preMetrics.n - postMetrics.n, 0) / preMetrics.n) * 100 : 0);
  const rateStr = desertionRate.toFixed(1);
  const n1 = mannWhitney.n1;
  const n2 = mannWhitney.n2 ?? 0;

  const sig = (r: HypothesisTestResult): string =>
    r.isSignificant ? tr('Reject $H_0$', 'Rechazar $H_0$') : tr('Retain $H_0$', 'Retener $H_0$');
  const dist = (m: DescriptiveMetrics): string =>
    m.shapiroWilk.isNormal ? tr('Normal', 'Normal') : tr('Non-Normal', 'No Normal');

  // ---------- Cohorts & Study Domain Configuration ----------
  const expCohortName =
    jupyterResults.experimentalLabel ||
    pairedData.find(p => p.cohortRole === 'Experimental')?.group ||
    (studyMetadata?.cohortMapping
      ? Object.keys(studyMetadata.cohortMapping).find(k => studyMetadata.cohortMapping[k] === 'Experimental')
      : undefined) ||
    'Listado 2';

  const ctrlCohortName =
    jupyterResults.controlLabel ||
    pairedData.find(p => p.cohortRole === 'Control')?.group ||
    (studyMetadata?.cohortMapping
      ? Object.keys(studyMetadata.cohortMapping).find(k => studyMetadata.cohortMapping[k] === 'Control')
      : undefined) ||
    'Listado 1';

  const expLabel = escapeLatex(expCohortName);
  const ctrlLabel = escapeLatex(ctrlCohortName);

  const rawTopic =
    studyMetadata?.topicDomain?.trim() ||
    tr('quantum computing', 'computación cuántica');
  const topicDomain = escapeLatex(rawTopic);

  const rawCtrlPed =
    studyMetadata?.controlPedagogy?.trim() ||
    tr(
      'traditional didactic instruction',
      'instrucción didáctica tradicional'
    );
  const controlPedagogy = escapeLatex(rawCtrlPed);

  const rawExpPed =
    studyMetadata?.experimentalPedagogy?.trim() ||
    tr(
      'interactive technological intervention',
      'intervención tecnológica interactiva'
    );
  const experimentalPedagogy = escapeLatex(rawExpPed);

  const rawHyp =
    studyMetadata?.hypothesisStatement?.trim() ||
    tr(
      'the instructional intervention produces a statistically significant positive learning gain',
      'la intervención instruccional produce una ganancia de aprendizaje positiva estadísticamente significativa'
    );
  const cleanHyp = rawHyp.replace(/\.+$/, '');
  const hypothesisStatement = escapeLatex(cleanHyp);

  // ---------- Authorship ----------
  const authorsList =
    studyMetadata?.authors && studyMetadata.authors.length > 0
      ? studyMetadata.authors.filter((a) => a.fullName && a.fullName.trim().length > 0)
      : [];

  let authorsMarkup = '';
  if (authorsList.length === 0) {
    authorsMarkup = String.raw`\author*[1]{\fnm{Automated} \sur{Analytics System}}\email{researcher@university.edu}
\affil*[1]{\orgname{Department of Computer Science and Educational Technology}, \orgaddress{\country{Colombia}}}`;
  } else {
    const authorLines: string[] = [];
    const affilLines: string[] = [];
    authorsList.forEach((author, i) => {
      const affilIdx = i + 1;
      const isPrimary = i === 0 ? '*' : '';
      const parts = author.fullName.trim().split(/\s+/);
      const sur = parts.length > 1 ? parts.pop()! : parts[0] || 'Author';
      const fnm = parts.length > 0 ? parts.join(' ') : 'Researcher';
      const emailBlock = author.email?.trim()
        ? String.raw`\email{${escapeLatex(author.email.trim())}}`
        : '';
      authorLines.push(
        String.raw`\author${isPrimary}[${affilIdx}]{\fnm{${escapeLatex(fnm)}} \sur{${escapeLatex(sur)}}}${emailBlock}`
      );
      const affilName =
        author.affiliation?.trim() || 'Department of Educational Analytics';
      const countryName = author.country?.trim() || 'Global';
      affilLines.push(
        String.raw`\affil${isPrimary}[${affilIdx}]{\orgname{${escapeLatex(affilName)}}, \orgaddress{\country{${escapeLatex(countryName)}}}}`
      );
    });
    authorsMarkup = `${authorLines.join('\n')}\n${affilLines.join('\n')}`;
  }

  // ---------- Front matter ----------
  const rawTitle =
    studyMetadata?.aiNarrativeSlots?.manuscriptTitle?.trim() ||
    studyMetadata?.studyTitle?.trim() ||
    tr(
      'Empirical Evaluation of Introductory Quantum Computing Pedagogy: A Unified Data-Quality and Non-Parametric Quasi-Experimental Analysis',
      'Evaluación Empírica de la Pedagogía Introductoria en Computación Cuántica: Un Análisis Cuasi-Experimental Unificado de Calidad de Datos y Pruebas No Paramétricas'
    );
  const title = escapeLatex(rawTitle);
  const shortTitle = escapeLatex((studyMetadata?.topicDomain || studyMetadata?.studyTitle || 'Educational Assessment').slice(0, 35));

  const normalitySentence = anyNonNormal
    ? tr(
      String.raw`Shapiro-Wilk diagnostics rejected Gaussian normality (pretest $p ${fp(preMetrics.shapiroWilk.pValue)}$, posttest $p ${fp(postMetrics.shapiroWilk.pValue)}$), mandating non-parametric inference.`,
      String.raw`Los diagnósticos de Shapiro-Wilk rechazaron la normalidad gaussiana (pretest $p ${fp(preMetrics.shapiroWilk.pValue)}$, posttest $p ${fp(postMetrics.shapiroWilk.pValue)}$), exigiendo inferencia no paramétrica.`
    )
    : tr(
      String.raw`Shapiro-Wilk diagnostics retained normality (pretest $p ${fp(preMetrics.shapiroWilk.pValue)}$, posttest $p ${fp(postMetrics.shapiroWilk.pValue)}$); non-parametric procedures were nonetheless retained for robustness.`,
      String.raw`Los diagnósticos de Shapiro-Wilk retuvieron la normalidad (pretest $p ${fp(preMetrics.shapiroWilk.pValue)}$, posttest $p ${fp(postMetrics.shapiroWilk.pValue)}$); se mantuvieron procedimientos no paramétricos por robustez.`
    );

  const outcomeSentence = hypothesisConfirmed
    ? tr(
      'The empirical evidence corroborates the research hypothesis of a statistically significant positive learning gain.',
      'La evidencia empírica corrobora la hipótesis de investigación de una ganancia de aprendizaje positiva estadísticamente significativa.'
    )
    : tr(
      'The empirical evidence fails to corroborate the research hypothesis; no statistically significant positive learning gain was established.',
      'La evidencia empírica no logra corroborar la hipótesis de investigación; no se estableció una ganancia de aprendizaje positiva estadísticamente significativa.'
    );

  const abstract = tr(
    String.raw`This study evaluates the instructional efficacy of an empirical intervention in ${topicDomain} ($N_{\text{pre}}=${preMetrics.n}$, $N_{\text{post}}=${postMetrics.n}$, paired $N=${pairedN}$) contrasting ${experimentalPedagogy} against ${controlPedagogy}, with a pre-to-post attrition rate of ${rateStr}\% and ${quarantineCount} quarantined anomalous submissions. ${normalitySentence} The paired Wilcoxon signed-rank test yielded $W=${f3(wilcoxon.statisticValue)}$, $p ${fp(wilcoxon.pValue)}$, $r=${f3(wilcoxon.effectSize)}$; the between-cohort Mann-Whitney test yielded $U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$. ${outcomeSentence}`,
    String.raw`Este estudio evalúa la efectividad instruccional de una intervención empírica en ${topicDomain} ($N_{\text{pre}}=${preMetrics.n}$, $N_{\text{post}}=${postMetrics.n}$, $N$ emparejado $=${pairedN}$) contrastando ${experimentalPedagogy} frente a ${controlPedagogy}, con una tasa de deserción pre-post de ${rateStr}\% y ${quarantineCount} entregas anómalas aisladas. ${normalitySentence} La prueba de rangos con signo de Wilcoxon arrojó $W=${f3(wilcoxon.statisticValue)}$, $p ${fp(wilcoxon.pValue)}$, $r=${f3(wilcoxon.effectSize)}$; la prueba de Mann-Whitney entre cohortes arrojó $U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$. ${outcomeSentence}`
  );

  const keywords = escapeLatex(
    studyMetadata?.aiNarrativeSlots?.keywords?.length
      ? studyMetadata.aiNarrativeSlots.keywords.join(', ')
      : tr(
          `${studyMetadata?.topicDomain || 'Quantum Computing Education'}, Data Quality Assurance, Non-Parametric Testing, Wilcoxon Signed-Rank, Mann-Whitney U, Attrition Analysis`,
          `${studyMetadata?.topicDomain || 'Educación en Computación Cuántica'}, Aseguramiento de Calidad de Datos, Pruebas No Paramétricas, Rangos con Signo de Wilcoxon, U de Mann-Whitney, Análisis de Deserción`
        )
  );

  // ---------- 1. Introduction ----------
  const secIntro = tr('Introduction and Theoretical Framework', 'Introducción y Marco Teórico');
  const theoreticalNote = studyMetadata?.aiNarrativeSlots?.theoreticalContext?.trim()
    ? ` ${escapeLatex(studyMetadata.aiNarrativeSlots.theoreticalContext.trim())}`
    : '';
  const introText = tr(
    String.raw`Instructional pedagogy in ${topicDomain} requires learners to master structured conceptual paradigms alongside procedural execution. This empirical investigation evaluates the efficacy of ${experimentalPedagogy} in contrast to ${controlPedagogy} across observed student cohorts (${ctrlLabel} and ${expLabel}). The guiding research hypothesis ($H_1$) posits that: ${hypothesisStatement}.${theoreticalNote} Because educational score distributions frequently exhibit floor and ceiling effects, the analysis adopts a distribution-agnostic inferential framework preceded by a fully automated data quality assurance pipeline.`,
    String.raw`La pedagogía instruccional en ${topicDomain} exige que los estudiantes dominen paradigmas conceptuales estructurados junto con la ejecución procedimental. Esta investigación empírica evalúa la efectividad de ${experimentalPedagogy} en contraste con ${controlPedagogy} a través de las cohortes observadas (${ctrlLabel} y ${expLabel}). La hipótesis de investigación guía ($H_1$) postula que: ${hypothesisStatement}.${theoreticalNote} Dado que las distribuciones de puntajes educativos presentan con frecuencia efectos suelo y techo, el análisis adopta un marco inferencial independiente de la distribución, precedido por un proceso automatizado de aseguramiento de calidad de datos.`
  );

  // ---------- 2. Methods & QA ----------
  const secMethods = tr('Materials, Methods, and Data Quality Assurance', 'Materiales, Métodos y Aseguramiento de Calidad de Datos');
  const pedagogicalNote = studyMetadata?.aiNarrativeSlots?.pedagogicalComparisonNote?.trim()
    ? ` ${escapeLatex(studyMetadata.aiNarrativeSlots.pedagogicalComparisonNote.trim())}`
    : '';
  const reasonsList = reasons.length > 0
    ? String.raw`\begin{itemize}
${reasons.map(r => String.raw`\item ${escapeLatex(r.length > 120 ? `${r.slice(0, 117)}...` : r)}`).join('\n')}
\end{itemize}`
    : '';
  const methodsText = tr(
    String.raw`Pretest scores were parsed from the \texttt{Score} field and posttest scores from the \texttt{Puntuación} field on a 10-point scale. The automated ingestion and sanitization audit retained ${cleanCount} clean records (${preMetrics.n} pretest, ${postMetrics.n} posttest) and quarantined ${quarantineCount} anomalous submissions (participant names exceeding 80 characters or containing code/algorithm dumps). ${reasons.length > 0 ? `${reasons.length} distinct corruption reasons were recorded:` : 'No distinct corruption reasons were recorded.'}${pedagogicalNote}`,
    String.raw`Los puntajes del pretest se extrajeron del campo \texttt{Score} y los del posttest del campo \texttt{Puntuación} en una escala de 10 puntos. La auditoría automatizada de ingesta y sanitización retuvo ${cleanCount} registros limpios (${preMetrics.n} pretest, ${postMetrics.n} posttest) y aisló ${quarantineCount} entregas anómalas (nombres de participantes con más de 80 caracteres o con volcados de código/algoritmos). ${reasons.length > 0 ? `Se registraron ${reasons.length} motivos de corrupción distintos:` : 'No se registraron motivos de corrupción distintos.'}${pedagogicalNote}`
  );
  const unmatchedPost = attritionAnalysis?.unmatchedPostCount ?? 0;
  const reconText = tr(
    String.raw`Participant identities were normalized (lowercasing, diacritic stripping, whitespace collapsing) and longitudinally paired using token-sorted normalized Levenshtein similarity ($\ge 0.85$), producing ${pairedN} matched participants across cohorts ${ctrlLabel} and ${expLabel}. Attrition was computed directly by contrasting the Pretest and Posttest CSV surveys: ${desertionCount} pretest respondents had no posttest counterpart, yielding a pre-to-post attrition rate of ${rateStr}\%${unmatchedPost > 0 ? `, while ${unmatchedPost} posttest respondents could not be matched to a pretest record` : ''}. All statistical calculations were executed in an interactive, reproducible Jupyter environment (\texttt{${escapeLatex(kernelInfo)}}, timestamp \texttt{${escapeLatex(executedAt)}}) using SciPy and NumPy.`,
    String.raw`Las identidades de los participantes se normalizaron (minúsculas, eliminación de diacríticos, colapso de espacios) y se emparejaron longitudinalmente mediante similitud de Levenshtein normalizada con tokens ordenados ($\ge 0.85$), produciendo ${pairedN} participantes emparejados entre las cohortes ${ctrlLabel} y ${expLabel}. La deserción se calculó contrastando directamente las encuestas CSV de Pretest y Posttest: ${desertionCount} encuestados del pretest no tuvieron contraparte en el posttest, lo que arroja una tasa de deserción pre-post de ${rateStr}\%${unmatchedPost > 0 ? `, mientras que ${unmatchedPost} encuestados del posttest no pudieron emparejarse con un registro del pretest` : ''}. Todos los cálculos estadísticos se ejecutaron en un entorno Jupyter interactivo y reproducible (\texttt{${escapeLatex(kernelInfo)}}, marca temporal \texttt{${escapeLatex(executedAt)}}) usando SciPy y NumPy.`
  );

  // ---------- 3. Results ----------
  const secResults = tr(
    'Empirical Results: Distribution Diagnostics and Hypothesis Verification',
    'Resultados Empíricos: Diagnósticos de Distribución y Verificación de Hipótesis'
  );
  const descCaption = tr(
    'Descriptive statistics and Shapiro-Wilk normality diagnostics',
    'Estadística descriptiva y diagnósticos de normalidad de Shapiro-Wilk'
  );
  const descHeader = tr(
    String.raw`Phase & $N$ & $\bar{x}$ & $s^2$ & $s$ & Median & IQR & Skew. & Kurt. & SW $p$ & Distribution`,
    String.raw`Fase & $N$ & $\bar{x}$ & $s^2$ & $s$ & Mediana & RIC & Asim. & Curt. & SW $p$ & Distribución`
  );
  const descRow = (label: string, m: DescriptiveMetrics): string =>
    String.raw`${label} & ${m.n} & ${f3(m.mean)} & ${f3(m.variance)} & ${f3(m.stdDev)} & ${f3(m.median)} & ${f3(m.iqr)} & ${f3(m.skewness)} & ${f3(m.kurtosis)} & ${fpCell(m.shapiroWilk.pValue)} & ${dist(m)} \\`;

  const justification = anyNonNormal
    ? tr(
      String.raw`Because the normality assumption is rejected ($p < 0.05$) in at least one phase, parametric Student's $t$-tests are invalidated. Inference therefore relies exclusively on the non-parametric Wilcoxon signed-rank and Mann-Whitney $U$ tests.`,
      String.raw`Debido a que el supuesto de normalidad se rechaza ($p < 0.05$) en al menos una fase, las pruebas $t$ de Student paramétricas quedan invalidadas. Por tanto, la inferencia se basa exclusivamente en las pruebas no paramétricas de rangos con signo de Wilcoxon y $U$ de Mann-Whitney.`
    )
    : tr(
      String.raw`Because normality is retained ($p \ge 0.05$) in both phases, parametric Student's $t$-tests are eligible; the non-parametric procedures are reported as distribution-free robustness checks.`,
      String.raw`Debido a que la normalidad se retiene ($p \ge 0.05$) en ambas fases, las pruebas $t$ de Student paramétricas son elegibles; los procedimientos no paramétricos se reportan como verificaciones de robustez libres de distribución.`
    );

  const hypCaption = tr(
    String.raw`Inferential summary of non-parametric hypothesis tests ($\alpha=${alpha}$)`,
    String.raw`Resumen inferencial de las pruebas de hipótesis no paramétricas ($\alpha=${alpha}$)`
  );
  const hypHeader = tr(
    String.raw`Test & $N$ / $(n_1, n_2)$ & Statistic & $Z$ & $p$ & $r$ & Decision`,
    String.raw`Prueba & $N$ / $(n_1, n_2)$ & Estadístico & $Z$ & $p$ & $r$ & Decisión`
  );
  const altLabelEs =
    wilcoxonAlternative === 'greater'
      ? 'mayor'
      : wilcoxonAlternative === 'less'
      ? 'menor'
      : 'bilateral';
  const wRowLabel = tr(
    String.raw`Paired Wilcoxon Signed-Rank (${wilcoxonAlternative})`,
    String.raw`Wilcoxon de rangos con signo (${altLabelEs})`
  );
  const uRowLabel = tr(
    String.raw`Mann-Whitney $U$ (${ctrlLabel} vs ${expLabel}, $\Delta$)`,
    String.raw`Mann-Whitney $U$ (${ctrlLabel} vs ${expLabel}, $\Delta$)`
  );

  // ---------- 4. Student matrix ----------
  const secMatrix = tr('Longitudinal Student Score and Validation Matrix', 'Matriz Longitudinal de Puntajes y Validación Estudiantil');
  const matrixIntro = tr(
    String.raw`Table~\ref{tab:student_roster} lists every reconciled participant with pretest and posttest scores, the signed gain ($\Delta = \text{Post} - \text{Pre}$) and the fuzzy identity match confidence.`,
    String.raw`La Tabla~\ref{tab:student_roster} lista cada participante reconciliado con sus puntajes pretest y posttest, la ganancia con signo ($\Delta = \text{Post} - \text{Pre}$) y la confianza del emparejamiento difuso de identidad.`
  );
  const studentHeaders = tr(
    String.raw`Student & Cohort & Pre & Post & $\Delta$ & Match`,
    String.raw`Estudiante & Grupo & Pre & Post & $\Delta$ & Confianza`
  );
  const studentRows = pairedData
    .map(s => {
      const deltaStr = s.delta >= 0 ? `+${s.delta}` : `${s.delta}`;
      return String.raw`${escapeLatex(s.preName)} & ${escapeLatex(s.group)} & ${s.preScore} & ${s.postScore} & ${deltaStr} & ${(s.similarity * 100).toFixed(0)}\% \\`;
    })
    .join('\n');
  const matrixSection = pairedN > 0
    ? String.raw`\section{${secMatrix}}\label{sec:matrix}
${matrixIntro}

\begin{small}
\begin{longtable}{@{}p{4.2cm}ccccr@{}}
\caption{${tr('Individual pre/post-test scores, gains and match confidence', 'Puntajes individuales pre/post-test, ganancias y confianza de emparejamiento')}}\label{tab:student_roster} \\
\toprule
${studentHeaders} \\
\midrule
\endhead
\bottomrule
\endfoot
${studentRows}
\end{longtable}
\end{small}
`
    : '';

  // ---------- 5. Discussion ----------
  const secDisc = tr('Discussion and Threats to Validity', 'Discusión y Amenazas a la Validez');
  const absR = Math.abs(wilcoxon.effectSize);
  const magnitude = absR >= 0.5 ? tr('large', 'grande') : absR >= 0.3 ? tr('medium', 'mediano') : absR >= 0.1 ? tr('small', 'pequeño') : tr('negligible', 'despreciable');
  const discText = tr(
    String.raw`Pretest skewness (${f3(preMetrics.skewness)}) and posttest skewness (${f3(postMetrics.skewness)}) indicate floor and ceiling effects that constrain score discrimination at the scale extremes. The pre-to-post attrition rate of ${rateStr}\% and the ${quarantineCount} quarantined submissions constitute potential selection threats, partially mitigated by the paired design ($N=${pairedN}$). The rank-biserial effect size $r=${f3(wilcoxon.effectSize)}$ corresponds to a ${magnitude} effect magnitude. The absence of a randomized control group limits causal attribution.`,
    String.raw`La asimetría del pretest (${f3(preMetrics.skewness)}) y del posttest (${f3(postMetrics.skewness)}) indica efectos suelo y techo que limitan la discriminación de puntajes en los extremos de la escala. La tasa de deserción de ${rateStr}\% y las ${quarantineCount} entregas aisladas constituyen amenazas potenciales de selección, parcialmente mitigadas por el diseño emparejado ($N=${pairedN}$). El tamaño de efecto biserial por rangos $r=${f3(wilcoxon.effectSize)}$ corresponde a una magnitud de efecto ${magnitude}. La ausencia de un grupo control aleatorizado limita la atribución causal.`
  );

  // ---------- 6. Conclusion (strictly data-driven and multi-mode) ----------
  const secConc = tr('Conclusion and Hypothesis Verdict', 'Conclusión y Veredicto de Hipótesis');
  const cohortSentence = mannWhitney.isSignificant
    ? tr(
      String.raw`Cohort gains diverged significantly between ${ctrlLabel} and ${expLabel} ($U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$).`,
      String.raw`Las ganancias divergieron significativamente entre ${ctrlLabel} y ${expLabel} ($U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$).`
    )
    : tr(
      String.raw`Cohort gains were consistent across ${ctrlLabel} and ${expLabel} ($U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$).`,
      String.raw`Las ganancias fueron consistentes entre ${ctrlLabel} y ${expLabel} ($U=${f3(mannWhitney.statisticValue)}$, $p ${fp(mannWhitney.pValue)}$).`
    );

  const designMode = studyMetadata?.designMode ?? jupyterResults.designMode ?? 'within_subject';
  const nonCorroboratedWilcoxonDirection = wilcoxonAlternative === 'greater'
    ? tr('or a non-positive shift', 'o un desplazamiento no positivo')
    : wilcoxonAlternative === 'less'
    ? tr('or a non-negative shift', 'o un desplazamiento no negativo')
    : '';
  const nonCorroboratedThreshold = nonCorroboratedWilcoxonDirection
    ? tr(
        String.raw`$p \ge ${alpha}$ ${nonCorroboratedWilcoxonDirection}`,
        String.raw`$p \ge ${alpha}$ ${nonCorroboratedWilcoxonDirection}`
      )
    : String.raw`$p \ge ${alpha}$`;

  let verdictDetails = '';
  if (designMode === 'within_subject') {
    verdictDetails = hypothesisConfirmed
      ? tr(
          String.raw`the intervention produced a statistically significant positive learning gain ($W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$, $p ${fp(wilcoxon.pValue)}$, $p < ${alpha}$, $r=${f3(wilcoxon.effectSize)}$). ${cohortSentence}`,
          String.raw`la intervención produjo una ganancia de aprendizaje positiva estadísticamente significativa ($W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$, $p ${fp(wilcoxon.pValue)}$, $p < ${alpha}$, $r=${f3(wilcoxon.effectSize)}$). ${cohortSentence}`
        )
      : tr(
          String.raw`with $W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$ and $p ${fp(wilcoxon.pValue)}$ (${nonCorroboratedThreshold}), no statistically significant instructional gain was established. ${cohortSentence}`,
          String.raw`con $W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$ y $p ${fp(wilcoxon.pValue)}$ (${nonCorroboratedThreshold}), no se estableció una ganancia instruccional estadísticamente significativa. ${cohortSentence}`
        );
  } else if (designMode === 'between_group') {
    verdictDetails = hypothesisConfirmed
      ? tr(
          String.raw`the experimental cohort (${expLabel}) achieved statistically significant superior gain over the control cohort (${ctrlLabel}) ($U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$, $p ${fp(mannWhitney.pValue)}$, $p < ${alpha}$, $r=${f3(mannWhitney.effectSize)}$).`,
          String.raw`la cohorte experimental (${expLabel}) logró una ganancia significativamente superior sobre la cohorte control (${ctrlLabel}) ($U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$, $p ${fp(mannWhitney.pValue)}$, $p < ${alpha}$, $r=${f3(mannWhitney.effectSize)}$).`
        )
      : tr(
          String.raw`with $U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$ and $p ${fp(mannWhitney.pValue)}$ ($p \ge ${alpha}$), no statistically significant experimental cohort superiority was corroborated.`,
          String.raw`con $U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$ y $p ${fp(mannWhitney.pValue)}$ ($p \ge ${alpha}$), no se corroboró una superioridad estadísticamente significativa de la cohorte experimental.`
        );
  } else {
    // combined
    verdictDetails = hypothesisConfirmed
      ? tr(
          String.raw`the intervention produced both a statistically significant longitudinal gain ($W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$, $p ${fp(wilcoxon.pValue)}$, $r=${f3(wilcoxon.effectSize)}$) and statistically significant between-cohort superiority for ${expLabel} over ${ctrlLabel} ($U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$, $p ${fp(mannWhitney.pValue)}$, $r=${f3(mannWhitney.effectSize)}$).`,
          String.raw`la intervención produjo tanto una ganancia longitudinal estadísticamente significativa ($W=${f3(wilcoxon.statisticValue)}$, $Z=${f3(wilcoxon.zValue)}$, $p ${fp(wilcoxon.pValue)}$, $r=${f3(wilcoxon.effectSize)}$) como una superioridad estadísticamente significativa de ${expLabel} sobre ${ctrlLabel} ($U=${f3(mannWhitney.statisticValue)}$, $Z=${f3(mannWhitney.zValue)}$, $p ${fp(mannWhitney.pValue)}$, $r=${f3(mannWhitney.effectSize)}$).`
        )
      : tr(
          String.raw`the dual criteria for combined significance was not met (Wilcoxon $p ${fp(wilcoxon.pValue)}$, Mann-Whitney $p ${fp(mannWhitney.pValue)}$ with threshold $\alpha=${alpha}$).`,
          String.raw`no se cumplió el criterio dual de significancia combinada (Wilcoxon $p ${fp(wilcoxon.pValue)}$, Mann-Whitney $p ${fp(mannWhitney.pValue)}$ con umbral $\alpha=${alpha}$).`
        );
  }

  const concText = hypothesisConfirmed
    ? tr(
      String.raw`The empirical evidence \textbf{corroborates} the research hypothesis ($H_1$): ${verdictDetails}`,
      String.raw`La evidencia empírica \textbf{corrobora} la hipótesis de investigación ($H_1$): ${verdictDetails}`
    )
    : tr(
      String.raw`The empirical evidence \textbf{fails to corroborate} and therefore \textbf{rejects} the research hypothesis ($H_1$): ${verdictDetails}`,
      String.raw`La evidencia empírica \textbf{no logra corroborar} y por tanto \textbf{rechaza} la hipótesis de investigación ($H_1$): ${verdictDetails}`
    );

  return String.raw`\documentclass[default,sn-basic]{sn-jnl}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{amsmath}
\usepackage{longtable}

\jyear{2026}

\begin{document}

\title[${shortTitle}]{${title}}

${authorsMarkup}

\abstract{${abstract}}

\keywords{${keywords}}

\maketitle

\section{${secIntro}}\label{sec:intro}
${introText}

\section{${secMethods}}\label{sec:methods}
${methodsText}
${reasonsList}

${reconText}

\section{${secResults}}\label{sec:results}
${tr(String.raw`Table~\ref{tab:descriptive} reports the distribution diagnostics for both evaluation phases.`, String.raw`La Tabla~\ref{tab:descriptive} reporta los diagnósticos de distribución de ambas fases de evaluación.`)}

\begin{table}[h]
\footnotesize
\caption{${descCaption}}\label{tab:descriptive}
\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}lcccccccccc@{\extracolsep{\fill}}}
\toprule
${descHeader} \\
\midrule
${descRow('Pretest', preMetrics)}
${descRow('Posttest', postMetrics)}
\bottomrule
\end{tabular*}
\end{table}

${justification}

${tr(String.raw`Table~\ref{tab:hypothesis} summarizes the inferential tests.`, String.raw`La Tabla~\ref{tab:hypothesis} resume las pruebas inferenciales.`)}

\begin{table}[h]
\caption{${hypCaption}}\label{tab:hypothesis}
\begin{tabular*}{\textwidth}{@{\extracolsep{\fill}}lcccccc@{\extracolsep{\fill}}}
\toprule
${hypHeader} \\
\midrule
${wRowLabel} & ${wilcoxon.n1} & $W=${f3(wilcoxon.statisticValue)}$ & ${f3(wilcoxon.zValue)} & ${fpCell(wilcoxon.pValue)} & ${f3(wilcoxon.effectSize)} & ${sig(wilcoxon)} \\
${uRowLabel} & (${n1}, ${n2}) & $U=${f3(mannWhitney.statisticValue)}$ & ${f3(mannWhitney.zValue)} & ${fpCell(mannWhitney.pValue)} & ${f3(mannWhitney.effectSize)} & ${sig(mannWhitney)} \\
\bottomrule
\end{tabular*}
\end{table}

${matrixSection}
\section{${secDisc}}\label{sec:discussion}
${discText}

\section{${secConc}}\label{sec:conclusion}
${concText}

\end{document}`;
}
