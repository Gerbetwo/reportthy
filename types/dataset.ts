export interface RawSurveyRow {
  [key: string]: string;
}

export type ExperimentalDesignMode = 'within_subject' | 'between_group' | 'combined';

export type CohortRole = 'Control' | 'Experimental' | 'Unassigned';

export interface ResearcherAuthor {
  fullName: string;
  email: string;
  affiliation: string;
  country: string;
}

export interface StudyMetadata {
  studyTitle: string;
  topicDomain: string;
  controlPedagogy: string;
  experimentalPedagogy: string;
  hypothesisStatement: string;
  designMode: ExperimentalDesignMode;
  alpha: number;
  wilcoxonAlternative: 'greater' | 'less' | 'two-sided';
  mannWhitneyAlternative: 'greater' | 'less' | 'two-sided';
  authors: ResearcherAuthor[];
  cohortMapping: Record<string, CohortRole>;
  aiNarrativeSlots?: {
    manuscriptTitle?: string;
    theoreticalContext?: string;
    pedagogicalComparisonNote?: string;
    keywords?: string[];
  };
}

export type CopilotModelId =
  | 'SmolLM2-360M-Instruct-q4f16_1-MLC'
  | 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

export interface CopilotModelOption {
  id: CopilotModelId;
  labelKey: 'model360m' | 'model15b';
  sizeBytesApprox: string;
  vramApprox: string;
}

export const COPILOT_MODELS: CopilotModelOption[] = [
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    labelKey: 'model360m',
    sizeBytesApprox: '~380 MB',
    vramApprox: '~800 MB',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    labelKey: 'model15b',
    sizeBytesApprox: '~1.1 GB',
    vramApprox: '~2.2 GB',
  },
];

export interface HypothesisAuditResult {
  isAligned: boolean;
  suggestedMode: ExperimentalDesignMode;
  warning: string;
  refinedH0: string;
  refinedH1: string;
}

export interface PaperNarrativeSlotsResult {
  manuscriptTitle: string;
  theoreticalContext: string;
  pedagogicalComparisonNote: string;
  keywords: string[];
}

export const DEFAULT_STUDY_METADATA: StudyMetadata = {
  studyTitle: '',
  topicDomain: '',
  controlPedagogy: '',
  experimentalPedagogy: '',
  hypothesisStatement: '',
  designMode: 'within_subject',
  alpha: 0.05,
  wilcoxonAlternative: 'greater',
  mannWhitneyAlternative: 'greater',
  authors: [
    {
      fullName: '',
      email: '',
      affiliation: '',
      country: '',
    },
  ],
  cohortMapping: {},
  aiNarrativeSlots: {},
};

export interface CleanedParticipant {
  id: string;
  originalName: string;
  normalizedName: string;
  group: string;
  cohortRole: CohortRole;
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
  cohortRole: CohortRole;
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
  designMode?: ExperimentalDesignMode;
  controlLabel?: string;
  experimentalLabel?: string;
}
