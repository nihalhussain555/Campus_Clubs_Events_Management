import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail, User } from 'lucide-react';
import { authAPI } from '../services/api';
import Toast from '../components/Toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    gender: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      return 'Name is required';
    }

    if (!formData.email) {
      return 'Email is required';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Please enter a valid email address';
    }

    if (!formData.password) {
      return 'Password is required';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      return 'Please confirm your password';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (!formData.gender) {
      return 'Please select your gender';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();

    setError(validationError);

    if (validationError) return;

    setLoading(true);

    try {
      const response = await authAPI.signup({
        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        gender: formData.gender,
      });

      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setShowToast(true);

      window.setTimeout(() => {
        navigate('/profile');
      }, 900);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">

      {showToast && (
        <Toast
          message="Account created. Redirecting..."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="auth-card">

        {/* LOGO - unchanged */}
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


        {/* HEADER */}
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3">
            Create account
          </p>

          <h1 className="text-3xl font-black text-black">
            Start your campus profile
          </h1>
        </div>


        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}


        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* FULL NAME */}
            <div>
              <label className="field-label flex items-center gap-2">
                <User size={17} />
                Full name *
              </label>

              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="field"
                placeholder="Your name"
                required
              />
            </div>


            {/* EMAIL */}
            <div>
              <label className="field-label flex items-center gap-2">
                <Mail size={17} />
                Email *
              </label>

              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="field"
                placeholder="your@email.com"
                required
              />
            </div>


            {/* ROLE */}
            <div>
              <label className="field-label">
                Role *
              </label>

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="field"
                required
              >
                <option value="student">
                  Student
                </option>

                <option value="club_leader">
                  Club Leader
                </option>
              </select>
            </div>


            {/* GENDER */}
            <div>
              <label className="field-label">
                Gender *
              </label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="field bg-white"
                required
              >
                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>

                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>


            {/* PASSWORD */}
            <div>
              <label className="field-label flex items-center gap-2">
                <Lock size={17} />
                Password *
              </label>

              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="field"
                placeholder="Min 6 chars"
                required
              />
            </div>


            {/* CONFIRM PASSWORD */}
            <div>
              <label className="field-label flex items-center gap-2">
                <Lock size={17} />
                Confirm Password *
              </label>

              <input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="field"
                placeholder="Confirm password"
                required
              />
            </div>

          </div>


          {/* SIGN UP */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-4"
          >
            {loading
              ? 'Processing...'
              : 'Sign up'}
          </button>

        </form>


        {/* LOGIN */}
        <p className="mt-7 text-center text-sm font-semibold text-slate-600">
          Already have an account?

          <button
            onClick={() => navigate('/login')}
            className="ml-2 font-black text-[#145f82] hover:text-black"
          >
            Login
          </button>
        </p>

      </div>
    </div>
  );
};

export default Register;