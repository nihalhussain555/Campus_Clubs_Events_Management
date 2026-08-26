import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api';

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

    // =================================================
    // LOGIN ERROR
    // Do NOT redirect when email/password is incorrect
    // Login.jsx will display the backend error message.
    // =================================================
    const isLoginRequest = requestUrl.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
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
      .then(extractData)
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
  // STUDENT ATTENDANCE
  // =================================================

  attendEvent: (id) =>
    api
      .post(`/events/${id}/attend`)
      .then(extractData),

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
    api.put('/notifications/read-all')
};

export const agentAPI = {
  chat: (message) =>
    api.post("/agent/chat", {
      message,
    }),
};

export default api;