'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  User, 
  Building2, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

interface BankAccountForm {
  id: string;
  bank: string;
  nickname: string;
  type: string;
  masked_last4: string;
  opening_balance_rupees: string;
  currency: string;
  is_primary: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser, checkAuth } = useAuthStore();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');

  const [accounts, setAccounts] = useState<BankAccountForm[]>([
    {
      id: 'acct-1',
      bank: 'HDFC Bank',
      nickname: 'Primary Salary Account',
      type: 'savings',
      masked_last4: '5678',
      opening_balance_rupees: '25000',
      currency: 'INR',
      is_primary: true,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        router.push('/login');
      }
    });
  }, [checkAuth, router]);

  useEffect(() => {
    if (user) {
      if (user.profile?.full_name) setFullName(user.profile.full_name);
      else if (user.name) setFullName(user.name);
      if (user.profile?.mobile_number) setMobileNumber(user.profile.mobile_number);
      if (user.profile?.country) setCountry(user.profile.country);
      if (user.profile?.preferred_currency) setCurrency(user.profile.preferred_currency);
    }
  }, [user]);

  const addAccount = () => {
    setAccounts([
      ...accounts,
      {
        id: `acct-${Date.now()}`,
        bank: 'State Bank of India',
        nickname: `Savings Account ${accounts.length + 1}`,
        type: 'savings',
        masked_last4: '',
        opening_balance_rupees: '0',
        currency,
        is_primary: accounts.length === 0,
      },
    ]);
  };

  const removeAccount = (id: string) => {
    if (accounts.length <= 1) return;
    const remaining = accounts.filter((a) => a.id !== id);
    if (!remaining.some((a) => a.is_primary) && remaining.length > 0) {
      remaining[0].is_primary = true;
    }
    setAccounts(remaining);
  };

  const updateAccountField = (id: string, field: keyof BankAccountForm, val: any) => {
    setAccounts(
      accounts.map((a) => {
        if (a.id === id) {
          return { ...a, [field]: val };
        }
        if (field === 'is_primary' && val === true) {
          return { ...a, is_primary: false };
        }
        return a;
      })
    );
  };

  const handleComplete = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Convert rupee inputs to integer paise
      const bank_accounts = accounts.map((a) => {
        const rupees = parseFloat(a.opening_balance_rupees || '0');
        const paise = Math.round(rupees * 100);
        const last4 = a.masked_last4.replace(/\D/g, '').slice(-4).padStart(4, '0');
        return {
          bank: a.bank.trim(),
          nickname: a.nickname.trim(),
          type: a.type,
          masked_last4: last4,
          opening_balance_minor: paise,
          currency: a.currency,
          is_primary: a.is_primary,
        };
      });

      const res = await api.completeOnboarding({
        full_name: fullName.trim() || user?.name || 'User',
        mobile_number: mobileNumber.trim() || undefined,
        country,
        preferred_currency: currency,
        bank_accounts,
      });

      if (res && res.status === 'success') {
        setUser(res.user);
        router.push('/');
      } else {
        setErrorMessage(res?.detail || 'Failed to complete onboarding.');
      }
    } catch (err: any) {
      setErrorMessage(err.detail || err.message || 'Error completing onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header / Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100">Welcome to Financial Decision Lab</h1>
                <p className="text-xs text-slate-400">Step {step} of 2 — Set up your financial profile</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                1
              </span>
              <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-800'}`}></div>
              <span
                className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                2
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-800/80 pb-3 mb-4">
                <h2 className="text-sm font-semibold text-slate-200">Personal & Regional Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your baseline configuration for currency math and localized formatting.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Kumar"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile (Optional)</label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="India"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    <option value="INR">INR (₹ Indian Rupee)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                    <option value="EUR">EUR (€ Euro)</option>
                    <option value="GBP">GBP (£ British Pound)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!fullName.trim()}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  <span>Continue to Bank Accounts</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-800/80 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">Bank Accounts Metadata</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    We only store masked metadata (last 4 digits). Never enter passwords or PINs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAccount}
                  className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Account</span>
                </button>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {accounts.map((acct, index) => (
                  <div
                    key={acct.id}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-slate-300">Account #{index + 1}</span>
                        {acct.is_primary && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-semibold">
                            Primary
                          </span>
                        )}
                      </div>

                      {accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAccount(acct.id)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Remove Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Bank Name</label>
                        <input
                          type="text"
                          required
                          value={acct.bank}
                          onChange={(e) => updateAccountField(acct.id, 'bank', e.target.value)}
                          placeholder="HDFC Bank"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Account Nickname</label>
                        <input
                          type="text"
                          required
                          value={acct.nickname}
                          onChange={(e) => updateAccountField(acct.id, 'nickname', e.target.value)}
                          placeholder="Salary Account"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Account Type</label>
                        <select
                          value={acct.type}
                          onChange={(e) => updateAccountField(acct.id, 'type', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        >
                          <option value="savings">Savings Account</option>
                          <option value="current">Current Account</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="salary">Salary Account</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Last 4 Digits</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={acct.masked_last4}
                          onChange={(e) => updateAccountField(acct.id, 'masked_last4', e.target.value.replace(/\D/g, ''))}
                          placeholder="5678"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1">Initial Balance (₹)</label>
                        <input
                          type="number"
                          value={acct.opening_balance_rupees}
                          onChange={(e) => updateAccountField(acct.id, 'opening_balance_rupees', e.target.value)}
                          placeholder="0"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                          <input
                            type="radio"
                            name="primary_account"
                            checked={acct.is_primary}
                            onChange={() => updateAccountField(acct.id, 'is_primary', true)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span>Set as Primary Account</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Privacy & Zero-Egress Notice */}
              <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Privacy-first: Banking records and statements are parsed locally and never transmitted to external third parties.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finish & Go to Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

