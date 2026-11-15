import { describe, it, expect } from 'vitest';
import { generateFullPaperLatex } from '@/lib/paperLatexTemplate';
import {
  DescriptiveMetrics,
  PairedParticipant,
  HypothesisTestResult,
  AttritionAnalysis,
  CleanedParticipant,
  JupyterExecutionResult,
  StudyMetadata,
} from '@/types/dataset';

const pre: DescriptiveMetrics = {
  n: 40, mean: 1.925, variance: 0.789, stdDev: 0.888, median: 2, iqr: 2, skewness: -0.541, kurtosis: -0.28,
  shapiroWilk: { statistic: 0.8533, pValue: 0.0001, isNormal: false }
};
const post: DescriptiveMetrics = {
  n: 31, mean: 8.323, variance: 4.826, stdDev: 2.197, median: 9, iqr: 2.5, skewness: -1.57, kurtosis: 1.9,
  shapiroWilk: { statistic: 0.7689, pValue: 0.00001, isNormal: false }
};

const makeWilcoxon = (isSignificant: boolean, zValue: number, pValue: number): HypothesisTestResult => ({
  testName: 'Within-Subject Longitudinal Paired Wilcoxon Signed-Rank Test',
  statisticName: 'W',
  statisticValue: 435,
  zValue,
  pValue,
  effectSize: 0.87,
  interpretation: '',
  isSignificant,
  alternative: 'greater',
  n1: 2
});

const mannWhitney: HypothesisTestResult = {
  testName: 'Between-Cohort Mann-Whitney U Test',
  statisticName: 'U',
  statisticValue: 98.5,
  zValue: 0.42,
  pValue: 0.672,
  effectSize: 0.08,
  interpretation: '',
  isSignificant: false,
  alternative: 'two-sided',
  n1: 1,
  n2: 1
};

const makeJupyterResult = (
  wilcoxonSig: boolean,
  wilcoxonZ: number,
  wilcoxonP: number,
  mannSig: boolean = false
): JupyterExecutionResult => ({
  executedAt: '2026-11-14T18:00:00.000Z',
  kernelInfo: 'Python 3.12.0 (linux) / Scipy 1.14.1 / Numpy 2.1.1',
  alpha: 0.05,
  wilcoxonAlternative: 'greater',
  preMetrics: pre,
  postMetrics: post,
  wilcoxon: makeWilcoxon(wilcoxonSig, wilcoxonZ, wilcoxonP),
  mannWhitney: { ...mannWhitney, isSignificant: mannSig },
  hypothesisConfirmed: wilcoxonSig && wilcoxonZ > 0,
  executedCodeCells: ['import scipy.stats', 'stats.wilcoxon(post, pre)'],
});

const paired: PairedParticipant[] = [
  { preName: 'Alexander Yama', postName: 'Alexander Yama', similarity: 1, group: 'Listado 1', cohortRole: 'Control', preScore: 3, postScore: 8, delta: 5 },
  { preName: 'Darwin Meneses', postName: 'Darwin Meneses', similarity: 0.92, group: 'Listado 2', cohortRole: 'Experimental', preScore: 2, postScore: 10, delta: 8 }
];

const attrition: AttritionAnalysis = {
  preCount: 40, postCount: 31, pairedCount: 29, unmatchedPreCount: 11, unmatchedPostCount: 2,
  attritionCount: 11, attritionRate: 27.5, unmatchedPreNames: []
};

const quarantined: CleanedParticipant[] = [
  {
    id: 'q1', originalName: 'def solve(): return 42', normalizedName: '', group: 'Unknown', cohortRole: 'Unassigned', score: 0, timestamp: '',
    isFlaggedCorrupted: true, corruptionReason: 'Code keyword detected'
  },
  {
    id: 'q2', originalName: 'import numpy', normalizedName: '', group: 'Unknown', cohortRole: 'Unassigned', score: 0, timestamp: '',
    isFlaggedCorrupted: true, corruptionReason: 'Code keyword detected'
  }
];

describe('Unified Springer Nature manuscript (lib/paperLatexTemplate.ts)', () => {
  it('renders unified sn-jnl output with QA metrics, Jupyter reproducibility metadata, descriptive and hypothesis tables, and student longtable', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined);

    expect(tex).toContain('\\documentclass[default,sn-basic]{sn-jnl}');
    ['booktabs', 'amsmath', 'longtable', 'graphicx'].forEach(pkg => expect(tex).toContain(`\\usepackage{${pkg}}`));
    expect(tex).toContain('\\label{tab:descriptive}');
    expect(tex).toContain('\\label{tab:hypothesis}');
    expect(tex).toContain('\\label{tab:student_roster}');
    expect(tex).toContain('\\begin{longtable}');
    expect(tex).toContain('1.925');
    expect(tex).toContain('8.323');
    expect(tex).toContain('2.197');
    expect(tex).toContain('Non-Normal');
    expect(tex).toContain("Student's $t$-tests are invalidated");
    expect(tex).toContain('Wilcoxon');
    expect(tex).toContain('Mann-Whitney');
    expect(tex).toContain('$U=98.500$');
    // QA & Jupyter reproducibility metrics
    expect(tex).toContain('quarantined 2 anomalous submissions');
    expect(tex).toContain('1 distinct corruption reasons');
    expect(tex).toContain('Code keyword detected');
    expect(tex).toContain('producing 2 matched participants');
    expect(tex).toContain('11 pretest respondents had no posttest counterpart');
    expect(tex).toContain('27.5\\%');
    expect(tex).toContain('Python 3.12.0');
    expect(tex).not.toMatch(/master roster|matrícula oficial|Excel|xlsx/i);
    // Student matrix
    expect(tex).toContain('Alexander Yama');
    expect(tex).toContain('+5');
    expect(tex).toContain('+8');
    expect(tex).toContain('92\\%');
    expect(tex).toContain('\\end{document}');
  });

  it('omits the student longtable when there are no paired participants', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, [], 'en');
    expect(tex).not.toContain('\\begin{longtable}');
  });

  it('concludes the hypothesis is corroborated when Wilcoxon is significant with a positive shift', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined);
    expect(tex).toContain('\\textbf{corroborates} the research hypothesis');
    expect(tex).toContain('Cohort gains were consistent');
    expect(tex).not.toContain('\\textbf{fails to corroborate}');
  });

  it('concludes the hypothesis is rejected when Wilcoxon is not significant', () => {
    const jupyterRes = makeJupyterResult(false, 0.8, 0.21);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined);
    expect(tex).toContain('\\textbf{fails to corroborate}');
    expect(tex).toContain('\\textbf{rejects}');
    expect(tex).toContain('no statistically significant instructional gain');
    expect(tex).not.toContain('\\textbf{corroborates}');
  });

  it('treats a significant but non-positive shift as not corroborating the hypothesis', () => {
    const jupyterRes = makeJupyterResult(true, -3.1, 0.002);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'en');
    expect(tex).toContain('\\textbf{fails to corroborate}');
  });

  it('renders in Spanish when lang = es', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'es', attrition, quarantined);
    expect(tex).toContain('Introducción y Marco Teórico');
    expect(tex).toContain('Materiales, Métodos y Aseguramiento de Calidad de Datos');
    expect(tex).toContain('No Normal');
    expect(tex).toContain('\\textbf{corrobora} la hipótesis');
    expect(tex).toContain('Estudiante & Grupo');

    const rejectedRes = makeJupyterResult(false, 0.5, 0.3);
    const rejected = generateFullPaperLatex(rejectedRes, paired, 'es');
    expect(rejected).toContain('\\textbf{no logra corroborar}');
    expect(rejected).toContain('\\textbf{rechaza}');
  });

  it('escapes LaTeX special characters in participant names', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, [
      { ...paired[0], preName: 'A_B & C%' }
    ], 'en');
    expect(tex).toContain('A\\_B \\& C\\%');
  });

  it('successfully compiles the generated manuscript to a valid PDF via pdflatex', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportthy-test-pdf-'));
    try {
      const clsSource = path.join(process.cwd(), 'lib', 'tex', 'sn-jnl.cls');
      fs.copyFileSync(clsSource, path.join(tmpDir, 'sn-jnl.cls'));
      fs.writeFileSync(path.join(tmpDir, 'paper.tex'), tex, 'utf-8');

      await execFileAsync(
        'pdflatex',
        ['-interaction=nonstopmode', '-no-shell-escape', '-output-directory=' + tmpDir, path.join(tmpDir, 'paper.tex')],
        { timeout: 15000 }
      );
      expect(fs.existsSync(path.join(tmpDir, 'paper.pdf'))).toBe(true);
      expect(fs.statSync(path.join(tmpDir, 'paper.pdf')).size).toBeGreaterThan(1000);

      // Verify Spanish compilation
      fs.writeFileSync(path.join(tmpDir, 'paper_es.tex'), generateFullPaperLatex(jupyterRes, paired, 'es', attrition, quarantined), 'utf-8');
      await execFileAsync(
        'pdflatex',
        ['-interaction=nonstopmode', '-no-shell-escape', '-output-directory=' + tmpDir, path.join(tmpDir, 'paper_es.tex')],
        { timeout: 15000 }
      );
      expect(fs.existsSync(path.join(tmpDir, 'paper_es.pdf'))).toBe(true);
      expect(fs.statSync(path.join(tmpDir, 'paper_es.pdf')).size).toBeGreaterThan(1000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('API route POST /api/compile-pdf returns inline PDF with telemetry header and structured error on syntax error', async () => {
    const { POST } = await import('@/app/api/compile-pdf/route');

    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const validTex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined);

    // 1. Success test
    const req = new Request('http://localhost:3000/api/compile-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latexContent: validTex }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('inline');
    expect(res.headers.get('X-Compile-Time-Ms')).toBeTruthy();

    // 2. Syntax error test
    const brokenTex = validTex.replace('\\begin{document}', '\\begin{document}\n\\undefinedCommandHere');
    const errReq = new Request('http://localhost:3000/api/compile-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latexContent: brokenTex }),
    });
    const errRes = await POST(errReq);
    expect(errRes.status).toBe(422);
    const errJson = await errRes.json();
    expect(errJson.error).toBe('LaTeX typesetting failure.');
    expect(errJson.details).toContain('undefinedCommandHere');
    expect(typeof errJson.line).toBe('number');
    expect(errJson.rawLog).toContain('Undefined control sequence');
  });

  it('renders custom StudyMetadata with multi-author blocks, affiliations, topic domain, and pedagogies', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const studyMetadata: StudyMetadata = {
      studyTitle: 'Gamified Linux Terminal Instruction',
      topicDomain: 'Linux Command-Line Administration',
      controlPedagogy: 'Self-paced PDF study guide',
      experimentalPedagogy: 'Interactive shell challenges',
      hypothesisStatement: 'Gamified interactive challenges lead to superior command retention.',
      designMode: 'between_group',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [
        { fullName: 'Linus Torvalds', email: 'linus@linuxfoundation.org', affiliation: 'Linux Foundation', country: 'USA' },
        { fullName: 'Grace Hopper', email: 'grace@navy.mil', affiliation: 'Naval Academy', country: 'USA' },
      ],
      cohortMapping: { 'Listado 1': 'Control', 'Listado 2': 'Experimental' },
    };

    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined, studyMetadata);

    expect(tex).toContain('\\author*[1]{\\fnm{Linus} \\sur{Torvalds}}\\email{linus@linuxfoundation.org}');
    expect(tex).toContain('\\affil*[1]{\\orgname{Linux Foundation}, \\orgaddress{\\country{USA}}}');
    expect(tex).toContain('\\author[2]{\\fnm{Grace} \\sur{Hopper}}\\email{grace@navy.mil}');
    expect(tex).toContain('\\affil[2]{\\orgname{Naval Academy}, \\orgaddress{\\country{USA}}}');
    expect(tex).toContain('Gamified Linux Terminal Instruction');
    expect(tex).toContain('Linux Command-Line Administration');
    expect(tex).toContain('Self-paced PDF study guide');
    expect(tex).toContain('Interactive shell challenges');
  });

  it('escapes LaTeX special characters in study metadata fields', () => {
    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001);
    const studyMetadata: StudyMetadata = {
      studyTitle: 'Analysis of 100% Rust & C_++ Performance #1',
      topicDomain: 'Systems & Tools',
      controlPedagogy: 'Textbooks & Guides ($50)',
      experimentalPedagogy: 'Live Coding & 100% AI_Assistance',
      hypothesisStatement: 'AI_Assistance yields > 50% gain & efficiency #1.',
      designMode: 'within_subject',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [
        { fullName: 'Alice & Bob_Smith', email: 'alice_bob@test.com', affiliation: 'Dept of CS & IT', country: 'US_A' },
      ],
      cohortMapping: {},
    };

    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined, studyMetadata);

    expect(tex).toContain('100\\% Rust \\& C\\_++ Performance \\#1');
    expect(tex).toContain('Systems \\& Tools');
    expect(tex).toContain('Textbooks \\& Guides (\\$50)');
    expect(tex).toContain('Live Coding \\& 100\\% AI\\_Assistance');
    expect(tex).toContain('AI\\_Assistance yields > 50\\% gain \\& efficiency \\#1.');
    expect(tex).toContain('\\fnm{Alice \\&} \\sur{Bob\\_Smith}');
    expect(tex).toContain('alice\\_bob@test.com');
    expect(tex).toContain('Dept of CS \\& IT');
    expect(tex).toContain('US\\_A');
  });

  it('formats conclusions according to experimental design modes (between_group and combined)', () => {
    const metaBetween: StudyMetadata = {
      studyTitle: 'Between Group Study',
      topicDomain: 'Testing',
      controlPedagogy: 'Control',
      experimentalPedagogy: 'Experimental',
      hypothesisStatement: 'Exp > Ctrl',
      designMode: 'between_group',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [],
      cohortMapping: {},
    };

    // 1. Between-group confirmed
    const jupyterBetweenConf = { ...makeJupyterResult(true, 3.5, 0.001, true), hypothesisConfirmed: true };
    const texBetweenConf = generateFullPaperLatex(jupyterBetweenConf, paired, 'en', attrition, quarantined, metaBetween);
    expect(texBetweenConf).toContain('\\textbf{corroborates}');
    expect(texBetweenConf).toContain('superior gain over the control cohort');

    // 2. Between-group rejected
    const jupyterBetweenRej = { ...makeJupyterResult(true, 3.5, 0.001, false), hypothesisConfirmed: false };
    const texBetweenRej = generateFullPaperLatex(jupyterBetweenRej, paired, 'en', attrition, quarantined, metaBetween);
    expect(texBetweenRej).toContain('\\textbf{fails to corroborate}');
    expect(texBetweenRej).toContain('no statistically significant experimental cohort superiority was corroborated');

    // 3. Combined confirmed
    const metaCombined: StudyMetadata = { ...metaBetween, designMode: 'combined' };
    const jupyterCombinedConf = { ...makeJupyterResult(true, 3.5, 0.001, true), hypothesisConfirmed: true };
    const texCombinedConf = generateFullPaperLatex(jupyterCombinedConf, paired, 'en', attrition, quarantined, metaCombined);
    expect(texCombinedConf).toContain('\\textbf{corroborates}');
    expect(texCombinedConf).toContain('both a statistically significant longitudinal gain');
    expect(texCombinedConf).toContain('statistically significant between-cohort superiority');

    // 4. Combined rejected
    const jupyterCombinedRej = { ...makeJupyterResult(true, 3.5, 0.001, false), hypothesisConfirmed: false };
    const texCombinedRej = generateFullPaperLatex(jupyterCombinedRej, paired, 'en', attrition, quarantined, metaCombined);
    expect(texCombinedRej).toContain('\\textbf{fails to corroborate}');
    expect(texCombinedRej).toContain('the dual criteria for combined significance was not met');
  });

  it('successfully compiles a custom-parameterized manuscript with escaped special characters via pdflatex', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const jupyterRes = makeJupyterResult(true, 4.2, 0.00001, true);
    const studyMetadata: StudyMetadata = {
      studyTitle: 'Gamified Linux Terminal & Shell Commands Evaluation',
      topicDomain: 'Operating Systems & Scripting',
      controlPedagogy: 'PDF Guide & Static Slides',
      experimentalPedagogy: 'Gamified Challenges & Interactive Feedback',
      hypothesisStatement: 'Interactive challenges produce > 25% gain & cohort superiority.',
      designMode: 'combined',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      mannWhitneyAlternative: 'greater',
      authors: [
        { fullName: 'Linus Torvalds', email: 'linus@linuxfoundation.org', affiliation: 'Linux Foundation & Kernel Dept', country: 'USA' },
        { fullName: 'Ada Lovelace', email: 'ada@computing.org', affiliation: 'Babbage Analytical Engine', country: 'UK' }
      ],
      cohortMapping: { 'Listado 1': 'Control', 'Listado 2': 'Experimental' },
    };

    const tex = generateFullPaperLatex(jupyterRes, paired, 'en', attrition, quarantined, studyMetadata);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportthy-test-custom-pdf-'));
    try {
      const clsSource = path.join(process.cwd(), 'lib', 'tex', 'sn-jnl.cls');
      fs.copyFileSync(clsSource, path.join(tmpDir, 'sn-jnl.cls'));
      fs.writeFileSync(path.join(tmpDir, 'paper_custom.tex'), tex, 'utf-8');

      await execFileAsync(
        'pdflatex',
        ['-interaction=nonstopmode', '-no-shell-escape', '-output-directory=' + tmpDir, path.join(tmpDir, 'paper_custom.tex')],
        { timeout: 15000 }
      );
      expect(fs.existsSync(path.join(tmpDir, 'paper_custom.pdf'))).toBe(true);
      expect(fs.statSync(path.join(tmpDir, 'paper_custom.pdf')).size).toBeGreaterThan(1000);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
