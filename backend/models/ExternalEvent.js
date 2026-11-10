import mongoose from 'mongoose';

// Off-campus listings: hackathons, conferences and competitions run by other
// colleges or platforms that our students register for on the ORGANISER'S own
// website. This is deliberately its own collection rather than extra rows in
// Event: the internal model owns capacity, registration lists, QR attendance,
// certificates, XP and the 30-minute reminder sweep, none of which can apply to
// an event we do not run. Keeping them apart is what allows external events to
// be added without touching a single internal event code path.

// Slugs, so the display labels can be reworded without migrating records.
export const EXTERNAL_EVENT_TYPES = [
  'hackathon',
  'workshop',
  'symposium',
  'coding_competition',
  'conference',
  'webinar',
  'cultural'
];

export const EXTERNAL_EVENT_TYPE_LABELS = {
  hackathon: 'Hackathon',
  workshop: 'Workshop',
  symposium: 'Technical Symposium',
  coding_competition: 'Coding Competition',
  conference: 'Conference',
  webinar: 'Webinar',
  cultural: 'Cultural Event'
};

// Where the student actually goes. Offline and hybrid must carry a place; online
// and hybrid may carry a platform.
export const PARTICIPATION_MODES = ['online', 'offline', 'hybrid'];

export const PARTICIPATION_MODE_LABELS = {
  online: 'Online',
  offline: 'In person',
  hybrid: 'Hybrid'
};

// Narrower on purpose than the internal Event statuses. Nobody registers here,
// so "ongoing" has no meaning from this platform's point of view: from the
// outside a listing is coming up, finished, or called off.
export const EXTERNAL_EVENT_STATUSES = ['upcoming', 'completed', 'cancelled'];

export const EXTERNAL_EVENT_STATUS_LABELS = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const externalEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      minlength: [3, 'The title needs at least 3 characters'],
      maxlength: [120, 'The title cannot exceed 120 characters']
    },

    description: {
      type: String,
      required: [true, 'Please provide a description'],
      trim: true,
      minlength: [10, 'The description needs at least 10 characters'],
      maxlength: [2000, 'The description cannot exceed 2000 characters']
    },

    // The body running the event: another college, a company, a community.
    organizerName: {
      type: String,
      required: [true, 'Please provide the organizer name'],
      trim: true,
      maxlength: [120, 'The organizer name cannot exceed 120 characters']
    },

    // Poster. Either a data URL produced by the client-side downscaler or a
    // pasted https link; the controller checks both, the same way the profile
    // picture is checked, because a 1 MB request body is the real limit here.
    imageUrl: { type: String, trim: true, default: '' },

    date: {
      type: Date,
      required: [true, 'Please provide an event date']
    },

    registrationDeadline: {
      type: Date,
      default: null
    },

    eventType: {
      type: String,
      enum: {
        values: EXTERNAL_EVENT_TYPES,
        message: 'Please choose a valid event type'
      },
      required: [true, 'Please provide an event type']
    },

    participationMode: {
      type: String,
      enum: {
        values: PARTICIPATION_MODES,
        message: 'Please choose a valid participation mode'
      },
      required: [true, 'Please provide a participation mode']
    },

    // The student clicks through to this and registers there. Nothing in this
    // platform ever records the registration, so nothing can claim it happened.
    registrationUrl: {
      type: String,
      required: [true, 'Please provide the registration link'],
      trim: true,
      maxlength: [500, 'The registration link cannot exceed 500 characters']
    },

    venue: { type: String, trim: true, maxlength: [160, 'The venue is too long'], default: '' },
    city: { type: String, trim: true, maxlength: [80, 'The city is too long'], default: '' },
    locationDetails: {
      type: String,
      trim: true,
      maxlength: [300, 'The location details are too long'],
      default: ''
    },

    platformDetails: {
      type: String,
      trim: true,
      maxlength: [300, 'The platform details are too long'],
      default: ''
    },

    status: {
      type: String,
      enum: {
        values: EXTERNAL_EVENT_STATUSES,
        message: 'Please choose a valid status'
      },
      default: 'upcoming'
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Optional: the club promoting the listing. Kept nullable because an
    // administrator can post on behalf of the whole campus.
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Students browse by "what is coming next" first, then narrow by type or mode,
// so both the sort and the filter belong in these indexes.
externalEventSchema.index({ status: 1, date: 1 });
externalEventSchema.index({ eventType: 1, date: -1 });
externalEventSchema.index({ participationMode: 1, date: -1 });

export default mongoose.model('ExternalEvent', externalEventSchema);
