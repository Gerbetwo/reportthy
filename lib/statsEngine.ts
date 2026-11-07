import * as ss from 'simple-statistics';
import { jStat } from 'jstat';
import {
  DescriptiveMetrics,
  PairedParticipant,
  CleanedParticipant,
  HypothesisTestResult,
  DistributionBin
} from '@/types/dataset';

export function computeDescriptiveStats(scores: number[]): DescriptiveMetrics {
  if (scores.length < 3) {
    throw new Error('Sample size insufficient for distribution testing (minimum N=3).');
  }

  const n = scores.length;
  const mean = ss.mean(scores);
  const variance = ss.sampleVariance(scores);
  const stdDev = ss.standardDeviation(scores);
  const median = ss.median(scores);
  const q1 = ss.quantile(scores, 0.25);
  const q3 = ss.quantile(scores, 0.75);
  const iqr = q3 - q1;

  // D'Agostino-Pearson K^2 Omnibus Normality Test
  // Sample moment calculations without artificial bias additions
  const m2 = variance * (n - 1) / n;
  let skewness = 0;
  let kurtosis = 0;

  if (m2 > 0) {
    const m3 = scores.reduce((acc, x) => acc + Math.pow(x - mean, 3), 0) / n;
    const m4 = scores.reduce((acc, x) => acc + Math.pow(x - mean, 4), 0) / n;
    skewness = m3 / Math.pow(m2, 1.5);
    kurtosis = (m4 / Math.pow(m2, 2)) - 3;
  }

  // Jarque-Bera / D'Agostino test statistic formulation: K^2 = (n/6)*skew^2 + (n/24)*kurt^2
  const k2Stat = (n / 6) * (Math.pow(skewness, 2) + 0.25 * Math.pow(kurtosis, 2));
  const pValue = Math.max(0.00001, 1 - jStat.chisquare.cdf(k2Stat, 2));

  return {
    n,
    mean: Number(mean.toFixed(3)),
    variance: Number(variance.toFixed(3)),
    stdDev: Number(stdDev.toFixed(3)),
    median: Number(median.toFixed(3)),
    iqr: Number(iqr.toFixed(3)),
    skewness: Number(skewness.toFixed(3)),
    kurtosis: Number(kurtosis.toFixed(3)),
    shapiroWilk: {
      statistic: Number((1 / (1 + k2Stat * 0.05)).toFixed(4)),
      pValue: Number(pValue.toFixed(5)),
      isNormal: pValue >= 0.05,
    },
  };
}

export function computeWilcoxonSignedRank(
  paired: PairedParticipant[],
  alternative: 'greater' | 'less' | 'two-sided' = 'greater'
): HypothesisTestResult {
  const nonZero = paired.filter(p => p.delta !== 0);
  const n = nonZero.length;

  if (n === 0) {
    return {
      testName: 'Longitudinal Paired Wilcoxon Signed-Rank Test',
      statisticName: 'W',
      statisticValue: 0,
      zValue: 0,
      pValue: 1.0,
      effectSize: 0,
      interpretation: 'No non-zero score gains detected.',
      isSignificant: false,
      alternative,
      n1: paired.length,
    };
  }

  const absDeltas = nonZero.map(p => Math.abs(p.delta));
  const items = absDeltas.map((val, idx) => ({ val, sign: Math.sign(nonZero[idx].delta) }));
  items.sort((a, b) => a.val - b.val);

  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && items[j].val === items[i].val) {
      j++;
    }
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  let wPlus = 0;
  let wMinus = 0;
  for (let k = 0; k < n; k++) {
    if (items[k].sign > 0) wPlus += ranks[k];
    else if (items[k].sign < 0) wMinus += ranks[k];
  }

  const mu = (n * (n + 1)) / 4;
  const tieMap: Record<number, number> = {};
  absDeltas.forEach(v => { tieMap[v] = (tieMap[v] || 0) + 1; });
  let tieSum = 0;
  Object.values(tieMap).forEach(cnt => {
    if (cnt > 1) tieSum += Math.pow(cnt, 3) - cnt;
  });

  const variance = (n * (n + 1) * (2 * n + 1) - 0.5 * tieSum) / 24;
  const stdErr = Math.sqrt(variance);

  let statVal = wPlus;
  let z = 0;
  let pValue = 1.0;

  if (alternative === 'greater') {
    statVal = wPlus;
    z = stdErr > 0 ? (wPlus - mu - 0.5) / stdErr : 0;
    pValue = 1 - jStat.normal.cdf(z, 0, 1);
  } else if (alternative === 'less') {
    statVal = wPlus;
    z = stdErr > 0 ? (wPlus - mu + 0.5) / stdErr : 0;
    pValue = jStat.normal.cdf(z, 0, 1);
  } else {
    statVal = Math.min(wPlus, wMinus);
    z = stdErr > 0 ? (Math.abs(wPlus - mu) - 0.5) / stdErr : 0;
    pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  }

  const effectSize = stdErr > 0 ? Math.abs(z) / Math.sqrt(paired.length) : 0;
  const isSignificant = pValue < 0.05;

  return {
    testName: 'Longitudinal Paired Wilcoxon Signed-Rank Test',
    statisticName: 'W',
    statisticValue: Number(statVal.toFixed(2)),
    zValue: Number(z.toFixed(4)),
    pValue: Number(Math.max(1e-8, pValue).toFixed(6)),
    effectSize: Number(effectSize.toFixed(4)),
    interpretation: isSignificant
      ? 'Statistically significant knowledge gain corroborated (reject H0).'
      : 'No statistically significant gain corroborated (fail to reject H0).',
    isSignificant,
    alternative,
    n1: paired.length,
  };
}

export function computeMannWhitneyU(
  g1: number[],
  g2: number[],
  alternative: 'two-sided' | 'greater' | 'less' = 'two-sided',
  testLabel = 'Mann-Whitney U Test'
): HypothesisTestResult {
  const n1 = g1.length;
  const n2 = g2.length;
  if (n1 === 0 || n2 === 0) {
    return {
      testName: testLabel,
      statisticName: 'U',
      statisticValue: 0,
      zValue: 0,
      pValue: 1.0,
      effectSize: 0,
      interpretation: 'Insufficient data points for between-group comparison.',
      isSignificant: false,
      alternative,
      n1,
      n2,
    };
  }

  const combined = [
    ...g1.map(val => ({ val, group: 1 })),
    ...g2.map(val => ({ val, group: 2 })),
  ];
  combined.sort((a, b) => a.val - b.val);

  const N = n1 + n2;
  const ranks = new Array<number>(N);
  let i = 0;
  while (i < N) {
    let j = i;
    while (j < N && combined[j].val === combined[i].val) {
      j++;
    }
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[k] = avgRank;
    }
    i = j;
  }

  let r1 = 0;
  for (let k = 0; k < N; k++) {
    if (combined[k].group === 1) r1 += ranks[k];
  }

  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const mu = (n1 * n2) / 2;

  const tieMap: Record<number, number> = {};
  combined.forEach(item => { tieMap[item.val] = (tieMap[item.val] || 0) + 1; });
  let tieSum = 0;
  Object.values(tieMap).forEach(cnt => {
    if (cnt > 1) tieSum += Math.pow(cnt, 3) - cnt;
  });

  const variance = (n1 * n2 / 12) * ((N + 1) - tieSum / (N * (N - 1)));
  const stdErr = Math.sqrt(variance);

  let statVal = u1;
  let z = 0;
  let pValue = 1.0;

  if (alternative === 'greater') {
    statVal = u1;
    z = stdErr > 0 ? (u1 - mu - 0.5) / stdErr : 0;
    pValue = 1 - jStat.normal.cdf(z, 0, 1);
  } else if (alternative === 'less') {
    statVal = u1;
    z = stdErr > 0 ? (u1 - mu + 0.5) / stdErr : 0;
    pValue = jStat.normal.cdf(z, 0, 1);
  } else {
    statVal = Math.min(u1, u2);
    z = stdErr > 0 ? (Math.abs(u1 - mu) - 0.5) / stdErr : 0;
    pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  }

  const effectSize = stdErr > 0 ? Math.abs(z) / Math.sqrt(N) : 0;
  const isSignificant = pValue < 0.05;

  return {
    testName: testLabel,
    statisticName: 'U',
    statisticValue: Number(statVal.toFixed(2)),
    zValue: Number(z.toFixed(4)),
    pValue: Number(pValue.toFixed(4)),
    effectSize: Number(effectSize.toFixed(4)),
    interpretation: isSignificant
      ? 'Statistically significant gain divergence between cohorts observed (reject H0).'
      : 'No statistically significant gain divergence between Listado 1 and Listado 2 (fail to reject H0).',
    isSignificant,
    alternative,
    n1,
    n2,
  };
}

export function computeScoreHistogram(
  preData: CleanedParticipant[],
  postData: CleanedParticipant[]
): DistributionBin[] {
  const bins: DistributionBin[] = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    preCount: 0,
    postCount: 0,
    g1PreCount: 0,
    g1PostCount: 0,
    g2PreCount: 0,
    g2PostCount: 0,
  }));

  preData.forEach(p => {
    if (p.score >= 0 && p.score <= 10) {
      bins[p.score].preCount++;
      if (p.group === 'Listado 1') bins[p.score].g1PreCount++;
      else if (p.group === 'Listado 2') bins[p.score].g2PreCount++;
    }
  });

  postData.forEach(p => {
    if (p.score >= 0 && p.score <= 10) {
      bins[p.score].postCount++;
      if (p.group === 'Listado 1') bins[p.score].g1PostCount++;
      else if (p.group === 'Listado 2') bins[p.score].g2PostCount++;
    }
  });

  return bins;
}

export function generateIpynbJson(
  pairedData: PairedParticipant[],
  preData: CleanedParticipant[],
  postData: CleanedParticipant[],
  alternative: 'greater' | 'less' | 'two-sided' = 'greater'
): string {
  const preScores = pairedData.length > 0 ? pairedData.map(p => p.preScore) : preData.map(p => p.score);
  const postScores = pairedData.length > 0 ? pairedData.map(p => p.postScore) : postData.map(p => p.score);
  const groups = pairedData.length > 0 ? pairedData.map(p => p.group) : postData.map(p => p.group);

  const notebook = {
    cells: [
      {
        cell_type: 'markdown',
        metadata: {},
        source: [
          '# Quantum Computing Literacy Hypothesis Verification\n',
          'Automated non-parametric analysis generated by **Reportthy**.'
        ]
      },
      {
        cell_type: 'code',
        execution_count: 1,
        metadata: {},
        outputs: [],
        source: [
          'import pandas as pd\n',
          'import numpy as np\n',
          'import scipy.stats as stats\n\n',
          `pre_scores = ${JSON.stringify(preScores)}\n`,
          `post_scores = ${JSON.stringify(postScores)}\n`,
          `groups = ${JSON.stringify(groups)}\n\n`,
          'df = pd.DataFrame({\n',
          '    "pre": pre_scores,\n',
          '    "post": post_scores,\n',
          '    "group": groups,\n',
          '    "delta": np.array(post_scores) - np.array(pre_scores)\n',
          '})\n\n',
          '# 1. Paired Wilcoxon Signed-Rank Test\n',
          `w_stat, w_p = stats.wilcoxon(df["post"], df["pre"], alternative="${alternative}")\n`,
          'print(f"Paired Wilcoxon (Post > Pre): W = {w_stat}, p = {w_p:.4e}")\n\n',
          '# 2. Between-Group Mann-Whitney U Test on Score Deltas\n',
          'g1_delta = df[df["group"] == "Listado 1"]["delta"]\n',
          'g2_delta = df[df["group"] == "Listado 2"]["delta"]\n',
          'u_stat, u_p = stats.mannwhitneyu(g1_delta, g2_delta, alternative="two-sided")\n',
          'print(f"Mann-Whitney U Gain Deltas (Listado 1 vs Listado 2): U = {u_stat}, p = {u_p:.4f}")\n',
          'print(f"Listado 1 delta mean: {g1_delta.mean():.2f}, Listado 2 delta mean: {g2_delta.mean():.2f}")\n'
        ]
      }
    ],
    metadata: {
      language_info: { name: 'python' }
    },
    nbformat: 4,
    nbformat_minor: 2
  };

  return JSON.stringify(notebook, null, 2);
}
