'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, 
  Building2, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Save, 
  Clock, 
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatINR } from '@fdl/shared';

interface AccountRecord {
  id: string;
  user_id: string;
  bank: string;
  nickname: string;
  type: string;
  masked_last4: string;
  opening_balance_minor: number;
  currency: string;
  is_primary: boolean;
  status: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');

  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [newBank, setNewBank] = useState('HDFC Bank');
  const [newNickname, setNewNickname] = useState('');
  const [newType, setNewType] = useState('savings');
  const [newLast4, setNewLast4] = useState('');
  const [newBalanceRupees, setNewBalanceRupees] = useState('0');
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkAuth().then((authenticated) => {
      if (!authenticated) {
        router.push('/login');
      }
    });
  }, [checkAuth, router]);

  const loadUserData = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res && res.authenticated && res.user) {
        const u = res.user;
        if (u.profile) {
          setFullName(u.profile.full_name || '');
          setMobileNumber(u.profile.mobile_number || '');
          setCountry(u.profile.country || 'India');
          setCurrency(u.profile.preferred_currency || 'INR');
        } else if (u.name) {
          setFullName(u.name);
        }
        if (u.accounts) {
          setAccounts(u.accounts);
        }
      }
    } catch (err: any) {
      console.error('Failed to load user profile:', err);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setStatusMessage(null);

    try {
      await api.updateUserProfile({
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim() || undefined,
        country,
        preferred_currency: currency,
      });
      setStatusMessage({ type: 'success', text: 'Personal profile updated successfully.' });
      await checkAuth();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanLast4 = newLast4.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const paise = Math.round(parseFloat(newBalanceRupees || '0') * 100);

    try {
      await api.createUserAccount({
        bank: newBank.trim(),
        nickname: newNickname.trim() || `${newBank.trim()} Account`,
        type: newType,
        masked_last4: cleanLast4,
        opening_balance_minor: paise,
        currency,
        is_primary: accounts.length === 0,
      });

      setStatusMessage({ type: 'success', text: `Added account: ${newBank} (...${cleanLast4})` });
      setIsAddingAccount(false);
      setNewNickname('');
      setNewLast4('');
      setNewBalanceRupees('0');
      await loadUserData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to add bank account.' });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (accounts.length <= 1) {
      setStatusMessage({ type: 'error', text: 'You must maintain at least one linked account.' });
      return;
    }

    try {
      await api.deleteUserAccount(accountId);
      setStatusMessage({ type: 'success', text: 'Account deleted successfully.' });
      await loadUserData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to delete account.' });
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8 select-none">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal details, regional currency preferences, and linked bank accounts.
        </p>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </motion.div>
      )}

      {/* Grid: Profile & Bank Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
              <p className="text-xs text-slate-400">Authenticated user profile and contact details</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Account login email cannot be modified.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Kumar"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Bank Accounts Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Linked Bank Accounts</h2>
                <p className="text-xs text-slate-400">{accounts.length} active accounts</p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingAccount ? 'Cancel' : 'Add Account'}</span>
            </button>
          </div>

          {/* New Account Form */}
          {isAddingAccount && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleAddAccount}
              className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
            >
              <h3 className="text-xs font-bold text-slate-800">Add New Bank Account</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={newBank}
                    onChange={(e) => setNewBank(e.target.value)}
                    placeholder="ICICI Bank"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    placeholder="Emergency Fund"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Account Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="credit_card">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={newLast4}
                    onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingAccount(false)}
                  className="py-1 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                >
                  Add Account
                </button>
              </div>
            </motion.form>
          )}

          {/* Account List */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{acct.nickname || acct.bank}</p>
                      {acct.is_primary && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {acct.bank} •••• {acct.masked_last4} ({acct.type})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold text-slate-700">
                    {formatINR(acct.opening_balance_minor || 0)}
                  </span>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acct.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition"
                      title="Delete account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Local-First Security & Audit Notice */}
      <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <span className="font-semibold text-slate-800">Local-First Multi-User Security Guarantee: </span>
          All calculations, forecasts, and statement parsing run strictly against isolated user accounts. No financial records or credentials leave your environment.
        </div>
      </div>
    </div>
  );
}

