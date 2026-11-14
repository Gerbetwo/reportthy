import { describe, it, expect } from 'vitest';
import { generateIpynbJson, computeScoreHistogram } from '@/lib/statsEngine';
import { PairedParticipant, CleanedParticipant, AttritionAnalysis } from '@/types/dataset';

describe('Jupyter Notebook Generator & Visual Histogram Engine (lib/statsEngine.ts)', () => {
  it('generates a valid, multi-cell .ipynb v4 JSON with scipy/numpy verification cells and embedded vectors', () => {
    const paired: PairedParticipant[] = [
      { preName: 'Alexander Yama', postName: 'Alexander Yama', similarity: 1, group: 'Listado 1', preScore: 3, postScore: 8, delta: 5 },
      { preName: 'Darwin Meneses', postName: 'Darwin Meneses', similarity: 0.95, group: 'Listado 2', preScore: 2, postScore: 10, delta: 8 },
    ];
    const preClean: CleanedParticipant[] = [
      { id: 'pre-1', originalName: 'Alexander Yama', normalizedName: 'alexander yama', group: 'Listado 1', score: 3, timestamp: '', isFlaggedCorrupted: false },
      { id: 'pre-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 2', score: 2, timestamp: '', isFlaggedCorrupted: false },
    ];
    const postClean: CleanedParticipant[] = [
      { id: 'post-1', originalName: 'Alexander Yama', normalizedName: 'alexander yama', group: 'Listado 1', score: 8, timestamp: '', isFlaggedCorrupted: false },
      { id: 'post-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 2', score: 10, timestamp: '', isFlaggedCorrupted: false },
    ];
    const quarantined: CleanedParticipant[] = [
      { id: 'q-1', originalName: 'import sys', normalizedName: '', group: 'Unknown', score: 0, timestamp: '', isFlaggedCorrupted: true, corruptionReason: 'Code block detected' }
    ];
    const attrition: AttritionAnalysis = {
      preCount: 2,
      postCount: 2,
      pairedCount: 2,
      unmatchedPreCount: 0,
      unmatchedPostCount: 0,
      attritionCount: 0,
      attritionRate: 0.0,
      unmatchedPreNames: [],
    };

    const ipynbStr = generateIpynbJson(paired, preClean, postClean, quarantined, attrition, 'greater', 0.05);
    const parsed = JSON.parse(ipynbStr);

    expect(parsed.nbformat).toBe(4);
    expect(parsed.cells).toHaveLength(6);
    expect(parsed.cells[0].cell_type).toBe('markdown');
    expect(parsed.cells[1].cell_type).toBe('code');

    const cell2Source = parsed.cells[1].source.join('');
    expect(cell2Source).toContain('fallback_paired');
    expect(cell2Source).toContain('Alexander Yama');
    expect(cell2Source).toContain('quarantined_count = 1');

    const cell3Source = parsed.cells[2].source.join('');
    expect(cell3Source).toContain('stats.shapiro');
    expect(cell3Source).toContain('np.mean');
    expect(cell3Source).toContain('compute_descriptive_and_normality');

    const cell4Source = parsed.cells[3].source.join('');
    expect(cell4Source).toContain('stats.wilcoxon');
    expect(cell4Source).toContain('ALPHA = 0.05');
    expect(cell4Source).toContain("WILCOXON_ALTERNATIVE = 'greater'");

    const cell5Source = parsed.cells[4].source.join('');
    expect(cell5Source).toContain('stats.mannwhitneyu');
    expect(cell5Source).toContain('Listado 1');
    expect(cell5Source).toContain('Listado 2');

    const cell6Source = parsed.cells[5].source.join('');
    expect(cell6Source).toContain('hypothesis_confirmed');
    expect(cell6Source).toContain('reportthy_results');
    expect(cell6Source).toContain('REPORTTHY_JUPYTER_RESULTS');
    expect(cell6Source).toContain('__REPORTTHY_JSON_START__');
  });

  it('computes 0-10 frequency bins for visual distribution histograms without external dependencies', () => {
    const pre: CleanedParticipant[] = [
      { id: '1', originalName: 'A', normalizedName: 'a', group: 'Listado 1', score: 2, timestamp: '', isFlaggedCorrupted: false },
      { id: '2', originalName: 'B', normalizedName: 'b', group: 'Listado 2', score: 2, timestamp: '', isFlaggedCorrupted: false },
      { id: '3', originalName: 'C', normalizedName: 'c', group: 'Listado 1', score: 5, timestamp: '', isFlaggedCorrupted: false }
    ];
    const post: CleanedParticipant[] = [
      { id: '4', originalName: 'A', normalizedName: 'a', group: 'Listado 1', score: 9, timestamp: '', isFlaggedCorrupted: false },
      { id: '5', originalName: 'B', normalizedName: 'b', group: 'Listado 2', score: 10, timestamp: '', isFlaggedCorrupted: false }
    ];

    const bins = computeScoreHistogram(pre, post);
    expect(bins).toHaveLength(11);
    expect(bins[2].preCount).toBe(2);
    expect(bins[2].g1PreCount).toBe(1);
    expect(bins[2].g2PreCount).toBe(1);
    expect(bins[5].preCount).toBe(1);
    expect(bins[9].postCount).toBe(1);
    expect(bins[10].postCount).toBe(1);
  });
});
