import React, { useState } from 'react';
import { Image as ImageIcon, Link2, Upload, X } from 'lucide-react';

import { externalEventAPI } from '../services/api';
import { toInputValue, withInstantTimes } from '../utils/eventTime';
import {
  MAX_UPLOAD_BYTES,
  downscaleImage,
  isSupportedImage
} from '../utils/imageUpload';

const blank = {
  title: '',
  description: '',
  organizerName: '',
  eventType: '',
  participationMode: 'offline',
  registrationUrl: '',
  date: '',
  registrationDeadline: '',
  status: 'upcoming',
  venue: '',
  city: '',
  locationDetails: '',
  platformDetails: '',
  imageUrl: '',
  club: ''
};

// Only the editable fields are pulled in: a listing also carries labels, ids
// and stamps that must not be posted back.
const toForm = (listing) => ({
  ...blank,
  title: listing.title || '',
  description: listing.description || '',
  organizerName: listing.organizerName || '',
  eventType: listing.eventType || '',
  participationMode: listing.participationMode || 'offline',
  registrationUrl: listing.registrationUrl || '',
  date: toInputValue(listing.date),
  registrationDeadline: toInputValue(listing.registrationDeadline),
  status: listing.status || 'upcoming',
  venue: listing.venue || '',
  city: listing.city || '',
  locationDetails: listing.locationDetails || '',
  platformDetails: listing.platformDetails || '',
  imageUrl: listing.imageUrl || '',
  club: listing.club?.id || ''
});

const MAX_IMAGE_CHARS = 900000;

const ExternalEventForm = ({
  listing,
  meta,
  clubs,
  user,
  onCancel,
  onSaved
}) => {
  const [formData, setFormData] = useState(
    listing ? toForm(listing) : blank
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // An existing data URL starts on the upload tab, an existing link on the
  // link tab, so editing never hides what the poster actually is.
  const [posterMode, setPosterMode] = useState(
    listing?.imageUrl && !listing.imageUrl.startsWith('data:') ? 'link' : 'upload'
  );

  const isEditing = Boolean(listing);

  const set = (field) => (event) =>
    setFormData((current) => ({
      ...current,
      [field]: event.target.value
    }));

  const needsVenue =
    formData.participationMode === 'offline' ||
    formData.participationMode === 'hybrid';

  const needsPlatform =
    formData.participationMode !== 'offline';

  const validate = () => {
    if (formData.title.trim().length < 3) {
      return 'The title needs at least 3 characters';
    }

    if (formData.description.trim().length < 10) {
      return 'The description needs at least 10 characters';
    }

    if (formData.organizerName.trim().length < 2) {
      return 'Name the organizer or college running the event';
    }

    if (!formData.eventType) {
      return 'Choose one of the event categories';
    }

    if (!formData.participationMode) {
      return 'Choose how students take part';
    }

    if (!formData.registrationUrl.trim()) {
      return 'Paste the organizer’s registration link';
    }

    if (!formData.date) {
      return 'Choose the event date and time';
    }

    if (
      formData.registrationDeadline &&
      new Date(formData.registrationDeadline) > new Date(formData.date)
    ) {
      return 'The registration deadline cannot be after the event itself';
    }

    if (needsVenue && !formData.venue.trim()) {
      return 'A venue is required for an in-person or hybrid event';
    }

    if (needsVenue && !formData.city.trim()) {
      return 'A city is required for an in-person or hybrid event';
    }

    if (
      formData.imageUrl &&
      !formData.imageUrl.startsWith('data:image/') &&
      !/^https:\/\//i.test(formData.imageUrl)
    ) {
      return 'A poster link must start with https:// - upload the file instead to keep it private';
    }

    if (formData.imageUrl.length > MAX_IMAGE_CHARS) {
      return 'That image is too large. Choose a smaller file or paste a link instead.';
    }

    return '';
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    if (!isSupportedImage(file)) {
      setError('Choose a PNG, JPG or WebP image');
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is larger than 8 MB');
      return;
    }

    try {
      const dataUrl = await downscaleImage(file, 512);

      setFormData((current) => ({ ...current, imageUrl: dataUrl }));
      setError('');
    } catch (readError) {
      setError(readError.message || 'That image could not be read');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const problem = validate();

    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError('');

    const payload = withInstantTimes(formData, [
      'date',
      'registrationDeadline'
    ]);

    // The mode decides which half of the location is meaningful; sending an
    // empty string clears the other side on the server too.
    if (!needsVenue) {
      payload.venue = '';
      payload.city = '';
      payload.locationDetails = '';
    }

    if (!needsPlatform) {
      payload.platformDetails = '';
    }

    if (!payload.registrationDeadline) {
      payload.registrationDeadline = null;
    }

    if (!payload.club) {
      payload.club = null;
    }

    try {
      const response = isEditing
        ? await externalEventAPI.update(listing.id, payload)
        : await externalEventAPI.create(payload);

      onSaved(
        response.data?.message ||
          (isEditing ? 'Listing updated' : 'Listing added')
      );
    } catch (submitError) {
      setError(
        submitError.response?.data?.message ||
          'Could not save that listing'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="app-card mb-8 space-y-5"
      aria-label={isEditing ? 'Edit external event' : 'Add external event'}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">
            {isEditing ? 'Editing a listing' : 'Off campus'}
          </p>

          <h2 className="text-2xl font-black text-black">
            {isEditing ? listing.title : 'Add an external event'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Students reach this listing only through the link you paste below.
            Nothing here creates a registration on our side, so keep the
            organizer&rsquo;s own address accurate.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary px-3"
          aria-label="Close the form"
        >
          <X size={18} />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="field-label" htmlFor="ext-title">
            Event title *
          </label>

          <input
            id="ext-title"
            value={formData.title}
            onChange={set('title')}
            className="field"
            placeholder="National Hackathon 2026"
            maxLength={120}
          />
        </div>

        <div className="md:col-span-2">
          <label className="field-label" htmlFor="ext-description">
            Description *
          </label>

          <textarea
            id="ext-description"
            value={formData.description}
            onChange={set('description')}
            className="field min-h-28"
            placeholder="What the event is, who it is for, and what participants get out of it."
            maxLength={2000}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ext-organizer">
            Organizer or college name *
          </label>

          <input
            id="ext-organizer"
            value={formData.organizerName}
            onChange={set('organizerName')}
            className="field"
            placeholder="Vertex Institute of Technology"
            maxLength={120}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ext-type">
            Category *
          </label>

          <select
            id="ext-type"
            value={formData.eventType}
            onChange={set('eventType')}
            className="field"
          >
            <option value="">Choose a category</option>

            {meta.types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="ext-date">
            Event date and time *
          </label>

          <input
            id="ext-date"
            type="datetime-local"
            value={formData.date}
            onChange={set('date')}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ext-deadline">
            Registration deadline
          </label>

          <input
            id="ext-deadline"
            type="datetime-local"
            value={formData.registrationDeadline}
            onChange={set('registrationDeadline')}
            className="field"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="ext-mode">
            Participation mode *
          </label>

          <select
            id="ext-mode"
            value={formData.participationMode}
            onChange={set('participationMode')}
            className="field"
          >
            {meta.modes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="ext-status">
            Status
          </label>

          <select
            id="ext-status"
            value={formData.status}
            onChange={set('status')}
            className="field"
          >
            {meta.statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {needsVenue && (
          <>
            <div>
              <label className="field-label" htmlFor="ext-venue">
                Venue *
              </label>

              <input
                id="ext-venue"
                value={formData.venue}
                onChange={set('venue')}
                className="field"
                placeholder="Main Auditorium"
                maxLength={160}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="ext-city">
                City *
              </label>

              <input
                id="ext-city"
                value={formData.city}
                onChange={set('city')}
                className="field"
                placeholder="Bengaluru"
                maxLength={80}
              />
            </div>

            <div className="md:col-span-2">
              <label className="field-label" htmlFor="ext-location">
                Location details
              </label>

              <input
                id="ext-location"
                value={formData.locationDetails}
                onChange={set('locationDetails')}
                className="field"
                placeholder="Gate 2 reporting, parking on level B1"
                maxLength={300}
              />
            </div>
          </>
        )}

        {needsPlatform && (
          <div className="md:col-span-2">
            <label className="field-label" htmlFor="ext-platform">
              Meeting or platform details
            </label>

            <input
              id="ext-platform"
              value={formData.platformDetails}
              onChange={set('platformDetails')}
              className="field"
              placeholder="Zoom link is emailed the morning before"
              maxLength={300}
            />
          </div>
        )}

        <div className="md:col-span-2">
          <label className="field-label" htmlFor="ext-url">
            Registration link *
          </label>

          <input
            id="ext-url"
            value={formData.registrationUrl}
            onChange={set('registrationUrl')}
            className="field"
            placeholder="https://vertexhack.example.org/apply"
            maxLength={500}
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            The page students sign up on. It has to be a public https address -
            links to this site&rsquo;s own pages, to localhost or with a login
            embedded in them are refused.
          </p>
        </div>

        <div>
          <label className="field-label" htmlFor="ext-club">
            Shared by a club
          </label>

          <select
            id="ext-club"
            value={formData.club}
            onChange={set('club')}
            className="field"
          >
            <option value="">No club</option>

            {clubs.map((club) => (
              <option key={club._id} value={club._id}>
                {club.clubName}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Optional. It credits the club that publicised the listing; it does
            not change who can register.
          </p>
        </div>

        <div>
          <label className="field-label">Poster</label>

          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setPosterMode('upload')}
              className={`filter-pill ${
                posterMode === 'upload' ? 'filter-pill-active' : ''
              }`}
            >
              <Upload size={14} className="mr-1" />
              Upload
            </button>

            <button
              type="button"
              onClick={() => setPosterMode('link')}
              className={`filter-pill ${
                posterMode === 'link' ? 'filter-pill-active' : ''
              }`}
            >
              <Link2 size={14} className="mr-1" />
              Paste link
            </button>
          </div>

          {posterMode === 'upload' ? (
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFile}
              className="field py-2.5 text-sm"
              aria-label="Poster image"
            />
          ) : (
            <input
              value={
                formData.imageUrl.startsWith('data:') ? '' : formData.imageUrl
              }
              onChange={set('imageUrl')}
              className="field"
              placeholder="https://organizer.example.org/poster.png"
              aria-label="Poster image link"
            />
          )}

          {formData.imageUrl ? (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={formData.imageUrl}
                alt="Poster preview"
                className="h-16 w-16 rounded-xl object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  setFormData((current) => ({ ...current, imageUrl: '' }))
                }
                className="btn-secondary"
              >
                <X size={14} />
                Remove poster
              </button>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
              <ImageIcon size={14} />
              No poster yet - the listing will show the organizer&rsquo;s
              initials.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-secondary"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving
            ? 'Saving...'
            : isEditing
              ? 'Save changes'
              : 'Publish listing'}
        </button>

        {user?.role === 'club_leader' && (
          <span className="self-center text-xs font-bold text-slate-500">
            Your name is shown on the listing as its organizer contact.
          </span>
        )}
      </div>
    </form>
  );
};

export default ExternalEventForm;
