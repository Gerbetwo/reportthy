import { describe, it, expect } from 'vitest';
import { 
  normalizeName, 
  computeNameSimilarity, 
  parseSurveyCSV, 
  pairPreAndPost 
} from '@/lib/csvCleaner';
import { RawSurveyRow, CleanedParticipant } from '@/types/dataset';

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
        'Timestamp': '9/19/2026 8:54:24',
        'Score': '8 / 10',
        'Nombre y apellido ': 'Alexander Yama',
        'A que listado Pertenece': 'Listado 1'
      }
    ];
    const { clean, quarantined } = parseSurveyCSV(rawRows, 'pre');

    expect(quarantined).toHaveLength(0);
    expect(clean).toHaveLength(1);
    expect(clean[0].score).toBe(8);
    expect(clean[0].group).toBe('Listado 1');
  });

  it('QUARANTINE TRAP: detects and quarantines code block algorithm dumps', () => {
    const corruptedRows: RawSurveyRow[] = [
      {
        'Marca temporal': '7/11/2026 8:22:08',
        'Puntuación': '10 / 10',
        'Nombre y apellido ': 'El siguiente algoritmo: def es_primer_numero_par(numeros): if numeros[0] % 2 == 0: return True return False Se puede representar...',
        'A que listado Pertenece': 'Listado 1'
      },
      {
        'Marca temporal': '24/10/2026 8:08:20',
        'Puntuación': '9 / 10',
        'Nombre y apellido ': 'Alexander Yama Rosero',
        'A que listado Pertenece': 'Listado 1'
      }
    ];

    const { clean, quarantined } = parseSurveyCSV(corruptedRows, 'post');

    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].corruptionReason).toContain('algorithm');
    expect(clean).toHaveLength(1);
    expect(clean[0].originalName).toBe('Alexander Yama Rosero');
  });

  it('longitudinally pairs pretest and posttest respondents globally and computes score deltas', () => {
    const preClean: CleanedParticipant[] = [
      { id: 'pre-1', originalName: 'Alexander Yamá Rosero', normalizedName: 'alexander yama rosero', group: 'Listado 1', score: 3, timestamp: '', isFlaggedCorrupted: false },
      { id: 'pre-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 1', score: 2, timestamp: '', isFlaggedCorrupted: false }
    ];

    const postClean: CleanedParticipant[] = [
      { id: 'post-1', originalName: 'Alexander Yama Rosero', normalizedName: 'alexander yama rosero', group: 'Listado 1', score: 8, timestamp: '', isFlaggedCorrupted: false },
      { id: 'post-2', originalName: 'Darwin Meneses', normalizedName: 'darwin meneses', group: 'Listado 1', score: 10, timestamp: '', isFlaggedCorrupted: false }
    ];

    const { paired, unmatchedPost } = pairPreAndPost(preClean, postClean);

    expect(unmatchedPost).toHaveLength(0);
    expect(paired).toHaveLength(2);
    expect(paired[0].delta).toBe(5);
    expect(paired[1].delta).toBe(8);
  });
});
