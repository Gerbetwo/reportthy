import { describe, it, expect } from 'vitest';
import { generateIpynbJson } from '@/lib/statsEngine';
import {
  PairedParticipant,
  CleanedParticipant,
  AttritionAnalysis,
  StudyMetadata,
} from '@/types/dataset';

describe('Jupyter Notebook Generator (lib/statsEngine.ts)', () => {
  const paired: PairedParticipant[] = [
    { preName: 'Alexander Yama', postName: 'Alexander Yama', similarity: 1, group: 'Listado 1', cohortRole: 'Control', preScore: 3, postScore: 8, delta: 5 },
    { preName: 'Darwin Meneses', postName: 'Darwin Meneses', similarity: 0.95, group: 'Listado 2', cohortRole: 'Experimental', preScore: 2, postScore: 10, delta: 8 },
  ];
  const preClean: CleanedParticipant[] = [
    { id: 'pre-1', originalName: 'Alexander Yama', normalizedName: 'alexander yama', group: 'Listado 1', cohortRole: 'Control', score: 3, timestamp: '', isFlaggedCorrupted: false },
    { id: 'pre-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 2', cohortRole: 'Experimental', score: 2, timestamp: '', isFlaggedCorrupted: false },
  ];
  const postClean: CleanedParticipant[] = [
    { id: 'post-1', originalName: 'Alexander Yama', normalizedName: 'alexander yama', group: 'Listado 1', cohortRole: 'Control', score: 8, timestamp: '', isFlaggedCorrupted: false },
    { id: 'post-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 2', cohortRole: 'Experimental', score: 10, timestamp: '', isFlaggedCorrupted: false },
  ];
  const quarantined: CleanedParticipant[] = [
    { id: 'q-1', originalName: 'import sys', normalizedName: '', group: 'Unknown', cohortRole: 'Unassigned', score: 0, timestamp: '', isFlaggedCorrupted: true, corruptionReason: 'Code block detected' }
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

  it('generates a valid, multi-cell .ipynb v4 JSON with scipy/numpy verification cells and embedded vectors', () => {
    const customBaseUrl = 'http://jupyter-internal-host:3000';
    const ipynbStr = generateIpynbJson(paired, preClean, postClean, quarantined, attrition, 'greater', 0.05, customBaseUrl);
    const parsed = JSON.parse(ipynbStr);

    expect(parsed.nbformat).toBe(4);
    expect(parsed.cells).toHaveLength(6);
    expect(parsed.cells[0].cell_type).toBe('markdown');
    expect(parsed.cells[1].cell_type).toBe('code');

    const cell2Source = parsed.cells[1].source.join('');
    expect(cell2Source).toContain('fallback_paired');
    expect(cell2Source).toContain('Alexander Yama');
    expect(cell2Source).toContain('quarantined_count = 1');
    expect(cell2Source).toContain(`DATASET_API_URL = "${customBaseUrl}/api/notebook/dataset"`);

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
    expect(cell5Source).toContain('exp_deltas = [float(p["delta"]) for p in paired_records if p.get("cohortRole") == "Experimental"]');
    expect(cell5Source).toContain('ctrl_deltas = [float(p["delta"]) for p in paired_records if p.get("cohortRole") == "Control"]');

    const cell6Source = parsed.cells[5].source.join('');
    expect(cell6Source).toContain('hypothesis_confirmed');
    expect(cell6Source).toContain('reportthy_results');
    expect(cell6Source).toContain(`${customBaseUrl}/api/notebook/results`);
    expect(cell6Source).toContain('__REPORTTHY_JSON_START__');
    expect(cell6Source).toContain('reportthy_results_default-workspace.json');
    expect(cell6Source).toContain('"sessionId": "default-workspace"');

    // Asserts clean, standard Python without Pyodide browser hacks
    expect(ipynbStr).not.toMatch(/\bimport\s+js\b/);
    expect(ipynbStr).not.toContain('pyodide.http');
    expect(ipynbStr).not.toContain('postMessage');
  });

  it('parameterizes the notebook with custom StudyMetadata and isolated sessionId', () => {
    const customBaseUrl = 'http://jupyter-internal-host:3000';
    const studyMetadata: StudyMetadata = {
      studyTitle: 'Gamified Learning of Basic Linux Commands',
      topicDomain: 'Linux Command-Line Administration',
      controlPedagogy: 'Self-paced PDF study guide',
      experimentalPedagogy: 'Gamified interactive terminal challenges',
      hypothesisStatement: 'Gamified challenges produce significantly higher gains than the PDF guide.',
      designMode: 'between_group',
      alpha: 0.01,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [
        { fullName: 'Linus Torvalds', email: 'linus@linuxfoundation.org', affiliation: 'Linux Foundation', country: 'USA' },
        { fullName: 'Ada Lovelace', email: 'ada@computing.org', affiliation: 'Babbage Analytical Engine', country: 'UK' },
      ],
      cohortMapping: { 'Listado 1': 'Control', 'Listado 2': 'Experimental' },
    };
    const sessionId = 'session-user-xyz';

    const ipynbStr = generateIpynbJson(
      paired,
      preClean,
      postClean,
      quarantined,
      attrition,
      'greater',
      0.05,
      customBaseUrl,
      studyMetadata,
      sessionId,
    );
    const parsed = JSON.parse(ipynbStr);

    // Cell 1: Custom Study Title, Domain, Authors, Pedagogies, and Design Mode
    const cell1Source = parsed.cells[0].source.join('');
    expect(cell1Source).toContain('# Gamified Learning of Basic Linux Commands');
    expect(cell1Source).toContain('Domain: Linux Command-Line Administration');
    expect(cell1Source).toContain('Linus Torvalds, Ada Lovelace');
    expect(cell1Source).toContain('Self-paced PDF study guide');
    expect(cell1Source).toContain('Gamified interactive terminal challenges');
    expect(cell1Source).toContain('Gamified challenges produce significantly higher gains than the PDF guide.');
    expect(cell1Source).toContain('between_group');
    expect(cell1Source).toContain('ALPHA = 0.01');

    // Cell 2: Session-scoped URL and header
    const cell2Source = parsed.cells[1].source.join('');
    expect(cell2Source).toContain(`DATASET_API_URL = "${customBaseUrl}/api/notebook/dataset?sessionId=session-user-xyz"`);
    expect(cell2Source).toContain('"x-reportthy-session": "session-user-xyz"');

    // Cell 4: Alpha 0.01
    const cell4Source = parsed.cells[3].source.join('');
    expect(cell4Source).toContain('ALPHA = 0.01');

    // Cell 5: Mann-Whitney alternative
    const cell5Source = parsed.cells[4].source.join('');
    expect(cell5Source).toContain("MANN_WHITNEY_ALTERNATIVE = 'greater'");

    // Cell 6: between_group hypothesis logic and session-scoped results API
    const cell6Source = parsed.cells[5].source.join('');
    expect(cell6Source).toContain('DESIGN_MODE = "between_group"');
    expect(cell6Source).toContain('hypothesis_confirmed = bool((u_p < ALPHA) and (u_z > 0))');
    expect(cell6Source).toContain(`RESULTS_API_URL = "${customBaseUrl}/api/notebook/results?sessionId=session-user-xyz"`);
    expect(cell6Source).toContain('"x-reportthy-session": "session-user-xyz"');
    expect(cell6Source).toContain('reportthy_results_session-user-xyz.json');
    expect(cell6Source).toContain('"sessionId": "session-user-xyz"');
  });

  it('evaluates combined design mode requiring both Wilcoxon and Mann-Whitney significance', () => {
    const studyMetadata: StudyMetadata = {
      studyTitle: 'Git AI Scaffolding Evaluation',
      topicDomain: 'Distributed Version Control',
      controlPedagogy: 'Demonstrative classroom lecture',
      experimentalPedagogy: 'Interactive AI tutor CLI',
      hypothesisStatement: 'Interactive AI tutor produces both longitudinal mastery and cohort superiority.',
      designMode: 'combined',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [{ fullName: 'Researcher One', email: 'r1@test.org', affiliation: 'University', country: 'Chile' }],
      cohortMapping: { 'Listado 1': 'Control', 'Listado 2': 'Experimental' },
    };

    const ipynbStr = generateIpynbJson(
      paired,
      preClean,
      postClean,
      quarantined,
      attrition,
      'greater',
      0.05,
      'http://localhost:3000',
      studyMetadata,
    );
    const parsed = JSON.parse(ipynbStr);

    const cell6Source = parsed.cells[5].source.join('');
    expect(cell6Source).toContain('DESIGN_MODE = "combined"');
    expect(cell6Source).toContain('hypothesis_confirmed = bool((w_p < ALPHA) and (w_z > 0) and (u_p < ALPHA) and (u_z > 0))');
  });
});
