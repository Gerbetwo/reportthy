'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import HeaderNav from '@/components/HeaderNav';
import { parseSurveyCSV, pairPreAndPost } from '@/lib/csvCleaner';
import { RawSurveyRow, CleanedParticipant, PairedParticipant } from '@/types/dataset';
import { Upload, AlertTriangle, CheckCircle, ArrowRight, ShieldCheck, FileCheck } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();

  const [preClean, setPreClean] = useState<CleanedParticipant[]>([]);
  const [postClean, setPostClean] = useState<CleanedParticipant[]>([]);
  const [quarantined, setQuarantined] = useState<CleanedParticipant[]>([]);
  const [paired, setPaired] = useState<PairedParticipant[]>([]);
  const [preFilename, setPreFilename] = useState<string>('');
  const [postFilename, setPostFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

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
        } else {
          setPostClean(clean);
        }
        if (badRows.length > 0) {
          setQuarantined((prev) => [...prev, ...badRows]);
        }
      },
    });
  };

  const handleReconcile = () => {
    setIsProcessing(true);
    const result = pairPreAndPost(preClean, postClean);
    setPaired(result.paired);

    // Persist verified datasets for instant loading in /report
    localStorage.setItem('reportthy_pre_scores', JSON.stringify(preClean.map((p) => p.score)));
    localStorage.setItem('reportthy_post_scores', JSON.stringify(postClean.map((p) => p.score)));
    localStorage.setItem('reportthy_pre_data', JSON.stringify(preClean));
    localStorage.setItem('reportthy_post_data', JSON.stringify(postClean));
    localStorage.setItem('reportthy_quarantined', JSON.stringify(quarantined));
    localStorage.setItem('reportthy_paired', JSON.stringify(result.paired));

    setIsProcessing(false);
  };

  const isReadyToProceed = preClean.length > 0 && postClean.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 pb-16">
        <header className="border-b border-[#D0D7DE] pb-4 mb-8">
          <span className="text-xs uppercase font-semibold text-[#C0392B] font-mono">
            Agile Sprint 1: HU-02 Pipeline
          </span>
          <h1 className="text-3xl font-serif font-bold text-[#002B49] mt-1">
            Dual Dataset Ingestion & Pre-flight Sanitization
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Upload pretest and posttest CSV files. The pipeline isolates corrupted submissions, normalizes score formats, and pairs longitudinal respondents via fuzzy Levenshtein distance.
          </p>
        </header>

        {/* Upload Dropzones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded border border-[#D0D7DE] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-bold text-base text-[#002B49]">
                  1. Pre-Intervention Test (Pretest)
                </h2>
                {preClean.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Validated ({preClean.length} rows)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                Schema fingerprint: Score, Timestamp, Listado 1/2
              </p>
            </div>
            <div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#002B49] rounded p-6 cursor-pointer bg-slate-50 transition">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-700 font-mono">
                  {preFilename || 'Click to select Pretest CSV'}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'pre')}
                />
              </label>
            </div>
          </div>

          <div className="bg-white p-6 rounded border border-[#D0D7DE] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-bold text-base text-[#002B49]">
                  2. Post-Intervention Test (Posttest)
                </h2>
                {postClean.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" /> Validated ({postClean.length} rows)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4 font-mono">
                Schema fingerprint: Puntuación, Marca temporal, Listado 1/2
              </p>
            </div>
            <div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#002B49] rounded p-6 cursor-pointer bg-slate-50 transition">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-xs font-medium text-slate-700 font-mono">
                  {postFilename || 'Click to select Posttest CSV'}
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
        </div>

        {/* Quarantine Panel: Traps Row 27 Algorithm Block */}
        {quarantined.length > 0 && (
          <section className="bg-amber-50 border border-amber-300 rounded p-5 mb-8 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm text-amber-900">
                    Data Integrity Quarantine ({quarantined.length} Anomalous Record Isolated)
                  </h3>
                  <span className="text-xs font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                    Trapped: Code Block Injection
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 mb-3">
                  The parser trapped an algorithm exam block pasted into the participant name field (Row 27). This corrupted record has been quarantined to preserve valid sample variance.
                </p>
                <div className="bg-white border border-amber-200 rounded p-3 text-xs font-mono text-slate-700 max-h-32 overflow-y-auto">
                  {quarantined.map((item) => (
                    <div key={item.id} className="border-b last:border-0 border-slate-100 pb-2 mb-2 last:mb-0">
                      <span className="font-bold text-amber-900">[{item.id}]</span> Reason: {item.corruptionReason}
                      <pre className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap truncate">
                        {item.originalName.substring(0, 180)}...
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Action Trigger */}
        {isReadyToProceed && (
          <div className="bg-white border border-[#D0D7DE] rounded p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-base text-[#002B49]">
                Execute Identity Reconciliation & Longitudinal Pairing
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Normalizes participant diacritics and matches pre/post pairs ($N_{\\text{pre}}=$${preClean.length}, $N_{\\text{post}}=$${postClean.length}).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReconcile}
                disabled={isProcessing}
                className="bg-[#002B49] hover:bg-slate-800 text-white px-5 py-2.5 rounded text-xs font-semibold flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                {paired.length > 0 ? 'Re-compute Pairing' : 'Reconcile Cohorts'}
              </button>
              {paired.length > 0 && (
                <button
                  onClick={() => router.push('/report')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded text-xs font-semibold flex items-center gap-2 transition shadow-sm"
                >
                  <FileCheck className="w-4 h-4" />
                  Proceed to Quality Report
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Pairing Preview Table */}
        {paired.length > 0 && (
          <section className="bg-white border border-[#D0D7DE] rounded p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-base text-[#002B49]">
                Paired Participant Alignment Preview ({paired.length} Matched Subjects)
              </h3>
              <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                Cohort Overlap: {((paired.length / preClean.length) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-booktabs text-xs">
                <thead>
                  <tr>
                    <th>Pretest Participant</th>
                    <th>Posttest Participant</th>
                    <th>Cohort Group</th>
                    <th>Confidence</th>
                    <th>Pre Score</th>
                    <th>Post Score</th>
                    <th>Score Delta (Δ)</th>
                  </tr>
                </thead>
                <tbody>
                  {paired.slice(0, 8).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="font-medium text-slate-800">{p.preName}</td>
                      <td className="text-slate-600">{p.postName}</td>
                      <td>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[11px]">
                          {p.group}
                        </span>
                      </td>
                      <td className="font-mono text-emerald-700 font-bold">{(p.similarity * 100).toFixed(0)}%</td>
                      <td className="font-semibold">{p.preScore} / 10</td>
                      <td className="font-semibold text-[#002B49]">{p.postScore} / 10</td>
                      <td className="font-bold text-emerald-700">+{p.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paired.length > 8 && (
              <p className="text-xs text-slate-400 text-right mt-3 font-mono">
                Showing first 8 of {paired.length} longitudinal pairs...
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
