'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  CheckCircle2,
  Lock,
  Globe,
  DollarSign,
  Calendar,
  Sparkles,
  Sliders,
  LogOut,
  ExternalLink,
  ChevronRight,
  Database,
  KeyRound,
  FileCheck
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
  account_holder_name?: string;
  ifsc?: string;
  created_at?: string;
}

type TabType = 'profile' | 'accounts' | 'preferences' | 'security';

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

  // Financial Preferences
  const [safetyBufferTier, setSafetyBufferTier] = useState('1.0');
  const [savingsTargetPct, setSavingsTargetPct] = useState('25');
  const [privacyStrictness, setPrivacyStrictness] = useState('strict');

  // Bank Accounts
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newBank, setNewBank] = useState('HDFC Bank');
  const [newNickname, setNewNickname] = useState('');
  const [newType, setNewType] = useState('savings');
  const [newLast4, setNewLast4] = useState('');
  const [newBalanceRupees, setNewBalanceRupees] = useState('0');
  const [newHolderName, setNewHolderName] = useState('');
  const [newIfsc, setNewIfsc] = useState('');

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
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
    setIsSaving(true);
    setStatusMessage(null);

    try {
      await api.updateUserProfile({
        full_name: fullName.trim(),
        mobile_number: mobileNumber.trim() || undefined,
        country,
        preferred_currency: currency,
      });
      setStatusMessage({ type: 'success', text: 'Personal profile and preferences saved successfully.' });
      await checkAuth();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to update profile settings.' });
    } finally {
      setIsSaving(false);
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
        account_holder_name: newHolderName.trim() || fullName.trim() || undefined,
        ifsc: newIfsc.trim().toUpperCase() || undefined,
      });

      setStatusMessage({ type: 'success', text: `Successfully linked ${newBank} (...${cleanLast4})` });
      setIsAddingAccount(false);
      setNewNickname('');
      setNewLast4('');
      setNewBalanceRupees('0');
      setNewHolderName('');
      setNewIfsc('');
      await loadUserData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to add bank account.' });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (accounts.length <= 1) {
      setStatusMessage({ type: 'error', text: 'You must maintain at least one linked account for cash flow reconciliation.' });
      return;
    }

    try {
      await api.deleteUserAccount(accountId);
      setStatusMessage({ type: 'success', text: 'Bank account detached successfully.' });
      await loadUserData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to delete account.' });
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'AK';
  };

  const displayName = fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'User');
  const userInitials = getInitials(displayName, user?.email);
  const totalBalancePaise = accounts.reduce((acc, a) => acc + (a.opening_balance_minor || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 select-none text-foreground font-sans">
      {/* Top Profile Hero Card */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 text-primary font-mono font-bold text-2xl sm:text-3xl flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{displayName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Vault
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                  Local-First
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">{user?.email || 'user@example.com'}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Deterministic Financial Intelligence Profile · Single-Tenant User
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 sm:gap-6 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Linked Banks</p>
              <p className="text-xl font-bold font-mono text-foreground mt-0.5">{accounts.length}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tracked Liquidity</p>
              <p className="text-xl font-bold font-mono text-primary mt-0.5">{formatINR(totalBalancePaise)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                : 'bg-destructive/10 text-destructive border-destructive/25'
            }`}
          >
            <div className="flex items-center gap-3">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-muted-foreground hover:text-foreground text-xs px-2 py-0.5"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition relative border-b-2 ${
            activeTab === 'profile'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Personal Info</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition relative border-b-2 ${
            activeTab === 'accounts'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Linked Accounts ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition relative border-b-2 ${
            activeTab === 'preferences'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Financial Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition relative border-b-2 ${
            activeTab === 'security'
              ? 'text-primary border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Vault</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. PERSONAL INFORMATION */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground">Personal Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep your legal name and contact details updated for bank statement matching.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aarav Kumar"
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="India">India (IN)</option>
                    <option value="United States">United States (US)</option>
                    <option value="United Kingdom">United Kingdom (UK)</option>
                    <option value="Singapore">Singapore (SG)</option>
                    <option value="UAE">United Arab Emirates (UAE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Currency Standard
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                  >
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border mt-4">
                <span className="text-[11px] text-muted-foreground font-mono">
                  All updates committed to local SQLite instance.
                </span>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="py-2.5 px-5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                <span>Regional Formatting</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Indian numbering conventions (Lakhs and Crores grouping, e.g. <span className="font-mono text-foreground">₹1,23,456.78</span>) and exact integer paise arithmetic apply universally across your accounts.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Zero Cloud Egress</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your profile, transactions, and statement hashes reside strictly on your machine. Financial Decision Lab never transmits statement content to external servers.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. LINKED BANK ACCOUNTS */}
      {activeTab === 'accounts' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Linked Accounts & Wallets</h2>
              <p className="text-xs text-muted-foreground">
                Accounts are automatically created and reconciled whenever you import bank statements.
              </p>
            </div>
            <button
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="py-2 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingAccount ? 'Cancel Adding' : 'Add Bank Account'}</span>
            </button>
          </div>

          {/* Slide-out Add Account Form */}
          <AnimatePresence>
            {isAddingAccount && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddAccount}
                className="bg-card border border-primary/30 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Link New Bank Account</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Target Bank</label>
                    <select
                      value={newBank}
                      onChange={(e) => setNewBank(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="State Bank of India">State Bank of India (SBI)</option>
                      <option value="ICICI Bank">ICICI Bank</option>
                      <option value="Axis Bank">Axis Bank</option>
                      <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                      <option value="PhonePe">PhonePe Wallet</option>
                      <option value="Paytm Payments Bank">Paytm</option>
                      <option value="Other Bank">Other Bank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Account Nickname</label>
                    <input
                      type="text"
                      value={newNickname}
                      onChange={(e) => setNewNickname(e.target.value)}
                      placeholder="e.g. Salary Account / Emergency"
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Account Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="savings">Savings Account</option>
                      <option value="current">Current Account</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="wallet">Digital Wallet</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={newLast4}
                      onChange={(e) => setNewLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 1180"
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newBalanceRupees}
                      onChange={(e) => setNewBalanceRupees(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">IFSC Code (Optional)</label>
                    <input
                      type="text"
                      maxLength={11}
                      value={newIfsc}
                      onChange={(e) => setNewIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAccount(false)}
                    className="py-2 px-4 bg-muted hover:bg-muted/80 text-muted-foreground rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Save & Link Account
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Account Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acct) => (
              <div
                key={acct.id}
                className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 shadow-xs transition group space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{acct.nickname || acct.bank}</h3>
                        {acct.is_primary && (
                          <span className="text-[9px] px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 rounded-full font-bold uppercase font-mono">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {acct.bank} · <span className="font-mono">•••• {acct.masked_last4}</span> ({acct.type})
                      </p>
                    </div>
                  </div>

                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acct.id)}
                      title="Delete account"
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Opening Balance</p>
                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                      {formatINR(acct.opening_balance_minor || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Status</p>
                    <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="col-span-2 p-12 text-center bg-card border border-border rounded-2xl space-y-3">
                <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
                <h3 className="text-sm font-bold text-foreground">No Connected Accounts</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Upload an HDFC, SBI, ICICI, or PhonePe statement or click &quot;Add Bank Account&quot; to begin tracking your cash flow.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. FINANCIAL PREFERENCES */}
      {activeTab === 'preferences' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground">Decision Engine Calibration</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tune the risk parameters used in Affordability Verdicts and Monte Carlo simulations.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Safety Buffer Multiplier
                </label>
                <select
                  value={safetyBufferTier}
                  onChange={(e) => setSafetyBufferTier(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="1.0">Standard (1.0x Floor - Minimum 1 Month Obligations)</option>
                  <option value="1.25">Conservative (1.25x Floor - Recommended for Freelancers)</option>
                  <option value="1.5">Ultra-Safe (1.5x Floor - Maximum Risk Protection)</option>
                </select>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Determines the untouchable cash cushion required before marking a purchase as AFFORDABLE.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Target Monthly Savings Ratio
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={savingsTargetPct}
                    onChange={(e) => setSavingsTargetPct(e.target.value)}
                    className="flex-1 accent-primary cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-foreground w-12 text-right">
                    {savingsTargetPct}%
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Used by the Decision Lab to compute headroom surplus above your savings goals.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-foreground">Data Health & Audit Gates</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enforce strict data sufficiency before issuing financial verdicts.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-muted/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">90-Day Statement Gate</p>
                  <p className="text-[11px] text-muted-foreground">Refuse verdicts when history &lt; 90 days</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded">
                  ENFORCED
                </span>
              </div>

              <div className="p-3.5 bg-muted/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Integer Paise Precision</p>
                  <p className="text-[11px] text-muted-foreground">Zero floating-point rounding drift</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded">
                  ENFORCED
                </span>
              </div>

              <div className="p-3.5 bg-muted/60 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Number-Verification Guard</p>
                  <p className="text-[11px] text-muted-foreground">Regex verification of all ledger figures</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold rounded">
                  ENFORCED
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. SECURITY & VAULT */}
      {activeTab === 'security' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Local SQLite Vault</h2>
                <p className="text-xs text-muted-foreground">Physical database container and privacy mode</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Database Driver</p>
                <p className="font-bold text-foreground mt-0.5">SQLite 3.x (Sync & Async Session)</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Local Storage Path</p>
                <p className="font-bold text-primary mt-0.5 break-all">apps/api/fdl.db</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Egress Audit Log</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">0 Cloud Sync Requests · 100% Offline</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Session Authentication</h2>
                <p className="text-xs text-muted-foreground">Stateless JWT session security token</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your authenticated session is signed with HMAC-SHA256 and stored in an HTTP-only secure cookie. Sign out to revoke your session key.
              </p>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full py-2.5 px-4 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Current Session</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
