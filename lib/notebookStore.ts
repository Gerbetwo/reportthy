import fs from 'fs';
import path from 'path';
import os from 'os';
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

// Global session map
const globalForSessions = globalThis as unknown as {
  __reportthy_sessions?: Map<string, SessionWorkspace>;
};

function getSessionSnapshotDir(): string {
  return path.join(os.tmpdir(), 'reportthy-sessions');
}

export function persistWorkspaceToDisk(workspace: SessionWorkspace): void {
  try {
    const dir = getSessionSnapshotDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${workspace.sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(workspace), 'utf-8');
  } catch (err) {
    console.warn('[notebookStore] Failed to write session snapshot to disk:', err);
  }
}

export function loadWorkspaceFromDisk(safeId: string): SessionWorkspace | null {
  try {
    const filePath = path.join(getSessionSnapshotDir(), `${safeId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data) as SessionWorkspace;
      return parsed;
    }
  } catch (err) {
    console.warn('[notebookStore] Failed to load session snapshot from disk:', err);
  }
  return null;
}

export function sanitizeSessionId(id?: string): string {
  if (!id || typeof id !== 'string') {
    return 'default-workspace';
  }
  const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return sanitized.length > 0 ? sanitized : 'default-workspace';
}

function getSessionMap(): Map<string, SessionWorkspace> {
  if (!globalForSessions.__reportthy_sessions) {
    globalForSessions.__reportthy_sessions = new Map<string, SessionWorkspace>();
  }
  return globalForSessions.__reportthy_sessions;
}

export function evictExpiredWorkspaces(sessions: Map<string, SessionWorkspace>, now = Date.now()): void {
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const [key, workspace] of sessions.entries()) {
    const updatedTime = workspace.updatedAt ? new Date(workspace.updatedAt).getTime() : NaN;
    const validUpdatedTime = isNaN(updatedTime) ? now : updatedTime;

    if (now - validUpdatedTime > maxAge) {
      sessions.delete(key);
      try {
        const filePath = path.join(getSessionSnapshotDir(), `${key}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    } else if (isNaN(updatedTime)) {
      workspace.updatedAt = new Date(now).toISOString();
      sessions.set(key, workspace);
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

  const existing = sessions.get(safeId) ?? loadWorkspaceFromDisk(safeId);
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
  persistWorkspaceToDisk(fullBundle);
  return fullBundle;
}

export function getServerDatasetBundle(sessionId?: string): SessionWorkspace | null {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  evictExpiredWorkspaces(sessions);
  let workspace = sessions.get(safeId);
  if (!workspace) {
    workspace = loadWorkspaceFromDisk(safeId) ?? undefined;
    if (workspace) {
      sessions.set(safeId, workspace);
    }
  }
  return workspace ?? null;
}

export function saveServerJupyterResult(res: JupyterExecutionResult, sessionId?: string): void {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  evictExpiredWorkspaces(sessions);
  const existing = sessions.get(safeId) ?? loadWorkspaceFromDisk(safeId);
  let targetWorkspace: SessionWorkspace;
  if (existing) {
    existing.jupyterResults = res;
    existing.updatedAt = new Date().toISOString();
    targetWorkspace = existing;
  } else {
    targetWorkspace = {
      sessionId: safeId,
      updatedAt: new Date().toISOString(),
      preClean: [],
      postClean: [],
      pairedData: [],
      quarantined: [],
      attritionAnalysis: null,
      jupyterResults: res,
    };
  }
  sessions.set(safeId, targetWorkspace);
  persistWorkspaceToDisk(targetWorkspace);
}

export function getServerJupyterResult(sessionId?: string): JupyterExecutionResult | null {
  const safeId = sanitizeSessionId(sessionId);
  const sessions = getSessionMap();
  evictExpiredWorkspaces(sessions);
  let workspace = sessions.get(safeId);
  if (!workspace) {
    workspace = loadWorkspaceFromDisk(safeId) ?? undefined;
    if (workspace) {
      sessions.set(safeId, workspace);
    }
  }
  return workspace?.jupyterResults ?? null;
}

export function clearSessionsForTesting(): void {
  const sessions = getSessionMap();
  sessions.clear();
  try {
    const dir = getSessionSnapshotDir();
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
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
