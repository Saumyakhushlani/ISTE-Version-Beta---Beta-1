'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Key, 
  Eye, 
  EyeOff, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  RefreshCw,
  X,
  ShieldCheck
} from 'lucide-react';

interface StatementPasswordModalProps {
  isOpen: boolean;
  fileName?: string;
  fileType?: string;
  isIncorrect?: boolean;
  isSubmitting?: boolean;
  onSubmit: (password: string) => Promise<void> | void;
  onClose: () => void;
}

export default function StatementPasswordModal({
  isOpen,
  fileName = 'Statement',
  fileType = 'Document',
  isIncorrect = false,
  isSubmitting = false,
  onSubmit,
  onClose,
}: StatementPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      // Auto-focus input after transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;
    onSubmit(password.trim());
  };

  const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls') || fileType.toLowerCase().includes('excel');
  const isPdf = fileName.toLowerCase().endsWith('.pdf') || fileType.toLowerCase().includes('pdf');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-10"
          >
            {/* Header with decorative Amber Lock Banner */}
            <div className="relative p-5 bg-muted/40 border-b border-border flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    Password Protected Statement
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    This {fileType} requires a decryption password to open.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* File details banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 border border-border text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  {isExcel ? (
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : isPdf ? (
                    <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                  ) : (
                    <Key className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className="font-mono font-medium text-foreground truncate" title={fileName}>
                    {fileName}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {isExcel ? 'Excel' : isPdf ? 'PDF' : fileType}
                </span>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                  <span>Enter Password</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Encrypted on your device</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. DOB or Customer ID"
                    className={`w-full bg-input border ${
                      isIncorrect ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-primary'
                    } rounded-xl pl-9 pr-10 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 font-mono font-medium`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isIncorrect && (
                  <p className="mt-1.5 text-[11px] text-destructive flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Incorrect password. Please verify the bank formula below and try again.</span>
                  </p>
                )}
              </div>

              {/* Bank Password Hint Accordion */}
              <div className="border border-border/70 rounded-xl overflow-hidden bg-muted/20">
                <button
                  type="button"
                  onClick={() => setShowHelp(!showHelp)}
                  className="w-full px-3 py-2 text-left flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Common Indian Bank Password Formulas</span>
                  </span>
                  {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showHelp && (
                  <div className="p-3 pt-0 border-t border-border/60 text-[11px] text-muted-foreground space-y-1.5 font-mono">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground">HDFC:</span>
                      <span>Customer ID (or NetBanking Password / DOB DDMMYYYY)</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground">SBI:</span>
                      <span>DOB (DDMMYYYY) + last 4 digits of registered mobile</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground">ICICI:</span>
                      <span>First 4 letters of name in lowercase + DOB (DDMM)</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground">Axis:</span>
                      <span>Name (UPPERCASE) + last 4 digits of Customer ID</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-foreground">Kotak:</span>
                      <span>Customer Relationship Number (CRN)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security reassurance */}
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Zero-cloud transmission: Decrypted locally for statement parsing.</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !password.trim()}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Unlocking...</span>
                    </>
                  ) : (
                    <>
                      <span>Unlock &amp; Process</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
