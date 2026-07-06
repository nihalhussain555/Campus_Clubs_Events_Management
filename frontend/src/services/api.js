import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
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

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Clear the authorization header
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  getAllUsers: () => api.get('/auth/users')
};

// Club API calls
export const clubAPI = {
  getAllClubs: () => api.get('/clubs'),
  getClubById: (id) => api.get(`/clubs/${id}`),
  createClub: (data) => api.post('/clubs', data),
  updateClub: (id, data) => api.put(`/clubs/${id}`, data),
  deleteClub: (id) => api.delete(`/clubs/${id}`),
  joinClub: (id) => api.post(`/clubs/${id}/join`),
  leaveClub: (id) => api.post(`/clubs/${id}/leave`)
};

// Event API calls
export const eventAPI = {
  getAllEvents: () => api.get('/events'),
  getEventById: (id) => api.get(`/events/${id}`),
  getEventsByClub: (clubId) => api.get(`/events/club/${clubId}`),
  getUpcomingEvents: () => api.get('/events/upcoming'),
  createEvent: (data) => api.post('/events', data),
  updateEvent: (id, data) => api.put(`/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/events/${id}`),
  registerForEvent: (id) => api.post(`/events/${id}/register`),
  unregisterFromEvent: (id) => api.post(`/events/${id}/unregister`)
};

export default api;
