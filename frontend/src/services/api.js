import axios from 'axios';

// A compiled-in localhost URL would silently break a deployed build that
// forgets VITE_API_BASE_URL, so the dev default only applies to `npm run dev`.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});


const SETUP_TOKEN_KEY = 'passwordSetupToken';
const SETUP_ACCOUNT_KEY = 'passwordSetupAccount';

// Password recovery is a three-step walk, and the two links it collects are no
// more sessions than the setup token is. They live in their own keys so the
// request below can present exactly the one the endpoint expects, and so
// starting a recovery while signed in cannot overwrite the real session.
const ANSWER_TOKEN_KEY = 'passwordAnswerToken';
const RESET_TOKEN_KEY = 'passwordResetToken';
const RECOVERY_ACCOUNT_KEY = 'passwordRecoveryAccount';

const isPasswordSetupRequest = (url = '') =>
  url.includes('/auth/complete-password-setup');

const isRecoveryRequest = (url = '') =>
  url.includes('/auth/forgot-password');

const tokenKeyForUrl = (url = '') => {
  if (isPasswordSetupRequest(url)) return SETUP_TOKEN_KEY;
  if (url.includes('/auth/forgot-password/verify')) return ANSWER_TOKEN_KEY;
  if (url.includes('/auth/forgot-password/reset')) return RESET_TOKEN_KEY;

  return 'token';
};

// =====================================================
// ADD TOKEN TO REQUESTS
// =====================================================

api.interceptors.request.use(
  (config) => {
    // While mandatory password setup is in progress there is no session token
    // at all - only the restricted setup token, which the backend accepts on
    // this one endpoint and refuses everywhere else.
    const token = localStorage.getItem(tokenKeyForUrl(config.url));

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// =====================================================
// HANDLE RESPONSES
// =====================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    const isLoginRequest =
      requestUrl.includes('/auth/login');

    const isAgentRequest =
      requestUrl.includes('/agent/chat');

    // The setup page renders these itself: an expired setup token has to be
    // explained next to the form, not answered with a silent redirect.
    const isSetupRequest = isPasswordSetupRequest(requestUrl);

    // Same for the recovery wizard. It is a public page with no session to
    // protect, and bouncing it to /login would throw away the step the user is
    // on every time they mistype an answer.
    const isRecovery = isRecoveryRequest(requestUrl);

    // Only redirect for protected requests
    if (
      status === 401 &&
      !isLoginRequest &&
      !isAgentRequest &&
      !isSetupRequest &&
      !isRecovery
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      delete api.defaults.headers.common.Authorization;

      window.location.href = '/login';
    }

    // An account locked behind mandatory password setup must not keep browsing
    // with a half-working session. This happens when an admin regenerates the
    // password of someone who is signed in.
    if (
      status === 403 &&
      error.response?.data?.code === 'PASSWORD_SETUP_REQUIRED' &&
      !isSetupRequest
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      delete api.defaults.headers.common.Authorization;

      window.location.href = '/login?setup=required';
    }

    return Promise.reject(error);
  }
);

// =====================================================
// HELPERS
// =====================================================

const extractData = (response) =>
  response.data !== undefined
    ? response.data
    : { success: true };


const createDuplicateError = (error, message) => {
  const duplicateError = new Error(message);

  duplicateError.duplicate = true;
  duplicateError.response = error.response;
  duplicateError.request = error.request;
  duplicateError.config = error.config;
  duplicateError.originalError = error;

  return duplicateError;
};


const handleDuplicateActionError = (error) => {
  const status = error.response?.status;

  const message =
    error.response?.data?.message ||
    error.message ||
    'Duplicate action detected';

  const isDuplicate =
    status === 409 ||
    (status === 400 && /already|duplicate|exists/i.test(message));

  if (isDuplicate) {
    return Promise.reject(
      createDuplicateError(error, message)
    );
  }

  return Promise.reject(error);
};


// =====================================================
// AUTH API
// =====================================================

export const authAPI = {
  signup: (data) =>
    api.post('/auth/signup', data),

  login: (data) =>
    api.post('/auth/login', data),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data) =>
    api.put('/auth/profile', data),

  changePassword: (data) =>
    api.put('/auth/change-password', data),

  getAllUsers: () =>
    api.get('/auth/users'),

  // Turn a restricted setup token into a real session. The request
  // interceptor attaches the setup token for this URL automatically.
  completePasswordSetup: (data) =>
    api.post('/auth/complete-password-setup', data),

  // The fixed list of recovery questions, available before anyone signs up.
  getSecurityQuestions: () =>
    api.get('/auth/security-questions'),

  // Recovery step 1: name the account and receive its question. The reply
  // carries the link step 2 runs on, which the interceptor then attaches.
  requestRecoveryQuestion: (data) =>
    api.post('/auth/forgot-password/question', data),

  // Recovery step 2: answer it, and receive the link step 3 runs on.
  verifyRecoveryAnswer: (data) =>
    api.post('/auth/forgot-password/verify', data),

  // Recovery step 3: set the new password. A successful reply is a session.
  resetRecoveredPassword: (data) =>
    api.post('/auth/forgot-password/reset', data),

  // Signed in, and knowing the password: choose or replace the question.
  setSecurityQuestion: (data) =>
    api.put('/auth/security-question', data),

  // Admin: open an account and receive its one-time temporary password.
  createUser: (data) =>
    api.post('/auth/users', data),

  // Admin: replace an account's temporary password.
  regenerateTemporaryPassword: (userId) =>
    api.post(`/auth/users/${userId}/temporary-password`)
};


// =====================================================
// PASSWORD SETUP SESSION HELPERS
// =====================================================

// Login issues this restricted token instead of a session when the account
// still has to choose its own password.
export const savePasswordSetupSession = ({ setupToken, account }) => {
  localStorage.setItem(SETUP_TOKEN_KEY, setupToken);
  localStorage.setItem(SETUP_ACCOUNT_KEY, JSON.stringify(account || null));
};

export const readSetupAccount = () => {
  try {
    return JSON.parse(
      localStorage.getItem(SETUP_ACCOUNT_KEY) || 'null'
    );
  } catch {
    return null;
  }
};

export const hasPasswordSetupSession = () =>
  Boolean(localStorage.getItem(SETUP_TOKEN_KEY));

export const clearPasswordSetupSession = () => {
  localStorage.removeItem(SETUP_TOKEN_KEY);
  localStorage.removeItem(SETUP_ACCOUNT_KEY);
};


// =====================================================
// PASSWORD RECOVERY SESSION HELPERS
// =====================================================

// A refresh in the middle of a recovery should not restart it, so the link each
// step earned is kept under its own key and read back by the wizard.
export const savePasswordAnswerToken = (token) => {
  localStorage.setItem(ANSWER_TOKEN_KEY, token);
};

export const savePasswordResetToken = (token) => {
  localStorage.setItem(RESET_TOKEN_KEY, token);
};

export const hasPasswordAnswerToken = () =>
  Boolean(localStorage.getItem(ANSWER_TOKEN_KEY));

export const hasPasswordResetToken = () =>
  Boolean(localStorage.getItem(RESET_TOKEN_KEY));

export const saveRecoveryAccount = ({ email, question }) => {
  localStorage.setItem(
    RECOVERY_ACCOUNT_KEY,
    JSON.stringify({ email: email || null, question: question || null })
  );
};

export const readRecoveryAccount = () => {
  try {
    return JSON.parse(
      localStorage.getItem(RECOVERY_ACCOUNT_KEY) || 'null'
    );
  } catch {
    return null;
  }
};

// Called when a recovery finishes, is abandoned, or a link turns out to be
// spent: nothing from the walk is left behind to confuse the next one.
export const clearPasswordRecovery = () => {
  localStorage.removeItem(ANSWER_TOKEN_KEY);
  localStorage.removeItem(RESET_TOKEN_KEY);
  localStorage.removeItem(RECOVERY_ACCOUNT_KEY);
};


// =====================================================
// CLUB API
// =====================================================

export const clubAPI = {
  getAllClubs: () =>
    api.get('/clubs'),

  getClubById: (id) =>
    api.get(`/clubs/${id}`),

  createClub: (data) =>
    api.post('/clubs', data),

  updateClub: (id, data) =>
    api.put(`/clubs/${id}`, data),

  deleteClub: (id) =>
    api.delete(`/clubs/${id}`),

  joinClub: (id) =>
    api
      .post(`/clubs/${id}/join`)
      .then(extractData)
      .catch(handleDuplicateActionError),

  leaveClub: (id) =>
    api
      .post(`/clubs/${id}/leave`)
      .then(extractData),

  transferLeadership: (id, userId) =>
    api.put(`/clubs/${id}/transfer-admin`, { userId })
};


// =====================================================
// EVENT API
// =====================================================

export const eventAPI = {

  // Get all events
  getAllEvents: () =>
    api.get('/events'),

  // Get event by ID
  getEventById: (id) =>
    api.get(`/events/${id}`),

  // Get events by club
  getEventsByClub: (clubId) =>
    api.get(`/events/club/${clubId}`),

  // Get upcoming events
  getUpcomingEvents: () =>
    api.get('/events/upcoming'),

  // Create event - admin
  createEvent: (data) =>
    api.post('/events', data),

  // Update event - admin
  updateEvent: (id, data) =>
    api.put(`/events/${id}`, data),

  // Delete event - admin
  deleteEvent: (id) =>
    api.delete(`/events/${id}`),

  // =================================================
  // REGISTRATION
  // =================================================

  registerForEvent: (id) =>
    api
      .post(`/events/${id}/register`)
      .then(extractData)
      .catch(handleDuplicateActionError),

  unregisterFromEvent: (id) =>
    api
      .post(`/events/${id}/unregister`)
      .then(extractData),

  // =================================================
  // CHECK-IN
  // =================================================

  // The student's own QR payload, shown for an organiser to scan.
  getCheckinToken: (id) =>
    api.get(`/events/${id}/checkin-token`),

  // Organiser-side: submit a QR scanned from a student's device.
  checkIn: (id, token) =>
    api
      .post(`/events/${id}/checkin`, { token })
      .then(extractData)
      .catch(handleDuplicateActionError),

  // =================================================
  // EVENT HISTORY
  // =================================================

  getMyEventHistory: () =>
    api.get('/events/history/my'),

  // =================================================
  // ADMIN ATTENDANCE
  // =================================================

  markAttendance: (eventId, userId) =>
    api.post(`/events/${eventId}/attendance`, {
      userId
    }),

  removeAttendance: (eventId, userId) =>
    api.delete(`/events/${eventId}/attendance`, {
      data: {
        userId
      }
    })
};

// =====================================================
// CALENDAR API
// =====================================================

// The in-app calendar. Every mutation answers with the caller's full saved
// events and notes, so the client never needs a second round trip to stay in
// sync.
export const calendarAPI = {

  getMyCalendar: () =>
    api.get('/calendar'),

  saveEvent: (eventId) =>
    api.post('/calendar/events', { eventId }),

  removeEvent: (eventId) =>
    api.delete(`/calendar/events/${eventId}`),

  addNote: (note) =>
    api.post('/calendar/notes', note),

  deleteNote: (noteId) =>
    api.delete(`/calendar/notes/${noteId}`)
};


// =====================================================
// CERTIFICATE API
// =====================================================


export const certificateAPI = {
  getMyCertificates: () =>
    api.get("/certificates/my"),

  verifyCertificate: (token) =>
    api.get(`/certificates/verify/${token}`),

  downloadCertificate: (certificateId) =>
    api.get(
      `/certificates/download/${certificateId}`,
      {
        responseType: "blob",
      }
    ),
};


export const notificationAPI = {

  // Get logged-in user's notifications
  getAllNotifications: () =>
    api.get('/notifications'),

  // Admin creates notification
  createNotification: (data) =>
    api.post('/notifications', data),

  // Mark one notification as read
  markAsRead: (id) =>
    api.put(`/notifications/${id}/read`),

  // Mark all notifications as read
  markAllAsRead: () =>
    api.put('/notifications/read-all'),

  // Delete one notification
  deleteNotification: (id) =>
    api.delete(`/notifications/${id}`)
};

export const agentAPI = {
  chat: (message) =>
    api.post("/agent/chat", {
      message,
    }),
};

// =====================================================
// HELP & SUPPORT API
// =====================================================

// The Help Center content is filtered by the server against the caller's role,
// so the page renders whatever comes back without deciding visibility itself.
export const helpAPI = {
  getContent: () => api.get('/help/content'),

  // history carries the earlier turns of this session; the server caps it.
  assistant: (message, history = []) =>
    api.post('/help/assistant', { message, history }),

  createRequest: (payload) => api.post('/help/requests', payload),

  myRequests: () => api.get('/help/requests/mine'),

  adminRequests: (params) => api.get('/help/requests', { params }),

  adminUpdateRequest: (id, payload) =>
    api.put(`/help/requests/${id}`, payload)
};

// =====================================================
// GAMIFICATION API
// =====================================================

// Rankings, XP and badges. Every call here is authenticated by the interceptor
// above; the board shows student names, so nothing on it is public.
export const gamificationAPI = {
  // Published XP rates, level curve, periods and the badge catalog.
  getRules: () => api.get('/gamification/rules'),

  // { period, semester, department, search, page, limit }
  getStudentLeaderboard: (params) =>
    api.get('/gamification/students', { params }),

  getClubLeaderboard: (params) =>
    api.get('/gamification/clubs', { params }),

  getClubStanding: (clubId, params) =>
    api.get(`/gamification/clubs/${clubId}`, { params }),

  // The signed-in student's own score, rank, level and badges.
  getMySummary: () => api.get('/gamification/students/me'),

  getXpHistory: (params) => api.get('/gamification/xp/history', { params }),

  getAchievements: (userId) =>
    api.get('/gamification/achievements', { params: { userId } }),

  // ---- awarding (admin, or a club leader on an event they run)

  award: (payload) => api.post('/gamification/awards', payload),

  reverseAward: (transactionId, reason) =>
    api.delete(`/gamification/awards/${transactionId}`, {
      data: { reason }
    }),

  recordWinners: (eventId, userIds) =>
    api.post(`/gamification/events/${eventId}/winners`, { userIds }),

  creditOrganizers: (eventId, userIds) =>
    api.post(`/gamification/events/${eventId}/organizer-credit`, {
      userIds
    }),

  // ---- admin

  getAnalytics: () => api.get('/gamification/analytics'),

  getSuspicious: () => api.get('/gamification/suspicious'),

  getXpTotals: (params) => api.get('/gamification/xp-totals', { params }),

  recompute: (payload) => api.post('/gamification/recompute', payload),

  createAchievement: (payload) => api.post('/gamification/achievements', payload),

  updateAchievement: (id, payload) =>
    api.put(`/gamification/achievements/${id}`, payload),

  // Downloads as a file, so the body has to come back as a blob.
  exportCsv: (params) =>
    api.get('/gamification/export', { params, responseType: 'blob' })
};

// =====================================================
// EXTERNAL EVENTS API
// =====================================================

// Off-campus listings. Nothing here registers anyone anywhere: following the
// organiser's own link is the only way to sign up, and saving a listing is a
// private bookmark.
export const externalEventAPI = {
  // { type, mode, organizer, city, search, view, saved, page, limit }
  getAll: (params) => api.get('/external-events', { params }),

  // The category, mode and status taxonomies plus the real organizer and city
  // lists, so the filter controls can never offer a value the server rejects.
  getMeta: () => api.get('/external-events/meta'),

  getById: (id) => api.get(`/external-events/${id}`),

  // club leader or admin
  create: (payload) => api.post('/external-events', payload),

  update: (id, payload) => api.put(`/external-events/${id}`, payload),

  remove: (id) => api.delete(`/external-events/${id}`),

  save: (id) =>
    api
      .post(`/external-events/${id}/bookmark`)
      .then(extractData)
      .catch(handleDuplicateActionError),

  unsave: (id) =>
    api.delete(`/external-events/${id}/bookmark`)
};

export default api;