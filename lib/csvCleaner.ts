import { CleanedParticipant, RawSurveyRow, PairedParticipant } from '@/types/dataset';

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function computeNameSimilarity(nameA: string, nameB: string): number {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.90;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

export function parseSurveyCSV(rows: RawSurveyRow[], source: 'pre' | 'post'): {
  clean: CleanedParticipant[];
  quarantined: CleanedParticipant[];
} {
  const clean: CleanedParticipant[] = [];
  const quarantined: CleanedParticipant[] = [];

  rows.forEach((row, index) => {
    const rawName = (row['Nombre y apellido '] || row['Nombre y apellido'] || row['Nombre'] || '').trim();
    const rawScore = source === 'pre' 
      ? (row['Score'] || row['Puntuación'] || '') 
      : (row['Puntuación'] || row['Score'] || '');
    const rawGroup = row['A que listado Pertenece'] || 'Unknown';
    const timestamp = row['Timestamp'] || row['Marca temporal'] || '';

    // Anomaly Check: traps Row 27 with pasted algorithm questions and code blocks
    const isCorrupted = 
      rawName.length > 80 || 
      rawName.includes('def ') || 
      rawName.includes('return ') || 
      rawName.includes('\n');

    const scoreMatch = rawScore.match(/(\d+)/);
    const numericScore = scoreMatch ? parseInt(scoreMatch[1], 10) : NaN;

    const participant: CleanedParticipant = {
      id: `${source}-${index}`,
      originalName: rawName,
      normalizedName: normalizeName(rawName),
      group: rawGroup.includes('Listado 1') ? 'Listado 1' : rawGroup.includes('Listado 2') ? 'Listado 2' : 'Unknown',
      score: numericScore,
      timestamp,
      isFlaggedCorrupted: isCorrupted || isNaN(numericScore),
      corruptionReason: isCorrupted 
        ? 'Field length / algorithm questionnaire dump detected' 
        : isNaN(numericScore) 
          ? 'Invalid score format' 
          : undefined,
    };

    if (participant.isFlaggedCorrupted) {
      quarantined.push(participant);
    } else {
      clean.push(participant);
    }
  });

  return { clean, quarantined };
}

export function pairPreAndPost(
  preClean: CleanedParticipant[], 
  postClean: CleanedParticipant[]
): {
  paired: PairedParticipant[];
  unmatchedPre: CleanedParticipant[];
  unmatchedPost: CleanedParticipant[];
} {
  const paired: PairedParticipant[] = [];
  const usedPreIds = new Set<string>();
  const unmatchedPost: CleanedParticipant[] = [];

  postClean.forEach((post) => {
    let bestSim = 0;
    let bestMatch: CleanedParticipant | null = null;

    preClean.forEach((pre) => {
      if (usedPreIds.has(pre.id)) return;
      const sim = computeNameSimilarity(pre.originalName, post.originalName);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = pre;
      }
    });

    if (bestMatch && bestSim >= 0.78) {
      usedPreIds.add((bestMatch as CleanedParticipant).id);
      paired.push({
        preName: (bestMatch as CleanedParticipant).originalName,
        postName: post.originalName,
        similarity: Number(bestSim.toFixed(2)),
        group: post.group,
        preScore: (bestMatch as CleanedParticipant).score,
        postScore: post.score,
        delta: post.score - (bestMatch as CleanedParticipant).score,
      });
    } else {
      unmatchedPost.push(post);
    }
  });

  const unmatchedPre = preClean.filter((pre) => !usedPreIds.has(pre.id));

  return { paired, unmatchedPre, unmatchedPost };
}
