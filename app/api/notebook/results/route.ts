import { NextRequest, NextResponse } from 'next/server';
import {
  getServerDatasetBundle,
  getServerJupyterResult,
  saveServerJupyterResult,
  extractSessionId,
} from '@/lib/notebookStore';
import { generateIpynbJson } from '@/lib/statsEngine';
import { JupyterExecutionResult } from '@/types/dataset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const sessionId = extractSessionId(request, body);

    // Support payload wrapped in { payload: ... } or raw result
    const resultPayload: Partial<JupyterExecutionResult> = body.payload || body;

    if (!resultPayload.preMetrics || !resultPayload.postMetrics || !resultPayload.wilcoxon) {
      return NextResponse.json(
        { error: 'Missing mandatory metrics in execution result payload' },
        { status: 422 }
      );
    }

    let resolvedCodeCells: string[] = Array.isArray(resultPayload.executedCodeCells)
      ? resultPayload.executedCodeCells
      : [];

    if (resolvedCodeCells.length === 0) {
      const bundle = getServerDatasetBundle(sessionId);
      if (bundle) {
        const ipynbStr = generateIpynbJson(
          bundle.pairedData,
          bundle.preClean,
          bundle.postClean,
          bundle.quarantined,
          bundle.attritionAnalysis,
          bundle.studyMetadata?.wilcoxonAlternative || 'greater',
          bundle.studyMetadata?.alpha || 0.05,
          process.env.REPORTTHY_INTERNAL_URL || 'http://localhost:3000',
          bundle.studyMetadata,
          sessionId
        );
        const parsedNotebook = JSON.parse(ipynbStr) as {
          cells?: Array<{ cell_type: string; source: string | string[] }>;
        };
        if (Array.isArray(parsedNotebook.cells)) {
          resolvedCodeCells = parsedNotebook.cells
            .filter((c) => c.cell_type === 'code')
            .map((c) => (Array.isArray(c.source) ? c.source.join('') : c.source));
        }
      }
    }

    const verifiedResult: JupyterExecutionResult = {
      sessionId: resultPayload.sessionId || sessionId,
      executedAt: resultPayload.executedAt || new Date().toISOString(),
      kernelInfo: resultPayload.kernelInfo || 'Unknown Python Kernel',
      alpha: Number(resultPayload.alpha ?? 0.05),
      wilcoxonAlternative: resultPayload.wilcoxonAlternative || 'greater',
      preMetrics: resultPayload.preMetrics,
      postMetrics: resultPayload.postMetrics,
      wilcoxon: resultPayload.wilcoxon,
      mannWhitney: resultPayload.mannWhitney || {
        testName: 'Between-Cohort Mann-Whitney U Test',
        statisticName: 'U',
        statisticValue: 0,
        zValue: 0,
        pValue: 1.0,
        effectSize: 0,
        interpretation: 'Not executed',
        isSignificant: false,
        alternative: 'two-sided',
        n1: 0,
      },
      hypothesisConfirmed: Boolean(resultPayload.hypothesisConfirmed),
      executedCodeCells: resolvedCodeCells,
      designMode: resultPayload.designMode,
      controlLabel: resultPayload.controlLabel,
      experimentalLabel: resultPayload.experimentalLabel,
    };

    saveServerJupyterResult(verifiedResult, sessionId);

    return NextResponse.json(
      { ok: true, results: verifiedResult, sessionId },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, x-reportthy-session',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process execution results', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = extractSessionId(request);
  const results = getServerJupyterResult(sessionId);
  return NextResponse.json(
    { ok: true, results, sessionId },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, x-reportthy-session',
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-reportthy-session',
    },
  });
}
