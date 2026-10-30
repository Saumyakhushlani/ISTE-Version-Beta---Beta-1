import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Decision Lab | Can I afford this next month?",
  description: "A personal finance assistant that shows its work and proves every calculation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-lg text-emerald-400 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Financial Decision Lab
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-300">
              <Link href="/" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Dashboard</Link>
              <Link href="/lab" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Decision Lab</Link>
              <Link href="/transactions" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Transactions</Link>
              <Link href="/recurring" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Recurring</Link>
              <Link href="/anomalies" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Anomalies</Link>
              <Link href="/privacy" className="px-3 py-1.5 rounded hover:bg-slate-800 hover:text-white transition">Privacy & Egress</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full font-mono">
              ● Data Health: OK (6 mo)
            </span>
            <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono">
              Privacy: Local-Only
            </span>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
