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

    const mockJupyterResult: JupyterExecutionResult & { sessionId: string } = {
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
});
