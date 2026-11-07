import Link from 'next/link';
import HeaderNav from '@/components/HeaderNav';
import { 
  ArrowRight, 
  Database, 
  FileSpreadsheet, 
  FlaskConical, 
  GitBranch, 
  CheckCircle2, 
  FileCode2, 
  ShieldAlert, 
  Activity, 
  BookOpenCheck,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function HomePage() {
  const pipelineStages = [
    {
      id: '01',
      title: 'Dual CSV Ingestion & Sanitization',
      badge: 'Active & Verified',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: Database,
      formula: 'Levenshtein(s_1, s_2) \\ge 0.85',
      desc: 'Automatic regex score extraction, dirty entry trapping (detects & quarantines Row 27 algorithmic code injection), and fuzzy Levenshtein longitudinal pairing.'
    },
    {
      id: '02',
      title: 'Data Quality & Distribution Diagnostics',
      badge: 'Active & Verified',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: FileSpreadsheet,
      formula: 'W = \\frac{(\\sum a_i x_{(i)})^2}{\\sum (x_i - \\bar{x})^2}',
      desc: 'Descriptive stats, variance calculation (s^2), sample attrition telemetry, and Shapiro-Wilk normality rejection directing non-parametric modeling.'
    },
    {
      id: '03',
      title: 'Hypothesis Testing Lab (Jupyter)',
      badge: 'Sprint 2 (WIP)',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: FlaskConical,
      formula: 'T = \\min(W^+, W^-) \\sim \\text{Wilcoxon}',
      desc: 'Interactive modifiable Python notebook with pre-baked Wilcoxon Signed-Rank and Mann-Whitney U cells for longitudinal paired and between-group testing.'
    },
    {
      id: '04',
      title: 'Springer Nature Manuscript Synthesis',
      badge: 'Standard Ready',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-300',
      icon: GitBranch,
      formula: '\\text{Template: } sn-jnl.cls',
      desc: 'Direct export of publication-grade LaTeX bundles with formal booktabs tables (no vertical lines) and client-side printable PDF summary reports.'
    }
  ];

  return (
    <div className="min-h-screen bg-scientific-grid text-[#1F2328] flex flex-col">
      <HeaderNav />

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Editorial Journal Masthead Banner */}
        <section className="bg-white border border-[#D0D7DE] rounded-lg p-8 mb-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#002B49] via-[#C0392B] to-[#002B49]"></div>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-mono uppercase font-bold text-[#C0392B] tracking-wider">
                  Open Science Evaluation Portal
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-mono text-[#57606A]">
                  Springer Nature sn-jnl Protocol
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#002B49] tracking-tight leading-tight">
                Quantum Computing Pedagogical Assessment & Distribution Diagnostics Engine
              </h1>
              <p className="text-sm text-[#57606A] mt-3 leading-relaxed">
                Automated computational pipeline for analyzing pre/post-intervention educational surveys. Evaluates sample dispersion, isolates contaminated form submissions, computes Shapiro-Wilk Gaussian hypothesis testing, and generates Springer Nature standard LaTeX and PDF artifacts.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center gap-2 bg-[#002B49] hover:bg-[#001A2C] text-white px-6 py-3 rounded-md text-xs font-semibold tracking-wide uppercase shadow-sm transition-all hover:translate-y-[-1px]"
              >
                <span>Launch Ingestion</span>
                <ArrowRight className="w-4 h-4 text-[#F8FAFC]" />
              </Link>
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F8F9FA] text-[#002B49] border border-[#CBD5E1] px-6 py-3 rounded-md text-xs font-semibold tracking-wide uppercase transition"
              >
                <BookOpenCheck className="w-4 h-4 text-[#C0392B]" />
                <span>View Quality Audit</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Empirical Benchmark Snapshot Cards */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#002B49]">
                Empirical Baseline Telemetry (Quantum Computing Literacy Dataset)
              </h2>
              <p className="text-xs text-[#57606A]">
                Statistical benchmarks derived from experimental validation across two cohorts (Listado 1 & Listado 2)
              </p>
            </div>
            <span className="text-xs font-mono bg-[#E2E8F0] text-[#002B49] px-2.5 py-1 rounded font-semibold border border-[#CBD5E1]">
              N_total = 72 Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs hover:border-[#002B49] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#57606A] font-medium">Pretest Baseline</span>
                <Cpu className="w-4 h-4 text-[#002B49]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#002B49] mt-2">
                1.925 <span className="text-xs font-sans text-slate-500 font-normal">/ 10</span>
              </div>
              <div className="text-xs text-[#57606A] mt-1 font-mono">
                s² = 0.789 • N = 40
              </div>
              <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Floor Effect Detected
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs hover:border-[#002B49] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#57606A] font-medium">Posttest Clean</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-2">
                8.323 <span className="text-xs font-sans text-slate-500 font-normal">/ 10</span>
              </div>
              <div className="text-xs text-[#57606A] mt-1 font-mono">
                s² = 4.826 • N = 31 clean
              </div>
              <div className="mt-3 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                +332% Knowledge Shift
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs hover:border-[#002B49] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#57606A] font-medium">Cohort Attrition</span>
                <Activity className="w-4 h-4 text-[#C0392B]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#C0392B] mt-2">
                20.0%
              </div>
              <div className="text-xs text-[#57606A] mt-1 font-mono">
                ΔN = -8 participants
              </div>
              <div className="mt-3 text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                1 Corrupted Record Isolated
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs hover:border-[#002B49] transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-[#57606A] font-medium">Normality Status</span>
                <ShieldAlert className="w-4 h-4 text-[#C0392B]" />
              </div>
              <div className="text-2xl font-serif font-bold text-[#C0392B] mt-2">
                p &lt; 0.001
              </div>
              <div className="text-xs text-[#57606A] mt-1 font-mono">
                W_pre = 0.8533 • W_post = 0.7689
              </div>
              <div className="mt-3 text-[11px] text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-medium">
                Non-Parametric Mandate
              </div>
            </div>
          </div>
        </section>

        {/* 4-Stage Execution Pipeline Grid */}
        <section className="mb-12">
          <div className="border-b border-[#D0D7DE] pb-2 mb-6">
            <h2 className="text-xl font-serif font-bold text-[#002B49]">
              Scientific Execution Architecture
            </h2>
            <p className="text-xs text-[#57606A]">
              Rigorous modular progression designed to satisfy agile sprint criteria and peer-reviewed journal submission standards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pipelineStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.id}
                  className="bg-white border border-[#D0D7DE] hover:border-[#002B49] rounded-lg p-6 shadow-xs flex flex-col justify-between transition-all group hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-bold text-[#57606A] bg-[#F1F5F9] px-2.5 py-1 rounded">
                        STAGE {stage.id}
                      </span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${stage.badgeColor}`}>
                        {stage.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded bg-[#F1F5F9] group-hover:bg-[#002B49] group-hover:text-white text-[#002B49] flex items-center justify-center transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-serif font-bold text-lg text-[#002B49]">
                        {stage.title}
                      </h3>
                    </div>

                    <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2.5 mb-3 font-mono text-[11px] text-[#002B49]">
                      <code>{stage.formula}</code>
                    </div>

                    <p className="text-xs text-[#57606A] leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#EDF2F7] flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">Agile Standard</span>
                    <Link
                      href={stage.id === '01' ? '/upload' : stage.id === '02' ? '/report' : '/lab'}
                      className="text-[#002B49] font-semibold hover:text-[#C0392B] inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      Enter Phase &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Scientific Citation & Methodology Box */}
        <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 mb-8 text-xs text-[#57606A]">
          <h4 className="font-serif font-bold text-sm text-[#002B49] mb-2">
            Citation & Reproducibility Standard
          </h4>
          <p className="leading-relaxed">
            Reportthy compiles data under the Springer Nature <code>sn-jnl</code> document class specification. All numerical metrics conform to APA 7th / Springer Nature statistical reporting guidelines. Pre-flight data sanitization prevents algorithm dump injections (such as Row 27 in standard Google Form returns) from biasing sample variance calculations.
          </p>
        </section>
      </main>

      {/* Formal Scientific Portal Footer */}
      <footer className="bg-white border-t border-[#D0D7DE] py-6 text-xs text-[#57606A] print:hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono">
            <span>Reportthy Scientific System</span>
            <span>•</span>
            <span>MIT License 2026</span>
          </div>
          <div className="font-mono text-[11px]">
            Springer Nature Standard • sn-jnl • Next.js 16 App Router
          </div>
        </div>
      </footer>
    </div>
  );
}
