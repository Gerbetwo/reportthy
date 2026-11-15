import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/jupyterhub/route';
import { clearSessionsForTesting, saveServerDatasetBundle } from '@/lib/notebookStore';
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
});
