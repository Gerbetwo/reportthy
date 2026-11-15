'use client';

import React, { useState, useCallback } from 'react';
import {
  Cpu,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';
import {
  CopilotModelId,
  COPILOT_MODELS,
  HypothesisAuditResult,
  PaperNarrativeSlotsResult,
  StudyMetadata,
  ExperimentalDesignMode,
} from '@/types/dataset';
import {
  isWebGPUSupported,
  getLoadedModelId,
  getOrInitWebLlmEngine,
  auditHypothesisAlignment,
  generatePaperNarrativeSlots,
} from '@/lib/localLlmCopilot';
import type { InitProgressReport } from '@mlc-ai/web-llm';

// ---------- Props ----------

interface CopilotPanelProps {
  mode: 'hypothesis' | 'paper';
  studyMetadata: StudyMetadata;
  onApplyDesignMode?: (mode: ExperimentalDesignMode) => void;
  onApplyRefinedH1?: (h1: string) => void;
  onApplyNarrativeSlots?: (slots: PaperNarrativeSlotsResult) => void;
}

// ---------- Component ----------

export default function LocalCopilotPanel({
  mode,
  studyMetadata,
  onApplyDesignMode,
  onApplyRefinedH1,
  onApplyNarrativeSlots,
}: CopilotPanelProps) {
  const { lang, t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedModel, setSelectedModel] = useState<CopilotModelId>(
    'SmolLM2-360M-Instruct-q4f16_1-MLC'
  );
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadProgressText, setLoadProgressText] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Hypothesis audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<HypothesisAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Paper narrative state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [slotsApplied, setSlotsApplied] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const webGpuSupported = typeof window !== 'undefined' && isWebGPUSupported();

  // Check if already loaded
  const alreadyLoaded = getLoadedModelId() === selectedModel;
  const effectiveModelReady = modelReady || alreadyLoaded;

  const handleProgress = useCallback((report: InitProgressReport) => {
    setLoadProgress(Math.round(report.progress * 100));
    setLoadProgressText(report.text);
  }, []);

  const handleLoadModel = useCallback(async () => {
    setIsLoadingModel(true);
    setLoadError(null);
    setLoadProgress(0);
    setLoadProgressText('');
    try {
      await getOrInitWebLlmEngine(selectedModel, handleProgress);
      setModelReady(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
    } finally {
      setIsLoadingModel(false);
    }
  }, [selectedModel, handleProgress]);

  const handleAuditHypothesis = useCallback(async () => {
    setIsAuditing(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const result = await auditHypothesisAlignment(
        studyMetadata,
        lang,
        selectedModel,
        handleProgress
      );
      setAuditResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuditError(msg);
    } finally {
      setIsAuditing(false);
    }
  }, [studyMetadata, lang, selectedModel, handleProgress]);

  const handleEnhanceFraming = useCallback(async () => {
    setIsEnhancing(true);
    setSlotsError(null);
    setSlotsApplied(false);
    try {
      const result = await generatePaperNarrativeSlots(
        studyMetadata,
        lang,
        selectedModel,
        handleProgress
      );
      if (onApplyNarrativeSlots) {
        onApplyNarrativeSlots(result);
      }
      setSlotsApplied(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSlotsError(msg);
    } finally {
      setIsEnhancing(false);
    }
  }, [studyMetadata, lang, selectedModel, handleProgress, onApplyNarrativeSlots]);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-200/60 rounded-lg overflow-hidden shadow-xs">
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-indigo-50/50 transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-xs font-serif font-bold text-[#002B49]">
            {t.copilot.title}
          </span>
          {effectiveModelReady && (
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded">
              {t.copilot.modelReady}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-mono text-indigo-500 font-bold">
            {t.copilot.badge}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-indigo-100">
          {/* Description */}
          <p className="text-[11px] text-[#57606A] leading-relaxed pt-3">
            {t.copilot.desc}
          </p>

          {/* WebGPU unsupported */}
          {!webGpuSupported && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {t.copilot.unsupportedWebGPU}
              </p>
            </div>
          )}

          {/* Model selector & load */}
          {webGpuSupported && (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-[11px] font-semibold text-[#57606A] mb-1">
                    {t.copilot.modelSelectLabel}
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value as CopilotModelId);
                      setModelReady(false);
                      setAuditResult(null);
                      setSlotsApplied(false);
                    }}
                    disabled={isLoadingModel || isAuditing || isEnhancing}
                    className="w-full bg-white border border-[#D0D7DE] rounded px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
                  >
                    {COPILOT_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {t.copilot[m.labelKey]} ({m.sizeBytesApprox})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleLoadModel}
                  disabled={isLoadingModel || effectiveModelReady}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isLoadingModel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t.copilot.loadingModel}</span>
                    </>
                  ) : effectiveModelReady ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.copilot.modelReady}</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3.5 h-3.5" />
                      <span>{t.copilot.loadModelBtn}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress bar */}
              {isLoadingModel && (
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    {loadProgress}% — {loadProgressText}
                  </p>
                </div>
              )}

              {/* Load error */}
              {loadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-md p-2.5 flex items-start gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-700 break-all">{loadError}</p>
                </div>
              )}

              {/* Memory notice */}
              {effectiveModelReady && (
                <p className="text-[10px] text-slate-400 font-mono">
                  {t.copilot.memoryNotice}
                </p>
              )}

              {/* ===== HYPOTHESIS AUDIT MODE ===== */}
              {mode === 'hypothesis' && effectiveModelReady && (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAuditHypothesis}
                    disabled={isAuditing || !studyMetadata.hypothesisStatement?.trim()}
                    className="w-full bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2.5 rounded text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40"
                  >
                    {isAuditing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.copilot.auditing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.copilot.auditHypothesisBtn}</span>
                      </>
                    )}
                  </button>

                  {auditError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-md p-2.5 flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-700">{t.copilot.auditError}: {auditError}</p>
                    </div>
                  )}

                  {/* Audit result display */}
                  {auditResult && (
                    <div className={`border rounded-lg p-3.5 space-y-2.5 ${
                      auditResult.isAligned
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {auditResult.isAligned ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        )}
                        <span className="text-xs font-serif font-bold text-[#002B49]">
                          {t.copilot.alignmentResultTitle}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          auditResult.isAligned
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {auditResult.isAligned ? t.copilot.alignedBadge : t.copilot.misalignedBadge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-700 leading-relaxed">
                        {auditResult.warning}
                      </p>

                      {!auditResult.isAligned && auditResult.suggestedMode !== studyMetadata.designMode && onApplyDesignMode && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">
                            {t.copilot.suggestedModeLabel}:
                          </span>
                          <code className="text-[11px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700">
                            {t.protocol.fields.designModeOptions[auditResult.suggestedMode] || auditResult.suggestedMode}
                          </code>
                          <button
                            type="button"
                            onClick={() => onApplyDesignMode(auditResult.suggestedMode)}
                            className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 px-2 py-0.5 rounded transition flex items-center gap-1"
                          >
                            <ArrowRight className="w-3 h-3" />
                            {t.copilot.applySuggestedMode}
                          </button>
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            {t.copilot.refinedH0Label}
                          </span>
                          <p className="text-[11px] text-slate-700 font-serif leading-relaxed mt-0.5">
                            {auditResult.refinedH0}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            {t.copilot.refinedH1Label}
                          </span>
                          <p className="text-[11px] text-slate-700 font-serif leading-relaxed mt-0.5">
                            {auditResult.refinedH1}
                          </p>
                          {onApplyRefinedH1 && auditResult.refinedH1 !== studyMetadata.hypothesisStatement && (
                            <button
                              type="button"
                              onClick={() => onApplyRefinedH1(auditResult.refinedH1)}
                              className="mt-1.5 text-[10px] font-bold text-[#002B49] hover:text-white bg-slate-100 hover:bg-[#002B49] border border-[#002B49]/30 px-2.5 py-1 rounded transition flex items-center gap-1"
                            >
                              <ArrowRight className="w-3 h-3" />
                              {t.copilot.applyRefinedH1}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== PAPER ENHANCE MODE ===== */}
              {mode === 'paper' && effectiveModelReady && (
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleEnhanceFraming}
                    disabled={isEnhancing}
                    className="w-full bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2.5 rounded text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-40"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t.copilot.enhancing}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t.copilot.enhanceFramingBtn}</span>
                      </>
                    )}
                  </button>

                  {slotsError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-md p-2.5 flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-rose-700">{t.copilot.slotsError}: {slotsError}</p>
                    </div>
                  )}

                  {slotsApplied && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-2.5 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {t.copilot.slotsAppliedSuccess}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
