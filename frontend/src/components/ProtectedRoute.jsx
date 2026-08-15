import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';

const ProtectedRoute = ({ children, requiredRole }) => {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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

        // Check required role
        if (
          requiredRole &&
          currentUser.role !== requiredRole
        ) {
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

  // Loading screen
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

  // Logged in but wrong role
  if (!authorized) {
    return (
      <Navigate
        to="/profile"
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;