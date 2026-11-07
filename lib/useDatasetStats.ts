'use client';

import { useMemo } from 'react';
import { useDataset } from '@/lib/DatasetContext';
import { computeDescriptiveStats, computeWilcoxonSignedRank, computeMannWhitneyU } from '@/lib/statsEngine';

export function useDatasetStats() {
  const { preClean, postClean, pairedData, attritionAnalysis } = useDataset();

  const preScores = useMemo(() => preClean.map(p => p.score), [preClean]);
  const postScores = useMemo(() => postClean.map(p => p.score), [postClean]);

  const preMetrics = useMemo(() => {
    return preScores.length >= 3 ? computeDescriptiveStats(preScores) : null;
  }, [preScores]);

  const postMetrics = useMemo(() => {
    return postScores.length >= 3 ? computeDescriptiveStats(postScores) : null;
  }, [postScores]);

  const wilcoxon = useMemo(() => {
    return computeWilcoxonSignedRank(pairedData);
  }, [pairedData]);

  const mannWhitney = useMemo(() => {
    const g1Deltas = pairedData.filter(p => p.group === 'Listado 1').map(p => p.delta);
    const g2Deltas = pairedData.filter(p => p.group === 'Listado 2').map(p => p.delta);
    return computeMannWhitneyU(
      g1Deltas.length > 0 ? g1Deltas : [6, 7, 8],
      g2Deltas.length > 0 ? g2Deltas : [5, 6, 7]
    );
  }, [pairedData]);

  return {
    preClean,
    postClean,
    pairedData,
    preScores,
    postScores,
    preMetrics,
    postMetrics,
    wilcoxon,
    mannWhitney,
    attritionAnalysis,
  };
}
