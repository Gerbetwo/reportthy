import {
  CleanedParticipant,
  PairedParticipant,
  AttritionAnalysis,
  JupyterExecutionResult,
  StudyMetadata,
} from '@/types/dataset';

export interface SessionWorkspace {
  sessionId: string;
  updatedAt: string;
  studyMetadata?: StudyMetadata;
  preClean: CleanedParticipant[];
  postClean: CleanedParticipant[];
  pairedData: PairedParticipant[];
  quarantined: CleanedParticipant[];
  attritionAnalysis: AttritionAnalysis | null;
  jupyterResults?: JupyterExecutionResult | null;
}

export type DatasetBundle = SessionWorkspace;

declare global {
  var __reportthy_sessions: Map<string, SessionWorkspace> | undefined;
}

export function sanitizeSessionId(id?: string): string {
  if (!id || typeof id !== 'string') {
    return 'default-workspace';
  }
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 ? sanitized : 'default-workspace';
}

function getSessionMap(): Map<string, SessionWorkspace> {
  if (!global.__reportthy_sessions) {
    global.__reportthy_sessions = new Map<string, SessionWorkspace>();
  }
  return global.__reportthy_sessions;
}

export function evictExpiredWorkspaces(sessions: Map<string, SessionWorkspace>, now = Date.now()): void {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const [key, workspace] of sessions.entries()) {
    const updatedTime = new Date(workspace.updatedAt).getTime();
    if (isNaN(updatedTime) || now - updatedTime > maxAge) {
      sessions.delete(key);
    }
  }
}

export function saveServerDatasetBundle(
  bundle: {
    sessionId?: string;
    studyMetadata?: StudyMetadata;
    preClean?: CleanedParticipant[];
    postClean?: CleanedParticipant[];
    pairedData?: PairedParticipant[];
    quarantined?: CleanedParticipant[];
    attritionAnalysis?: AttritionAnalysis | null;
    jupyterResults?: JupyterExecutionResult | null;
  },
  explicitSessionId?: string
): SessionWorkspace {
  const rawId = explicitSessionId || bundle.sessionId;
  const safeId = sanitizeSessionId(rawId);
  const sessions = getSessionMap();
  evictExpiredWorkspaces(sessions);

  const existing = sessions.get(safeId);
  const fullBundle: SessionWorkspace = {
    sessionId: safeId,
    updatedAt: new Date().toISOString(),
    studyMetadata: bundle.studyMetadata ?? existing?.studyMetadata,
    preClean: bundle.preClean ?? existing?.preClean ?? [],
    postClean: bundle.postClean ?? existing?.postClean ?? [],
    pairedData: bundle.pairedData ?? existing?.pairedData ?? [],
    quarantined: bundle.quarantined ?? existing?.quarantined ?? [],
    attritionAnalysis:
      bundle.attritionAnalysis !== undefined
        ? bundle.attritionAnalysis
        : (existing?.attritionAnalysis ?? null),
    jupyterResults:
      bundle.jupyterResults !== undefined
        ? bundle.jupyterResults
        : (existing?.jupyterResults ?? null),
  };

  sessions.set(safeId, fullBundle);
  return fullBundle;
}

export function getServerDatasetBundle(sessionId?: string): SessionWorkspace | null {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  return sessions.get(safeId) ?? null;
}

export function saveServerJupyterResult(res: JupyterExecutionResult, sessionId?: string): void {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  evictExpiredWorkspaces(sessions);
  const existing = sessions.get(safeId);
  if (existing) {
    existing.jupyterResults = res;
    existing.updatedAt = new Date().toISOString();
  } else {
    sessions.set(safeId, {
      sessionId: safeId,
      updatedAt: new Date().toISOString(),
      preClean: [],
      postClean: [],
      pairedData: [],
      quarantined: [],
      attritionAnalysis: null,
      jupyterResults: res,
    });
  }
}

export function getServerJupyterResult(sessionId?: string): JupyterExecutionResult | null {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  const workspace = sessions.get(safeId);
  return workspace?.jupyterResults ?? null;
}

export function clearSessionsForTesting(): void {
  const sessions = getSessionMap();
  sessions.clear();
}

export function extractSessionId(
  req?: {
    nextUrl?: { searchParams: { get: (name: string) => string | null } };
    url?: string;
    headers?: { get: (name: string) => string | null };
  } | null,
  body?: { sessionId?: string } | null
): string {
  let queryParam: string | null = null;
  if (req?.nextUrl?.searchParams) {
    queryParam = req.nextUrl.searchParams.get('sessionId');
  } else if (req?.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      queryParam = url.searchParams.get('sessionId');
    } catch {
      // ignore
    }
  }
  if (queryParam) return sanitizeSessionId(queryParam);

  const headerVal = req?.headers?.get?.('x-reportthy-session');
  if (headerVal) return sanitizeSessionId(headerVal);

  if (body?.sessionId) return sanitizeSessionId(body.sessionId);

  return 'default-workspace';
}
