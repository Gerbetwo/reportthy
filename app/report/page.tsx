'use client';
import { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import DistributionChart from '@/components/DistributionChart';
import { generateSpringerNatureLatex } from '@/lib/latexTemplate';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import {
  Download,
  Copy,
  Check,
  Printer,
  Loader2,
  FileCheck,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertOctagon
} from 'lucide-react';

export default function QualityReportPage() {
  const { lang, t } = useTranslation();
  const {
    preClean,
    postClean,
    pairedData,
    preMetrics,
    postMetrics,
    attritionAnalysis
  } = useDatasetStats();

  const [copied, setCopied] = useState(false);
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!preMetrics || !postMetrics) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#1F2328]">
        <HeaderNav />
        <main className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="bg-white border border-[#D0D7DE] rounded-xl p-8 shadow-xs max-w-lg mx-auto">
            <h2 className="font-serif font-bold text-[#002B49] text-xl mb-2">
              No Evaluation Data Available
            </h2>
            <p className="text-xs text-[#57606A] mb-6 leading-relaxed">
              No active pretest and posttest evaluation datasets were found. Please import your survey files to generate an empirical quality report.
            </p>
            <button
              onClick={() => window.location.href = '/upload'}
              className="bg-[#002B49] hover:bg-[#001A2C] text-white text-xs font-semibold px-5 py-2.5 rounded-md transition shadow-xs"
            >
              Upload Surveys
            </button>
          </div>
        </main>
      </div>
    );
  }

  const attritionCount = Math.max(0, preMetrics.n - postMetrics.n);
  const attritionRate = preMetrics.n > 0 ? (attritionCount / preMetrics.n) * 100 : 0;
  const latexCode = generateSpringerNatureLatex(
    preMetrics,
    postMetrics,
    attritionCount,
    attritionRate,
    lang,
    attritionAnalysis || undefined,
    pairedData
  );

  const isNonNormal = preMetrics.shapiroWilk.pValue < 0.05 || postMetrics.shapiroWilk.pValue < 0.05;

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLatex = () => {
    const blob = new Blob([latexCode], { type: 'text/x-tex' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality_report_springer_nature.tex';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompileServerPdf = async () => {
    setIsCompilingPdf(true);
    try {
      const response = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexContent: latexCode }),
      });

      if (!response.ok) throw new Error('PDF compilation error');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'springer_nature_quality_report.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      window.print();
    } finally {
      setIsCompilingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 pb-20 pt-6">
        {/* Header */}
        <header className="bg-white border border-[#D0D7DE] rounded-lg p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#002B49] tracking-tight">
              {t.report.title}
            </h1>
            <p className="text-xs text-[#57606A] mt-1">
              {t.report.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              onClick={handleCopyLatex}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#002B49] flex items-center gap-1.5 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.report.copied : t.report.copyLatex}</span>
            </button>
            <button
              onClick={handleDownloadLatex}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#002B49] flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.report.downloadTex}</span>
            </button>
            <button
              onClick={handleCompileServerPdf}
              disabled={isCompilingPdf}
              className="px-3.5 py-2 rounded-md text-xs font-semibold bg-[#002B49] hover:bg-[#001A2C] text-white flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isCompilingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isCompilingPdf ? t.report.compilingPdf : t.report.downloadPdf}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-md text-xs font-semibold border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#002B49] transition"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Normality Rejection Directive Callout Banner */}
        {isNonNormal && (
          <div className="bg-rose-50 border-2 border-[#C0392B] rounded-xl p-5 mb-8 shadow-xs flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#C0392B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white bg-[#C0392B] px-2.5 py-0.5 rounded">
                  {t.report.normalityTitle || 'Distribution: Non-Normal'}
                </span>
                <span className="text-xs font-mono text-[#C0392B] font-bold">
                  (D&apos;Agostino-Pearson p &lt; 0.05)
                </span>
              </div>
              <p className="text-xs font-semibold text-[#002B49] mt-2 font-mono leading-relaxed">
                {t.report.normalityDirective || "Parametric Student's t-test invalid; Wilcoxon Signed-Rank / Mann-Whitney U mandatory."}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Line Card */}
        <section className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 mb-8 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                {t.report.bottomLineBadge}
              </span>
              <h2 className="text-xl font-serif font-bold text-[#002B49] mt-2">
                {t.report.bottomLineTitle}
              </h2>
              <p className="text-xs text-slate-700 mt-2 leading-relaxed max-w-3xl">
                {t.report.bottomLineDesc} <strong>{preMetrics.mean} / 10</strong> {t.report.toOnPost} <strong>{postMetrics.mean} / 10</strong> {t.report.onPost}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600 shrink-0" />
          </div>
        </section>

        {/* Score Distribution Density Histogram */}
        <DistributionChart preData={preClean} postData={postClean} />

        {/* Quick KPI Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
            <div className="text-xs font-mono text-[#57606A] uppercase font-semibold">{t.report.preAvg}</div>
            <div className="text-2xl font-serif font-bold text-[#002B49] mt-1">{preMetrics.mean} <span className="text-xs font-sans text-slate-400">/ 10</span></div>
            <div className="text-xs text-[#57606A] mt-1">N = {preMetrics.n} students</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
            <div className="text-xs font-mono text-[#57606A] uppercase font-semibold">{t.report.postAvg}</div>
            <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">{postMetrics.mean} <span className="text-xs font-sans text-slate-400">/ 10</span></div>
            <div className="text-xs text-[#57606A] mt-1">N = {postMetrics.n} students</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
            <div className="text-xs font-mono text-[#57606A] uppercase font-semibold">{t.report.scoreShift}</div>
            <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">+{(postMetrics.mean - preMetrics.mean).toFixed(2)}</div>
            <div className="text-xs text-[#57606A] mt-1">{t.report.overallImprovement}</div>
          </div>
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
            <div className="text-xs font-mono text-[#57606A] uppercase font-semibold">{t.report.attritionRate}</div>
            <div className="text-2xl font-serif font-bold text-slate-700 mt-1">{attritionRate.toFixed(1)}%</div>
            <div className="text-xs text-[#57606A] mt-1">{attritionCount} {t.report.respondentsUnmatched}</div>
          </div>
        </section>

        {/* Student Validation Matrix Spreadsheet Table */}
        {pairedData.length > 0 && (
          <section className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs mb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-[#002B49]">
                  {t.report.studentMatrixTitle}
                </h3>
                <p className="text-xs text-[#57606A]">
                  {t.report.studentMatrixSub} ({pairedData.length} {t.home.matchedCohort})
                </p>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 print:max-h-none print:overflow-visible">
              <table className="table-booktabs text-xs">
                <thead className="sticky top-0 bg-white print:static">
                  <tr>
                    <th>#</th>
                    <th>{t.report.colStudent}</th>
                    <th>{t.report.colGroup}</th>
                    <th>{t.report.colPreScore}</th>
                    <th>{t.report.colPostScore}</th>
                    <th>{t.report.colDelta}</th>
                    <th>{t.report.colMatchConfidence}</th>
                  </tr>
                </thead>
                <tbody>
                  {pairedData.map((student, idx) => (
                    <tr key={idx}>
                      <td className="font-mono text-slate-400">{idx + 1}</td>
                      <td className="font-medium text-slate-800">{student.preName}</td>
                      <td>
                        <span className="bg-[#F1F5F9] text-[#002B49] px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-[#E2E8F0]">
                          {student.group}
                        </span>
                      </td>
                      <td className="font-semibold">{student.preScore} / 10</td>
                      <td className="font-semibold text-[#002B49]">{student.postScore} / 10</td>
                      <td className={`font-bold ${student.delta >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {student.delta >= 0 ? `+${student.delta}` : student.delta}
                      </td>
                      <td className="font-mono text-emerald-700 font-bold">
                        {(student.similarity * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Progressive Disclosure Toggle */}
        <div className="flex items-center justify-between border-t border-[#D0D7DE] pt-6 mb-6">
          <h3 className="font-serif font-bold text-lg text-[#002B49]">
            {t.report.detailedTable}
          </h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#002B49] hover:text-[#C0392B] transition"
          >
            <span>{showAdvanced ? t.report.hideAdvanced : t.report.showAdvanced}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Advanced Academic Table */}
        {showAdvanced && (
          <section className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs mb-8">
            <div className="mb-4">
              <h4 className="font-serif font-bold text-sm text-[#002B49] mb-1">
                {t.report.tableTitle}
              </h4>
              <p className="text-xs text-[#57606A]">
                {t.report.tableSub}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table-booktabs text-xs">
                <thead>
                  <tr>
                    <th>{t.report.tableHeaders.phase}</th>
                    <th>{t.report.tableHeaders.n}</th>
                    <th>{t.report.tableHeaders.mean}</th>
                    <th>{t.report.tableHeaders.variance}</th>
                    <th>{t.report.tableHeaders.stdDev}</th>
                    <th>{t.report.tableHeaders.median}</th>
                    <th>{t.report.tableHeaders.iqr}</th>
                    <th>{t.report.tableHeaders.skewness}</th>
                    <th>{t.report.tableHeaders.shapiro}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-medium text-[#002B49]">Pretest</td>
                    <td>{preMetrics.n}</td>
                    <td>{preMetrics.mean}</td>
                    <td>{preMetrics.variance}</td>
                    <td>{preMetrics.stdDev}</td>
                    <td>{preMetrics.median}</td>
                    <td>{preMetrics.iqr}</td>
                    <td>{preMetrics.skewness}</td>
                    <td className="font-mono text-[#C0392B] font-bold">{preMetrics.shapiroWilk.pValue}</td>
                  </tr>
                  <tr>
                    <td className="font-medium text-[#002B49]">Posttest</td>
                    <td>{postMetrics.n}</td>
                    <td>{postMetrics.mean}</td>
                    <td>{postMetrics.variance}</td>
                    <td>{postMetrics.stdDev}</td>
                    <td>{postMetrics.median}</td>
                    <td>{postMetrics.iqr}</td>
                    <td>{postMetrics.skewness}</td>
                    <td className="font-mono text-[#C0392B] font-bold">{postMetrics.shapiroWilk.pValue}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
