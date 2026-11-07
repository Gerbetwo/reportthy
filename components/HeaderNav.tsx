'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileSpreadsheet, FlaskConical, Home, Sparkles, FileText } from 'lucide-react';

export default function HeaderNav() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Overview Portal', icon: Home },
    { href: '/upload', label: '1. Ingestion & Sanitization', icon: Database },
    { href: '/report', label: '2. Quality Diagnostics', icon: FileSpreadsheet },
    { href: '/lab', label: '3. Inferential Lab (WIP)', icon: FlaskConical },
  ];

  return (
    <header className="bg-white border-b border-[#D0D7DE] sticky top-0 z-50 shadow-xs print:hidden">
      {/* Top Academic Metadata Bar */}
      <div className="bg-[#001A2C] text-[#94A3B8] text-[11px] font-mono py-1.5 px-6 border-b border-[#002B49]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[#F8FAFC] font-semibold tracking-wide">
              SPRINGER NATURE SPECIFICATION
            </span>
            <span className="text-slate-500">•</span>
            <span>ISSN: 2026-X891</span>
            <span className="text-slate-500">•</span>
            <span>DOI: 10.1038/s41586-026-0042</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              PIPELINE OPERATIONAL
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">TURBOPACK 16.4</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded bg-[#002B49] text-white flex items-center justify-center font-serif font-black text-xl shadow-xs group-hover:bg-[#C0392B] transition-colors">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl text-[#002B49] tracking-tight">
                Reportthy
              </span>
              <span className="text-[10px] font-mono uppercase bg-[#F1F5F9] text-[#002B49] px-2 py-0.5 rounded font-bold border border-[#CBD5E1]">
                Portal of Science
              </span>
            </div>
            <p className="text-[11px] text-[#57606A] -mt-0.5 font-sans">
              Quantum Computing Pedagogical Evaluation
            </p>
          </div>
        </Link>

        {/* Navigation Step Pills */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
                <Link
                key={link.href}
                href={link.href}
                className={
                    isActive
                    ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#002B49] text-white shadow-xs'
                    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#57606A] hover:text-[#002B49] hover:bg-[#F1F5F9]'
                }
                >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{link.label}</span>
                </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
