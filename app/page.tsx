"use client";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";
import {
  ArrowRight,
  Upload,
  BarChart3,
  Binary,
  FileText,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/LanguageContext";

export default function HomePage() {
  const { t } = useTranslation();

  const iconMap: Record<string, LucideIcon> = {
    "01": Upload,
    "02": BarChart3,
    "03": Binary,
    "04": FileText,
  };

  return (
    <div className="min-h-screen bg-white text-[#1F2328] flex flex-col">
      <HeaderNav />

      <main className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        {/* Human Hero Banner */}
        <section className="bg-slate-50 border border-[#D0D7DE] rounded-xl p-8 mb-10 shadow-xs relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
              {t.home.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#002B49] mt-3 tracking-tight leading-tight">
              {t.home.title}
            </h1>
            <p className="text-sm text-[#57606A] mt-3 leading-relaxed">
              {t.home.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 bg-[#002B49] hover:bg-[#001A2C] text-white px-5 py-2.5 rounded-md text-xs font-semibold shadow-xs transition"
              >
                <span>{t.home.startAnalysis}</span>
                <ArrowRight className="w-4 h-4 text-[#F8FAFC]" />
              </Link>
              <Link
                href="/report"
                className="inline-flex items-center gap-2 bg-white hover:bg-[#F8F9FA] text-[#002B49] border border-[#CBD5E1] px-5 py-2.5 rounded-md text-xs font-semibold transition"
              >
                <span>{t.home.viewSample}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 4-Step Simplified Workflow */}
        <section className="mb-12">
          <div className="border-b border-[#D0D7DE] pb-2 mb-6">
            <h2 className="text-xl font-serif font-bold text-[#002B49]">
              {t.home.howItWorks}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {t.home.steps.map((step) => {
              const Icon = iconMap[step.id] || Upload;
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
