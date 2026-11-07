import Link from 'next/link';
import { ArrowRight, Database, FileText, FlaskConical, GitBranch } from 'lucide-react';

export default function HomePage() {
  const pipelineStages = [
    {
      id: '01',
      title: 'Dual CSV Ingestion & Sanitization',
      status: 'Ready',
      active: true,
      icon: Database,
      desc: 'Automatic regex score extraction, dirty entry trapping (e.g. Row 27 corruption), and fuzzy Levenshtein participant alignment.'
    },
    {
      id: '02',
      title: 'Data Quality & Distribution Diagnostics',
      status: 'Ready',
      active: true,
      icon: FileText,
      desc: 'Descriptive stats, variance calculation, sample attrition analysis, and Shapiro-Wilk normality tests.'
    },
    {
      id: '03',
      title: 'Hypothesis Testing Lab (Jupyter)',
      status: 'WIP / Staged',
      active: false,
      icon: FlaskConical,
      desc: 'Interactive modifiable notebook with pre-baked Mann-Whitney U and Wilcoxon Signed-Rank non-parametric cells.'
    },
    {
      id: '04',
      title: 'Springer Nature Manuscript Synthesis',
      status: 'WIP / Staged',
      active: false,
      icon: GitBranch,
      desc: 'Direct export of publication-grade sn-jnl LaTeX zip bundles and client-side verified PDF reports.'
    }
  ];

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <header className="border-b-2 border-springer-navy pb-8 mb-10">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-springer-crimson">
              Springer Nature Research Scaffolding
            </span>
            <h1 className="text-4xl font-serif font-bold text-springer-navy mt-1">
              Reportthy
            </h1>
            <p className="text-sm text-springer-muted mt-1">
              Automated Statistical Verification & Quality Engine for Educational Survey Analytics
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-springer-navy hover:bg-slate-800 text-white px-5 py-2.5 rounded text-sm font-medium transition shadow-sm"
          >
            Start Analysis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-xl font-serif font-semibold text-springer-navy mb-6">
          Scientific Execution Pipeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className={`p-6 rounded border bg-white shadow-sm flex flex-col justify-between ${
                  stage.active ? 'border-springer-navy' : 'border-springer-border opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-springer-muted">
                      STAGE {stage.id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded font-semibold ${
                        stage.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-springer-navy" />
                    <h3 className="font-serif font-semibold text-lg text-springer-navy">
                      {stage.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-springer-border pt-6 flex items-center justify-between text-xs text-springer-muted font-mono">
        <div>MIT License • 2026 Reportthy</div>
        <div>Standard: Springer Nature sn-jnl</div>
      </footer>
    </main>
  );
}
