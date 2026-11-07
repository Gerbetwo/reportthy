'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CleanedParticipant, PairedParticipant, AttritionAnalysis, AttendanceRecord } from '@/types/dataset';
import { pairPreAndPost } from '@/lib/csvCleaner';

interface DatasetContextType {
  preClean: CleanedParticipant[];
  postClean: CleanedParticipant[];
  pairedData: PairedParticipant[];
  quarantined: CleanedParticipant[];
  attritionAnalysis: AttritionAnalysis | null;
  attendanceRoster: AttendanceRecord[];
  setDatasets: (data: {
    preClean?: CleanedParticipant[];
    postClean?: CleanedParticipant[];
    pairedData?: PairedParticipant[];
    quarantined?: CleanedParticipant[];
    attritionAnalysis?: AttritionAnalysis | null;
    attendanceRoster?: AttendanceRecord[];
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
  const [attendanceRoster, setAttendanceRoster] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    try {
      const savedPre = localStorage.getItem('reportthy_pre_data');
      const savedPost = localStorage.getItem('reportthy_post_data');
      const savedPaired = localStorage.getItem('reportthy_paired');
      const savedQuarantined = localStorage.getItem('reportthy_quarantined');
      const savedAttrition = localStorage.getItem('reportthy_attrition');

      if (savedPre) setPreClean(JSON.parse(savedPre));
      if (savedPost) setPostClean(JSON.parse(savedPost));
      if (savedPaired) setPairedData(JSON.parse(savedPaired));
      if (savedQuarantined) setQuarantined(JSON.parse(savedQuarantined));
      if (savedAttrition) setAttritionAnalysis(JSON.parse(savedAttrition));
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

  const setDatasets: DatasetContextType['setDatasets'] = (data) => {
    const nextPre = data.preClean ?? preClean;
    const nextPost = data.postClean ?? postClean;
    const nextQuar = data.quarantined ?? quarantined;
    const nextRoster = data.attendanceRoster ?? attendanceRoster;

    let nextPaired = data.pairedData ?? pairedData;
    let nextAttr = data.attritionAnalysis ?? attritionAnalysis;

    if ((data.preClean || data.postClean || data.attendanceRoster) && !data.pairedData) {
      if (nextPre.length > 0 && nextPost.length > 0) {
        const result = pairPreAndPost(nextPre, nextPost, nextRoster);
        nextPaired = result.paired;
        nextAttr = result.attritionAnalysis;
      }
    }

    setPreClean(nextPre);
    setPostClean(nextPost);
    setPairedData(nextPaired);
    setQuarantined(nextQuar);
    setAttendanceRoster(nextRoster);
    setAttritionAnalysis(nextAttr);

    saveToStorage(nextPre, nextPost, nextPaired, nextQuar, nextAttr);
  };

  const unlinkPair = (index: number) => {
    const updated = [...pairedData];
    updated.splice(index, 1);
    setPairedData(updated);
    localStorage.setItem('reportthy_paired', JSON.stringify(updated));
  };

  const reconcileCohorts = () => {
    if (preClean.length > 0 && postClean.length > 0) {
      const result = pairPreAndPost(preClean, postClean, attendanceRoster);
      setPairedData(result.paired);
      setAttritionAnalysis(result.attritionAnalysis);
      saveToStorage(preClean, postClean, result.paired, quarantined, result.attritionAnalysis);
    }
  };

  const resetAll = () => {
    setPreClean([]);
    setPostClean([]);
    setPairedData([]);
    setQuarantined([]);
    setAttritionAnalysis(null);
    setAttendanceRoster([]);
    localStorage.removeItem('reportthy_pre_data');
    localStorage.removeItem('reportthy_post_data');
    localStorage.removeItem('reportthy_paired');
    localStorage.removeItem('reportthy_quarantined');
    localStorage.removeItem('reportthy_attrition');
  };

  return (
    <DatasetContext.Provider
      value={{
        preClean,
        postClean,
        pairedData,
        quarantined,
        attritionAnalysis,
        attendanceRoster,
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
