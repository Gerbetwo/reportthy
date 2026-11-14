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

export interface AttritionAnalysis {
  preCount: number;
  postCount: number;
  pairedCount: number;
  unmatchedPreCount: number;
  unmatchedPostCount: number;
  attritionCount: number;
  attritionRate: number;
  unmatchedPreNames: string[];
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

export interface HypothesisTestResult {
  testName: string;
  statisticName: string;
  statisticValue: number;
  zValue: number;
  pValue: number;
  effectSize: number;
  interpretation: string;
  isSignificant: boolean;
  alternative: 'two-sided' | 'greater' | 'less';
  n1: number;
  n2?: number;
}

export interface JupyterExecutionResult {
  executedAt: string;
  kernelInfo: string;
  alpha: number;
  wilcoxonAlternative: 'greater' | 'less' | 'two-sided';
  preMetrics: DescriptiveMetrics;
  postMetrics: DescriptiveMetrics;
  wilcoxon: HypothesisTestResult;
  mannWhitney: HypothesisTestResult;
  hypothesisConfirmed: boolean;
  executedCodeCells: string[];
}

export interface DistributionBin {
  score: number;
  preCount: number;
  postCount: number;
  g1PreCount: number;
  g1PostCount: number;
  g2PreCount: number;
  g2PostCount: number;
}
