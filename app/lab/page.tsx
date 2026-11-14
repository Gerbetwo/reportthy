'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { JupyterExecutionResult } from '@/types/dataset';
import {
  Download,
  UploadCloud,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Cpu,
  ExternalLink,
  AlertTriangle,
  Server,
  ArrowUpRight
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

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [fullLabUrl, setFullLabUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const provisioningRef = useRef(false);

  // 1. Provision JupyterHub single-user server & push notebook workspace
  const provisionJupyterHub = useCallback(async (forceReset = false) => {
    setIsProvisioning(true);
    setServerUnreachable(false);
    setConnectionError('');

    try {
      const res = await fetch('/api/jupyterhub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preClean,
          postClean,
          pairedData,
          quarantined,
          attritionAnalysis,
          forceReset,
        }),
      });

      const data = await res.json();
      if (res.ok && data.embedUrl) {
        setIframeSrc(data.embedUrl);
        if (data.fullLabUrl) {
          setFullLabUrl(data.fullLabUrl);
        }
        setServerUnreachable(false);
      } else {
        setServerUnreachable(true);
        setConnectionError(data.error || 'Failed to connect to JupyterHub.');
      }
    } catch (err) {
      setServerUnreachable(true);
      setConnectionError(String(err));
    } finally {
      setIsProvisioning(false);
      provisioningRef.current = false;
    }
  }, [preClean, postClean, pairedData, quarantined, attritionAnalysis]);

  useEffect(() => {
    if (provisioningRef.current) return;
    if (preClean.length > 0 || postClean.length > 0) {
      provisioningRef.current = true;
      provisionJupyterHub(false);
    }
  }, [provisionJupyterHub, preClean.length, postClean.length]);

  // 2. Real-time polling loop to automatically detect Jupyter execution results
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/notebook/results');
        if (res.ok) {
          const data = await res.json();
          if (data.results && isMounted) {
            setJupyterResults(data.results);
            return;
          }
        }
        // Fallback to checking JupyterHub contents if notebook was saved
        const hubRes = await fetch('/api/jupyterhub');
        if (hubRes.ok) {
          const hubData = await hubRes.json();
          if (hubData.results && isMounted) {
            setJupyterResults(hubData.results);
          }
        }
      } catch {
        // Silently ignore transient network errors during background polling
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setJupyterResults]);

  // 3. Fallback parser: upload executed .ipynb file directly
  const handleUploadExecutedIpynb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        let foundResult: JupyterExecutionResult | null = null;
        const codeCells: string[] = [];

        for (const cell of parsed.cells || []) {
          if (cell.cell_type === 'code') {
            codeCells.push(Array.isArray(cell.source) ? cell.source.join('') : cell.source);
          }
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
          if (codeCells.length > 0) {
            foundResult.executedCodeCells = codeCells;
          }
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
      <main className="max-w-7xl mx-auto px-6 pb-20 pt-6">
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
            {/* 1. Reset & Push Dataset */}
            <button
              onClick={() => provisionJupyterHub(true)}
              disabled={isProvisioning}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title="Reset notebook and re-push active dataset into JupyterHub workspace"
            >
              <Server className={`w-3.5 h-3.5 ${isProvisioning ? 'animate-pulse text-amber-600' : 'text-[#002B49]'}`} />
              <span>{isProvisioning ? t.lab.pushing : t.lab.resetAndPush}</span>
            </button>

            {/* 2. Open in New Tab */}
            {(fullLabUrl || iframeSrc) && (
              <a
                href={fullLabUrl || iframeSrc || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
                title="Open full JupyterLab workspace with multi-tab terminal & editor in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#002B49]" />
                <span>{t.lab.openInNewTab}</span>
              </a>
            )}

            {/* 3. Compact Download / Upload .ipynb */}
            <div className="flex items-center border border-[#CBD5E1] rounded overflow-hidden bg-white">
              <button
                onClick={handleDownloadNotebook}
                className="hover:bg-slate-50 text-[#002B49] px-2.5 py-2 text-xs font-semibold flex items-center gap-1 transition border-r border-[#CBD5E1]"
                title={t.lab.downloadIpynb}
              >
                <Download className="w-3.5 h-3.5" />
                <span>.ipynb</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hover:bg-slate-50 text-[#002B49] px-2.5 py-2 text-xs font-semibold flex items-center gap-1 transition"
                title={t.lab.uploadExecuted}
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".ipynb,application/json"
              className="hidden"
              onChange={handleUploadExecutedIpynb}
            />

            {/* 4. Synthesize Springer Nature Paper */}
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

        {/* Diagnostic Banner if JupyterHub is Unreachable */}
        {serverUnreachable && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4 text-xs text-amber-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t.lab.serverUnreachable}</p>
                {connectionError && (
                  <p className="font-mono text-[11px] text-amber-700 mt-0.5">{connectionError}</p>
                )}
                <p className="text-[11px] text-amber-800 mt-1">
                  Run <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">docker compose up --build</code> to launch JupyterHub, or use the Download/Upload buttons above.
                </p>
              </div>
            </div>
            {(fullLabUrl || iframeSrc) && (
              <a
                href={fullLabUrl || iframeSrc || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber-900 hover:text-amber-950 inline-flex items-center gap-1 shrink-0 bg-white border border-amber-300 px-3 py-1.5 rounded"
              >
                <span>{t.lab.openInNewTab}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
        {/* Embedded Real JupyterHub / JupyterLab Workstation */}
        <div className="bg-[#001A2C] border border-slate-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#002B49] px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className={`w-2 h-2 rounded-full ${iframeSrc ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
              <span>JupyterHub / JupyterLab Scientific Workstation</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              quantum_hypothesis_verification.ipynb
            </span>
          </div>

          {iframeSrc ? (
            <iframe
              src={iframeSrc}
              title="JupyterHub Research Environment"
              className="w-full h-[760px] border-none bg-white"
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="w-full h-[760px] bg-slate-900 flex flex-col items-center justify-center text-slate-400">
              <Server className="w-10 h-10 animate-pulse text-amber-500 mb-3" />
              <p className="text-sm font-semibold text-slate-200">
                {isProvisioning ? t.lab.pushing : t.lab.provisioningMsg}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {t.lab.pendingVerification}
              </p>
            </div>
          )}
        </div>
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
          <div className="mb-6 bg-slate-50 border border-[#D0D7DE] rounded-lg p-4 text-xs text-[#57606A] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>{t.lab.pendingVerification}</span>
            </div>
            {(fullLabUrl || iframeSrc) && (
              <a
                href={fullLabUrl || iframeSrc || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#002B49] hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>{t.lab.openInNewTab}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
