'use client';

import { useState } from 'react';
import Link from 'next/link';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { generateFullPaperLatex } from '@/lib/paperLatexTemplate';
import {
  Download,
  Copy,
  Check,
  FileCheck,
  FileText,
  Loader2,
  ShieldCheck,
  Activity,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Code2
} from 'lucide-react';

export default function PaperPage() {
  const { lang, t } = useTranslation();
  const {
    pairedData,
    attritionAnalysis,
    quarantined,
    jupyterResults
  } = useDatasetStats();

  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // If no Jupyter execution results are found, block paper synthesis
  if (!jupyterResults) {
    return (
      <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
        <HeaderNav />
        <main className="max-w-4xl mx-auto px-6 py-20">
          <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#002B49]">
              {t.paper.requireExecutionTitle}
            </h1>
            <p className="text-sm text-[#57606A] mt-2 max-w-xl mx-auto leading-relaxed">
              {t.paper.requireExecutionDesc}
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/lab"
                className="bg-[#002B49] hover:bg-[#001A2C] text-white px-5 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition shadow-xs"
              >
                <span>{t.paper.goToLab}</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const fullPaperTex = generateFullPaperLatex(
    jupyterResults,
    pairedData,
    lang,
    attritionAnalysis,
    quarantined
  );

  const {
    preMetrics,
    postMetrics,
    wilcoxon,
    mannWhitney,
    hypothesisConfirmed,
    executedCodeCells,
    kernelInfo,
    executedAt
  } = jupyterResults;

  const isNonNormal = !preMetrics.shapiroWilk.isNormal || !postMetrics.shapiroWilk.isNormal;
  const attritionRate = attritionAnalysis
    ? attritionAnalysis.attritionRate
    : preMetrics.n > 0
      ? (Math.max(preMetrics.n - postMetrics.n, 0) / preMetrics.n) * 100
      : 0;

  const formatP = (p: number): string => (p < 0.001 ? '< 0.001' : p.toFixed(3));

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(fullPaperTex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTex = () => {
    const blob = new Blob([fullPaperTex], { type: 'text/x-tex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'springer_nature_manuscript.tex';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompilePdf = async () => {
    setIsCompiling(true);
    setCompileError(null);
    try {
      const response = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexContent: fullPaperTex }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMessage = errData.details
          ? `${errData.error || 'PDF compilation failed'}: ${errData.details}`
          : errData.error || 'PDF compilation failed on server.';
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'springer_nature_manuscript.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompileError(msg);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 pb-20 pt-6">
        {compileError && (
          <div className="mb-6 bg-rose-50 border border-rose-300 rounded-lg p-4 text-xs text-rose-900 shadow-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t.paper.compileErrorTitle}</p>
                <p className="font-mono text-[11px] text-rose-700 mt-1 whitespace-pre-wrap">{compileError}</p>
              </div>
            </div>
            <button
              onClick={() => setCompileError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold text-base px-1.5"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}
        <header className="border-b border-[#D0D7DE] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                {t.paper.badge}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-[#57606A] font-mono">{t.paper.templateSpec}</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#002B49] mt-1 tracking-tight">
              {t.paper.title}
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              {t.paper.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLatex}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.paper.copied : t.paper.copyLatex}</span>
            </button>
            <button
              onClick={handleDownloadTex}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.paper.downloadTex}</span>
            </button>
            <button
              onClick={handleCompilePdf}
              disabled={isCompiling}
              className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              {isCompiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isCompiling ? t.paper.compilingPdf : t.paper.downloadPdf}</span>
            </button>
          </div>
        </header>

        {/* Quality Assurance & Hypothesis Verdict Summary Banner */}
        <section className="mb-6">
          <h2 className="text-sm font-serif font-bold text-[#002B49] mb-3">{t.paper.qaTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#D0D7DE] rounded-lg p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#002B49] uppercase font-mono">
                <ShieldCheck className="w-4 h-4" />
                <span>{t.paper.integrityTitle}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-[#1F2328]">
                <li><strong className="font-mono">{quarantined.length}</strong> {t.paper.anomaliesIsolated}</li>
                <li>{t.paper.attritionRate}: <strong className="font-mono">{attritionRate.toFixed(1)}%</strong></li>
                <li>{t.paper.pairedN}: <strong className="font-mono">{pairedData.length}</strong></li>
              </ul>
            </div>

            <div className="bg-white border border-[#D0D7DE] rounded-lg p-4 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#002B49] uppercase font-mono">
                <Activity className="w-4 h-4" />
                <span>{t.paper.normalityTitle}</span>
              </div>
              <span
                className={
                  isNonNormal
                    ? 'inline-block mt-3 text-xs font-bold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-300'
                    : 'inline-block mt-3 text-xs font-bold px-2 py-0.5 rounded border bg-sky-50 text-sky-800 border-sky-300'
                }
              >
                {isNonNormal ? t.paper.nonNormal : t.paper.normal}
              </span>
              <p className="mt-2 text-[11px] text-[#57606A] leading-relaxed">
                {isNonNormal ? t.paper.nonParametricDirective : t.paper.parametricEligible}
              </p>
            </div>

            <div
              className={
                hypothesisConfirmed
                  ? 'rounded-lg p-4 shadow-xs border bg-emerald-50 border-emerald-300'
                  : 'rounded-lg p-4 shadow-xs border bg-rose-50 border-[#C0392B]/40'
              }
            >
              <div className="text-xs font-semibold text-[#002B49] uppercase font-mono">{t.paper.verdictTitle}</div>
              <div
                className={
                  hypothesisConfirmed
                    ? 'mt-3 flex items-center gap-2 text-sm font-bold text-emerald-700'
                    : 'mt-3 flex items-center gap-2 text-sm font-bold text-[#C0392B]'
                }
              >
                {hypothesisConfirmed ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                <span>{hypothesisConfirmed ? t.paper.corroborated : t.paper.rejected}</span>
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] font-mono text-[#1F2328]">
                <li>{t.paper.wilcoxonP}: {formatP(wilcoxon.pValue)}</li>
                <li>{t.paper.effectSize}: {wilcoxon.effectSize.toFixed(3)}</li>
                <li>{t.paper.mannWhitneyP}: {formatP(mannWhitney.pValue)}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Collapsible Audit Drawer: Executed Python Cells */}
        <div className="bg-white border border-[#D0D7DE] rounded-lg mb-6 shadow-xs overflow-hidden">
          <button
            onClick={() => setIsAuditOpen(!isAuditOpen)}
            className="w-full px-4 py-3 bg-[#F8F9FA] hover:bg-slate-100 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#002B49]" />
              <span className="text-xs font-semibold text-[#002B49]">{t.paper.auditDrawerTitle}</span>
              <span className="text-[11px] text-[#57606A] hidden sm:inline">• {t.paper.auditDrawerSub}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                Verified
              </span>
              {isAuditOpen ? <ChevronUp className="w-4 h-4 text-[#57606A]" /> : <ChevronDown className="w-4 h-4 text-[#57606A]" />}
            </div>
          </button>

          {isAuditOpen && (
            <div className="p-4 border-t border-[#D0D7DE] bg-slate-900 text-slate-100 font-mono text-xs">
              <div className="flex flex-wrap gap-4 pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  {t.paper.kernelInfo}: {kernelInfo}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  {t.paper.executionTimestamp}: {new Date(executedAt).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/90 mb-3 font-sans">
                {t.paper.reproducibilityNotice}
              </p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {executedCodeCells.map((codeStr, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-500 mb-1"># Executed Python Cell [{idx + 2}]</div>
                    <pre className="overflow-x-auto text-emerald-300 leading-relaxed text-[11px]">{codeStr}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Paper Source Code Viewer */}
        <div className="bg-white border border-[#D0D7DE] rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#F8F9FA] px-4 py-3 border-b border-[#D0D7DE] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#002B49]">
              <FileText className="w-4 h-4 text-[#002B49]" />
              <span>{t.paper.previewTitle}</span>
            </div>
            <span className="text-[11px] font-mono text-[#57606A]">sn-jnl / sn-basic</span>
          </div>
          <pre className="p-6 text-xs font-mono text-slate-800 overflow-x-auto bg-[#F8F9FA]/50 leading-relaxed max-h-[600px] overflow-y-auto">
            {fullPaperTex}
          </pre>
        </div>
      </main>
    </div>
  );
}
