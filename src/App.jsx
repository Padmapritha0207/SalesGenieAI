import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CallingSimulation from './components/CallingSimulation';
import VoiceSimulation from './components/VoiceSimulation';
import SecurityOverride from './components/SecurityOverride';
import { Activity } from 'lucide-react';
import './index.css';

const TopHUD = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      height: '40px',
      borderBottom: '1px solid var(--surface-border)',
      background: 'rgba(2, 6, 23, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '0.85rem',
      color: 'var(--primary)',
      zIndex: 50,
      position: 'relative'
    }}>
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} className="glow-text" />
          <span>SG-CORE.v2.4.1</span>
        </div>
        <div style={{ opacity: 0.7 }}>SYS.LOAD: 12%</div>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ color: 'var(--accent)', textShadow: '0 0 5px var(--accent-glow)' }}>[ NETWORK SECURE ]</div>
        <div>{time} UTC+5:30</div>
      </div>
    </div>
  );
};

const AppContent = () => {
  const { currentView } = useAppContext();

  return (
    <div className="app-container" style={{ flexDirection: 'column' }}>
      <TopHUD />
      <div className="main-content-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main className="main-content-area" style={{ flex: 1, position: 'relative', overflowY: 'auto', padding: currentView === 'dashboard' ? '32px' : '0' }}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'calling' && <CallingSimulation />}
          {currentView === 'voice_calling' && <VoiceSimulation />}
          {currentView === 'security' && <SecurityOverride />}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
