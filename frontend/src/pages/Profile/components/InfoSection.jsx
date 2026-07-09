import React from 'react';
import { User, Mail, Phone, MapPin, Calendar, BookOpen, Hash } from 'lucide-react';

const InfoSection = ({ user }) => {
  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" /> Personal Information
          </h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Gender</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.gender}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.dob}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> Phone</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5"/> Emails</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">
                <div>{user.email} (College)</div>
                <div className="text-gray-500">{user.personalEmail} (Personal)</div>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Address</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.address}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Academic Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" /> Academic Information
          </h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5"/> Student ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.studentId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Course</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.course}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm font-medium text-gray-500">Department</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.department}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Year</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.year}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Semester</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.semester}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Section</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium">{user.section}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
