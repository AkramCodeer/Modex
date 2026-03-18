const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Helper function for fetch requests
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: getAuthHeaders(),
    ...options,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP Error: ${response.status}`);
  }

  return response.json();
};

// Doctors API
export const doctorsAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/doctors${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/doctors/${id}`);
  },

  create: async (data) => {
    return apiCall('/doctors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/doctors/${id}`, {
      method: 'DELETE',
    });
  },

  search: async (specialization, search) => {
    return apiCall(`/doctors?specialization=${specialization}&search=${search}`);
  },
};

// Slots API
export const slotsAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/slots${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/slots/${id}`);
  },

  create: async (data) => {
    return apiCall('/slots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/slots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/slots/${id}`, {
      method: 'DELETE',
    });
  },

  getByDoctor: async (doctorId) => {
    return apiCall(`/slots/doctor/${doctorId}`);
  },

  getAvailable: async (doctorId, date) => {
    return apiCall(`/slots/available?doctorId=${doctorId}&date=${date}`);
  },
};

// Bookings API
export const bookingsAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/bookings${queryString ? `?${queryString}` : ''}`);
  },

  getAllAdmin: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/bookings/admin/all${queryString ? `?${queryString}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/bookings/${id}`);
  },

  create: async (data) => {
    return apiCall('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  cancel: async (id) => {
    return apiCall(`/bookings/${id}`, {
      method: 'DELETE',
    });
  },

  getMyBookings: async () => {
    return apiCall('/bookings/user/my');
  },

  getDoctorBookings: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/bookings/doctor/my${queryString ? `?${queryString}` : ''}`);
  },
};

// Auth API
export const authAPI = {
  register: async (data) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login: async (data) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verify: async () => {
    return apiCall('/auth/verify');
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};

export default {
  doctorsAPI,
  slotsAPI,
  bookingsAPI,
  authAPI,
};
