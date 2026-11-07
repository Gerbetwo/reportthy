'use client';
import {
  CleanedParticipant,
  RawSurveyRow,
  PairedParticipant,
  AttendanceRecord,
  AttritionAnalysis,
} from "@/types/dataset";
import * as XLSX from "xlsx";

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

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
  const normA = normalizeName(nameA);
  const normB = normalizeName(nameB);
  if (normA === normB) return 1.0;

  // Token-sorted comparison (handles "Last First" vs "First Last")
  const sortTokens = (str: string) => str.split(" ").filter(Boolean).sort().join(" ");
  const sortedA = sortTokens(normA);
  const sortedB = sortTokens(normB);
  if (sortedA === sortedB) return 0.98;

  const maxLen = Math.max(sortedA.length, sortedB.length);
  if (maxLen === 0) return 1.0;

  // Strict Levenshtein ratio on sorted tokens to avoid substring false positives
  const dist = levenshteinDistance(sortedA, sortedB);
  return Number((1 - dist / maxLen).toFixed(2));
}

export function parseAttendanceExcel(
  arrayBuffer: ArrayBuffer
): AttendanceRecord[] {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((s) => s.toLowerCase().includes("asistencia")) ||
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet);

  return rawRows.map((row) => {
    const rawName = (row['Nombre del estudiante'] || row['Nombre'] || '').toString().trim();
    const preAttRaw = (row['Asistencia preprueba'] || '').toString().trim();
    const postAttRaw = (row['Asistencia postprueba'] || '').toString().trim();

    const isPrePresent =
      preAttRaw === '✓' ||
      preAttRaw.toLowerCase() === 'v' ||
      preAttRaw === '1';

    const isPostPresent =
      postAttRaw === '✓' ||
      postAttRaw.toLowerCase() === 'v' ||
      postAttRaw === '1';

    const preAttendance: '✓' | 'X' = isPrePresent ? '✓' : 'X';
    const postAttendance: '✓' | 'X' = isPostPresent ? '✓' : 'X';

    return {
      officialName: rawName,
      normalizedName: normalizeName(rawName),
      preAttendance,
      postAttendance,
      isOfficialDropout: isPrePresent && !isPostPresent,
    };
  });
}

export function detectCSVRole(headers: string[]): 'pre' | 'post' | 'unknown' {
  const headerStr = headers.join(' ').toLowerCase();
  if (headerStr.includes('puntuación') || headerStr.includes('marca temporal')) {
    return 'post';
  }
  if (headerStr.includes('score') || headerStr.includes('timestamp')) {
    return 'pre';
  }
  return 'unknown';
}

export function parseSurveyCSV(
  rows: RawSurveyRow[],
  source: "pre" | "post"
): {
  clean: CleanedParticipant[];
  quarantined: CleanedParticipant[];
} {
  const clean: CleanedParticipant[] = [];
  const quarantined: CleanedParticipant[] = [];

  rows.forEach((row, index) => {
    const rawName = (
      row["Nombre y apellido "] ||
      row["Nombre y apellido"] ||
      row["Nombre"] ||
      ""
    ).trim();
    const rawScore =
      source === "pre"
        ? row["Score"] || row["Puntuación"] || ""
        : row["Puntuación"] || row["Score"] || "";
    const rawGroup = row["A que listado Pertenece"] || "Unknown";
    const timestamp = row["Timestamp"] || row["Marca temporal"] || "";

    const hasCodeKeywords =
      rawName.includes("def ") ||
      rawName.includes("return ") ||
      rawName.includes("import ") ||
      rawName.includes("\n");
    const isTooLong = rawName.length > 80;
    const isCorrupted = isTooLong || hasCodeKeywords;

    const scoreMatch = rawScore.match(/(\d+)/);
    const numericScore = scoreMatch ? parseInt(scoreMatch[1], 10) : NaN;
    const isInvalidScore = isNaN(numericScore);

    let corruptionReason: string | undefined = undefined;
    if (hasCodeKeywords) {
      corruptionReason = "Code injection / algorithm questionnaire dump detected";
    } else if (isTooLong) {
      corruptionReason = "Excessive string length (>80 chars)";
    } else if (isInvalidScore) {
      corruptionReason = "Invalid score format";
    }

    const participant: CleanedParticipant = {
      id: `${source}-${index + 1}`,
      originalName: rawName,
      normalizedName: normalizeName(rawName),
      group: rawGroup.includes("Listado 1")
        ? "Listado 1"
        : rawGroup.includes("Listado 2")
          ? "Listado 2"
          : "Unknown",
      score: numericScore,
      timestamp,
      isFlaggedCorrupted: isCorrupted || isInvalidScore,
      corruptionReason,
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
  postClean: CleanedParticipant[],
  attendanceRoster?: AttendanceRecord[],
  threshold = 0.85
): {
  paired: PairedParticipant[];
  unmatchedPre: CleanedParticipant[];
  unmatchedPost: CleanedParticipant[];
  attritionAnalysis: AttritionAnalysis;
} {
  const candidates: { pre: CleanedParticipant; post: CleanedParticipant; sim: number }[] = [];

  // 1. Generate all candidate pair combinations
  preClean.forEach((pre) => {
    postClean.forEach((post) => {
      const sim = computeNameSimilarity(pre.originalName, post.originalName);
      if (sim >= threshold) {
        candidates.push({ pre, post, sim });
      }
    });
  });

  // 2. Globally sort candidates by highest similarity score
  candidates.sort((a, b) => b.sim - a.sim);

  const usedPre = new Set<string>();
  const usedPost = new Set<string>();
  const paired: PairedParticipant[] = [];

  // 3. Greedily lock globally optimal pairs
  candidates.forEach(({ pre, post, sim }) => {
    if (!usedPre.has(pre.id) && !usedPost.has(post.id)) {
      usedPre.add(pre.id);
      usedPost.add(post.id);
      paired.push({
        preName: pre.originalName,
        postName: post.originalName,
        similarity: sim,
        group: post.group,
        preScore: pre.score,
        postScore: post.score,
        delta: post.score - pre.score,
      });
    }
  });

  const unmatchedPre = preClean.filter((pre) => !usedPre.has(pre.id));
  const unmatchedPost = postClean.filter((post) => !usedPost.has(post.id));

  let officialDropouts: AttendanceRecord[] = [];
  let masterRosterCount = preClean.length;
  let officialPreCount = preClean.length;
  let officialPostCount = postClean.length;

  if (attendanceRoster && attendanceRoster.length > 0) {
    masterRosterCount = attendanceRoster.length;
    officialPreCount = attendanceRoster.filter(
      (r) => r.preAttendance === "✓",
    ).length;
    officialPostCount = attendanceRoster.filter(
      (r) => r.postAttendance === "✓",
    ).length;
    officialDropouts = attendanceRoster.filter((r) => r.isOfficialDropout);
  } else {
    unmatchedPre.forEach((unmatched) => {
      officialDropouts.push({
        officialName: unmatched.originalName,
        normalizedName: unmatched.normalizedName,
        preAttendance: "✓",
        postAttendance: "X",
        isOfficialDropout: true,
      });
    });
  }

  const officialDesertionCount = officialDropouts.length;
  const officialDesertionRate =
    officialPreCount > 0
      ? Number(((officialDesertionCount / officialPreCount) * 100).toFixed(1))
      : 0;

  return {
    paired,
    unmatchedPre,
    unmatchedPost,
    attritionAnalysis: {
      masterRosterCount,
      officialPreCount,
      officialPostCount,
      officialDesertionCount,
      officialDesertionRate,
      unmatchedSurveysCount: unmatchedPre.length + unmatchedPost.length,
      officialDropouts,
    },
  };
}
