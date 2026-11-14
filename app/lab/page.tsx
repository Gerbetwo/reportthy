'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { JupyterExecutionResult } from '@/types/dataset';
import {
  Download,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Cpu,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

export default function LabPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    preClean,
    postClean,
    pairedData,
    quarantined,
    attritionAnalysis,
    jupyterResults,
    setJupyterResults
  } = useDatasetStats();

  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jupyterHubUrl = process.env.NEXT_PUBLIC_JUPYTERHUB_URL;
  const iframeSrc = jupyterHubUrl
    ? `${jupyterHubUrl}?path=quantum_hypothesis_verification.ipynb`
    : '/jupyterlite/notebooks/index.html?path=quantum_hypothesis_verification.ipynb';

  // 1. Sync active sanitized dataset bundle to server-side store
  useEffect(() => {
    if (preClean.length > 0 || postClean.length > 0) {
      fetch('/api/notebook/dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preClean,
          postClean,
          pairedData,
          quarantined,
          attritionAnalysis,
        }),
      }).catch((err) => console.warn('Failed to sync dataset to server:', err));
    }
  }, [preClean, postClean, pairedData, quarantined, attritionAnalysis]);

  // 2. Real-time postMessage listener from embedded Jupyter iframe (Pyodide / JupyterLite)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === 'REPORTTHY_JUPYTER_RESULTS' &&
        event.data.payload
      ) {
        const payload = event.data.payload as JupyterExecutionResult;
        setJupyterResults(payload);
        fetch('/api/notebook/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setJupyterResults]);

  // 3. Sync from JupyterHub / Server REST endpoint
  const handleSyncFromJupyterHub = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/notebook/results');
      if (res.ok) {
        const data = await res.json();
        if (data.results) {
          setJupyterResults(data.results);
        } else {
          alert(t.lab.noRemoteResults);
        }
      }
    } catch (err) {
      console.error('Failed to sync results:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Fallback parser: upload executed .ipynb file directly
  const handleUploadExecutedIpynb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        let foundResult: JupyterExecutionResult | null = null;

        // Search outputs of all cells for the JSON delimiter marker
        for (const cell of parsed.cells || []) {
          for (const out of cell.outputs || []) {
            const rawText =
              (Array.isArray(out.text) ? out.text.join('') : out.text) ||
              (out.data && out.data['text/plain']
                ? Array.isArray(out.data['text/plain'])
                  ? out.data['text/plain'].join('')
                  : out.data['text/plain']
                : '');

            if (typeof rawText === 'string') {
              const startMarker = '__REPORTTHY_JSON_START__';
              const endMarker = '__REPORTTHY_JSON_END__';
              const sIdx = rawText.indexOf(startMarker);
              const eIdx = rawText.indexOf(endMarker);

              if (sIdx !== -1 && eIdx !== -1) {
                const jsonText = rawText.slice(sIdx + startMarker.length, eIdx).trim();
                foundResult = JSON.parse(jsonText);
                break;
              }
            }
          }
          if (foundResult) break;
        }

        if (foundResult) {
          setJupyterResults(foundResult);
          fetch('/api/notebook/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(foundResult),
          }).catch(() => {});
        } else {
          alert(t.lab.noResultsInIpynb);
        }
      } catch (err) {
        console.error('Failed to parse executed notebook:', err);
        alert('Invalid JSON structure in .ipynb');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadNotebook = () => {
    window.open('/api/notebook/ipynb?download=true', '_blank');
  };

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 pb-20 pt-6">
        <header className="border-b border-[#D0D7DE] pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-bold">
                {t.lab.badge}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-[#57606A] font-mono">{t.lab.subtitle}</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#002B49] mt-1 tracking-tight">
              {t.lab.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleDownloadNotebook}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.lab.downloadIpynb}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{t.lab.uploadExecuted}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".ipynb,application/json"
              className="hidden"
              onChange={handleUploadExecutedIpynb}
            />

            <button
              onClick={handleSyncFromJupyterHub}
              disabled={isSyncing}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? t.lab.syncing : t.lab.syncHub}</span>
            </button>

            {jupyterResults && (
              <button
                onClick={() => router.push('/paper')}
                className="bg-[#C0392B] hover:bg-[#A93226] text-white px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.lab.generatePaper}</span>
              </button>
            )}
          </div>
        </header>

        {/* Real Jupyter Kernel Status / Verified Execution Badge */}
        {jupyterResults ? (
          <section className="mb-6 bg-white border border-[#D0D7DE] rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {t.lab.verifiedBadge}
                </span>
                <span className="text-xs text-[#57606A] font-mono flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  {jupyterResults.kernelInfo}
                </span>
              </div>
              <div className="text-[11px] text-[#57606A] font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{t.lab.executedAt}: {new Date(jupyterResults.executedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E2E8F0]">
                <div className="text-[11px] font-mono text-[#57606A] uppercase">{t.lab.wilcoxonW}</div>
                <div className="text-base font-bold font-mono text-[#002B49] mt-0.5">
                  {jupyterResults.wilcoxon.statisticValue.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#57606A] font-mono">
                  Z = {jupyterResults.wilcoxon.zValue.toFixed(3)}
                </div>
              </div>

              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E2E8F0]">
                <div className="text-[11px] font-mono text-[#57606A] uppercase">{t.lab.wilcoxonP}</div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {jupyterResults.wilcoxon.pValue < 0.001
                    ? '< 0.001'
                    : jupyterResults.wilcoxon.pValue.toFixed(4)}
                </div>
                <div className="text-[10px] text-[#57606A] font-mono">
                  {t.lab.alpha}: {jupyterResults.alpha}
                </div>
              </div>

              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E2E8F0]">
                <div className="text-[11px] font-mono text-[#57606A] uppercase">{t.lab.mannWhitneyU}</div>
                <div className="text-base font-bold font-mono text-[#002B49] mt-0.5">
                  {jupyterResults.mannWhitney.statisticValue.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#57606A] font-mono">
                  p = {jupyterResults.mannWhitney.pValue.toFixed(4)}
                </div>
              </div>

              <div className="bg-[#F8F9FA] p-3 rounded border border-[#E2E8F0]">
                <div className="text-[11px] font-mono text-[#57606A] uppercase">{t.lab.effectSize}</div>
                <div className="text-base font-bold font-mono text-[#002B49] mt-0.5">
                  {jupyterResults.wilcoxon.effectSize.toFixed(3)}
                </div>
                <div className="text-[10px] text-[#57606A] font-mono">
                  r = |Z| / √N
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {jupyterResults.hypothesisConfirmed ? (
                <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-300 p-2.5 rounded font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{t.lab.validatedMsg}</span>
                </div>
              ) : (
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-300 p-2.5 rounded font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t.lab.rejectedMsg}</span>
                </div>
              )}

              <button
                onClick={() => router.push('/paper')}
                className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs self-end sm:self-auto"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.lab.generatePaper}</span>
              </button>
            </div>
          </section>
        ) : (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{t.lab.pendingVerification}</span>
            </div>
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 shrink-0"
            >
              <span>{t.lab.openInNewTab}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Embedded Interactive Jupyter Environment */}
        <div className="bg-[#001A2C] border border-slate-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#002B49] px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{jupyterHubUrl ? 'Connected: JupyterHub Environment' : 'Self-Hosted: JupyterLite Pyodide Kernel'}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              quantum_hypothesis_verification.ipynb
            </span>
          </div>

          <iframe
            src={iframeSrc}
            title="Interactive Jupyter Lab Workstation"
            className="w-full h-[680px] border-none bg-[#001320]"
          />
        </div>
      </main>
    </div>
  );
}
