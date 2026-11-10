import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AIAgent from './components/AIAgent';

// Every page becomes its own chunk, so opening the events list no longer
// downloads the admin charts, the PDF certificates view and the leader
// dashboard with it.
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
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
const Help = lazy(() => import('./pages/Help'));
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

// The campus assistant floats on every page except the Help Center, which has
// its own ClubAssist. Both live in the same bottom-right corner, so showing
// them together would stack one button on top of the other and make one of
// them unreachable.
const GlobalAgent = () => {
  const { pathname } = useLocation();

  return pathname === '/help' ? null : <AIAgent />;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          {/* Support and documentation both live in the Help Center now; the
              old marketing contact page had a form that went nowhere. */}
          <Route path="/contact" element={<Navigate to="/help" replace />} />
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

          {/* Available to every signed-in role; the server decides which
              guides each person is shown. */}
          <Route path="/help" element={
            <ProtectedRoute>
              <Help />
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
      <GlobalAgent />
    </Router>
  );
}

export default App;
