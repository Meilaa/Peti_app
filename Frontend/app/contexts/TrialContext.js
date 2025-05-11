import React, { createContext, useState, useEffect, useContext } from 'react';
import trialService from '../services/trialService';

const TrialContext = createContext();

export const TrialProvider = ({ children }) => {
  const [trialStatus, setTrialStatus] = useState({
    trialActive: false,
    daysRemaining: 0,
    canStartTrial: false,
    isLoading: true
  });

  const fetchTrialStatus = async () => {
    try {
      const response = await trialService.getTrialStatus();
      setTrialStatus({
        ...response.data,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching trial status:', error);
      setTrialStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const startTrial = async () => {
    try {
      await trialService.startTrial();
      await fetchTrialStatus();
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  };

  const endTrial = async () => {
    try {
      await trialService.endTrial();
      await fetchTrialStatus();
      return true;
    } catch (error) {
      console.error('Error ending trial:', error);
      return false;
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTrialStatus();
    
    // Refresh trial status every hour
    const intervalId = setInterval(fetchTrialStatus, 60 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <TrialContext.Provider value={{
      ...trialStatus,
      startTrial,
      endTrial,
      refreshTrialStatus: fetchTrialStatus
    }}>
      {children}
    </TrialContext.Provider>
  );
};

export const useTrial = () => useContext(TrialContext);

// Add default export
export default TrialProvider; 