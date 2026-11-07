import { describe, it, expect } from 'vitest';
import { generateSpringerNatureLatex } from '@/lib/latexTemplate';
import { DescriptiveMetrics } from '@/types/dataset';

describe('Springer Nature LaTeX Template Engine (lib/latexTemplate.ts)', () => {
  it('generates compliant sn-jnl LaTeX output with booktabs and non-parametric mandate', () => {
    const mockPre: DescriptiveMetrics = {
      n: 40,
      mean: 1.925,
      variance: 0.789,
      stdDev: 0.888,
      median: 2.0,
      iqr: 2.0,
      skewness: -0.541,
      kurtosis: -0.280,
      shapiroWilk: { statistic: 0.8533, pValue: 0.0001, isNormal: false }
    };

    const mockPost: DescriptiveMetrics = {
      n: 31,
      mean: 8.323,
      variance: 4.826,
      stdDev: 2.197,
      median: 9.0,
      iqr: 2.5,
      skewness: -1.570,
      kurtosis: 1.900,
      shapiroWilk: { statistic: 0.7689, pValue: 0.00001, isNormal: false }
    };

    const tex = generateSpringerNatureLatex(mockPre, mockPost, 9, 22.5);

    expect(tex).toContain('\\documentclass[default,sn-basic]{sn-jnl}');
    expect(tex).toContain('\\usepackage{booktabs}');
    expect(tex).toContain('\\toprule');
    expect(tex).toContain('\\bottomrule');
    expect(tex).toContain('1.925');
    expect(tex).toContain('8.323');
    expect(tex).toContain('Wilcoxon');
    expect(tex).toContain('Mann-Whitney');
  });
});
