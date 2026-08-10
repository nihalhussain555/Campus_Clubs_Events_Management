import React from 'react';
import {
  BookOpen,
  GraduationCap,
  Hash,
  CalendarDays,
  Info,
  Mail,
  Phone,
  MapPin,
  Building2,
  User,
  Award,
  Clock
} from 'lucide-react';

const ProfileHeader = ({ user }) => {

  const getFallback = (value) => {
    return value || 'Not Added';
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';

      case 'Club Leader':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'Club Member':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';

    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(
        'en-US',
        {
          month: 'long',
          year: 'numeric'
        }
      )
    : 'Not Added';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* =====================================================
          COVER BANNER
      ===================================================== */}
      <div className="relative h-36 sm:h-44 bg-gradient-to-r from-slate-950 via-slate-800 to-slate-900 overflow-hidden">

        {/* Background decoration */}
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-white/5" />

        <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-indigo-500/10" />

        <div className="absolute inset-0 opacity-[0.06]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                'radial-gradient(circle, white 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
        </div>

        {/* CENTERED LOGO + NAME + TAGLINE */}
          <div className="absolute inset-0 flex items-center justify-center">

            <div className="flex items-center justify-center gap-4 sm:gap-5">

              {/* Engineering Cap Logo */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg shrink-0">
                <GraduationCap
                  size={36}
                  strokeWidth={1.7}
                  className="text-white"
                />
              </div>

              {/* Name + Tagline */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                  Campus Clubs
                </h2>

                <p className="text-xs sm:text-sm text-white/60 mt-1 tracking-wider">
                  STUDENT &amp; CLUB MANAGEMENT SYSTEM
                </p>
              </div>

            </div>

          </div>

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />

      </div>

      {/* =====================================================
          PROFILE CONTENT
      ===================================================== */}
      <div className="px-5 sm:px-8 pb-8">

        {/* PROFILE TOP */}
        <div className="relative -mt-16 sm:-mt-20">

          <div className="flex flex-col sm:flex-row sm:items-end gap-5">

            {/* PROFILE IMAGE */}
            <div className="shrink-0">

              <div className="p-1.5 bg-white rounded-full shadow-lg">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.name || 'Profile'}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border border-slate-100 bg-slate-50"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center border border-white">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {getInitials(user.name)}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* NAME + ROLE */}
            <div className="flex-1 pb-1 min-w-0">

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {user.name || 'Anonymous User'}
                </h1>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(
                    user.role
                  )}`}
                >
                  {getFallback(user.role)}
                </span>

              </div>

              {/* Username */}
              {user.username && (
                <p className="text-sm text-slate-500 mt-1">
                  @{user.username}
                </p>
              )}

            </div>

          </div>
        </div>

        {/* =====================================================
            QUICK INFORMATION
        ===================================================== */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* Department */}
          <InfoCard
            icon={<BookOpen size={18} />}
            label="Department"
            value={getFallback(user.department)}
          />

          {/* Course */}
          <InfoCard
            icon={<GraduationCap size={18} />}
            label="Course"
            value={getFallback(user.course)}
          />

          {/* Year */}
          <InfoCard
            icon={<Clock size={18} />}
            label="Year"
            value={getFallback(user.year)}
          />

          {/* Semester */}
          <InfoCard
            icon={<CalendarDays size={18} />}
            label="Semester"
            value={getFallback(user.semester)}
          />

        </div>

        {/* =====================================================
            ABOUT ME
        ===================================================== */}
        <div className="mt-7">

          <SectionTitle
            icon={<Info size={18} />}
            title="About Me"
          />

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-5">

            {user.bio ? (
              <p className="text-sm text-slate-600 leading-7 whitespace-pre-wrap">
                {user.bio}
              </p>
            ) : (
              <div className="py-3 text-center">
                <Info
                  size={24}
                  className="mx-auto text-slate-300 mb-2"
                />

                <p className="text-sm text-slate-500">
                  No bio added yet.
                </p>
              </div>
            )}

          </div>

        </div>

        {/* =====================================================
            PERSONAL INFORMATION
        ===================================================== */}
        <div className="mt-7">

          <SectionTitle
            icon={<User size={18} />}
            title="Personal Information"
          />

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">

            <DetailItem
              icon={<Mail size={17} />}
              label="Email"
              value={getFallback(user.email)}
            />

            <DetailItem
              icon={<Phone size={17} />}
              label="Phone Number"
              value={getFallback(user.phone)}
            />

            <DetailItem
              icon={<MapPin size={17} />}
              label="Address"
              value={getFallback(user.address)}
              fullWidth
            />

            <DetailItem
              icon={<User size={17} />}
              label="Gender"
              value={getFallback(user.gender)}
            />

            <DetailItem
              icon={<CalendarDays size={17} />}
              label="Date of Birth"
              value={
                user.dob
                  ? new Date(user.dob).toLocaleDateString(
                      'en-US',
                      {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      }
                    )
                  : 'Not Added'
              }
            />

          </div>

        </div>

        {/* =====================================================
            ACADEMIC INFORMATION
        ===================================================== */}
        <div className="mt-7">

          <SectionTitle
            icon={<GraduationCap size={18} />}
            title="Academic Information"
          />

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            <DetailItem
              icon={<Building2 size={17} />}
              label="Department"
              value={getFallback(user.department)}
            />

            <DetailItem
              icon={<BookOpen size={17} />}
              label="Course"
              value={getFallback(user.course)}
            />

            <DetailItem
              icon={<Hash size={17} />}
              label="Student ID"
              value={getFallback(user.studentId)}
            />

            <DetailItem
              icon={<GraduationCap size={17} />}
              label="Year"
              value={getFallback(user.year)}
            />

            <DetailItem
              icon={<CalendarDays size={17} />}
              label="Semester"
              value={getFallback(user.semester)}
            />

            <DetailItem
              icon={<Hash size={17} />}
              label="Section"
              value={getFallback(user.section)}
            />

          </div>

        </div>

        {/* =====================================================
            MEMBERSHIP INFORMATION
        ===================================================== */}
        <div className="mt-7">

          <SectionTitle
            icon={<Award size={18} />}
            title="Membership Information"
          />

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">

            <DetailItem
              icon={<Award size={17} />}
              label="Role"
              value={getFallback(user.role)}
            />

            <DetailItem
              icon={<CalendarDays size={17} />}
              label="Member Since"
              value={joinedDate}
            />

          </div>

        </div>

      </div>
    </div>
  );
};


/* ============================================================
   INFO CARD
============================================================ */

const InfoCard = ({ icon, label, value }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-200">

      <div className="flex items-center gap-2 text-indigo-600 mb-2">
        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-800 truncate">
        {value}
      </p>

    </div>
  );
};


/* ============================================================
   SECTION TITLE
============================================================ */

const SectionTitle = ({ icon, title }) => {
  return (
    <div className="flex items-center gap-2.5">

      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        {icon}
      </div>

      <h2 className="text-base font-bold text-slate-900">
        {title}
      </h2>

    </div>
  );
};


/* ============================================================
   DETAIL ITEM
============================================================ */

const DetailItem = ({
  icon,
  label,
  value,
  fullWidth = false
}) => {
  return (
    <div
      className={`
        rounded-xl border border-slate-200
        bg-white p-4
        hover:border-indigo-200
        hover:shadow-sm
        transition-all duration-200
        ${fullWidth ? 'sm:col-span-2' : ''}
      `}
    >

      <div className="flex items-start gap-3">

        <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-xs font-medium text-slate-400 mb-1">
            {label}
          </p>

          <p className="text-sm font-semibold text-slate-700 break-words">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
};

export default ProfileHeader;