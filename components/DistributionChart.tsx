'use client';
import { useState } from 'react';
import { CleanedParticipant, DistributionBin } from '@/types/dataset';
import { computeScoreHistogram } from '@/lib/statsEngine';
import { BarChart2, Layers } from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';

interface DistributionChartProps {
  preData: CleanedParticipant[];
  postData: CleanedParticipant[];
}

export default function DistributionChart({ preData, postData }: DistributionChartProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'aggregated' | 'cohorts'>('aggregated');

  const bins: DistributionBin[] = computeScoreHistogram(preData, postData);
  const maxCount = Math.max(
    ...bins.flatMap(b => [b.preCount, b.postCount, b.g1PostCount, b.g2PostCount]),
    1
  );

  // Safely fallback to hardcoded strings if translation keys are missing from the dictionary type
  const reportDict = t.report as unknown as Record<string, undefined>;
  const distributionTitle = reportDict?.distributionTitle || 'Score Distribution Density & Frequency Visualizer';
  const distributionSub = reportDict?.distributionSub || 'Comparing pretest floor distribution against posttest ceiling distribution';
  const toggleAggregated = reportDict?.toggleAggregated || 'Pre vs Post';
  const toggleCohorts = reportDict?.toggleCohorts || 'Cohort Breakdown';

  return (
    <div className="bg-white p-6 rounded-lg border border-[#D0D7DE] shadow-xs mb-8 print:border-none print:shadow-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#EDF2F7] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#002B49]" />
            <h3 className="font-serif font-bold text-base text-[#002B49]">
              {distributionTitle}
            </h3>
          </div>
          <p className="text-xs text-[#57606A] mt-0.5">
            {distributionSub}
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-md border border-[#E2E8F0] self-start sm:self-auto print:hidden">
          <button
            onClick={() => setViewMode('aggregated')}
            className={`px-3 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
              viewMode === 'aggregated'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-[#57606A] hover:text-[#002B49]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{toggleAggregated}</span>
          </button>
          <button
            onClick={() => setViewMode('cohorts')}
            className={`px-3 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
              viewMode === 'cohorts'
                ? 'bg-[#002B49] text-white shadow-xs'
                : 'text-[#57606A] hover:text-[#002B49]'
            }`}
          >
            <span>{toggleCohorts}</span>
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 700 240" className="w-full h-auto max-h-72 font-mono text-[10px]">
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = 190 - pct * 150;
            const val = Math.round(pct * maxCount);
            return (
              <g key={idx}>
                <line x1="40" y1={y} x2="680" y2={y} stroke="#E2E8F0" strokeDasharray="3 3" />
                <text x="32" y={y + 3} textAnchor="end" fill="#64748B">{val}</text>
              </g>
            );
          })}

          {bins.map((bin, idx) => {
            const x = 60 + idx * 56;
            return (
              <g key={idx}>
                <text x={x + 18} y="210" textAnchor="middle" fill="#002B49" className="font-bold">
                  Score {bin.score}
                </text>
              </g>
            );
          })}

          {bins.map((bin, idx) => {
            const x = 60 + idx * 56;

            if (viewMode === 'aggregated') {
              const preH = (bin.preCount / maxCount) * 150;
              const postH = (bin.postCount / maxCount) * 150;
              return (
                <g key={idx}>
                  <rect x={x} y={190 - preH} width="16" height={preH} fill="#002B49" rx="2" opacity="0.85" />
                  <rect x={x + 18} y={190 - postH} width="16" height={postH} fill="#047857" rx="2" />
                  {bin.preCount > 0 && (
                    <text x={x + 8} y={184 - preH} textAnchor="middle" fill="#002B49" fontWeight="bold">
                      {bin.preCount}
                    </text>
                  )}
                  {bin.postCount > 0 && (
                    <text x={x + 26} y={184 - postH} textAnchor="middle" fill="#047857" fontWeight="bold">
                      {bin.postCount}
                    </text>
                  )}
                </g>
              );
            } else {
              const g1H = (bin.g1PostCount / maxCount) * 150;
              const g2H = (bin.g2PostCount / maxCount) * 150;
              return (
                <g key={idx}>
                  <rect x={x} y={190 - g1H} width="16" height={g1H} fill="#2563EB" rx="2" />
                  <rect x={x + 18} y={190 - g2H} width="16" height={g2H} fill="#9333EA" rx="2" />
                  {bin.g1PostCount > 0 && (
                    <text x={x + 8} y={184 - g1H} textAnchor="middle" fill="#2563EB" fontWeight="bold">
                      {bin.g1PostCount}
                    </text>
                  )}
                  {bin.g2PostCount > 0 && (
                    <text x={x + 26} y={184 - g2H} textAnchor="middle" fill="#9333EA" fontWeight="bold">
                      {bin.g2PostCount}
                    </text>
                  )}
                </g>
              );
            }
          })}

          <line x1="40" y1="190" x2="680" y2="190" stroke="#002B49" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#EDF2F7] text-xs font-mono">
        {viewMode === 'aggregated' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#002B49] opacity-85"></span>
              <span className="text-[#002B49] font-bold">Pretest Distribution (Floor Effect)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#047857]"></span>
              <span className="text-[#047857] font-bold">Posttest Distribution (Ceiling Effect)</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#2563EB]"></span>
              <span className="text-[#2563EB] font-bold">Listado 1 Posttest</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#9333EA]"></span>
              <span className="text-[#9333EA] font-bold">Listado 2 Posttest</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}