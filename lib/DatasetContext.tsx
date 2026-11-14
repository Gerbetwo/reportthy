'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CleanedParticipant,
  PairedParticipant,
  AttritionAnalysis,
  JupyterExecutionResult
} from '@/types/dataset';
import { pairPreAndPost } from '@/lib/csvCleaner';

interface DatasetContextType {
  preClean: CleanedParticipant[];
  postClean: CleanedParticipant[];
  pairedData: PairedParticipant[];
  quarantined: CleanedParticipant[];
  attritionAnalysis: AttritionAnalysis | null;
  jupyterResults: JupyterExecutionResult | null;
  setJupyterResults: (res: JupyterExecutionResult | null) => void;
  setDatasets: (data: {
    preClean?: CleanedParticipant[];
    postClean?: CleanedParticipant[];
    pairedData?: PairedParticipant[];
    quarantined?: CleanedParticipant[];
    attritionAnalysis?: AttritionAnalysis | null;
  }) => void;
  unlinkPair: (index: number) => void;
  reconcileCohorts: () => void;
  resetAll: () => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [preClean, setPreClean] = useState<CleanedParticipant[]>([]);
  const [postClean, setPostClean] = useState<CleanedParticipant[]>([]);
  const [pairedData, setPairedData] = useState<PairedParticipant[]>([]);
  const [quarantined, setQuarantined] = useState<CleanedParticipant[]>([]);
  const [attritionAnalysis, setAttritionAnalysis] = useState<AttritionAnalysis | null>(null);
  const [jupyterResults, setJupyterResultsState] = useState<JupyterExecutionResult | null>(null);

  useEffect(() => {
    try {
      const savedPre = localStorage.getItem('reportthy_pre_data');
      const savedPost = localStorage.getItem('reportthy_post_data');
      const savedPaired = localStorage.getItem('reportthy_paired');
      const savedQuarantined = localStorage.getItem('reportthy_quarantined');
      const savedAttrition = localStorage.getItem('reportthy_attrition');
      const savedJupyter = localStorage.getItem('reportthy_jupyter_results');

      if (savedPre) setPreClean(JSON.parse(savedPre));
      if (savedPost) setPostClean(JSON.parse(savedPost));
      if (savedPaired) setPairedData(JSON.parse(savedPaired));
      if (savedQuarantined) setQuarantined(JSON.parse(savedQuarantined));
      if (savedAttrition) {
        const parsedAttrition: unknown = JSON.parse(savedAttrition);
        if (parsedAttrition && typeof parsedAttrition === 'object' && 'attritionRate' in parsedAttrition) {
          setAttritionAnalysis(parsedAttrition as AttritionAnalysis);
        }
      }
      if (savedJupyter) {
        setJupyterResultsState(JSON.parse(savedJupyter));
      }
    } catch (e) {
      console.warn('DatasetContext failed to load stored datasets:', e);
    }
  }, []);

  const saveToStorage = (
    pre: CleanedParticipant[],
    post: CleanedParticipant[],
    paired: PairedParticipant[],
    quar: CleanedParticipant[],
    attr: AttritionAnalysis | null
  ) => {
    localStorage.setItem('reportthy_pre_data', JSON.stringify(pre));
    localStorage.setItem('reportthy_post_data', JSON.stringify(post));
    localStorage.setItem('reportthy_paired', JSON.stringify(paired));
    localStorage.setItem('reportthy_quarantined', JSON.stringify(quar));
    if (attr) localStorage.setItem('reportthy_attrition', JSON.stringify(attr));
  };

  const setJupyterResults = (res: JupyterExecutionResult | null) => {
    setJupyterResultsState(res);
    if (res) {
      localStorage.setItem('reportthy_jupyter_results', JSON.stringify(res));
    } else {
      localStorage.removeItem('reportthy_jupyter_results');
    }
  };

  const setDatasets: DatasetContextType['setDatasets'] = (data) => {
    const nextPre = data.preClean ?? preClean;
    const nextPost = data.postClean ?? postClean;
    const nextQuar = data.quarantined ?? quarantined;

    let nextPaired = data.pairedData ?? pairedData;
    let nextAttr = data.attritionAnalysis ?? attritionAnalysis;

    // Invalidate stale Jupyter verification whenever new survey inputs are loaded
    if (data.preClean || data.postClean) {
      setJupyterResultsState(null);
      localStorage.removeItem('reportthy_jupyter_results');
    }

    if ((data.preClean || data.postClean) && !data.pairedData) {
      if (nextPre.length > 0 && nextPost.length > 0) {
        const result = pairPreAndPost(nextPre, nextPost);
        nextPaired = result.paired;
        nextAttr = result.attritionAnalysis;
      }
    }

    setPreClean(nextPre);
    setPostClean(nextPost);
    setPairedData(nextPaired);
    setQuarantined(nextQuar);
    setAttritionAnalysis(nextAttr);

    saveToStorage(nextPre, nextPost, nextPaired, nextQuar, nextAttr);
  };

  const unlinkPair = (index: number) => {
    const updated = [...pairedData];
    updated.splice(index, 1);
    setPairedData(updated);
    localStorage.setItem('reportthy_paired', JSON.stringify(updated));
    // When pair linkage changes, clear execution results to avoid discrepancy
    setJupyterResultsState(null);
    localStorage.removeItem('reportthy_jupyter_results');
  };

  const reconcileCohorts = () => {
    if (preClean.length > 0 && postClean.length > 0) {
      const result = pairPreAndPost(preClean, postClean);
      setPairedData(result.paired);
      setAttritionAnalysis(result.attritionAnalysis);
      saveToStorage(preClean, postClean, result.paired, quarantined, result.attritionAnalysis);
      setJupyterResultsState(null);
      localStorage.removeItem('reportthy_jupyter_results');
    }
  };

  const resetAll = () => {
    setPreClean([]);
    setPostClean([]);
    setPairedData([]);
    setQuarantined([]);
    setAttritionAnalysis(null);
    setJupyterResultsState(null);
    localStorage.removeItem('reportthy_pre_data');
    localStorage.removeItem('reportthy_post_data');
    localStorage.removeItem('reportthy_paired');
    localStorage.removeItem('reportthy_quarantined');
    localStorage.removeItem('reportthy_attrition');
    localStorage.removeItem('reportthy_jupyter_results');
  };

  return (
    <DatasetContext.Provider
      value={{
        preClean,
        postClean,
        pairedData,
        quarantined,
        attritionAnalysis,
        jupyterResults,
        setJupyterResults,
        setDatasets,
        unlinkPair,
        reconcileCohorts,
        resetAll,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
