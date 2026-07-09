import React, { useState } from 'react';
import { X, Save, Upload, User, Mail, BookOpen, MapPin, Phone, Hash } from 'lucide-react';
import { authAPI } from '../../../services/api';
import Toast from '../../../components/Toast';

const EditProfileModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    studentId: user.studentId || '',
    personalEmail: user.personalEmail || '',
    department: user.department || '',
    year: user.year || '',
    semester: user.semester || '',
    course: user.course || '',
    section: user.section || '',
    bio: user.bio || '',
    gender: user.gender || '',
    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    phone: user.phone || '',
    address: user.address || '',
    profilePic: user.profilePic || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.updateProfile(formData);
      onSave(response.data.user);
    } catch (error) {
      setToast({ message: 'Error updating profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl relative flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" /> Edit Profile Details
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto grow">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profile Picture */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Profile Picture</h3>
              <div className="flex items-center gap-6">
                <img 
                  src={formData.profilePic || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='} 
                  alt="Profile Preview" 
                  className="w-20 h-20 rounded-full border-4 border-gray-50 object-cover shadow-sm bg-white"
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="url" 
                      name="profilePic" 
                      value={formData.profilePic} 
                      onChange={handleChange} 
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm" 
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Provide a direct URL to an image file.</p>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                 Personal Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
                  <input name="personalEmail" type="email" value={formData.personalEmail} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Short Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="Tell us about yourself..."></textarea>
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                Academic Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input name="studentId" value={formData.studentId} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input name="department" value={formData.department} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <input name="course" value={formData.course} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. 3rd Year" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <input name="semester" value={formData.semester} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. 6th Semester" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input name="section" value={formData.section} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" form="edit-profile-form" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditProfileModal;
