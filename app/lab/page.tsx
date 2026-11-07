'use client';
import { useState } from 'react';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { generateIpynbJson } from '@/lib/statsEngine';
import { Download, Play, Terminal, CheckCircle2, RotateCcw } from 'lucide-react';

export default function LabPage() {
  const { t } = useTranslation();
  const {
    preClean,
    postClean,
    pairedData,
    preScores,
    postScores,
    wilcoxon,
    mannWhitney
  } = useDatasetStats();

  const [isRunning, setIsRunning] = useState(false);
  const [executed, setExecuted] = useState(false);

  const g1Deltas = pairedData.filter(p => p.group === 'Listado 1').map(p => p.delta);
  const g2Deltas = pairedData.filter(p => p.group === 'Listado 2').map(p => p.delta);

  const notebookCode = `# ===============================================================
# Automated Non-Parametric Hypothesis Verification
# Quantum Computing Educational Intervention Analysis
# ===============================================================

import pandas as pd
import scipy.stats as stats

# 1. Longitudinal Paired Test (Wilcoxon Signed-Rank)
# H0: The educational intervention produces no knowledge gain
# H1: The intervention produces a significant positive knowledge shift
pre_scores = ${JSON.stringify(preScores.length > 0 ? preScores.slice(0, 10) : Array(29).fill(1.925))}
post_scores = ${JSON.stringify(postScores.length > 0 ? postScores.slice(0, 10) : Array(29).fill(8.323))}

stat_w, p_val_w = stats.wilcoxon(post_scores, pre_scores, alternative='greater')
print(f"Wilcoxon W Statistic : {stat_w:.4f}")
print(f"Wilcoxon p-value     : {p_val_w:.4e}")

# 2. Between-Group Comparison (Mann-Whitney U)
# Comparing Listado 1 vs Listado 2 score gains
g1_deltas = ${JSON.stringify(g1Deltas.length > 0 ? g1Deltas : [7, 8, 6])}
g2_deltas = ${JSON.stringify(g2Deltas.length > 0 ? g2Deltas : [5, 6, 7])}

stat_u, p_val_u = stats.mannwhitneyu(g1_deltas, g2_deltas, alternative='two-sided')
print(f"Mann-Whitney U Stat  : {stat_u:.4f}")
print(f"Mann-Whitney p-value : {p_val_u:.4e}")`;

  const handleRunCell = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setExecuted(true);
    }, 600);
  };

  const handleDownloadNotebook = () => {
    const notebookJsonStr = generateIpynbJson(pairedData, preClean, postClean);
    const blob = new Blob([notebookJsonStr], { type: 'application/x-ipynb+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quantum_hypothesis_verification.ipynb';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-5xl mx-auto px-6 pb-20 pt-6">
        <header className="border-b border-[#D0D7DE] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded font-bold">
                {t.lab.badge}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-[#57606A] font-mono">{t.lab.subtitle}</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#002B49] mt-1 tracking-tight">
              {t.lab.title}
            </h1>
          </div>
          <button
            onClick={handleDownloadNotebook}
            className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.lab.downloadIpynb}</span>
          </button>
        </header>

        {/* Jupyter Workstation Window */}
        <div className="bg-[#001A2C] border border-slate-700 rounded-lg overflow-hidden shadow-md mb-8">
          <div className="bg-[#002B49] px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>{t.lab.terminalIn}</span>
            </div>
            <div className="flex items-center gap-2">
              {executed && (
                <button
                  onClick={() => setExecuted(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 font-mono flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> {t.lab.reset}
                </button>
              )}
              <button
                onClick={handleRunCell}
                disabled={isRunning}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1 rounded flex items-center gap-1.5 font-mono font-semibold transition"
              >
                <Play className="w-3 h-3 fill-white" />
                {isRunning ? t.lab.executing : t.lab.runCell}
              </button>
            </div>
          </div>

          <pre className="p-5 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed bg-[#001320]">
            {notebookCode}
          </pre>

          {executed && (
            <div className="bg-black/75 p-5 border-t border-slate-800 font-mono text-xs text-slate-200">
              <div className="text-slate-500 mb-1">{t.lab.outputLabel}</div>
              <div className="text-emerald-400">Wilcoxon W Statistic : {wilcoxon.statisticValue.toFixed(4)}</div>
              <div className="text-emerald-400">Wilcoxon p-value     : {wilcoxon.pValue.toExponential(4)}</div>
              <div className="text-cyan-300 mt-2">Mann-Whitney U Stat  : {mannWhitney.statisticValue.toFixed(4)}</div>
              <div className="text-cyan-300">Mann-Whitney p-value : {mannWhitney.pValue.toFixed(4)}</div>
              <div className="mt-3 text-emerald-300 font-bold flex items-center gap-2 bg-emerald-950/60 border border-emerald-800 p-2.5 rounded">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.lab.validatedMsg}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
