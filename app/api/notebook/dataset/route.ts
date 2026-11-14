import { NextRequest, NextResponse } from 'next/server';
import {
  getServerDatasetBundle,
  saveServerDatasetBundle,
  extractSessionId,
} from '@/lib/notebookStore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = extractSessionId(request, body);
    const bundle = saveServerDatasetBundle(
      {
        sessionId,
        studyMetadata: body.studyMetadata,
        preClean: body.preClean || [],
        postClean: body.postClean || [],
        pairedData: body.pairedData || [],
        quarantined: body.quarantined || [],
        attritionAnalysis: body.attritionAnalysis || null,
      },
      sessionId
    );

    const origin = request.nextUrl.origin;
    return NextResponse.json(
      {
        ok: true,
        sessionId: bundle.sessionId,
        datasetUrl: `${origin}/api/notebook/dataset?sessionId=${bundle.sessionId}`,
        notebookUrl: `${origin}/api/notebook/ipynb?sessionId=${bundle.sessionId}`,
        bundle,
      },
      {
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
      { error: 'Failed to store dataset bundle', details: String(error) },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const sessionId = extractSessionId(request);
  const bundle = getServerDatasetBundle(sessionId);
  if (!bundle) {
    return NextResponse.json(
      {
        sessionId,
        updatedAt: new Date().toISOString(),
        preClean: [],
        postClean: [],
        pairedData: [],
        quarantined: [],
        attritionAnalysis: null,
      },
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

  return NextResponse.json(bundle, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-reportthy-session',
    },
  });
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
