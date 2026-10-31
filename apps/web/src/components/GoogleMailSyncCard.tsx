'use client';

import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle2, AlertCircle, LogOut, ExternalLink, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

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
    // Check URL parameters for return from OAuth
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex items-center justify-center min-h-[140px]">
        <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-100">
                Gmail Automated Transaction Ingestion
              </h3>
              {status?.is_connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Directly scan and ingest bank alert emails (HDFC UPI, SBI, ICICI) received within the trailing 24 hours.
            </p>
            {status?.is_connected && status.email && (
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span>Account: <strong className="text-slate-200">{status.email}</strong></span>
                {status.last_synced_at && (
                  <span>Last synced: <span className="text-slate-300">{new Date(status.last_synced_at).toLocaleString()}</span></span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {status?.is_connected ? (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Scanning Gmail...' : 'Sync Last 24 Hours'}
              </button>
              <button
                onClick={handleDisconnect}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Disconnect Gmail"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-medium text-sm rounded-xl transition-all shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              Connect with Google (OAuth 2.0)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2.5 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-2">
            <CheckCircle2 className="w-4 h-4" /> 24-Hour Scan Completed
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Emails Scanned:</span>
              <p className="text-base font-semibold text-slate-100">{result.emails_scanned}</p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Bank Alerts Found:</span>
              <p className="text-base font-semibold text-slate-100">{result.alerts_parsed}</p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Transactions Added:</span>
              <p className="text-base font-semibold text-emerald-400">+{result.transactions_added}</p>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Duplicates Skipped:</span>
              <p className="text-base font-semibold text-slate-400">{result.duplicates_skipped}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
