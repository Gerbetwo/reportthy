import { NextRequest, NextResponse } from 'next/server';
import { getServerDatasetBundle, saveServerDatasetBundle } from '@/lib/notebookStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId || `session-${Date.now()}`;
    const bundle = saveServerDatasetBundle({
      sessionId,
      preClean: body.preClean || [],
      postClean: body.postClean || [],
      pairedData: body.pairedData || [],
      quarantined: body.quarantined || [],
      attritionAnalysis: body.attritionAnalysis || null,
    });

    const origin = request.nextUrl.origin;
    return NextResponse.json({
      ok: true,
      sessionId: bundle.sessionId,
      datasetUrl: `${origin}/api/notebook/dataset?sessionId=${bundle.sessionId}`,
      notebookUrl: `${origin}/api/notebook/ipynb?sessionId=${bundle.sessionId}`,
      bundle,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to store dataset bundle', details: String(error) },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const bundle = getServerDatasetBundle();
  if (!bundle) {
    return NextResponse.json(
      {
        sessionId: 'empty-session',
        updatedAt: new Date().toISOString(),
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
        attritionAnalysis: null,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(bundle, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
