import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Clock,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  ShieldCheck
} from 'lucide-react';
import {
  authAPI,
  clearPasswordSetupSession,
  hasPasswordSetupSession,
  readSetupAccount
} from '../services/api';
import {
  PASSWORD_REQUIREMENT_TEXT,
  passwordStrength
} from '../utils/passwordPolicy';
import PasswordRules from '../components/PasswordRules';
import Toast from '../components/Toast';

// Where each account type lands once it owns a real password.
const LANDING_BY_ROLE = {
  admin: '/admin',
  club_leader: '/leader',
  club_member: '/profile'
};

const ROLE_LABEL = {
  student: 'Student account',
  club_member: 'Student account',
  club_leader: 'Club leader account',
  admin: 'Administrator account'
};

const SetNewPassword = () => {
  const navigate = useNavigate();

  const [account] = useState(() => readSetupAccount());
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // The setup token is consumed on success, so the page needs its own record
  // of having earned the right to stay mounted until the redirect fires.
  const [completed, setCompleted] = useState(false);

  const authorised = completed || hasPasswordSetupSession();

  const strength = passwordStrength(newPwd);

  const mismatch =
    Boolean(confirmPwd) && confirmPwd !== newPwd;

  const expiresAt = account?.temporaryPasswordExpiresAt
    ? new Date(account.temporaryPasswordExpiresAt)
    : null;

  const expired = expiresAt && expiresAt.getTime() <= Date.now();

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (!strength.meetsPolicy) {
      setError(`Your password is not strong enough. ${PASSWORD_REQUIREMENT_TEXT}.`);
      return;
    }

    if (newPwd !== confirmPwd) {
      setError('The two passwords do not match yet.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authAPI.completePasswordSetup({
        newPassword: newPwd,
        confirmPassword: confirmPwd
      });

      // The account now has a normal session; the setup token is spent.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setCompleted(true);
      clearPasswordSetupSession();

      setShowToast(true);

      window.setTimeout(() => {
        navigate(LANDING_BY_ROLE[data.user?.role] || '/profile', {
          replace: true
        });
      }, 1100);
    } catch (err) {
      const status = err.response?.status;
      const message =
        err.response?.data?.message ||
        'We could not save your new password. Please try again.';

      if (status === 401) {
        // The setup token died with the temporary password: an administrator
        // has to issue a new one.
        setBlocked(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    clearPasswordSetupSession();
    navigate('/login');
  };

  if (!authorised) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="auth-shell">

      {/* SUCCESS TOAST */}
      {showToast && (
        <Toast
          message="Password saved. Opening your dashboard..."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="auth-card">

        {/* LOGO */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mx-auto mb-7 flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <GraduationCap size={22} strokeWidth={1.8} />
          </span>

          <span className="text-xl font-black text-black">
            Campus Clubs
          </span>
        </button>

        {/* TITLE */}
        <div className="mb-7 text-center">
          <p className="eyebrow mb-3">
            {ROLE_LABEL[account?.role] || 'Account setup'}
          </p>

          <h1 className="text-3xl font-black text-black">
            Set your new password
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            You signed in with a temporary password
            {account?.email ? (
              <> for <span className="font-bold text-black">{account.email}</span></>
            ) : null}
            . Choose a private one to unlock the platform.
          </p>
        </div>

        {/* EXPIRY NOTICE */}
        {expiresAt && !expired && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#bcddeb] bg-[#e8f5fb] p-4 text-xs font-semibold text-[#145f82]">
            <Clock size={16} className="mt-0.5 shrink-0" />

            <span>
              This temporary password stops working on{' '}
              {expiresAt.toLocaleString()}.
            </span>
          </div>
        )}

        {expired && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <Clock size={16} className="mt-0.5 shrink-0" />

            <span>
              This temporary password has expired. Please sign out and ask an
              administrator to generate a new one.
            </span>
          </div>
        )}

        {/* SETUP LINK NO LONGER VALID */}
        {blocked ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {blocked}
            </div>

            <button
              type="button"
              onClick={backToLogin}
              className="btn-primary w-full"
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ERROR */}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* NEW PASSWORD */}
            <div>
              <label
                htmlFor="newPassword"
                className="field-label flex items-center gap-2"
              >
                <Lock size={17} />
                New password
              </label>

              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => {
                    setNewPwd(e.target.value);
                    if (error) setError('');
                  }}
                  className="field pr-12"
                  placeholder="Choose a strong password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPwd((prev) => !prev)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* STRENGTH METER */}
              <div className="mt-3 flex items-center gap-2">
                <div className="xp-track flex-1">
                  <div
                    className="xp-fill"
                    style={{
                      width: `${strength.percent}%`,
                      background: strength.color
                    }}
                  />
                </div>

                <span
                  className="whitespace-nowrap text-xs font-bold"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>

              {/* REQUIREMENT CHECKLIST */}
              <PasswordRules value={newPwd} className="mt-4" />
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="field-label flex items-center gap-2"
              >
                <KeyRound size={17} />
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => {
                  setConfirmPwd(e.target.value);
                  if (error) setError('');
                }}
                className={
                  mismatch
                    ? 'field border-red-300'
                    : 'field'
                }
                placeholder="Re-type your new password"
                autoComplete="new-password"
              />

              <p
                className={
                  !confirmPwd
                    ? 'mt-2 text-xs text-slate-500'
                    : mismatch
                      ? 'mt-2 text-xs font-semibold text-red-600'
                      : 'mt-2 text-xs font-semibold text-emerald-600'
                }
              >
                {!confirmPwd
                  ? 'Your temporary password cannot be reused here.'
                  : mismatch
                    ? 'Passwords do not match'
                    : 'Passwords match'}
              </p>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading || !strength.meetsPolicy || mismatch}
              className="btn-primary w-full"
            >
              {loading
                ? 'Updating credentials...'
                : 'Update password'}
            </button>

            {/* SECURITY NOTE */}
            <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <p className="text-xs leading-5 text-slate-600">
                Until you set a password, your dashboard, clubs and events stay
                locked. Only an encrypted copy of your new password is stored.
              </p>
            </div>

            <p className="text-center text-sm font-semibold text-slate-600">
              Wrong account?

              <button
                type="button"
                onClick={backToLogin}
                className="ml-2 font-black text-[#145f82] hover:text-black"
              >
                Sign in again
              </button>
            </p>

          </form>
        )}

      </div>
    </div>
  );
};

export default SetNewPassword;
