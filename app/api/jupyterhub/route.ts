import { NextRequest, NextResponse } from 'next/server';
import {
  getServerDatasetBundle,
  saveServerDatasetBundle,
  getServerJupyterResult,
  saveServerJupyterResult,
  extractSessionId,
  sanitizeSessionId,
} from '@/lib/notebookStore';
import { generateIpynbJson } from '@/lib/statsEngine';
import { JupyterExecutionResult } from '@/types/dataset';

const JUPYTERHUB_INTERNAL_URL =
  process.env.JUPYTERHUB_INTERNAL_URL || 'http://localhost:8000';
const JUPYTERHUB_PUBLIC_URL =
  process.env.JUPYTERHUB_PUBLIC_URL || 'http://localhost:8000';
const JUPYTERHUB_API_TOKEN =
  process.env.JUPYTERHUB_API_TOKEN || 'reportthy-dev-token';
const JUPYTERHUB_USER =
  process.env.JUPYTERHUB_USER || 'researcher';
const REPORTTHY_INTERNAL_URL =
  process.env.REPORTTHY_INTERNAL_URL || 'http://localhost:3000';

interface JupyterHubServerInfo {
  ready?: boolean;
  pending?: boolean | string | null;
}

interface JupyterHubUserResponse {
  name: string;
  servers?: Record<string, JupyterHubServerInfo>;
}

// 1. Provision user server & upload notebook to JupyterLab workspace
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = extractSessionId(request, body);
    const safeSessionId = sanitizeSessionId(sessionId);
    const notebookFileName = `reportthy_${safeSessionId}.ipynb`;

    let bundle = getServerDatasetBundle(safeSessionId);

    if (body.preClean || body.postClean) {
      bundle = saveServerDatasetBundle(
        {
          sessionId: safeSessionId,
          studyMetadata: body.studyMetadata,
          preClean: body.preClean || [],
          postClean: body.postClean || [],
          pairedData: body.pairedData || [],
          quarantined: body.quarantined || [],
          attritionAnalysis: body.attritionAnalysis || null,
        },
        safeSessionId
      );
    }

    if (!bundle) {
      return NextResponse.json(
        { error: 'No survey dataset available to provision in JupyterHub.' },
        { status: 400 }
      );
    }

    const notebookJsonStr = generateIpynbJson(
      bundle.pairedData,
      bundle.preClean,
      bundle.postClean,
      bundle.quarantined,
      bundle.attritionAnalysis,
      'greater',
      0.05,
      REPORTTHY_INTERNAL_URL
    );

    const authHeaders = {
      Authorization: `token ${JUPYTERHUB_API_TOKEN}`,
      'Content-Type': 'application/json',
    };

    // Step A: Ensure user exists in JupyterHub
    let userRes = await fetch(
      `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}`,
      { headers: authHeaders }
    ).catch(() => null);

    if (!userRes || userRes.status === 404) {
      const createRes = await fetch(
        `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}`,
        { method: 'POST', headers: authHeaders, body: JSON.stringify({}) }
      ).catch(() => null);

      if (!createRes || !createRes.ok) {
        return NextResponse.json(
          {
            error: `Failed to connect or create user in JupyterHub at ${JUPYTERHUB_INTERNAL_URL}. Ensure JupyterHub is running.`,
            unreachable: true,
          },
          { status: 503 }
        );
      }
      userRes = await fetch(
        `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}`,
        { headers: authHeaders }
      );
    } else if (!userRes.ok) {
      return NextResponse.json(
        {
          error: `JupyterHub returned HTTP ${userRes.status}. Check JUPYTERHUB_API_TOKEN permissions.`,
          unreachable: true,
        },
        { status: 502 }
      );
    }

    const userData = (await userRes.json()) as JupyterHubUserResponse;

    // Step B: Ensure user server is spawned and ready
    const server = userData.servers?.[''];

    if (!server?.ready) {
      if (!server?.pending) {
        // Trigger server spawn only if it's neither ready nor already pending
        await fetch(
          `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}/server`,
          { method: 'POST', headers: authHeaders, body: JSON.stringify({}) }
        ).catch(() => {});
      }

      // Poll until server is ready (every 500ms, up to 45s = 90 polls)
      let ready = false;
      for (let i = 0; i < 90; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const pollRes = await fetch(
          `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}`,
          { headers: authHeaders }
        ).catch(() => null);

        if (pollRes && pollRes.ok) {
          const pollData = (await pollRes.json()) as JupyterHubUserResponse;
          if (pollData.servers?.['']?.ready) {
            ready = true;
            break;
          }
        }
      }

      if (!ready) {
        return NextResponse.json(
          {
            error: 'Timed out waiting for JupyterHub single-user server to become ready.',
            unreachable: true,
          },
          { status: 504 }
        );
      }
    }

    // Step C: Mint or acquire user access token
    let userToken = JUPYTERHUB_API_TOKEN;
    const tokenRes = await fetch(
      `${JUPYTERHUB_INTERNAL_URL}/hub/api/users/${JUPYTERHUB_USER}/tokens`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ expires_in: 86400, note: `reportthy-${safeSessionId}` }),
      }
    ).catch(() => null);

    if (tokenRes && tokenRes.ok) {
      const tokenData = await tokenRes.json();
      if (tokenData.token) userToken = tokenData.token;
    }

    // Step D: Upload notebook via official Jupyter Server Contents API if needed
    const contentsUrl = `${JUPYTERHUB_INTERNAL_URL}/user/${JUPYTERHUB_USER}/api/contents/${notebookFileName}`;
    let shouldUpload = true;

    const forceReset = Boolean(body.forceReset);
    if (!forceReset) {
      const checkRes = await fetch(`${contentsUrl}?content=1`, {
        headers: {
          Authorization: `token ${userToken}`,
        },
      }).catch(() => null);

      if (checkRes && checkRes.ok) {
        const existingData = await checkRes.json().catch(() => null);
        const existingStr = JSON.stringify(existingData?.content || {});
        if (existingStr.includes('__REPORTTHY_JSON_START__')) {
          shouldUpload = false;
        }
      }
    }

    if (shouldUpload) {
      const putRes = await fetch(contentsUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'notebook',
          format: 'json',
          content: JSON.parse(notebookJsonStr),
        }),
      }).catch(() => null);

      if (!putRes || !putRes.ok) {
        console.warn(`[JupyterHub Contents API] PUT notebook status: ${putRes?.status}`);
      }
    }

    const embedUrl = `${JUPYTERHUB_PUBLIC_URL}/user/${JUPYTERHUB_USER}/doc/tree/${notebookFileName}?token=${userToken}`;
    const fullLabUrl = `${JUPYTERHUB_PUBLIC_URL}/user/${JUPYTERHUB_USER}/lab/tree/${notebookFileName}?token=${userToken}`;

    return NextResponse.json({
      ok: true,
      sessionId: safeSessionId,
      embedUrl,
      fullLabUrl,
      user: JUPYTERHUB_USER,
      serverReady: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to provision JupyterHub workspace',
        details: String(error),
        unreachable: true,
      },
      { status: 500 }
    );
  }
}

// 2. Read executed notebook and results from JupyterHub Contents API
export async function GET(request: NextRequest) {
  try {
    const sessionId = extractSessionId(request);
    const safeSessionId = sanitizeSessionId(sessionId);
    const notebookFileName = `reportthy_${safeSessionId}.ipynb`;

    const authHeaders = {
      Authorization: `token ${JUPYTERHUB_API_TOKEN}`,
      'Content-Type': 'application/json',
    };

    const contentsUrl = `${JUPYTERHUB_INTERNAL_URL}/user/${JUPYTERHUB_USER}/api/contents/${notebookFileName}?content=1`;
    const res = await fetch(contentsUrl, {
      headers: authHeaders,
      cache: 'no-store',
    }).catch(() => null);

    let parsedResult: JupyterExecutionResult | null = null;
    let codeCellSources: string[] = [];

    if (res && res.ok) {
      const data = await res.json();
      const notebook = data.content;

      if (notebook && Array.isArray(notebook.cells)) {
        // Collect exact source code of code cells from the Jupyter workspace
        codeCellSources = notebook.cells
          .filter((c: { cell_type: string }) => c.cell_type === 'code')
          .map((c: { source: string | string[] }) =>
            Array.isArray(c.source) ? c.source.join('') : c.source
          );

        // Search cell outputs for Reportthy execution delimiter
        for (const cell of notebook.cells) {
          if (!Array.isArray(cell.outputs)) continue;
          for (const out of cell.outputs) {
            const rawText =
              (Array.isArray(out.text) ? out.text.join('') : out.text) ||
              (out.data && out.data['text/plain']
                ? Array.isArray(out.data['text/plain'])
                  ? out.data['text/plain'].join('')
                  : out.data['text/plain']
                : '');

            if (typeof rawText === 'string') {
              const startMarker = '__REPORTTHY_JSON_START__';
              const endMarker = '__REPORTTHY_JSON_END__';
              const sIdx = rawText.indexOf(startMarker);
              const eIdx = rawText.indexOf(endMarker);

              if (sIdx !== -1 && eIdx !== -1) {
                const jsonText = rawText.slice(sIdx + startMarker.length, eIdx).trim();
                parsedResult = JSON.parse(jsonText);
                break;
              }
            }
          }
          if (parsedResult) break;
        }
      }
    }

    if (parsedResult) {
      if (codeCellSources.length > 0) {
        parsedResult.executedCodeCells = codeCellSources;
      }
      saveServerJupyterResult(parsedResult, safeSessionId);
      return NextResponse.json({
        ok: true,
        sessionId: safeSessionId,
        results: parsedResult,
        source: 'jupyterhub-contents',
      });
    }

    // Fallback: check in-memory cache if cell posted via HTTP
    const cached = getServerJupyterResult(safeSessionId);
    if (cached) {
      return NextResponse.json({
        ok: true,
        sessionId: safeSessionId,
        results: cached,
        source: 'server-cache',
      });
    }

    return NextResponse.json(
      {
        ok: false,
        sessionId: safeSessionId,
        error:
          'No executed statistical results detected in JupyterHub notebook. Run all cells in JupyterLab.',
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch notebook from JupyterHub', details: String(error) },
      { status: 500 }
    );
  }
}
