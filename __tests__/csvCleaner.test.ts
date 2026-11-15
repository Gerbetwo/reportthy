import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeName,
  computeNameSimilarity,
  parseSurveyCSV,
  pairPreAndPost,
  inferDefaultCohortRole,
  extractUniqueGroups,
} from '@/lib/csvCleaner';
import {
  saveServerDatasetBundle,
  getServerDatasetBundle,
  saveServerJupyterResult,
  getServerJupyterResult,
  sanitizeSessionId,
  extractSessionId,
  clearSessionsForTesting,
  evictExpiredWorkspaces,
  loadWorkspaceFromDisk,
} from '@/lib/notebookStore';
import { RawSurveyRow, CleanedParticipant, JupyterExecutionResult } from '@/types/dataset';

describe('Data Ingestion & Pre-flight Sanitization Engine (lib/csvCleaner.ts)', () => {
  it('strips accents, diacritics, and whitespace irregularities', () => {
    const raw = '  Édgar   Eduardo Cháux   Flórez  ';
    const cleaned = normalizeName(raw);
    expect(cleaned).toBe('edgar eduardo chaux florez');
  });

  it('computes token-sorted Levenshtein similarity correctly for participant typos & transposed names', () => {
    const similarity = computeNameSimilarity('cristisn montenegro', 'cristian montenegro');
    expect(similarity).toBeGreaterThan(0.9);

    const transposedSim = computeNameSimilarity('Yama Alexander', 'Alexander Yama');
    expect(transposedSim).toBeGreaterThan(0.95);
  });

  it('parses numeric scores from formatted questionnaire strings', () => {
    const rawRows: RawSurveyRow[] = [
      {
        Timestamp: '9/19/2026 8:54:24',
        Score: '8 / 10',
        'Nombre y apellido ': 'Alexander Yama',
        'A que listado Pertenece': 'Listado 1',
      },
    ];
    const { clean, quarantined } = parseSurveyCSV(rawRows, 'pre');

    expect(quarantined).toHaveLength(0);
    expect(clean).toHaveLength(1);
    expect(clean[0].score).toBe(8);
    expect(clean[0].group).toBe('Listado 1');
    expect(clean[0].cohortRole).toBe('Control');
  });

  it('parses decimal scores with dots or commas from questionnaire strings', () => {
    const rawRows: RawSurveyRow[] = [
      {
        Timestamp: '9/19/2026 8:54:24',
        Score: '8.5 / 10',
        'Nombre y apellido ': 'Student One',
        'A que listado Pertenece': 'Listado 1',
      },
      {
        Timestamp: '9/19/2026 8:55:00',
        Score: '7,25 / 10',
        'Nombre y apellido ': 'Student Two',
        'A que listado Pertenece': 'Listado 1',
      },
      {
        Timestamp: '9/19/2026 8:56:00',
        Score: '9.8',
        'Nombre y apellido ': 'Student Three',
        'A que listado Pertenece': 'Listado 2',
      },
    ];
    const { clean, quarantined } = parseSurveyCSV(rawRows, 'pre');

    expect(quarantined).toHaveLength(0);
    expect(clean).toHaveLength(3);
    expect(clean[0].score).toBe(8.5);
    expect(clean[1].score).toBe(7.25);
    expect(clean[2].score).toBe(9.8);
  });

  it('QUARANTINE TRAP: detects and quarantines code block algorithm dumps', () => {
    const corruptedRows: RawSurveyRow[] = [
      {
        'Marca temporal': '7/11/2026 8:22:08',
        Puntuación: '10 / 10',
        'Nombre y apellido ':
          'El siguiente algoritmo: def es_primer_numero_par(numeros): if numeros[0] % 2 == 0: return True return False Se puede representar...',
        'A que listado Pertenece': 'Listado 1',
      },
      {
        'Marca temporal': '24/10/2026 8:08:20',
        Puntuación: '9 / 10',
        'Nombre y apellido ': 'Alexander Yama Rosero',
        'A que listado Pertenece': 'Listado 1',
      },
    ];

    const { clean, quarantined } = parseSurveyCSV(corruptedRows, 'post');

    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].corruptionReason).toContain('algorithm');
    expect(clean).toHaveLength(1);
    expect(clean[0].originalName).toBe('Alexander Yama Rosero');
  });

  it('longitudinally pairs pretest and posttest respondents globally and computes score deltas', () => {
    const preClean: CleanedParticipant[] = [
      {
        id: 'pre-1',
        originalName: 'Alexander Yamá Rosero',
        normalizedName: 'alexander yama rosero',
        group: 'Listado 1',
        cohortRole: 'Control',
        score: 3,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
      {
        id: 'pre-2',
        originalName: 'Darwin Meneses',
        normalizedName: 'darwin meneses',
        group: 'Listado 1',
        cohortRole: 'Control',
        score: 2,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
    ];

    const postClean: CleanedParticipant[] = [
      {
        id: 'post-1',
        originalName: 'Alexander Yama Rosero',
        normalizedName: 'alexander yama rosero',
        group: 'Listado 1',
        cohortRole: 'Control',
        score: 8,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
      {
        id: 'post-2',
        originalName: 'Darwin Meneses',
        normalizedName: 'darwin meneses',
        group: 'Listado 1',
        cohortRole: 'Control',
        score: 10,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
    ];

    const { paired, unmatchedPost } = pairPreAndPost(preClean, postClean);

    expect(unmatchedPost).toHaveLength(0);
    expect(paired).toHaveLength(2);
    expect(paired[0].delta).toBe(5);
    expect(paired[0].cohortRole).toBe('Control');
    expect(paired[1].delta).toBe(8);
  });

  it('computes attrition strictly by contrasting Pretest vs Posttest CSVs (no external roster)', () => {
    const mk = (id: string, name: string, score: number): CleanedParticipant => ({
      id,
      originalName: name,
      normalizedName: name.toLowerCase(),
      group: 'Listado 1',
      cohortRole: 'Control',
      score,
      timestamp: '',
      isFlaggedCorrupted: false,
    });
    const preClean = [
      mk('pre-1', 'Alexander Yama', 3),
      mk('pre-2', 'Darwin Meneses', 2),
      mk('pre-3', 'Laura Ortiz', 1),
      mk('pre-4', 'Sofia Rivas', 2),
    ];
    const postClean = [
      mk('post-1', 'Alexander Yama', 8),
      mk('post-2', 'Darwin Meneses', 9),
      mk('post-3', 'Unrelated Person', 7),
    ];

    const { attritionAnalysis } = pairPreAndPost(preClean, postClean);

    expect(attritionAnalysis).toEqual({
      preCount: 4,
      postCount: 3,
      pairedCount: 2,
      unmatchedPreCount: 2,
      unmatchedPostCount: 1,
      attritionCount: 2,
      attritionRate: 50,
      unmatchedPreNames: ['Laura Ortiz', 'Sofia Rivas'],
    });
  });

  it('returns a zero attrition rate for an empty pretest', () => {
    expect(pairPreAndPost([], []).attritionAnalysis.attritionRate).toBe(0);
  });

  it('infers default cohort roles for custom pedagogical interventions ("Guía PDF" vs "Gamificación", "Master Class" vs "IA Generativa")', () => {
    expect(inferDefaultCohortRole('Guía PDF')).toBe('Control');
    expect(inferDefaultCohortRole('Gamificación')).toBe('Experimental');
    expect(inferDefaultCohortRole('Master Class')).toBe('Control');
    expect(inferDefaultCohortRole('IA Generativa')).toBe('Experimental');
    expect(inferDefaultCohortRole('Tradicional')).toBe('Control');
    expect(inferDefaultCohortRole('Grupo IA')).toBe('Experimental');
    expect(inferDefaultCohortRole('Listado 1')).toBe('Control');
    expect(inferDefaultCohortRole('Listado 2')).toBe('Experimental');

    // Distinct groups fallback
    expect(inferDefaultCohortRole('Cohort Alpha', ['Cohort Alpha', 'Cohort Beta'])).toBe(
      'Control'
    );
    expect(inferDefaultCohortRole('Cohort Beta', ['Cohort Alpha', 'Cohort Beta'])).toBe(
      'Experimental'
    );

    // More than 2 arbitrary groups fall back to Unassigned
    expect(
      inferDefaultCohortRole('Cohort Gamma', ['Cohort Alpha', 'Cohort Beta', 'Cohort Gamma'])
    ).toBe('Unassigned');
  });

  it('extracts unique sorted groups across pre and post datasets', () => {
    const pre: CleanedParticipant[] = [
      {
        id: '1',
        originalName: 'A',
        normalizedName: 'a',
        group: 'Gamificación',
        cohortRole: 'Experimental',
        score: 10,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
      {
        id: '2',
        originalName: 'B',
        normalizedName: 'b',
        group: 'Guía PDF',
        cohortRole: 'Control',
        score: 8,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
    ];
    const post: CleanedParticipant[] = [
      {
        id: '3',
        originalName: 'C',
        normalizedName: 'c',
        group: 'Guía PDF',
        cohortRole: 'Control',
        score: 12,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
      {
        id: '4',
        originalName: 'D',
        normalizedName: 'd',
        group: 'Taller Extra',
        cohortRole: 'Unassigned',
        score: 14,
        timestamp: '',
        isFlaggedCorrupted: false,
      },
    ];

    const unique = extractUniqueGroups(pre, post);
    expect(unique).toEqual(['Gamificación', 'Guía PDF', 'Taller Extra']);
  });

  it('supports English and Spanish headers and maps cohort roles via custom cohortMapping', () => {
    const rows: RawSurveyRow[] = [
      {
        Name: 'Ada Lovelace',
        Score: '19',
        Group: 'Custom Alpha',
      },
      {
        Student: 'Charles Babbage',
        Nota: '15',
        Cohort: 'Custom Beta',
      },
    ];

    const { clean } = parseSurveyCSV(rows, 'pre', {
      'Custom Alpha': 'Control',
      'Custom Beta': 'Experimental',
    });

    expect(clean).toHaveLength(2);
    expect(clean[0].originalName).toBe('Ada Lovelace');
    expect(clean[0].group).toBe('Custom Alpha');
    expect(clean[0].cohortRole).toBe('Control');
    expect(clean[0].score).toBe(19);

    expect(clean[1].originalName).toBe('Charles Babbage');
    expect(clean[1].group).toBe('Custom Beta');
    expect(clean[1].cohortRole).toBe('Experimental');
    expect(clean[1].score).toBe(15);
  });

  it('automatically infers Control and Experimental roles across arbitrary two-cohort CSVs without manual cohortMapping', () => {
    const preRows: RawSurveyRow[] = [
      { Name: 'Alice', Score: '4', Group: 'Section A' },
      { Name: 'Bob', Score: '5', Group: 'Section B' },
    ];
    const postRows: RawSurveyRow[] = [
      { Name: 'Alice', Score: '7', Group: 'Section A' },
      { Name: 'Bob', Score: '9', Group: 'Section B' },
    ];

    const parsedPre = parseSurveyCSV(preRows, 'pre');
    const parsedPost = parseSurveyCSV(postRows, 'post');
    const { paired } = pairPreAndPost(parsedPre.clean, parsedPost.clean);

    expect(parsedPre.clean[0].cohortRole).toBe('Control');
    expect(parsedPre.clean[1].cohortRole).toBe('Experimental');
    expect(paired).toHaveLength(2);
    expect(paired[0].cohortRole).toBe('Control');
    expect(paired[1].cohortRole).toBe('Experimental');

    // Also verifies standard Control vs Treatment / asymmetric labels
    const treatmentRows: RawSurveyRow[] = [
      { Name: 'Student 1', Score: '6', Group: 'Control' },
      { Name: 'Student 2', Score: '8', Group: 'Treatment' },
    ];
    const parsedTreatment = parseSurveyCSV(treatmentRows, 'pre');
    expect(parsedTreatment.clean[0].cohortRole).toBe('Control');
    expect(parsedTreatment.clean[1].cohortRole).toBe('Experimental');
  });
});

describe('Multi-Coworker Session Isolation (lib/notebookStore.ts)', () => {
  beforeEach(() => {
    clearSessionsForTesting();
  });

  it('sanitizes session IDs and handles illegal characters with safe fallback', () => {
    expect(sanitizeSessionId('team-alpha_123')).toBe('team-alpha_123');
    expect(sanitizeSessionId('user/../../etc/passwd')).toBe('useretcpasswd');
    expect(sanitizeSessionId('   ')).toBe('default-workspace');
    expect(sanitizeSessionId('')).toBe('default-workspace');
    expect(sanitizeSessionId(undefined)).toBe('default-workspace');
  });

  it('extracts session ID from URL query parameters, headers, and request body', () => {
    expect(extractSessionId({ nextUrl: { searchParams: new URLSearchParams('sessionId=lab-42') } })).toBe(
      'lab-42'
    );
    expect(
      extractSessionId({
        headers: { get: (k: string) => (k === 'x-reportthy-session' ? 'header-session' : null) },
      })
    ).toBe('header-session');
    expect(extractSessionId(null, { sessionId: 'body-session' })).toBe('body-session');
    expect(extractSessionId()).toBe('default-workspace');
  });

  it('completely isolates concurrent user sessions (no cross-contamination of datasets or results)', () => {
    const makeParticipant = (id: string, name: string, group: string): CleanedParticipant => ({
      id,
      originalName: name,
      normalizedName: name.toLowerCase(),
      group,
      cohortRole: 'Control',
      score: 10,
      timestamp: '',
      isFlaggedCorrupted: false,
    });

    // Coworker A working on Linux study
    saveServerDatasetBundle(
      {
        sessionId: 'session-linux',
        preClean: [makeParticipant('p1', 'Alice Linux', 'Guía PDF')],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      'session-linux'
    );

    // Coworker B working on Quantum study
    saveServerDatasetBundle(
      {
        sessionId: 'session-quantum',
        preClean: [makeParticipant('p2', 'Bob Quantum', 'Master Class')],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      'session-quantum'
    );

    const bundleLinux = getServerDatasetBundle('session-linux');
    const bundleQuantum = getServerDatasetBundle('session-quantum');

    expect(bundleLinux?.preClean[0].originalName).toBe('Alice Linux');
    expect(bundleQuantum?.preClean[0].originalName).toBe('Bob Quantum');

    // Results isolation
    const mockResultA: JupyterExecutionResult = {
      executedAt: '2026-11-14T10:00:00Z',
      kernelInfo: 'Kernel A',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      preMetrics: {
        n: 10,
        mean: 5,
        variance: 1,
        stdDev: 1,
        median: 5,
        iqr: 1,
        skewness: 0,
        kurtosis: 0,
        shapiroWilk: { statistic: 0.98, pValue: 0.8, isNormal: true },
      },
      postMetrics: {
        n: 10,
        mean: 8,
        variance: 1,
        stdDev: 1,
        median: 8,
        iqr: 1,
        skewness: 0,
        kurtosis: 0,
        shapiroWilk: { statistic: 0.98, pValue: 0.8, isNormal: true },
      },
      wilcoxon: {
        testName: 'Wilcoxon',
        statisticName: 'W',
        statisticValue: 10,
        zValue: 2.5,
        pValue: 0.01,
        effectSize: 0.7,
        interpretation: 'Significant gain',
        isSignificant: true,
        alternative: 'greater',
        n1: 10,
      },
      mannWhitney: {
        testName: 'Mann-Whitney',
        statisticName: 'U',
        statisticValue: 20,
        zValue: 1.8,
        pValue: 0.07,
        effectSize: 0.4,
        interpretation: 'Borderline',
        isSignificant: false,
        alternative: 'greater',
        n1: 5,
        n2: 5,
      },
      hypothesisConfirmed: true,
      executedCodeCells: [],
    };

    saveServerJupyterResult(mockResultA, 'session-linux');
    expect(getServerJupyterResult('session-linux')?.kernelInfo).toBe('Kernel A');
    expect(getServerJupyterResult('session-quantum')).toBeNull();
  });

  it('evicts workspaces older than 24 hours during automatic TTL cleanup', () => {
    const sessions = new Map();
    const staleTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const freshTime = new Date().toISOString();

    sessions.set('stale-session', {
      sessionId: 'stale-session',
      updatedAt: staleTime,
      preClean: [],
      postClean: [],
      pairedData: [],
      quarantined: [],
      attritionAnalysis: null,
    });
    sessions.set('fresh-session', {
      sessionId: 'fresh-session',
      updatedAt: freshTime,
      preClean: [],
      postClean: [],
      pairedData: [],
      quarantined: [],
      attritionAnalysis: null,
    });

    evictExpiredWorkspaces(sessions);

    expect(sessions.has('stale-session')).toBe(false);
    expect(sessions.has('fresh-session')).toBe(true);
  });

  it('persists and hydrates session workspace snapshots from disk across simulated restarts', () => {
    const testSessionId = 'simulated-restart-session';
    const sampleParticipant: CleanedParticipant = {
      id: 'p-disk-1',
      originalName: 'Disk Persisted Student',
      normalizedName: 'disk persisted student',
      group: 'Grupo Experimental',
      cohortRole: 'Experimental',
      score: 9.5,
      timestamp: '2026-11-14T12:00:00Z',
      isFlaggedCorrupted: false,
    };

    saveServerDatasetBundle(
      {
        sessionId: testSessionId,
        preClean: [sampleParticipant],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      testSessionId
    );

    // Verify snapshot was written to disk
    const diskLoaded = loadWorkspaceFromDisk(testSessionId);
    expect(diskLoaded).not.toBeNull();
    expect(diskLoaded?.preClean[0].originalName).toBe('Disk Persisted Student');

    // Retrieve via getServerDatasetBundle
    const rehydrated = getServerDatasetBundle(testSessionId);
    expect(rehydrated?.preClean[0].originalName).toBe('Disk Persisted Student');
  });
});
