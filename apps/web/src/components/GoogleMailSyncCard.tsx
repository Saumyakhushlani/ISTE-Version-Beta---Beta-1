'use client';

import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, LogOut, ShieldAlert, Sparkles, Clock, Check } from 'lucide-react';
import { api } from '@/lib/api';

const ALLOWED_TEST_EMAIL = "saumyakhushlani9@gmail.com";

export default function GoogleMailSyncCard({ onSyncSuccess }: { onSyncSuccess?: () => void }) {
  const [status, setStatus] = useState<{
    is_connected: boolean;
    email: string | null;
    last_synced_at: string | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('google_connected') === 'true') {
        fetchStatus();
      }
      if (urlParams.get('google_error')) {
        setError(urlParams.get('google_error'));
      }
    }
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getEmailSyncStatus();
      setStatus(res);
    } catch (err: any) {
      console.error('Failed to get email sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError(null);
      const data = await api.getEmailAuthorizeUrl();
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate Google OAuth authorization.');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setResult(null);
      const res = await api.syncEmails24h();
      setResult(res);
      fetchStatus();
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      setError(err?.message || 'Sync failed. Ensure Google account is connected.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your Google account from Financial Decision Lab?')) return;
    try {
      await api.disconnectEmailSync();
      setStatus({ is_connected: false, email: null, last_synced_at: null });
      setResult(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to disconnect account.');
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center min-h-[140px] shadow-2xs">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-xs relative overflow-hidden transition-all">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Top Banner Notice: Test Account Restriction */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-3 border-b border-border/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="font-mono uppercase tracking-wider text-[11px] font-semibold text-muted-foreground">
            OAuth Testing Mode
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Only testing account allowed: <strong className="font-semibold underline decoration-amber-500/30">{ALLOWED_TEST_EMAIL}</strong></span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0 shadow-2xs">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base font-bold text-foreground">
                Gmail 24-Hour Automated Ingestion
              </h3>
              {status?.is_connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Scan and parse real-time bank notification emails (HDFC UPI, SBI, ICICI) received within the trailing 24 hours directly into the ledger.
            </p>
            {status?.is_connected && status.email && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Account: <strong className="text-foreground font-mono">{status.email}</strong>
                </span>
                {status.last_synced_at && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    Last synced: <span className="text-foreground">{new Date(status.last_synced_at).toLocaleString()}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
          {status?.is_connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Scanning Gmail...' : 'Sync Last 24 Hours'}
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-transparent hover:border-destructive/20 transition-all cursor-pointer"
                title="Disconnect Google Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-background hover:bg-muted text-foreground border border-border font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Connect with Google (OAuth 2.0)</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2.5 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-muted/40 border border-border rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5">
            <CheckCircle2 className="w-4 h-4" /> 24-Hour Gmail Ingestion Scan Completed
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
              <span className="text-muted-foreground text-[11px]">Emails Scanned:</span>
              <p className="text-base font-bold text-foreground mt-0.5">{result.emails_scanned}</p>
            </div>
            <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
              <span className="text-muted-foreground text-[11px]">Bank Alerts Found:</span>
              <p className="text-base font-bold text-foreground mt-0.5">{result.alerts_parsed}</p>
            </div>
            <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
              <span className="text-muted-foreground text-[11px]">Transactions Added:</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">+{result.transactions_added}</p>
            </div>
            <div className="bg-card p-2.5 rounded-lg border border-border shadow-2xs">
              <span className="text-muted-foreground text-[11px]">Duplicates Skipped:</span>
              <p className="text-base font-bold text-muted-foreground mt-0.5">{result.duplicates_skipped}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
