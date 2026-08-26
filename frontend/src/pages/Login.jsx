import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail } from 'lucide-react';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const navigate = useNavigate();

  // =====================================================
  // HANDLE INPUT CHANGE
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Remove old error when user starts typing again
    if (error) {
      setError('');
    }
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validate = () => {
    if (!formData.email || !formData.password) {
      return 'Please fill all required fields';
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      return 'Please enter a valid email address';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    return '';
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous error
    setError('');

    // Validate form
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.login({
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      });

      const { token, user } = response.data;

      // Save authentication data
      localStorage.setItem('token', token);
      localStorage.setItem(
        'user',
        JSON.stringify(user)
      );

      // Show success message
      setShowToast(true);

      // Redirect only after successful login
      window.setTimeout(() => {
        navigate('/profile');
      }, 900);

    } catch (err) {
      console.error('Login error:', err);

      // =================================================
      // IMPORTANT
      // Backend returns:
      // {
      //   message: "Invalid credentials"
      // }
      // =================================================

      if (err.response?.status === 401) {
        setError(
          err.response?.data?.message ||
          'Invalid email or password'
        );
      } else {
        setError(
          err.response?.data?.message ||
          'Unable to login. Please try again.'
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="auth-shell">

      {/* SUCCESS TOAST */}
      {showToast && (
        <Toast
          message="Login successful. Redirecting..."
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
            <GraduationCap
              size={22}
              strokeWidth={1.8}
            />
          </span>

          <span className="text-xl font-black text-black">
            Campus Clubs
          </span>
        </button>

        {/* TITLE */}
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">
            Welcome back
          </p>

          <h1 className="text-3xl font-black text-black">
            Login to continue
          </h1>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* EMAIL */}
          <div>
            <label className="field-label flex items-center gap-2">
              <Mail size={17} />
              Email
            </label>

            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="field"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="field-label flex items-center gap-2">
              <Lock size={17} />
              Password
            </label>

            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="field"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading
              ? 'Processing...'
              : 'Login'}
          </button>

        </form>

        {/* REGISTER */}
        <p className="mt-7 text-center text-sm font-semibold text-slate-600">
          Do not have an account?

          <button
            type="button"
            onClick={() => navigate('/register')}
            className="ml-2 font-black text-[#145f82] hover:text-black"
          >
            Sign up
          </button>
        </p>

      </div>
    </div>
  );
};

export default Login;