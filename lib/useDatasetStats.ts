'use client';

import { useMemo } from 'react';
import { useDataset } from '@/lib/DatasetContext';

export function useDatasetStats() {
  const {
    preClean,
    postClean,
    pairedData,
    attritionAnalysis,
    quarantined,
    jupyterResults,
    setJupyterResults
  } = useDataset();

  const preScores = useMemo(() => preClean.map(p => p.score), [preClean]);
  const postScores = useMemo(() => postClean.map(p => p.score), [postClean]);

  return {
    preClean,
    postClean,
    pairedData,
    preScores,
    postScores,
    attritionAnalysis,
    quarantined,
    jupyterResults,
    setJupyterResults,
  };
}
