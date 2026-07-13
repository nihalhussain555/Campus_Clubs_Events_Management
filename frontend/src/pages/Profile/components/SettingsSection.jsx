import React, { useState } from 'react';
import { Settings, Lock, Bell, Eye, Shield, Download, Check, X } from 'lucide-react';
import { authAPI } from '../../../services/api';
import Toast from '../../../components/Toast';

const SettingsSection = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    club: true,
    events: true
  });

  const [privacy, setPrivacy] = useState({
    showEmail: false,
    showPhone: false,
    publicProfile: true
  });

  // Change Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      setToast({ message: 'New password must be at least 6 characters', type: 'error' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Error changing password', type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const Toggle = ({ checked, onChange, label, desc }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="font-semibold text-gray-800 text-sm">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <button 
        onClick={onChange}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" /> Account & Settings
        </h3>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Security & Account */}
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm">
              <Lock className="w-4 h-4 text-indigo-500" /> Security
            </h4>
            <div className="space-y-3">
              {!showPasswordForm ? (
                <button 
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium transition-colors"
                >
                  Change Password
                </button>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> {passwordLoading ? 'Saving...' : 'Update'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-gray-600 hover:bg-gray-100 text-sm font-semibold rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </form>
              )}
              <button className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium transition-colors">
                Enable Two-Factor Authentication
              </button>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm">
              <Eye className="w-4 h-4 text-indigo-500" /> Privacy
            </h4>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <Toggle 
                label="Public Profile" 
                desc="Allow other students to find you"
                checked={privacy.publicProfile} 
                onChange={() => setPrivacy({...privacy, publicProfile: !privacy.publicProfile})} 
              />
              <Toggle 
                label="Show Email" 
                checked={privacy.showEmail} 
                onChange={() => setPrivacy({...privacy, showEmail: !privacy.showEmail})} 
              />
              <Toggle 
                label="Show Phone Number" 
                checked={privacy.showPhone} 
                onChange={() => setPrivacy({...privacy, showPhone: !privacy.showPhone})} 
              />
            </div>
          </div>
        </div>

        {/* Notifications & Data */}
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm">
              <Bell className="w-4 h-4 text-indigo-500" /> Notifications
            </h4>
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <Toggle 
                label="Email Notifications" 
                checked={notifications.email} 
                onChange={() => setNotifications({...notifications, email: !notifications.email})} 
              />
              <Toggle 
                label="SMS Notifications" 
                checked={notifications.sms} 
                onChange={() => setNotifications({...notifications, sms: !notifications.sms})} 
              />
              <Toggle 
                label="Club Announcements" 
                checked={notifications.club} 
                onChange={() => setNotifications({...notifications, club: !notifications.club})} 
              />
              <Toggle 
                label="Event Reminders" 
                checked={notifications.events} 
                onChange={() => setNotifications({...notifications, events: !notifications.events})} 
              />
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 text-sm">
              <Shield className="w-4 h-4 text-indigo-500" /> Data Management
            </h4>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Download Personal Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsSection;
