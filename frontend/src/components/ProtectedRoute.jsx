import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { authAPI } from '../services/api';

// Mirrors the backend's EFFECTIVE_ROLE map: accounts created before club
// leaders existed still carry 'club_member'.
const EFFECTIVE_ROLE = {
  student: 'student',
  club_member: 'student',
  club_leader: 'club_leader',
  admin: 'admin'
};

const effectiveRole = (role) =>
  EFFECTIVE_ROLE[role] || 'student';

const allowsRole = (role, requiredRole) => {
  if (!requiredRole) {
    return true;
  }

  const allowed = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  return allowed.includes(effectiveRole(role));
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [wrongRole, setWrongRole] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        // Get the CURRENT user directly from MongoDB
        const response = await authAPI.getProfile();

        const currentUser = response.data?.user;

        if (!currentUser) {
          throw new Error('User profile not found');
        }

        // Update localStorage with latest MongoDB data
        localStorage.setItem(
          'user',
          JSON.stringify(currentUser)
        );

        setUser(currentUser);

        if (!allowsRole(currentUser.role, requiredRole)) {
          setWrongRole(true);
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error(
          'Authentication check failed:',
          error
        );

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, [requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm font-semibold text-slate-600">
            Checking account...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!localStorage.getItem('token')) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  // Logged in, but this area belongs to another role. Saying so beats
  // silently bouncing the user somewhere else.
  if (wrongRole) {
    return (
      <div className="app-page">
        <main className="page-section">
          <div className="page-container">
            <div className="app-card mx-auto max-w-lg text-center">
              <div className="icon-tile mx-auto mb-4 h-14 w-14 bg-amber-100 text-amber-700">
                <ShieldAlert size={24} />
              </div>

              <h1 className="text-2xl font-black text-[#073c57]">
                This area is for {Array.isArray(requiredRole)
                  ? requiredRole.join(' or ')
                  : requiredRole} accounts
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                You are signed in as {user?.name || 'a student'}.
                Ask the college administrator to change your role if you think
                this is a mistake.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/profile" className="btn-primary">
                  Go to my profile
                </Link>

                <Link to="/events" className="btn-secondary">
                  Browse events
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
