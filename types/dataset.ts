export interface RawSurveyRow {
  [key: string]: string;
}

export interface CleanedParticipant {
  id: string;
  originalName: string;
  normalizedName: string;
  group: 'Listado 1' | 'Listado 2' | 'Unknown';
  score: number;
  timestamp: string;
  isFlaggedCorrupted: boolean;
  corruptionReason?: string;
}

export interface DescriptiveMetrics {
  n: number;
  mean: number;
  variance: number;
  stdDev: number;
  median: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  shapiroWilk: {
    statistic: number;
    pValue: number;
    isNormal: boolean;
  };
}

export interface PairedParticipant {
  preName: string;
  postName: string;
  similarity: number;
  group: string;
  preScore: number;
  postScore: number;
  delta: number;
}
