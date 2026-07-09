import React, { useState } from 'react';
import { Settings, Lock, Bell, Eye, Shield, Download } from 'lucide-react';

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
              <button className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-sm font-medium transition-colors">
                Change Password
              </button>
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
