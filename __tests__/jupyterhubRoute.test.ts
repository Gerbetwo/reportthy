import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/jupyterhub/route';
import { POST as POST_DATASET } from '@/app/api/notebook/dataset/route';
import {
  clearSessionsForTesting,
  saveServerDatasetBundle,
  getServerDatasetBundle,
  getServerJupyterResult,
  saveServerJupyterResult,
} from '@/lib/notebookStore';
import { JupyterExecutionResult } from '@/types/dataset';

describe('JupyterHub Execution Bridge Route (app/api/jupyterhub/route.ts)', () => {
  beforeEach(() => {
    clearSessionsForTesting();
    vi.restoreAllMocks();
  });

  it('GET reads results directly from reportthy_results.json even when notebook cells have empty outputs', async () => {
    const sessionId = 'test-results-json-session';
    saveServerDatasetBundle(
      {
        sessionId,
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      sessionId
    );

    const mockJupyterResult: JupyterExecutionResult = {
      sessionId,

      executedAt: '2026-11-14T19:00:00Z',
      kernelInfo: 'Python 3.11.2 (JupyterHub Singleuser)',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      preMetrics: {
        n: 15,
        mean: 4.5,
        variance: 2.1,
        stdDev: 1.45,
        median: 4.0,
        iqr: 2.0,
        skewness: 0.1,
        kurtosis: -0.2,
        shapiroWilk: { statistic: 0.95, pValue: 0.04, isNormal: false },
      },
      postMetrics: {
        n: 15,
        mean: 8.2,
        variance: 1.8,
        stdDev: 1.34,
        median: 8.0,
        iqr: 1.5,
        skewness: -0.3,
        kurtosis: 0.1,
        shapiroWilk: { statistic: 0.96, pValue: 0.03, isNormal: false },
      },
      wilcoxon: {
        testName: 'Wilcoxon',
        statisticName: 'W',
        statisticValue: 12.0,
        zValue: 3.12,
        pValue: 0.0009,
        effectSize: 0.805,
        interpretation: 'Statistically significant positive gain',
        isSignificant: true,
        alternative: 'greater',
        n1: 15,
      },
      mannWhitney: {
        testName: 'Mann-Whitney',
        statisticName: 'U',
        statisticValue: 24.5,
        zValue: 2.45,
        pValue: 0.014,
        effectSize: 0.63,
        interpretation: 'Statistically significant experimental superiority',
        isSignificant: true,
        alternative: 'greater',
        n1: 8,
        n2: 7,
      },
      hypothesisConfirmed: true,
      executedCodeCells: [],
    };

    // Mock global fetch to return:
    // 1. Token minting response
    // 2. reportthy_results.json content
    // 3. notebook with empty outputs
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes('/hub/api/users/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'mock-user-token-xyz' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes('reportthy_results_test-results-json-session.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: 'reportthy_results_test-results-json-session.json',
              content: JSON.stringify(mockJupyterResult),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      if (urlStr.includes('.ipynb')) {
        // Empty notebook cell outputs (user hasn't pressed Ctrl+S)
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: 'reportthy_test-results-json-session.ipynb',
              content: {
                cells: [
                  { cell_type: 'code', source: 'print("hello")', outputs: [] },
                ],
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest(
      `http://localhost:3000/api/jupyterhub?sessionId=${sessionId}`,
      {
        headers: { 'x-reportthy-session': sessionId },
      }
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.results).not.toBeNull();
    expect(data.results.wilcoxon.statisticValue).toBe(12.0);
    expect(data.results.mannWhitney.statisticValue).toBe(24.5);
    expect(data.results.hypothesisConfirmed).toBe(true);
  });

  it('does not leak or inherit results across sessions (session-b returns 404 when session-a has results)', async () => {
    const sessionA = 'session-a';
    const sessionB = 'session-b';

    const mockResultA: JupyterExecutionResult = {
      sessionId: sessionA,
      executedAt: '2026-11-14T20:00:00Z',
      kernelInfo: 'Python 3.12 (Linux)',
      alpha: 0.05,
      wilcoxonAlternative: 'greater',
      preMetrics: {
        n: 10, mean: 5.0, variance: 1.0, stdDev: 1.0, median: 5.0, iqr: 1.0, skewness: 0, kurtosis: 0,
        shapiroWilk: { statistic: 0.96, pValue: 0.02, isNormal: false },
      },
      postMetrics: {
        n: 10, mean: 8.0, variance: 1.0, stdDev: 1.0, median: 8.0, iqr: 1.0, skewness: 0, kurtosis: 0,
        shapiroWilk: { statistic: 0.97, pValue: 0.03, isNormal: false },
      },
      wilcoxon: {
        testName: 'Wilcoxon', statisticName: 'W', statisticValue: 5.0, zValue: 2.8, pValue: 0.005, effectSize: 0.7, interpretation: 'Gain', isSignificant: true, alternative: 'greater', n1: 10,
      },
      mannWhitney: {
        testName: 'Mann-Whitney', statisticName: 'U', statisticValue: 12.0, zValue: 2.1, pValue: 0.03, effectSize: 0.5, interpretation: 'Gain', isSignificant: true, alternative: 'greater', n1: 5, n2: 5,
      },
      hypothesisConfirmed: true,
      executedCodeCells: ['print("A executed")'],
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);

      if (urlStr.includes('/hub/api/users/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'mock-user-token-xyz' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      // session-a has results file
      if (urlStr.includes('reportthy_results_session-a.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: 'reportthy_results_session-a.json',
              content: JSON.stringify(mockResultA),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      // session-b results file is not found (404)
      if (urlStr.includes('reportthy_results_session-b.json')) {
        return Promise.resolve(
          new Response(JSON.stringify({ message: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      // Notebook for session-b has unexecuted cells
      if (urlStr.includes('reportthy_session-b.ipynb')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: 'reportthy_session-b.ipynb',
              content: {
                cells: [
                  { cell_type: 'code', source: 'print("unexecuted")', outputs: [] },
                ],
              },
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    vi.stubGlobal('fetch', fetchMock);

    // Query session B
    const reqB = new NextRequest(
      `http://localhost:3000/api/jupyterhub?sessionId=${sessionB}`,
      {
        headers: { 'x-reportthy-session': sessionB },
      }
    );

    const resB = await GET(reqB);
    expect(resB.status).toBe(404);

    const dataB = await resB.json();
    expect(dataB.ok).toBe(false);
    expect(dataB.results).toBeUndefined();
  });

  it('POST /api/jupyterhub executes PUT to overwrite existing notebook even when __REPORTTHY_JSON_START__ appears in cell source', async () => {
    const sessionId = 'test-overwrite-notebook-session';
    saveServerDatasetBundle(
      {
        sessionId,
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      sessionId
    );

    let putCalled = false;
    let putBody: { type?: string } | null = null;

    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      const method = opts?.method || 'GET';

      if (urlStr.includes('/hub/api/users/') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'mock-user-token-xyz' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes('/hub/api/users/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ servers: { '': { ready: true } } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes('.ipynb') && method === 'PUT') {
        putCalled = true;
        putBody = opts?.body ? JSON.parse(String(opts.body)) : null;
        return Promise.resolve(
          new Response(JSON.stringify({ name: `reportthy_${sessionId}.ipynb` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr} [${method}]`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest(
      `http://localhost:3000/api/jupyterhub?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reportthy-session': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          forceReset: false,
        }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(putCalled).toBe(true);
    expect((putBody as { type?: string } | null)?.type).toBe('notebook');
  });

  it('POST /api/jupyterhub issues DELETE for reportthy_results_<sessionId>.json when bundle.jupyterResults is null or undefined without requiring forceReset: true', async () => {
    const sessionId = 'test-auto-delete-results-session';
    saveServerDatasetBundle(
      {
        sessionId,
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
        jupyterResults: null,
      },
      sessionId
    );

    let deleteCalled = false;
    let deletedUrl = '';

    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      const method = opts?.method || 'GET';

      if (urlStr.includes('/hub/api/users/') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'mock-user-token-xyz' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes('/hub/api/users/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ servers: { '': { ready: true } } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes(`reportthy_results_${sessionId}.json`) && method === 'DELETE') {
        deleteCalled = true;
        deletedUrl = urlStr;
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (urlStr.includes('.ipynb') && method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify({ name: `reportthy_${sessionId}.ipynb` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr} [${method}]`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest(
      `http://localhost:3000/api/jupyterhub?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reportthy-session': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          forceReset: false,
        }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(deleteCalled).toBe(true);
    expect(deletedUrl).toContain(`reportthy_results_${sessionId}.json`);
  });

  it('POST /api/jupyterhub forceReset clears persisted results before deleting the Jupyter artifact and overwriting the notebook', async () => {
    const sessionId = 'test-force-reset-results-session';
    saveServerDatasetBundle(
      {
        sessionId,
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
      },
      sessionId
    );
    const persistedResult = {
      executedAt: '2026-11-14T20:00:00.000Z',
      kernelInfo: 'Python test',
      alpha: 0.05,
      wilcoxonAlternative: 'greater' as const,
      preMetrics: {} as JupyterExecutionResult['preMetrics'],
      postMetrics: {} as JupyterExecutionResult['postMetrics'],
      wilcoxon: {} as JupyterExecutionResult['wilcoxon'],
      mannWhitney: {} as JupyterExecutionResult['mannWhitney'],
      hypothesisConfirmed: true,
      executedCodeCells: [],
    };
    saveServerJupyterResult(persistedResult, sessionId);

    const requests: Array<{ url: string; method: string }> = [];
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      const urlStr = String(url);
      const method = opts?.method || 'GET';
      requests.push({ url: urlStr, method });

      if (urlStr.includes('/hub/api/users/') && method === 'POST') {
        return Promise.resolve(
          new Response(JSON.stringify({ token: 'mock-user-token-xyz' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (urlStr.includes('/hub/api/users/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ servers: { '': { ready: true } } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      if (
        urlStr.includes(`reportthy_results_${sessionId}.json`) &&
        method === 'DELETE'
      ) {
        return Promise.resolve(new Response(null, { status: 204 }));
      }

      if (urlStr.includes(`reportthy_${sessionId}.ipynb`) && method === 'PUT') {
        return Promise.resolve(
          new Response(JSON.stringify({ name: `reportthy_${sessionId}.ipynb` }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled URL: ${urlStr} [${method}]`));
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest(
      `http://localhost:3000/api/jupyterhub?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reportthy-session': sessionId,
        },
        body: JSON.stringify({ sessionId, forceReset: true }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(getServerJupyterResult(sessionId)).toBeNull();
    expect(
      requests.some(
        (request) =>
          request.method === 'DELETE' &&
          request.url.includes(`reportthy_results_${sessionId}.json`)
      )
    ).toBe(true);
    expect(
      requests.some(
        (request) =>
          request.method === 'PUT' &&
          request.url.includes(`reportthy_${sessionId}.ipynb`)
      )
    ).toBe(true);
  });

  it('POST /api/notebook/dataset with invalidateResults: true clears previously saved jupyterResults in notebookStore', async () => {
    const sessionId = 'test-invalidate-dataset-results-session';
    saveServerDatasetBundle(
      {
        sessionId,
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
        jupyterResults: {
          sessionId,
          executedAt: '2026-11-14T20:00:00Z',
          kernelInfo: 'Python 3.12 (Linux)',
          alpha: 0.05,
          wilcoxonAlternative: 'greater',
          preMetrics: {
            n: 10, mean: 5.0, variance: 1.0, stdDev: 1.0, median: 5.0, iqr: 1.0, skewness: 0, kurtosis: 0,
            shapiroWilk: { statistic: 0.96, pValue: 0.02, isNormal: false },
          },
          postMetrics: {
            n: 10, mean: 8.0, variance: 1.0, stdDev: 1.0, median: 8.0, iqr: 1.0, skewness: 0, kurtosis: 0,
            shapiroWilk: { statistic: 0.97, pValue: 0.03, isNormal: false },
          },
          wilcoxon: {
            testName: 'Wilcoxon', statisticName: 'W', statisticValue: 5.0, zValue: 2.8, pValue: 0.005, effectSize: 0.7, interpretation: 'Gain', isSignificant: true, alternative: 'greater', n1: 10,
          },
          mannWhitney: {
            testName: 'Mann-Whitney', statisticName: 'U', statisticValue: 12.0, zValue: 2.1, pValue: 0.03, effectSize: 0.5, interpretation: 'Gain', isSignificant: true, alternative: 'greater', n1: 5, n2: 5,
          },
          hypothesisConfirmed: true,
          executedCodeCells: [],
        },
      },
      sessionId
    );

    // Verify bundle initially has results
    const initialBundle = getServerDatasetBundle(sessionId);
    expect(initialBundle?.jupyterResults).not.toBeNull();
    expect(initialBundle?.jupyterResults?.wilcoxon.statisticValue).toBe(5.0);

    // Send POST with invalidateResults: true
    const req = new NextRequest(
      `http://localhost:3000/api/notebook/dataset?sessionId=${sessionId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reportthy-session': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          invalidateResults: true,
        }),
      }
    );

    const res = await POST_DATASET(req);
    expect(res.status).toBe(200);

    const updatedBundle = getServerDatasetBundle(sessionId);
    expect(updatedBundle?.jupyterResults).toBeNull();
  });
});
