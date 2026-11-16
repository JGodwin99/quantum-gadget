import React, { useState } from 'react';
import { Lock, Mail, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function AuthModal() {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    login,
    register,
    requestPasswordReset,
    backendMode,
    notify,
    navigate,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const loggedUser = await login(email, password);
        setAuthModalOpen(false);
        notify(`Welcome back, ${loggedUser.full_name || loggedUser.email}.`, 'success');
        if (loggedUser.role === 'admin') {
          navigate('/admin');
        }
      } else if (mode === 'register') {
        const created = await register({
          email,
          password,
          full_name: fullName,
          phone,
        });
        setAuthModalOpen(false);
        notify(`Account created for ${created.full_name}.`, 'success');
      } else {
        const msg = await requestPasswordReset(email);
        setInfoMsg(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.toLowerCase().includes('confirm your account')) {
        setInfoMsg(msg);
        setMode('login');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Account authentication"
    >
      <div
        className="fixed inset-0 bg-[#050B18]/50 backdrop-blur-[1px]"
        onClick={() => setAuthModalOpen(false)}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-[#EAECF0] shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[#101828]">
              {mode === 'login'
                ? 'Customer Sign In'
                : mode === 'register'
                ? 'Create Customer Account'
                : 'Reset Password'}
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              {mode === 'login'
                ? 'Access your saved delivery details and order history.'
                : mode === 'register'
                ? 'Register to track your Cash on Delivery orders in one place.'
                : 'Enter your email address to receive reset instructions.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F7FB]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher (Customers only; never public admin registration) */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#F5F7FB] rounded-lg mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              mode === 'login' ? 'bg-white text-[#101828] shadow-xs' : 'text-[#667085]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors ${
              mode === 'register' ? 'bg-white text-[#101828] shadow-xs' : 'text-[#667085]'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-3 rounded-lg bg-[#ECFDF3] border border-[#ABEFC6] text-xs text-[#166534]">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jordan Rivera"
                    className="w-full h-11 pl-9 pr-3 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 415 555 0142"
                  className="w-full h-11 px-3 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 pl-9 pr-3 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#344054]">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                    }}
                    className="text-xs font-medium text-[#155EEF] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-[#D0D5DD] text-sm focus:outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-[#155EEF] text-white text-sm font-semibold hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : mode === 'register'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {backendMode === 'local_preview' && mode === 'login' && (
          <div className="mt-5 pt-4 border-t border-[#EAECF0] text-xs text-[#667085] space-y-1.5">
            <p className="font-semibold text-[#344054]">Preview Test Account</p>
            <div className="flex items-center justify-between">
              <span>Customer: customer@gizmohub.store</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('customer@gizmohub.store');
                  setPassword('CustomerDemo!2026');
                }}
                className="text-[#155EEF] font-semibold hover:underline"
              >
                Fill
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
