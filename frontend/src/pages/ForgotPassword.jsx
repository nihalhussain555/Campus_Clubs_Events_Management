import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck
} from 'lucide-react';
import {
  authAPI,
  clearPasswordRecovery,
  hasPasswordAnswerToken,
  hasPasswordResetToken,
  readRecoveryAccount,
  savePasswordAnswerToken,
  savePasswordResetToken,
  saveRecoveryAccount
} from '../services/api';
import {
  PASSWORD_REQUIREMENT_TEXT,
  passwordStrength
} from '../utils/passwordPolicy';
import PasswordRules from '../components/PasswordRules';
import Toast from '../components/Toast';

const STEPS = [
  { id: 'account', label: 'Your account' },
  { id: 'answer', label: 'Security question' },
  { id: 'password', label: 'New password' }
];

// Same landing map the mandatory first-login page uses, so a recovered session
// opens where the account belongs.
const LANDING_BY_ROLE = {
  admin: '/admin',
  club_leader: '/leader',
  club_member: '/profile'
};

// The answer is compared after trimming, and the server refuses anything under
// three characters once trimmed.
const ANSWER_MIN_LENGTH = 3;

// A reply carrying this code means the link the step runs on is spent - the
// password moved, or the walk was started somewhere else. Nothing the person
// typed can fix it, so the step is rebuilt from the top.
const isSpentLink = (error) =>
  error.response?.status === 404 ||
  (error.response?.status === 401 &&
    error.response?.data?.code === 'RECOVERY_LINK_INVALID');

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Where the walk got to before a refresh: the links are stored, so the page
  // resumes at the furthest step it holds a link for.
  const [step, setStep] = useState(() => {
    if (hasPasswordResetToken()) return 'password';
    if (hasPasswordAnswerToken()) return 'answer';

    return 'account';
  });

  const [account] = useState(() => readRecoveryAccount());

  const [email, setEmail] = useState(account?.email || '');
  const [question, setQuestion] = useState(account?.question || '');
  const [answer, setAnswer] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [landing, setLanding] = useState('/profile');
  const [showToast, setShowToast] = useState(false);

  const stepIndex = STEPS.findIndex((item) => item.id === step);

  const strength = passwordStrength(newPwd);

  const mismatch = Boolean(confirmPwd) && confirmPwd !== newPwd;

  // A spent link sends the whole walk back to the start.
  const restart = (message) => {
    clearPasswordRecovery();
    setAnswer('');
    setNewPwd('');
    setConfirmPwd('');
    setQuestion('');
    setStep('account');
    setError(message || '');
  };

  const goBack = (target) => {
    clearPasswordRecovery();
    setError('');
    setStep(target);
  };

  // =====================================================
  // STEP 1 - NAME THE ACCOUNT
  // =====================================================

  const handleAccountSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Please enter the email you registered with.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await authAPI.requestRecoveryQuestion({
        email: normalizedEmail
      });

      savePasswordAnswerToken(data.answerToken);
      saveRecoveryAccount({ email: normalizedEmail, question: data.question });

      setQuestion(data.question);
      setStep('answer');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'We could not reach the platform. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STEP 2 - ANSWER THE QUESTION
  // =====================================================

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();

    if (answer.trim().length < ANSWER_MIN_LENGTH) {
      setError(
        `Please type the answer to your security question - it needs at least ${ANSWER_MIN_LENGTH} characters.`
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await authAPI.verifyRecoveryAnswer({
        answer: answer.trim()
      });

      savePasswordResetToken(data.resetToken);

      setNewPwd('');
      setConfirmPwd('');
      setStep('password');
    } catch (err) {
      if (isSpentLink(err)) {
        restart(err.response?.data?.message);
      } else {
        setError(
          err.response?.data?.message ||
            'We could not check that answer. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // STEP 3 - CHOOSE A NEW PASSWORD
  // =====================================================

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!strength.meetsPolicy) {
      setError(
        `Your password is not strong enough. ${PASSWORD_REQUIREMENT_TEXT}.`
      );
      return;
    }

    if (newPwd !== confirmPwd) {
      setError('The two passwords do not match yet.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await authAPI.resetRecoveredPassword({
        newPassword: newPwd,
        confirmPassword: confirmPwd
      });

      // The reset ends with a normal session, so nothing of the walk is kept.
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      clearPasswordRecovery();

      // Held in state as well so the panel that follows can offer the same
      // destination without recomputing it from a value that has gone stale.
      const destination =
        LANDING_BY_ROLE[data.user?.role] || '/profile';

      setLanding(destination);
      setCompleted(true);
      setShowToast(true);

      window.setTimeout(() => {
        navigate(destination, { replace: true });
      }, 1200);
    } catch (err) {
      if (isSpentLink(err)) {
        restart(err.response?.data?.message);
      } else {
        setError(
          err.response?.data?.message ||
            'We could not save your new password. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  const shell = (children) => (
    <div className="auth-shell">
      {showToast && (
        <Toast
          message="Password reset. Opening your dashboard..."
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
        <div className="mb-6 text-center">
          <p className="eyebrow mb-3">
            Password recovery
          </p>

          <h1 className="text-3xl font-black text-black">
            Get back into your account
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            No email link and no one-time code. Your account answers the
            security question it chose when it was created.
          </p>
        </div>

        {/* PROGRESS */}
        <ol className="mb-7 flex items-center justify-center gap-2">
          {STEPS.map((item, index) => (
            <li
              key={item.id}
              className={
                index === stepIndex && !completed
                  ? 'filter-pill filter-pill-active'
                  : index < stepIndex || completed
                    ? 'filter-pill border-[#145f82] text-[#145f82]'
                    : 'filter-pill opacity-60'
              }
            >
              {index + 1}. {item.label}
            </li>
          ))}
        </ol>

        {children}

        {/* BACK TO LOGIN */}
        {!completed && (
          <p className="mt-7 text-center text-sm font-semibold text-slate-600">
            Remembered it after all?

            <button
              type="button"
              onClick={() => {
                clearPasswordRecovery();
                navigate('/login');
              }}
              className="ml-2 font-black text-[#145f82] hover:text-black"
            >
              Back to login
            </button>
          </p>
        )}
      </div>
    </div>
  );

  const errorPanel = error && (
    <div
      role="alert"
      className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
    >
      {error}
    </div>
  );

  if (completed) {
    return shell(
      <div className="space-y-5 text-center">
        <CheckCircle2
          size={44}
          className="mx-auto text-emerald-600"
        />

        <p className="text-sm leading-6 text-slate-600">
          Your password has been changed and you are signed in. Taking you to
          your dashboard...
        </p>

        <button
          type="button"
          onClick={() => navigate(landing, { replace: true })}
          className="btn-secondary w-full"
        >
          Go there now
        </button>
      </div>
    );
  }

  // -------------------------------------------------- step 1

  if (step === 'account') {
    return shell(
      <form onSubmit={handleAccountSubmit} className="space-y-5">
        {errorPanel}

        <div>
          <label
            htmlFor="recoveryEmail"
            className="field-label flex items-center gap-2"
          >
            <Mail size={17} />
            Registered email
          </label>

          <input
            id="recoveryEmail"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            className="field"
            placeholder="your@email.com"
            autoComplete="email"
            autoFocus
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            This platform has no username column - your registered email is
            what identifies the account.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Finding your account...' : 'Continue'}
        </button>

        <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <p className="text-xs leading-5 text-slate-600">
            Only the question you chose is shown next. If your account was
            opened by an administrator, or predates security questions, there is
            no question to answer here and an administrator has to issue a
            temporary password instead.
          </p>
        </div>
      </form>
    );
  }

  // -------------------------------------------------- step 2

  if (step === 'answer') {
    return shell(
      <form onSubmit={handleAnswerSubmit} className="space-y-5">
        {errorPanel}

        <div className="blue-panel">
          <p className="eyebrow mb-2 flex items-center gap-2">
            <HelpCircle size={15} />
            Your security question
          </p>

          <p className="text-sm font-bold text-[#145f82]">
            {question || 'Answer the question your account was asked at signup.'}
          </p>
        </div>

        <div>
          <label
            htmlFor="recoveryAnswer"
            className="field-label flex items-center gap-2"
          >
            <KeyRound size={17} />
            Your answer
          </label>

          <input
            id="recoveryAnswer"
            name="answer"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (error) setError('');
            }}
            className="field"
            placeholder="Type it exactly as you remember it"
            autoComplete="off"
            autoFocus
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Capital letters and extra spaces are ignored, so{' '}
            <span className="font-semibold text-slate-700">New York</span> and{' '}
            <span className="font-semibold text-slate-700">new york</span> count
            as the same answer.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Checking your answer...' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={() => goBack('account')}
          className="btn-secondary flex w-full items-center justify-center gap-2"
        >
          <ArrowLeft size={16} />
          Different email
        </button>
      </form>
    );
  }

  // -------------------------------------------------- step 3

  return shell(
    <form onSubmit={handleResetSubmit} className="space-y-5">
      {errorPanel}

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />

        <p className="text-xs leading-5 text-emerald-800">
          Answer verified
          {account?.email ? (
            <>
              {' '}
              for <span className="font-bold">{account.email}</span>
            </>
          ) : null}
          . Choose the password you want to use from now on.
        </p>
      </div>

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
          className={mismatch ? 'field border-red-300' : 'field'}
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
            ? 'The password you are recovering cannot simply be kept.'
            : mismatch
              ? 'Passwords do not match'
              : 'Passwords match'}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !strength.meetsPolicy || mismatch}
        className="btn-primary w-full"
      >
        {loading ? 'Updating your password...' : 'Reset password'}
      </button>

      <button
        type="button"
        onClick={() => goBack('answer')}
        className="btn-secondary flex w-full items-center justify-center gap-2"
      >
        <ArrowLeft size={16} />
        Back to the question
      </button>

      <div className="flex items-start gap-3 rounded-2xl bg-slate-100 p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />

        <p className="text-xs leading-5 text-slate-600">
          Only an encrypted copy of the new password is stored, and your
          security question stays exactly as it is. Signing in again afterwards
          uses this password, not the question.
        </p>
      </div>
    </form>
  );
};

export default ForgotPassword;
