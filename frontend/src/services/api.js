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


// =====================================================
// ADD TOKEN TO REQUESTS
// =====================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

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

    // Only redirect for protected requests
    if (
      status === 401 &&
      !isLoginRequest &&
      !isAgentRequest
    ) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      delete api.defaults.headers.common.Authorization;

      window.location.href = '/login';
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
    api.get('/auth/users')
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

export default api;