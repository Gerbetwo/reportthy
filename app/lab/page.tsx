'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { JupyterExecutionResult } from '@/types/dataset';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Cpu,
  ExternalLink,
  AlertTriangle,
  Server,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';

export default function LabPage() {
  const { lang, t } = useTranslation();
  const router = useRouter();
  const {
    sessionId,
    studyMetadata,
    preClean,
    postClean,
    pairedData,
    quarantined,
    attritionAnalysis,
    jupyterResults,
    setJupyterResults
  } = useDatasetStats();

  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isProvisioned, setIsProvisioned] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [fullLabUrl, setFullLabUrl] = useState<string | null>(null);
  const isProvisioningRef = useRef(false);
  const autoProvisionedSessionRef = useRef<string | null>(null);
  const resetGenerationRef = useRef(0);

  // Manual explicit sync results handler
  const handleSyncResults = async () => {
    if (isProvisioningRef.current) return;
    const syncGeneration = resetGenerationRef.current;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch(`/api/notebook/results?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { 'x-reportthy-session': sessionId },
      });
      if (isProvisioningRef.current || syncGeneration !== resetGenerationRef.current) return;
      let fallbackResults: JupyterExecutionResult | null = null;
      if (res.ok) {
        const data = await res.json();
        if (isProvisioningRef.current || syncGeneration !== resetGenerationRef.current) return;
        if (data.results) {
          if (
            Array.isArray(data.results.executedCodeCells) &&
            data.results.executedCodeCells.length > 0
          ) {
            setJupyterResults(data.results);
            setSyncFeedback(t.lab.syncSuccess);
            setTimeout(() => setSyncFeedback(null), 3000);
            return;
          }
          fallbackResults = data.results;
        }
      }
      const hubRes = await fetch(`/api/jupyterhub?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { 'x-reportthy-session': sessionId },
      });
      if (isProvisioningRef.current || syncGeneration !== resetGenerationRef.current) return;
      if (hubRes.ok) {
        const hubData = await hubRes.json();
        if (isProvisioningRef.current || syncGeneration !== resetGenerationRef.current) return;
        if (hubData.results) {
          setJupyterResults(hubData.results);
          setSyncFeedback(t.lab.syncSuccess);
          setTimeout(() => setSyncFeedback(null), 3000);
          return;
        }
      }
      if (fallbackResults) {
        setJupyterResults(fallbackResults);
        setSyncFeedback(t.lab.syncSuccess);
        setTimeout(() => setSyncFeedback(null), 3000);
        return;
      }
      setSyncFeedback(t.lab.syncPending);
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (err) {
      setSyncFeedback(String(err));
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Provision JupyterHub single-user server & push notebook workspace
  const provisionJupyterHub = useCallback(async (forceReset = false) => {
    if (forceReset) {
      resetGenerationRef.current += 1;
    }
    if (isProvisioningRef.current) return;
    isProvisioningRef.current = true;

    if (forceReset) {
      setJupyterResults(null);
      setIframeSrc(null);
    }
    setIsProvisioned(false);
    setIsProvisioning(true);
    setServerUnreachable(false);
    setConnectionError('');

    try {
      const res = await fetch(`/api/jupyterhub?sessionId=${encodeURIComponent(sessionId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reportthy-session': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          studyMetadata,
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
        setIframeKey((k) => k + 1);
        setIframeSrc(data.embedUrl);
        if (data.fullLabUrl) {
          setFullLabUrl(data.fullLabUrl);
        }
        setIsProvisioned(true);
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
      isProvisioningRef.current = false;
    }
  }, [sessionId, studyMetadata, preClean, postClean, pairedData, quarantined, attritionAnalysis, setJupyterResults]);

  useEffect(() => {
    setIsProvisioned(false);
    setIframeSrc(null);
  }, [sessionId]);

  useEffect(() => {
    if (autoProvisionedSessionRef.current === sessionId) return;
    if (preClean.length > 0 || postClean.length > 0) {
      autoProvisionedSessionRef.current = sessionId;
      provisionJupyterHub(false);
    }
  }, [provisionJupyterHub, preClean.length, postClean.length, sessionId]);

  // 2. Real-time polling loop gated on completed provisioning
  useEffect(() => {
    if (isProvisioning || !isProvisioned) return;

    let isMounted = true;
    const pollGeneration = resetGenerationRef.current;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/notebook/results?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: { 'x-reportthy-session': sessionId },
        });
        if (!isMounted || isProvisioningRef.current || pollGeneration !== resetGenerationRef.current) {
          return;
        }
        let polledFallbackResults: JupyterExecutionResult | null = null;
        if (res.ok) {
          const data = await res.json();
          if (!isMounted || isProvisioningRef.current || pollGeneration !== resetGenerationRef.current) {
            return;
          }
          if (data.results) {
            if (
              Array.isArray(data.results.executedCodeCells) &&
              data.results.executedCodeCells.length > 0
            ) {
              setJupyterResults(data.results);
              return;
            }
            polledFallbackResults = data.results;
          }
        }
        // Fallback to checking JupyterHub contents if notebook was saved or code cells need hydration
        const hubRes = await fetch(`/api/jupyterhub?sessionId=${encodeURIComponent(sessionId)}`, {
          headers: { 'x-reportthy-session': sessionId },
        });
        if (!isMounted || isProvisioningRef.current || pollGeneration !== resetGenerationRef.current) {
          return;
        }
        if (hubRes.ok) {
          const hubData = await hubRes.json();
          if (!isMounted || isProvisioningRef.current || pollGeneration !== resetGenerationRef.current) {
            return;
          }
          if (hubData.results) {
            setJupyterResults(hubData.results);
            return;
          }
        }
        if (polledFallbackResults) {
          setJupyterResults(polledFallbackResults);
        }
      } catch {
        // Silently ignore transient network errors during background polling
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isProvisioning, isProvisioned, setJupyterResults, sessionId]);

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
              title={t.lab.resetTitle}
            >
              <Server className={`w-3.5 h-3.5 ${isProvisioning ? 'animate-pulse text-amber-600' : 'text-[#002B49]'}`} />
              <span>{isProvisioning ? t.lab.pushing : t.lab.resetAndPush}</span>
            </button>

            {/* 2. Sync Execution Results */}
            <button
              onClick={handleSyncResults}
              disabled={isSyncing || isProvisioning}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title={t.lab.syncTitle}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-[#002B49]'}`} />
              <span>{isSyncing ? '...' : t.lab.syncResults}</span>
            </button>

            {/* 3. Open in New Tab */}
            {(fullLabUrl || iframeSrc) && (
              <a
                href={fullLabUrl || iframeSrc || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
                title={t.lab.openLabTitle}
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#002B49]" />
                <span>{t.lab.openInNewTab}</span>
              </a>
            )}

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

        {/* Sync Status Toast/Banner */}
        {syncFeedback && (
          <div className="mb-4 text-xs font-mono px-3.5 py-2.5 rounded-lg border bg-slate-900 text-slate-100 flex items-center justify-between shadow-xs">
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-white ml-3 text-base leading-none"
            >
              &times;
            </button>
          </div>
        )}

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
                  {t.lab.dockerHint}
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

        {/* Real Jupyter Kernel Status / Verified Execution Badge (Above Workstation) */}
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
                <span>{t.lab.executedAt}: {new Date(jupyterResults.executedAt).toLocaleString(lang === "es" ? "es-ES" : "en-US")}</span>
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
                className="bg-[#C0392B] hover:bg-[#A93226] text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs self-end sm:self-auto"
              >
                <FileText className="w-3.5 h-3.5" />
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

        {/* Embedded Real JupyterHub / JupyterLab Workstation */}
        <div className="bg-[#001A2C] border border-slate-700 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#002B49] px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className={`w-2 h-2 rounded-full ${iframeSrc ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
              <span>{t.lab.workstationTitle}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              reportthy_{sessionId}.ipynb
            </span>
          </div>

          {iframeSrc ? (
            <iframe
              key={iframeKey}
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
      </main>
    </div>
  );
}
