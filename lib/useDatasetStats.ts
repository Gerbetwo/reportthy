'use client';

import { useMemo } from 'react';
import { useDataset } from '@/lib/DatasetContext';

export function useDatasetStats() {
  const {
    sessionId,
    studyMetadata,
    setStudyMetadata,
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
    sessionId,
    studyMetadata,
    setStudyMetadata,
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
