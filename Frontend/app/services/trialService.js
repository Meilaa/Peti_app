import api from './api'; // Your API client

export const trialService = {
  /**
   * Start a free trial for the current user
   * @returns {Promise} - Trial start response
   */
  startTrial: () => api.post('/api/trial/start'),
  
  /**
   * Get the current trial status 
   * @returns {Promise} - Trial status data
   */
  getTrialStatus: () => api.get('/api/trial/status'),
  
  /**
   * End the current trial early
   * @returns {Promise} - Trial end response
   */
  endTrial: () => api.post('/api/trial/end'),
  
  /**
   * Refresh the trial status from the server
   * @returns {Promise} - Updated trial status
   */
  refreshTrialStatus: () => api.get('/api/trial/refresh')
};

export default trialService; 