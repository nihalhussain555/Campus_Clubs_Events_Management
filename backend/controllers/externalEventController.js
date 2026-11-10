import mongoose from 'mongoose';

import ExternalEvent, {
  EXTERNAL_EVENT_TYPES,
  EXTERNAL_EVENT_TYPE_LABELS,
  PARTICIPATION_MODES,
  PARTICIPATION_MODE_LABELS,
  EXTERNAL_EVENT_STATUSES,
  EXTERNAL_EVENT_STATUS_LABELS
} from '../models/ExternalEvent.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import { audit } from '../services/auditService.js';

// Off-campus listings. Nothing here registers a student anywhere: the only
// action a student takes is following the organiser's own link, and this file
// is what keeps that honest. Saving a listing is a personal bookmark, exactly
// like the in-app calendar, and it is stored as a reference on the user.

const MAX_BOOKMARKS = 100;
const MAX_PAGE_LIMIT = 100;

// A poster arrives as a base64 data URL. app.js caps the whole request body at
// 1 MB, so the field gets its own slightly smaller ceiling and the client's
// downscaler is expected to stay well under it.
const MAX_IMAGE_CHARS = 900000;
const MAX_URL_CHARS = 500;

// ----------------------------------------------------------------- helpers

const cleanText = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isObjectId = (id) =>
  typeof id === 'string' &&
  /^[0-9a-fA-F]{24}$/.test(id) &&
  mongoose.Types.ObjectId.isValid(id);

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

const notFound = (res, message) =>
  res.status(404).json({ success: false, message });

const forbidden = (res, message) =>
  res.status(403).json({ success: false, message });

const fail = (res, error, message) => {
  console.error(`${message}:`, error);

  return res.status(500).json({
    success: false,
    message,
    error: error.message
  });
};

// The registration link is the whole point of the page, so it gets the strict
// reading: a real absolute URL, http or https only, a hostname that looks like
// a public site, and no embedded credentials. The javascript: and data:
// schemes are refused before parsing because a pasted script must never reach a
// student's click handler.
export const parsePublicUrl = (value, label = 'link') => {
  const raw = cleanText(value, MAX_URL_CHARS + 40);

  if (!raw) {
    return { error: `The ${label} is required` };
  }

  if (/^(javascript|data|vbscript|file):/i.test(raw)) {
    return { error: `The ${label} is not a web address` };
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    return { error: `The ${label} is not a valid web address` };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: `The ${label} must start with http:// or https://` };
  }

  if (url.username || url.password) {
    return { error: `The ${label} must not contain credentials` };
  }

  const host = url.hostname.toLowerCase();

  // A loopback, private-range or bare-IP host is never another college's site.
  // Students are shown the domain name on the card, so a fake one is a lure.
  if (
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  ) {
    return { error: `The ${label} must be a public website address` };
  }

  if (!host.includes('.') || host.endsWith('.') || host.startsWith('.')) {
    return { error: `The ${label} must point to a complete website address` };
  }

  if (raw.length > MAX_URL_CHARS) {
    return { error: `The ${label} cannot exceed ${MAX_URL_CHARS} characters` };
  }

  return { value: url.toString(), host };
};

const parsePoster = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';

  if (!raw) return { value: '' };

  if (/^data:image\/(png|jpe?g|webp);base64,/i.test(raw)) {
    if (raw.length > MAX_IMAGE_CHARS) {
      return {
        error:
          'That poster image is too large. Choose a smaller picture or paste a link to it instead.',
        status: 413
      };
    }

    return { value: raw, kind: 'upload' };
  }

  const parsed = parsePublicUrl(value, 'poster link');

  if (parsed.error) {
    return { error: parsed.error.replace('poster link', 'poster image link') };
  }

  return { value: parsed.value, kind: 'link' };
};

const parseDateField = (value, label) => {
  if (value === '' || value === null || value === undefined) {
    return { value: null };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { error: `The ${label} is not a real date and time` };
  }

  return { value: date };
};

// One reader for both create and update, so the rules cannot drift apart
// between the two.
const readEventBody = async (body, { requireAll = true } = {}) => {
  const source = body || {};

  const fields = {};

  const title = cleanText(source.title, 120);

  if (requireAll || source.title !== undefined) {
    if (title.length < 3) {
      return { error: 'The title needs at least 3 characters' };
    }

    fields.title = title;
  }

  const description = cleanText(source.description, 2000);

  if (requireAll || source.description !== undefined) {
    if (description.length < 10) {
      return { error: 'The description needs at least 10 characters' };
    }

    fields.description = description;
  }

  const organizerName = cleanText(source.organizerName, 120);

  if (requireAll || source.organizerName !== undefined) {
    if (organizerName.length < 2) {
      return { error: 'Please name the organizer or college running the event' };
    }

    fields.organizerName = organizerName;
  }

  const eventType = cleanText(source.eventType, 40);

  if (requireAll || source.eventType !== undefined) {
    if (!EXTERNAL_EVENT_TYPES.includes(eventType)) {
      return { error: 'Please choose one of the listed event types' };
    }

    fields.eventType = eventType;
  }

  const participationMode = cleanText(source.participationMode, 20);

  if (requireAll || source.participationMode !== undefined) {
    if (!PARTICIPATION_MODES.includes(participationMode)) {
      return { error: 'Please choose online, in person or hybrid' };
    }

    fields.participationMode = participationMode;
  }

  if (requireAll || source.registrationUrl !== undefined) {
    const link = parsePublicUrl(source.registrationUrl, 'registration');

    if (link.error) return { error: link.error };

    fields.registrationUrl = link.value;
  }

  if (source.imageUrl !== undefined) {
    const poster = parsePoster(source.imageUrl);

    if (poster.error) {
      return { error: poster.error, status: poster.status || 400 };
    }

    fields.imageUrl = poster.value;
  }

  if (requireAll || source.date !== undefined) {
    const date = parseDateField(source.date, 'event date');

    if (date.error) return { error: date.error };

    if (!date.value) return { error: 'Please provide an event date' };

    fields.date = date.value;
  }

  if (source.registrationDeadline !== undefined) {
    const deadline = parseDateField(source.registrationDeadline, 'registration deadline');

    if (deadline.error) return { error: deadline.error };

    fields.registrationDeadline = deadline.value;
  }

  const when = fields.date || null;

  if (fields.registrationDeadline && when && fields.registrationDeadline > when) {
    return {
      error: 'The registration deadline cannot be after the event itself'
    };
  }

  if (source.status !== undefined) {
    const status = cleanText(source.status, 20);

    if (!EXTERNAL_EVENT_STATUSES.includes(status)) {
      return { error: 'Please choose upcoming, completed or cancelled' };
    }

    fields.status = status;
  }

  fields.venue = cleanText(source.venue, 160);
  fields.city = cleanText(source.city, 80);
  fields.locationDetails = cleanText(source.locationDetails, 300);
  fields.platformDetails = cleanText(source.platformDetails, 300);

  // A place is only meaningful if someone has to travel to it, and a platform
  // link is only meaningful online. Clearing the other side stops a card from
  // claiming a venue that the mode says does not exist.
  if (fields.participationMode === 'online') {
    fields.venue = '';
    fields.city = '';
    fields.locationDetails = '';
  }

  if (fields.participationMode === 'offline') {
    fields.platformDetails = '';
  }

  const needsVenue =
    fields.participationMode === 'offline' ||
    fields.participationMode === 'hybrid';

  if (needsVenue) {
    if (!fields.venue) {
      return { error: 'A venue is required for an in-person or hybrid event' };
    }

    if (!fields.city) {
      return { error: 'A city is required for an in-person or hybrid event' };
    }
  }

  if (source.club !== undefined && source.club !== null && source.club !== '') {
    if (!isObjectId(source.club)) {
      return { error: 'The selected club is not valid' };
    }

    const club = await Club.exists({ _id: toObjectId(source.club) });

    if (!club) {
      return { error: 'The selected club no longer exists' };
    }

    fields.club = toObjectId(source.club);
  } else if (requireAll || source.club !== undefined) {
    fields.club = null;
  }

  return { fields };
};

const labelOf = (map, value) => map[value] || value;

// The card and the detail view are built from one shape so the client never has
// to guess which fields a list endpoint dropped. The host is split out because
// "Register Now opens devfolio.co" is what tells a student they are leaving.
const toPublic = (event, bookmarkIds = []) => ({
  id: String(event._id),
  title: event.title,
  description: event.description,
  organizerName: event.organizerName,
  imageUrl: event.imageUrl || '',
  date: event.date,
  registrationDeadline: event.registrationDeadline || null,
  eventType: event.eventType,
  eventTypeLabel: labelOf(EXTERNAL_EVENT_TYPE_LABELS, event.eventType),
  participationMode: event.participationMode,
  participationModeLabel: labelOf(PARTICIPATION_MODE_LABELS, event.participationMode),
  registrationUrl: event.registrationUrl,
  registrationHost: safeHost(event.registrationUrl),
  venue: event.venue || '',
  city: event.city || '',
  locationDetails: event.locationDetails || '',
  platformDetails: event.platformDetails || '',
  status: event.status,
  statusLabel: labelOf(EXTERNAL_EVENT_STATUS_LABELS, event.status),
  club: event.club ? { id: String(event.club._id || event.club), clubName: event.club.clubName || '' } : null,
  postedBy: event.postedBy
    ? { id: String(event.postedBy._id || event.postedBy), name: event.postedBy.name || '' }
    : null,
  createdAt: event.createdAt,
  bookmarked: bookmarkIds.includes(String(event._id)),
  isPast: Boolean(event.date && new Date(event.date) < new Date()),
  deadlinePassed: Boolean(
    event.registrationDeadline && new Date(event.registrationDeadline) < new Date()
  )
});

const safeHost = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return '';
  }
};

const POPULATE = [
  { path: 'club', select: 'clubName' },
  { path: 'postedBy', select: 'name' }
];

const readBookmarks = async (userId) => {
  const user = await User.findById(userId)
    .select('bookmarkedExternalEvents')
    .lean();

  return (user?.bookmarkedExternalEvents || []).map(String);
};

// =========================================================
// GET /api/external-events
// =========================================================

export const getExternalEvents = async (req, res) => {
  try {
    const now = new Date();

    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, Number(req.query?.limit) || 12));

    const bookmarkIds = await readBookmarks(req.user.id);

    const and = [];
    const filter = {};

    const type = cleanText(req.query?.type, 40);
    if (type && type !== 'all') {
      if (!EXTERNAL_EVENT_TYPES.includes(type)) {
        return badRequest(res, 'That event type is not one of the known categories');
      }

      filter.eventType = type;
    }

    const mode = cleanText(req.query?.mode, 20);
    if (mode && mode !== 'all') {
      if (!PARTICIPATION_MODES.includes(mode)) {
        return badRequest(res, 'That participation mode is not recognised');
      }

      filter.participationMode = mode;
    }

    const organizer = cleanText(req.query?.organizer, 120);
    if (organizer && organizer !== 'all') {
      filter.organizerName = organizer;
    }

    const city = cleanText(req.query?.city, 80);
    if (city && city !== 'all') {
      filter.city = new RegExp(`^${escapeRegex(city).slice(0, 80)}$`, 'i');
    }

    const search = cleanText(req.query?.search, 80);
    if (search) {
      const rx = new RegExp(escapeRegex(search).slice(0, 80), 'i');

      and.push({
        $or: [
          { title: rx },
          { description: rx },
          { organizerName: rx },
          { venue: rx },
          { city: rx }
        ]
      });
    }

    const view = cleanText(req.query?.view, 12) || 'upcoming';

    if (view === 'upcoming') {
      and.push({ status: 'upcoming', date: { $gte: now } });
    } else if (view === 'expired') {
      and.push({
        $or: [
          { status: { $in: ['completed', 'cancelled'] } },
          { date: { $lt: now } }
        ]
      });
    } else if (view !== 'all') {
      return badRequest(res, 'Choose upcoming, expired or all');
    }

    if (cleanText(req.query?.saved, 6) === 'true') {
      and.push({ _id: { $in: bookmarkIds.map(toObjectId) } });
    }

    const query = { ...filter };

    if (and.length) query.$and = and;

    // Soonest first for what is coming; most recent first for what has gone by,
    // so the expired tab reads as a record rather than a random pile.
    const sort =
      view === 'expired' ? { date: -1 } : { date: 1 };

    const [docs, total, upcomingTotal, expiredTotal] = await Promise.all([
      ExternalEvent.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(POPULATE)
        .lean(),
      ExternalEvent.countDocuments(query),
      ExternalEvent.countDocuments({ status: 'upcoming', date: { $gte: now } }),
      ExternalEvent.countDocuments({
        $or: [
          { status: { $in: ['completed', 'cancelled'] } },
          { date: { $lt: now } }
        ]
      })
    ]);

    return res.status(200).json({
      success: true,
      message: 'External events loaded',
      events: docs.map((event) => toPublic(event, bookmarkIds)),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
      view,
      counts: {
        upcoming: upcomingTotal,
        expired: expiredTotal,
        saved: bookmarkIds.length
      }
    });
  } catch (error) {
    return fail(res, error, 'Failed to load the external events');
  }
};

// =========================================================
// GET /api/external-events/meta
// =========================================================

export const getExternalEventMeta = async (req, res) => {
  try {
    const [organizers, cities] = await Promise.all([
      ExternalEvent.distinct('organizerName'),
      ExternalEvent.distinct('city')
    ]);

    const pick = (list) =>
      list
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 100);

    return res.status(200).json({
      success: true,
      message: 'External event filters loaded',
      types: EXTERNAL_EVENT_TYPES.map((value) => ({
        value,
        label: EXTERNAL_EVENT_TYPE_LABELS[value]
      })),
      modes: PARTICIPATION_MODES.map((value) => ({
        value,
        label: PARTICIPATION_MODE_LABELS[value]
      })),
      statuses: EXTERNAL_EVENT_STATUSES.map((value) => ({
        value,
        label: EXTERNAL_EVENT_STATUS_LABELS[value]
      })),
      organizers: pick(organizers),
      cities: pick(cities)
    });
  } catch (error) {
    return fail(res, error, 'Failed to load the external event filters');
  }
};

// =========================================================
// GET /api/external-events/:id
// =========================================================

export const getExternalEvent = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'That external event id is not valid');
    }

    const event = await ExternalEvent.findById(req.params.id).populate(POPULATE).lean();

    if (!event) {
      return notFound(res, 'That external event no longer exists');
    }

    const bookmarkIds = await readBookmarks(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'External event loaded',
      event: toPublic(event, bookmarkIds)
    });
  } catch (error) {
    return fail(res, error, 'Failed to load the external event');
  }
};

// =========================================================
// POST /api/external-events
// =========================================================

export const createExternalEvent = async (req, res) => {
  try {
    const { fields, error, status } = await readEventBody(req.body);

    if (error) {
      return status === 413
        ? res.status(413).json({ success: false, message: error })
        : badRequest(res, error);
    }

    const event = await ExternalEvent.create({
      ...fields,
      status: fields.status || 'upcoming',
      postedBy: req.user.id
    });

    const created = await ExternalEvent.findById(event._id).populate(POPULATE).lean();

    audit('external_event_created', {
      actorId: req.user.id,
      actorRole: req.user.effectiveRole,
      externalEventId: String(event._id),
      eventType: fields.eventType,
      participationMode: fields.participationMode
    });

    return res.status(201).json({
      success: true,
      message: `"${event.title}" added to the external events`,
      event: toPublic(created, [])
    });
  } catch (error) {
    return fail(res, error, 'Failed to add the external event');
  }
};

// =========================================================
// PUT /api/external-events/:id
// =========================================================

// Leaders may post anything, but only the person who wrote a listing (or an
// administrator) may change it: otherwise one club leader could silently
// rewrite another club's announcement.
const canManage = (event, user) =>
  user.effectiveRole === 'admin' || String(event.postedBy) === String(user.id);

export const updateExternalEvent = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'That external event id is not valid');
    }

    const existing = await ExternalEvent.findById(req.params.id).lean();

    if (!existing) {
      return notFound(res, 'That external event no longer exists');
    }

    if (!canManage(existing, req.user)) {
      return forbidden(res, 'Only the person who posted this event, or an administrator, can change it');
    }

    const { fields, error, status } = await readEventBody(req.body);

    if (error) {
      return status === 413
        ? res.status(413).json({ success: false, message: error })
        : badRequest(res, error);
    }

    await ExternalEvent.updateOne(
      { _id: existing._id },
      { $set: { ...fields, status: fields.status || existing.status } }
    );

    const updated = await ExternalEvent.findById(existing._id).populate(POPULATE).lean();

    audit('external_event_updated', {
      actorId: req.user.id,
      actorRole: req.user.effectiveRole,
      externalEventId: String(existing._id),
      status: updated.status
    });

    const bookmarkIds = await readBookmarks(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'External event updated',
      event: toPublic(updated, bookmarkIds)
    });
  } catch (error) {
    return fail(res, error, 'Failed to update the external event');
  }
};

// =========================================================
// DELETE /api/external-events/:id
// =========================================================

export const deleteExternalEvent = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'That external event id is not valid');
    }

    const existing = await ExternalEvent.findById(req.params.id).lean();

    if (!existing) {
      return notFound(res, 'That external event no longer exists');
    }

    if (!canManage(existing, req.user)) {
      return forbidden(res, 'Only the person who posted this event, or an administrator, can remove it');
    }

    await ExternalEvent.deleteOne({ _id: existing._id });

    // Bookmarks live on user documents, and a reference to a deleted listing
    // would sit there forever showing as a saved event that cannot open.
    await User.updateMany(
      { bookmarkedExternalEvents: existing._id },
      { $pull: { bookmarkedExternalEvents: existing._id } }
    );

    audit('external_event_deleted', {
      actorId: req.user.id,
      actorRole: req.user.effectiveRole,
      externalEventId: String(existing._id),
      title: existing.title
    });

    return res.status(200).json({
      success: true,
      message: `"${existing.title}" removed from the external events`,
      id: String(existing._id)
    });
  } catch (error) {
    return fail(res, error, 'Failed to delete the external event');
  }
};

// =========================================================
// BOOKMARKS
// POST /api/external-events/:id/bookmark
// DELETE /api/external-events/:id/bookmark
// =========================================================

export const addExternalEventBookmark = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'That external event id is not valid');
    }

    const event = await ExternalEvent.findById(req.params.id).select('title').lean();

    if (!event) {
      return notFound(res, 'That external event no longer exists');
    }

    // Same atomic shape as the calendar: $addToSet makes a double click
    // harmless and the $expr guard makes the cap part of the write itself.
    const result = await User.updateOne(
      {
        _id: req.user.id,
        $expr: {
          $lt: [{ $size: { $ifNull: ['$bookmarkedExternalEvents', []] } }, MAX_BOOKMARKS]
        }
      },
      { $addToSet: { bookmarkedExternalEvents: toObjectId(req.params.id) } }
    );

    const bookmarkIds = await readBookmarks(req.user.id);

    if (result.modifiedCount === 1) {
      return res.status(201).json({
        success: true,
        message: `Saved "${event.title}". This does not register you anywhere - use Register Now on the listing.`,
        bookmarked: true,
        already: false,
        bookmarkIds
      });
    }

    if (result.matchedCount === 0) {
      return res.status(409).json({
        success: false,
        message: `Your saved list is full. Remove one before saving another (limit ${MAX_BOOKMARKS}).`
      });
    }

    return res.status(200).json({
      success: true,
      message: `"${event.title}" is already saved`,
      bookmarked: true,
      already: true,
      bookmarkIds
    });
  } catch (error) {
    return fail(res, error, 'Failed to save the external event');
  }
};

export const removeExternalEventBookmark = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return badRequest(res, 'That external event id is not valid');
    }

    await User.updateOne(
      { _id: req.user.id },
      { $pull: { bookmarkedExternalEvents: toObjectId(req.params.id) } }
    );

    const bookmarkIds = await readBookmarks(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Removed from your saved events',
      bookmarked: false,
      bookmarkIds
    });
  } catch (error) {
    return fail(res, error, 'Failed to remove the saved external event');
  }
};
