'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error('[Reportthy Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-scientific-grid flex items-center justify-center p-6 text-[#1F2328]">
      <div className="bg-white border border-[#D0D7DE] rounded-lg p-8 max-w-lg w-full shadow-md text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-[#C0392B] flex items-center justify-center mx-auto mb-4">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#002B49] mb-2">
          {t.error.title}
        </h2>
        <p className="text-xs text-[#57606A] mb-6 leading-relaxed font-mono">
          {error.message || t.error.desc}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="bg-[#002B49] hover:bg-[#001A2C] text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.error.retry}</span>
          </button>
          <Link
            href="/"
            className="border border-[#CBD5E1] bg-white hover:bg-[#F8F9FA] text-[#002B49] px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t.error.portal}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
