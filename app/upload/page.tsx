'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import HeaderNav from '@/components/HeaderNav';
import { parseSurveyCSV, pairPreAndPost, parseAttendanceExcel, detectCSVRole } from '@/lib/csvCleaner';
import { RawSurveyRow, CleanedParticipant, PairedParticipant, AttritionAnalysis, AttendanceRecord } from '@/types/dataset';
import { useTranslation } from '@/lib/LanguageContext';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  FileSpreadsheet,
  Unlink
} from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [preClean, setPreClean] = useState<CleanedParticipant[]>([]);
  const [postClean, setPostClean] = useState<CleanedParticipant[]>([]);
  const [quarantined, setQuarantined] = useState<CleanedParticipant[]>([]);
  const [paired, setPaired] = useState<PairedParticipant[]>([]);
  const [attritionAnalysis, setAttritionAnalysis] = useState<AttritionAnalysis | null>(null);
  const [attendanceRoster, setAttendanceRoster] = useState<AttendanceRecord[]>([]);

  const [preFilename, setPreFilename] = useState('');
  const [postFilename, setPostFilename] = useState('');
  const [excelFilename, setExcelFilename] = useState('');
  const [autoDetectMsg, setAutoDetectMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processCSVFile = (file: File, explicitRole?: 'pre' | 'post') => {
    Papa.parse<RawSurveyRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const detectedRole = explicitRole || detectCSVRole(headers);
        const role = detectedRole === 'unknown' ? (explicitRole || 'pre') : detectedRole;

        if (role === 'pre') setPreFilename(file.name);
        else setPostFilename(file.name);

        if (!explicitRole && detectedRole !== 'unknown') {
          setAutoDetectMsg(t.upload.autoDetectSuccess || 'File roles automatically detected!');
        }

        const { clean, quarantined: badRows } = parseSurveyCSV(results.data, role);
        if (role === 'pre') {
          setPreClean(clean);
          if (postClean.length > 0) {
            const result = pairPreAndPost(clean, postClean, attendanceRoster);
            setPaired(result.paired);
            setAttritionAnalysis(result.attritionAnalysis);
          }
        } else {
          setPostClean(clean);
          if (preClean.length > 0) {
            const result = pairPreAndPost(preClean, clean, attendanceRoster);
            setPaired(result.paired);
            setAttritionAnalysis(result.attritionAnalysis);
          }
        }

        setQuarantined((prev) => [
          ...prev.filter((p) => !p.id.startsWith(role)),
          ...badRows,
        ]);
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, role?: 'pre' | 'post') => {
    const file = e.target.files?.[0];
    if (file) processCSVFile(file, role);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFilename(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (buffer) {
        const roster = parseAttendanceExcel(buffer);
        setAttendanceRoster(roster);
        if (preClean.length > 0 && postClean.length > 0) {
          const result = pairPreAndPost(preClean, postClean, roster);
          setPaired(result.paired);
          setAttritionAnalysis(result.attritionAnalysis);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUnlinkPair = (index: number) => {
    const updated = [...paired];
    updated.splice(index, 1);
    setPaired(updated);
  };

  const handleReconcile = () => {
    setIsProcessing(true);
    const result = pairPreAndPost(preClean, postClean, attendanceRoster);
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
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-[#57606A] uppercase tracking-wide">
              {t.upload.phase}
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="text-[11px] font-mono text-[#57606A]">HU-02 Ingestion Suite</span>
          </div>
          <h1 className="font-serif font-bold text-2xl text-[#002B49]">
            {t.upload.title}
          </h1>
          <p className="text-sm text-[#57606A] mt-1 max-w-2xl">
            {t.upload.subtitle}
          </p>
        </header>

        {autoDetectMsg && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 mb-6 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{autoDetectMsg}</span>
          </div>
        )}

        {/* Excel Attendance Dropzone */}
        <div className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif font-bold text-base text-[#002B49] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#002B49]" />
              {t.upload.excelAttendance}
            </h2>
            {attendanceRoster.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300 font-mono">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {attendanceRoster.length} Roster Records
              </span>
            )}
          </div>
          <p className="text-xs text-[#57606A] mb-4 font-mono">
            {t.upload.fingerprintExcel}
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#CBD5E1] hover:border-[#002B49] rounded-lg p-4 cursor-pointer bg-[#F8F9FA] hover:bg-white transition group">
            <FileSpreadsheet className="w-6 h-6 text-slate-400 group-hover:text-[#002B49] mb-1 transition-colors" />
            <span className="text-xs font-medium text-slate-700 font-mono text-center truncate w-full">
              {excelFilename || t.upload.dropExcel}
            </span>
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} />
          </label>
        </div>

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

        {/* Pairing Preview & Override Table */}
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
                    <th>{t.upload.headers.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {paired.slice(0, 15).map((p, idx) => (
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
                      <td>
                        <button
                          onClick={() => handleUnlinkPair(idx)}
                          className="text-rose-600 hover:text-rose-800 font-mono text-[11px] flex items-center gap-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition"
                          title="Unlink pair"
                        >
                          <Unlink className="w-3 h-3" />
                          <span>Unlink</span>
                        </button>
                      </td>
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
