import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { useTranslation } from '@/lib/LanguageContext';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-scientific-grid flex items-center justify-center p-6 text-[#1F2328]">
      <div className="bg-white border border-[#D0D7DE] rounded-lg p-8 max-w-md w-full shadow-md text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-[#002B49] flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#002B49] mb-2">
          {t.notFound.title}
        </h2>
        <p className="text-xs text-[#57606A] mb-6">
          {t.notFound.desc}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#002B49] hover:bg-[#001A2C] text-white px-5 py-2.5 rounded text-xs font-semibold transition"
        >
          <Home className="w-4 h-4" />
          <span>{t.notFound.portal}</span>
        </Link>
      </div>
    </div>
  );
}
