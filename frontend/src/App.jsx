import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AIAgent from './components/AIAgent';

// Every page becomes its own chunk, so opening the events list no longer
// downloads the admin charts, the PDF certificates view and the leader
// dashboard with it.
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const SetNewPassword = lazy(() => import('./pages/SetNewPassword'));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate'));
const Clubs = lazy(() => import('./pages/Clubs'));
const Events = lazy(() => import('./pages/Events'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const LeaderDashboard = lazy(() => import('./pages/LeaderDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Certificates = lazy(() => import('./pages/Certificates'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div
      role="status"
      aria-label="Loading page"
      className="h-9 w-9 animate-spin rounded-full border-2 border-slate-300 border-t-[#145f82]"
    />
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Mandatory first-login password page. Public only in routing terms:
              it needs the restricted setup token and redirects to login
              without one. */}
          <Route path="/set-new-password" element={<SetNewPassword />} />
          <Route
            path="/verify-certificate/:qrToken"
            element={<VerifyCertificate />}
          />

          {/* Protected Routes */}
          <Route path="/clubs" element={
            <ProtectedRoute>
              <Clubs />
            </ProtectedRoute>
          } />

          <Route path="/events" element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/account-settings" element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          } />

          <Route path="/certificates" element={
            <ProtectedRoute>
              <Certificates />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />

          <Route path="/leader" element={
            <ProtectedRoute requiredRole={['club_leader', 'admin']}>
              <LeaderDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <AIAgent />
    </Router>
  );
}

export default App;
