import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, 
  AlertCircle, Loader2, ArrowRight, RefreshCw, X, Eye, EyeOff,
  GraduationCap, BookOpen, Shield, HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';

export default function ChangePasswordModal({ isOpen, onClose, initialRole = 'student', initialIdentifier = '', currentUser = null }) {
  // Modal Steps: 'request' | 'verify' | 'success'
  const [step, setStep] = useState('request');

  // Form Fields
  const [role, setRole] = useState(currentUser?.role || initialRole || 'student');
  const [identifier, setIdentifier] = useState(
    currentUser?.rollNumber || currentUser?.teacherId || currentUser?.username || initialIdentifier || ''
  );
  const [email, setEmail] = useState(currentUser?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [requiresEmailInput, setRequiresEmailInput] = useState(false);

  // Sync state if currentUser changes or modal reopens
  useEffect(() => {
    if (isOpen) {
      setStep('request');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setDevOtp(null);
      setRequiresEmailInput(false);

      if (currentUser) {
        setRole(currentUser.role === 'department_head' ? 'admin' : currentUser.role);
        setIdentifier(currentUser.rollNumber || currentUser.teacherId || currentUser.username || '');
        setEmail(currentUser.email || '');
      } else {
        setRole(initialRole || 'student');
        setIdentifier(initialIdentifier || '');
      }
    }
  }, [isOpen, currentUser, initialRole, initialIdentifier]);

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const getIdentifierLabel = () => {
    if (role === 'student') return 'Student Roll Number';
    if (role === 'teacher') return 'Teacher ID';
    return 'Admin Username';
  };

  const getIdentifierPlaceholder = () => {
    if (role === 'student') return 'e.g. 2204028';
    if (role === 'teacher') return 'e.g. ETE-294';
    return 'e.g. head-ete or admin';
  };

  // ── Step 1: Request OTP ───────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() && !email.trim()) {
      toast.error('Please enter your Student Roll / Teacher ID / Username');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: role === 'department_head' ? 'admin' : role,
        identifier: identifier.trim(),
        email: email.trim() || undefined
      };

      const res = await api.post('/auth/send-otp', payload);
      setMaskedEmail(res.data.emailMasked || email);
      if (res.data.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      toast.success(res.data.message || 'OTP sent successfully to your Gmail!');
      setCountdown(60);
      setStep('verify');
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.requiresEmailInput) {
        setRequiresEmailInput(true);
        toast.info(resData.message || 'Please provide your Gmail address to receive the verification OTP.');
      } else {
        toast.error(resData?.message || 'Failed to send OTP. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP & Change Password ──────────────────────────────
  const handleVerifyAndChange = async (e) => {
    if (e) e.preventDefault();

    if (!otp.trim() || otp.trim().length < 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New Password and Confirm Password do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: role === 'department_head' ? 'admin' : role,
        identifier: identifier.trim(),
        email: email.trim() || undefined,
        otp: otp.trim(),
        newPassword,
        confirmPassword
      };

      const res = await api.post('/auth/change-password', payload);
      toast.success(res.data.message || 'Password updated in real-time!');
      setStep('success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header Bar */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Close modal"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Change Password</h3>
              <p className="text-xs text-blue-100 font-medium">Real-Time Verification via Gmail OTP</p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/20 text-xs font-semibold">
            <div className={`flex items-center gap-1.5 ${step === 'request' ? 'text-white' : 'text-blue-200'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'request' ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
              }`}>1</span>
              <span>Request OTP</span>
            </div>
            <div className="h-0.5 w-6 bg-white/30" />
            <div className={`flex items-center gap-1.5 ${step === 'verify' ? 'text-white' : 'text-blue-200'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'verify' ? 'bg-white text-blue-600' : 'bg-white/30 text-white'
              }`}>2</span>
              <span>Set Password</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* STEP 1: REQUEST OTP */}
          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              {/* Role Selector (if not logged in) */}
              {!currentUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'student', label: 'Student', icon: GraduationCap },
                      { id: 'teacher', label: 'Teacher', icon: BookOpen },
                      { id: 'admin',   label: 'Admin',   icon: ShieldCheck }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const active = role === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setRole(tab.id);
                            setRequiresEmailInput(false);
                          }}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                            active 
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <Icon size={14} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  {getIdentifierLabel()} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Shield size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={getIdentifierPlaceholder()}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {role === 'student' && 'Enter your RUET roll number (e.g. 2204028)'}
                  {role === 'teacher' && 'Enter your Teacher ID (e.g. ETE-294)'}
                  {role === 'admin' && 'Enter your department head or admin username'}
                </p>
              </div>

              {/* Gmail Address Input (if required or user wants to enter) */}
              {(requiresEmailInput || !currentUser) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Gmail Address {requiresEmailInput && <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {requiresEmailInput ? 'Required for verification' : 'Optional if already linked'}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      required={requiresEmailInput}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Info Note */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5">
                <HelpCircle size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-900 dark:text-blue-200 leading-relaxed">
                  A 6-digit OTP code will be sent to the Gmail address registered with this account. You can use it to securely change your password.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !identifier.trim()}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending OTP to Gmail...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY OTP & ENTER NEW PASSWORD */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyAndChange} className="space-y-4">
              {/* Target Email Notice */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">OTP Sent to:</p>
                    <p className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200 truncate">{maskedEmail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Dev OTP Quick Helper (shown in dev mode for easy testing) */}
              {devOtp && (
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 flex items-center justify-between">
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-bold">Test OTP Code: </span>
                    <span className="font-mono font-black text-amber-900 dark:text-amber-100 tracking-wider">{devOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-300"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* 6-Digit OTP Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Enter 6-Digit OTP <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={handleRequestOtp}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="&bull; &bull; &bull; &bull; &bull; &bull;"
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-black py-2.5 px-3 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                />
              </div>

              {/* New Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white dark:bg-slate-800/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-[11px] font-semibold text-red-500">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length < 6 || !newPassword || newPassword !== confirmPassword}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Database in Real-Time...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Update Password in Real-Time</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-in zoom-in-75 duration-300">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Password Changed Successfully!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Your new password is now active in the database in real-time. You can log in using your updated credentials.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Done / Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
