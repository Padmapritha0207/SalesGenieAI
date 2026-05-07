import React from 'react';
import { Layers, Radio, ShieldAlert, Cpu, AudioLines } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Sidebar = () => {
  const { currentView, setCurrentView, activeCall, setActiveCall, setCallState } = useAppContext();

  const handleNav = (view) => {
    if ((view === 'calling' || view === 'voice_calling') && !activeCall) {
      setActiveCall({ name: 'Vikram Singh', phone: '+91 99887 77665', score: 0, emotion: 'Neutral', transcript: [], language: 'Hinglish' });
      setCallState('connected');
    }
    setCurrentView(view);
  };

  return (
    <aside className="sidebar-wrapper" style={{
      width: 'var(--sidebar-width)',
      borderRight: '1px solid var(--surface-border)',
      background: 'rgba(2, 6, 23, 0.5)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0',
      zIndex: 10,
      boxShadow: 'inset -5px 0 15px rgba(0,0,0,0.5)'
    }}>
      <div className="sidebar-logo" style={{ marginBottom: '40px', color: 'var(--primary)', filter: 'drop-shadow(0 0 8px var(--primary-glow))' }}>
        <Cpu size={32} />
      </div>

      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', alignItems: 'center' }}>
        <SidebarItem 
          icon={<Layers size={24} />} 
          active={currentView === 'dashboard'} 
          onClick={() => handleNav('dashboard')}
          title="Data Matrix"
        />
        <SidebarItem 
          icon={<Radio size={24} />} 
          active={currentView === 'calling'} 
          onClick={() => handleNav('calling')}
          title="Live Comms (Text)"
        />
        <SidebarItem 
          icon={<AudioLines size={24} />} 
          active={currentView === 'voice_calling'} 
          onClick={() => handleNav('voice_calling')}
          title="Voice Comms"
        />
        <SidebarItem 
          icon={<ShieldAlert size={24} />} 
          active={currentView === 'security'} 
          onClick={() => handleNav('security')}
          title="Security Override" 
        />
      </nav>
    </aside>
  );
};

const SidebarItem = ({ icon, active, onClick, title }) => {
  return (
    <button 
      onClick={onClick}
      title={title}
      style={{
        width: '48px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '12px',
        background: active ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'all 0.3s',
        border: `1px solid ${active ? 'var(--primary)' : 'transparent'}`,
        boxShadow: active ? '0 0 15px var(--primary-glow), inset 0 0 10px rgba(14,165,233,0.2)' : 'none'
      }}
      onMouseOver={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-main)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {icon}
    </button>
  );
};

export default Sidebar;
