import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-context';
import AppShell from '@/components/AppShell';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Financial Decision Lab | Complete Financial Advisor',
  description: 'Your complete personal financial advisor that shows its work, forecasts cash flow, and proves every calculation step-by-step.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased font-sans">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
