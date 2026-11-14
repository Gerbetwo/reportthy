import { NextRequest, NextResponse } from "next/server";
import { getServerDatasetBundle, extractSessionId } from "@/lib/notebookStore";
import { generateIpynbJson } from "@/lib/statsEngine";

export async function GET(request: NextRequest) {
  const sessionId = extractSessionId(request);
  const bundle = getServerDatasetBundle(sessionId);
  const searchParams = request.nextUrl.searchParams;
  const isDownload = searchParams.get("download") === "true";

  const notebookJsonStr = generateIpynbJson(
    bundle?.pairedData || [],
    bundle?.preClean || [],
    bundle?.postClean || [],
    bundle?.quarantined || [],
    bundle?.attritionAnalysis,
    bundle?.studyMetadata?.wilcoxonAlternative || "greater",
    bundle?.studyMetadata?.alpha || 0.05,
    process.env.REPORTTHY_INTERNAL_URL || "http://localhost:3000",
    bundle?.studyMetadata,
    sessionId,
  );

  const headers: Record<string, string> = {
    "Content-Type": "application/x-ipynb+json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };

  if (isDownload) {
    headers["Content-Disposition"] =
      `attachment; filename="reportthy_${sessionId}.ipynb"`;
  }

  return new NextResponse(notebookJsonStr, {
    status: 200,
    headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-reportthy-session",
    },
  });
}
