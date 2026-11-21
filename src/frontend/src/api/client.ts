import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// Intercept requests to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('csb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses to handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not boot user to login if change-password fails, let the modal show the message
      if (error.config?.url?.includes('/auth/change-password')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('csb_token');
      localStorage.removeItem('csb_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
