'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#F8F9FA] text-[#1F2328] font-sans flex items-center justify-center min-h-screen p-6">
        <div className="bg-white border border-[#D0D7DE] rounded-lg p-8 max-w-md w-full shadow-lg text-center">
          <h2 className="font-serif font-bold text-xl text-[#002B49] mb-2">Critical System Failure</h2>
          <p className="text-xs text-[#57606A] mb-6 font-mono">
            {error.message || 'A fatal error occurred at the root application layer.'}
          </p>
          <button
            onClick={() => reset()}
            className="bg-[#002B49] text-white px-4 py-2 rounded text-xs font-semibold"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}