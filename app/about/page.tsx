'use client';

import Link from 'next/link';
import HeaderNav from '@/components/HeaderNav';
import { useTranslation } from '@/lib/LanguageContext';
import {
  ExternalLink,
  GitBranch,
  BookOpen,
  ArrowLeft,
  Scale,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

const MIT_LICENSE_TEXT = `MIT License

Copyright (c) 2026 Daniel Alejandro Lasso Molina

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1F2328]">
      <HeaderNav />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Navigation link back to home */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#002B49] hover:text-[#C0392B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.about.backToHome}</span>
          </Link>
        </div>

        {/* Page Header */}
        <header className="border-b border-[#D0D7DE] pb-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] uppercase font-mono font-bold text-[#C0392B] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
              {t.about.badge}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-[#57606A] font-mono">MIT Open Source</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#002B49] tracking-tight">
            {t.about.title}
          </h1>
          <p className="text-sm text-[#57606A] mt-2 max-w-2xl leading-relaxed">
            {t.about.subtitle}
          </p>
        </header>

        <div className="space-y-6">
          {/* 1. Architecture & Platform Overview Card */}
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-[#002B49]" />
              <h2 className="font-serif font-bold text-lg text-[#002B49]">
                {t.about.overviewTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
              {t.about.overviewBody}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs font-mono text-[#57606A]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Zero TS Computation
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                JupyterHub Authority
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Springer Nature sn-jnl
              </span>
            </div>
          </section>

          {/* 2. Authorship & Maintainer Card */}
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
              <UserCheck className="w-4 h-4 text-[#002B49]" />
              <h2 className="font-serif font-bold text-lg text-[#002B49]">
                {t.about.authorTitle}
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-bold text-base text-[#002B49]">
                  Daniel Alejandro Lasso Molina
                </h3>
                <p className="text-xs text-[#57606A] mt-0.5">
                  {t.about.authorRole}
                </p>
              </div>

              <a
                href="https://github.com/Gerbetwo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#002B49] hover:bg-[#C0392B] text-white px-3.5 py-2 rounded text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{t.about.githubLabel}</span>
                <ExternalLink className="w-3 h-3 text-slate-300" />
              </a>
            </div>
          </section>

          {/* 3. Open-Source MIT License Card */}
          <section className="bg-white border border-[#D0D7DE] rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-3">
              <Scale className="w-4 h-4 text-[#002B49]" />
              <h2 className="font-serif font-bold text-lg text-[#002B49]">
                {t.about.licenseTitle}
              </h2>
            </div>
            <pre className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-4 text-[11px] font-mono text-slate-700 leading-relaxed overflow-x-auto whitespace-pre select-text">
              {MIT_LICENSE_TEXT}
            </pre>
          </section>
        </div>
      </main>
    </div>
  );
}
