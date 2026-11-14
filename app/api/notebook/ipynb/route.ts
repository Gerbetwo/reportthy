import { NextRequest, NextResponse } from 'next/server';
import { getServerDatasetBundle } from '@/lib/notebookStore';
import { generateIpynbJson } from '@/lib/statsEngine';

export async function GET(request: NextRequest) {
  const bundle = getServerDatasetBundle();
  const searchParams = request.nextUrl.searchParams;
  const isDownload = searchParams.get('download') === 'true';

  const notebookJsonStr = generateIpynbJson(
    bundle?.pairedData || [],
    bundle?.preClean || [],
    bundle?.postClean || [],
    bundle?.quarantined || [],
    bundle?.attritionAnalysis
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-ipynb+json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };

  if (isDownload) {
    headers['Content-Disposition'] = 'attachment; filename="quantum_hypothesis_verification.ipynb"';
  }

  return new NextResponse(notebookJsonStr, {
    status: 200,
    headers,
  });
}
