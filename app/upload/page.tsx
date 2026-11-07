'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import HeaderNav from '@/components/HeaderNav';
import { parseSurveyCSV, pairPreAndPost } from '@/lib/csvCleaner';
import { RawSurveyRow, CleanedParticipant, PairedParticipant, AttritionAnalysis } from '@/types/dataset';
import { useTranslation } from '@/lib/LanguageContext';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Sparkles
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [preClean, setPreClean] = useState<CleanedParticipant[]>([]);
  const [postClean, setPostClean] = useState<CleanedParticipant[]>([]);
  const [quarantined, setQuarantined] = useState<CleanedParticipant[]>([]);
  const [paired, setPaired] = useState<PairedParticipant[]>([]);
  const [attritionAnalysis, setAttritionAnalysis] = useState<AttritionAnalysis | null>(null);

  const [preFilename, setPreFilename] = useState('');
  const [postFilename, setPostFilename] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLoadBenchmarkDemo = () => {
    setIsProcessing(true);

    const demoPre: CleanedParticipant[] = [
      { id: 'pre-0', originalName: 'Adrian Alejandro Guzman Chicaiza', normalizedName: 'adrian alejandro guzman chicaiza', group: 'Listado 1', score: 1, timestamp: '9/19/2026 8:54:24', isFlaggedCorrupted: false },
      { id: 'pre-1', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 1', score: 2, timestamp: '9/19/2026 8:55:48', isFlaggedCorrupted: false },
      { id: 'pre-2', originalName: 'Alexander Yamá Rosero', normalizedName: 'alexander yama rosero', group: 'Listado 1', score: 3, timestamp: '9/19/2026 8:56:10', isFlaggedCorrupted: false },
      { id: 'pre-3', originalName: 'Maritza Valencia', normalizedName: 'maritza valencia', group: 'Listado 2', score: 0, timestamp: '9/19/2026 8:56:45', isFlaggedCorrupted: false },
      { id: 'pre-4', originalName: 'Deivid Sebastian Armero Gualguan', normalizedName: 'deivid sebastian armero gualguan', group: 'Listado 1', score: 0, timestamp: '9/19/2026 8:57:02', isFlaggedCorrupted: false },
      { id: 'pre-5', originalName: 'Nidia Jael Muñoz Oviedo', normalizedName: 'nidia jael munoz oviedo', group: 'Listado 1', score: 2, timestamp: '9/19/2026 8:57:33', isFlaggedCorrupted: false },
      { id: 'pre-6', originalName: 'Emerson Steven Imbajoa Imbajoa', normalizedName: 'emerson steven imbajoa imbajoa', group: 'Listado 2', score: 2, timestamp: '9/19/2026 8:58:12', isFlaggedCorrupted: false },
      { id: 'pre-7', originalName: 'Sebastian Gomez', normalizedName: 'sebastian gomez', group: 'Listado 2', score: 1, timestamp: '9/19/2026 8:58:40', isFlaggedCorrupted: false },
      { id: 'pre-8', originalName: 'Diego Andres Aguirre', normalizedName: 'diego andres aguirre', group: 'Listado 2', score: 2, timestamp: '9/19/2026 8:59:15', isFlaggedCorrupted: false },
      { id: 'pre-9', originalName: 'Cristian Mateo Rodríguez Solarte', normalizedName: 'cristian mateo rodriguez solarte', group: 'Listado 1', score: 1, timestamp: '9/19/2026 9:00:00', isFlaggedCorrupted: false },
      { id: 'pre-10', originalName: 'Omar Esteban Solarte Cerón', normalizedName: 'omar esteban solarte ceron', group: 'Listado 1', score: 2, timestamp: '9/19/2026 9:01:10', isFlaggedCorrupted: false },
      { id: 'pre-11', originalName: 'Cristisn Montenegro', normalizedName: 'cristisn montenegro', group: 'Listado 2', score: 1, timestamp: '9/19/2026 9:02:00', isFlaggedCorrupted: false },
      { id: 'pre-12', originalName: 'Édgar Eduardo Chaux Florez', normalizedName: 'edgar eduardo chaux florez', group: 'Listado 1', score: 2, timestamp: '9/19/2026 9:02:40', isFlaggedCorrupted: false },
      { id: 'pre-13', originalName: 'David Armando Enriquez', normalizedName: 'david armando enriquez', group: 'Listado 2', score: 3, timestamp: '9/19/2026 9:03:15', isFlaggedCorrupted: false }
    ];

    for (let i = 14; i < 40; i++) {
      demoPre.push({
        id: `pre-${i}`,
        originalName: `Participant Baseline ${i + 1}`,
        normalizedName: `participant baseline ${i + 1}`,
        group: i % 2 === 0 ? 'Listado 1' : 'Listado 2',
        score: (i % 3) + 1,
        timestamp: '9/19/2026 9:05:00',
        isFlaggedCorrupted: false
      });
    }

    const demoPost: CleanedParticipant[] = [
      { id: 'post-0', originalName: 'Alexander Yamá Rosero', normalizedName: 'alexander yama rosero', group: 'Listado 1', score: 8, timestamp: '24/10/2026 8:08:20', isFlaggedCorrupted: false },
      { id: 'post-1', originalName: 'Maritza Valencia', normalizedName: 'maritza valencia', group: 'Listado 2', score: 7, timestamp: '24/10/2026 8:08:45', isFlaggedCorrupted: false },
      { id: 'post-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 1', score: 10, timestamp: '24/10/2026 8:09:10', isFlaggedCorrupted: false },
      { id: 'post-3', originalName: 'Deivid Sebastian Armero Gualguan', normalizedName: 'deivid sebastian armero gualguan', group: 'Listado 1', score: 7, timestamp: '24/10/2026 8:09:30', isFlaggedCorrupted: false },
      { id: 'post-4', originalName: 'Nidia Jael Muñoz Oviedo', normalizedName: 'nidia jael munoz oviedo', group: 'Listado 1', score: 8, timestamp: '24/10/2026 8:10:00', isFlaggedCorrupted: false },
      { id: 'post-5', originalName: 'Emerson Steven Imbajoa Imbajoa', normalizedName: 'emerson steven imbajoa imbajoa', group: 'Listado 2', score: 10, timestamp: '24/10/2026 8:10:45', isFlaggedCorrupted: false },
      { id: 'post-6', originalName: 'Sebastian Gomez', normalizedName: 'sebastian gomez', group: 'Listado 2', score: 5, timestamp: '24/10/2026 8:11:00', isFlaggedCorrupted: false },
      { id: 'post-7', originalName: 'Diego Andres Aguirre', normalizedName: 'diego andres aguirre', group: 'Listado 2', score: 9, timestamp: '24/10/2026 8:11:30', isFlaggedCorrupted: false },
      { id: 'post-8', originalName: 'Cristian Mateo Rodriguez Solarte', normalizedName: 'cristian mateo rodriguez solarte', group: 'Listado 1', score: 10, timestamp: '24/10/2026 8:12:00', isFlaggedCorrupted: false },
      { id: 'post-9', originalName: 'Omar Esteban Solarte Cerón', normalizedName: 'omar esteban solarte ceron', group: 'Listado 1', score: 10, timestamp: '24/10/2026 8:12:45', isFlaggedCorrupted: false },
      { id: 'post-10', originalName: 'Cristian Montenegro', normalizedName: 'cristian montenegro', group: 'Listado 2', score: 9, timestamp: '24/10/2026 8:13:10', isFlaggedCorrupted: false },
      { id: 'post-11', originalName: 'Édgar Eduardo Chaux', normalizedName: 'edgar eduardo chaux', group: 'Listado 1', score: 10, timestamp: '24/10/2026 8:14:00', isFlaggedCorrupted: false }
    ];

    for (let i = 12; i < 31; i++) {
      demoPost.push({
        id: `post-${i}`,
        originalName: `Participant Baseline ${i + 3}`,
        normalizedName: `participant baseline ${i + 3}`,
        group: i % 2 === 0 ? 'Listado 1' : 'Listado 2',
        score: Math.min(10, 7 + (i % 4)),
        timestamp: '24/10/2026 8:20:00',
        isFlaggedCorrupted: false
      });
    }

    const demoQuarantined: CleanedParticipant[] = [
      {
        id: 'post-27',
        originalName: 'El siguiente algoritmo: def es_primer_numero_par(numeros): if numeros[0] % 2 == 0: return True...',
        normalizedName: 'corrupted code block',
        group: 'Listado 1',
        score: 10,
        timestamp: '7/11/2026 8:22:08',
        isFlaggedCorrupted: true,
        corruptionReason: 'Corrupted submission: algorithmic examination dump detected in name field'
      }
    ];

    setPreClean(demoPre);
    setPostClean(demoPost);
    setQuarantined(demoQuarantined);
    setPreFilename('Evaluación (pretest) — Conceptos básicos.csv');
    setPostFilename('Evaluación (postest) — Conceptos básicos.csv');

    const result = pairPreAndPost(demoPre, demoPost);
    setPaired(result.paired);
    setAttritionAnalysis(result.attritionAnalysis);

    localStorage.setItem('reportthy_pre_scores', JSON.stringify(demoPre.map(p => p.score)));
    localStorage.setItem('reportthy_post_scores', JSON.stringify(demoPost.map(p => p.score)));
    localStorage.setItem('reportthy_pre_data', JSON.stringify(demoPre));
    localStorage.setItem('reportthy_post_data', JSON.stringify(demoPost));
    localStorage.setItem('reportthy_quarantined', JSON.stringify(demoQuarantined));
    localStorage.setItem('reportthy_paired', JSON.stringify(result.paired));
    localStorage.setItem('reportthy_attrition', JSON.stringify(result.attritionAnalysis));

    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, role: 'pre' | 'post') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (role === 'pre') setPreFilename(file.name);
    else setPostFilename(file.name);

    Papa.parse<RawSurveyRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const { clean, quarantined: badRows } = parseSurveyCSV(results.data, role);
        if (role === 'pre') {
          setPreClean(clean);
          if (postClean.length > 0) {
            const result = pairPreAndPost(clean, postClean);
            setPaired(result.paired);
            setAttritionAnalysis(result.attritionAnalysis);
          }
        } else {
          setPostClean(clean);
          if (preClean.length > 0) {
            const result = pairPreAndPost(preClean, clean);
            setPaired(result.paired);
            setAttritionAnalysis(result.attritionAnalysis);
          }
        }
        if (badRows.length > 0) setQuarantined((prev) => [...prev, ...badRows]);
      },
    });
  };

  const handleReconcile = () => {
    setIsProcessing(true);
    const result = pairPreAndPost(preClean, postClean);
    setPaired(result.paired);
    setAttritionAnalysis(result.attritionAnalysis);

    localStorage.setItem('reportthy_pre_scores', JSON.stringify(preClean.map((p) => p.score)));
    localStorage.setItem('reportthy_post_scores', JSON.stringify(postClean.map((p) => p.score)));
    localStorage.setItem('reportthy_pre_data', JSON.stringify(preClean));
    localStorage.setItem('reportthy_post_data', JSON.stringify(postClean));
    localStorage.setItem('reportthy_quarantined', JSON.stringify(quarantined));
    localStorage.setItem('reportthy_paired', JSON.stringify(result.paired));
    localStorage.setItem('reportthy_attrition', JSON.stringify(result.attritionAnalysis));

    setIsProcessing(false);
  };

  const isReadyToProceed = preClean.length > 0 && postClean.length > 0;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <HeaderNav />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono text-[#57606A] uppercase tracking-wide">
                {t.upload.phase}
              </span>
              <span className="text-[#CBD5E1]">•</span>
              <span className="text-[11px] font-mono text-[#57606A]">HU-02 Pipeline</span>
            </div>
            <h1 className="font-serif font-bold text-2xl text-[#002B49]">
              {t.upload.title}
            </h1>
            <p className="text-sm text-[#57606A] mt-1 max-w-2xl">
              {t.upload.subtitle}
            </p>
          </div>

          <button
            onClick={handleLoadBenchmarkDemo}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all shadow-xs shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span>{t.upload.demoBtn}</span>
          </button>
        </header>

        {/* 2 Upload Cards Grid (Direct Pre & Post CSV Ingestion) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pretest Dropzone */}
          <div className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#002B49] text-white flex items-center justify-center text-xs font-mono">1</span>
                  {t.upload.pretest}
                </h2>
                {preClean.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-mono">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> N = {preClean.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#57606A] mb-4 font-mono">
                {t.upload.fingerprintPre}
              </p>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] hover:border-[#002B49] rounded-lg p-6 cursor-pointer bg-[#F8F9FA] hover:bg-white transition group">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#002B49] mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-700 font-mono text-center truncate w-full">
                {preFilename || t.upload.dropPre}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'pre')} />
            </label>
          </div>

          {/* Posttest Dropzone */}
          <div className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#002B49] text-white flex items-center justify-center text-xs font-mono">2</span>
                  {t.upload.posttest}
                </h2>
                {postClean.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-mono">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> N = {postClean.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#57606A] mb-4 font-mono">
                {t.upload.fingerprintPost}
              </p>
            </div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] hover:border-[#002B49] rounded-lg p-6 cursor-pointer bg-[#F8F9FA] hover:bg-white transition group">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#002B49] mb-2 transition-colors" />
              <span className="text-xs font-medium text-slate-700 font-mono text-center truncate w-full">
                {postFilename || t.upload.dropPost}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, 'post')} />
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
                    <div key={item.id} className="border-b last:border-0 border-slate-100 pb-2 mb-2 last:mb-0">
                      <div className="font-bold text-[#C0392B]">
                        [{item.id}] {t.upload.reason}: {item.corruptionReason}
                      </div>
                      <pre className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap truncate bg-[#F8F9FA] p-2 rounded">
                        {item.originalName.substring(0, 200)}...
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Longitudinal Cohort Alignment Trigger */}
        {isReadyToProceed && (
          <div className="bg-white border border-[#D0D7DE] rounded-lg p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div>
              <h3 className="font-serif font-bold text-base text-[#002B49]">
                {t.upload.matchTitle}
              </h3>
              <p className="text-xs text-[#57606A] mt-0.5">
                {t.upload.matchDesc}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReconcile}
                disabled={isProcessing}
                className="bg-[#002B49] hover:bg-[#001A2C] text-white px-5 py-2.5 rounded-md text-xs font-semibold flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{t.upload.realign}</span>
              </button>
              {paired.length > 0 && (
                <button
                  onClick={() => router.push('/report')}
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

        {/* Pairing Preview Table */}
        {paired.length > 0 && (
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-[#EDF2F7] pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#002B49]">
                  {t.upload.tableTitle} ({paired.length} Matched Subjects)
                </h3>
                <p className="text-xs text-[#57606A]">
                  {t.upload.tableSub}
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded font-bold">
                {t.upload.pairingSuccess}: {((paired.length / preClean.length) * 100).toFixed(1)}%
              </span>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {paired.slice(0, 10).map((p, idx) => (
                    <tr key={idx}>
                      <td className="font-medium text-slate-800">{p.preName}</td>
                      <td className="text-slate-600">{p.postName}</td>
                      <td>
                        <span className="bg-[#F1F5F9] text-[#002B49] px-2 py-0.5 rounded font-mono text-[11px] font-semibold border border-[#E2E8F0]">
                          {p.group}
                        </span>
                      </td>
                      <td className="font-mono text-emerald-700 font-bold">
                        {(p.similarity * 100).toFixed(0)}%
                      </td>
                      <td className="font-semibold">{p.preScore} / 10</td>
                      <td className="font-semibold text-[#002B49]">{p.postScore} / 10</td>
                      <td className="font-bold text-emerald-700">+{p.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
