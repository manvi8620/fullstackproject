import axios from 'axios';

// The backend server will be running on port 5000
const API_URL = 'http://localhost:5000/api';

/**
 * Creates the authorization header for protected requests.
 * @param {string} token - The JWT token.
 * @returns {object} The headers object.
 */
const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`
  }
});

/**
 * [PUBLIC] Fetches public tenant settings.
 */
export const getTenantSettings = async (tenantId) => {
  const response = await axios.get(`${API_URL}/settings/${tenantId}`);
  return response.data; // { id, name, theme, features }
};

/**
 * [PUBLIC] Logs in a user for a specific tenant.
 */
export const login = async (tenantId, email, password) => {
  const response = await axios.post(`${API_URL}/${tenantId}/auth/login`, {
    email,
    password
  });
  return response.data; // { token, user }
};

/**
 * [PROTECTED] Fetches projects for the logged-in tenant.
 */
export const getProjects = async (token) => {
  // The token contains the tenantId, which the server will use
  // We decode it here just to find the tenantId for the URL
  const { tenantId } = JSON.parse(atob(token.split('.')[1]));
  const response = await axios.get(
    `${API_URL}/${tenantId}/projects`, 
    getAuthHeaders(token)
  );
  return response.data; // [{ id, tenantId, name, status }, ...]
};

/**
 * [PROTECTED] Updates the theme for the logged-in tenant.
 */
export const updateTheme = async (token, newTheme) => {
  const { tenantId } = JSON.parse(atob(token.split('.')[1]));
  const response = await axios.put(
    `${API_URL}/${tenantId}/admin/theme`, 
    newTheme, 
    getAuthHeaders(token)
  );
  return response.data; // The full new theme object
};