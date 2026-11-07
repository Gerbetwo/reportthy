import { describe, it, expect } from 'vitest';
import { computeDescriptiveStats } from '@/lib/statsEngine';

describe('Statistical Computation Engine (lib/statsEngine.ts)', () => {
  it('computes exact mean, sample variance, and median for a benchmark array', () => {
    const data = [1, 2, 3, 4, 5];
    const metrics = computeDescriptiveStats(data);

    expect(metrics.n).toBe(5);
    expect(metrics.mean).toBe(3);
    expect(metrics.variance).toBe(2.5);
    expect(metrics.median).toBe(3);
    expect(metrics.iqr).toBe(2);
  });

  it('rejects normality on skewed educational pretest benchmark (p < 0.05)', () => {
    const pretestData = [
      1, 2, 3, 2, 1, 2, 2, 1, 0, 3, 2, 2, 3, 2, 1, 2, 2, 1, 2, 3,
      1, 2, 2, 3, 1, 2, 0, 2, 3, 1, 2, 2, 3, 1, 2, 2, 1, 3, 2, 2
    ];
    const metrics = computeDescriptiveStats(pretestData);

    expect(metrics.n).toBe(40);
    expect(metrics.mean).toBeCloseTo(1.85, 1);
    expect(metrics.shapiroWilk.isNormal).toBe(false);
    expect(metrics.shapiroWilk.pValue).toBeLessThan(0.05);
  });

  it('rejects normality on ceiling-skewed posttest benchmark (p < 0.05)', () => {
    const posttestData = [
      8, 7, 10, 7, 8, 10, 5, 9, 10, 10, 10, 9, 9, 10, 10,
      10, 10, 10, 9, 9, 10, 9, 9, 2, 9, 7, 10, 8, 8, 7, 10
    ];
    const metrics = computeDescriptiveStats(posttestData);

    expect(metrics.n).toBe(31);
    expect(metrics.mean).toBeGreaterThan(8.0);
    expect(metrics.shapiroWilk.isNormal).toBe(false);
    expect(metrics.shapiroWilk.pValue).toBeLessThan(0.05);
  });

  it('throws an error if sample size is strictly insufficient (N < 3)', () => {
    expect(() => computeDescriptiveStats([1, 2])).toThrowError(
      'Sample size insufficient for distribution testing'
    );
  });
});
