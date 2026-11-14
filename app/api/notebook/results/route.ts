import { NextRequest, NextResponse } from 'next/server';
import {
  getServerJupyterResult,
  saveServerJupyterResult,
  extractSessionId,
} from '@/lib/notebookStore';
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

    const verifiedResult: JupyterExecutionResult = {
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
      executedCodeCells: Array.isArray(resultPayload.executedCodeCells)
        ? resultPayload.executedCodeCells
        : [],
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
