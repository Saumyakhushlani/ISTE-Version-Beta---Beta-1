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
  ChevronRight,
  Database,
  KeyRound,
  FileCheck,
  Edit2,
  Star,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatINR } from '@fdl/shared';
import EditAccountModal, { AccountRecord } from '@/components/EditAccountModal';

type TabType = 'profile' | 'accounts' | 'preferences' | 'security';

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Form State - Personal Info
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [currency, setCurrency] = useState('INR');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');

  // Financial Preferences
  const [safetyBufferTier, setSafetyBufferTier] = useState('1.0');
  const [savingsTargetPct, setSavingsTargetPct] = useState('25');
  const [preferencesSaved, setPreferencesSaved] = useState(false);

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

  // Edit Account Modal State
  const [editingAccount, setEditingAccount] = useState<AccountRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Security - Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

        // Fetch fresh accounts with live reconciled balance
        try {
          const acctsRes = await api.getUserAccounts();
          if (Array.isArray(acctsRes)) {
            setAccounts(acctsRes);
          } else if (u.accounts) {
            setAccounts(u.accounts);
          }
        } catch {
          if (u.accounts) setAccounts(u.accounts);
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

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setPreferencesSaved(true);
    setStatusMessage({ type: 'success', text: 'Decision Engine calibration settings saved successfully.' });
    setTimeout(() => setPreferencesSaved(false), 3000);
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

      setStatusMessage({ type: 'success', text: `Successfully linked ${newBank} (...${cleanLast4}) with opening balance ${formatINR(paise)}.` });
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

  const handleSetPrimary = async (accountId: string) => {
    setStatusMessage(null);
    try {
      await api.setPrimaryUserAccount(accountId);
      setStatusMessage({ type: 'success', text: 'Primary account updated successfully.' });
      await loadUserData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.detail || 'Failed to set primary account.' });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (accounts.length <= 1) {
      setStatusMessage({ type: 'error', text: 'You must maintain at least one linked account for cash flow reconciliation.' });
      return;
    }

    if (!window.confirm('Are you sure you want to detach this bank account? All associated transactions and balance records will be removed.')) {
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'New passwords do not match. Please re-enter.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordStatus({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ type: 'error', text: err.detail || 'Failed to update password.' });
    } finally {
      setIsChangingPassword(false);
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
  const totalOpeningPaise = accounts.reduce((acc, a) => acc + (a.opening_balance_minor || 0), 0);
  const totalReconciledPaise = accounts.reduce((acc, a) => {
    return acc + (a.current_balance_minor !== undefined ? a.current_balance_minor : (a.opening_balance_minor || 0));
  }, 0);
  const primaryAccount = accounts.find((a) => a.is_primary);

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
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Opening Anchor</p>
              <p className="text-xl font-bold font-mono text-foreground mt-0.5">{formatINR(totalOpeningPaise)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reconciled Cash</p>
              <p className="text-xl font-bold font-mono text-primary mt-0.5">{formatINR(totalReconciledPaise)}</p>
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
          <span>Decision Parameters</span>
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

      {/* 1. PERSONAL INFO TAB */}
      {activeTab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground">User Identification</h2>
              <p className="text-xs text-muted-foreground">Manage your identity metadata and statement attribution.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Account Holder Name
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
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full bg-muted/60 border border-border rounded-xl px-3.5 py-2.5 text-xs text-muted-foreground font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Mobile Number
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
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-foreground">
                <Globe className="w-4 h-4 text-primary" />
                <span>Regional Formatting</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Indian numbering conventions (Lakhs and Crores grouping, e.g. <span className="font-mono text-foreground">₹1,23,456.78</span>) and exact integer paise arithmetic apply universally across your accounts.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
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
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-5 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span>Linked Accounts & Starting Liquidity</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set and edit your account opening balance amounts in Rupees. Current balances are computed as <span className="font-mono font-semibold text-foreground">Opening Balance + Net Transaction Movements</span>.
              </p>
            </div>
            <button
              onClick={() => setIsAddingAccount(!isAddingAccount)}
              className="py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs self-start sm:self-auto shrink-0"
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
                className="bg-card border border-primary/40 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Link New Bank Account</h3>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    Initial Opening Amount will be anchored in Integer Paise
                  </span>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">Opening Amount (₹)</label>
                      <span className="text-[10px] font-mono text-primary font-bold">
                        {formatINR(Math.round((parseFloat(newBalanceRupees) || 0) * 100))}
                      </span>
                    </div>
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
            {accounts.map((acct) => {
              const liveReconciledPaise = acct.current_balance_minor !== undefined 
                ? acct.current_balance_minor 
                : (acct.opening_balance_minor || 0);

              return (
                <div
                  key={acct.id}
                  className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 shadow-xs transition group space-y-4 relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                        {acct.type === 'wallet' ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{acct.nickname || acct.bank}</h3>
                          {acct.is_primary ? (
                            <span className="text-[9px] px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 rounded-full font-bold uppercase font-mono flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                              PRIMARY
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPrimary(acct.id)}
                              className="text-[9px] px-2 py-0.5 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border rounded-full font-mono transition"
                              title="Make this your primary account"
                            >
                              Make Primary
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {acct.bank} · <span className="font-mono">•••• {acct.masked_last4}</span> ({acct.type})
                          {acct.ifsc && <span className="ml-1 text-[10px] font-mono">[{acct.ifsc}]</span>}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccount(acct);
                          setIsEditModalOpen(true);
                        }}
                        title="Edit Account & Opening Amount"
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

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
                  </div>

                  {/* Dual Balance Visualizer: Opening Balance vs Live Reconciled Balance */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border bg-muted/20 p-3 rounded-xl">
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Opening Amount</p>
                        <button
                          onClick={() => {
                            setEditingAccount(acct);
                            setIsEditModalOpen(true);
                          }}
                          className="text-[10px] text-primary hover:underline font-mono"
                        >
                          Edit
                        </button>
                      </div>
                      <p className="text-sm font-bold font-mono text-foreground mt-0.5">
                        {formatINR(acct.opening_balance_minor || 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        Base starting anchor
                      </p>
                    </div>

                    <div className="border-l border-border pl-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Reconciled Balance</p>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {formatINR(liveReconciledPaise)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {acct.transaction_count !== undefined ? `${acct.transaction_count} txns reconciled` : 'Live liquidity'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

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

            <form onSubmit={handleSavePreferences} className="space-y-4">
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

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </button>
              </div>
            </form>
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
          {/* Change Password Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Update Password</h2>
                <p className="text-xs text-muted-foreground">Change your single-tenant vault master password</p>
              </div>
            </div>

            {passwordStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  passwordStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                    : 'bg-destructive/10 text-destructive border-destructive/25'
                }`}
              >
                {passwordStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                )}
                <span>{passwordStatus.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Passwords are hashed locally with bcrypt (10 rounds) and verified against constant-time comparison.
              </p>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Session & Database Vault Card */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
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

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Session Termination</h2>
                  <p className="text-xs text-muted-foreground">Stateless JWT session security token</p>
                </div>
              </div>

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

      {/* Edit Account Modal */}
      <EditAccountModal
        account={editingAccount}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAccount(null);
        }}
        onSuccess={async () => {
          setStatusMessage({ type: 'success', text: `Account updated successfully with new balance parameters.` });
          await loadUserData();
        }}
      />
    </div>
  );
}
