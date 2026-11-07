import Link from 'next/link';
import HeaderNav from '@/components/HeaderNav';
import { 
  ArrowRight, 
  Upload, 
  BarChart3, 
  Binary, 
  FileText, 
  CheckCircle2, 
  TrendingUp 
} from 'lucide-react';

export default function HomePage() {
  const steps = [
    {
      id: '01',
      title: 'Import & Smart Clean',
      icon: Upload,
      desc: 'Automatically pairs pre- and post-test students, corrects typos in names, and filters out invalid or corrupt entries.',
      href: '/upload',
      action: 'Upload Surveys'
    },
    {
      id: '02',
      title: 'Impact & Results Summary',
      icon: BarChart3,
      desc: 'Instantly view score growth, score distribution shifts, attrition rates, and key learning metrics in clear, human language.',
      href: '/report',
      action: 'View Results'
    },
    {
      id: '03',
      title: 'Interactive Analysis Lab',
      icon: Binary,
      desc: 'Run hypothesis tests and export python notebook scripts for further customization and research deep dives.',
      href: '/lab',
      action: 'Open Lab'
    },
    {
      id: '04',
      title: 'Journal-Ready Export',
      icon: FileText,
      desc: 'Generate clean, publication-grade LaTeX tables and formatted PDF summaries ready for academic submission.',
      href: '/report',
      action: 'Export Documents'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#1F2328] flex flex-col">
      <HeaderNav />

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Human Hero Banner */}
        <section className="bg-slate-50 border border-[#D0D7DE] rounded-xl p-8 mb-10 shadow-xs relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
              Educational Assessment Studio
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#002B49] mt-3 tracking-tight leading-tight">
              Measure student progress with clarity and precision.
            </h1>
            <p className="text-sm text-[#57606A] mt-3 leading-relaxed">
              Reportthy simplifies pre- and post-intervention survey analysis. Automatically match student records, calculate learning gains, and produce clean academic reports—without complex setup.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 bg-[#002B49] hover:bg-[#001A2C] text-white px-5 py-2.5 rounded-md text-xs font-semibold shadow-xs transition"
              >
                <span>Start New Analysis</span>
                <ArrowRight className="w-4 h-4 text-[#F8FAFC]" />
              </Link>
              <Link
                href="/report"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F8F9FA] text-[#002B49] border border-[#CBD5E1] px-5 py-2.5 rounded-md text-xs font-semibold transition"
              >
                <span>View Sample Report</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Intuitive Impact Snapshot */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#002B49]">
                Benchmark Evaluation Overview
              </h2>
              <p className="text-xs text-[#57606A]">
                Key metrics from the latest intervention sample
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
              <span className="text-xs font-mono uppercase text-[#57606A]">Starting Average</span>
              <div className="text-2xl font-serif font-bold text-[#002B49] mt-1">
                1.93 <span className="text-xs font-sans text-slate-500 font-normal">/ 10</span>
              </div>
              <div className="text-xs text-[#57606A] mt-1">Pre-test (N = 40)</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
              <span className="text-xs font-mono uppercase text-[#57606A]">Final Average</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                8.32 <span className="text-xs font-sans text-slate-500 font-normal">/ 10</span>
              </div>
              <div className="text-xs font-semibold text-emerald-800 mt-1">+332% knowledge gain</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
              <span className="text-xs font-mono uppercase text-[#57606A]">Matched Cohort</span>
              <div className="text-2xl font-serif font-bold text-[#002B49] mt-1">
                31 Students
              </div>
              <div className="text-xs text-[#57606A] mt-1">20% attrition rate</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#D0D7DE] shadow-xs">
              <span className="text-xs font-mono uppercase text-[#57606A]">Data Status</span>
              <div className="text-2xl font-serif font-bold text-emerald-700 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Verified</span>
              </div>
              <div className="text-xs text-[#57606A] mt-1">1 bad entry filtered</div>
            </div>
          </div>
        </section>

        {/* 4-Step Simplified Workflow */}
        <section className="mb-12">
          <div className="border-b border-[#D0D7DE] pb-2 mb-6">
            <h2 className="text-xl font-serif font-bold text-[#002B49]">
              How Reportthy Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="bg-white border border-[#D0D7DE] hover:border-[#002B49] rounded-lg p-6 shadow-xs flex flex-col justify-between transition group"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded bg-[#F1F5F9] text-[#002B49] flex items-center justify-center group-hover:bg-[#002B49] group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#002B49]">
                        {step.title}
                      </h3>
                    </div>

                    <p className="text-xs text-[#57606A] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#EDF2F7] flex items-center justify-end text-xs">
                    <Link
                      href={step.href}
                      className="text-[#002B49] font-semibold hover:text-[#C0392B] inline-flex items-center gap-1"
                    >
                      <span>{step.action}</span> &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-[#D0D7DE] py-6 text-xs text-[#57606A] print:hidden">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span>Reportthy Assessment Studio</span>
          <span>Open Analytics Pipeline</span>
        </div>
      </footer>
    </div>
  );
}
