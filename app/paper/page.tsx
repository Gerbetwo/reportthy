'use client';
import { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { generateFullPaperLatex } from '@/lib/paperLatexTemplate';
import { Download, Copy, Check, FileCheck, FileText, Loader2 } from 'lucide-react';

export default function PaperPage() {
  const { lang, t } = useTranslation();
  const {
    pairedData,
    preMetrics,
    postMetrics,
    wilcoxon,
    mannWhitney
  } = useDatasetStats();

  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const fallbackPreMetrics = preMetrics || {
    n: 40, mean: 1.925, variance: 0.789, stdDev: 0.888, median: 2.0, iqr: 2.0, skewness: -0.54, kurtosis: -0.28,
    shapiroWilk: { statistic: 0.853, pValue: 0.0001, isNormal: false }
  };

  const fallbackPostMetrics = postMetrics || {
    n: 31, mean: 8.323, variance: 4.826, stdDev: 2.197, median: 9.0, iqr: 2.5, skewness: -1.57, kurtosis: 1.9,
    shapiroWilk: { statistic: 0.768, pValue: 0.00001, isNormal: false }
  };

  const fullPaperTex = generateFullPaperLatex(
    fallbackPreMetrics,
    fallbackPostMetrics,
    wilcoxon,
    mannWhitney,
    pairedData,
    lang
  );

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
    } catch (err) {
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
                {t.paper?.badge || 'Springer Nature Synthesizer'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-[#57606A] font-mono">sn-jnl Template Spec</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#002B49] mt-1 tracking-tight">
              {t.paper?.title || 'Academic Manuscript Synthesizer'}
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              {t.paper?.subtitle || 'Compile full sn-jnl LaTeX paper markup matching Springer Nature standards.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLatex}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.report.copied : (t.paper?.copyLatex || 'Copy LaTeX')}</span>
            </button>
            <button
              onClick={handleDownloadTex}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.paper?.downloadTex || 'Download .tex'}</span>
            </button>
            <button
              onClick={handleCompilePdf}
              disabled={isCompiling}
              className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              {isCompiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isCompiling ? t.report.compilingPdf : (t.paper?.downloadPdf || 'Download PDF')}</span>
            </button>
          </div>
        </header>

        {/* Paper Source Code Viewer */}
        <div className="bg-white border border-[#D0D7DE] rounded-lg overflow-hidden shadow-xs">
          <div className="bg-[#F8F9FA] px-4 py-3 border-b border-[#D0D7DE] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-serif font-bold text-[#002B49]">
              <FileText className="w-4 h-4 text-[#002B49]" />
              <span>{t.paper?.previewTitle || 'LaTeX Source Code & Manuscript Markup'}</span>
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
