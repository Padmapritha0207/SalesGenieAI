import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, Skull } from 'lucide-react';
import { playScanSound, playBeep } from '../utils/audio';
import { useAppContext } from '../context/AppContext';

const SecurityOverride = () => {
  const { setCurrentView } = useAppContext();
  const [hexData, setHexData] = useState([]);
  
  useEffect(() => {
    // Play a harsh sound when security override is triggered
    playScanSound();
    const interval = setInterval(() => {
      playBeep(200, 'sawtooth', 0.1, 0.2);
    }, 500);

    // Generate random hex lines for the terminal effect
    const generateHex = () => {
      const chars = '0123456789ABCDEF';
      let line = '';
      for(let i = 0; i < 32; i++) {
        line += chars[Math.floor(Math.random() * chars.length)];
        if (i % 4 === 3) line += ' ';
      }
      return line;
    };

    const hexInterval = setInterval(() => {
      setHexData(prev => [generateHex(), ...prev].slice(0, 30));
    }, 50);

    return () => {
      clearInterval(interval);
      clearInterval(hexInterval);
    };
  }, []);

  return (
    <div style={{ height: '100%', backgroundColor: '#1a0505', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Glitching overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, rgba(255,0,0,0.05), rgba(255,0,0,0.05) 1px, transparent 1px, transparent 4px)', pointerEvents: 'none', zIndex: 10 }}></div>
      <motion.div 
        animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.05, 1] }} 
        transition={{ duration: 0.2, repeat: Infinity }} 
        style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(255,0,0,0.5)', zIndex: 10, pointerEvents: 'none' }}
      ></motion.div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Warning Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', borderRight: '2px solid rgba(255, 0, 60, 0.3)' }}>
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <ShieldAlert size={120} color="var(--danger)" style={{ filter: 'drop-shadow(0 0 20px var(--danger))', marginBottom: '20px' }} />
          </motion.div>
          <h1 className="tech-font glitch" style={{ fontSize: '4rem', color: 'var(--danger)', margin: '0 0 20px 0', textShadow: '0 0 20px var(--danger)', textAlign: 'center' }}>
            SECURITY OVERRIDE
          </h1>
          <div style={{ background: 'var(--danger)', color: '#1a0505', padding: '10px 30px', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '5px', marginBottom: '40px' }} className="tech-font">
            CRITICAL SYSTEM LOCKDOWN
          </div>
          
          <div style={{ textAlign: 'center', maxWidth: '600px', color: '#ffb3b3' }} className="tech-font">
            <p style={{ fontSize: '1.2rem', marginBottom: '16px' }}>UNAUTHORIZED ACCESS DETECTED IN SECTOR 7G.</p>
            <p style={{ fontSize: '1.2rem', marginBottom: '16px' }}>INITIATING PURGE OF ALL CACHED TARGET DOSSIERS TO PREVENT DATA EXFILTRATION.</p>
            <p className="glitch" style={{ fontSize: '1.5rem', color: 'var(--danger)', marginTop: '30px' }}>DO NOT POWER OFF THE TERMINAL.</p>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px var(--danger)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentView('dashboard')}
            className="btn-cyber danger" 
            style={{ marginTop: '50px', padding: '20px 40px', fontSize: '1.2rem', border: '2px solid var(--danger)' }}
          >
            <Skull size={24} /> ABORT PURGE SEQUENCE
          </motion.button>
        </div>

        {/* Data Wipe Terminal */}
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.8)' }}>
          <div style={{ color: 'var(--danger)', borderBottom: '1px solid var(--danger)', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }} className="tech-font">
            <span>SYS.WIPE.EXEC // ROOT</span>
            <span className="glitch">DELETING...</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', color: 'var(--danger)', opacity: 0.8, fontSize: '0.9rem', lineHeight: '1.5' }} className="tech-font">
            {hexData.map((line, i) => (
              <div key={i}>{`0x${(Math.random() * 0xFFFFF).toString(16).padStart(6, '0').toUpperCase()} : ${line} : [WIPED]`}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityOverride;
