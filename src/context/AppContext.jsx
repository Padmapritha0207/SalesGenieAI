import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'calling'
  const [callState, setCallState] = useState('idle'); // 'idle' | 'dialing' | 'connected' | 'ended'
  
  // Mock Leads Data
  const [leads, setLeads] = useState([
    { id: 1, name: 'Rahul Sharma', phone: '+91 98765 43210', status: 'Hot', score: 9, duration: '4m 12s', language: 'Hinglish', date: '2026-05-04' },
    { id: 2, name: 'Priya Patel', phone: '+91 87654 32109', status: 'Warm', score: 6, duration: '2m 45s', language: 'Hindi', date: '2026-05-04' },
    { id: 3, name: 'Amit Kumar', phone: '+91 76543 21098', status: 'Cold', score: 2, duration: '0m 45s', language: 'English', date: '2026-05-03' },
  ]);

  // Current Active Call Data
  const [activeCall, setActiveCall] = useState(null);

  const startCall = (leadName = 'Vikram Singh', phone = '+91 99887 77665') => {
    setActiveCall({ name: leadName, phone, score: 0, emotion: 'Neutral', transcript: [] });
    setCurrentView('calling');
    setCallState('dialing');
    
    // Simulate connection after 3 seconds
    setTimeout(() => {
      setCallState('connected');
    }, 3000);
  };

  const endCall = () => {
    setCallState('ended');
    // We keep the view as 'calling' so the summary screen shows
  };

  const closeSummary = (finalScore, finalStatus) => {
    if (activeCall) {
      setLeads([{
        id: Date.now(),
        name: activeCall.name,
        phone: activeCall.phone,
        status: finalStatus,
        score: finalScore,
        duration: '3m 20s', // Mock duration
        language: 'Hinglish',
        date: new Date().toISOString().split('T')[0]
      }, ...leads]);
    }
    setCallState('idle');
    setActiveCall(null);
    setCurrentView('dashboard');
  };

  return (
    <AppContext.Provider value={{
      currentView, setCurrentView,
      callState, setCallState,
      leads,
      activeCall, setActiveCall,
      startCall, endCall, closeSummary
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
