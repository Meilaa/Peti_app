import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../constants/enviroments';

// Default API configuration
const API_BASE_URL = environments.API_BASE_URL;

/**
 * API client for making HTTP requests
 */
const api = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint to call
   * @param {Object} params - Query parameters
   * @returns {Promise} - Response promise
   */
  async get(endpoint, params = {}) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    // Add query parameters
    if (Object.keys(params).length) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    
    const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    return this.handleResponse(response);
  },
  
  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint to call
   * @param {Object} data - Data to send in request body
   * @returns {Promise} - Response promise
   */
  async post(endpoint, data = {}) {
    const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    
    return this.handleResponse(response);
  },
  
  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint to call
   * @param {Object} data - Data to send in request body
   * @returns {Promise} - Response promise
   */
  async put(endpoint, data = {}) {
    const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
    });
    
    return this.handleResponse(response);
  },
  
  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint to call
   * @returns {Promise} - Response promise
   */
  async delete(endpoint) {
    const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });
    
    return this.handleResponse(response);
  },
  
  /**
   * Handle API response
   * @param {Response} response - Fetch API response
   * @returns {Promise} - Parsed response data
   * @throws {Error} - Error with status code and message
   */
  async handleResponse(response) {
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('Error parsing JSON:', error);
      throw new Error(`Invalid JSON response from server: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      const errorMessage = data?.error || data?.message || response.statusText || 'Unknown error';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  }
};

export default api; 