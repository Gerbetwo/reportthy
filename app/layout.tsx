import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reportthy — Empirical Research Portal & Quality Engine',
  description: 'Automated Statistical Verification & Springer Nature sn-jnl Manuscript Pipeline',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#1F2328]">
        {children}
      </body>
    </html>
  );
}
