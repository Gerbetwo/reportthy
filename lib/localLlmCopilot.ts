'use client';

import {
  StudyMetadata,
  HypothesisAuditResult,
  PaperNarrativeSlotsResult,
  CopilotModelId,
} from '@/types/dataset';
import type { MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export type CopilotProgressCallback = (report: InitProgressReport) => void;

let activeEngine: MLCEngine | null = null;
let currentLoadedModelId: CopilotModelId | null = null;
let initPromise: Promise<MLCEngine> | null = null;

/**
 * Detects whether the active browser environment supports WebGPU.
 */
export function isWebGPUSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return 'gpu' in navigator && !!(navigator as unknown as { gpu?: unknown }).gpu;
}

/**
 * Returns the currently active loaded model ID, or null if none is ready.
 */
export function getLoadedModelId(): CopilotModelId | null {
  return activeEngine ? currentLoadedModelId : null;
}

/**
 * Returns whether an engine initialization is currently in flight.
 */
export function isEngineInitializing(): boolean {
  return initPromise !== null;
}

/**
 * Singleton engine manager for client-side WebGPU LLMs.
 * Returns the active engine, or reloads if a different model is requested.
 */
export async function getOrInitWebLlmEngine(
  modelId: CopilotModelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC',
  onProgress?: CopilotProgressCallback
): Promise<MLCEngine> {
  if (!isWebGPUSupported()) {
    throw new Error('WebGPU is not supported or enabled in this browser.');
  }

  // Reuse engine if already loaded with the desired model
  if (activeEngine && currentLoadedModelId === modelId) {
    return activeEngine;
  }

  // If another call is already loading this model, await the in-flight promise
  if (initPromise && currentLoadedModelId === modelId) {
    return initPromise;
  }

  currentLoadedModelId = modelId;
  const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

  initPromise = (async () => {
    try {
      const engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          if (onProgress) {
            onProgress(report);
          }
        },
      });
      activeEngine = engine;
      return engine;
    } catch (err) {
      activeEngine = null;
      currentLoadedModelId = null;
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Helper to strip any accidental LaTeX markup or control characters from LLM text.
 */
export function stripLatexAndClean(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\[a-zA-Z]+(\[[^\]]*\])?(\{([^}]*)\})?/g, '$3')
    .replace(/[\\{}$%#_&]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts and safely parses JSON from LLM text output.
 */
function extractJsonFromLlmOutput<T>(rawText: string): T | null {
  if (!rawText) return null;
  // Remove markdown code fences if present
  const cleaned = rawText
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Deterministic fallback for hypothesis alignment when offline, unparseable, or WebGPU is absent.
 */
export function deterministicHypothesisAudit(
  studyMetadata: StudyMetadata,
  lang: 'en' | 'es' = 'en'
): HypothesisAuditResult {
  const isEs = lang === 'es';
  const hyp = (studyMetadata.hypothesisStatement || '').toLowerCase();
  const mode = studyMetadata.designMode || 'within_subject';

  const betweenGroupKeywords = [
    'superior',
    'outperform',
    'better than',
    'versus',
    'compared to',
    'control group',
    'control cohort',
    'supera',
    'superior a',
    'mayor que',
    'frente a',
    'frente al grupo',
    'grupo control',
    'cohorte control',
  ];

  const mentionsBetweenGroup = betweenGroupKeywords.some((k) => hyp.includes(k));

  if (mode === 'within_subject' && mentionsBetweenGroup) {
    return {
      isAligned: false,
      suggestedMode: 'between_group',
      warning: isEs
        ? 'Su hipótesis plantea una comparación de superioridad entre grupos, pero el modo seleccionado evalúa únicamente la ganancia longitudinal pre/post intra-sujeto (Wilcoxon).'
        : 'Your hypothesis posits a between-group superiority comparison, but the selected mode tests only within-subject longitudinal pre/post gains (Wilcoxon).',
      refinedH0: isEs
        ? `H₀: No existe diferencia significativa en la ganancia de puntaje entre el grupo experimental (${studyMetadata.experimentalPedagogy || 'Intervención'}) y el grupo control (${studyMetadata.controlPedagogy || 'Tradicional'}).`
        : `H₀: There is no statistically significant difference in score gains between the experimental group (${studyMetadata.experimentalPedagogy || 'Intervention'}) and control group (${studyMetadata.controlPedagogy || 'Control'}).`,
      refinedH1: isEs
        ? `H₁: Los estudiantes expuestos a ${studyMetadata.experimentalPedagogy || 'la intervención experimental'} logran una ganancia de aprendizaje significativamente superior a los expuestos a ${studyMetadata.controlPedagogy || 'la condición control'}.`
        : `H₁: Students instructed via ${studyMetadata.experimentalPedagogy || 'experimental intervention'} achieve significantly superior learning gains compared to ${studyMetadata.controlPedagogy || 'control condition'}.`,
    };
  }

  if (mode === 'between_group' && !mentionsBetweenGroup) {
    return {
      isAligned: false,
      suggestedMode: 'within_subject',
      warning: isEs
        ? 'Su hipótesis se enfoca en el progreso individual pre/post sin contrastar la intervención contra el grupo control.'
        : 'Your hypothesis focuses on pre/post gain without explicitly contrasting the experimental condition against a control group.',
      refinedH0: isEs
        ? 'H₀: La intervención instruccional no produce una ganancia longitudinal de puntaje estadísticamente significativa (Δ ≤ 0).'
        : 'H₀: The instructional intervention produces no statistically significant longitudinal score gain (Δ ≤ 0).',
      refinedH1: isEs
        ? `H₁: La instrucción mediante ${studyMetadata.experimentalPedagogy || 'la pedagogía evaluada'} produce una ganancia de aprendizaje longitudinal positiva estadísticamente significativa (Δ > 0).`
        : `H₁: Instruction utilizing ${studyMetadata.experimentalPedagogy || 'the evaluated pedagogy'} produces a statistically significant positive longitudinal learning gain (Δ > 0).`,
    };
  }

  return {
    isAligned: true,
    suggestedMode: mode,
    warning: isEs
      ? 'La hipótesis declarada está semánticamente alineada con el modo de diseño experimental configurado.'
      : 'The stated hypothesis is semantically aligned with the configured experimental design mode.',
    refinedH0: isEs
      ? 'H₀: La intervención evaluada no produce un efecto estadísticamente significativo según los criterios del diseño.'
      : 'H₀: The evaluated intervention produces no statistically significant effect under the design criteria.',
    refinedH1: studyMetadata.hypothesisStatement ||
      (isEs
        ? 'H₁: La intervención pedagógica experimental produce una mejora medible estadísticamente significativa.'
        : 'H₁: The experimental pedagogical intervention produces a statistically significant measurable improvement.'),
  };
}

/**
 * Deterministic fallback for paper narrative slots when offline or unparseable.
 */
export function deterministicPaperNarrativeSlots(
  studyMetadata: StudyMetadata,
  lang: 'en' | 'es' = 'en'
): PaperNarrativeSlotsResult {
  const isEs = lang === 'es';
  const topic = studyMetadata.topicDomain?.trim() || (isEs ? 'Tecnología Educativa' : 'Educational Technology');
  const expPed = studyMetadata.experimentalPedagogy?.trim() || (isEs ? 'Intervención interactiva' : 'Interactive intervention');
  const ctrlPed = studyMetadata.controlPedagogy?.trim() || (isEs ? 'Instrucción didáctica tradicional' : 'Traditional didactic instruction');

  const manuscriptTitle = isEs
    ? `Evaluación Empírica de ${topic}: Un Análisis Cuasi-Experimental de ${expPed}`
    : `Empirical Evaluation in ${topic}: A Quasi-Experimental Assessment of ${expPed}`;

  const theoreticalContext = isEs
    ? `La adquisición de competencias en ${topic} requiere articular fundamentos conceptuales rigurosos con entornos de práctica activa, reduciendo la sobrecarga cognitiva mediante ciclos de retroalimentación constructiva.`
    : `Skill acquisition in ${topic} demands reconciling rigorous theoretical concepts with hands-on exploratory practice, mitigating extraneous cognitive load through targeted formative feedback loops.`;

  const pedagogicalComparisonNote = isEs
    ? `El protocolo metodológico contrasta la condición de control (${ctrlPed}) frente a la intervención experimental (${expPed}), evaluando la eficacia en la retención y transferencia de conocimientos.`
    : `The methodological protocol systematically contrasts the baseline control condition (${ctrlPed}) against the experimental intervention (${expPed}), assessing relative efficacy in conceptual retention and procedural transfer.`;

  const keywords = isEs
    ? [topic, 'Pedagogía Computacional', 'Diseño Cuasi-Experimental', 'Pruebas No Paramétricas', 'Calidad de Datos']
    : [topic, 'Computer Science Pedagogy', 'Quasi-Experimental Assessment', 'Non-Parametric Testing', 'Data Quality Assurance'];

  return {
    manuscriptTitle,
    theoreticalContext,
    pedagogicalComparisonNote,
    keywords,
  };
}

/**
 * Audits the researcher's hypothesis statement against their chosen design mode using the local WebGPU LLM.
 */
export async function auditHypothesisAlignment(
  studyMetadata: StudyMetadata,
  lang: 'en' | 'es' = 'en',
  modelId: CopilotModelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC',
  onProgress?: CopilotProgressCallback
): Promise<HypothesisAuditResult> {
  const isEs = lang === 'es';

  if (!isWebGPUSupported()) {
    return deterministicHypothesisAudit(studyMetadata, lang);
  }

  try {
    const engine = await getOrInitWebLlmEngine(modelId, onProgress);

    const systemPrompt = isEs
      ? `Eres un metodólogo estadístico riguroso para investigación cuasi-experimental en educación superior.
Tu tarea es auditar la alineación semántica entre la Hipótesis Alternativa (H₁) planteada y el Modo de Diseño Experimental seleccionado:
- "within_subject": Ganancia longitudinal de los mismos participantes (Post > Pre vía Wilcoxon). NO debe comparar un grupo contra otro grupo.
- "between_group": Superioridad del grupo Experimental frente al grupo Control (Delta_Exp > Delta_Ctrl vía Mann-Whitney U).
- "combined": Requiere tanto ganancia longitudinal significativa como superioridad sobre el grupo control.

Debes responder ÚNICAMENTE un objeto JSON válido con este esquema estricto (sin explicaciones previas ni markdown):
{
  "isAligned": boolean,
  "suggestedMode": "within_subject" | "between_group" | "combined",
  "warning": "explicación concisa en español",
  "refinedH0": "planteamiento formal de H₀ en español",
  "refinedH1": "planteamiento formal de H₁ en español"
}`
      : `You are an expert statistical methodologist for quasi-experimental research in education.
Your task is to audit the semantic alignment between the researcher's Alternative Hypothesis (H₁) and their selected Experimental Design Mode:
- "within_subject": Longitudinal pre/post gain of the same participants (Post > Pre via Wilcoxon). Must NOT compare two cohorts against each other.
- "between_group": Superiority of Experimental cohort gains over Control cohort gains (Delta_Exp > Delta_Ctrl via Mann-Whitney U).
- "combined": Requires both longitudinal gain AND between-group superiority.

You must reply with STRICT JSON ONLY matching this exact schema (no markdown, no extra commentary):
{
  "isAligned": boolean,
  "suggestedMode": "within_subject" | "between_group" | "combined",
  "warning": "concise explanation in English",
  "refinedH0": "formal H₀ statement in English",
  "refinedH1": "formal H₁ statement in English"
}`;

    const userPrompt = `Study Title: "${studyMetadata.studyTitle}"
Topic Domain: "${studyMetadata.topicDomain}"
Control Condition: "${studyMetadata.controlPedagogy}"
Experimental Condition: "${studyMetadata.experimentalPedagogy}"
Selected Design Mode: "${studyMetadata.designMode}"
Researcher Hypothesis (H₁): "${studyMetadata.hypothesisStatement}"`;

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const outputText = response.choices[0]?.message?.content || '';
    const parsed = extractJsonFromLlmOutput<Partial<HypothesisAuditResult>>(outputText);

    if (
      parsed &&
      typeof parsed.isAligned === 'boolean' &&
      (parsed.suggestedMode === 'within_subject' ||
        parsed.suggestedMode === 'between_group' ||
        parsed.suggestedMode === 'combined') &&
      typeof parsed.warning === 'string' &&
      typeof parsed.refinedH0 === 'string' &&
      typeof parsed.refinedH1 === 'string'
    ) {
      return {
        isAligned: parsed.isAligned,
        suggestedMode: parsed.suggestedMode,
        warning: stripLatexAndClean(parsed.warning),
        refinedH0: stripLatexAndClean(parsed.refinedH0),
        refinedH1: stripLatexAndClean(parsed.refinedH1),
      };
    }

    return deterministicHypothesisAudit(studyMetadata, lang);
  } catch (err) {
    console.warn('[WebGPU Copilot] Hypothesis audit encountered error, falling back to deterministic audit:', err);
    return deterministicHypothesisAudit(studyMetadata, lang);
  }
}

/**
 * Generates polished academic prose slots for the Springer Nature (sn-jnl) LaTeX manuscript using the local WebGPU LLM.
 */
export async function generatePaperNarrativeSlots(
  studyMetadata: StudyMetadata,
  lang: 'en' | 'es' = 'en',
  modelId: CopilotModelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC',
  onProgress?: CopilotProgressCallback
): Promise<PaperNarrativeSlotsResult> {
  const isEs = lang === 'es';

  if (!isWebGPUSupported()) {
    return deterministicPaperNarrativeSlots(studyMetadata, lang);
  }

  try {
    const engine = await getOrInitWebLlmEngine(modelId, onProgress);

    const systemPrompt = isEs
      ? `Eres un editor académico principal para revistas Springer Nature en educación superior y ciencias de la computación.
Tu tarea es generar redacción académica rigurosa para los campos de contextualización de un artículo científico sn-jnl.
RESTRICCIONES ESTRICTAS:
1. Responde ÚNICAMENTE en JSON válido sin formato markdown ni código.
2. NO inventes números, tamaños de muestra, estadísticos o valores p.
3. NO incluyas comandos ni símbolos LaTeX (no uses \\textbf, no uses \\cite, no uses llaves ni barras invertidas).
4. El idioma debe ser Español académico impecable.

Esquema JSON requerido:
{
  "manuscriptTitle": "Título formal y conciso del manuscrito",
  "theoreticalContext": "2 o 3 oraciones académicas para la Introducción sobre el marco teórico pedagógico",
  "pedagogicalComparisonNote": "2 oraciones para Metodología contrastando la condición control y la experimental",
  "keywords": ["PalabraClave1", "PalabraClave2", "PalabraClave3", "PalabraClave4"]
}`
      : `You are a principal academic editor for Springer Nature journals in computer science and higher education.
Your task is to synthesize rigorous academic prose for the contextual framing slots of an sn-jnl manuscript.
CRITICAL CONSTRAINTS:
1. Respond with STRICT JSON ONLY (no markdown code blocks, no preamble).
2. DO NOT invent numerical values, sample sizes, test statistics, or p-values.
3. DO NOT include LaTeX markup, commands, backslashes, or braces (no \\textbf, no \\cite, no curly braces).
4. Write in formal academic English.

Required JSON schema:
{
  "manuscriptTitle": "Formal, concise academic manuscript title",
  "theoreticalContext": "2 to 3 academic sentences for Introduction providing pedagogical theoretical framing",
  "pedagogicalComparisonNote": "2 academic sentences for Methods contrasting control vs experimental pedagogy",
  "keywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4"]
}`;

    const userPrompt = `Course/Study Title: "${studyMetadata.studyTitle}"
Domain: "${studyMetadata.topicDomain}"
Baseline Control Pedagogy: "${studyMetadata.controlPedagogy}"
Experimental Pedagogy: "${studyMetadata.experimentalPedagogy}"
Research Hypothesis: "${studyMetadata.hypothesisStatement}"
Design Mode: "${studyMetadata.designMode}"`;

    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 650,
    });

    const outputText = response.choices[0]?.message?.content || '';
    const parsed = extractJsonFromLlmOutput<Partial<PaperNarrativeSlotsResult>>(outputText);

    if (
      parsed &&
      typeof parsed.manuscriptTitle === 'string' &&
      typeof parsed.theoreticalContext === 'string' &&
      typeof parsed.pedagogicalComparisonNote === 'string' &&
      Array.isArray(parsed.keywords)
    ) {
      return {
        manuscriptTitle: stripLatexAndClean(parsed.manuscriptTitle),
        theoreticalContext: stripLatexAndClean(parsed.theoreticalContext),
        pedagogicalComparisonNote: stripLatexAndClean(parsed.pedagogicalComparisonNote),
        keywords: parsed.keywords.map((k) => stripLatexAndClean(String(k))).filter(Boolean),
      };
    }

    return deterministicPaperNarrativeSlots(studyMetadata, lang);
  } catch (err) {
    console.warn('[WebGPU Copilot] Paper narrative slots generation error, using deterministic fallback:', err);
    return deterministicPaperNarrativeSlots(studyMetadata, lang);
  }
}
