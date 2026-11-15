'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import HeaderNav from '@/components/HeaderNav';
import StudyProtocolForm from '@/components/StudyProtocolForm';
import {
  parseSurveyCSV,
  detectCSVRole,
  extractUniqueGroups,
  inferDefaultCohortRole,
} from '@/lib/csvCleaner';
import { RawSurveyRow, CohortRole } from '@/types/dataset';
import { useTranslation } from '@/lib/LanguageContext';
import { useDataset } from '@/lib/DatasetContext';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Unlink,
  Users,
  RotateCcw,
  Sparkles,
  Search,
  X,
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    studyMetadata,
    updateCohortMapping,
    preClean,
    postClean,
    pairedData,
    quarantined,
    setDatasets,
    unlinkPair,
    reconcileCohorts,
    resetAll,
  } = useDataset();

  const [preFilename, setPreFilename] = useState('');
  const [postFilename, setPostFilename] = useState('');
  const [autoDetectMsg, setAutoDetectMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllPairs, setShowAllPairs] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Group and Cohort Role Detection
  const detectedGroups = useMemo(
    () => extractUniqueGroups(preClean, postClean),
    [preClean, postClean]
  );

  const groupParticipantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    [...preClean, ...postClean].forEach((p) => {
      const g = (p.group || '').trim();
      if (g) {
        counts[g] = (counts[g] || 0) + 1;
      }
    });
    return counts;
  }, [preClean, postClean]);

  const cohortRoleCounts = useMemo(() => {
    let control = 0;
    let experimental = 0;
    [...preClean, ...postClean].forEach((p) => {
      if (p.cohortRole === 'Control') control++;
      else if (p.cohortRole === 'Experimental') experimental++;
    });
    return { control, experimental };
  }, [preClean, postClean]);

  const isBetweenOrCombined =
    studyMetadata.designMode === 'between_group' ||
    studyMetadata.designMode === 'combined';

  const missingCohortWarning =
    isBetweenOrCombined &&
    detectedGroups.length > 0 &&
    (cohortRoleCounts.control === 0 || cohortRoleCounts.experimental === 0);

  // Auto-infer missing cohort roles for detected groups when not yet mapped
  useEffect(() => {
    if (preClean.length > 0 || postClean.length > 0) {
      const groups = extractUniqueGroups(preClean, postClean);
      const currentMapping = studyMetadata.cohortMapping || {};
      let hasChanges = false;
      const updatedMapping: Record<string, CohortRole> = { ...currentMapping };

      for (const group of groups) {
        if (updatedMapping[group] === undefined) {
          const inferred = inferDefaultCohortRole(group, groups);
          if (inferred !== 'Unassigned') {
            updatedMapping[group] = inferred;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        updateCohortMapping(updatedMapping);
      }
    }
  }, [preClean, postClean, studyMetadata.cohortMapping, updateCohortMapping]);

  const processCSVFile = (file: File, explicitRole?: 'pre' | 'post') => {
    Papa.parse<RawSurveyRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const detectedRole = explicitRole || detectCSVRole(headers);
        const role =
          detectedRole === 'unknown' ? explicitRole || 'pre' : detectedRole;

        if (role === 'pre') setPreFilename(file.name);
        else setPostFilename(file.name);

        if (!explicitRole && detectedRole !== 'unknown') {
          setAutoDetectMsg(t.upload.autoDetectSuccess);
        }

        const { clean, quarantined: badRows } = parseSurveyCSV(
          results.data,
          role,
          studyMetadata.cohortMapping
        );
        if (role === 'pre') {
          setDatasets({
            preClean: clean,
            quarantined: [
              ...quarantined.filter((p) => !p.id.startsWith(role)),
              ...badRows,
            ],
          });
        } else {
          setDatasets({
            postClean: clean,
            quarantined: [
              ...quarantined.filter((p) => !p.id.startsWith(role)),
              ...badRows,
            ],
          });
        }
      },
    });
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    role?: 'pre' | 'post'
  ) => {
    const file = e.target.files?.[0];
    if (file) processCSVFile(file, role);
  };

  const handleClearPre = () => {
    setDatasets({
      preClean: [],
      quarantined: quarantined.filter((q) => !q.id.startsWith('pre')),
    });
    setPreFilename('');
  };

  const handleClearPost = () => {
    setDatasets({
      postClean: [],
      quarantined: quarantined.filter((q) => !q.id.startsWith('post')),
    });
    setPostFilename('');
  };

  const handleLoadSampleDataset = () => {
    const samplePreRows: RawSurveyRow[] = [
      { "Nombre y apellido": "Alexander Yama", "Score": "3 / 10", "Listado": "Listado 1", "Timestamp": "2026-11-10 09:00" },
      { "Nombre y apellido": "Darwin Meneses", "Score": "2 / 10", "Listado": "Listado 2", "Timestamp": "2026-11-10 09:05" },
      { "Nombre y apellido": "Camila Hernandez", "Score": "4.5 / 10", "Listado": "Listado 2", "Timestamp": "2026-11-10 09:10" },
      { "Nombre y apellido": "Mateo Gutierrez", "Score": "3 / 10", "Listado": "Listado 1", "Timestamp": "2026-11-10 09:15" },
      { "Nombre y apellido": "Valentina Rios", "Score": "5 / 10", "Listado": "Listado 2", "Timestamp": "2026-11-10 09:20" },
      { "Nombre y apellido": "Santiago Morales", "Score": "2.5 / 10", "Listado": "Listado 1", "Timestamp": "2026-11-10 09:25" },
      { "Nombre y apellido": "Lucia Fernandez", "Score": "4 / 10", "Listado": "Listado 1", "Timestamp": "2026-11-10 09:30" },
      { "Nombre y apellido": "Diego Castillo", "Score": "3.5 / 10", "Listado": "Listado 2", "Timestamp": "2026-11-10 09:35" },
    ];
    const samplePostRows: RawSurveyRow[] = [
      { "Nombre y apellido": "Alexander Yama", "Puntuación": "8.5 / 10", "Listado": "Listado 1", "Marca temporal": "2026-11-14 10:00" },
      { "Nombre y apellido": "Darwin Meneses", "Puntuación": "10 / 10", "Listado": "Listado 2", "Marca temporal": "2026-11-14 10:05" },
      { "Nombre y apellido": "Camila Hernandez", "Puntuación": "9.5 / 10", "Listado": "Listado 2", "Marca temporal": "2026-11-14 10:10" },
      { "Nombre y apellido": "Mateo Gutierrez", "Puntuación": "7 / 10", "Listado": "Listado 1", "Marca temporal": "2026-11-14 10:15" },
      { "Nombre y apellido": "Valentina Rios", "Puntuación": "9 / 10", "Listado": "Listado 2", "Marca temporal": "2026-11-14 10:20" },
      { "Nombre y apellido": "Santiago Morales", "Puntuación": "6.5 / 10", "Listado": "Listado 1", "Marca temporal": "2026-11-14 10:25" },
      { "Nombre y apellido": "Lucia Fernandez", "Puntuación": "8 / 10", "Listado": "Listado 1", "Marca temporal": "2026-11-14 10:30" },
      { "Nombre y apellido": "Diego Castillo", "Puntuación": "9.5 / 10", "Listado": "Listado 2", "Marca temporal": "2026-11-14 10:35" },
    ];

    const mapping: Record<string, CohortRole> = {
      'Listado 1': 'Control',
      'Listado 2': 'Experimental',
    };
    updateCohortMapping(mapping);

    const { clean: preCleaned, quarantined: preQuar } = parseSurveyCSV(samplePreRows, 'pre', mapping);
    const { clean: postCleaned, quarantined: postQuar } = parseSurveyCSV(samplePostRows, 'post', mapping);

    setPreFilename('sample_pretest.csv');
    setPostFilename('sample_posttest.csv');
    setDatasets({
      preClean: preCleaned,
      postClean: postCleaned,
      quarantined: [...preQuar, ...postQuar],
    });
  };

  const handleResetWorkspace = () => {
    if (typeof window !== 'undefined' && window.confirm(t.upload.resetConfirm)) {
      resetAll();
      setPreFilename('');
      setPostFilename('');
      setAutoDetectMsg('');
      setFilterQuery('');
    }
  };

  const handleReconcile = () => {
    setIsProcessing(true);
    reconcileCohorts();
    setIsProcessing(false);
  };

  // Pipeline readiness calculations
  const isSurveysReady = preClean.length > 0 && postClean.length > 0;
  const isSurveysPartial =
    (preClean.length > 0 && postClean.length === 0) ||
    (preClean.length === 0 && postClean.length > 0);
  const isProtocolReady = Boolean(
    studyMetadata.studyTitle?.trim() &&
    studyMetadata.hypothesisStatement?.trim() &&
    studyMetadata.authors?.[0]?.fullName?.trim() &&
    (!isBetweenOrCombined ||
      (studyMetadata.controlPedagogy?.trim() &&
        studyMetadata.experimentalPedagogy?.trim()))
  );
  const isLabReady = isSurveysReady && !missingCohortWarning;

  // Filter pairs
  const filteredPairs = useMemo(() => {
    const indexed = pairedData.map((pair, originalIndex) => ({
      pair,
      originalIndex,
    }));
    if (!filterQuery.trim()) return indexed;
    const q = filterQuery.toLowerCase();
    return indexed.filter(
      ({ pair: p }) =>
        p.preName.toLowerCase().includes(q) ||
        p.postName.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        p.cohortRole.toLowerCase().includes(q)
    );
  }, [pairedData, filterQuery]);

  const visiblePairs = showAllPairs ? filteredPairs : filteredPairs.slice(0, 15);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <HeaderNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Top Header & Reset Action */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D0D7DE] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-[#57606A] uppercase tracking-wide">
                {t.upload.phase}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[11px] font-mono text-[#57606A]">
                {t.upload.ingestionSuite}
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl text-[#002B49]">
              {t.upload.title}
            </h1>
            <p className="text-xs text-[#57606A] mt-0.5 max-w-2xl">
              {t.upload.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleDataset}
              className="bg-white hover:bg-slate-50 text-[#002B49] border border-[#CBD5E1] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t.upload.loadSample}</span>
            </button>
            <button
              type="button"
              onClick={handleResetWorkspace}
              className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              title={t.upload.resetWorkspace}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.upload.resetWorkspace}</span>
            </button>
          </div>
        </header>

        {/* 3-Step Pipeline Readiness Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 font-mono text-xs">
          <div
            className={`border rounded-lg p-3 flex items-center justify-between transition ${
              isSurveysReady
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                : isSurveysPartial
                ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                : 'bg-white border-[#D0D7DE] text-slate-600'
            }`}
          >
            <span className="font-semibold">{t.upload.pipelineSurveys}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isSurveysReady
                  ? 'bg-emerald-200 border-emerald-300 text-emerald-950'
                  : isSurveysPartial
                  ? 'bg-amber-200 border-amber-300 text-amber-950'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {isSurveysReady
                ? `N=${preClean.length}/${postClean.length}`
                : isSurveysPartial
                ? t.upload.statusPending
                : t.upload.statusPending}
            </span>
          </div>

          <div
            className={`border rounded-lg p-3 flex items-center justify-between transition ${
              isProtocolReady
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                : 'bg-white border-[#D0D7DE] text-slate-600'
            }`}
          >
            <span className="font-semibold">{t.upload.pipelineProtocol}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isProtocolReady
                  ? 'bg-emerald-200 border-emerald-300 text-emerald-950'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {isProtocolReady ? t.upload.statusReady : t.upload.statusOptional}
            </span>
          </div>

          <div
            className={`border rounded-lg p-3 flex items-center justify-between transition ${
              isLabReady
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                : 'bg-white border-[#D0D7DE] text-slate-600'
            }`}
          >
            <span className="font-semibold">{t.upload.pipelineLab}</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isLabReady
                  ? 'bg-emerald-200 border-emerald-300 text-emerald-950'
                  : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {isLabReady ? t.upload.statusReady : t.upload.statusPending}
            </span>
          </div>
        </div>

        {autoDetectMsg && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 mb-6 text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{autoDetectMsg}</span>
          </div>
        )}

        {/* PRIMARY ACTION FIRST: 2-Column Pretest & Posttest CSV Dropzones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pretest Dropzone */}
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-xs font-mono">
                    1
                  </span>
                  {t.upload.pretest}
                </h2>
                {preClean.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> N = {preClean.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPre}
                      className="text-slate-400 hover:text-rose-600 text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 transition"
                      title={t.upload.clear}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-[#57606A] mb-3 font-mono">
                {t.upload.fingerprintPre}
              </p>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] hover:border-[#002B49] rounded-lg p-5 cursor-pointer bg-[#F8F9FA] hover:bg-white transition group">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-[#002B49] mb-1.5 transition-colors" />
              <span className="text-xs font-medium text-slate-700 font-mono text-center truncate w-full">
                {preFilename || t.upload.dropPre}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'pre')}
              />
            </label>
          </div>

          {/* Posttest Dropzone */}
          <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-xs font-mono">
                    2
                  </span>
                  {t.upload.posttest}
                </h2>
                {postClean.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> N = {postClean.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearPost}
                      className="text-slate-400 hover:text-rose-600 text-xs px-1.5 py-0.5 rounded hover:bg-slate-100 transition"
                      title={t.upload.clear}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-[#57606A] mb-3 font-mono">
                {t.upload.fingerprintPost}
              </p>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] hover:border-[#002B49] rounded-lg p-5 cursor-pointer bg-[#F8F9FA] hover:bg-white transition group">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-[#002B49] mb-1.5 transition-colors" />
              <span className="text-xs font-medium text-slate-700 font-mono text-center truncate w-full">
                {postFilename || t.upload.dropPost}
              </span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'post')}
              />
            </label>
          </div>
        </div>

        {/* Quarantine Callout */}
        {quarantined.length > 0 && (
          <section className="bg-amber-50 border border-amber-300 rounded-lg p-5 mb-8 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif font-bold text-sm text-amber-900">
                    {quarantined.length} {t.upload.quarantineTitle}
                  </h3>
                  <span className="text-[11px] font-mono bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-bold border border-amber-300">
                    {t.upload.quarantineBadge}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mb-3 leading-relaxed">
                  {t.upload.quarantineDesc}
                </p>
                <div className="bg-white border border-amber-200 rounded p-3 text-xs font-mono text-slate-700 max-h-36 overflow-y-auto">
                  {quarantined.map((item) => (
                    <div
                      key={item.id}
                      className="py-1 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                    >
                      <span className="truncate max-w-md">{item.originalName}</span>
                      <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {item.corruptionReason || t.upload.corrupted}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Dynamic CSV Cohort Role Assignment Bar */}
        {detectedGroups.length > 0 && (
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-5 mb-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EDF2F7] pb-3 mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#002B49]" />
                  <span>{t.protocol.cohortMapper.title}</span>
                </h3>
                <p className="text-xs text-[#57606A] mt-0.5">
                  {t.protocol.cohortMapper.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  {t.upload.ctrl}: {cohortRoleCounts.control}
                </span>
                <span className="px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {t.upload.exp}: {cohortRoleCounts.experimental}
                </span>
              </div>
            </div>

            {missingCohortWarning && (
              <div className="mb-4 bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">
                    {t.protocol.cohortMapper.missingCohortWarningTitle}
                  </strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {t.protocol.cohortMapper.missingCohortWarningDesc}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {detectedGroups.map((group) => {
                const currentRole =
                  studyMetadata.cohortMapping?.[group] ??
                  inferDefaultCohortRole(group);
                const count = groupParticipantCounts[group] || 0;
                return (
                  <div
                    key={group}
                    className="border border-[#E2E8F0] rounded-md p-3 bg-[#FAFBFD] flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="text-[11px] font-mono text-slate-500 uppercase">
                        {t.protocol.cohortMapper.detectedGroup}
                      </div>
                      <div className="font-medium text-xs text-slate-900 truncate">
                        {group}{' '}
                        <span className="text-[10px] font-mono text-slate-500">
                          ({count} {t.protocol.cohortMapper.participantCount})
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-[#57606A] mb-1">
                        {t.protocol.cohortMapper.assignedRole}
                      </label>
                      <select
                        value={currentRole}
                        onChange={(e) =>
                          updateCohortMapping((prev) => ({
                            ...prev,
                            [group]: e.target.value as CohortRole,
                          }))
                        }
                        className={`w-full text-xs rounded border px-2 py-1.5 font-medium transition focus:outline-hidden focus:ring-1 focus:ring-[#002B49] ${
                          currentRole === 'Control'
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                            : currentRole === 'Experimental'
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                            : 'bg-white border-[#D0D7DE] text-slate-600'
                        }`}
                      >
                        <option value="Control">
                          {t.protocol.cohortMapper.roles.control}
                        </option>
                        <option value="Experimental">
                          {t.protocol.cohortMapper.roles.experimental}
                        </option>
                        <option value="Unassigned">
                          {t.protocol.cohortMapper.roles.unassigned}
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Study Protocol & AI Copilot Drawer (Collapsed by Default) */}
        <StudyProtocolForm />

        {/* Longitudinal Cohort Alignment Trigger */}
        {isSurveysReady && (
          <div className="bg-white border border-[#D0D7DE] rounded-lg p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="font-serif font-bold text-base text-[#002B49]">
                {t.upload.matchTitle}
              </h3>
              <p className="text-xs text-[#57606A] mt-0.5 max-w-xl">
                {t.upload.matchDesc}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReconcile}
                disabled={isProcessing}
                className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t.upload.realign}</span>
              </button>
              {pairedData.length > 0 && (
                <button
                  onClick={() => router.push('/lab')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition shadow-xs"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{t.upload.generateReport}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pairing Preview & Override Table */}
        {pairedData.length > 0 && (
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[#EDF2F7] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#002B49]">
                  {t.upload.tableTitle} ({pairedData.length} Matched Subjects)
                </h3>
                <p className="text-xs text-[#57606A]">{t.upload.tableSub}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search Filter Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={t.upload.filterPlaceholder}
                    className="pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-[#CBD5E1] rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#002B49] w-48 sm:w-64"
                  />
                  {filterQuery && (
                    <button
                      onClick={() => setFilterQuery('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Show Top 15 / Show All Toggle */}
                {filteredPairs.length > 15 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPairs(!showAllPairs)}
                    className="text-xs font-medium text-[#002B49] hover:underline bg-[#F1F5F9] px-2.5 py-1.5 rounded border border-[#CBD5E1]"
                  >
                    {showAllPairs
                      ? t.upload.showTop15
                      : `${t.upload.showAll} (${filteredPairs.length})`}
                  </button>
                )}

                <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded font-bold">
                  {t.upload.pairingSuccess}:{' '}
                  {preClean.length > 0
                    ? ((pairedData.length / preClean.length) * 100).toFixed(1)
                    : '100'}%
                </span>
              </div>
            </div>

            {visiblePairs.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-6 text-center">
                {t.upload.noFilterResults}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-booktabs text-xs">
                  <thead>
                    <tr>
                      <th>{t.upload.headers.preParticipant}</th>
                      <th>{t.upload.headers.postParticipant}</th>
                      <th>{t.upload.headers.group}</th>
                      <th>{t.upload.headers.confidence}</th>
                      <th>{t.upload.headers.preScore}</th>
                      <th>{t.upload.headers.postScore}</th>
                      <th>{t.upload.headers.delta}</th>
                      <th>{t.upload.headers.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePairs.map(({ pair: p, originalIndex }) => (
                      <tr key={`${p.preName}-${p.postName}-${originalIndex}`}>
                        <td className="font-medium text-slate-800">{p.preName}</td>
                        <td className="text-slate-600">{p.postName}</td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                              p.cohortRole === 'Control'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : p.cohortRole === 'Experimental'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#F1F5F9] text-[#002B49] border-[#E2E8F0]'
                            }`}
                          >
                            {p.group} ({p.cohortRole})
                          </span>
                        </td>
                        <td className="font-mono text-emerald-700 font-bold">
                          {(p.similarity * 100).toFixed(0)}%
                        </td>
                        <td className="font-semibold">{p.preScore} / 10</td>
                        <td className="font-semibold text-[#002B49]">
                          {p.postScore} / 10
                        </td>
                        <td
                          className={`font-bold ${
                            p.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {p.delta >= 0 ? `+${p.delta}` : `${p.delta}`}
                        </td>
                        <td>
                          <button
                            onClick={() => unlinkPair(originalIndex)}
                            className="text-rose-600 hover:text-rose-800 font-mono text-[11px] flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition"
                            title="Unlink pair"
                          >
                            <Unlink className="w-3 h-3" />
                            <span>{t.upload.unlink}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
