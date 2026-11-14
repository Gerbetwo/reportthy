'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { EditorView, keymap } from '@codemirror/view';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import { useDatasetStats } from '@/lib/useDatasetStats';
import { generateFullPaperLatex } from '@/lib/paperLatexTemplate';
import {
  Download,
  Copy,
  Check,
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
  Code2,
  RefreshCw,
  Bold,
  Italic,
  Binary,
  Percent,
  Terminal,
  Columns,
  SquareCode,
  FileCheck,
  CornerDownRight,
  RotateCcw
} from 'lucide-react';

interface CompileErrorState {
  error: string;
  details: string;
  line: number | null;
  rawLog: string;
}

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
  const [compileTimeMs, setCompileTimeMs] = useState<number | null>(null);
  const [compileError, setCompileError] = useState<CompileErrorState | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [lastCompiledTex, setLastCompiledTex] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Workbench layout state
  const [activeView, setActiveView] = useState<'split' | 'editor' | 'preview'>('split');
  const [splitWidth, setSplitWidth] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const initialMountedRef = useRef(false);

  // Initial LaTeX generation
  const defaultLatex = useMemo(() => {
    if (!jupyterResults) return '';
    return generateFullPaperLatex(
      jupyterResults,
      pairedData,
      lang,
      attritionAnalysis,
      quarantined
    );
  }, [jupyterResults, pairedData, lang, attritionAnalysis, quarantined]);

  const [latexSource, setLatexSource] = useState<string>(defaultLatex);
  const latexSourceRef = useRef(latexSource);
  latexSourceRef.current = latexSource;

  // Sync latexSource with generated template when not dirty
  useEffect(() => {
    if (!isDirty && defaultLatex) {
      setLatexSource(defaultLatex);
    }
  }, [defaultLatex, isDirty]);

  // Handle PDF compilation
  const handleCompile = useCallback(async (customSource?: string) => {
    const source = customSource ?? latexSourceRef.current;
    if (!source || !source.trim()) return;

    setIsCompiling(true);
    setCompileError(null);

    try {
      const response = await fetch('/api/compile-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexContent: source }),
      });

      const compileTime = response.headers.get('x-compile-time-ms');
      if (compileTime) {
        setCompileTimeMs(parseInt(compileTime, 10));
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errPayload: CompileErrorState = {
          error: errData.error || 'LaTeX typesetting failure.',
          details: errData.details || 'Compilation failed.',
          line: typeof errData.line === 'number' ? errData.line : null,
          rawLog: errData.rawLog || '',
        };
        setCompileError(errPayload);
        setShowLogs(true);
        return;
      }

      const blob = await response.blob();
      const newUrl = URL.createObjectURL(blob);
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
      pdfUrlRef.current = newUrl;
      setPdfUrl(newUrl);
      setLastCompiledTex(source);
      setCompileError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCompileError({
        error: 'Network / Client Error',
        details: msg,
        line: null,
        rawLog: '',
      });
      setShowLogs(true);
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // Auto-compile once on mount if valid results exist
  useEffect(() => {
    if (!initialMountedRef.current && defaultLatex) {
      initialMountedRef.current = true;
      handleCompile(defaultLatex);
    }
  }, [defaultLatex, handleCompile]);

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Split pane mouse drag listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const pct = (offsetX / rect.width) * 100;
      setSplitWidth(Math.min(Math.max(25, pct), 75));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Intercept Ctrl+S / Cmd+S in CodeMirror
  const compileKeymap = useMemo(
    () =>
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            handleCompile();
            return true;
          },
        },
      ]),
    [handleCompile]
  );

  const cmExtensions = useMemo(
    () => [StreamLanguage.define(stex), EditorView.lineWrapping, compileKeymap],
    [compileKeymap]
  );

  // Editor formatting helpers
  const applyWrap = (prefix: string, suffix: string) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: `${prefix}${selected}${suffix}` },
      selection: { anchor: from + prefix.length, head: to + prefix.length },
    });
    view.focus();
  };

  const toggleComment = () => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    if (line.text.startsWith('% ')) {
      view.dispatch({
        changes: { from: line.from, to: line.from + 2, insert: '' },
      });
    } else {
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: '% ' },
      });
    }
    view.focus();
  };

  const jumpToLine = (lineNumber: number) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const doc = view.state.doc;
    const targetLine = Math.min(Math.max(1, lineNumber), doc.lines);
    const lineInfo = doc.line(targetLine);
    view.dispatch({
      selection: { anchor: lineInfo.from },
      scrollIntoView: true,
    });
    view.focus();
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetTemplate = () => {
    setLatexSource(defaultLatex);
    setIsDirty(false);
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'springer_nature_manuscript.pdf';
    a.click();
  };

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
  const hasUncompiledEdits = lastCompiledTex !== null && latexSource !== lastCompiledTex;

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328]">
      <HeaderNav />
      <main className="max-w-[1600px] w-full mx-auto px-6 pb-20 pt-6">
        {/* Top Header */}
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

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCopyLatex}
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#002B49] px-3.5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title={t.paper.copyLatex}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.paper.copied : t.paper.copyLatex}</span>
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

        {/* Dual-Pane LaTeX Workbench */}
        <section className="bg-white border border-[#D0D7DE] rounded-xl overflow-hidden shadow-md">
          {/* Top Workbench Control Bar */}
          <div className="bg-[#002B49] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-serif font-bold tracking-wide">
                {t.paper.workbenchTitle}
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-[11px] font-mono text-slate-300">sn-jnl.cls</span>
            </div>

            {/* View Mode Segmented Controls */}
            <div className="flex items-center bg-[#001A2C] border border-slate-700 rounded-md p-0.5 text-xs font-medium">
              <button
                onClick={() => setActiveView('split')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  activeView === 'split' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title={t.paper.splitView}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.paper.splitView}</span>
              </button>
              <button
                onClick={() => setActiveView('editor')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  activeView === 'editor' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title={t.paper.editorOnly}
              >
                <SquareCode className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.paper.editorOnly}</span>
              </button>
              <button
                onClick={() => setActiveView('preview')}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                  activeView === 'preview' ? 'bg-[#002B49] text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
                title={t.paper.pdfOnly}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.paper.pdfOnly}</span>
              </button>
            </div>
          </div>

          {/* Workbench Body Container */}
          <div
            ref={containerRef}
            className={`flex w-full h-[820px] overflow-hidden ${isDragging ? 'select-none' : ''}`}
          >
            {/* LEFT PANE: LaTeX CodeMirror Editor */}
            <div
              style={{
                width: activeView === 'split' ? `${splitWidth}%` : activeView === 'editor' ? '100%' : '0%',
                display: activeView === 'preview' ? 'none' : 'flex',
              }}
              className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#D0D7DE] overflow-hidden"
            >
              {/* Left Pane Toolbar */}
              <div className="h-11 min-h-[44px] bg-[#F8F9FA] border-b border-[#D0D7DE] px-3 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCompile()}
                    disabled={isCompiling}
                    className="bg-[#002B49] hover:bg-[#001A2C] text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
                    title={`${t.paper.recompilePdf} (${t.paper.recompileShortcut})`}
                  >
                    {isCompiling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{t.paper.recompilePdf}</span>
                    <kbd className="hidden md:inline text-[10px] bg-[#001A2C] text-slate-300 px-1 py-0.5 rounded font-mono">
                      {t.paper.recompileShortcut}
                    </kbd>
                  </button>

                  {/* Formatting Helpers */}
                  <div className="flex items-center border border-[#CBD5E1] rounded overflow-hidden bg-white">
                    <button
                      onClick={() => applyWrap('\\textbf{', '}')}
                      className="p-1.5 hover:bg-slate-100 text-[#002B49] transition border-r border-[#CBD5E1]"
                      title={t.paper.boldHelp}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => applyWrap('\\textit{', '}')}
                      className="p-1.5 hover:bg-slate-100 text-[#002B49] transition border-r border-[#CBD5E1]"
                      title={t.paper.italicHelp}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => applyWrap('$', '$')}
                      className="p-1.5 hover:bg-slate-100 text-[#002B49] transition border-r border-[#CBD5E1]"
                      title={t.paper.mathHelp}
                    >
                      <Binary className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={toggleComment}
                      className="p-1.5 hover:bg-slate-100 text-[#002B49] transition"
                      title={t.paper.commentHelp}
                    >
                      <Percent className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isDirty && (
                    <button
                      onClick={handleResetTemplate}
                      className="text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition"
                      title={t.paper.resetTemplate}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">{t.paper.resetTemplate}</span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyLatex}
                    className="p-1.5 text-slate-600 hover:text-slate-900 border border-[#CBD5E1] rounded bg-white hover:bg-slate-50 transition"
                    title={t.paper.copyLatex}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* CodeMirror LaTeX Editor Container */}
              <div className="flex-1 overflow-hidden relative">
                <CodeMirror
                  ref={editorRef}
                  value={latexSource}
                  height="100%"
                  className="h-full text-xs font-mono"
                  extensions={cmExtensions}
                  onChange={(val) => {
                    setLatexSource(val);
                    setIsDirty(true);
                  }}
                  theme="light"
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightSpecialChars: true,
                    foldGutter: true,
                    dropCursor: true,
                    allowMultipleSelections: true,
                    indentOnInput: true,
                    bracketMatching: true,
                    closeBrackets: true,
                    autocompletion: true,
                    rectangularSelection: true,
                    crosshairCursor: true,
                    highlightActiveLine: true,
                    highlightSelectionMatches: true,
                    closeBracketsKeymap: true,
                    searchKeymap: true,
                    foldKeymap: true,
                    completionKeymap: true,
                    lintKeymap: true,
                  }}
                />
              </div>
            </div>

            {/* RESIZABLE SPLIT DIVIDER */}
            {activeView === 'split' && (
              <div
                onMouseDown={handleMouseDown}
                className="w-1.5 hover:w-2 bg-[#D0D7DE] hover:bg-[#002B49] cursor-col-resize transition-all duration-100 flex items-center justify-center shrink-0 group relative z-10"
                title="Drag to resize panels"
              >
                <div className="w-0.5 h-8 bg-slate-400 group-hover:bg-white rounded-full" />
              </div>
            )}

            {/* RIGHT PANE: Live PDF Preview & Compiler Output */}
            <div
              style={{
                width: activeView === 'split' ? `${100 - splitWidth}%` : activeView === 'preview' ? '100%' : '0%',
                display: activeView === 'editor' ? 'none' : 'flex',
              }}
              className="flex flex-col h-full bg-slate-50 overflow-hidden relative"
            >
              {/* Right Pane Toolbar */}
              <div className="h-11 min-h-[44px] bg-[#F8F9FA] border-b border-[#D0D7DE] px-3 flex items-center justify-between gap-2 overflow-x-auto">
                <div className="flex items-center gap-2">
                  {/* Compilation Status Badges */}
                  {isCompiling ? (
                    <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                      <span>{t.paper.compilingStatus}</span>
                    </span>
                  ) : compileError ? (
                    <button
                      onClick={() => setShowLogs(true)}
                      className="text-[11px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1.5 hover:bg-rose-100 transition"
                    >
                      <XCircle className="w-3 h-3 text-rose-600" />
                      <span>{t.paper.compileFailed}</span>
                      {compileError.line && (
                        <span className="bg-rose-200 px-1 rounded text-[10px]">
                          {t.paper.line} {compileError.line}
                        </span>
                      )}
                    </button>
                  ) : hasUncompiledEdits ? (
                    <span className="text-[11px] font-mono font-medium bg-amber-50 text-amber-900 border border-dashed border-amber-400 px-2 py-0.5 rounded flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>{t.paper.uncompiledChanges}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>
                        {t.paper.compiledSuccess}
                        {compileTimeMs ? ` (${compileTimeMs}ms)` : ''}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Compiler Logs Toggle Button */}
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition ${
                      showLogs
                        ? 'bg-slate-800 text-white border-slate-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-[#CBD5E1]'
                    }`}
                    title={showLogs ? t.paper.hideLogs : t.paper.viewLogs}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {showLogs ? t.paper.hideLogs : t.paper.viewLogs}
                    </span>
                  </button>

                  {/* Prominent Download Compiled PDF Button */}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={!pdfUrl || isCompiling}
                    className="bg-[#002B49] hover:bg-[#001A2C] text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-40"
                    title={t.paper.downloadPdfBtn}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.paper.downloadPdfBtn}</span>
                  </button>
                </div>
              </div>

              {/* PDF Preview Surface */}
              <div className="flex-1 relative overflow-hidden bg-slate-200">
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
                    title={t.paper.pdfPreviewTitle}
                    className={`w-full h-full border-0 bg-white ${isDragging ? 'pointer-events-none' : ''}`}
                  />
                ) : isCompiling ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-white">
                    <Loader2 className="w-8 h-8 animate-spin text-[#002B49] mb-3" />
                    <p className="text-sm font-semibold text-[#002B49]">{t.paper.compilingPdf}</p>
                    <p className="text-xs text-slate-400 mt-1 font-mono">Running pdflatex typesetting passes...</p>
                  </div>
                ) : compileError ? (
                  <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-white overflow-y-auto">
                    <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
                      <AlertOctagon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-rose-900 font-serif">
                      {t.paper.compileErrorTitle}
                    </h3>
                    <p className="text-xs text-rose-700 mt-1 max-w-md font-mono whitespace-pre-wrap">
                      {compileError.details}
                    </p>
                    {compileError.line && (
                      <button
                        onClick={() => jumpToLine(compileError.line!)}
                        className="mt-4 bg-rose-100 hover:bg-rose-200 text-rose-900 font-mono text-xs px-3 py-1.5 rounded border border-rose-300 flex items-center gap-1.5 transition"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>
                          {t.paper.jumpToLine} {compileError.line}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white">
                    <FileText className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-xs font-mono">{t.paper.noPdfAvailable}</p>
                  </div>
                )}
              </div>

              {/* Collapsible Compiler Log Drawer */}
              {showLogs && (
                <div className="h-[280px] bg-slate-950 border-t border-slate-800 text-slate-200 flex flex-col shrink-0 animate-in slide-in-from-bottom duration-200">
                  <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-semibold text-slate-200">{t.paper.viewLogs}</span>
                      {compileError?.line && (
                        <button
                          onClick={() => jumpToLine(compileError.line!)}
                          className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>
                            {t.paper.jumpToLine} {compileError.line}
                          </span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowLogs(false)}
                      className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
                    >
                      &times;
                    </button>
                  </div>

                  {compileError && (
                    <div className="px-4 py-2 bg-rose-950/70 border-b border-rose-900/50 text-[11px] font-mono text-rose-200 flex items-start gap-2">
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-rose-300">{compileError.error}</span>
                        <p className="text-rose-200/90 mt-0.5 whitespace-pre-wrap">{compileError.details}</p>
                      </div>
                    </div>
                  )}

                  <pre className="p-4 text-[11px] font-mono text-slate-300 leading-relaxed overflow-auto flex-1 select-text bg-slate-950">
                    {compileError?.rawLog || 'pdflatex compilation successful. No errors detected.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
