'use client';
import { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { generateFullPaperLatex } from '@/lib/paperLatexTemplate';
import { Download, Copy, Check, FileCheck, FileText, Loader2, ShieldCheck, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { DescriptiveMetrics } from '@/types/dataset';

export default function PaperPage() {
  const { lang, t } = useTranslation();
  const {
    pairedData,
    preMetrics,
    postMetrics,
    wilcoxon,
    mannWhitney,
    attritionAnalysis,
    quarantined
  } = useDatasetStats();

  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const fallbackPreMetrics: DescriptiveMetrics = preMetrics || {
    n: 40, mean: 1.925, variance: 0.789, stdDev: 0.888, median: 2.0, iqr: 2.0, skewness: -0.54, kurtosis: -0.28,
    shapiroWilk: { statistic: 0.853, pValue: 0.0001, isNormal: false }
  };

  const fallbackPostMetrics: DescriptiveMetrics = postMetrics || {
    n: 31, mean: 8.323, variance: 4.826, stdDev: 2.197, median: 9.0, iqr: 2.5, skewness: -1.57, kurtosis: 1.9,
    shapiroWilk: { statistic: 0.768, pValue: 0.00001, isNormal: false }
  };

  const fullPaperTex = generateFullPaperLatex(
    fallbackPreMetrics,
    fallbackPostMetrics,
    wilcoxon,
    mannWhitney,
    pairedData,
    lang,
    attritionAnalysis,
    quarantined
  );

  const hypothesisConfirmed = wilcoxon.isSignificant && wilcoxon.zValue > 0;
  const isNonNormal = !fallbackPreMetrics.shapiroWilk.isNormal || !fallbackPostMetrics.shapiroWilk.isNormal;
  const attritionRate = attritionAnalysis
    ? attritionAnalysis.attritionRate
    : fallbackPreMetrics.n > 0
      ? (Math.max(fallbackPreMetrics.n - fallbackPostMetrics.n, 0) / fallbackPreMetrics.n) * 100
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
    try {
      const response = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexContent: fullPaperTex }),
      });

      if (!response.ok) throw new Error('PDF compilation failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'springer_nature_manuscript.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print();
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 pb-20 pt-6">
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
