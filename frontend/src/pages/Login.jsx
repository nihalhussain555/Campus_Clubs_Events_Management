import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Lock, Mail } from 'lucide-react';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.email || !formData.password) return 'Please fill all required fields';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email address';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setLoading(true);
    try {
      const response = await authAPI.login({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setShowToast(true);
      window.setTimeout(() => navigate('/profile'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {showToast && <Toast message="Login successful. Redirecting..." type="success" onClose={() => setShowToast(false)} />}
      <div className="auth-card">
        <button type="button" onClick={() => navigate('/')} className="mx-auto mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
            <Compass size={21} />
          </span>
          <span className="text-xl font-black text-black">Campus Clubs</span>
        </button>

        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">Welcome back</p>
          <h1 className="text-3xl font-black text-black">Login to continue</h1>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label flex items-center gap-2">
              <Mail size={17} /> Email
            </label>
            <input name="email" type="email" value={formData.email} onChange={handleChange} className="field" placeholder="your@email.com" />
          </div>
          <div>
            <label className="field-label flex items-center gap-2">
              <Lock size={17} /> Password
            </label>
            <input name="password" type="password" value={formData.password} onChange={handleChange} className="field" placeholder="Enter your password" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Processing...' : 'Login'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm font-semibold text-slate-600">
          Do not have an account?
          <button onClick={() => navigate('/register')} className="ml-2 font-black text-[#145f82] hover:text-black">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
