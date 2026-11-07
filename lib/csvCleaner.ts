import { CleanedParticipant, RawSurveyRow } from '@/types/dataset';

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseSurveyCSV(rows: RawSurveyRow[], source: 'pre' | 'post'): {
  clean: CleanedParticipant[];
  quarantined: CleanedParticipant[];
} {
  const clean: CleanedParticipant[] = [];
  const quarantined: CleanedParticipant[] = [];

  rows.forEach((row, index) => {
    const rawName = row['Nombre y apellido '] || row['Nombre y apellido'] || row['Nombre'] || '';
    const rawScore = source === 'pre' 
      ? (row['Score'] || row['Puntuación'] || '') 
      : (row['Puntuación'] || row['Score'] || '');
    const rawGroup = row['A que listado Pertenece'] || 'Unknown';
    const timestamp = row['Timestamp'] || row['Marca temporal'] || '';

    const isCorrupted = 
      rawName.length > 80 || 
      rawName.includes('def ') || 
      rawName.includes('return ') || 
      rawName.includes('\n');

    const scoreMatch = rawScore.match(/(\d+)/);
    const numericScore = scoreMatch ? parseInt(scoreMatch[1], 10) : NaN;

    const participant: CleanedParticipant = {
      id: `${source}-${index}`,
      originalName: rawName.trim(),
      normalizedName: normalizeName(rawName),
      group: rawGroup.includes('Listado 1') ? 'Listado 1' : rawGroup.includes('Listado 2') ? 'Listado 2' : 'Unknown',
      score: numericScore,
      timestamp,
      isFlaggedCorrupted: isCorrupted || isNaN(numericScore),
      corruptionReason: isCorrupted ? 'Field length / algorithm dump detected' : isNaN(numericScore) ? 'Invalid score format' : undefined
    };

    if (participant.isFlaggedCorrupted) {
      quarantined.push(participant);
    } else {
      clean.push(participant);
    }
  });

  return { clean, quarantined };
}
