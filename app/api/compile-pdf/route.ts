import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  let tmpDir = '';
  try {
    const { latexContent } = await request.json();
    if (!latexContent || typeof latexContent !== 'string') {
      return NextResponse.json({ error: 'Valid LaTeX content is required.' }, { status: 400 });
    }

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reportthy-pdf-'));
    const jobId = crypto.randomBytes(6).toString('hex');
    const texFilePath = path.join(tmpDir, `report_${jobId}.tex`);
    const pdfFilePath = path.join(tmpDir, `report_${jobId}.pdf`);

    // Copy bundled sn-jnl.cls into tmpDir if available
    const clsSource = path.join(process.cwd(), 'lib', 'tex', 'sn-jnl.cls');
    if (fs.existsSync(clsSource)) {
      fs.copyFileSync(clsSource, path.join(tmpDir, 'sn-jnl.cls'));
    }

    fs.writeFileSync(texFilePath, latexContent, 'utf-8');

    // Execute pdflatex safely via execFile with security flags disabled shell escapes
    const pdfArgs = [
      '-interaction=nonstopmode',
      '-no-shell-escape',
      `-output-directory=${tmpDir}`,
      texFilePath
    ];

    try {
      await execFileAsync('pdflatex', pdfArgs, { timeout: 12000 });
      await execFileAsync('pdflatex', pdfArgs, { timeout: 12000 });
    } catch (execErr) {
      console.error('[pdflatex compilation process error]:', execErr);
      return NextResponse.json(
        { error: 'LaTeX typesetting failure. Ensure LaTeX engine is available in host environment.' },
        { status: 500 }
      );
    }

    if (!fs.existsSync(pdfFilePath)) {
      return NextResponse.json({ error: 'PDF compilation produced no output binary.' }, { status: 500 });
    }

    const pdfBuffer = fs.readFileSync(pdfFilePath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="springer_nature_quality_report.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (err: unknown) {
    console.error('[compile-pdf API exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('[compile-pdf temp cleanup warning]:', cleanupErr);
      }
    }
  }
}
