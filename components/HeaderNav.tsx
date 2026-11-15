'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Upload, Binary, Home, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';
import { useDataset } from '@/lib/DatasetContext';

export default function HeaderNav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useTranslation();
  const { preClean, postClean, jupyterResults } = useDataset();

  const navLinks = [
    { href: '/', label: t.nav.overview, icon: Home },
    { href: '/upload', label: t.nav.importData, icon: Upload },
    { href: '/lab', label: t.nav.lab, icon: Binary },
    { href: '/paper', label: t.nav.paper, icon: FileText },
  ];

  return (
    <header className="bg-white border-b border-[#D0D7DE] sticky top-0 z-50 shadow-xs print:hidden">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-serif font-black text-xl shadow-xs group-hover:bg-[#C0392B] transition-colors">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-xl text-[#002B49] tracking-tight">
                Reportthy
              </span>
              <span className="text-[10px] uppercase font-semibold bg-[#F1F5F9] text-[#002B49] px-2 py-0.5 rounded border border-[#CBD5E1]">
                Analytics Studio
              </span>
            </div>
            <p className="text-[11px] text-[#57606A] -mt-0.5 font-sans">
              Empirical Assessment Platform
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
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
                      ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#002B49] text-white shadow-xs transition'
                      : 'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#57606A] hover:text-[#002B49] hover:bg-[#F1F5F9] transition'
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{link.label}</span>
                  {link.href === '/upload' && preClean.length > 0 && postClean.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  {link.href === '/lab' && (
                    jupyterResults ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ) : preClean.length > 0 && postClean.length > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    ) : null
                  )}
                  {link.href === '/paper' && jupyterResults && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="px-2.5 py-1.5 rounded-md border border-[#CBD5E1] text-xs font-mono font-semibold bg-[#F8F9FA] hover:bg-white text-[#002B49] transition shadow-xs flex items-center gap-1"
            title="Switch Language / Cambiar Idioma"
          >
            <span>{lang === 'en' ? '🇪🇸 ES' : '🇬🇧 EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
