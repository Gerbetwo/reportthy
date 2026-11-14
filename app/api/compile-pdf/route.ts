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
    } catch (execErr: unknown) {
      console.error('[pdflatex compilation process error]:', execErr);
      let snippet = '';
      const errObj = execErr as { stdout?: string; stderr?: string; message?: string };
      if (errObj.stdout) {
        const lines = errObj.stdout.split('\n');
        const errorLines = lines.filter(l => l.startsWith('!') || l.includes('Error:'));
        snippet = errorLines.length > 0 ? errorLines.slice(0, 5).join('\n') : lines.slice(-10).join('\n');
      } else if (errObj.stderr) {
        snippet = errObj.stderr.slice(0, 500);
      } else if (errObj.message) {
        snippet = errObj.message;
      }

      const logFilePath = path.join(tmpDir, `report_${jobId}.log`);
      if (!snippet && fs.existsSync(/*turbopackIgnore: true*/ logFilePath)) {
        try {
          const logContent = fs.readFileSync(logFilePath, 'utf-8');
          const lines = logContent.split('\n');
          const errorLines = lines.filter(l => l.startsWith('!'));
          snippet = errorLines.length > 0 ? errorLines.slice(0, 5).join('\n') : lines.slice(-10).join('\n');
        } catch {
          // ignore
        }
      }

      return NextResponse.json(
        {
          error: 'LaTeX typesetting failure.',
          details: snippet.trim() || 'Ensure LaTeX engine and required packages are available in host environment.'
        },
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
        'Content-Disposition': 'attachment; filename="springer_nature_manuscript.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    });
  } catch (err: unknown) {
    console.error('[compile-pdf API exception]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tmpDir && fs.existsSync(/*turbopackIgnore: true*/ tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn('[compile-pdf temp cleanup warning]:', cleanupErr);
      }
    }
  }
}
