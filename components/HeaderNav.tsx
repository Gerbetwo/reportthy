'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileSpreadsheet, FlaskConical, Home } from 'lucide-react';

export default function HeaderNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Overview', icon: Home },
    { href: '/upload', label: '1. Ingestion & Sanitization', icon: Database },
    { href: '/report', label: '2. Quality Diagnostics', icon: FileSpreadsheet },
    { href: '/lab', label: '3. Hypothesis Lab (WIP)', icon: FlaskConical },
  ];

  return (
    <nav className="bg-white border-b border-[#D0D7DE] mb-8 sticky top-0 z-50 shadow-sm print:hidden">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-serif font-bold text-lg text-[#002B49] tracking-tight">
            Reportthy
          </Link>
          <span className="text-xs font-mono uppercase bg-slate-100 text-[#656D76] px-2 py-0.5 rounded border border-slate-200">
            sn-jnl v1.0
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#002B49] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#002B49] hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
