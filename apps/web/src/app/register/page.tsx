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
  User as UserIcon,
  Phone as PhoneIcon,
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
import { CardsAnimation } from '@/components/auth/CardsAnimation';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password complexity checks
  const isMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isMinLength || !hasLetter || !hasNumber) {
      setErrorMessage('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim() || undefined,
        preferred_currency: currency,
      });

      if (res && res.status === 'success') {
        setUser(res.user);
        // After registration flow -> proceed directly to upload tab
        router.push('/upload');
      } else {
        setErrorMessage(res?.detail || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(
        err.detail || err.message || 'Unable to create account. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground lg:grid lg:grid-cols-2 font-sans select-none">
      {/* ========================================================
          LEFT COLUMN: BRAND SHOWCASE & PLATFORM VALUE
      ======================================================== */}
      <div className="bg-muted/40 relative hidden h-full flex-col justify-between border-r border-border p-8 xl:p-10 lg:flex overflow-hidden">
        {/* Subtle gradient vignette */}
        <div className="from-background absolute inset-0 z-10 bg-gradient-to-t to-transparent pointer-events-none opacity-80" />

        {/* Brand Header */}
        <div className="z-20 flex items-center gap-3 shrink-0">
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

        {/* Center Showcase with Animated Dual Cards */}
        <div className="z-20 my-auto flex flex-col items-center justify-center w-full max-w-md mx-auto py-2">
          {/* Animated Cards Container - Professionally proportioned & centered */}
          <div className="w-full flex justify-center items-center">
            <CardsAnimation 
              speed={0.55}
              className="w-full max-w-[280px] sm:max-w-[320px] xl:max-w-[350px] h-[175px] sm:h-[195px] xl:h-[220px]" 
            />
          </div>

          <div className="text-center space-y-3 max-w-sm mt-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs font-mono text-primary backdrop-blur-sm">
              <ShieldCheckIcon className="size-3.5" />
              <span>100% LOCAL-FIRST & AIR-GAPPED</span>
            </div>

            <blockquote className="space-y-1.5">
              <p className="text-xl xl:text-2xl font-bold tracking-tight leading-snug text-foreground">
                &ldquo;Make every financial decision with mathematical certainty.&rdquo;
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Deterministic dual-account cash-flow modeling with zero hallucinations and provable mathematical headroom.
              </p>
            </blockquote>

            <div className="pt-0.5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="px-2.5 py-0.5 rounded-md bg-card/60 border border-border">5k Monte Carlo</span>
              <span className="px-2.5 py-0.5 rounded-md bg-card/60 border border-border">Integer Paise</span>
              <span className="px-2.5 py-0.5 rounded-md bg-card/60 border border-border">Seed=42</span>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="z-20 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/60 shrink-0">
          <span>Local SQLite Storage (fdl.db)</span>
          <span className="font-mono text-[11px] text-primary font-semibold">Zero Cloud Egress</span>
        </div>

        {/* Ambient Subtle Accent Glow */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30"
          style={{
            background: 'radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.18) 0%, transparent 65%)'
          }}
        />
      </div>

      {/* ========================================================
          RIGHT COLUMN: REGISTRATION INTERFACE
      ======================================================== */}
      <div className="relative flex h-full flex-col justify-between p-6 sm:p-10 overflow-y-auto">
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

        {/* Main Sign-Up Card Container */}
        <div className="mx-auto w-full max-w-sm my-auto py-4">
          {/* Mobile-only brand */}
          <div className="flex items-center gap-2 mb-4 lg:hidden">
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-3 bg-primary rounded-sm" />
              <span className="w-1.5 h-5 bg-primary rounded-sm" />
              <span className="w-1.5 h-4 bg-primary rounded-sm" />
            </div>
            <p className="text-base font-bold text-foreground">Financial Decision Lab</p>
          </div>

          <div className="flex flex-col space-y-1 mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create Your Account
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Set up your local workspace to analyze statements with provable math.
            </p>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-start gap-2.5 text-destructive text-xs">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Full Name */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Kumar"
                  required
                  className="w-full bg-input border border-border rounded-lg ps-8 pe-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5">
                  <UserIcon className="size-3.5" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Email Address */}
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

            {/* Mobile Number (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">Mobile Number</label>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-input border border-border rounded-lg ps-8 pe-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5">
                  <PhoneIcon className="size-3.5" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Password
              </label>
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

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-foreground">Confirm Password</label>
                {confirmPassword && (
                  <span className={cn(
                    'text-[10px] font-medium flex items-center gap-0.5',
                    passwordsMatch ? 'text-emerald-500' : 'text-rose-500'
                  )}>
                    {passwordsMatch ? '✓ Matches' : '✗ Mismatch'}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-input border border-border rounded-lg ps-8 pe-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <div className="text-muted-foreground pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2.5">
                  <LockIcon className="size-3.5" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Password Requirement Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                isMinLength ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-muted border-border text-muted-foreground'
              )}>
                {isMinLength ? '✓ 8+ chars' : '8+ chars'}
              </span>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                hasLetter ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-muted border-border text-muted-foreground'
              )}>
                {hasLetter ? '✓ Letters' : 'Letters'}
              </span>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                hasNumber ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold' : 'bg-muted border-border text-muted-foreground'
              )}>
                {hasNumber ? '✓ Numbers' : 'Numbers'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-foreground text-background font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-3 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <>
                  <span>Create Account &amp; Ingest Statement</span>
                  <ArrowRightIcon className="size-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-semibold transition">
                Sign in here
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
        <footer className="text-center text-[11px] text-muted-foreground pt-2">
          Financial Decision Lab · Confidential Personal Finance Assistant
        </footer>
      </div>
    </main>
  );
}
