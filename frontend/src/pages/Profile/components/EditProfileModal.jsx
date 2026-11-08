import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Camera,
  GraduationCap,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { authAPI } from '../../../services/api';
import Toast from '../../../components/Toast';
import {
  downscaleImage,
  isSupportedImage,
  MAX_UPLOAD_BYTES,
} from '../../../utils/imageUpload';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

// Matches the maxlength on the User schema so the form cannot accept a bio
// the server would reject.
const BIO_MAX_LENGTH = 500;

const buildForm = (user = {}) => ({
  name: user.name || '',
  personalEmail: user.personalEmail || '',
  phone: user.phone || '',
  gender: user.gender || '',
  dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
  address: user.address || '',
  bio: user.bio || '',
  studentId: user.studentId || '',
  department: user.department || '',
  course: user.course || '',
  year: user.year || '',
  semester: user.semester || '',
  section: user.section || '',
  profilePic: user.profilePic || '',
});

const EditProfileModal = ({ user, onClose, onSave }) => {
  const [initial] = useState(() => buildForm(user));
  const [formData, setFormData] = useState(() => buildForm(user));
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fileInputRef = useRef(null);

  const dirty = useMemo(
    () =>
      Object.keys(formData).some(
        (key) => formData[key] !== initial[key],
      ),
    [formData, initial],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];

    // Reset first so choosing the same file twice still fires the change.
    event.target.value = '';

    if (!file) return;

    if (!isSupportedImage(file)) {
      setToast({
        message: 'Please choose a PNG, JPG or WEBP image',
        type: 'error',
      });

      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setToast({
        message: 'That image is over 8 MB. Please choose a smaller one.',
        type: 'error',
      });

      return;
    }

    try {
      const dataUrl = await downscaleImage(file, 512);

      setFormData((prev) => ({ ...prev, profilePic: dataUrl }));

      setToast({
        message: 'Image ready. Press Save to apply it.',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: error.message || 'Could not read that image',
        type: 'error',
      });
    }
  };

  const removePicture = () => {
    setFormData((prev) => ({ ...prev, profilePic: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);

    try {
      const response = await authAPI.updateProfile(formData);

      onSave(response.data.user);
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Could not save your changes. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const initials = (formData.name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center sm:p-6">

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Hidden picker, driven by the Upload button below */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImageSelected}
        className="hidden"
      />

      <div className="my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_100px_rgba(0,0,0,0.28)]">

        {/* ============================ HEADER */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f5fb] text-[#145f82]">
              <User size={18} />
            </div>

            <div>

              <h2 className="text-base font-black text-slate-900 sm:text-lg">
                Edit profile
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Updates are saved to your account straight away
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-500 transition hover:opacity-70"
          >
            <X size={20} />
          </button>

        </div>

        {/* ============================ BODY */}
        <form
          id="edit-profile-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >

          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">

            {/* PROFILE PICTURE */}
            <SectionHeading
              icon={<Camera size={14} />}
              title="Profile photo"
            />

            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">

              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm">

                {formData.profilePic ? (
                  <img
                    src={formData.profilePic}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-black text-slate-400">
                    {initials || <User size={30} />}
                  </span>
                )}

              </div>

              <div className="min-w-0 flex-1">

                <p className="text-sm font-bold text-slate-800">
                  {formData.profilePic
                    ? 'New photo ready to save'
                    : 'No photo yet'}
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  PNG, JPG or WEBP up to 8 MB. Large photos are resized to
                  512px so they load quickly on every device.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    <Camera size={16} />
                    Upload photo
                  </button>

                  {formData.profilePic && (
                    <button
                      type="button"
                      onClick={removePicture}
                      className="btn-soft"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}

                </div>

              </div>

            </div>

            {/* PERSONAL DETAILS */}
            <div className="mt-8 border-t border-slate-200 pt-6">

              <SectionHeading
                icon={<User size={14} />}
                title="Personal details"
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2">

                <Field
                  label="Full name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name as it should appear"
                />

                <Field
                  label="Personal email"
                  name="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  hint="Your college email is managed by the administration."
                />

                <Field
                  label="Phone number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+92 300 0000000"
                />

                <Field
                  label="Gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  as="select"
                  options={GENDERS}
                />

                <Field
                  label="Date of birth"
                  name="dob"
                  type="date"
                  value={formData.dob}
                  onChange={handleChange}
                />

                <Field
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="sm:col-span-2"
                  placeholder="City, area or hostel"
                />

                <div className="sm:col-span-2">

                  <label className="field-label" htmlFor="edit-bio">
                    Short bio
                  </label>

                  <textarea
                    id="edit-bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    maxLength={BIO_MAX_LENGTH}
                    placeholder="Tell your clubs what you are interested in..."
                    className="field resize-none"
                  />

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500">
                      Shown on the About Me card of your profile.
                    </p>

                    <p className="text-[11px] font-bold text-slate-400">
                      {formData.bio.length} / {BIO_MAX_LENGTH}
                    </p>
                  </div>

                </div>

              </div>

            </div>

            {/* ACADEMIC DETAILS */}
            <div className="mt-8 border-t border-slate-200 pt-6">

              <SectionHeading
                icon={<BookOpen size={14} />}
                title="Academic details"
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                <Field
                  label="Student ID"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="e.g. FA22-BCS-1015"
                  hint="Used to verify you on the leaderboard."
                />

                <Field
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                />

                <Field
                  label="Course"
                  name="course"
                  value={formData.course}
                  onChange={handleChange}
                  placeholder="e.g. BS Software Engineering"
                />

                <Field
                  label="Year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  placeholder="e.g. 3rd Year"
                />

                <Field
                  label="Semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  placeholder="e.g. 6th Semester"
                />

                <Field
                  label="Section"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="e.g. B"
                />

              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f5fb] text-[#145f82]">
                  <GraduationCap size={17} />
                </div>

                <p className="text-xs leading-5 text-slate-600">
                  Club membership, event registrations, certificates and your
                  role are managed by the system. Join or leave a club from the
                  Clubs page and your profile updates itself.
                </p>

              </div>

            </div>

          </div>

          {/* ============================ FOOTER */}
          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">

            <p className="text-xs font-semibold text-slate-500">
              {loading
                ? 'Saving your changes...'
                : dirty
                  ? 'You have unsaved changes.'
                  : 'Everything is up to date.'}
            </p>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !dirty}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save changes'}
              </button>

            </div>

          </div>

        </form>

      </div>
    </div>
  );
};

/* ================================================================
   SECTION HEADING
================================================================ */

const SectionHeading = ({ icon, title }) => (
  <div className="flex items-center gap-2">

    <span className="text-[#145f82]">{icon}</span>

    <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
      {title}
    </h3>

  </div>
);

/* ================================================================
   FIELD
================================================================ */

const Field = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  required = false,
  as = 'input',
  options = [],
  className = '',
}) => {
  const id = `edit-${name}`;

  return (
    <div className={className}>

      <label className="field-label" htmlFor={id}>
        {label}

        {required && (
          <span className="ml-1 text-[#b42318]">*</span>
        )}
      </label>

      {as === 'select' ? (
        <select
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          className="field"
        >
          <option value="">Not specified</option>

          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="field"
        />
      )}

      {hint && (
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {hint}
        </p>
      )}

    </div>
  );
};

export default EditProfileModal;
