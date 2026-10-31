'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Sparkles, 
  Building2,
  HardDrive,
  Briefcase
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('aarav.kumar@example.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    // Instantaneous local authentication simulation
    setTimeout(() => {
      localStorage.setItem('fdl-user', JSON.stringify({ 
        name: 'Aarav Kumar', 
        email: email || 'aarav@techcorp.in',
        persona: 'Salaried Engineer (HDFC + SBI)'
      }));
      router.push('/upload');
    }, 350);
  };

  const handleDemoLogin = (profile: 'aarav' | 'priya') => {
    setLoading(true);
    setTimeout(() => {
      if (profile === 'priya') {
        localStorage.setItem('fdl-user', JSON.stringify({ 
          name: 'Priya Sharma', 
          email: 'priya@freelance.io',
          persona: 'Freelance Designer (ICICI)'
        }));
      } else {
        localStorage.setItem('fdl-user', JSON.stringify({ 
          name: 'Aarav Kumar', 
          email: 'aarav@techcorp.in',
          persona: 'Salaried Engineer (HDFC + SBI)'
        }));
      }
      router.push('/upload');
    }, 350);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-primary/30">
      {/* Top Header */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-end gap-1 h-5">
            <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
            <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
            <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight">
            Financial Decision Lab
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link 
            href="/" 
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-7 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.08)] space-y-6 text-card-foreground"
        >
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-xl bg-primary/20 text-foreground flex items-center justify-center mx-auto mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign In</h1>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Access your local statement ingestion pipeline and decision reports.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Password</label>
                <span className="text-[11px] text-muted-foreground">Demo Mode (Any)</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-input border border-border rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-98 disabled:opacity-50 border border-neutral-800 dark:border-white/20"
            >
              {loading ? (
                <span>Entering Workspace...</span>
              ) : (
                <>
                  <span>Sign In &amp; Proceed to Upload</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5 text-center">
              Or Try One-Click Demo Profile
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('aarav')}
                className="p-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left transition group shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>Aarav Kumar</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Salaried (HDFC + SBI)</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('priya')}
                className="p-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left transition group shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Briefcase className="w-3.5 h-3.5 text-chart-4" />
                  <span>Priya Sharma</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Freelancer (ICICI)</p>
              </button>
            </div>
          </div>

          {/* Local-First Notice */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-start gap-2.5 text-[11px] text-muted-foreground">
            <HardDrive className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-foreground font-semibold">Local-First Guarantee:</strong> Authentication and statements operate on your local machine. No transactions or credentials ever egress to third-party servers.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-2">
        <span>Financial Decision Lab · Confidential Financial Decision Assistant</span>
      </div>
    </div>
  );
}
