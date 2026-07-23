import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import Clubs from './pages/Clubs';
import Events from './pages/Events';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import AccountSettings from './pages/AccountSettings';
import Certificates from './pages/Certificates';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Notifications from './pages/Notifications';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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

        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
