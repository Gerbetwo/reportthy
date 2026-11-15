import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  const startTime = Date.now();
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
    const logFilePath = path.join(tmpDir, `report_${jobId}.log`);

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
      const errObj = execErr as { stdout?: string; stderr?: string; message?: string };

      let rawLog = '';
      if (fs.existsSync(logFilePath)) {
        try {
          rawLog = fs.readFileSync(logFilePath, 'utf-8');
        } catch {
          rawLog = '';
        }
      }
      if (!rawLog && errObj.stdout) {
        rawLog = errObj.stdout;
      }

      // Extract failing line number parsed from `l.(\d+)`
      let line: number | null = null;
      const lineMatch = rawLog.match(/l\.(\d+)/);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }

      // Extract clean error details
      let details = '';
      const logLines = rawLog.split('\n');
      const errorLines: string[] = [];
      for (let i = 0; i < logLines.length; i++) {
        const l = logLines[i];
        if (l.startsWith('!')) {
          errorLines.push(l);
          if (logLines[i + 1] && !logLines[i + 1].startsWith('!') && logLines[i + 1].trim().length > 0) {
            errorLines.push(logLines[i + 1].trim());
          }
          if (errorLines.length >= 4) break;
        }
      }

      if (errorLines.length > 0) {
        details = errorLines.join('\n');
      } else if (errObj.stderr) {
        details = errObj.stderr.slice(0, 500);
      } else if (errObj.message) {
        details = errObj.message;
      } else {
        details = 'LaTeX compilation failed without explicit error trace.';
      }

      const safeRawLog = rawLog.length > 12000 ? rawLog.slice(-12000) : rawLog;
      const isSyntaxError = rawLog.includes('!') || details.includes('!') || line !== null;
      const status = isSyntaxError ? 422 : 500;

      return NextResponse.json(
        {
          error: 'LaTeX typesetting failure.',
          details: details.trim(),
          line,
          rawLog: safeRawLog,
        },
        { status }
      );
    }

    if (!fs.existsSync(pdfFilePath)) {
      return NextResponse.json({ error: 'PDF compilation produced no output binary.' }, { status: 500 });
    }

    const elapsedMs = Date.now() - startTime;
    const pdfBuffer = fs.readFileSync(pdfFilePath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="springer_nature_manuscript.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'X-Compile-Time-Ms': String(elapsedMs),
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
