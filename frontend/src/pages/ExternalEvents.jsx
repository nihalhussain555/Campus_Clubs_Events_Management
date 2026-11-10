import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarDays,
  ExternalLink,
  Globe,
  MapPin,
  MonitorPlay,
  Plus,
  Search,
  Ticket,
  Trash2,
  X
} from 'lucide-react';

import Toast from '../components/Toast';
import SkeletonGrid from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import ExternalEventForm from '../components/ExternalEventForm';

import { clubAPI, externalEventAPI } from '../services/api';

const PAGE_SIZE = 12;

const VIEWS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expired', label: 'Past' },
  { value: 'saved', label: 'Saved' },
  { value: 'all', label: 'All listings' }
];

const formatDateTime = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (value) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// The initials block shown when an organiser pasted no poster.
const organizerMark = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('') || 'EX';

const ExternalEvents = () => {
  const [listings, setListings] = useState([]);
  const [meta, setMeta] = useState({
    types: [],
    modes: [],
    statuses: [],
    organizers: [],
    cities: []
  });
  const [clubs, setClubs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [organizerFilter, setOrganizerFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [view, setView] = useState('upcoming');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState({ upcoming: 0, expired: 0, saved: 0 });

  const [detail, setDetail] = useState(null);
  const [busyIds, setBusyIds] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Mirrors requireRoles(ADMIN, CLUB_LEADER) on the routes. A legacy
  // club_member row is a student to the server, so it is one here too.
  const canManage =
    user?.role === 'admin' || user?.role === 'club_leader';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setModeFilter('all');
    setOrganizerFilter('all');
    setCityFilter('all');
    setView('upcoming');
    setPage(1);
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await externalEventAPI.getMeta();

        setMeta({
          types: response.data.types || [],
          modes: response.data.modes || [],
          statuses: response.data.statuses || [],
          organizers: response.data.organizers || [],
          cities: response.data.cities || []
        });
      } catch (error) {
        setToast({
          message:
            error.response?.data?.message ||
            'Could not load the external event filters',
          type: 'error'
        });
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    if (!canManage) {
      return;
    }

    clubAPI
      .getAllClubs()
      .then((response) => setClubs(response.data.clubs || []))
      .catch(() => setClubs([]));
  }, [canManage]);

  // The list is filtered and paginated by the server, so every control change
  // is one request. Saving and deleting reuse the same call to keep the
  // filters the student was using.
  const runQuery = async () => {
    setLoading(true);

    try {
      const response = await externalEventAPI.getAll({
        search: search || undefined,
        type: typeFilter,
        mode: modeFilter,
        organizer: organizerFilter,
        city: cityFilter,
        view: view === 'saved' ? 'all' : view,
        saved: view === 'saved' ? true : undefined,
        page,
        limit: PAGE_SIZE
      });

      setListings(response.data.events || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
      setCounts(response.data.counts || { upcoming: 0, expired: 0, saved: 0 });
    } catch (error) {
      setListings([]);
      setToast({
        message:
          error.response?.data?.message ||
          'Could not load the external events',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // A typing pause keeps every keystroke from becoming a request; the rest of
  // the filters are dropdowns and fetch immediately.
  useEffect(() => {
    const timer = setTimeout(runQuery, search ? 300 : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    typeFilter,
    modeFilter,
    organizerFilter,
    cityFilter,
    view,
    page
  ]);

  const changeView = (next) => {
    setView(next);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (listing) => {
    setEditing(listing);
    setShowForm(true);
    setDetail(null);
  };

  // A new organizer or city only exists once it has been posted, so the filter
  // options are re-read alongside the list.
  const onSaved = (message) => {
    setShowForm(false);
    setEditing(null);
    setToast({ message: message || 'Listing saved', type: 'success' });

    externalEventAPI
      .getMeta()
      .then((response) =>
        setMeta((current) => ({
          ...current,
          organizers: response.data.organizers || current.organizers,
          cities: response.data.cities || current.cities
        }))
      )
      .catch(() => {});

    if (page === 1) {
      runQuery();
    } else {
      setPage(1);
    }
  };

  const setBusy = (id, on) => {
    setBusyIds((current) =>
      on
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id)
    );
  };

  const toggleSave = async (listing) => {
    setBusy(listing.id, true);

    try {
      if (listing.bookmarked) {
        await externalEventAPI.unsave(listing.id);
        setToast({ message: 'Removed from your saved events', type: 'info' });
      } else {
        const response = await externalEventAPI.save(listing.id);
        setToast({
          message: response.message || 'Saved for later',
          type: 'success'
        });
      }

      setListings((current) =>
        current.map((item) =>
          item.id === listing.id
            ? { ...item, bookmarked: !listing.bookmarked }
            : item
        )
      );

      setDetail((current) =>
        current && current.id === listing.id
          ? { ...current, bookmarked: !listing.bookmarked }
          : current
      );

      setCounts((current) => ({
        ...current,
        saved: Math.max(
          0,
          current.saved + (listing.bookmarked ? -1 : 1)
        )
      }));
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Could not change your saved list',
        type: 'error'
      });
    } finally {
      setBusy(listing.id, false);
    }
  };

  const confirmDelete = async () => {
    const listing = pendingDelete;

    if (!listing) return;

    setPendingDelete(null);

    try {
      const response = await externalEventAPI.remove(listing.id);

      setToast({
        message: response.data?.message || 'Listing removed',
        type: 'info'
      });

      setDetail(null);
      runQuery();
    } catch (error) {
      setToast({
        message:
          error.response?.data?.message ||
          'Could not delete that listing',
        type: 'error'
      });
    }
  };

  const isActive = (value) => value !== 'all';

  const locationLine = (listing) => {
    if (listing.participationMode === 'online') {
      return listing.platformDetails || 'Attend online';
    }

    return [listing.venue, listing.city]
      .filter(Boolean)
      .join(', ') || 'Venue to be announced';
  };

  const registerLabel = (listing) =>
    listing.registrationHost
      ? `Register at ${listing.registrationHost}`
      : 'Open the organizer’s registration page';

  const registrationClosed = (listing) =>
    listing.status !== 'upcoming' ||
    listing.isPast ||
    listing.deadlinePassed;

  const Poster = ({ listing, className = '' }) =>
    listing.imageUrl ? (
      <img
        src={listing.imageUrl}
        alt={`${listing.title} poster`}
        className={`rounded-2xl object-cover ${className}`}
        loading="lazy"
      />
    ) : (
      <div
        className={`flex items-center justify-center rounded-2xl bg-[#e8f5fb] text-xl font-black text-[#145f82] ${className}`}
        aria-hidden="true"
      >
        {organizerMark(listing.organizerName)}
      </div>
    );

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow">Off campus</span>

          <h2 className="display-title text-3xl sm:text-4xl">
            External events
          </h2>

          <p className="section-copy mt-3 max-w-2xl">
            Hackathons, workshops and symposiums hosted by other colleges and
            organisations. Everything here is signed up for on the
            organizer&rsquo;s own website - this page only tells you where and
            when.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={showForm ? () => setShowForm(false) : openCreate}
            className="btn-primary"
          >
            <Plus size={18} />
            {showForm ? 'Close' : 'Add external event'}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <ExternalEventForm
          listing={editing}
          meta={meta}
          clubs={clubs}
          user={user}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={onSaved}
        />
      )}

      {/* FILTERS */}

      <div className="app-card mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeView(item.value)}
              className={`filter-pill ${
                view === item.value ? 'filter-pill-active' : ''
              }`}
            >
              {item.label}
              {item.value === 'saved' && counts.saved > 0 && (
                <span className="ml-2">{counts.saved}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="field pl-11"
                placeholder="Search title, organizer or city..."
                aria-label="Search external events"
              />
            </div>
          </div>

          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
            className="field"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>

            {meta.types.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={(event) => {
              setModeFilter(event.target.value);
              setPage(1);
            }}
            className="field"
            aria-label="Filter by participation mode"
          >
            <option value="all">Any mode</option>

            {meta.modes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>

          <select
            value={organizerFilter}
            onChange={(event) => {
              setOrganizerFilter(event.target.value);
              setPage(1);
            }}
            className="field"
            aria-label="Filter by organizer"
          >
            <option value="all">All organizers</option>

            {meta.organizers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={cityFilter}
            onChange={(event) => {
              setCityFilter(event.target.value);
              setPage(1);
            }}
            className="field sm:w-52"
            aria-label="Filter by city"
          >
            <option value="all">Any city</option>

            {meta.cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {(isActive(typeFilter) ||
            isActive(modeFilter) ||
            isActive(organizerFilter) ||
            isActive(cityFilter) ||
            search) && (
            <button type="button" onClick={clearFilters} className="btn-secondary">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="mb-5 text-sm font-bold text-slate-500">
        {loading ? 'Loading listings...' : `${total} external listing${total === 1 ? '' : 's'}`}
      </p>

      {/* LISTINGS */}

      {loading ? (
        <SkeletonGrid count={4} className="grid gap-5 lg:grid-cols-2" />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={Globe}
          title={
            view === 'saved'
              ? 'Nothing saved yet'
              : 'No external events match your filters'
          }
          message={
            view === 'saved'
              ? 'Use Save on any listing to keep it here. Saving does not register you anywhere - you still sign up on the organizer’s site.'
              : 'Try another category, organizer or city, or widen the view to past listings.'
          }
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="app-card app-card-hover flex flex-col gap-4"
              >
                <div className="flex gap-4">
                  <Poster listing={listing} className="h-24 w-24 shrink-0" />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="chip">{listing.eventTypeLabel}</span>
                      <span className="chip">
                        {listing.participationMode === 'online' ? (
                          <MonitorPlay size={12} className="mr-1" />
                        ) : (
                          <MapPin size={12} className="mr-1" />
                        )}
                        {listing.participationModeLabel}
                      </span>

                      {listing.status !== 'upcoming' && (
                        <span
                          className={`chip ${
                            listing.status === 'cancelled'
                              ? 'border-red-200 text-red-700'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          {listing.statusLabel}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-black">
                      {listing.title}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-[#145f82]">
                      {listing.organizerName}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-600 line-clamp-3">
                  {listing.description}
                </p>

                <div className="grid gap-2 text-sm font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-[#145f82]" />
                    {formatDateTime(listing.date)}
                  </span>

                  <span className="flex items-center gap-2">
                    {listing.participationMode === 'online' ? (
                      <Globe size={16} className="text-[#145f82]" />
                    ) : (
                      <MapPin size={16} className="text-[#145f82]" />
                    )}
                    {locationLine(listing)}
                  </span>

                  {listing.registrationDeadline && (
                    <span className="flex items-center gap-2">
                      <Ticket size={16} className="text-[#145f82]" />
                      Sign up by {formatDate(listing.registrationDeadline)}
                      {listing.deadlinePassed && (
                        <span className="text-red-600"> - closed</span>
                      )}
                    </span>
                  )}

                  {listing.club?.clubName && (
                    <span className="flex items-center gap-2">
                      <Building2 size={16} className="text-[#145f82]" />
                      Shared by {listing.club.clubName}
                    </span>
                  )}
                </div>

                <div className="mt-auto flex flex-wrap gap-3 border-t border-slate-100 pt-4">
                  {registrationClosed(listing) ? (
                    <span className="btn-secondary pointer-events-none opacity-60">
                      Registration closed
                    </span>
                  ) : (
                    <a
                      href={listing.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      <ExternalLink size={16} />
                      Register Now
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleSave(listing)}
                    disabled={busyIds.includes(listing.id)}
                    className={`btn-soft ${
                      busyIds.includes(listing.id) ? 'opacity-60' : ''
                    }`}
                  >
                    {listing.bookmarked ? (
                      <BookmarkCheck size={16} />
                    ) : (
                      <Bookmark size={16} />
                    )}
                    {listing.bookmarked ? 'Saved' : 'Save'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetail(listing)}
                    className="btn-secondary"
                  >
                    Details
                  </button>

                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(listing)}
                        className="btn-secondary"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setPendingDelete(listing)}
                        className="btn-danger"
                        aria-label={`Delete ${listing.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={pages}
            onChange={(next) => {
              setPage(next);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      {/* DETAILS */}

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={detail.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div className="min-w-0">
                <p className="eyebrow mb-2">External event</p>
                <h3 className="text-2xl font-black text-black">
                  {detail.title}
                </h3>
                <p className="mt-1 text-sm font-bold text-[#145f82]">
                  {detail.organizerName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDetail(null)}
                className="btn-secondary px-3"
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <Poster listing={detail} className="h-48 w-full" />

              <div className="flex flex-wrap gap-2">
                <span className="chip">{detail.eventTypeLabel}</span>
                <span className="chip">{detail.participationModeLabel}</span>
                <span className="chip">{detail.statusLabel}</span>
              </div>

              <p className="text-sm leading-6 text-slate-700">
                {detail.description}
              </p>

              <div className="grid gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  <CalendarDays size={18} className="text-[#145f82]" />
                  <span className="text-sm font-bold text-slate-700">
                    {formatDateTime(detail.date)}
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                  {detail.participationMode === 'online' ? (
                    <Globe size={18} className="text-[#145f82]" />
                  ) : (
                    <MapPin size={18} className="text-[#145f82]" />
                  )}
                  <span className="text-sm font-bold text-slate-700">
                    {locationLine(detail)}
                  </span>
                </div>

                {detail.locationDetails && (
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <MapPin size={18} className="mt-0.5 shrink-0 text-[#145f82]" />
                    <span className="text-sm font-bold text-slate-700">
                      {detail.locationDetails}
                    </span>
                  </div>
                )}

                {detail.registrationDeadline && (
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <Ticket size={18} className="text-[#145f82]" />
                    <span className="text-sm font-bold text-slate-700">
                      Registration closes{' '}
                      {formatDateTime(detail.registrationDeadline)}
                      {detail.deadlinePassed && ' - already passed'}
                    </span>
                  </div>
                )}
              </div>

              <p className="rounded-2xl border border-[#bcddeb] bg-[#eef8fc] p-4 text-sm leading-6 text-[#073c57]">
                Signing up happens entirely on the organizer&rsquo;s website.
                This platform keeps no place for you and cannot confirm a
                registration - saving a listing only bookmarks it here.
              </p>

              <div className="grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => toggleSave(detail)}
                  disabled={busyIds.includes(detail.id)}
                  className="btn-secondary w-full"
                >
                  {detail.bookmarked ? (
                    <BookmarkCheck size={16} />
                  ) : (
                    <Bookmark size={16} />
                  )}
                  {detail.bookmarked ? 'Saved' : 'Save for later'}
                </button>

                {registrationClosed(detail) ? (
                  <span className="btn-secondary w-full opacity-60">
                    Registration closed
                  </span>
                ) : (
                  <a
                    href={detail.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full"
                    title={registerLabel(detail)}
                  >
                    <ExternalLink size={16} />
                    Register Now
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="Delete this listing?"
        message={`"${pendingDelete?.title}" will be removed from the external events and from everyone's saved list. The organizer's own page is untouched.`}
        confirmLabel="Delete listing"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export default ExternalEvents;
