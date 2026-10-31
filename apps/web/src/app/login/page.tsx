'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ChevronLeft as ChevronLeftIcon,
  AtSign as AtSignIcon,
  Lock as LockIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Building2 as Building2Icon,
  Briefcase as BriefcaseIcon,
  ShieldCheck as ShieldCheckIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Check as CheckIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [selectedPersona, setSelectedPersona] = useState<'aarav' | 'priya'>('aarav');
  const [email, setEmail] = useState('aarav.kumar@example.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectPersona = (persona: 'aarav' | 'priya') => {
    setSelectedPersona(persona);
    if (persona === 'aarav') {
      setEmail('aarav.kumar@example.com');
      setPassword('Password123!');
    } else {
      setEmail('priya.sharma@example.com');
      setPassword('Password123!');
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.login(email.trim(), password);
      if (res && res.status === 'success') {
        setUser(res.user);
        if (res.user.is_onboarded === false) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMessage(res?.detail || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.detail || err.message || 'Unable to sign in. Please verify your credentials or try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-2 font-sans select-none">
      {/* ========================================================
          LEFT COLUMN: BRAND SHOWCASE & ANIMATED FLOATING PATHS
      ======================================================== */}
      <div className="bg-muted/40 relative hidden h-full flex-col justify-between border-r border-border p-10 lg:flex overflow-hidden">
        {/* Subtle gradient vignette */}
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent pointer-events-none opacity-80" />

        {/* Brand Header */}
        <div className="z-20 flex items-center gap-3">
          <div className="flex items-end gap-1 h-6">
            <span className="w-2 h-4 bg-primary rounded-sm shadow-sm" />
            <span className="w-2 h-6 bg-primary rounded-sm shadow-sm" />
            <span className="w-2 h-5 bg-primary rounded-sm shadow-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Financial Decision Lab
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary font-semibold">
              Deterministic Math Engine
            </span>
          </div>
        </div>

        {/* Center Pillar Highlight Badge */}
        <div className="z-20 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-mono text-primary mb-4 backdrop-blur-sm">
            <ShieldCheckIcon className="size-3.5" />
            <span>100% LOCAL-FIRST &amp; AIR-GAPPED</span>
          </div>
          <blockquote className="space-y-3">
            <p className="text-2xl font-bold tracking-tight leading-snug text-foreground">
              &ldquo;Can I afford this next month? Proving every calculation with zero hallucinations and provable mathematical headroom.&rdquo;
            </p>
            <footer className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>5,000 Monte Carlo Runs · Strict Number Guard · Seed=42</span>
            </footer>
          </blockquote>
        </div>

        {/* Bottom Feature Badges */}
        <div className="z-20 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60">
          <span>Local SQLite Storage (fdl.db)</span>
          <span className="font-mono text-[11px] text-primary font-semibold">Zero Cloud Egress</span>
        </div>

        {/* Animated Floating Paths Canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: AUTHENTICATION & QUICK DEMO ACCESS
      ======================================================== */}
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-10 overflow-hidden">
        {/* Ambient Radial Gradient Mesh */}
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-50 dark:opacity-30 pointer-events-none"
        >
          <div className="bg-[radial-gradient(ellipse_at_top_right,var(--ring)_0%,transparent_60%)] absolute -top-24 right-0 h-96 w-96 rounded-full blur-3xl opacity-20" />
          <div className="bg-[radial-gradient(circle_at_bottom_left,var(--primary)_0%,transparent_70%)] absolute -bottom-24 left-0 h-80 w-80 rounded-full blur-3xl opacity-15" />
        </div>

        {/* Top Controls: Back Button & Theme Toggle */}
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border bg-card/60 backdrop-blur-sm hover:bg-muted"
          >
            <ChevronLeftIcon className="size-3.5" />
            <span>Home</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>

        {/* Main Sign-In Card Container */}
        <div className="mx-auto w-full max-w-sm my-auto">
          {/* Mobile-only brand */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-3 bg-primary rounded-sm" />
              <span className="w-1.5 h-5 bg-primary rounded-sm" />
              <span className="w-1.5 h-4 bg-primary rounded-sm" />
            </div>
            <p className="text-base font-bold text-foreground">Financial Decision Lab</p>
          </div>

          <div className="flex flex-col space-y-1 mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Sign In to Workspace
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Select a demo profile or enter local credentials to continue.
            </p>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2.5 text-destructive text-xs">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Persona Switcher */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Quick Demo Profiles</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-primary">
                <SparklesIcon className="size-3" />
                ONE-CLICK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPersona('aarav')}
                className={cn(
                  'relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer',
                  selectedPersona === 'aarav'
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card/60 hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Building2Icon className="size-3.5 text-primary" />
                  {selectedPersona === 'aarav' && (
                    <div className="size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <CheckIcon className="size-2 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-semibold text-foreground truncate">Aarav Kumar</div>
                <div className="text-[10px] text-muted-foreground truncate">Salaried (HDFC+SBI)</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPersona('priya')}
                className={cn(
                  'relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer',
                  selectedPersona === 'priya'
                    ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                    : 'border-border bg-card/60 hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <BriefcaseIcon className="size-3.5 text-primary" />
                  {selectedPersona === 'priya' && (
                    <div className="size-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <CheckIcon className="size-2 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-semibold text-foreground truncate">Priya Sharma</div>
                <div className="text-[10px] text-muted-foreground truncate">Freelancer (ICICI)</div>
              </button>
            </div>
          </div>

          <AuthSeparator />

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full bg-input border border-border rounded-lg ps-8 pe-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5">
                  <AtSignIcon className="size-3.5" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-input border border-border rounded-lg ps-8 pe-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5">
                  <LockIcon className="size-3.5" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 flex items-center justify-center pe-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </span>
              ) : (
                <>
                  <span>Sign In &amp; Proceed</span>
                  <ArrowRightIcon className="size-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-semibold transition">
                Create an account
              </Link>
            </p>
          </div>

          {/* Privacy Note */}
          <div className="mt-4 pt-3 border-t border-border/80 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
            <span className="leading-tight">
              <strong className="text-foreground font-medium">Local-Only Session:</strong> No external cloud egress. Statements remain in local SQLite.
            </span>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-muted-foreground">
          Financial Decision Lab · Confidential Personal Finance Assistant
        </footer>
      </div>
    </main>
  );
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.6 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-primary"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Floating Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.06 + path.id * 0.015}
            initial={{ pathLength: 0.3, opacity: 0.5 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.5, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 22 + (path.id % 5) * 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center my-3">
      <div className="bg-border h-px w-full" />
      <span className="text-muted-foreground px-2 text-[10px] font-mono tracking-wider">OR</span>
      <div className="bg-border h-px w-full" />
    </div>
  );
};
